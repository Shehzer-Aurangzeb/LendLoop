import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import SignedInPage from '@/components/SignedInPage'
import StrokeIcon, { CHEVRON_LEFT_PATH } from '@/components/StrokeIcon'
import ToolDetails from '@/components/ToolDetails'

export const metadata: Metadata = { title: 'Tool' }

export default async function ToolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // To the landing page, whose sign-in is a modal. Convenience only: Convex checks the caller.
  await auth.protect({ unauthenticatedUrl: '/' })
  const { id } = await params

  return (
    <SignedInPage>
      <Link
        href="/board"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-medium text-accent hover:text-accent-strong"
      >
        <StrokeIcon path={CHEVRON_LEFT_PATH} strokeWidth={2} className="size-[18px]" />
        Back to the board
      </Link>
      <LoadErrorBoundary
        message="We could not load this tool right now. Please refresh the page."
      >
        <ToolDetails toolId={id} />
      </LoadErrorBoundary>
    </SignedInPage>
  )
}
