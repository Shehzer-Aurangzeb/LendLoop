'use client'

import { useId } from 'react'
import LentOutLoanList from '@/components/LentOutLoanList'
import ListSkeleton from '@/components/ListSkeleton'
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
        <ListSkeleton label="Loading your loans" rowHeightPx={88} />
      ) : (
        <LentOutLoanList loans={loans} />
      )}
    </section>
  )
}

export default LentOutSection
