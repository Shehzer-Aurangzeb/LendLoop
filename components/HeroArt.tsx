import type { Category } from '@/components/categoryLabels'
import StrokeIcon, { CHECK_PATH } from '@/components/StrokeIcon'
import ToolCard from '@/components/ToolCard'

// Fixed picture of the idea, not live data, so it never shows a real listing.
const heroTiles: { name: string; category: Category; tiltClass: string }[] = [
  { name: 'Hedge trimmer', category: 'garden', tiltClass: '-rotate-2' },
  {
    name: 'Cordless drill',
    category: 'power-tools',
    tiltClass: 'translate-y-[18px] rotate-[1.5deg]',
  },
  { name: 'Four-person tent', category: 'camping', tiltClass: 'rotate-1' },
  {
    name: 'Stand mixer',
    category: 'kitchen',
    tiltClass: 'translate-y-[18px] -rotate-[1.5deg]',
  },
]

const HeroArt = () => (
  <div aria-hidden="true" className="relative px-2 pt-3 pb-10">
    <div className="grid grid-cols-2 gap-4">
      {heroTiles.map(({ name, category, tiltClass }) => (
        <ToolCard
          key={name}
          name={name}
          category={category}
          className={tiltClass}
        />
      ))}
    </div>
    <div className="absolute bottom-2 -left-2 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift">
      <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-soft text-accent">
        <StrokeIcon
          path={CHECK_PATH}
          strokeWidth={2.4}
          className="size-[18px]"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">Hedge trimmer approved</span>
        <span className="text-[13px] text-ink-on-dark-muted">
          Sat 5 Dec – Sun 6 Dec
        </span>
      </span>
    </div>
  </div>
)

export default HeroArt
