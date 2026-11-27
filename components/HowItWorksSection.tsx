const steps = [
  {
    title: 'List what you own',
    body: 'Add a tool with a photo, its category and how worn it is. It goes straight on the board.',
  },
  {
    title: 'Ask for the days you need',
    body: 'Pick a start and end day. The lender gets a note and approves or declines.',
  },
  {
    title: 'Hand it back',
    body: 'Return it by the last day. If it runs late, LendLoop sends a gentle reminder.',
  },
]

const HowItWorksSection = () => (
  <section
    id="how"
    aria-labelledby="how-title"
    className="border-y border-line bg-surface"
  >
    <div className="page-container flex flex-col gap-8 py-14">
      <h2 id="how-title" className="section-heading">
        How it works
      </h2>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-8">
        {steps.map(({ title, body }, index) => (
          <li
            key={title}
            className="flex flex-col gap-2.5 border-t-2 border-dashed border-line-strong pt-[18px]"
          >
            <span className="font-display text-[15px] font-bold text-marigold-ink">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-lg font-semibold">{title}</span>
            <span className="text-[15px] leading-[1.55] text-ink-muted">
              {body}
            </span>
          </li>
        ))}
      </ol>
    </div>
  </section>
)

export default HowItWorksSection
