import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import MyToolList from '@/components/MyToolList'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import ToolForm from '@/components/ToolForm'

export const metadata: Metadata = { title: 'My tools' }

export default async function MyToolsPage() {
  // Redirects a signed-out visitor to sign in. Convenience only: Convex checks the caller.
  await auth.protect()

  return (
    <>
      <SiteHeader />
      <main className="page-container flex flex-1 flex-wrap items-start gap-10 pt-10 pb-[72px]">
        <section
          aria-labelledby="mine-title"
          className="flex min-w-0 flex-[999_1_460px] flex-col gap-5"
        >
          <h1
            id="mine-title"
            className="font-display text-[38px] font-bold tracking-[-0.03em]"
          >
            My tools
          </h1>
          <LoadErrorBoundary
            message="We could not load your tools right now. Please refresh the page."
          >
            <MyToolList />
          </LoadErrorBoundary>
        </section>
        <ToolForm />
      </main>
      <SiteFooter />
    </>
  )
}
