import type { FunctionReturnType } from 'convex/server'
import { categoryStyles } from '@/components/categoryStyles'
import { formatDateRange } from '@/components/formatDateRange'
import LoanStatusPill from '@/components/LoanStatusPill'
import StrokeIcon from '@/components/StrokeIcon'
import type { api } from '@/convex/_generated/api'

type BorrowedLoan = FunctionReturnType<typeof api.loans.listMyBorrowing>[number]

const BorrowedLoanList = ({ loans }: { loans: BorrowedLoan[] }) => {
  if (loans.length === 0) {
    return (
      <p className="text-[15px] text-ink-muted">
        Nothing yet. Find a tool on the board and ask to borrow it.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-line rounded-[20px] border border-line bg-surface">
      {loans.map((loan) => {
        const { iconPath, tintClass } = categoryStyles[loan.toolCategory]

        return (
          <li
            key={loan._id}
            className="flex flex-wrap items-center gap-4 px-5 py-[18px]"
          >
            <span
              className={`flex size-[52px] flex-none items-center justify-center rounded-[14px] ${tintClass}`}
            >
              <StrokeIcon
                path={iconPath}
                strokeWidth={1.5}
                className="size-7 text-ink"
              />
            </span>
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
              <span className="text-base font-semibold">
                {loan.toolName}{' '}
                <span className="font-normal text-ink-muted">
                  from {loan.lenderFirstName}
                </span>
              </span>
              <span className="text-sm text-ink-muted">
                {formatDateRange(loan.startDate, loan.endDate)}
              </span>
            </div>
            {loan.status === 'requested' && (
              <span className="text-sm text-ink-muted">
                Waiting for {loan.lenderFirstName}
              </span>
            )}
            <LoanStatusPill status={loan.isOverdue ? 'overdue' : loan.status} />
          </li>
        )
      })}
    </ul>
  )
}

export default BorrowedLoanList
