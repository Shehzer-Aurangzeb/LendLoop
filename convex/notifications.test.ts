import { createHmac } from 'node:crypto'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { TestConvex } from 'convex-test'
import type { Mock } from 'vitest'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

const now = '2026-11-27T03:00:00Z'
const today = '2026-11-26'
const webhookUrl = 'http://localhost:5678/webhook/request-notification'
const secret = 'test-webhook-secret'

const asha = {
  name: 'Asha Patel',
  email: 'asha@example.com',
  tokenIdentifier: 'asha',
}
const ben = {
  name: 'Ben Okafor',
  email: 'ben@example.com',
  tokenIdentifier: 'ben',
}
const cara = {
  name: 'Cara Lim',
  email: 'cara@example.com',
  tokenIdentifier: 'cara',
}
const dana = {
  name: 'Dana Ruiz',
  email: 'dana@example.com',
  tokenIdentifier: 'dana',
}

const drill = {
  name: 'Drill',
  description: 'Cordless, two batteries',
  category: 'power-tools',
  condition: 'good',
} as const

type FetchMock = Mock<typeof fetch>

let fetchMock: FetchMock
let consoleError: Mock<typeof console.error>

const respondWith = (status: number) =>
  fetchMock.mockImplementation(async () => new Response(null, { status }))

beforeEach(() => {
  vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
  vi.stubEnv('N8N_REQUEST_WEBHOOK_URL', webhookUrl)
  vi.stubEnv('N8N_WEBHOOK_SECRET', secret)
  // All timers are fake here, so the test decides when each retry is due.
  vi.useFakeTimers()
  vi.setSystemTime(new Date(now))
  fetchMock = vi.fn<typeof fetch>()
  respondWith(200)
  vi.stubGlobal('fetch', fetchMock)
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const signUp = async (
  t: TestConvex<typeof schema>,
  identity: { name: string; email: string; tokenIdentifier: string }
) => {
  const asUser = t.withIdentity(identity)
  const userId = await asUser.mutation(api.users.store)

  return { asUser, userId }
}

// Asha lends a drill; Ben and Cara borrow; Dana is the Admin.
const setUpAshasDrill = async () => {
  const t = convexTest(schema, modules)
  const { asUser: asAsha, userId: ashaId } = await signUp(t, asha)
  const { asUser: asBen, userId: benId } = await signUp(t, ben)
  const { userId: caraId } = await signUp(t, cara)
  const { asUser: asDana, userId: danaId } = await signUp(t, dana)

  await t.run((ctx) => ctx.db.patch(danaId, { role: 'admin' }))
  const toolId = await asAsha.mutation(api.tools.create, drill)

  return { t, asAsha, asBen, asDana, ashaId, benId, caraId, toolId }
}

const insertLoan = (
  t: TestConvex<typeof schema>,
  {
    toolId,
    borrowerId,
    status = 'requested',
    startDate = '2026-12-11',
    endDate = '2026-12-13',
  }: {
    toolId: Id<'tools'>
    borrowerId: Id<'users'>
    status?: Doc<'loans'>['status']
    startDate?: string
    endDate?: string
  }
) =>
  t.run(async (ctx) => {
    const tool = await ctx.db.get(toolId)

    return await ctx.db.insert('loans', {
      toolId,
      borrowerId,
      lenderId: tool!.ownerId,
      startDate,
      endDate,
      status,
    })
  })

const expectedPayload = ({
  loanId,
  event,
  recipientId,
  recipientFirstName,
  otherPartyFirstName,
  startDate = '2026-12-11',
  endDate = '2026-12-13',
}: {
  loanId: Id<'loans'>
  event: Doc<'loans'>['status']
  recipientId: Id<'users'>
  recipientFirstName: string
  otherPartyFirstName: string
  startDate?: string
  endDate?: string
}) => ({
  notificationId: `${loanId}:${event}`,
  event,
  loanId,
  recipientId,
  recipientFirstName,
  otherPartyFirstName,
  toolName: 'Drill',
  startDate,
  endDate,
  sentAt: expect.any(Number),
})

// convex-test stamps each commit 1 ms after the last, so a runAfter(0) falls due 1 ms later.
const runNotificationsDueWithin = async (
  t: TestConvex<typeof schema>,
  ms = 1
) => {
  vi.advanceTimersByTime(ms)
  await t.finishInProgressScheduledFunctions()
}

const rawBodies = () =>
  fetchMock.mock.calls.map(([, init]) => String(init?.body))

const sentPayloads = () => rawBodies().map((body) => JSON.parse(body))

describe('a request notification is sent for each loan status change', () => {
  test('request tells the lender', async () => {
    const { t, asBen, ashaId, toolId } = await setUpAshasDrill()

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: '2026-12-11',
      endDate: '2026-12-13',
    })
    await runNotificationsDueWithin(t)

    const [loan] = await t.run((ctx) => ctx.db.query('loans').collect())

    expect(sentPayloads()).toStrictEqual([
      expectedPayload({
        loanId: loan._id,
        event: 'requested',
        recipientId: ashaId,
        recipientFirstName: 'Asha',
        otherPartyFirstName: 'Ben',
      }),
    ])
  })

  test('approve tells the borrower', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.approve, { loanId })
    await runNotificationsDueWithin(t)

    expect(sentPayloads()).toStrictEqual([
      expectedPayload({
        loanId,
        event: 'approved',
        recipientId: benId,
        recipientFirstName: 'Ben',
        otherPartyFirstName: 'Asha',
      }),
    ])
  })

  test('decline tells the borrower', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.decline, { loanId })
    await runNotificationsDueWithin(t)

    expect(sentPayloads()).toStrictEqual([
      expectedPayload({
        loanId,
        event: 'declined',
        recipientId: benId,
        recipientFirstName: 'Ben',
        otherPartyFirstName: 'Asha',
      }),
    ])
  })

  test('cancel tells the lender', async () => {
    const { t, asBen, ashaId, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asBen.mutation(api.loans.cancel, { loanId })
    await runNotificationsDueWithin(t)

    expect(sentPayloads()).toStrictEqual([
      expectedPayload({
        loanId,
        event: 'cancelled',
        recipientId: ashaId,
        recipientFirstName: 'Asha',
        otherPartyFirstName: 'Ben',
      }),
    ])
  })

  test('markReturned tells the borrower', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, {
      toolId,
      borrowerId: benId,
      status: 'approved',
      startDate: today,
      endDate: today,
    })

    await asAsha.mutation(api.loans.markReturned, { loanId })
    await runNotificationsDueWithin(t)

    expect(sentPayloads()).toStrictEqual([
      expectedPayload({
        loanId,
        event: 'returned',
        recipientId: benId,
        recipientFirstName: 'Ben',
        otherPartyFirstName: 'Asha',
        startDate: today,
        endDate: today,
      }),
    ])
  })

  test.each([
    ['an Admin removes the listing', 'admin'],
    ['the lender removes the tool', 'lender'],
  ] as const)(
    'every waiting borrower is told "declined" when %s',
    async (_, remover) => {
      const { t, asAsha, asDana, benId, caraId, toolId } =
        await setUpAshasDrill()
      const benLoanId = await insertLoan(t, { toolId, borrowerId: benId })
      const caraLoanId = await insertLoan(t, {
        toolId,
        borrowerId: caraId,
        startDate: '2026-12-20',
        endDate: '2026-12-21',
      })

      if (remover === 'admin') {
        await asDana.mutation(api.admin.removeListing, { toolId })
      } else {
        await asAsha.mutation(api.tools.removeOwn, { toolId })
      }
      await runNotificationsDueWithin(t)

      const byLoan = (a: { loanId: string }, b: { loanId: string }) =>
        a.loanId.localeCompare(b.loanId)

      expect(sentPayloads().sort(byLoan)).toStrictEqual(
        [
          expectedPayload({
            loanId: benLoanId,
            event: 'declined',
            recipientId: benId,
            recipientFirstName: 'Ben',
            otherPartyFirstName: 'Asha',
          }),
          expectedPayload({
            loanId: caraLoanId,
            event: 'declined',
            recipientId: caraId,
            recipientFirstName: 'Cara',
            otherPartyFirstName: 'Asha',
            startDate: '2026-12-20',
            endDate: '2026-12-21',
          }),
        ].sort(byLoan)
      )
    }
  )
})

describe('the request notification is safe to send', () => {
  test('posts JSON to the webhook URL with no email or surname', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.approve, { loanId })
    await runNotificationsDueWithin(t)

    const [[url, init]] = fetchMock.mock.calls
    const [rawBody] = rawBodies()

    expect(url).toBe(webhookUrl)
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe(
      'application/json'
    )
    for (const secretWord of ['@', 'Patel', 'Okafor']) {
      expect(rawBody).not.toContain(secretWord)
    }
  })

  // A hung n8n would otherwise hold the action until Convex kills it, skipping the retry and the log.
  test('the send carries a timeout', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.approve, { loanId })
    await runNotificationsDueWithin(t)

    const [[, init]] = fetchMock.mock.calls

    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  test('the signature is the HMAC-SHA256 of the exact body sent', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.approve, { loanId })
    await runNotificationsDueWithin(t)

    const [[, init]] = fetchMock.mock.calls
    const [rawBody] = rawBodies()
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

    expect(new Headers(init?.headers).get('X-LendLoop-Signature')).toBe(
      expected
    )
  })
})

describe('a failed request notification is retried', () => {
  test('a 500 is retried after 1 minute, then 5 minutes, then logged', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    respondWith(500)
    await asAsha.mutation(api.loans.approve, { loanId })

    await runNotificationsDueWithin(t)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await runNotificationsDueWithin(t, 59_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await runNotificationsDueWithin(t, 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await runNotificationsDueWithin(t, 299_999)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(consoleError).not.toHaveBeenCalled()
    await runNotificationsDueWithin(t, 1)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(String(consoleError.mock.calls[0])).toContain(loanId)
    expect(String(consoleError.mock.calls[0])).toContain('approved')

    const [first, second, third] = sentPayloads()

    expect(second.notificationId).toBe(first.notificationId)
    expect(second.sentAt).toBe(first.sentAt + 60_000)
    expect(third.sentAt).toBe(second.sentAt + 300_000)

    await runNotificationsDueWithin(t, 3_600_000)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect((await t.run((ctx) => ctx.db.get(loanId)))?.status).toBe(
      'approved'
    )
  })

  test('a network error is retried the same way', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await asAsha.mutation(api.loans.approve, { loanId })
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect((await t.run((ctx) => ctx.db.get(loanId)))?.status).toBe(
      'approved'
    )
  })
})

describe('a request notification that cannot be built is logged, not sent', () => {
  test.each(['N8N_REQUEST_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET'])(
    'a missing %s logs an error and the change stays saved',
    async (envVar) => {
      const { t, asAsha, benId, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, { toolId, borrowerId: benId })

      vi.stubEnv(envVar, undefined)
      await asAsha.mutation(api.loans.approve, { loanId })
      await t.finishAllScheduledFunctions(vi.runAllTimers)

      expect(fetchMock).not.toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect((await t.run((ctx) => ctx.db.get(loanId)))?.status).toBe(
        'approved'
      )
    }
  )

  test('a loan deleted before the send logs an error', async () => {
    const { t, asAsha, benId, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, { toolId, borrowerId: benId })

    await asAsha.mutation(api.loans.approve, { loanId })
    await t.run((ctx) => ctx.db.delete(loanId))
    await t.finishAllScheduledFunctions(vi.runAllTimers)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(String(consoleError.mock.calls[0])).toContain(loanId)
  })
})
