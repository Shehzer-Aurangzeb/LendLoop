import type { FunctionReturnType } from 'convex/server'
import LoanList from '@/components/LoanList'
import LoanRow from '@/components/LoanRow'
import LoanStatusPill from '@/components/LoanStatusPill'
import type { api } from '@/convex/_generated/api'

type AdminLoan = FunctionReturnType<typeof api.admin.listLoans>['page'][number]

const AdminLoanList = ({ loans }: { loans: AdminLoan[] }) => (
  <LoanList>
    {loans.map((loan) => (
      <LoanRow
        key={loan._id}
        toolName={loan.toolName}
        toolCategory={loan.toolCategory}
        otherPersonLine={`${loan.borrowerFirstName} borrowing from ${loan.lenderFirstName}`}
        startDate={loan.startDate}
        endDate={loan.endDate}
      >
        <LoanStatusPill status={loan.isOverdue ? 'overdue' : loan.status} />
      </LoanRow>
    ))}
  </LoanList>
)

export default AdminLoanList
