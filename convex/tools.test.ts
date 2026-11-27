import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, test } from 'vitest'
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
