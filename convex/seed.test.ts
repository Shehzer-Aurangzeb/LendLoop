import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

// 03:00 UTC on the 27th is still the 26th in Toronto, so a UTC "today" fails.
const now = '2026-11-27T03:00:00Z'
const today = '2026-11-26'

const countRows = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => ({
    users: (await ctx.db.query('users').collect()).length,
    tools: (await ctx.db.query('tools').collect()).length,
    loans: (await ctx.db.query('loans').collect()).length,
    loanActivity: (await ctx.db.query('loanActivity').collect()).length,
  }))

const seedAndLoadLoans = async () => {
  const t = convexTest(schema, modules)

  await t.mutation(internal.seed.run)

  const loans = await t.run((ctx) => ctx.db.query('loans').collect())

  return { t, loans }
}

describe('seed.run', () => {
  // The generated `env` is process.env, so convex-test sees stubbed values.
  beforeEach(() => {
    vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
    // Fake Date only, so convex-test's own timers keep running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(now))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  test('creates the full demo data set', async () => {
    const { t, loans } = await seedAndLoadLoans()
    const { users, tools, activity } = await t.run(async (ctx) => ({
      users: await ctx.db.query('users').collect(),
      tools: await ctx.db.query('tools').collect(),
      activity: await ctx.db.query('loanActivity').collect(),
    }))

    expect(users).toHaveLength(6)
    expect(users.filter((user) => user.isTrustedLender)).toHaveLength(1)
    expect(users.some((user) => user.role === 'admin')).toBe(false)

    expect(tools).toHaveLength(15)
    expect(new Set(tools.map((tool) => tool.category))).toEqual(
      new Set([
        'power-tools',
        'hand-tools',
        'garden',
        'kitchen',
        'camping',
        'other',
      ])
    )
    expect(new Set(tools.map((tool) => tool.condition))).toEqual(
      new Set(['like-new', 'good', 'worn'])
    )

    expect(new Set(loans.map((loan) => loan.status))).toEqual(
      new Set(['requested', 'approved', 'declined', 'returned', 'cancelled'])
    )

    const overdue = loans.find(
      (loan) => loan.status === 'approved' && loan.endDate < today
    )

    expect(activity.length).toBeGreaterThan(0)
    expect(activity).toContainEqual(
      expect.objectContaining({
        loanId: overdue?._id,
        kind: 'overdue-reminder',
      })
    )
  })

  test('approved loans are dated from today in APP_TIMEZONE', async () => {
    const { loans } = await seedAndLoadLoans()
    const approved = loans.filter((loan) => loan.status === 'approved')

    expect(approved.map((loan) => loan.startDate)).toContain(today)
    expect(approved.map((loan) => loan.endDate)).toContain('2026-11-24')
    expect(approved.some((loan) => loan.startDate > today)).toBe(true)
  })

  test('the cancelled loan is on a removed tool', async () => {
    const { t, loans } = await seedAndLoadLoans()
    const cancelled = loans.filter((loan) => loan.status === 'cancelled')
    const tools = await t.run((ctx) =>
      Promise.all(cancelled.map((loan) => ctx.db.get(loan.toolId)))
    )

    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool?.removedAt).toBeTypeOf('number')
    }
  })

  test('every lender owns the tool and is not the borrower', async () => {
    const { t, loans } = await seedAndLoadLoans()
    const tools = await t.run((ctx) =>
      Promise.all(loans.map((loan) => ctx.db.get(loan.toolId)))
    )

    loans.forEach((loan, i) => {
      expect(loan.lenderId).toBe(tools[i]?.ownerId)
      expect(loan.lenderId).not.toBe(loan.borrowerId)
    })
  })

  test('a second run changes no row count', async () => {
    const t = convexTest(schema, modules)

    await t.mutation(internal.seed.run)
    const afterFirst = await countRows(t)

    await t.mutation(internal.seed.run)
    const afterSecond = await countRows(t)

    expect(afterSecond).toEqual(afterFirst)
  })
})
