'use client'

import type { ReactNode } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
import UserReadinessProvider from '@/components/UserReadinessProvider'

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in .env.local')
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)

const ConvexClientProvider = ({ children }: { children: ReactNode }) => (
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <UserReadinessProvider>{children}</UserReadinessProvider>
  </ConvexProviderWithClerk>
)

export default ConvexClientProvider
