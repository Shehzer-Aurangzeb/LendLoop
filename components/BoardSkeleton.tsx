import { boardGridClass } from '@/components/boardGridClass'

const SKELETON_CARDS = 6

const BoardSkeleton = () => (
  <ul
    aria-busy="true"
    aria-label="Loading tools"
    className={boardGridClass}
  >
    {Array.from({ length: SKELETON_CARDS }, (_, index) => (
      <li
        key={index}
        className="aspect-[5/6] animate-pulse rounded-[20px] bg-line"
      />
    ))}
  </ul>
)

export default BoardSkeleton
