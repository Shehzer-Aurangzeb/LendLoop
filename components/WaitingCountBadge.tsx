'use client'

import HideOnError from '@/components/HideOnError'
import { useWaitingCount } from '@/components/useWaitingCount'

const WaitingCountBadge = () => {
  const waitingCount = useWaitingCount()

  if (waitingCount === 0) {
    return null
  }

  return (
    <>
      <span className="sr-only">, {waitingCount} waiting</span>
      <span
        aria-hidden="true"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold-ink px-1.5 text-xs font-semibold text-white"
      >
        {waitingCount}
      </span>
    </>
  )
}

// A failed count drops the badge, not the header.
const SafeWaitingCountBadge = () => (
  <HideOnError>
    <WaitingCountBadge />
  </HideOnError>
)

export default SafeWaitingCountBadge
