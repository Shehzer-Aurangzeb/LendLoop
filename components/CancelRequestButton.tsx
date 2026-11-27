'use client'

import { useCancelRequest } from '@/components/useCancelRequest'
import { useLoanChange } from '@/components/useLoanChange'
import type { Id } from '@/convex/_generated/dataModel'

const CancelRequestButton = ({
  loanId,
  toolName,
}: {
  loanId: Id<'loans'>
  toolName: string
}) => {
  const cancelRequest = useCancelRequest()
  const { isBusy, error, run } = useLoanChange()

  return (
    <div className="flex flex-col items-end gap-1">
      {/* aria-disabled, not disabled, so focus survives a refusal. */}
      <button
        type="button"
        aria-disabled={isBusy}
        onClick={(event) =>
          run(() => cancelRequest(loanId), event.currentTarget)
        }
        className="min-h-[40px] cursor-pointer rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-ground aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        Cancel<span className="sr-only"> your request for {toolName}</span>
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default CancelRequestButton
