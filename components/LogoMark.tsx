const LogoMark = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    strokeWidth={3}
    aria-hidden="true"
    className={className}
  >
    <circle cx="12" cy="16" r="7.5" className="stroke-accent" />
    <circle cx="20" cy="16" r="7.5" className="stroke-marigold" />
  </svg>
)

export default LogoMark
