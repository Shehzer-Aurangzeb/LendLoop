import { useQuery } from 'convex/react'
import { useUserReadiness } from '@/components/UserReadinessProvider'
import { api } from '@/convex/_generated/api'

// Not useQueryOnceUserReady: a failed account setup should hide the badge, not throw.
export const useWaitingCount = () => {
  const { isUserReady } = useUserReadiness()

  return useQuery(api.loans.countWaitingForMe, isUserReady ? {} : 'skip') ?? 0
}
