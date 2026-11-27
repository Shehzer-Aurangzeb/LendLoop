import { usePaginatedQuery } from 'convex/react'
import { useUserReadiness } from '@/components/UserReadinessProvider'
import type { LoanStatus } from '@/components/loanStatusLabels'
import { api } from '@/convex/_generated/api'

export type LoanStatusFilter = LoanStatus | 'all'

export const ADMIN_LOANS_PAGE_SIZE = 20

// New args make the hook drop its pages, so changing the filter restarts paging.
export const useAdminLoans = (filter: LoanStatusFilter) => {
  const { isUserReady, error } = useUserReadiness()
  const args = filter === 'all' ? {} : { status: filter }
  const loans = usePaginatedQuery(
    api.admin.listLoans,
    isUserReady ? args : 'skip',
    { initialNumItems: ADMIN_LOANS_PAGE_SIZE }
  )

  if (error) {
    throw new Error(error)
  }

  return loans
}
