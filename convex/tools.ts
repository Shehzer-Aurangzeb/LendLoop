import { ConvexError, v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import type { MutationCtx } from '@/convex/_generated/server'
import type { Id } from '@/convex/_generated/dataModel'
import { requireUser } from '@/convex/lib/auth'
import { todayInAppTimezone } from '@/convex/lib/dates'
import { isLentOutOn } from '@/convex/lib/loans'
import { firstNameOf, loadUsersById } from '@/convex/lib/users'
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
    throw new ConvexError('Tool not found.')
  }
  if (tool.ownerId !== user._id) {
    throw new ConvexError('You can only change your own tools.')
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
      lentOut: v.optional(
        v.object({
          until: v.string(),
          isOverdue: v.boolean(),
          borrowerFirstName: v.string(),
        })
      ),
      waitingRequestCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const today = todayInAppTimezone()
    const tools = (
      await ctx.db
        .query('tools')
        .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
        .collect()
    )
      .filter((tool) => tool.removedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
    // One by_tool read per tool is fine: My tools is one lender's few tools.
    const rows = await Promise.all(
      tools.map(async (tool) => {
        const loans = await ctx.db
          .query('loans')
          .withIndex('by_tool', (q) => q.eq('toolId', tool._id))
          .collect()

        return {
          tool,
          outLoan: loans.find((loan) => isLentOutOn(loan, today)),
          waitingRequestCount: loans.filter(
            (loan) => loan.status === 'requested'
          ).length,
        }
      })
    )
    const borrowers = await loadUsersById(
      ctx,
      rows.flatMap(({ outLoan }) => (outLoan ? [outLoan.borrowerId] : []))
    )

    return rows.map(({ tool, outLoan, waitingRequestCount }) => {
      const { _id, name, category, condition, description } = tool
      const borrower = outLoan && borrowers.get(outLoan.borrowerId)

      return {
        _id,
        name,
        category,
        condition,
        description,
        ...(outLoan && {
          lentOut: {
            until: outLoan.endDate,
            isOverdue: outLoan.endDate < today,
            borrowerFirstName: firstNameOf(borrower),
          },
        }),
        waitingRequestCount,
      }
    })
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
        .filter((loan) => isLentOutOn(loan, today))
        .map((loan) => [loan.toolId, loan.endDate])
    )
    const lenders = await loadUsersById(
      ctx,
      tools.map((tool) => tool.ownerId)
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
          lenderFirstName: firstNameOf(lender),
          isLenderTrusted: lender?.isTrustedLender ?? false,
          isMine: ownerId === user._id,
          ...(outUntil !== undefined && {
            lentOut: { until: outUntil, isOverdue: outUntil < today },
          }),
        }
      })
  },
})

// toolId comes from the URL, so a malformed one is "not found", not a validator error.
export const getForToolPage = query({
  args: { toolId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      description: v.string(),
      category: categoryValidator,
      condition: conditionValidator,
      lenderFirstName: v.string(),
      isLenderTrusted: v.boolean(),
      isMine: v.boolean(),
      approvedLoans: v.array(
        v.object({ startDate: v.string(), endDate: v.string() })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const toolId = ctx.db.normalizeId('tools', args.toolId)
    const tool = toolId && (await ctx.db.get(toolId))

    if (!tool || tool.removedAt !== undefined) {
      return null
    }

    const loans = await ctx.db
      .query('loans')
      .withIndex('by_tool', (q) => q.eq('toolId', tool._id))
      .collect()
    const lender = await ctx.db.get(tool.ownerId)
    const { name, description, category, condition } = tool

    return {
      name,
      description,
      category,
      condition,
      lenderFirstName: firstNameOf(lender),
      isLenderTrusted: lender?.isTrustedLender ?? false,
      isMine: tool.ownerId === user._id,
      approvedLoans: loans
        .filter((loan) => loan.status === 'approved')
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map(({ startDate, endDate }) => ({ startDate, endDate })),
    }
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
      throw new ConvexError('This tool has an active loan.')
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
