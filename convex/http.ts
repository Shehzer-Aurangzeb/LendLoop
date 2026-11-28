import { httpRouter } from 'convex/server'
import { internal } from '@/convex/_generated/api'
import { httpAction } from '@/convex/_generated/server'
import { isCalendarDay } from '@/convex/lib/dates'
import { readSignedJsonBody } from '@/convex/lib/signatures'

const http = httpRouter()

const statusForRecordResult = {
  recorded: 200,
  'invalid-loan-id': 400,
  'future-date': 400,
  'loan-not-found': 404,
} as const

// POST, not GET, so there is a body to sign.
http.route({
  path: '/overdue-reminders/due',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signed = await readSignedJsonBody(request)

    if ('refusal' in signed) {
      return signed.refusal
    }
    const dueReminders = await ctx.runQuery(
      internal.overdueReminders.listOverdueRemindersNotSentToday
    )

    return Response.json(dueReminders)
  }),
})

http.route({
  path: '/overdue-reminders/result',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signed = await readSignedJsonBody(request)

    if ('refusal' in signed) {
      return signed.refusal
    }
    const { loanId, date, outcome } = signed.body

    if (
      typeof loanId !== 'string' ||
      typeof date !== 'string' ||
      !isCalendarDay(date) ||
      (outcome !== 'sent' && outcome !== 'failed')
    ) {
      return new Response(null, { status: 400 })
    }
    const result = await ctx.runMutation(
      internal.overdueReminders.recordOverdueReminderOutcome,
      { loanId, date, outcome }
    )

    return new Response(null, { status: statusForRecordResult[result] })
  }),
})

export default http
