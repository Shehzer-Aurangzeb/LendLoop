import { ConvexError, v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import { requireUser } from '@/convex/lib/auth'
import { categoryValidator, conditionValidator } from '@/convex/schema'
import {
  TOOL_DESCRIPTION_MAX_LENGTH,
  TOOL_NAME_MAX_LENGTH,
} from '@/convex/toolLimits'

const trimAndCheckToolText = (text: {
  name: string
  description: string
}) => {
  const name = text.name.trim()
  const description = text.description.trim()

  if (name.length < 1 || name.length > TOOL_NAME_MAX_LENGTH) {
    throw new ConvexError(
      `Name must be 1 to ${TOOL_NAME_MAX_LENGTH} characters.`
    )
  }
  if (
    description.length < 1 ||
    description.length > TOOL_DESCRIPTION_MAX_LENGTH
  ) {
    throw new ConvexError(
      `Description must be 1 to ${TOOL_DESCRIPTION_MAX_LENGTH} characters.`
    )
  }

  return { name, description }
}

// Public on purpose: the signed-out tool list, so no auth helper call.
export const listPublic = query({
  args: {},
  returns: v.array(
    v.object({ name: v.string(), category: categoryValidator })
  ),
  handler: async (ctx) => {
    const tools = await ctx.db.query('tools').collect()

    return tools
      .filter((tool) => tool.removedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, category }) => ({ name, category }))
  },
})

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('tools'),
      name: v.string(),
      category: categoryValidator,
      condition: conditionValidator,
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const tools = await ctx.db
      .query('tools')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .collect()

    return tools
      .filter((tool) => tool.removedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ _id, name, category, condition }) => ({
        _id,
        name,
        category,
        condition,
      }))
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
  },
  returns: v.id('tools'),
  handler: async (ctx, { category, condition, ...text }) => {
    const user = await requireUser(ctx)

    return await ctx.db.insert('tools', {
      ...trimAndCheckToolText(text),
      category,
      condition,
      ownerId: user._id,
    })
  },
})
