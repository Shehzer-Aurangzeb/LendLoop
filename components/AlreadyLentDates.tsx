import { useId } from 'react'
import { formatDateRange } from '@/components/formatDateRange'

type AlreadyLentDatesProps = {
  loans: { startDate: string; endDate: string }[]
}

const AlreadyLentDates = ({ loans }: AlreadyLentDatesProps) => {
  const headingId = useId()

  if (loans.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
      <h3 id={headingId} className="font-semibold text-ink-soft">
        Already lent
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-col gap-1">
        {loans.map(({ startDate, endDate }) => (
          // Approved loans on one tool never overlap, so a start date is unique.
          <li key={startDate}>{formatDateRange(startDate, endDate)}</li>
        ))}
      </ul>
    </div>
  )
}

export default AlreadyLentDates
