import type { Category } from '@/components/categoryLabels'
import { categoryStyles } from '@/components/categoryStyles'
import StrokeIcon from '@/components/StrokeIcon'

const CategoryTile = ({ category }: { category: Category }) => {
  const { iconPath, tintClass } = categoryStyles[category]

  return (
    <div
      className={`flex aspect-[4/3] items-center justify-center rounded-xl ${tintClass}`}
    >
      <StrokeIcon
        path={iconPath}
        strokeWidth={1.4}
        className="size-11 text-ink"
      />
    </div>
  )
}

export default CategoryTile
