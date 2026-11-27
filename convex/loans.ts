import { ConvexError, v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { requireUser } from '@/convex/lib/auth'
import { isCalendarDay, todayInAppTimezone } from '@/convex/lib/dates'
import { doDayRangesOverlap } from '@/convex/lib/loans'
import { firstNameOf, loadUsersById } from '@/convex/lib/users'
import schema, { categoryValidator } from '@/convex/schema'

// Removed tools are soft-deleted, so past loans still show the name.
const loadToolSummary = async (ctx: QueryCtx, toolId: Id<'tools'>) => {
  const tool = await ctx.db.get(toolId)

  return {
    toolName: tool?.name ?? '',
    toolCategory: tool?.category ?? ('other' as const),
  }
}

// toolId comes from the tool page URL, so a malformed one is "not found", as in getForToolPage.
export const request = mutation({
  args: { toolId: v.string(), startDate: v.string(), endDate: v.string() },
  returns: v.null(),
  handler: async (ctx, { startDate, endDate, ...args }) => {
    const user = await requireUser(ctx)
    const toolId = ctx.db.normalizeId('tools', args.toolId)
    const tool = toolId && (await ctx.db.get(toolId))

    if (!tool || tool.removedAt !== undefined) {
      throw new ConvexError('Tool not found.')
    }
    if (tool.ownerId === user._id) {
      throw new ConvexError('You cannot borrow your own tool.')
    }
    if (!isCalendarDay(startDate) || !isCalendarDay(endDate)) {
      throw new ConvexError('Please pick real dates.')
    }
    if (startDate < todayInAppTimezone()) {
      throw new ConvexError('The first day cannot be in the past.')
    }
    if (endDate < startDate) {
      throw new ConvexError('The last day cannot be before the first day.')
    }

    const overlappingLoans = (
      await ctx.db
        .query('loans')
        .withIndex('by_tool', (q) => q.eq('toolId', tool._id))
        .collect()
    ).filter((loan) => doDayRangesOverlap(loan, { startDate, endDate }))
    const isMine = (loan: Doc<'loans'>) => loan.borrowerId === user._id

    // The caller's own approved loan is left to the next check, which names it better.
    if (
      overlappingLoans.some(
        (loan) => loan.status === 'approved' && !isMine(loan)
      )
    ) {
      throw new ConvexError('The tool is already lent on some of these days.')
    }
    if (
      overlappingLoans.some(
        (loan) =>
          isMine(loan) &&
          (loan.status === 'requested' || loan.status === 'approved')
      )
    ) {
      throw new ConvexError('You already asked for some of these days.')
    }

    await ctx.db.insert('loans', {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate,
      endDate,
      status: 'requested',
    })
    // F6: schedule the request notification here with ctx.scheduler.runAfter(0, ...).

    return null
  },
})

export const listMyBorrowing = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('loans'),
      toolName: v.string(),
      toolCategory: categoryValidator,
      lenderFirstName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: schema.tables.loans.validator.fields.status,
      isOverdue: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const today = todayInAppTimezone()
    const loans = await ctx.db
      .query('loans')
      .withIndex('by_borrower', (q) => q.eq('borrowerId', user._id))
      .order('desc')
      .collect()
    const lenders = await loadUsersById(
      ctx,
      loans.map((loan) => loan.lenderId)
    )

    // ponytail: one get per loan; a neighbour has a few dozen loans at most.
    return await Promise.all(
      loans.map(
        async ({ _id, toolId, lenderId, startDate, endDate, status }) => ({
          _id,
          ...(await loadToolSummary(ctx, toolId)),
          lenderFirstName: firstNameOf(lenders.get(lenderId)),
          startDate,
          endDate,
          status,
          isOverdue: status === 'approved' && endDate < today,
        })
      )
    )
  },
})

const loadRequestForItsLender = async (
  ctx: MutationCtx,
  loanId: Id<'loans'>
) => {
  const user = await requireUser(ctx)
  const loan = await ctx.db.get(loanId)

  if (!loan) {
    throw new ConvexError('Loan not found.')
  }
  if (loan.lenderId !== user._id) {
    throw new ConvexError('Only the lender can answer this request.')
  }
  if (loan.status !== 'requested') {
    throw new ConvexError(
      'This request has already been answered or cancelled.'
    )
  }

  return loan
}

export const approve = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await loadRequestForItsLender(ctx, loanId)

    if (loan.startDate < todayInAppTimezone()) {
      throw new ConvexError(
        'The first day has passed. Decline this request instead.'
      )
    }

    // Read inside the mutation: Convex re-runs one of two racing approvals, which then sees the other.
    const toolLoans = await ctx.db
      .query('loans')
      .withIndex('by_tool', (q) => q.eq('toolId', loan.toolId))
      .collect()

    if (
      toolLoans.some(
        (other) =>
          other.status === 'approved' && doDayRangesOverlap(other, loan)
      )
    ) {
      throw new ConvexError('The tool is already lent on some of these days.')
    }

    await ctx.db.patch(loan._id, { status: 'approved' })
    // F6: schedule the approved notification here with ctx.scheduler.runAfter(0, ...).

    return null
  },
})

export const decline = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await loadRequestForItsLender(ctx, loanId)

    await ctx.db.patch(loan._id, { status: 'declined' })
    // F6: schedule the declined notification here with ctx.scheduler.runAfter(0, ...).

    return null
  },
})

const loadRequestsWaitingFor = async (ctx: QueryCtx, lenderId: Id<'users'>) =>
  (
    await ctx.db
      .query('loans')
      .withIndex('by_lender', (q) => q.eq('lenderId', lenderId))
      .collect()
  ).filter((loan) => loan.status === 'requested')

export const listWaitingForMe = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('loans'),
      toolName: v.string(),
      toolCategory: categoryValidator,
      borrowerFirstName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const loans = (await loadRequestsWaitingFor(ctx, user._id)).sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    )
    const borrowers = await loadUsersById(
      ctx,
      loans.map((loan) => loan.borrowerId)
    )

    return await Promise.all(
      loans.map(async ({ _id, toolId, borrowerId, startDate, endDate }) => ({
        _id,
        ...(await loadToolSummary(ctx, toolId)),
        borrowerFirstName: firstNameOf(borrowers.get(borrowerId)),
        startDate,
        endDate,
      }))
    )
  },
})

export const countWaitingForMe = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await requireUser(ctx)

    return (await loadRequestsWaitingFor(ctx, user._id)).length
  },
})
