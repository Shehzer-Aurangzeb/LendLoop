'use client'

import Link from 'next/link'
import { useWaitingCount } from '@/components/useWaitingCount'

const LoansNavLink = ({ className }: { className: string }) => {
  const waitingCount = useWaitingCount()
  const hasWaiting = waitingCount > 0

  return (
    <Link
      href="/loans"
      aria-label={hasWaiting ? `Loans, ${waitingCount} waiting` : undefined}
      className={`inline-flex gap-2 ${className}`}
    >
      Loans
      {hasWaiting && (
        <span
          aria-hidden="true"
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold-ink px-1.5 text-xs font-semibold text-white"
        >
          {waitingCount}
        </span>
      )}
    </Link>
  )
}

export default LoansNavLink
