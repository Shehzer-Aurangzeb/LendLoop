'use client'

import { catchError } from 'next/error'

// For live pieces in the header, which sits outside every page's error boundary.
const HideOnError = catchError(() => null)

export default HideOnError
