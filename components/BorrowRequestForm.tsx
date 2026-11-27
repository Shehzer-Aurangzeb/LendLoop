'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { countDaysInRange } from '@/components/countDaysInRange'
import { formatDayCount } from '@/components/formatDayCount'
import { formatDateRange } from '@/components/formatDateRange'
import InlineError from '@/components/InlineError'
import { useBorrowRequest } from '@/components/useBorrowRequest'

type BorrowRequestFormProps = {
  toolId: string
  lenderFirstName: string
}

const fieldLabelClass =
  'flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft'
const inputClass =
  'min-h-11 rounded-xl border border-line-strong p-3 text-[15px] font-medium text-ink'

const BorrowRequestForm = ({
  toolId,
  lenderFirstName,
}: BorrowRequestFormProps) => {
  const sendRequest = useBorrowRequest()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const sentMessageRef = useRef<HTMLParagraphElement>(null)
  // The browser's today, as a convenience only; the server checks the app timezone.
  const browserToday = new Date().toLocaleDateString('en-CA')
  const hasRange = startDate !== '' && endDate !== '' && endDate >= startDate
  const dayCount = hasRange ? countDaysInRange(startDate, endDate) : 0

  // After the render that shows it, so focus does not drop to the page when the dates clear.
  useEffect(() => {
    if (isSent) {
      sentMessageRef.current?.focus()
    }
  }, [isSent])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSending) {
      return
    }
    setIsSending(true)
    setIsSent(false)
    const message = await sendRequest({ toolId, startDate, endDate })

    setIsSending(false)
    setError(message)
    if (message !== null) {
      return
    }
    // The form stays, so the borrower can ask for other days without a reload.
    setStartDate('')
    setEndDate('')
    setIsSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <label className={fieldLabelClass}>
          First day
          <input
            type="date"
            required
            min={browserToday}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={fieldLabelClass}>
          Last day
          <input
            type="date"
            required
            min={startDate || browserToday}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      {hasRange && (
        <p className="flex flex-wrap justify-between gap-2 rounded-[14px] bg-ground px-4 py-3.5 text-[15px]">
          <span className="text-ink-soft">
            {formatDayCount(dayCount)}
          </span>
          <span className="font-semibold">
            {formatDateRange(startDate, endDate)}
          </span>
        </p>
      )}
      {/* aria-disabled, not disabled: focus stays on the button if the server refuses. */}
      <button
        type="submit"
        aria-disabled={isSending}
        className="min-h-[50px] cursor-pointer rounded-full bg-accent px-5 text-base font-semibold text-white hover:bg-accent-strong aria-disabled:cursor-wait aria-disabled:opacity-70"
      >
        {isSending ? 'Sending…' : `Send request to ${lenderFirstName}`}
      </button>
      <InlineError message={error} />
      {isSent && (
        <p
          role="status"
          ref={sentMessageRef}
          tabIndex={-1}
          className="text-[15px] text-ink-soft"
        >
          Request sent to {lenderFirstName}. You’ll see the answer under{' '}
          <Link href="/loans" className="font-medium text-accent underline">
            Loans
          </Link>
          .
        </p>
      )}
      <p className="text-center text-[13px] leading-normal text-ink-muted">
        {lenderFirstName} decides. You’ll see the answer under Loans.
      </p>
    </form>
  )
}

export default BorrowRequestForm
