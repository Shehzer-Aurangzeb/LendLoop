'use client'

import { catchError } from 'next/error'

const LoadErrorMessage = ({ message }: { message: string }) => (
  <p role="alert" className="text-[15px] text-ink-muted">
    {message}
  </p>
)

const LoadErrorBoundary = catchError(LoadErrorMessage)

export default LoadErrorBoundary
