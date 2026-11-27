import { Suspense } from 'react'
import { Show } from '@clerk/nextjs'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import PublicToolList from '@/components/PublicToolList'
import SignInCta from '@/components/SignInCta'

const BoardSection = () => (
  <section
    id="board"
    aria-labelledby="board-title"
    className="page-container flex flex-col gap-1.5 pt-16 pb-[72px]"
  >
    <h2 id="board-title" className="section-heading">
      On the board right now
    </h2>
    <LoadErrorBoundary
      message="We could not load the tools right now. Please refresh the page."
    >
      <PublicToolList />
    </LoadErrorBoundary>
    {/* The band only invites signing in, so a signed-in neighbour does not see it. */}
    <Suspense>
      <Show when="signed-out">
        <div className="mt-6.5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-accent-soft px-7 py-6">
          <div className="flex flex-col gap-1">
            <span className="text-[17px] font-semibold">
              See something you need?
            </span>
            <span className="text-[15px] text-ink-soft">
              Sign in to see who&rsquo;s lending and ask for the days you need.
            </span>
          </div>
          <SignInCta label="Sign in to lend or borrow" look="primary" />
        </div>
      </Show>
    </Suspense>
  </section>
)

export default BoardSection
