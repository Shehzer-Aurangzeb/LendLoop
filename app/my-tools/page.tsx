import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import MyToolsWorkspace from '@/components/MyToolsWorkspace'
import PageTitle from '@/components/PageTitle'
import SignedInPage from '@/components/SignedInPage'

export const metadata: Metadata = { title: 'My tools' }

export default async function MyToolsPage() {
  // Redirects a signed-out visitor to sign in. Convenience only: Convex checks the caller.
  await auth.protect()

  return (
    <SignedInPage>
      <PageTitle>My tools</PageTitle>
      <LoadErrorBoundary
        message="We could not load your tools right now. Please refresh the page."
      >
        <MyToolsWorkspace />
      </LoadErrorBoundary>
    </SignedInPage>
  )
}
