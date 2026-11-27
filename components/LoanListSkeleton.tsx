const SKELETON_ROWS = 3

const LoanListSkeleton = () => (
  <ul
    aria-busy="true"
    aria-label="Loading your loans"
    className="flex flex-col gap-3"
  >
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <li key={index} className="h-[88px] animate-pulse rounded-[20px] bg-line" />
    ))}
  </ul>
)

export default LoanListSkeleton
