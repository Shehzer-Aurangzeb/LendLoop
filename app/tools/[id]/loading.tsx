import SignedInPage from '@/components/SignedInPage'
import ToolDetailsSkeleton from '@/components/ToolDetailsSkeleton'

// cacheComponents needs a Suspense boundary above a page that reads the request (auth, params).
export default function Loading() {
  return (
    <SignedInPage>
      <ToolDetailsSkeleton />
    </SignedInPage>
  )
}
