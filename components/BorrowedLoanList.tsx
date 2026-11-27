import type { FunctionReturnType } from 'convex/server'
import LoanChangeButton from '@/components/LoanChangeButton'
import LoanList from '@/components/LoanList'
import LoanRow from '@/components/LoanRow'
import LoanStatusPill from '@/components/LoanStatusPill'
import { useCancelRequest } from '@/components/useCancelRequest'
import type { api } from '@/convex/_generated/api'

type BorrowedLoan = FunctionReturnType<typeof api.loans.listMyBorrowing>[number]

const BorrowedLoanList = ({ loans }: { loans: BorrowedLoan[] }) => {
  const cancelRequest = useCancelRequest()

  if (loans.length === 0) {
    return (
      <p className="text-[15px] text-ink-muted">
        Nothing yet. Find a tool on the board and ask to borrow it.
      </p>
    )
  }

  return (
    <LoanList>
      {loans.map((loan) => (
        <LoanRow
          key={loan._id}
          toolName={loan.toolName}
          toolCategory={loan.toolCategory}
          otherPersonLine={`from ${loan.lenderFirstName}`}
          startDate={loan.startDate}
          endDate={loan.endDate}
        >
          {loan.status === 'requested' && (
            <span className="text-sm text-ink-muted">
              Waiting for {loan.lenderFirstName}
            </span>
          )}
          <LoanStatusPill status={loan.isOverdue ? 'overdue' : loan.status} />
          {loan.status === 'requested' && (
            <LoanChangeButton
              label="Cancel"
              screenReaderDetail={`your request for ${loan.toolName}`}
              change={() => cancelRequest(loan._id)}
              rowAfterChange="stays"
            />
          )}
        </LoanRow>
      ))}
    </LoanList>
  )
}

export default BorrowedLoanList
