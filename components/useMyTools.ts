import { useQuery } from 'convex/react'
import { useUserReadiness } from '@/components/UserReadinessProvider'
import { api } from '@/convex/_generated/api'

// Waits for users.store, or listMine would refuse a brand-new account.
export const useMyTools = () => {
  const { isUserReady, error } = useUserReadiness()
  const tools = useQuery(api.tools.listMine, isUserReady ? {} : 'skip')

  // Undefined while loading; a failure throws to the nearest error boundary.
  if (error) {
    throw new Error(error)
  }

  return tools
}
