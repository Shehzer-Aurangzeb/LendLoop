// '1 day', '3 days'.
export const formatDayCount = (count: number) =>
  `${count} ${count === 1 ? 'day' : 'days'}`
