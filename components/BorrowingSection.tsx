'use client'

import { useId } from 'react'
import BorrowedLoanList from '@/components/BorrowedLoanList'
import ListSkeleton from '@/components/ListSkeleton'
import SectionHeading from '@/components/SectionHeading'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const BorrowingSection = () => {
  const headingId = useId()
  const loans = useQueryOnceUserReady(api.loans.listMyBorrowing)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>You’re borrowing</SectionHeading>
      {loans === undefined ? (
        <ListSkeleton label="Loading your loans" rowHeightPx={88} />
      ) : (
        <BorrowedLoanList loans={loans} />
      )}
    </section>
  )
}

export default BorrowingSection
