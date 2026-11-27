import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import MyToolsWorkspace from '@/components/MyToolsWorkspace'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'

export const metadata: Metadata = { title: 'My tools' }

export default async function MyToolsPage() {
  // Redirects a signed-out visitor to sign in. Convenience only: Convex checks the caller.
  await auth.protect()

  return (
    <>
      <SiteHeader />
      <main className="page-container flex flex-1 flex-col gap-5 pt-10 pb-[72px]">
        <h1 className="font-display text-[38px] font-bold tracking-[-0.03em]">
          My tools
        </h1>
        <LoadErrorBoundary
          message="We could not load your tools right now. Please refresh the page."
        >
          <MyToolsWorkspace />
        </LoadErrorBoundary>
      </main>
      <SiteFooter />
    </>
  )
}
