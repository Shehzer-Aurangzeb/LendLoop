import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import BoardGreeting from '@/components/BoardGreeting'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import StrokeIcon from '@/components/StrokeIcon'
import ToolBoard from '@/components/ToolBoard'

export const metadata: Metadata = { title: 'Board' }

export default async function BoardPage() {
  // Redirects a signed-out visitor to sign in. Convenience only: Convex checks the caller.
  await auth.protect()

  return (
    <>
      <SiteHeader />
      <main className="page-container flex flex-1 flex-col gap-2 pt-10 pb-[72px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <BoardGreeting />
          <Link
            href="/my-tools"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-[18px] text-[15px] font-semibold text-white no-underline hover:bg-accent-strong"
          >
            <StrokeIcon
              path="M12 5v14 M5 12h14"
              strokeWidth={2.2}
              className="size-[18px]"
            />
            List a tool
          </Link>
        </div>
        <LoadErrorBoundary
          message="We could not load the board right now. Please refresh the page."
        >
          <ToolBoard />
        </LoadErrorBoundary>
      </main>
      <SiteFooter />
    </>
  )
}
