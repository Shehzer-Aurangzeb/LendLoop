'use client'

import Link from 'next/link'
import HideOnError from '@/components/HideOnError'
import { useQueryOnceUserReady } from '@/components/useQueryOnceUserReady'
import { api } from '@/convex/_generated/api'

const AdminNavLink = ({ className }: { className: string }) => {
  const isAdmin = useQueryOnceUserReady(api.users.amIAdmin)

  if (!isAdmin) {
    return null
  }

  return (
    <Link href="/admin" className={`inline-flex ${className}`}>
      Admin
    </Link>
  )
}

// A failed check drops the link, not the header.
const SafeAdminNavLink = ({ className }: { className: string }) => (
  <HideOnError>
    <AdminNavLink className={className} />
  </HideOnError>
)

export default SafeAdminNavLink
