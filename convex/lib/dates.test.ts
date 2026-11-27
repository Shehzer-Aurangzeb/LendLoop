import { afterEach, expect, test, vi } from 'vitest'
import { todayInAppTimezone } from '@/convex/lib/dates'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

// 02:00 UTC on 15 March is still 14 March in Toronto.
test('today is the calendar date in APP_TIMEZONE, not UTC', () => {
  vi.stubEnv('APP_TIMEZONE', 'America/Toronto')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-15T02:00:00Z'))

  expect(todayInAppTimezone()).toBe('2026-03-14')
})
