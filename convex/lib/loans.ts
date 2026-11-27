import type { MutationCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'

// Lent out: approved and started. The end date only decides overdue, never "out".
export const isLentOutOn = (loan: Doc<'loans'>, today: string) =>
  loan.status === 'approved' && loan.startDate <= today

// Computed, never stored, so it needs no daily job.
export const isOverdueOn = (
  loan: Pick<Doc<'loans'>, 'status' | 'endDate'>,
  today: string
) => loan.status === 'approved' && loan.endDate < today

type DayRange = { startDate: string; endDate: string }

// Both ends count, so ranges that share one day overlap.
export const doDayRangesOverlap = (a: DayRange, b: DayRange) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate

// A removed tool can never be lent, so its waiting requests are answered for the lender.
export const declineWaitingRequests = async (
  ctx: MutationCtx,
  toolId: Id<'tools'>
) => {
  const waiting = (
    await ctx.db
      .query('loans')
      .withIndex('by_tool', (q) => q.eq('toolId', toolId))
      .collect()
  ).filter((loan) => loan.status === 'requested')

  for (const loan of waiting) {
    await ctx.db.patch(loan._id, { status: 'declined' })
  }
}
