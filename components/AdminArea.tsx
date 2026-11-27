'use client'

import ListSkeleton from '@/components/ListSkeleton'
import AdminListingsSection from '@/components/AdminListingsSection'
import AdminLoansSection from '@/components/AdminLoansSection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

// Live, so a demoted Admin's open page switches to the message without a reload.
const AdminArea = () => {
  const isAdmin = useQueryOnceUserReady(api.users.amIAdmin)

  if (isAdmin === undefined) {
    return <ListSkeleton label="Loading listings" rowHeightPx={76} />
  }
  if (!isAdmin) {
    return (
      <p className="text-[15px] text-ink-muted">
        You don&rsquo;t have permission to view this page.
      </p>
    )
  }

  return (
    <>
      <AdminListingsSection />
      {/* Its own boundary, so a failed loan page leaves Listings usable. */}
      <LoadErrorBoundary message="We could not load the loans right now. Please refresh the page.">
        <AdminLoansSection />
      </LoadErrorBoundary>
    </>
  )
}

export default AdminArea
