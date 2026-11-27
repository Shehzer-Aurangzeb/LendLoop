'use client'

import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { countDaysInRange } from '@/components/countDaysInRange'
import { formatDateRange } from '@/components/formatDateRange'
import { formatDayCount } from '@/components/formatDayCount'
import InitialAvatar from '@/components/InitialAvatar'
import { useRequestAnswers } from '@/components/useRequestAnswers'
import type { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type WaitingRequest = FunctionReturnType<
  typeof api.loans.listWaitingForMe
>[number]

const buttonClass =
  'min-h-[46px] flex-[1_1_140px] cursor-pointer rounded-full px-4 text-[15px] font-semibold disabled:cursor-wait disabled:opacity-70'

const WaitingRequestCard = ({ request }: { request: WaitingRequest }) => {
  const { approveRequest, declineRequest } = useRequestAnswers()
  const [isAnswering, setIsAnswering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dayCount = countDaysInRange(request.startDate, request.endDate)

  // On success the card leaves the live list, so only a refusal needs handling.
  const answer = async (
    sendAnswer: (loanId: Id<'loans'>) => Promise<string | null>
  ) => {
    setIsAnswering(true)
    setError(null)
    const message = await sendAnswer(request._id)

    setIsAnswering(false)
    setError(message)
  }

  return (
    <article className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <div className="flex items-center gap-3.5">
        <InitialAvatar firstName={request.borrowerFirstName} size="large" />
        <div className="flex flex-col gap-0.5">
          <span className="text-base">
            <strong className="font-semibold">
              {request.borrowerFirstName}
            </strong>{' '}
            wants your{' '}
            <strong className="font-semibold">{request.toolName}</strong>
          </span>
          <span className="text-sm text-ink-muted">
            {formatDateRange(request.startDate, request.endDate)} ·{' '}
            {formatDayCount(dayCount)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={isAnswering}
          onClick={() => answer(approveRequest)}
          className={`${buttonClass} bg-accent text-white hover:bg-accent-strong`}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isAnswering}
          onClick={() => answer(declineRequest)}
          className={`${buttonClass} border border-line-strong bg-surface text-ink hover:bg-ground`}
        >
          Decline
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </article>
  )
}

export default WaitingRequestCard
