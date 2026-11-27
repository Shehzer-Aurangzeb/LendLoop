import { useQuery } from 'convex/react'
import { useUserReadiness } from '@/components/UserReadinessProvider'
import { api } from '@/convex/_generated/api'

// Not useQueryOnceUserReady: the header has no error boundary, so a setup failure hides the badge instead of throwing.
export const useWaitingCount = () => {
  const { isUserReady } = useUserReadiness()

  return useQuery(api.loans.countWaitingForMe, isUserReady ? {} : 'skip') ?? 0
}
