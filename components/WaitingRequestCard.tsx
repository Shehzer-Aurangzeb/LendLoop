'use client'

import type { FunctionReturnType } from 'convex/server'
import { countDaysInRange } from '@/components/countDaysInRange'
import { formatDateRange } from '@/components/formatDateRange'
import { formatDayCount } from '@/components/formatDayCount'
import InitialAvatar from '@/components/InitialAvatar'
import InlineError from '@/components/InlineError'
import { useLoanChange } from '@/components/useLoanChange'
import { useRequestAnswers } from '@/components/useRequestAnswers'
import type { api } from '@/convex/_generated/api'

type WaitingRequest = FunctionReturnType<
  typeof api.loans.listWaitingForMe
>[number]

const buttonClass =
  'min-h-[46px] flex-[1_1_140px] cursor-pointer rounded-full px-4 text-[15px] font-semibold aria-disabled:cursor-wait aria-disabled:opacity-70'

const WaitingRequestCard = ({ request }: { request: WaitingRequest }) => {
  const { approveRequest, declineRequest } = useRequestAnswers()
  const { isBusy, error, run } = useLoanChange('leaves')
  const dayCount = countDaysInRange(request.startDate, request.endDate)

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
      {/* aria-disabled, not disabled, so focus survives a refusal. */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          aria-disabled={isBusy}
          onClick={(event) =>
            run(() => approveRequest(request._id), event.currentTarget)
          }
          className={`${buttonClass} bg-accent text-white hover:bg-accent-strong`}
        >
          Approve
        </button>
        <button
          type="button"
          aria-disabled={isBusy}
          onClick={(event) =>
            run(() => declineRequest(request._id), event.currentTarget)
          }
          className={`${buttonClass} border border-line-strong bg-surface text-ink hover:bg-ground`}
        >
          Decline
        </button>
      </div>
      <InlineError message={error} />
    </article>
  )
}

export default WaitingRequestCard
