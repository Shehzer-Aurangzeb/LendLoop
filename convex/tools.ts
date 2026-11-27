import { ConvexError, v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import type { MutationCtx } from '@/convex/_generated/server'
import type { Id } from '@/convex/_generated/dataModel'
import { requireUser } from '@/convex/lib/auth'
import { todayInAppTimezone } from '@/convex/lib/dates'
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

// For the lender's own changes; the admin's remove in F5 has its own rules.
const requireOwnTool = async (ctx: MutationCtx, toolId: Id<'tools'>) => {
  const user = await requireUser(ctx)
  const tool = await ctx.db.get(toolId)

  if (!tool || tool.removedAt !== undefined) {
    throw new ConvexError('Tool not found')
  }
  if (tool.ownerId !== user._id) {
    throw new ConvexError('You can only change your own tools')
  }

  return tool
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
      description: v.string(),
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
      .map(({ _id, name, category, condition, description }) => ({
        _id,
        name,
        category,
        condition,
        description,
      }))
  },
})

export const listForBoard = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('tools'),
      name: v.string(),
      category: categoryValidator,
      condition: conditionValidator,
      lenderFirstName: v.string(),
      isLenderTrusted: v.boolean(),
      isMine: v.boolean(),
      // Present only while the tool is lent out.
      lentOut: v.optional(
        v.object({ until: v.string(), isOverdue: v.boolean() })
      ),
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const today = todayInAppTimezone()
    const tools = (await ctx.db.query('tools').collect()).filter(
      (tool) => tool.removedAt === undefined
    )
    // One read for the whole board, never a loans query per tool.
    const approvedLoans = await ctx.db
      .query('loans')
      .withIndex('by_status_and_endDate', (q) => q.eq('status', 'approved'))
      .collect()
    const outUntilByTool = new Map(
      approvedLoans
        .filter((loan) => loan.startDate <= today)
        .map((loan) => [loan.toolId, loan.endDate])
    )
    const lenderIds = [...new Set(tools.map((tool) => tool.ownerId))]
    const lenders = new Map(
      await Promise.all(
        lenderIds.map(async (id) => [id, await ctx.db.get(id)] as const)
      )
    )

    return tools
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ _id, name, category, condition, ownerId }) => {
        const lender = lenders.get(ownerId)
        const outUntil = outUntilByTool.get(_id)

        return {
          _id,
          name,
          category,
          condition,
          lenderFirstName: lender?.name.trim().split(/\s+/)[0] ?? '',
          isLenderTrusted: lender?.isTrustedLender ?? false,
          isMine: ownerId === user._id,
          ...(outUntil !== undefined && {
            lentOut: { until: outUntil, isOverdue: outUntil < today },
          }),
        }
      })
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

export const update = mutation({
  args: {
    toolId: v.id('tools'),
    name: v.string(),
    description: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
  },
  returns: v.null(),
  handler: async (ctx, { toolId, category, condition, ...text }) => {
    await requireOwnTool(ctx, toolId)

    await ctx.db.patch(toolId, {
      ...trimAndCheckToolText(text),
      category,
      condition,
    })

    return null
  },
})

// Soft delete: past loans keep pointing at the tool.
export const removeOwn = mutation({
  args: { toolId: v.id('tools') },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    await requireOwnTool(ctx, toolId)
    const loans = await ctx.db
      .query('loans')
      .withIndex('by_tool', (q) => q.eq('toolId', toolId))
      .collect()

    // Approved means not yet returned, whether it has started or not.
    if (loans.some((loan) => loan.status === 'approved')) {
      throw new ConvexError('This tool has an active loan')
    }

    for (const loan of loans) {
      if (loan.status === 'requested') {
        await ctx.db.patch(loan._id, { status: 'declined' })
      }
    }
    await ctx.db.patch(toolId, { removedAt: Date.now() })

    return null
  },
})
