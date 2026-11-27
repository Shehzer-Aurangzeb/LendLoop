'use client'

import { useId } from 'react'
import AdminListingRow from '@/components/AdminListingRow'
import ListSkeleton from '@/components/ListSkeleton'
import SectionHeading from '@/components/SectionHeading'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const AdminListingsSection = () => {
  const headingId = useId()
  const listings = useQueryOnceUserReady(api.admin.listListings)

  // The removed row and its button are gone, so focus moves to the heading.
  const focusHeading = () => document.getElementById(headingId)?.focus()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>Listings</SectionHeading>
      {listings === undefined ? (
        <ListSkeleton label="Loading listings" rowHeightPx={76} />
      ) : listings.length === 0 ? (
        <p className="text-[15px] text-ink-muted">No live listings.</p>
      ) : (
        <ul aria-label="Live listings" className="flex flex-col gap-3">
          {listings.map((listing) => (
            <AdminListingRow
              key={listing._id}
              listing={listing}
              onRemoved={focusHeading}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminListingsSection
