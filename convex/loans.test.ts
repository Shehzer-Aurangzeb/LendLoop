import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { TestConvex } from 'convex-test'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

// 03:00 UTC on the 27th is still the 26th in Toronto, so a UTC "today" fails.
const now = '2026-11-27T03:00:00Z'
const today = '2026-11-26'
const yesterday = '2026-11-25'

const asha = { name: 'Asha Patel', tokenIdentifier: 'asha' }
const ben = { name: 'Ben Okafor', tokenIdentifier: 'ben' }
const cara = { name: 'Cara Lim', tokenIdentifier: 'cara' }

const drill = {
  name: 'Drill',
  description: 'Cordless, two batteries',
  category: 'power-tools',
  condition: 'good',
} as const

beforeEach(() => {
  // The generated `env` is process.env, so convex-test sees stubbed values.
  vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
  // Fake Date only, so convex-test's own timers keep running.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const signUp = async (
  t: TestConvex<typeof schema>,
  identity: { name: string; tokenIdentifier: string }
) => {
  const asUser = t.withIdentity(identity)

  await asUser.mutation(api.users.store)

  return asUser
}

// Asha lends a drill; Ben and Cara are neighbours who may borrow it.
const setUpAshasDrill = async () => {
  const t = convexTest(schema, modules)
  const asAsha = await signUp(t, asha)
  const asBen = await signUp(t, ben)
  const asCara = await signUp(t, cara)
  const toolId = await asAsha.mutation(api.tools.create, drill)

  return { t, asAsha, asBen, asCara, toolId }
}

type NewLoan = Pick<Doc<'loans'>, 'startDate' | 'endDate' | 'status'>

const insertLoan = (
  t: TestConvex<typeof schema>,
  toolId: Id<'tools'>,
  borrowerToken: string,
  loan: NewLoan
) =>
  t.run(async (ctx) => {
    const tool = await ctx.db.get(toolId)
    const borrower = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', borrowerToken))
      .unique()

    return await ctx.db.insert('loans', {
      ...loan,
      toolId,
      lenderId: tool!.ownerId,
      borrowerId: borrower!._id,
    })
  })

const storedLoans = (t: TestConvex<typeof schema>) =>
  t.run((ctx) => ctx.db.query('loans').collect())

describe('loans.request', () => {
  test('a signed-out caller is refused', async () => {
    const { t, toolId } = await setUpAshasDrill()

    await expect(
      t.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-11',
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('Please sign in.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('saves a requested loan with the caller as borrower and the owner as lender', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: '2026-12-11',
      endDate: '2026-12-13',
    })

    const [loan] = await storedLoans(t)
    const { ashaId, benId } = await t.run(async (ctx) => {
      const users = await ctx.db.query('users').collect()

      return {
        ashaId: users.find((u) => u.tokenIdentifier === 'asha')!._id,
        benId: users.find((u) => u.tokenIdentifier === 'ben')!._id,
      }
    })

    expect(loan).toMatchObject({
      toolId,
      borrowerId: benId,
      lenderId: ashaId,
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'requested',
    })
  })
})

describe('loans.request tool and date rules', () => {
  test("the lender's own tool is refused", async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()

    await expect(
      asAsha.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-11',
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('You cannot borrow your own tool.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('a removed tool is refused as not found', async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()

    await asAsha.mutation(api.tools.removeOwn, { toolId })

    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-11',
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('Tool not found.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('a missing tool is refused as not found, deleted or malformed id', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await t.run((ctx) => ctx.db.delete(toolId))

    for (const missingId of [toolId, 'not-an-id']) {
      await expect(
        asBen.mutation(api.loans.request, {
          toolId: missingId,
          startDate: '2026-12-11',
          endDate: '2026-12-13',
        })
      ).rejects.toThrow('Tool not found.')
    }
  })

  test.each([
    ['a day that is not on the calendar', '2026-02-30'],
    ['a month that does not exist', '2026-13-01'],
    ['no leading zeros', '2026-1-5'],
    ['another format', '05/01/2027'],
    ['empty', ''],
  ])('a malformed date is refused: %s', async (_, badDate) => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-11',
        endDate: badDate,
      })
    ).rejects.toThrow('Please pick real dates.')
    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: badDate,
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('Please pick real dates.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('a first day of yesterday is refused', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: yesterday,
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('The first day cannot be in the past.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('a first day of today in APP_TIMEZONE is accepted, though UTC says yesterday', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: today,
      endDate: '2026-11-28',
    })

    expect(await storedLoans(t)).toHaveLength(1)
  })

  test('a last day before the first day is refused', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-13',
        endDate: '2026-12-12',
      })
    ).rejects.toThrow('The last day cannot be before the first day.')
    expect(await storedLoans(t)).toEqual([])
  })

  test('a one-day loan is accepted', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: '2026-12-11',
      endDate: '2026-12-11',
    })

    expect(await storedLoans(t)).toHaveLength(1)
  })
})

// Cara holds the drill from Thu 10 to Sat 12 December.
const caraHasApproved = { startDate: '2026-12-10', endDate: '2026-12-12' }

describe('loans.request clashes', () => {
  test.each([
    ['inside', '2026-12-11', '2026-12-11'],
    ['touching its first day', '2026-12-08', '2026-12-10'],
    ['touching its last day', '2026-12-12', '2026-12-14'],
    ['covering it', '2026-12-09', '2026-12-13'],
  ])(
    'days clashing with an approved loan are refused: %s',
    async (_, startDate, endDate) => {
      const { t, asBen, toolId } = await setUpAshasDrill()

      await insertLoan(t, toolId, 'cara', {
        ...caraHasApproved,
        status: 'approved',
      })

      await expect(
        asBen.mutation(api.loans.request, { toolId, startDate, endDate })
      ).rejects.toThrow('The tool is already lent on some of these days.')
      expect(await storedLoans(t)).toHaveLength(1)
    }
  )

  test('days right next to an approved loan are accepted', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'cara', {
      ...caraHasApproved,
      status: 'approved',
    })

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: '2026-12-13',
      endDate: '2026-12-14',
    })

    expect(await storedLoans(t)).toHaveLength(2)
  })

  test.each(['declined', 'cancelled', 'returned'] as const)(
    'a %s loan on the same days does not clash',
    async (status) => {
      const { t, asBen, toolId } = await setUpAshasDrill()

      await insertLoan(t, toolId, 'cara', { ...caraHasApproved, status })

      await asBen.mutation(api.loans.request, { toolId, ...caraHasApproved })

      expect(await storedLoans(t)).toHaveLength(2)
    }
  )

  test.each(['requested', 'approved'] as const)(
    'overlapping your own %s loan on the tool is refused',
    async (status) => {
      const { t, asBen, toolId } = await setUpAshasDrill()

      await insertLoan(t, toolId, 'ben', {
        startDate: '2026-12-10',
        endDate: '2026-12-12',
        status,
      })

      await expect(
        asBen.mutation(api.loans.request, {
          toolId,
          startDate: '2026-12-12',
          endDate: '2026-12-15',
        })
      ).rejects.toThrow('You already asked for some of these days.')
      expect(await storedLoans(t)).toHaveLength(1)
    }
  )

  test('your own request for other days on the tool does not block', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      status: 'requested',
    })

    await asBen.mutation(api.loans.request, {
      toolId,
      startDate: '2026-12-13',
      endDate: '2026-12-14',
    })

    expect(await storedLoans(t)).toHaveLength(2)
  })

  test("someone else's waiting request for the same days does not block", async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'cara', {
      ...caraHasApproved,
      status: 'requested',
    })

    await asBen.mutation(api.loans.request, { toolId, ...caraHasApproved })

    expect(await storedLoans(t)).toHaveLength(2)
  })
})

describe('loans.listMyBorrowing', () => {
  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.loans.listMyBorrowing)).rejects.toThrow(
      'Please sign in.'
    )
  })

  test("gives only the caller's loans, newest request first", async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-20',
      endDate: '2026-12-21',
      status: 'declined',
    })
    await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      status: 'requested',
    })
    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      status: 'requested',
    })

    const rows = await asBen.query(api.loans.listMyBorrowing)

    expect(rows.map((row) => [row.startDate, row.status])).toEqual([
      ['2026-12-05', 'requested'],
      ['2026-12-20', 'declined'],
    ])
  })

  test("each row has exactly the declared keys and the lender's first name only", async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'approved',
    })

    const [row] = await asBen.query(api.loans.listMyBorrowing)

    expect(Object.keys(row).sort()).toEqual([
      '_id',
      'endDate',
      'isOverdue',
      'lenderFirstName',
      'startDate',
      'status',
      'toolCategory',
      'toolName',
    ])
    expect(row).toEqual({
      _id: loanId,
      toolName: 'Drill',
      toolCategory: 'power-tools',
      lenderFirstName: 'Asha',
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'approved',
      isOverdue: false,
    })
  })

  test('an approved loan ending yesterday in APP_TIMEZONE is overdue; ending today is not', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-20',
      endDate: yesterday,
      status: 'approved',
    })
    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-21',
      endDate: today,
      status: 'approved',
    })
    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      status: 'returned',
    })

    const rows = await asBen.query(api.loans.listMyBorrowing)

    expect(rows.map((row) => [row.endDate, row.isOverdue])).toEqual([
      ['2026-11-02', false],
      [today, false],
      [yesterday, true],
    ])
  })

  test('a loan on a removed tool still shows the tool name', async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      status: 'returned',
    })
    await asAsha.mutation(api.tools.removeOwn, { toolId })

    const rows = await asBen.query(api.loans.listMyBorrowing)

    expect(rows).toEqual([
      expect.objectContaining({ toolName: 'Drill', status: 'returned' }),
    ])
  })
})
