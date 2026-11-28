import { v } from 'convex/values'
import { internalMutation, internalQuery } from '@/convex/_generated/server'
import { todayInAppTimezone } from '@/convex/lib/dates'
import { loadToolSummary } from '@/convex/lib/tools'
import { firstNameOf } from '@/convex/lib/users'
import { activityOutcomeValidator } from '@/convex/schema'

// A `failed` row does not count, so a rerun on the same day retries it.
export const listOverdueRemindersNotSentToday = internalQuery({
  args: {},
  returns: v.object({
    date: v.string(),
    reminders: v.array(
      v.object({
        loanId: v.id('loans'),
        borrowerFirstName: v.string(),
        toolName: v.string(),
        endDate: v.string(),
      })
    ),
  }),
  handler: async (ctx) => {
    const date = todayInAppTimezone()
    const overdueLoans = await ctx.db
      .query('loans')
      .withIndex('by_status_and_endDate', (q) =>
        q.eq('status', 'approved').lt('endDate', date)
      )
      .collect()
    const reminders = await Promise.all(
      overdueLoans.map(async (loan) => {
        const activityToday = await ctx.db
          .query('loanActivity')
          .withIndex('by_loan_and_date', (q) =>
            q.eq('loanId', loan._id).eq('date', date)
          )
          .collect()
        const isSentToday = activityToday.some(
          (row) => row.kind === 'overdue-reminder' && row.outcome === 'sent'
        )

        if (isSentToday) {
          return null
        }
        const { toolName } = await loadToolSummary(ctx, loan.toolId)

        return {
          loanId: loan._id,
          borrowerFirstName: firstNameOf(await ctx.db.get(loan.borrowerId)),
          toolName,
          endDate: loan.endDate,
        }
      })
    )

    return {
      date,
      reminders: reminders.filter((reminder) => reminder !== null),
    }
  },
})

// One row per loan, day and kind: a failed row upgrades to sent, a sent row never changes.
export const recordOverdueReminderOutcome = internalMutation({
  // loanId is a plain string: only the database can tell a malformed id from a deleted loan.
  args: {
    loanId: v.string(),
    date: v.string(),
    outcome: activityOutcomeValidator,
  },
  returns: v.union(
    v.literal('recorded'),
    v.literal('invalid-loan-id'),
    v.literal('future-date'),
    v.literal('loan-not-found')
  ),
  handler: async (ctx, { loanId: rawLoanId, date, outcome }) => {
    const loanId = ctx.db.normalizeId('loans', rawLoanId)

    if (!loanId) {
      return 'invalid-loan-id'
    }

    // A future row would sort as the loan's latest activity and read "sent today" until that day.
    if (date > todayInAppTimezone()) {
      return 'future-date'
    }

    if (!(await ctx.db.get(loanId))) {
      return 'loan-not-found'
    }
    // Convex mutations are serializable, so a racing retry cannot slip a second row in between this read and the insert.
    const activityThatDay = await ctx.db
      .query('loanActivity')
      .withIndex('by_loan_and_date', (q) =>
        q.eq('loanId', loanId).eq('date', date)
      )
      .collect()
    const existing = activityThatDay.find(
      (row) => row.kind === 'overdue-reminder'
    )

    if (!existing) {
      await ctx.db.insert('loanActivity', {
        loanId,
        kind: 'overdue-reminder',
        outcome,
        date,
      })
    } else if (existing.outcome === 'failed' && outcome === 'sent') {
      await ctx.db.patch(existing._id, { outcome: 'sent' })
    }

    return 'recorded'
  },
})
