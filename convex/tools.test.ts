import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { TestConvex } from 'convex-test'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import schema from '@/convex/schema'

const modules = import.meta.glob('./**/*.ts')

type NewTool = Pick<Doc<'tools'>, 'name' | 'category'> &
  Partial<Pick<Doc<'tools'>, 'removedAt'>>

const insertTools = (t: TestConvex<typeof schema>, tools: NewTool[]) =>
  t.run(async (ctx) => {
    const ownerId = await ctx.db.insert('users', {
      tokenIdentifier: 'lender',
      name: 'Asha',
      email: 'asha@example.com',
      role: 'user',
      isTrustedLender: false,
    })

    for (const tool of tools) {
      await ctx.db.insert('tools', {
        ownerId,
        description: 'Private lender note',
        condition: 'good',
        ...tool,
      })
    }
  })

describe('tools.listPublic', () => {
  test('a signed-out visitor gets the list, empty when no tools', async () => {
    const t = convexTest(schema, modules)

    expect(await t.query(api.tools.listPublic)).toEqual([])
  })

  test('each tool has exactly name and category, nothing private', async () => {
    const t = convexTest(schema, modules)

    await insertTools(t, [{ name: 'Drill', category: 'power-tools' }])

    const tools = await t.query(api.tools.listPublic)

    expect(tools).toEqual([{ name: 'Drill', category: 'power-tools' }])
    expect(Object.keys(tools[0]).sort()).toEqual(['category', 'name'])
  })

  test('a removed tool is not returned', async () => {
    const t = convexTest(schema, modules)

    await insertTools(t, [
      { name: 'Drill', category: 'power-tools' },
      { name: 'Tent', category: 'camping', removedAt: Date.now() },
    ])

    expect(await t.query(api.tools.listPublic)).toEqual([
      { name: 'Drill', category: 'power-tools' },
    ])
  })

  test('tools come back sorted A to Z by name', async () => {
    const t = convexTest(schema, modules)

    await insertTools(t, [
      { name: 'Tent', category: 'camping' },
      { name: 'Axe', category: 'hand-tools' },
      { name: 'Mixer', category: 'kitchen' },
    ])

    const tools = await t.query(api.tools.listPublic)

    expect(tools.map((tool) => tool.name)).toEqual(['Axe', 'Mixer', 'Tent'])
  })
})

const asha = { name: 'Asha Patel', tokenIdentifier: 'asha' }
const ben = { name: 'Ben Okafor', tokenIdentifier: 'ben' }

const newTool = {
  name: 'Drill',
  description: 'Cordless, two batteries',
  category: 'power-tools',
  condition: 'good',
} as const

const signUp = async (
  t: TestConvex<typeof schema>,
  identity: { name: string; tokenIdentifier: string }
) => {
  const asUser = t.withIdentity(identity)

  await asUser.mutation(api.users.store)

  return asUser
}

const storedTools = (t: TestConvex<typeof schema>) =>
  t.run((ctx) => ctx.db.query('tools').collect())

describe('tools.create', () => {
  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.mutation(api.tools.create, newTool)).rejects.toThrow(
      'Please sign in'
    )
    expect(await storedTools(t)).toEqual([])
  })

  test('saves trimmed text with the caller as owner', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)

    await asAsha.mutation(api.tools.create, {
      ...newTool,
      name: '  Drill  ',
      description: '\n Cordless, two batteries  ',
    })

    const [tool] = await storedTools(t)
    const ashaUser = await t.run((ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_token', (q) => q.eq('tokenIdentifier', 'asha'))
        .unique()
    )

    expect(tool).toMatchObject({
      ...newTool,
      ownerId: ashaUser?._id,
    })
    expect(tool.removedAt).toBeUndefined()
  })

  test.each([
    ['an empty name', { name: '' }, 'Name'],
    ['an all-spaces name', { name: '   ' }, 'Name'],
    ['a name over 60 characters', { name: 'a'.repeat(61) }, 'Name'],
    ['an empty description', { description: '' }, 'Description'],
    ['an all-spaces description', { description: '  \n ' }, 'Description'],
    [
      'a description over 280 characters',
      { description: 'a'.repeat(281) },
      'Description',
    ],
  ])('%s is refused with a short message', async (_, change, field) => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)

    const error = await asAsha
      .mutation(api.tools.create, { ...newTool, ...change })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<string>).data).toMatch(new RegExp(`^${field}`))
    expect(await storedTools(t)).toEqual([])
  })

  test('exactly 60 and 280 characters after trimming are accepted', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)

    await asAsha.mutation(api.tools.create, {
      ...newTool,
      name: ` ${'a'.repeat(60)} `,
      description: ` ${'b'.repeat(280)} `,
    })

    expect(await storedTools(t)).toHaveLength(1)
  })
})

describe('tools.listMine', () => {
  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.tools.listMine)).rejects.toThrow('Please sign in')
  })

  test("returns only the caller's tools, without removed ones, A to Z", async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)
    const asBen = await signUp(t, ben)

    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Tent' })
    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Axe' })
    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Old saw' })
    await asBen.mutation(api.tools.create, { ...newTool, name: 'Ladder' })
    await t.run(async (ctx) => {
      const oldSaw = (await ctx.db.query('tools').collect()).find(
        (tool) => tool.name === 'Old saw'
      )

      await ctx.db.patch(oldSaw!._id, { removedAt: Date.now() })
    })

    const tools = await asAsha.query(api.tools.listMine)

    expect(tools.map((tool) => tool.name)).toEqual(['Axe', 'Tent'])
  })

  test('each item has exactly the declared keys', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)

    await asAsha.mutation(api.tools.create, newTool)

    const [tool] = await asAsha.query(api.tools.listMine)

    expect(Object.keys(tool).sort()).toEqual([
      '_id',
      'category',
      'condition',
      'name',
    ])
    expect(tool).toMatchObject({
      name: 'Drill',
      category: 'power-tools',
      condition: 'good',
    })
  })
})

type BoardLoan = Pick<Doc<'loans'>, 'startDate' | 'endDate' | 'status'>

// 03:00 UTC on the 27th is still the 26th in Toronto, so a UTC "today" fails.
const boardNow = '2026-11-27T03:00:00Z'

const listDrillWithLoans = async (loans: BoardLoan[]) => {
  const t = convexTest(schema, modules)
  const asAsha = await signUp(t, asha)
  const asBen = await signUp(t, ben)
  const toolId = await asAsha.mutation(api.tools.create, newTool)

  await t.run(async (ctx) => {
    const tool = await ctx.db.get(toolId)
    const borrower = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', 'ben'))
      .unique()

    for (const loan of loans) {
      await ctx.db.insert('loans', {
        ...loan,
        toolId,
        lenderId: tool!.ownerId,
        borrowerId: borrower!._id,
      })
    }
  })

  const [drill] = await asBen.query(api.tools.listForBoard)

  return drill
}

describe('tools.listForBoard', () => {
  beforeEach(() => {
    vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
    // Fake Date only, so convex-test's own timers keep running.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(boardNow))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  test('a signed-out caller is refused', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.tools.listForBoard)).rejects.toThrow(
      'Please sign in'
    )
  })

  test('returns every tool not removed, A to Z', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)
    const asBen = await signUp(t, ben)

    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Tent' })
    await asBen.mutation(api.tools.create, { ...newTool, name: 'Axe' })
    const oldSawId = await asAsha.mutation(api.tools.create, {
      ...newTool,
      name: 'Old saw',
    })

    await t.run((ctx) => ctx.db.patch(oldSawId, { removedAt: Date.now() }))

    const tools = await asBen.query(api.tools.listForBoard)

    expect(tools.map((tool) => tool.name)).toEqual(['Axe', 'Tent'])
  })

  test('an available tool has exactly the declared keys, nothing private', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)
    const asBen = await signUp(t, ben)

    await asAsha.mutation(api.tools.create, newTool)

    const [tool] = await asBen.query(api.tools.listForBoard)

    expect(Object.keys(tool).sort()).toEqual([
      '_id',
      'category',
      'condition',
      'isLenderTrusted',
      'isMine',
      'lenderFirstName',
      'name',
    ])
    expect(tool).toMatchObject({
      name: 'Drill',
      category: 'power-tools',
      condition: 'good',
      lenderFirstName: 'Asha',
    })
  })

  test('isMine is true only for the caller\'s tools', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)
    const asBen = await signUp(t, ben)

    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Axe' })
    await asBen.mutation(api.tools.create, { ...newTool, name: 'Ladder' })

    const tools = await asBen.query(api.tools.listForBoard)

    expect(tools.map(({ name, isMine }) => ({ name, isMine }))).toEqual([
      { name: 'Axe', isMine: false },
      { name: 'Ladder', isMine: true },
    ])
  })

  test('isLenderTrusted matches the lender', async () => {
    const t = convexTest(schema, modules)
    const asAsha = await signUp(t, asha)
    const asBen = await signUp(t, ben)

    await asAsha.mutation(api.tools.create, { ...newTool, name: 'Axe' })
    await asBen.mutation(api.tools.create, { ...newTool, name: 'Ladder' })
    await t.run(async (ctx) => {
      const ashaUser = await ctx.db
        .query('users')
        .withIndex('by_token', (q) => q.eq('tokenIdentifier', 'asha'))
        .unique()

      await ctx.db.patch(ashaUser!._id, { isTrustedLender: true })
    })

    const tools = await asBen.query(api.tools.listForBoard)

    expect(
      tools.map(({ lenderFirstName, isLenderTrusted }) => ({
        lenderFirstName,
        isLenderTrusted,
      }))
    ).toEqual([
      { lenderFirstName: 'Asha', isLenderTrusted: true },
      { lenderFirstName: 'Ben', isLenderTrusted: false },
    ])
  })

  test('a lent-out tool has exactly the declared keys, lentOut included', async () => {
    const drill = await listDrillWithLoans([
      { startDate: '2026-11-24', endDate: '2026-11-30', status: 'approved' },
    ])

    expect(Object.keys(drill).sort()).toEqual([
      '_id',
      'category',
      'condition',
      'isLenderTrusted',
      'isMine',
      'lenderFirstName',
      'lentOut',
      'name',
    ])
    expect(Object.keys(drill.lentOut!).sort()).toEqual([
      'isOverdue',
      'until',
    ])
  })

  test('a started approved loan makes the tool out until its end date', async () => {
    const drill = await listDrillWithLoans([
      { startDate: '2026-11-24', endDate: '2026-11-30', status: 'approved' },
    ])

    expect(drill.lentOut).toEqual({ until: '2026-11-30', isOverdue: false })
  })

  test('an approved loan past its end date is out and overdue', async () => {
    const drill = await listDrillWithLoans([
      { startDate: '2026-11-20', endDate: '2026-11-25', status: 'approved' },
    ])

    expect(drill.lentOut).toEqual({ until: '2026-11-25', isOverdue: true })
  })

  test.each([
    ['only a pending request', 'requested', '2026-11-24'],
    ['a future approved loan', 'approved', '2026-11-28'],
    ['a returned loan', 'returned', '2026-11-24'],
  ] as const)('a tool with %s is available', async (_, status, startDate) => {
    const drill = await listDrillWithLoans([
      { startDate, endDate: '2026-11-30', status },
    ])

    expect(drill.lentOut).toBeUndefined()
  })

  test('a loan starting tomorrow in APP_TIMEZONE is not out, though it is today in UTC', async () => {
    const drill = await listDrillWithLoans([
      { startDate: '2026-11-27', endDate: '2026-11-30', status: 'approved' },
    ])

    expect(drill.lentOut).toBeUndefined()
  })

  test('a loan ending today in APP_TIMEZONE is out but not overdue, though UTC says yesterday', async () => {
    const drill = await listDrillWithLoans([
      { startDate: '2026-11-26', endDate: '2026-11-26', status: 'approved' },
    ])

    expect(drill.lentOut).toEqual({ until: '2026-11-26', isOverdue: false })
  })
})
