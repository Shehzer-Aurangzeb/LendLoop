import { useQuery } from 'convex/react'
import type { FunctionReference } from 'convex/server'
import { useUserReadiness } from '@/components/UserReadinessProvider'

// Waits for users.store, or a signed-in query would refuse a brand-new account.
export const useQueryOnceUserReady = <
  Query extends FunctionReference<'query', 'public', Record<string, never>>,
>(
  query: Query
) => {
  const { isUserReady, error } = useUserReadiness()
  const result = useQuery(query, isUserReady ? {} : 'skip')

  // Undefined while loading; a failure throws to the nearest error boundary.
  if (error) {
    throw new Error(error)
  }

  return result
}
