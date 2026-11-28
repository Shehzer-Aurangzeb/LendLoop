import { createHmac } from 'node:crypto'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { TestConvex } from 'convex-test'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

// 03:00 UTC on the 27th is still the 26th in Toronto, so a UTC "today" fails.
const now = '2026-11-27T03:00:00Z'
const today = '2026-11-26'
const yesterday = '2026-11-25'
const tomorrow = '2026-11-27'
const secret = 'test-convex-webhook-secret'

beforeEach(() => {
  vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
  vi.stubEnv('CONVEX_WEBHOOK_SECRET', secret)
  // Fake Date only, so convex-test's own timers keep running.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const sign = (body: string, key = secret) =>
  createHmac('sha256', key).update(body).digest('hex')

const postDue = (
  t: TestConvex<typeof schema>,
  { body, signature }: { body: string; signature?: string }
) =>
  t.fetch('/overdue-reminders/due', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature === undefined ? {} : { 'X-LendLoop-Signature': signature }),
    },
    body,
  })

const freshBody = (sentAt = Date.now()) => JSON.stringify({ sentAt })

const postSignedDue = (t: TestConvex<typeof schema>, sentAt?: number) => {
  const body = freshBody(sentAt)

  return postDue(t, { body, signature: sign(body) })
}

// Asha lends a drill to Ben.
const setUpAshasDrill = async () => {
  const t = convexTest(schema, modules)
  const { ashaId, benId, toolId } = await t.run(async (ctx) => {
    const ashaId = await ctx.db.insert('users', {
      tokenIdentifier: 'asha',
      name: 'Asha Patel',
      email: 'asha@example.com',
      role: 'user',
      isTrustedLender: false,
    })
    const benId = await ctx.db.insert('users', {
      tokenIdentifier: 'ben',
      name: 'Ben Okafor',
      email: 'ben@example.com',
      role: 'user',
      isTrustedLender: false,
    })
    const toolId = await ctx.db.insert('tools', {
      ownerId: ashaId,
      name: 'Drill',
      description: 'Cordless, two batteries',
      category: 'power-tools',
      condition: 'good',
    })

    return { ashaId, benId, toolId }
  })

  const insertLoan = (status: Doc<'loans'>['status'], endDate: string) =>
    t.run((ctx) =>
      ctx.db.insert('loans', {
        toolId,
        borrowerId: benId,
        lenderId: ashaId,
        startDate: '2026-11-01',
        endDate,
        status,
      })
    )

  const insertReminderActivity = (
    loanId: Id<'loans'>,
    outcome: Doc<'loanActivity'>['outcome'],
    date = today
  ) =>
    t.run((ctx) =>
      ctx.db.insert('loanActivity', {
        loanId,
        kind: 'overdue-reminder',
        outcome,
        date,
      })
    )

  return { t, insertLoan, insertReminderActivity }
}

describe('POST /overdue-reminders/due refuses requests it cannot trust', () => {
  test.each([
    ['no signature', () => ({ body: freshBody() })],
    [
      'a signature made with another secret',
      () => {
        const body = freshBody()

        return { body, signature: sign(body, 'wrong-secret') }
      },
    ],
    [
      'a body changed after signing',
      () => {
        const body = freshBody()

        return { body: freshBody(Date.now() + 1), signature: sign(body) }
      },
    ],
    [
      'a sentAt older than 5 minutes',
      () => {
        const body = freshBody(Date.now() - 5 * 60_000 - 1)

        return { body, signature: sign(body) }
      },
    ],
    [
      'a sentAt more than 60 s ahead',
      () => {
        const body = freshBody(Date.now() + 60_001)

        return { body, signature: sign(body) }
      },
    ],
    [
      'a signed body with no sentAt',
      () => {
        const body = '{}'

        return { body, signature: sign(body) }
      },
    ],
  ])('%s gets a 401 with no data', async (_, makeRequest) => {
    const { t, insertLoan } = await setUpAshasDrill()

    await insertLoan('approved', yesterday)
    const response = await postDue(t, makeRequest())

    expect(response.status).toBe(401)
    expect(await response.text()).toBe('')
  })

  test('a signed body that is not JSON gets a 400', async () => {
    const { t } = await setUpAshasDrill()
    const body = 'not json'
    const response = await postDue(t, { body, signature: sign(body) })

    expect(response.status).toBe(400)
  })

  test('a missing CONVEX_WEBHOOK_SECRET gets a 500 and a logged error', async () => {
    const { t } = await setUpAshasDrill()

    vi.stubEnv('CONVEX_WEBHOOK_SECRET', undefined)
    const response = await postSignedDue(t)

    expect(response.status).toBe(500)
    expect(await response.text()).toBe('')
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  test('a sentAt exactly 5 minutes old is still accepted', async () => {
    const { t } = await setUpAshasDrill()
    const response = await postSignedDue(t, Date.now() - 5 * 60_000)

    expect(response.status).toBe(200)
  })
})

describe('POST /overdue-reminders/due lists loans to remind today', () => {
  test('returns today in APP_TIMEZONE and only approved loans past their end date', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const overdueLoanId = await insertLoan('approved', yesterday)

    await insertLoan('approved', today)
    await insertLoan('approved', tomorrow)
    await insertLoan('returned', yesterday)
    await insertLoan('requested', yesterday)
    const response = await postSignedDue(t)

    expect(response.status).toBe(200)
    expect(await response.json()).toStrictEqual({
      date: today,
      reminders: [
        {
          loanId: overdueLoanId,
          borrowerFirstName: 'Ben',
          toolName: 'Drill',
          endDate: yesterday,
        },
      ],
    })
  })

  test('skips a loan already reminded today, but not one reminded on an earlier day', async () => {
    const { t, insertLoan, insertReminderActivity } = await setUpAshasDrill()
    const remindedTodayId = await insertLoan('approved', yesterday)
    const remindedYesterdayId = await insertLoan('approved', yesterday)

    await insertReminderActivity(remindedTodayId, 'sent')
    await insertReminderActivity(remindedYesterdayId, 'sent', yesterday)
    const { reminders } = await (await postSignedDue(t)).json()

    expect(reminders.map((r: { loanId: string }) => r.loanId)).toStrictEqual([
      remindedYesterdayId,
    ])
  })

  test('keeps a loan whose reminder failed today, so a rerun retries it', async () => {
    const { t, insertLoan, insertReminderActivity } = await setUpAshasDrill()
    const failedTodayId = await insertLoan('approved', yesterday)

    await insertReminderActivity(failedTodayId, 'failed')
    const { reminders } = await (await postSignedDue(t)).json()

    expect(reminders.map((r: { loanId: string }) => r.loanId)).toStrictEqual([
      failedTodayId,
    ])
  })

  test('sends no email, surname or lender', async () => {
    const { t, insertLoan } = await setUpAshasDrill()

    await insertLoan('approved', yesterday)
    const text = await (await postSignedDue(t)).text()

    for (const secretWord of ['@', 'Okafor', 'Asha', 'Patel']) {
      expect(text).not.toContain(secretWord)
    }
  })
})

const postSignedResult = (
  t: TestConvex<typeof schema>,
  fields: Record<string, unknown>
) => {
  const body = JSON.stringify({ ...fields, sentAt: Date.now() })

  return t.fetch('/overdue-reminders/result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LendLoop-Signature': sign(body),
    },
    body,
  })
}

const reminderRows = (t: TestConvex<typeof schema>) =>
  t.run((ctx) => ctx.db.query('loanActivity').collect())

describe('POST /overdue-reminders/result stores one outcome per loan per day', () => {
  test('the same body twice leaves one row', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)
    const result = { loanId, date: today, outcome: 'sent' }

    expect((await postSignedResult(t, result)).status).toBe(200)
    expect((await postSignedResult(t, result)).status).toBe(200)

    expect(await reminderRows(t)).toMatchObject([
      { loanId, kind: 'overdue-reminder', outcome: 'sent', date: today },
    ])
  })

  test('failed then sent leaves one row, sent', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)

    await postSignedResult(t, { loanId, date: today, outcome: 'failed' })
    await postSignedResult(t, { loanId, date: today, outcome: 'sent' })

    expect(await reminderRows(t)).toMatchObject([
      { loanId, kind: 'overdue-reminder', outcome: 'sent', date: today },
    ])
  })

  test('sent then failed stays sent', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)

    await postSignedResult(t, { loanId, date: today, outcome: 'sent' })
    await postSignedResult(t, { loanId, date: today, outcome: 'failed' })

    expect(await reminderRows(t)).toMatchObject([
      { loanId, kind: 'overdue-reminder', outcome: 'sent', date: today },
    ])
  })

  test('a different day gets its own row', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', '2026-11-20')

    await postSignedResult(t, { loanId, date: yesterday, outcome: 'sent' })
    await postSignedResult(t, { loanId, date: today, outcome: 'sent' })

    expect(await reminderRows(t)).toHaveLength(2)
  })

  test('a request-notification row on the same day does not count as a reminder', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)

    await t.run((ctx) =>
      ctx.db.insert('loanActivity', {
        loanId,
        kind: 'request-notification',
        outcome: 'sent',
        date: today,
      })
    )
    await postSignedResult(t, { loanId, date: today, outcome: 'failed' })

    expect(
      (await reminderRows(t)).map(({ kind, outcome }) => ({ kind, outcome }))
    ).toStrictEqual([
      { kind: 'request-notification', outcome: 'sent' },
      { kind: 'overdue-reminder', outcome: 'failed' },
    ])
  })
})

describe('POST /overdue-reminders/result refuses bad requests', () => {
  test('a bad signature gets a 401 and writes nothing', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)
    const body = JSON.stringify({
      loanId,
      date: today,
      outcome: 'sent',
      sentAt: Date.now(),
    })
    const response = await t.fetch('/overdue-reminders/result', {
      method: 'POST',
      headers: { 'X-LendLoop-Signature': sign(body, 'wrong-secret') },
      body,
    })

    expect(response.status).toBe(401)
    expect(await reminderRows(t)).toStrictEqual([])
  })

  test.each([
    ['an unknown outcome', { outcome: 'maybe' }],
    ['a date that is not a calendar day', { date: '2026-02-30' }],
    ['a date that is not a string', { date: 20261126 }],
    ['a date after today', { date: '2999-01-01' }],
    ['a loanId that is not an id', { loanId: 'not-a-loan-id' }],
    ['a loanId that is not a string', { loanId: 42 }],
    ['a missing loanId', { loanId: undefined }],
  ])('%s gets a 400 and writes nothing', async (_, override) => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)
    const response = await postSignedResult(t, {
      loanId,
      date: today,
      outcome: 'sent',
      ...override,
    })

    expect(response.status).toBe(400)
    expect(await reminderRows(t)).toStrictEqual([])
  })

  test('a well-formed id of a deleted loan gets a 404', async () => {
    const { t, insertLoan } = await setUpAshasDrill()
    const loanId = await insertLoan('approved', yesterday)

    await t.run((ctx) => ctx.db.delete(loanId))
    const response = await postSignedResult(t, {
      loanId,
      date: today,
      outcome: 'sent',
    })

    expect(response.status).toBe(404)
    expect(await reminderRows(t)).toStrictEqual([])
  })
})
