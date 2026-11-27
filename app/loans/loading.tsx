import ListSkeleton from '@/components/ListSkeleton'
import SignedInPage from '@/components/SignedInPage'

// cacheComponents needs a Suspense boundary above a page that reads the request (auth).
export default function Loading() {
  return (
    <SignedInPage>
      <ListSkeleton label="Loading your loans" rowHeightPx={88} />
    </SignedInPage>
  )
}
