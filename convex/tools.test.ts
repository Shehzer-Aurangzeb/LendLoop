import { convexTest } from 'convex-test'
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
