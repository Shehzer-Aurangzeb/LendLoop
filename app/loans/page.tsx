import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import BorrowingSection from '@/components/BorrowingSection'
import LentOutSection from '@/components/LentOutSection'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import PageTitle from '@/components/PageTitle'
import SignedInPage from '@/components/SignedInPage'
import WaitingSection from '@/components/WaitingSection'

export const metadata: Metadata = { title: 'Loans' }

export default async function LoansPage() {
  // To the landing page, whose sign-in is a modal. Convenience only: Convex checks the caller.
  await auth.protect({ unauthenticatedUrl: '/' })

  return (
    <SignedInPage>
      <PageTitle>Loans</PageTitle>
      <LoadErrorBoundary
        message="We could not load your loans right now. Please refresh the page."
      >
        <WaitingSection />
        <BorrowingSection />
        <LentOutSection />
      </LoadErrorBoundary>
    </SignedInPage>
  )
}
