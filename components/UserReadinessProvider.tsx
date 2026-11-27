'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'

type UserReadiness = {
  isUserReady: boolean
  error: string | null
  retry: () => void
}

const UserReadinessContext = createContext<UserReadiness | null>(null)

export const useUserReadiness = () => {
  const readiness = useContext(UserReadinessContext)

  if (!readiness) {
    throw new Error('useUserReadiness must be used inside ConvexClientProvider')
  }

  return readiness
}

const useStoreUserOnSignIn = (): UserReadiness => {
  const { isAuthenticated } = useConvexAuth()
  const { userId } = useAuth()
  const storeUser = useMutation(api.users.store)
  const [isUserReady, setIsUserReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    // Ignore a result that lands after sign-out or an account switch.
    let isStale = false

    storeUser()
      .then(() => {
        if (isStale) {
          return
        }
        setIsUserReady(true)
      })
      .catch((storeError: unknown) => {
        console.error('users.store failed', storeError)
        if (isStale) {
          return
        }
        setError('We could not set up your account.')
      })

    return () => {
      isStale = true
      setIsUserReady(false)
      setError(null)
    }
  }, [isAuthenticated, userId, storeUser, attempt])

  const retry = () => setAttempt((n) => n + 1)

  return { isUserReady, error, retry }
}

const UserReadinessProvider = ({ children }: { children: ReactNode }) => {
  const readiness = useStoreUserOnSignIn()

  return (
    <UserReadinessContext value={readiness}>{children}</UserReadinessContext>
  )
}

export default UserReadinessProvider
