const SKELETON_ROWS = 3

type ListSkeletonProps = {
  label: string
  rowHeightPx: number
}

const ListSkeleton = ({ label, rowHeightPx }: ListSkeletonProps) => (
  <ul aria-busy="true" aria-label={label} className="flex flex-col gap-3">
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <li
        key={index}
        style={{ height: rowHeightPx }}
        className="animate-pulse rounded-[20px] bg-line"
      />
    ))}
  </ul>
)

export default ListSkeleton
