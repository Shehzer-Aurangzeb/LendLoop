'use client'

import { useId } from 'react'
import LentOutLoanList from '@/components/LentOutLoanList'
import LoanListSkeleton from '@/components/LoanListSkeleton'
import SectionHeading from '@/components/SectionHeading'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const LentOutSection = () => {
  const headingId = useId()
  const loans = useQueryOnceUserReady(api.loans.listMyLentOut)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>You’ve lent out</SectionHeading>
      {loans === undefined ? (
        <LoanListSkeleton />
      ) : (
        <LentOutLoanList loans={loans} />
      )}
    </section>
  )
}

export default LentOutSection
