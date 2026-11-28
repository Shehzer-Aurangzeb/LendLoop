import type { ReactNode } from 'react'
import type { Doc } from '@/convex/_generated/dataModel'
import type { Category } from '@/components/categoryLabels'
import { formatDateRange } from '@/components/formatDateRange'
import LoanToolIcon from '@/components/LoanToolIcon'

type LoanRowProps = {
  toolName: string
  toolCategory: Category
  otherPersonLine: string
  startDate: string
  endDate: string
  // The latest loan activity line; the admin list has none.
  activity?: { outcome: Doc<'loanActivity'>['outcome']; label: string } | null
  // The status hint, pill and button that follow the dates.
  children: ReactNode
}

const LoanRow = ({
  toolName,
  toolCategory,
  otherPersonLine,
  startDate,
  endDate,
  activity,
  children,
}: LoanRowProps) => (
  // tabIndex -1: focus lands here when a row's button goes but the row stays.
  <li
    tabIndex={-1}
    className="flex flex-wrap items-center gap-4 px-5 py-[18px]"
  >
    <LoanToolIcon category={toolCategory} />
    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
      <span className="text-base font-semibold">
        {toolName}{' '}
        <span className="font-normal text-ink-muted">{otherPersonLine}</span>
      </span>
      <span className="text-sm text-ink-muted">
        {formatDateRange(startDate, endDate)}
      </span>
      {activity && (
        <span
          className={`text-[13px] ${activity.outcome === 'failed' ? 'text-status-overdue-ink' : 'text-ink-muted'}`}
        >
          {activity.label}
        </span>
      )}
    </div>
    {children}
  </li>
)

export default LoanRow
