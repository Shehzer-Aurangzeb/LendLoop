import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

// Undefined while loading; a failure throws to the nearest error boundary.
export const usePublicTools = () => useQuery(api.tools.listPublic)
