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
      'latestActivity',
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
      latestActivity: null,
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

// Ben waits on the drill for Fri 11 to Sun 13 December.
const bensRequest = { startDate: '2026-12-11', endDate: '2026-12-13' }

const storedStatus = (t: TestConvex<typeof schema>, loanId: Id<'loans'>) =>
  t.run(async (ctx) => (await ctx.db.get(loanId))?.status)

describe.each(['approve', 'decline'] as const)('loans.%s callers', (move) => {
  test('a signed-out caller is refused', async () => {
    const { t, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await expect(t.mutation(api.loans[move], { loanId })).rejects.toThrow(
      'Please sign in.'
    )
    expect(await storedStatus(t, loanId)).toBe('requested')
  })

  test('a missing loan is refused', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await t.run((ctx) => ctx.db.delete(loanId))

    await expect(asAsha.mutation(api.loans[move], { loanId })).rejects.toThrow(
      'Loan not found.'
    )
  })

  test.each(['ben', 'cara'] as const)(
    'anyone but the lender is refused: %s',
    async (caller) => {
      const { t, asBen, asCara, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensRequest,
        status: 'requested',
      })
      const asCaller = caller === 'ben' ? asBen : asCara

      await expect(
        asCaller.mutation(api.loans[move], { loanId })
      ).rejects.toThrow('Only the lender can answer this request.')
      expect(await storedStatus(t, loanId)).toBe('requested')
    }
  )

  test.each(['approved', 'declined', 'cancelled', 'returned'] as const)(
    'a loan already %s is refused',
    async (status) => {
      const { t, asAsha, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensRequest,
        status,
      })

      await expect(
        asAsha.mutation(api.loans[move], { loanId })
      ).rejects.toThrow('This request has already been answered or cancelled.')
      expect(await storedStatus(t, loanId)).toBe(status)
    }
  )
})

describe('loans.approve', () => {
  test('the lender approves a waiting request', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await asAsha.mutation(api.loans.approve, { loanId })

    expect(await storedStatus(t, loanId)).toBe('approved')
  })

  test('a first day of yesterday is refused', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: yesterday,
      endDate: '2026-12-01',
      status: 'requested',
    })

    await expect(
      asAsha.mutation(api.loans.approve, { loanId })
    ).rejects.toThrow('The first day has passed. Decline this request instead.')
    expect(await storedStatus(t, loanId)).toBe('requested')
  })

  test('a first day of today in APP_TIMEZONE is accepted, though UTC says yesterday', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: today,
      endDate: '2026-11-28',
      status: 'requested',
    })

    await asAsha.mutation(api.loans.approve, { loanId })

    expect(await storedStatus(t, loanId)).toBe('approved')
  })

  test('days clashing with an approved loan on the tool are refused', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-13',
      endDate: '2026-12-15',
      status: 'approved',
    })
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await expect(
      asAsha.mutation(api.loans.approve, { loanId })
    ).rejects.toThrow('The tool is already lent on some of these days.')
    expect(await storedStatus(t, loanId)).toBe('requested')
  })

  test('a request for a removed tool is refused', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await t.run((ctx) => ctx.db.patch(toolId, { removedAt: Date.now() }))

    await expect(
      asAsha.mutation(api.loans.approve, { loanId })
    ).rejects.toThrow('Tool not found.')
    expect(await storedStatus(t, loanId)).toBe('requested')
  })

  test('an approved loan on another tool does not clash', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const ladderId = await asAsha.mutation(api.tools.create, {
      ...drill,
      name: 'Ladder',
    })

    await insertLoan(t, ladderId, 'cara', {
      ...bensRequest,
      status: 'approved',
    })
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await asAsha.mutation(api.loans.approve, { loanId })

    expect(await storedStatus(t, loanId)).toBe('approved')
  })

  test("an overlapping waiting request from someone else stays requested", async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const bensLoanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })
    const carasLoanId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-12',
      endDate: '2026-12-14',
      status: 'requested',
    })

    await asAsha.mutation(api.loans.approve, { loanId: bensLoanId })

    expect(await storedStatus(t, carasLoanId)).toBe('requested')
  })

  test('of two overlapping requests, only the first approval goes through', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const bensLoanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })
    const carasLoanId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-12',
      endDate: '2026-12-14',
      status: 'requested',
    })

    await asAsha.mutation(api.loans.approve, { loanId: bensLoanId })

    await expect(
      asAsha.mutation(api.loans.approve, { loanId: carasLoanId })
    ).rejects.toThrow('The tool is already lent on some of these days.')
    expect(await storedStatus(t, carasLoanId)).toBe('requested')
  })
})

describe('loans.decline', () => {
  test('the lender declines a waiting request', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await asAsha.mutation(api.loans.decline, { loanId })

    expect(await storedStatus(t, loanId)).toBe('declined')
  })

  test('a request whose first day has passed can still be declined', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: yesterday,
      endDate: '2026-12-01',
      status: 'requested',
    })

    await asAsha.mutation(api.loans.decline, { loanId })

    expect(await storedStatus(t, loanId)).toBe('declined')
  })
})

describe('loans.cancel', () => {
  test('the borrower cancels a waiting request, and it stops waiting for the lender', async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    expect(
      (await asAsha.query(api.loans.listWaitingForMe)).map((row) => row._id)
    ).toEqual([loanId])
    expect(await asAsha.query(api.loans.countWaitingForMe)).toBe(1)

    await asBen.mutation(api.loans.cancel, { loanId })

    expect(await storedStatus(t, loanId)).toBe('cancelled')
    expect(await asAsha.query(api.loans.listWaitingForMe)).toEqual([])
    expect(await asAsha.query(api.loans.countWaitingForMe)).toBe(0)
  })

  test('a signed-out caller is refused', async () => {
    const { t, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await expect(t.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      'Please sign in.'
    )
    expect(await storedStatus(t, loanId)).toBe('requested')
  })

  test('a missing loan is refused', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    await t.run((ctx) => ctx.db.delete(loanId))

    await expect(asBen.mutation(api.loans.cancel, { loanId })).rejects.toThrow(
      'Loan not found.'
    )
  })

  test.each(['asha', 'cara'] as const)(
    'anyone but the borrower is refused: %s',
    async (caller) => {
      const { t, asAsha, asCara, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensRequest,
        status: 'requested',
      })
      const asCaller = caller === 'asha' ? asAsha : asCara

      await expect(
        asCaller.mutation(api.loans.cancel, { loanId })
      ).rejects.toThrow('Only the borrower can cancel this request.')
      expect(await storedStatus(t, loanId)).toBe('requested')
    }
  )

  test.each(['approved', 'declined', 'cancelled', 'returned'] as const)(
    'a loan already %s is refused',
    async (status) => {
      const { t, asBen, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensRequest,
        status,
      })

      await expect(
        asBen.mutation(api.loans.cancel, { loanId })
      ).rejects.toThrow('This request has already been answered or cancelled.')
      expect(await storedStatus(t, loanId)).toBe(status)
    }
  )
})

describe('loans.listWaitingForMe and countWaitingForMe', () => {
  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.loans.listWaitingForMe)).rejects.toThrow(
      'Please sign in.'
    )
    await expect(t.query(api.loans.countWaitingForMe)).rejects.toThrow(
      'Please sign in.'
    )
  })

  test("gives only waiting requests for the caller's tools, earliest first day first", async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()
    const bensSawId = await asBen.mutation(api.tools.create, {
      ...drill,
      name: 'Saw',
    })

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-20',
      endDate: '2026-12-21',
      status: 'requested',
    })
    await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      status: 'requested',
    })
    for (const status of ['approved', 'declined', 'cancelled', 'returned'] as const) {
      await insertLoan(t, toolId, 'ben', {
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        status,
      })
    }
    // Asha borrowing Ben's saw is not waiting for Asha.
    await insertLoan(t, bensSawId, 'asha', {
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      status: 'requested',
    })

    const rows = await asAsha.query(api.loans.listWaitingForMe)

    expect(rows.map((row) => [row.startDate, row.borrowerFirstName])).toEqual([
      ['2026-12-05', 'Cara'],
      ['2026-12-20', 'Ben'],
    ])
    expect(await asAsha.query(api.loans.countWaitingForMe)).toBe(2)
    expect(await asBen.query(api.loans.countWaitingForMe)).toBe(1)
  })

  test("each row has exactly the declared keys and the borrower's first name only", async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensRequest,
      status: 'requested',
    })

    const [row] = await asAsha.query(api.loans.listWaitingForMe)

    expect(row).toEqual({
      _id: loanId,
      toolName: 'Drill',
      toolCategory: 'power-tools',
      borrowerFirstName: 'Ben',
      startDate: '2026-12-11',
      endDate: '2026-12-13',
    })
  })

  test('nothing waiting counts zero', async () => {
    const { asAsha } = await setUpAshasDrill()

    expect(await asAsha.query(api.loans.listWaitingForMe)).toEqual([])
    expect(await asAsha.query(api.loans.countWaitingForMe)).toBe(0)
  })
})

// Ben has had the drill since Mon 23 November; it is due back Sat 28th.
const bensLoanOutNow = { startDate: '2026-11-23', endDate: '2026-11-28' }

describe('loans.markReturned', () => {
  test('the lender marks a started loan returned', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect(await storedStatus(t, loanId)).toBe('returned')
  })

  test('an overdue loan can be marked returned', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-20',
      endDate: yesterday,
      status: 'approved',
    })

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect(await storedStatus(t, loanId)).toBe('returned')
  })

  test('a loan starting today in APP_TIMEZONE can be marked returned', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: today,
      endDate: '2026-11-28',
      status: 'approved',
    })

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect(await storedStatus(t, loanId)).toBe('returned')
  })

  test('a loan starting tomorrow in APP_TIMEZONE is refused, though UTC says today', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-27',
      endDate: '2026-11-28',
      status: 'approved',
    })

    await expect(
      asAsha.mutation(api.loans.markReturned, { loanId })
    ).rejects.toThrow('This loan has not started yet.')
    expect(await storedStatus(t, loanId)).toBe('approved')
  })

  test('a signed-out caller is refused', async () => {
    const { t, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })

    await expect(
      t.mutation(api.loans.markReturned, { loanId })
    ).rejects.toThrow('Please sign in.')
    expect(await storedStatus(t, loanId)).toBe('approved')
  })

  test('a missing loan is refused', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })

    await t.run((ctx) => ctx.db.delete(loanId))

    await expect(
      asAsha.mutation(api.loans.markReturned, { loanId })
    ).rejects.toThrow('Loan not found.')
  })

  test.each(['ben', 'cara'] as const)(
    'anyone but the lender is refused: %s',
    async (caller) => {
      const { t, asBen, asCara, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensLoanOutNow,
        status: 'approved',
      })
      const asCaller = caller === 'ben' ? asBen : asCara

      await expect(
        asCaller.mutation(api.loans.markReturned, { loanId })
      ).rejects.toThrow('Only the lender can mark this loan returned.')
      expect(await storedStatus(t, loanId)).toBe('approved')
    }
  )

  test.each(['requested', 'declined', 'cancelled', 'returned'] as const)(
    'a loan that is %s is refused',
    async (status) => {
      const { t, asAsha, toolId } = await setUpAshasDrill()
      const loanId = await insertLoan(t, toolId, 'ben', {
        ...bensLoanOutNow,
        status,
      })

      await expect(
        asAsha.mutation(api.loans.markReturned, { loanId })
      ).rejects.toThrow('Only a loan that is out can be marked returned.')
      expect(await storedStatus(t, loanId)).toBe(status)
    }
  )

  test('once returned, the loan leaves the lent-out list', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })

    expect(await asAsha.query(api.loans.listMyLentOut)).toHaveLength(1)

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect(await asAsha.query(api.loans.listMyLentOut)).toEqual([])
  })

  test('once returned, the board no longer shows the tool lent out', async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })
    const lentOutOnBoard = async () =>
      (await asBen.query(api.tools.listForBoard))[0].lentOut

    expect(await lentOutOnBoard()).toBeDefined()

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect(await lentOutOnBoard()).toBeUndefined()
  })
})

describe('loans.listMyLentOut', () => {
  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.loans.listMyLentOut)).rejects.toThrow(
      'Please sign in.'
    )
  })

  test("gives only the caller's approved loans as lender, earliest first day first", async () => {
    const { t, asAsha, asBen, toolId } = await setUpAshasDrill()
    const bensSawId = await asBen.mutation(api.tools.create, {
      ...drill,
      name: 'Saw',
    })

    await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-20',
      endDate: '2026-12-21',
      status: 'approved',
    })
    await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })
    for (const status of ['requested', 'declined', 'cancelled', 'returned'] as const) {
      await insertLoan(t, toolId, 'ben', {
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        status,
      })
    }
    // Asha borrowing Ben's saw is not lent out by Asha.
    await insertLoan(t, bensSawId, 'asha', {
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      status: 'approved',
    })

    const rows = await asAsha.query(api.loans.listMyLentOut)

    expect(rows.map((row) => [row.startDate, row.borrowerFirstName])).toEqual([
      ['2026-11-23', 'Ben'],
      ['2026-12-20', 'Cara'],
    ])
  })

  test("each row has exactly the declared keys and the borrower's first name only", async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      ...bensLoanOutNow,
      status: 'approved',
    })

    const [row] = await asAsha.query(api.loans.listMyLentOut)

    expect(row).toEqual({
      _id: loanId,
      toolName: 'Drill',
      toolCategory: 'power-tools',
      borrowerFirstName: 'Ben',
      startDate: '2026-11-23',
      endDate: '2026-11-28',
      hasStarted: true,
      isOverdue: false,
      latestActivity: null,
    })
  })

  test('hasStarted and isOverdue follow today in APP_TIMEZONE', async () => {
    const { t, asAsha, toolId } = await setUpAshasDrill()

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
    // Today in UTC, tomorrow in Toronto.
    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-27',
      endDate: '2026-11-28',
      status: 'approved',
    })

    const rows = await asAsha.query(api.loans.listMyLentOut)

    expect(
      rows.map((row) => [row.startDate, row.hasStarted, row.isOverdue])
    ).toEqual([
      ['2026-11-20', true, true],
      ['2026-11-21', true, false],
      ['2026-11-27', false, false],
    ])
  })
})

type NewActivity = Pick<Doc<'loanActivity'>, 'kind' | 'outcome' | 'date'>

const insertActivity = (
  t: TestConvex<typeof schema>,
  loanId: Id<'loans'>,
  activity: NewActivity
) => t.run((ctx) => ctx.db.insert('loanActivity', { loanId, ...activity }))

describe('latest loan activity on the borrowing and lent-out lists', () => {
  const setUpBensOverdueLoan = async () => {
    const setup = await setUpAshasDrill()
    const loanId = await insertLoan(setup.t, setup.toolId, 'ben', {
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      status: 'approved',
    })

    return { ...setup, loanId }
  }

  test('the borrower and the lender both see the latest activity', async () => {
    const { t, asAsha, asBen, loanId } = await setUpBensOverdueLoan()

    await insertActivity(t, loanId, {
      kind: 'overdue-reminder',
      outcome: 'sent',
      date: '2026-11-24',
    })

    const expected = {
      outcome: 'sent',
      label: 'Reminder sent 2 days ago',
    }
    const [borrowed] = await asBen.query(api.loans.listMyBorrowing)
    const [lent] = await asAsha.query(api.loans.listMyLentOut)

    expect(borrowed.latestActivity).toEqual(expected)
    expect(lent.latestActivity).toEqual(expected)
  })

  test('the latest day wins, then the latest row on the same day', async () => {
    const { t, asBen, loanId } = await setUpBensOverdueLoan()

    await insertActivity(t, loanId, {
      kind: 'overdue-reminder',
      outcome: 'sent',
      date: yesterday,
    })
    await insertActivity(t, loanId, {
      kind: 'request-notification',
      outcome: 'sent',
      date: today,
    })
    await insertActivity(t, loanId, {
      kind: 'overdue-reminder',
      outcome: 'failed',
      date: today,
    })
    await insertActivity(t, loanId, {
      kind: 'overdue-reminder',
      outcome: 'sent',
      date: '2026-11-21',
    })

    const [row] = await asBen.query(api.loans.listMyBorrowing)

    expect(row.latestActivity).toEqual({
      outcome: 'failed',
      label: 'Reminder failed today',
    })
  })

  test('a request notification shows only to the person it went to', async () => {
    const { t, asAsha, asBen, loanId } = await setUpBensOverdueLoan()

    // The loan is approved, so its latest notification went to Ben.
    await insertActivity(t, loanId, {
      kind: 'request-notification',
      outcome: 'sent',
      date: today,
    })

    const [borrowed] = await asBen.query(api.loans.listMyBorrowing)
    const [lent] = await asAsha.query(api.loans.listMyLentOut)

    expect(borrowed.latestActivity?.label).toBe(
      'Request notification sent today'
    )
    expect(lent.latestActivity).toBeNull()
  })

  test("another loan's activity never shows on this loan", async () => {
    const { t, asBen, asCara, toolId, loanId } = await setUpBensOverdueLoan()
    const carasLoanId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      status: 'requested',
    })

    await insertActivity(t, loanId, {
      kind: 'overdue-reminder',
      outcome: 'sent',
      date: today,
    })

    const [bensRow] = await asBen.query(api.loans.listMyBorrowing)
    const carasRows = await asCara.query(api.loans.listMyBorrowing)

    expect(bensRow.latestActivity?.label).toBe('Reminder sent today')
    expect(carasRows).toEqual([
      expect.objectContaining({ _id: carasLoanId, latestActivity: null }),
    ])
    expect(await asCara.query(api.loans.listMyLentOut)).toEqual([])
  })
})
