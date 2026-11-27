import type { Doc } from '@/convex/_generated/dataModel'

// Out and overdue are not stored; both are approved loans, started or past their last day.
type LoanPillStatus = Doc<'loans'>['status'] | 'out' | 'overdue'

// Cancelled has no colour in the mockup, so it shares declined's grey.
const pills: Record<LoanPillStatus, { label: string; className: string }> = {
  requested: {
    label: 'Requested',
    className: 'bg-status-requested text-status-requested-ink',
  },
  approved: { label: 'Approved', className: 'bg-accent-soft text-accent' },
  out: { label: 'Out now', className: 'bg-accent-soft text-accent' },
  overdue: {
    label: 'Overdue',
    className: 'bg-status-overdue text-status-overdue-ink',
  },
  declined: { label: 'Declined', className: 'bg-status-closed text-ink-soft' },
  cancelled: { label: 'Cancelled', className: 'bg-status-closed text-ink-soft' },
  returned: {
    label: 'Returned',
    className: 'bg-status-returned text-status-returned-ink',
  },
}

const LoanStatusPill = ({ status }: { status: LoanPillStatus }) => (
  <span
    className={`rounded-full px-3 py-[5px] text-[13px] font-semibold ${pills[status].className}`}
  >
    {pills[status].label}
  </span>
)

export default LoanStatusPill
