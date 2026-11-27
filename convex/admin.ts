import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import { requireAdmin } from '@/convex/lib/auth'
import { todayInAppTimezone } from '@/convex/lib/dates'
import { declineWaitingRequests, isOverdueOn } from '@/convex/lib/loans'
import { loadToolSummary, requireLiveTool } from '@/convex/lib/tools'
import { firstNameOf, loadUsersById } from '@/convex/lib/users'
import { categoryValidator, loanStatusValidator } from '@/convex/schema'

// ponytail: loads every live tool; paginate like the loan list if tools pass the hundreds.
export const listListings = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('tools'),
      name: v.string(),
      category: categoryValidator,
      lenderFirstName: v.string(),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const tools = (await ctx.db.query('tools').collect()).filter(
      (tool) => tool.removedAt === undefined
    )
    const lenders = await loadUsersById(
      ctx,
      tools.map((tool) => tool.ownerId)
    )

    return tools
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ _id, name, category, ownerId }) => ({
        _id,
        name,
        category,
        lenderFirstName: firstNameOf(lenders.get(ownerId)),
      }))
  },
})

// Unlike the lender's removeOwn, this works while lent out: the approved loan runs to its end.
export const removeListing = mutation({
  args: { toolId: v.id('tools') },
  returns: v.null(),
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx)
    await requireLiveTool(ctx, toolId)
    await declineWaitingRequests(ctx, toolId)
    await ctx.db.patch(toolId, { removedAt: Date.now() })

    return null
  },
})

// With a status, rows come from the status index, so they sort by end date, not creation.
export const listLoans = query({
  args: {
    status: v.optional(loanStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      _id: v.id('loans'),
      toolName: v.string(),
      toolCategory: categoryValidator,
      borrowerFirstName: v.string(),
      lenderFirstName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: loanStatusValidator,
      isOverdue: v.boolean(),
    })
  ),
  handler: async (ctx, { status, paginationOpts }) => {
    await requireAdmin(ctx)
    const loans =
      status === undefined
        ? ctx.db.query('loans')
        : ctx.db
            .query('loans')
            .withIndex('by_status_and_endDate', (q) => q.eq('status', status))
    const result = await loans.order('desc').paginate(paginationOpts)
    const today = todayInAppTimezone()
    const users = await loadUsersById(
      ctx,
      result.page.flatMap((loan) => [loan.borrowerId, loan.lenderId])
    )

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (loan) => ({
          _id: loan._id,
          ...(await loadToolSummary(ctx, loan.toolId)),
          borrowerFirstName: firstNameOf(users.get(loan.borrowerId)),
          lenderFirstName: firstNameOf(users.get(loan.lenderId)),
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: loan.status,
          isOverdue: isOverdueOn(loan, today),
        }))
      ),
    }
  },
})
