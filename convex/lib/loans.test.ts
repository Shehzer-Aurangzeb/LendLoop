import { expect, test } from 'vitest'
import { describeLoanActivity } from '@/convex/lib/loans'

const today = '2026-11-26'

test.each([
  ['overdue-reminder', 'sent', '2026-11-26', 'Reminder sent today'],
  ['overdue-reminder', 'sent', '2026-11-25', 'Reminder sent yesterday'],
  ['overdue-reminder', 'sent', '2026-11-24', 'Reminder sent 2 days ago'],
  ['overdue-reminder', 'failed', '2026-11-26', 'Reminder failed today'],
  ['request-notification', 'sent', '2026-11-23', 'Request notification sent 3 days ago'],
  ['request-notification', 'failed', '2026-10-27', 'Request notification failed 30 days ago'],
] as const)('%s %s on %s reads "%s"', (kind, outcome, date, label) => {
  expect(describeLoanActivity({ kind, outcome, date }, today)).toBe(label)
})

test('a day count crosses a month and a daylight-saving change', () => {
  expect(
    describeLoanActivity(
      { kind: 'overdue-reminder', outcome: 'sent', date: '2026-10-31' },
      '2026-11-02'
    )
  ).toBe('Reminder sent 2 days ago')
})
