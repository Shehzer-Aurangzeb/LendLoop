import { ConvexError, v } from 'convex/values'
import { mutation, query } from '@/convex/_generated/server'
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { requireUser } from '@/convex/lib/auth'
import { isCalendarDay, todayInAppTimezone } from '@/convex/lib/dates'
import {
  doDayRangesOverlap,
  isLentOutOn,
  isOverdueOn,
  latestActivityValidator,
  loadLatestActivityLine,
} from '@/convex/lib/loans'
import { scheduleRequestNotification } from '@/convex/lib/notifications'
import { loadToolSummary, requireLiveTool } from '@/convex/lib/tools'
import { firstNameOf, loadUsersById } from '@/convex/lib/users'
import { categoryValidator, loanStatusValidator } from '@/convex/schema'

type DayRange = Pick<Doc<'loans'>, 'startDate' | 'endDate'>

const assertNoApprovedLoanOverlaps = (
  loans: Doc<'loans'>[],
  days: DayRange
) => {
  if (
    loans.some(
      (loan) => loan.status === 'approved' && doDayRangesOverlap(loan, days)
    )
  ) {
    throw new ConvexError('The tool is already lent on some of these days.')
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
    assertNoApprovedLoanOverlaps(
      overlappingLoans.filter((loan) => !isMine(loan)),
      { startDate, endDate }
    )
    if (
      overlappingLoans.some(
        (loan) =>
          isMine(loan) &&
          (loan.status === 'requested' || loan.status === 'approved')
      )
    ) {
      throw new ConvexError('You already asked for some of these days.')
    }

    const loanId = await ctx.db.insert('loans', {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate,
      endDate,
      status: 'requested',
    })

    await scheduleRequestNotification(ctx, loanId, 'requested')

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
      status: loanStatusValidator,
      isOverdue: v.boolean(),
      latestActivity: latestActivityValidator,
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

    // One get per loan; a neighbour has a few dozen loans at most.
    return await Promise.all(
      loans.map(async (loan) => ({
        _id: loan._id,
        ...(await loadToolSummary(ctx, loan.toolId)),
        lenderFirstName: firstNameOf(lenders.get(loan.lenderId)),
        startDate: loan.startDate,
        endDate: loan.endDate,
        status: loan.status,
        isOverdue: isOverdueOn(loan, today),
        latestActivity: await loadLatestActivityLine(
          ctx,
          loan,
          'borrower',
          today
        ),
      }))
    )
  },
})

const requireUserAndLoan = async (ctx: MutationCtx, loanId: Id<'loans'>) => {
  const user = await requireUser(ctx)
  const loan = await ctx.db.get(loanId)

  if (!loan) {
    throw new ConvexError('Loan not found.')
  }

  return { user, loan }
}

// Runs after the caller check, so a stranger learns nothing about the status.
const assertStillRequested = (loan: Doc<'loans'>) => {
  if (loan.status !== 'requested') {
    throw new ConvexError(
      'This request has already been answered or cancelled.'
    )
  }
}

const loadRequestForItsLender = async (
  ctx: MutationCtx,
  loanId: Id<'loans'>
) => {
  const { user, loan } = await requireUserAndLoan(ctx, loanId)

  if (loan.lenderId !== user._id) {
    throw new ConvexError('Only the lender can answer this request.')
  }
  assertStillRequested(loan)

  return loan
}

export const approve = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await loadRequestForItsLender(ctx, loanId)

    await requireLiveTool(ctx, loan.toolId)

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

    assertNoApprovedLoanOverlaps(toolLoans, loan)

    await ctx.db.patch(loan._id, { status: 'approved' })
    await scheduleRequestNotification(ctx, loan._id, 'approved')

    return null
  },
})

export const decline = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const loan = await loadRequestForItsLender(ctx, loanId)

    await ctx.db.patch(loan._id, { status: 'declined' })
    await scheduleRequestNotification(ctx, loan._id, 'declined')

    return null
  },
})

export const cancel = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { user, loan } = await requireUserAndLoan(ctx, loanId)

    if (loan.borrowerId !== user._id) {
      throw new ConvexError('Only the borrower can cancel this request.')
    }
    assertStillRequested(loan)

    await ctx.db.patch(loan._id, { status: 'cancelled' })
    await scheduleRequestNotification(ctx, loan._id, 'cancelled')

    return null
  },
})

export const markReturned = mutation({
  args: { loanId: v.id('loans') },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const { user, loan } = await requireUserAndLoan(ctx, loanId)

    if (loan.lenderId !== user._id) {
      throw new ConvexError('Only the lender can mark this loan returned.')
    }
    if (loan.status !== 'approved') {
      throw new ConvexError('Only a loan that is out can be marked returned.')
    }
    if (!isLentOutOn(loan, todayInAppTimezone())) {
      throw new ConvexError('This loan has not started yet.')
    }

    await ctx.db.patch(loan._id, { status: 'returned' })
    await scheduleRequestNotification(ctx, loan._id, 'returned')

    return null
  },
})

const loadLoansLentByWithStatus = (
  ctx: QueryCtx,
  lenderId: Id<'users'>,
  status: Doc<'loans'>['status']
) =>
  ctx.db
    .query('loans')
    .withIndex('by_lender_and_status', (q) =>
      q.eq('lenderId', lenderId).eq('status', status)
    )
    .collect()

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
    const loans = (
      await loadLoansLentByWithStatus(ctx, user._id, 'requested')
    ).sort((a, b) => a.startDate.localeCompare(b.startDate))
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

    const waiting = await loadLoansLentByWithStatus(ctx, user._id, 'requested')

    return waiting.length
  },
})

export const listMyLentOut = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('loans'),
      toolName: v.string(),
      toolCategory: categoryValidator,
      borrowerFirstName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      hasStarted: v.boolean(),
      isOverdue: v.boolean(),
      latestActivity: latestActivityValidator,
    })
  ),
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const today = todayInAppTimezone()
    const loans = (
      await loadLoansLentByWithStatus(ctx, user._id, 'approved')
    ).sort((a, b) => a.startDate.localeCompare(b.startDate))
    const borrowers = await loadUsersById(
      ctx,
      loans.map((loan) => loan.borrowerId)
    )

    return await Promise.all(
      loans.map(async (loan) => ({
        _id: loan._id,
        ...(await loadToolSummary(ctx, loan.toolId)),
        borrowerFirstName: firstNameOf(borrowers.get(loan.borrowerId)),
        startDate: loan.startDate,
        endDate: loan.endDate,
        hasStarted: isLentOutOn(loan, today),
        isOverdue: isOverdueOn(loan, today),
        latestActivity: await loadLatestActivityLine(
          ctx,
          loan,
          'lender',
          today
        ),
      }))
    )
  },
})
