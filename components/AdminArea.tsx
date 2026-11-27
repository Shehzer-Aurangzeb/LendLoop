'use client'

import ListSkeleton from '@/components/ListSkeleton'
import AdminLendersSection from '@/components/AdminLendersSection'
import AdminListingsSection from '@/components/AdminListingsSection'
import AdminLoansSection from '@/components/AdminLoansSection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

// Live, so a demoted Admin's open page switches to the message without a reload.
const AdminArea = () => {
  const isAdmin = useQueryOnceUserReady(api.users.amIAdmin)

  if (isAdmin === undefined) {
    return <ListSkeleton label="Loading the admin page" rowHeightPx={76} />
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
      <LoadErrorBoundary message="We could not load the listings right now. Please refresh the page.">
        <AdminListingsSection />
      </LoadErrorBoundary>
      {/* One boundary per section, so one failed section leaves the others usable. */}
      <LoadErrorBoundary message="We could not load the loans right now. Please refresh the page.">
        <AdminLoansSection />
      </LoadErrorBoundary>
      <LoadErrorBoundary message="We could not load the lenders right now. Please refresh the page.">
        <AdminLendersSection />
      </LoadErrorBoundary>
    </>
  )
}

export default AdminArea
