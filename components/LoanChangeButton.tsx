'use client'

import InlineError from '@/components/InlineError'
import { useLoanChange } from '@/components/useLoanChange'
import type { RowAfterChange } from '@/components/useLoanChange'

type LoanChangeButtonProps = {
  label: string
  screenReaderDetail: string
  change: () => Promise<string | null>
  rowAfterChange: RowAfterChange
}

const LoanChangeButton = ({
  label,
  screenReaderDetail,
  change,
  rowAfterChange,
}: LoanChangeButtonProps) => {
  const { isBusy, error, run } = useLoanChange(rowAfterChange)

  return (
    <div className="flex flex-col items-end gap-1">
      {/* aria-disabled, not disabled, so focus survives a refusal. */}
      <button
        type="button"
        aria-disabled={isBusy}
        onClick={(event) => run(change, event.currentTarget)}
        className="min-h-[44px] cursor-pointer rounded-full border border-ink bg-surface px-[18px] text-sm font-semibold text-ink hover:bg-ground aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        {label}
        <span className="sr-only"> {screenReaderDetail}</span>
      </button>
      <InlineError message={error} />
    </div>
  )
}

export default LoanChangeButton
