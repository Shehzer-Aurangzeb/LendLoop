import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import AdminArea from '@/components/AdminArea'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import PageTitle from '@/components/PageTitle'
import SignedInPage from '@/components/SignedInPage'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  // To the landing page, whose sign-in is a modal. Convenience only: Convex checks the caller.
  await auth.protect({ unauthenticatedUrl: '/' })

  return (
    <SignedInPage>
      <PageTitle>Admin</PageTitle>
      <LoadErrorBoundary message="We could not load the admin page right now. Please refresh the page.">
        <AdminArea />
      </LoadErrorBoundary>
    </SignedInPage>
  )
}
