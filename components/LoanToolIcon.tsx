import type { Category } from '@/components/categoryLabels'
import { categoryStyles } from '@/components/categoryStyles'
import StrokeIcon from '@/components/StrokeIcon'

const LoanToolIcon = ({ category }: { category: Category }) => {
  const { iconPath, tintClass } = categoryStyles[category]

  return (
    <span
      className={`flex size-[52px] flex-none items-center justify-center rounded-[14px] ${tintClass}`}
    >
      <StrokeIcon
        path={iconPath}
        strokeWidth={1.5}
        className="size-7 text-ink"
      />
    </span>
  )
}

export default LoanToolIcon
