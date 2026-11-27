import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import BorrowingSection from '@/components/BorrowingSection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import PageTitle from '@/components/PageTitle'
import SignedInPage from '@/components/SignedInPage'
import WaitingSection from '@/components/WaitingSection'

export const metadata: Metadata = { title: 'Loans' }

export default async function LoansPage() {
  // Redirects a signed-out visitor to sign in. Convenience only: Convex checks the caller.
  await auth.protect()

  return (
    <SignedInPage>
      <PageTitle>Loans</PageTitle>
      <LoadErrorBoundary
        message="We could not load your loans right now. Please refresh the page."
      >
        <WaitingSection />
        <BorrowingSection />
      </LoadErrorBoundary>
    </SignedInPage>
  )
}
