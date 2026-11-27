'use client'

import { catchError } from 'next/error'

const PublicToolListErrorFallback = () => (
  <p role="alert" className="text-zinc-600">
    We could not load the tools right now. Please refresh the page.
  </p>
)

const PublicToolListErrorBoundary = catchError(PublicToolListErrorFallback)

export default PublicToolListErrorBoundary
