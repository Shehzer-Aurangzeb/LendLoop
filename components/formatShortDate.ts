// UTC on both sides, so the browser's timezone never moves a 'YYYY-MM-DD' to another day.
const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export const formatShortDate = (isoDate: string) =>
  shortDateFormat.format(new Date(`${isoDate}T00:00:00Z`))
