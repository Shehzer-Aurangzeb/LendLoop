import type { Doc } from '@/convex/_generated/dataModel'

// Lent out: approved and started. The end date only decides overdue, never "out".
export const isLentOutOn = (loan: Doc<'loans'>, today: string) =>
  loan.status === 'approved' && loan.startDate <= today
