import type { Doc } from '@/convex/_generated/dataModel'

export type LoanStatus = Doc<'loans'>['status']

export const loanStatusLabels: Record<LoanStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  declined: 'Declined',
  returned: 'Returned',
  cancelled: 'Cancelled',
}
