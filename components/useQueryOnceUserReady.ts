import { useQuery } from 'convex/react'
import type { OptionalRestArgsOrSkip } from 'convex/react'
import type { FunctionReference, OptionalRestArgs } from 'convex/server'
import { useUserReadiness } from '@/components/UserReadinessProvider'

// Waits for users.store, or a signed-in query would refuse a brand-new account.
export const useQueryOnceUserReady = <
  Query extends FunctionReference<'query'>,
>(
  query: Query,
  ...args: OptionalRestArgs<Query>
) => {
  const { isUserReady, error } = useUserReadiness()
  // The cast only swaps in 'skip'; TypeScript cannot narrow a generic rest tuple.
  const result = useQuery(
    query,
    ...((isUserReady ? args : ['skip']) as OptionalRestArgsOrSkip<Query>)
  )

  // Undefined while loading; a failure throws to the nearest error boundary.
  if (error) {
    throw new Error(error)
  }

  return result
}
