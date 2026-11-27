const ToolDetailsSkeleton = () => (
  <div
    aria-busy="true"
    aria-label="Loading the tool"
    className="flex flex-wrap items-start gap-10"
  >
    <div className="aspect-[4/3] min-w-0 flex-[999_1_520px] animate-pulse rounded-3xl bg-line" />
    <div className="h-64 min-w-0 flex-[1_1_360px] animate-pulse rounded-3xl bg-line" />
  </div>
)

export default ToolDetailsSkeleton
