import { v } from 'convex/values'
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import {
  isLenderTheRecipient,
  scheduleRequestNotification,
} from '@/convex/lib/notifications'
import { activityOutcomeValidator } from '@/convex/schema'

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
export const declineAndNotifyWaitingRequests = async (
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
    await scheduleRequestNotification(ctx, loan._id, 'declined')
  }
}

type LoanActivity = Pick<Doc<'loanActivity'>, 'kind' | 'outcome' | 'date'>

const activityNames: Record<LoanActivity['kind'], string> = {
  'overdue-reminder': 'Reminder',
  'request-notification': 'Request notification',
}

// Both days read as UTC midnight, so a daylight-saving change never shifts the count.
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000
  )

const formatDaysAgo = (days: number) => {
  if (days <= 0) {
    return 'today'
  }

  return days === 1 ? 'yesterday' : `${days} days ago`
}

export const describeLoanActivity = (
  { kind, outcome, date }: LoanActivity,
  today: string
) =>
  `${activityNames[kind]} ${outcome} ${formatDaysAgo(daysBetween(date, today))}`

export const latestActivityValidator = v.union(
  v.object({
    outcome: activityOutcomeValidator,
    label: v.string(),
  }),
  v.null()
)

// Index order is date, then _creationTime, so desc walks from the latest row.
export const loadLatestActivityLine = async (
  ctx: QueryCtx,
  loan: Doc<'loans'>,
  viewer: 'borrower' | 'lender',
  today: string
) => {
  const rows = await ctx.db
    .query('loanActivity')
    .withIndex('by_loan_and_date', (q) => q.eq('loanId', loan._id))
    .order('desc')
    .collect()
  const latestReminder = rows.find((row) => row.kind === 'overdue-reminder')
  const latestNotification = rows.find(
    (row) => row.kind === 'request-notification'
  )
  // Each status change sends one notification, so the latest one is about the current status.
  const isNotificationForViewer =
    isLenderTheRecipient(loan.status) === (viewer === 'lender')
  const latest = rows.find(
    (row) =>
      row === latestReminder ||
      (isNotificationForViewer && row === latestNotification)
  )

  if (!latest) {
    return null
  }

  return {
    outcome: latest.outcome,
    label: describeLoanActivity(latest, today),
  }
}
