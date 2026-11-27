import type { Doc } from '@/convex/_generated/dataModel'

// Lent out: approved and started. The end date only decides overdue, never "out".
export const isLentOutOn = (loan: Doc<'loans'>, today: string) =>
  loan.status === 'approved' && loan.startDate <= today

type DayRange = { startDate: string; endDate: string }

// Both ends count, so ranges that share one day overlap.
export const doDayRangesOverlap = (a: DayRange, b: DayRange) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate
