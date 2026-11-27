import { loanStatusLabels } from '@/components/loanStatusLabels'
import type { LoanStatus } from '@/components/loanStatusLabels'

// Out and overdue are not stored; both are approved loans, started or past their last day.
type LoanPillStatus = LoanStatus | 'out' | 'overdue'

const labels: Record<LoanPillStatus, string> = {
  ...loanStatusLabels,
  out: 'Out now',
  overdue: 'Overdue',
}

// Cancelled has no colour in the mockup, so it shares declined's grey.
const pillClasses: Record<LoanPillStatus, string> = {
  requested: 'bg-status-requested text-status-requested-ink',
  approved: 'bg-accent-soft text-accent',
  out: 'bg-accent-soft text-accent',
  overdue: 'bg-status-overdue text-status-overdue-ink',
  declined: 'bg-status-closed text-ink-soft',
  cancelled: 'bg-status-closed text-ink-soft',
  returned: 'bg-status-returned text-status-returned-ink',
}

const LoanStatusPill = ({ status }: { status: LoanPillStatus }) => (
  <span
    className={`rounded-full px-3 py-[5px] text-[13px] font-semibold ${pillClasses[status]}`}
  >
    {labels[status]}
  </span>
)

export default LoanStatusPill
