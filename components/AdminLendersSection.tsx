'use client'

import { useId } from 'react'
import AdminLenderRow from '@/components/AdminLenderRow'
import ListSkeleton from '@/components/ListSkeleton'
import SectionHeading from '@/components/SectionHeading'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const AdminLendersSection = () => {
  const headingId = useId()
  const lenders = useQueryOnceUserReady(api.admin.listLenders)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>Lenders</SectionHeading>
      {lenders === undefined ? (
        <ListSkeleton label="Loading lenders" rowHeightPx={76} />
      ) : lenders.length === 0 ? (
        <p className="text-[15px] text-ink-muted">No one lends a tool yet.</p>
      ) : (
        <ul aria-label="Lenders" className="flex flex-col gap-3">
          {lenders.map((lender) => (
            <AdminLenderRow key={lender.userId} lender={lender} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminLendersSection
