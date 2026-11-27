import { formatShortDate } from '@/components/formatShortDate'

// UTC on both sides, as in formatShortDate.
const weekdayAndDayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

// 'Fri 11 – Sun 13 Dec'; 'Mon 30 Nov – Wed 2 Dec'; one day is just 'Fri 11 Dec'.
export const formatDateRange = (startDate: string, endDate: string) => {
  if (startDate === endDate) {
    return formatShortDate(startDate)
  }

  const isSameMonth = startDate.slice(0, 7) === endDate.slice(0, 7)
  // ponytail: no year shown; add it if loans ever cross into a year people misread.
  const start = isSameMonth
    ? weekdayAndDayFormat.format(new Date(`${startDate}T00:00:00Z`))
    : formatShortDate(startDate)

  return `${start} – ${formatShortDate(endDate)}`
}
