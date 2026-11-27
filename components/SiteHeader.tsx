import { Suspense } from 'react'
import Link from 'next/link'
import { Show, UserButton } from '@clerk/nextjs'
import LogoMark from '@/components/LogoMark'
import SignInCta from '@/components/SignInCta'

const linkClass =
  'min-h-11 items-center rounded-full px-3.5 text-[15px] text-ink-soft hover:text-accent-strong'
// Below sm the two section links hide; the hero already links to the board.
const sectionLinkClass = `hidden sm:inline-flex ${linkClass}`

const SiteHeader = () => (
  <header className="border-b border-line">
    <div className="page-container flex items-center justify-between gap-4 py-[18px]">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5 text-ink no-underline"
      >
        <LogoMark className="size-[30px]" />
        <span className="font-display text-[22px] font-bold tracking-[-0.02em]">
          LendLoop
        </span>
      </Link>
      <nav aria-label="Main" className="flex items-center gap-2">
        <Suspense>
          <Show when="signed-out">
            <Link href="/#how" className={sectionLinkClass}>
              How it works
            </Link>
            <Link href="/#board" className={sectionLinkClass}>
              The board
            </Link>
          </Show>
        </Suspense>
        <SignInCta label="Sign in" look="outline" />
        <Suspense>
          <Show when="signed-in">
            <Link href="/board" className={`inline-flex ${linkClass}`}>
              Board
            </Link>
            <Link href="/my-tools" className={`inline-flex ${linkClass}`}>
              My tools
            </Link>
            <Link href="/loans" className={`inline-flex ${linkClass}`}>
              Loans
            </Link>
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
