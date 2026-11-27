import type { Category } from '@/components/categoryLabels'
import CategoryTile from '@/components/CategoryTile'

type PhotoPlaceholderProps = {
  category: Category
}

// Upload comes later; the tile shows what neighbours will see meanwhile.
const PhotoPlaceholder = ({ category }: PhotoPlaceholderProps) => (
  <div className="flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-line-strong bg-ground px-4 py-5 text-center">
    <div className="w-24">
      <CategoryTile category={category} />
    </div>
    <span className="text-[13px] text-ink-muted">Photos coming soon</span>
  </div>
)

export default PhotoPlaceholder
