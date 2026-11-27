import type { Category } from '@/components/categoryLabels'
import { categoryLabels } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'

type ToolCardProps = {
  name: string
  category: Category
  className?: string
}

const ToolCard = ({ name, category, className = '' }: ToolCardProps) => (
  <div
    className={`flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-2.5 ${className}`}
  >
    <CategoryTile category={category} />
    <div className="flex flex-col gap-1 px-1.5 pb-1.5">
      <span className="font-semibold">{name}</span>
      <span className="text-[13px] text-ink-muted">
        {categoryLabels[category]}
      </span>
    </div>
  </div>
)

export default ToolCard
