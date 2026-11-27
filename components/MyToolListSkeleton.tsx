const SKELETON_ROWS = 3

const MyToolListSkeleton = () => (
  <ul
    aria-busy="true"
    aria-label="Loading your tools"
    className="flex flex-col gap-3"
  >
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <li
        key={index}
        className="h-[102px] animate-pulse rounded-[20px] bg-line"
      />
    ))}
  </ul>
)

export default MyToolListSkeleton
