const DAY_MS = 24 * 60 * 60 * 1000

// Both ends count: '2026-12-11' to '2026-12-13' is 3 days.
export const countDaysInRange = (startDate: string, endDate: string) =>
  (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
    DAY_MS +
  1
