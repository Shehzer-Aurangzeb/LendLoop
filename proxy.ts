import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

// Route redirects are convenience only; every permission check lives in Convex functions.
export default clerkMiddleware(async (auth, request) => {
  // The landing page only invites sign-in, so a signed-in neighbour goes straight to the board.
  if (request.nextUrl.pathname === '/' && (await auth()).userId) {
    return NextResponse.redirect(new URL('/board', request.url))
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
}
