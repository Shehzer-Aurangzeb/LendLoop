import LogoMark from '@/components/LogoMark'

const SiteFooter = () => (
  <footer className="border-t border-line">
    <div className="page-container flex flex-wrap justify-between gap-3 py-7 text-sm text-ink-muted">
      <span className="flex items-center gap-2">
        <LogoMark className="size-5" />
        LendLoop, one neighbourhood&rsquo;s shared shelf
      </span>
      <span>Visitors see tool names and categories only.</span>
    </div>
  </footer>
)

export default SiteFooter
