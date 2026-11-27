import { v } from 'convex/values'
import { internal } from '@/convex/_generated/api'
import { internalAction, internalQuery } from '@/convex/_generated/server'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { loadToolSummary } from '@/convex/lib/tools'
import { firstNameOf } from '@/convex/lib/users'
import { loanStatusValidator } from '@/convex/schema'

// Delay before attempt 2 and attempt 3; after attempt 3 the failure is only logged.
const retryDelaysMs = [60_000, 300_000]

const describeNotification = (
  loanId: Id<'loans'>,
  event: Doc<'loans'>['status']
) => `Request notification for loan ${loanId} (${event})`

const isLenderTheRecipient = (event: Doc<'loans'>['status']) =>
  event === 'requested' || event === 'cancelled'

export const loadRequestNotificationPayload = internalQuery({
  args: { loanId: v.id('loans'), event: loanStatusValidator },
  returns: v.union(
    v.null(),
    v.object({
      notificationId: v.string(),
      event: loanStatusValidator,
      loanId: v.id('loans'),
      recipientId: v.id('users'),
      recipientFirstName: v.string(),
      otherPartyFirstName: v.string(),
      toolName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
    })
  ),
  handler: async (ctx, { loanId, event }) => {
    const loan = await ctx.db.get(loanId)

    if (!loan) {
      return null
    }

    const [recipientId, otherPartyId] = isLenderTheRecipient(event)
      ? [loan.lenderId, loan.borrowerId]
      : [loan.borrowerId, loan.lenderId]
    const { toolName } = await loadToolSummary(ctx, loan.toolId)

    return {
      notificationId: `${loanId}:${event}`,
      event,
      loanId,
      recipientId,
      recipientFirstName: firstNameOf(await ctx.db.get(recipientId)),
      otherPartyFirstName: firstNameOf(await ctx.db.get(otherPartyId)),
      toolName,
      startDate: loan.startDate,
      endDate: loan.endDate,
    }
  },
})

const hmacSha256Hex = async (secret: string, body: string) => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

const postSigned = async (url: string, secret: string, body: string) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LendLoop-Signature': await hmacSha256Hex(secret, body),
      },
      body,
    })

    return response.ok
  } catch {
    return false
  }
}

// Never throws: the loan change already committed, so a notifier problem is only logged.
export const sendRequestNotification = internalAction({
  args: {
    loanId: v.id('loans'),
    event: loanStatusValidator,
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { loanId, event, attempt }) => {
    // Read here, not declared in convex.config.ts, so a missing value is a logged error, not a failed deploy.
    const url = process.env.N8N_REQUEST_WEBHOOK_URL
    const secret = process.env.N8N_WEBHOOK_SECRET

    if (!url || !secret) {
      console.error(
        `${describeNotification(loanId, event)} not sent: N8N_REQUEST_WEBHOOK_URL or N8N_WEBHOOK_SECRET is not set.`
      )

      return null
    }

    const payload = await ctx.runQuery(
      internal.notifications.loadRequestNotificationPayload,
      { loanId, event }
    )

    if (!payload) {
      console.error(
        `${describeNotification(loanId, event)} not sent: the loan no longer exists.`
      )

      return null
    }

    const body = JSON.stringify({ ...payload, sentAt: Date.now() })

    if (await postSigned(url, secret, body)) {
      return null
    }

    const retryDelayMs = retryDelaysMs[attempt - 1]

    if (retryDelayMs === undefined) {
      console.error(
        `${describeNotification(loanId, event)} failed after ${attempt} attempts.`
      )

      return null
    }

    await ctx.scheduler.runAfter(
      retryDelayMs,
      internal.notifications.sendRequestNotification,
      { loanId, event, attempt: attempt + 1 }
    )

    return null
  },
})
