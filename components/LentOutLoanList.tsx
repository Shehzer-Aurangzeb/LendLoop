import type { FunctionReturnType } from 'convex/server'
import LoanChangeButton from '@/components/LoanChangeButton'
import LoanList from '@/components/LoanList'
import LoanRow from '@/components/LoanRow'
import LoanStatusPill from '@/components/LoanStatusPill'
import { useMarkReturned } from '@/components/useMarkReturned'
import type { api } from '@/convex/_generated/api'

type LentOutLoan = FunctionReturnType<typeof api.loans.listMyLentOut>[number]

const pillStatusOf = (loan: LentOutLoan) => {
  if (loan.isOverdue) {
    return 'overdue'
  }

  return loan.hasStarted ? 'out' : 'approved'
}

const LentOutLoanList = ({ loans }: { loans: LentOutLoan[] }) => {
  const markReturned = useMarkReturned()

  if (loans.length === 0) {
    return <p className="text-[15px] text-ink-muted">Nothing lent out.</p>
  }

  return (
    <LoanList>
      {loans.map((loan) => (
        <LoanRow
          key={loan._id}
          toolName={loan.toolName}
          toolCategory={loan.toolCategory}
          otherPersonLine={`with ${loan.borrowerFirstName}`}
          startDate={loan.startDate}
          endDate={loan.endDate}
        >
          <LoanStatusPill status={pillStatusOf(loan)} />
          {loan.hasStarted && (
            <LoanChangeButton
              label="Mark as returned"
              screenReaderDetail={`for ${loan.toolName}`}
              change={() => markReturned(loan._id)}
              rowAfterChange="leaves"
            />
          )}
        </LoanRow>
      ))}
    </LoanList>
  )
}

export default LentOutLoanList
