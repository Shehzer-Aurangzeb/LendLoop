'use client'

import { useId, useState } from 'react'
import AdminLoanList from '@/components/AdminLoanList'
import ListSkeleton from '@/components/ListSkeleton'
import { loanStatusLabels } from '@/components/loanStatusLabels'
import { outlineButtonClass } from '@/components/outlineButtonClass'
import RadioGroup from '@/components/RadioGroup'
import SectionHeading from '@/components/SectionHeading'
import {
  ADMIN_LOANS_PAGE_SIZE,
  useAdminLoans,
} from '@/components/useAdminLoans'
import type { LoanStatusFilter } from '@/components/useAdminLoans'

const filterLabels: Record<LoanStatusFilter, string> = {
  all: 'All',
  ...loanStatusLabels,
}

const AdminLoansSection = () => {
  const headingId = useId()
  const [filter, setFilter] = useState<LoanStatusFilter>('all')
  const { results, status, loadMore } = useAdminLoans(filter)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>Loans</SectionHeading>
      <RadioGroup
        legend="Show loans that are"
        name="loan-status"
        labels={filterLabels}
        selected={filter}
        onSelect={setFilter}
        look="pills"
      />
      {status === 'LoadingFirstPage' ? (
        <ListSkeleton label="Loading loans" rowHeightPx={88} />
      ) : results.length === 0 ? (
        <p className="text-[15px] text-ink-muted">
          {filter === 'all'
            ? 'No loans yet.'
            : `No ${filterLabels[filter].toLowerCase()} loans.`}
        </p>
      ) : (
        <AdminLoanList loans={results} />
      )}
      {(status === 'CanLoadMore' || status === 'LoadingMore') && (
        // aria-disabled, not disabled, so focus stays on the button while the next page loads.
        <button
          type="button"
          aria-disabled={status === 'LoadingMore'}
          onClick={() =>
            status === 'CanLoadMore' && loadMore(ADMIN_LOANS_PAGE_SIZE)
          }
          className={`${outlineButtonClass} self-center`}
        >
          {status === 'LoadingMore' ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  )
}

export default AdminLoansSection
