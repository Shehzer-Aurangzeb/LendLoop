import BoardSkeleton from '@/components/BoardSkeleton'
import SignedInPage from '@/components/SignedInPage'

// cacheComponents needs a Suspense boundary above a page that reads the request (auth).
export default function Loading() {
  return (
    <SignedInPage>
      <BoardSkeleton />
    </SignedInPage>
  )
}
