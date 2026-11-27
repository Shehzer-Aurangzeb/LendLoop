import { internal } from '@/convex/_generated/api'
import type { MutationCtx } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'

// Scheduled, not called: n8n hears about the change only if the mutation commits.
export const scheduleRequestNotification = (
  ctx: MutationCtx,
  loanId: Id<'loans'>,
  event: Doc<'loans'>['status']
) =>
  ctx.scheduler.runAfter(0, internal.notifications.sendRequestNotification, {
    loanId,
    event,
    attempt: 1,
  })
