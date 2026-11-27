'use client'

import ListSkeleton from '@/components/ListSkeleton'
import AdminListingsSection from '@/components/AdminListingsSection'
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

  return <AdminListingsSection />
}

export default AdminArea
