'use client'

import { useId } from 'react'
import BorrowedLoanList from '@/components/BorrowedLoanList'
import LoanListSkeleton from '@/components/LoanListSkeleton'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const BorrowingSection = () => {
  const headingId = useId()
  const loans = useQueryOnceUserReady(api.loans.listMyBorrowing)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2
        id={headingId}
        className="font-display text-2xl font-semibold tracking-[-0.02em]"
      >
        You’re borrowing
      </h2>
      {loans === undefined ? (
        <LoanListSkeleton />
      ) : (
        <BorrowedLoanList loans={loans} />
      )}
    </section>
  )
}

export default BorrowingSection
