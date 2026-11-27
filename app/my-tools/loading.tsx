import MyToolListSkeleton from '@/components/MyToolListSkeleton'
import SignedInPage from '@/components/SignedInPage'

// cacheComponents needs a Suspense boundary above a page that reads the request (auth).
export default function Loading() {
  return (
    <SignedInPage>
      <MyToolListSkeleton />
    </SignedInPage>
  )
}
