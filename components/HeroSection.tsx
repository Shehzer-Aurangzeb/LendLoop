import HeroArt from '@/components/HeroArt'
import SignInCta from '@/components/SignInCta'
import StrokeIcon, { CHECK_PATH, HOUSE_PATH } from '@/components/StrokeIcon'

const promises = [
  'Free, always',
  'Whole days, no hourly fuss',
  'The lender always decides',
]

const HeroSection = () => (
  <section className="page-container grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-14 pt-[72px] pb-14">
    <div className="flex flex-col gap-6">
      <span className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft py-1.5 pr-3 pl-2 text-sm font-semibold text-accent">
        <StrokeIcon path={HOUSE_PATH} strokeWidth={2} className="size-4" />
        A shared shelf for your street
      </span>
      <h1 className="font-display text-[clamp(44px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em]">
        Borrow what you need.{' '}
        <span className="text-accent">Lend what you don&rsquo;t.</span>
      </h1>
      <p className="max-w-[30em] text-[19px] leading-[1.55] text-ink-soft">
        List the drill gathering dust in your shed. Borrow a ladder for the
        weekend. Hand it back when you&rsquo;re done. Your neighbours do the
        same.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <SignInCta label="Sign in to lend or borrow" look="primary" />
        <a
          href="#board"
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent hover:text-accent-strong"
        >
          See what&rsquo;s on the board <span aria-hidden="true">↓</span>
        </a>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-[22px] gap-y-2.5 text-sm text-ink-muted">
        {promises.map((promise) => (
          <li key={promise} className="flex items-center gap-2">
            <StrokeIcon
              path={CHECK_PATH}
              strokeWidth={2.2}
              className="size-4 text-accent"
            />
            {promise}
          </li>
        ))}
      </ul>
    </div>
    <HeroArt />
  </section>
)

export default HeroSection
