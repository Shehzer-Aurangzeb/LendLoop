import { Suspense } from 'react'
import { Show, UserButton } from '@clerk/nextjs'
import LogoMark from '@/components/LogoMark'
import SignInCta from '@/components/SignInCta'

// Below sm the two section links hide; the hero already links to the board.
const navLinkClass =
  'hidden min-h-11 items-center sm:inline-flex rounded-full px-3.5 text-[15px] text-ink-soft hover:text-accent-strong'

const SiteHeader = () => (
  <header className="border-b border-line">
    <div className="page-container flex items-center justify-between gap-4 py-[18px]">
      <a
        href="#top"
        className="flex min-h-11 items-center gap-2.5 text-ink no-underline"
      >
        <LogoMark className="size-[30px]" />
        <span className="font-display text-[22px] font-bold tracking-[-0.02em]">
          LendLoop
        </span>
      </a>
      <nav aria-label="Main" className="flex items-center gap-2">
        <a href="#how" className={navLinkClass}>
          How it works
        </a>
        <a href="#board" className={navLinkClass}>
          The board
        </a>
        <SignInCta label="Sign in" look="outline" />
        <Suspense>
          <Show when="signed-in">
            <UserButton
              appearance={{
                // Clerk's default avatar is 28px; 44px meets the touch target.
                elements: {
                  userButtonAvatarBox: { width: '2.75rem', height: '2.75rem' },
                },
              }}
            />
          </Show>
        </Suspense>
      </nav>
    </div>
  </header>
)

export default SiteHeader
