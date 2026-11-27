import BoardSkeleton from '@/components/BoardSkeleton'

// cacheComponents needs a Suspense boundary above a page that reads the request (auth).
export default function Loading() {
  return (
    <main className="page-container flex-1 pt-10 pb-[72px]">
      <BoardSkeleton />
    </main>
  )
}
