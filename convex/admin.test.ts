import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { TestConvex } from 'convex-test'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

// 03:00 UTC on the 27th is still the 26th in Toronto.
const now = '2026-11-27T03:00:00Z'
const today = '2026-11-26'
const yesterday = '2026-11-25'

const asha = { name: 'Asha Patel', tokenIdentifier: 'asha' }
const ben = { name: 'Ben Okafor', tokenIdentifier: 'ben' }
const cara = { name: 'Cara Lim', tokenIdentifier: 'cara' }
const dana = { name: 'Dana Ruiz', tokenIdentifier: 'dana' }

const drill = {
  name: 'Drill',
  description: 'Cordless, two batteries',
  category: 'power-tools',
  condition: 'good',
} as const

beforeEach(() => {
  vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
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

const storedUser = (t: TestConvex<typeof schema>, tokenIdentifier: string) =>
  t.run((ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', tokenIdentifier))
      .unique()
  )

const makeAdmin = async (
  t: TestConvex<typeof schema>,
  tokenIdentifier: string
) => {
  const user = await storedUser(t, tokenIdentifier)

  await t.run((ctx) => ctx.db.patch(user!._id, { role: 'admin' }))
}

// Asha lends a drill; Ben and Cara borrow; Dana is the Admin.
const setUpAshasDrill = async () => {
  const t = convexTest(schema, modules)
  const asAsha = await signUp(t, asha)
  const asBen = await signUp(t, ben)
  const asCara = await signUp(t, cara)
  const asDana = await signUp(t, dana)

  await makeAdmin(t, 'dana')
  const toolId = await asAsha.mutation(api.tools.create, drill)

  return { t, asAsha, asBen, asCara, asDana, toolId }
}

type NewLoan = Pick<Doc<'loans'>, 'startDate' | 'endDate' | 'status'>

const insertLoan = async (
  t: TestConvex<typeof schema>,
  toolId: Id<'tools'>,
  borrowerToken: string,
  loan: NewLoan
) => {
  const borrower = await storedUser(t, borrowerToken)

  return await t.run(async (ctx) => {
    const tool = await ctx.db.get(toolId)

    return await ctx.db.insert('loans', {
      ...loan,
      toolId,
      lenderId: tool!.ownerId,
      borrowerId: borrower!._id,
    })
  })
}

const storedTool = (t: TestConvex<typeof schema>, toolId: Id<'tools'>) =>
  t.run((ctx) => ctx.db.get(toolId))

const storedLoan = (t: TestConvex<typeof schema>, loanId: Id<'loans'>) =>
  t.run((ctx) => ctx.db.get(loanId))

describe('admin.listListings', () => {
  test('a signed-out caller is refused', async () => {
    const { t } = await setUpAshasDrill()

    await expect(t.query(api.admin.listListings)).rejects.toThrow(
      'Please sign in.'
    )
  })

  test('a non-admin is refused', async () => {
    const { asBen } = await setUpAshasDrill()

    await expect(asBen.query(api.admin.listListings)).rejects.toThrow(
      'Admins only.'
    )
  })

  test('lists live tools with lender first name and no email, removed tools left out', async () => {
    const { t, asAsha, asDana, toolId } = await setUpAshasDrill()
    const tentId = await asAsha.mutation(api.tools.create, {
      ...drill,
      name: 'Tent',
      category: 'camping',
    })

    await t.run((ctx) => ctx.db.patch(tentId, { removedAt: Date.now() }))

    const listings = await asDana.query(api.admin.listListings)

    expect(listings).toEqual([
      {
        _id: toolId,
        name: 'Drill',
        category: 'power-tools',
        lenderFirstName: 'Asha',
      },
    ])
    expect(JSON.stringify(listings)).not.toContain('@')
  })
})

describe('admin.removeListing', () => {
  test('a signed-out caller is refused and nothing changes', async () => {
    const { t, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'requested',
    })

    await expect(
      t.mutation(api.admin.removeListing, { toolId })
    ).rejects.toThrow('Please sign in.')
    expect((await storedTool(t, toolId))?.removedAt).toBeUndefined()
    expect((await storedLoan(t, loanId))?.status).toBe('requested')
  })

  test('a non-admin is refused and nothing changes', async () => {
    const { t, asBen, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'requested',
    })

    await expect(
      asBen.mutation(api.admin.removeListing, { toolId })
    ).rejects.toThrow('Admins only.')
    expect((await storedTool(t, toolId))?.removedAt).toBeUndefined()
    expect((await storedLoan(t, loanId))?.status).toBe('requested')
  })

  test('a lent-out tool is removed, its loan stays approved and the lender can still mark it returned', async () => {
    const { t, asAsha, asDana, toolId } = await setUpAshasDrill()
    const loanId = await insertLoan(t, toolId, 'ben', {
      startDate: yesterday,
      endDate: today,
      status: 'approved',
    })

    await asDana.mutation(api.admin.removeListing, { toolId })

    expect((await storedTool(t, toolId))?.removedAt).toBeTypeOf('number')
    expect((await storedLoan(t, loanId))?.status).toBe('approved')

    await asAsha.mutation(api.loans.markReturned, { loanId })

    expect((await storedLoan(t, loanId))?.status).toBe('returned')
  })

  test('every waiting request is declined', async () => {
    const { t, asDana, toolId } = await setUpAshasDrill()
    const benLoanId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'requested',
    })
    const caraLoanId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-20',
      endDate: '2026-12-21',
      status: 'requested',
    })

    await asDana.mutation(api.admin.removeListing, { toolId })

    expect((await storedLoan(t, benLoanId))?.status).toBe('declined')
    expect((await storedLoan(t, caraLoanId))?.status).toBe('declined')
  })

  test('a removed tool cannot be requested', async () => {
    const { asBen, asDana, toolId } = await setUpAshasDrill()

    await asDana.mutation(api.admin.removeListing, { toolId })

    await expect(
      asBen.mutation(api.loans.request, {
        toolId,
        startDate: '2026-12-11',
        endDate: '2026-12-13',
      })
    ).rejects.toThrow('Tool not found.')
  })

  test('removing an already removed tool is refused', async () => {
    const { asDana, toolId } = await setUpAshasDrill()

    await asDana.mutation(api.admin.removeListing, { toolId })

    await expect(
      asDana.mutation(api.admin.removeListing, { toolId })
    ).rejects.toThrow('Tool not found.')
  })

  test('removing an unknown tool is refused', async () => {
    const { t, asDana, toolId } = await setUpAshasDrill()

    await t.run((ctx) => ctx.db.delete(toolId))

    await expect(
      asDana.mutation(api.admin.removeListing, { toolId })
    ).rejects.toThrow('Tool not found.')
  })
})

const firstPage = { numItems: 20, cursor: null }

type LoanStatus = Doc<'loans'>['status']

// Follows continueCursor until isDone, so a filter that only holds on page one fails.
const readEveryPage = async (
  asAdmin: Awaited<ReturnType<typeof signUp>>,
  status: LoanStatus
) => {
  const rows = []
  let cursor: string | null = null
  let pageCount = 0

  for (;;) {
    const result: FunctionReturnType<typeof api.admin.listLoans> =
      await asAdmin.query(api.admin.listLoans, {
        status,
        paginationOpts: { numItems: 2, cursor },
      })

    rows.push(...result.page)
    pageCount += 1
    if (result.isDone) {
      return { rows, pageCount }
    }
    cursor = result.continueCursor
  }
}

describe('admin.listLoans', () => {
  test('a signed-out caller is refused', async () => {
    const { t } = await setUpAshasDrill()

    await expect(
      t.query(api.admin.listLoans, { paginationOpts: firstPage })
    ).rejects.toThrow('Please sign in.')
  })

  test('a non-admin is refused', async () => {
    const { asBen } = await setUpAshasDrill()

    await expect(
      asBen.query(api.admin.listLoans, { paginationOpts: firstPage })
    ).rejects.toThrow('Admins only.')
  })

  test('with no status, returns every loan newest first with first names and no email', async () => {
    const { t, asDana, toolId } = await setUpAshasDrill()

    await t.run(async (ctx) => {
      for (const user of await ctx.db.query('users').collect()) {
        await ctx.db.patch(user._id, {
          email: `${user.tokenIdentifier}@x.test`,
        })
      }
    })
    const olderId = await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-20',
      endDate: yesterday,
      status: 'approved',
    })
    const newerId = await insertLoan(t, toolId, 'cara', {
      startDate: '2026-12-11',
      endDate: '2026-12-13',
      status: 'requested',
    })

    const result = await asDana.query(api.admin.listLoans, {
      paginationOpts: firstPage,
    })

    expect(result.isDone).toBe(true)
    expect(result.page).toEqual([
      {
        _id: newerId,
        toolName: 'Drill',
        toolCategory: 'power-tools',
        borrowerFirstName: 'Cara',
        lenderFirstName: 'Asha',
        startDate: '2026-12-11',
        endDate: '2026-12-13',
        status: 'requested',
        isOverdue: false,
      },
      {
        _id: olderId,
        toolName: 'Drill',
        toolCategory: 'power-tools',
        borrowerFirstName: 'Ben',
        lenderFirstName: 'Asha',
        startDate: '2026-11-20',
        endDate: yesterday,
        status: 'approved',
        isOverdue: true,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('@')
  })

  test('with a status, every matching loan appears exactly once across pages and no other status does', async () => {
    const { t, asDana, toolId } = await setUpAshasDrill()
    const approvedIds: Id<'loans'>[] = []

    // Created with falling end dates, so creation order and end-date order disagree.
    for (let day = 18; day >= 10; day -= 1) {
      const status = day % 2 === 0 ? 'approved' : 'requested'
      const loanId = await insertLoan(t, toolId, 'ben', {
        startDate: `2026-12-${day}`,
        endDate: `2026-12-${day}`,
        status,
      })

      if (status === 'approved') {
        approvedIds.push(loanId)
      }
    }

    const { rows, pageCount } = await readEveryPage(asDana, 'approved')

    expect(pageCount).toBeGreaterThan(1)
    expect(rows.every((row) => row.status === 'approved')).toBe(true)
    // The status index sorts by end date, so the filtered list is latest end date first.
    expect(rows.map((row) => row.endDate)).toEqual(
      rows
        .map((row) => row.endDate)
        .sort()
        .reverse()
    )
    expect(rows.map((row) => row._id).sort()).toEqual([...approvedIds].sort())
  })

  test("a removed tool's loan still shows the tool name", async () => {
    const { t, asDana, toolId } = await setUpAshasDrill()

    await insertLoan(t, toolId, 'ben', {
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      status: 'returned',
    })
    await asDana.mutation(api.admin.removeListing, { toolId })

    const { page } = await asDana.query(api.admin.listLoans, {
      status: 'returned',
      paginationOpts: firstPage,
    })

    expect(page.map((row) => row.toolName)).toEqual(['Drill'])
  })
})

describe('admin.listLenders', () => {
  test('a signed-out caller is refused', async () => {
    const { t } = await setUpAshasDrill()

    await expect(t.query(api.admin.listLenders)).rejects.toThrow(
      'Please sign in.'
    )
  })

  test('a non-admin is refused', async () => {
    const { asBen } = await setUpAshasDrill()

    await expect(asBen.query(api.admin.listLenders)).rejects.toThrow(
      'Admins only.'
    )
  })

  test('lists owners of live tools once each, with live tool counts and no email', async () => {
    const { t, asAsha, asBen, asCara, asDana } = await setUpAshasDrill()

    await asAsha.mutation(api.tools.create, { ...drill, name: 'Saw' })
    const removedTentId = await asAsha.mutation(api.tools.create, {
      ...drill,
      name: 'Tent',
    })
    const carasOnlyToolId = await asCara.mutation(api.tools.create, drill)

    await asBen.mutation(api.tools.create, { ...drill, name: 'Ladder' })
    await t.run(async (ctx) => {
      await ctx.db.patch(removedTentId, { removedAt: Date.now() })
      await ctx.db.patch(carasOnlyToolId, { removedAt: Date.now() })
    })

    const lenders = await asDana.query(api.admin.listLenders)
    const ashaRow = await storedUser(t, 'asha')
    const benRow = await storedUser(t, 'ben')

    expect(lenders).toEqual([
      {
        userId: ashaRow!._id,
        firstName: 'Asha',
        liveToolCount: 2,
        isTrustedLender: false,
      },
      {
        userId: benRow!._id,
        firstName: 'Ben',
        liveToolCount: 1,
        isTrustedLender: false,
      },
    ])
    expect(JSON.stringify(lenders)).not.toContain('@')
  })
})

describe('admin.setTrustedLender', () => {
  test('a signed-out caller is refused and nothing changes', async () => {
    const { t } = await setUpAshasDrill()
    const ashaRow = await storedUser(t, 'asha')

    await expect(
      t.mutation(api.admin.setTrustedLender, {
        userId: ashaRow!._id,
        isTrusted: true,
      })
    ).rejects.toThrow('Please sign in.')
    expect((await storedUser(t, 'asha'))?.isTrustedLender).toBe(false)
  })

  test('a non-admin is refused and nothing changes', async () => {
    const { t, asBen } = await setUpAshasDrill()
    const ashaRow = await storedUser(t, 'asha')

    await expect(
      asBen.mutation(api.admin.setTrustedLender, {
        userId: ashaRow!._id,
        isTrusted: true,
      })
    ).rejects.toThrow('Admins only.')
    expect((await storedUser(t, 'asha'))?.isTrustedLender).toBe(false)
  })

  test('granting then revoking shows then hides the badge on the board', async () => {
    const { t, asBen, asDana } = await setUpAshasDrill()
    const ashaRow = await storedUser(t, 'asha')
    const isDrillBadged = async () =>
      (await asBen.query(api.tools.listForBoard))[0].isLenderTrusted

    await asDana.mutation(api.admin.setTrustedLender, {
      userId: ashaRow!._id,
      isTrusted: true,
    })

    expect((await storedUser(t, 'asha'))?.isTrustedLender).toBe(true)
    expect(await isDrillBadged()).toBe(true)

    await asDana.mutation(api.admin.setTrustedLender, {
      userId: ashaRow!._id,
      isTrusted: false,
    })

    expect((await storedUser(t, 'asha'))?.isTrustedLender).toBe(false)
    expect(await isDrillBadged()).toBe(false)
  })

  test('an unknown user is refused', async () => {
    const { t, asDana } = await setUpAshasDrill()
    const ashaRow = await storedUser(t, 'asha')

    await t.run((ctx) => ctx.db.delete(ashaRow!._id))

    await expect(
      asDana.mutation(api.admin.setTrustedLender, {
        userId: ashaRow!._id,
        isTrusted: true,
      })
    ).rejects.toThrow('User not found.')
  })
})
