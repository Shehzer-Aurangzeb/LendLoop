# Request notifications (F6)

## What it does

Every time a loan changes status, the right neighbour gets a message. Convex signs a small JSON body and posts it to an n8n webhook running in Docker. n8n checks the signature on the raw bytes, refuses old or unknown requests, drops anything it has already handled, and logs a mock message such as "To Ben: Asha approved Drill, 2026-12-01 to 2026-12-05".

## How it flows

```
Screen (Approve button)
  -> loans.approve            mutation: checks caller and status, patches the loan
       scheduleRequestNotification(ctx, loanId, 'approved')   convex/lib/notifications.ts
         ctx.scheduler.runAfter(0, ...)   runs only if the mutation commits
  -> sendRequestNotification  internal action, convex/notifications.ts
       loadRequestNotificationPayload   internal query: picks recipient, first names, tool, dates
       body = JSON.stringify({ ...payload, sentAt })
       X-LendLoop-Signature = hex HMAC-SHA256(N8N_WEBHOOK_SECRET, body)
       fetch POST N8N_REQUEST_WEBHOOK_URL, 10 s timeout
       not 2xx or error -> runAfter 60 s, then 300 s, then console.error
  -> n8n workflow "LendLoop request notification" (n8n/workflows/request-notification.json)
       Webhook (Raw Body) -> Sign raw body (Crypto Hmac, secret from credential)
       -> Check signature and age (Code): constant-time compare, parse, known event,
          sentAt not older than 5 min or more than 60 s ahead
       -> Is valid? no -> Respond 401
       -> Drop already handled (Remove Duplicates on notificationId) -> Log mock message -> Respond 200
```

- **Triggers:** `loans.request`, `approve`, `decline`, `cancel`, `markReturned`, and `declineAndNotifyWaitingRequests` (`convex/lib/loans.ts`), which both `admin.removeListing` and the Lender's own tool removal call.
- **Recipient:** `requested` and `cancelled` go to the Lender; `approved`, `declined` and `returned` go to the Borrower.
- **Body:** `notificationId` (`<loanId>:<event>`), `event`, `loanId`, `recipientId`, `recipientFirstName`, `otherPartyFirstName`, `toolName`, `startDate`, `endDate`, `sentAt`. No email, no full name.
- **Setup:** README, section "n8n". Tests: `convex/notifications.test.ts` (seam 1) and `n8n/scripts/send-test-notification.sh` (seam 2, by hand).

## Decisions

- **Schedule from the mutation, never fetch in it.** n8n is called only if the write commits, and mutations must stay deterministic. Rejected: calling n8n from the browser after the mutation returns (skippable, and the browser would hold the secret).
- **Sign the exact string that is sent.** Re-serialising JSON can change the bytes. Rejected: signing the object.
- **Two-part replay defence: `sentAt` in the signed body plus a `notificationId` dedupe.** The window makes an old capture useless; the id stops a replay inside the window and our own retry. Rejected: timestamp alone (a 5-minute hole).
- **Retries 1 and 5 minutes apart, fresh `sentAt` each time, same id.** A retry with the first `sentAt` would fail n8n's own age check.
- **Secret only in Convex env vars, the n8n Crypto credential, and the gitignored `n8n/.env`.** The exported workflow names the credential by id and name. Rejected: reading `$env` in a Code node (blocked by default and would put the secret in the container's environment).
- **Constant-time compare as a plain JS loop.** `require('crypto')` is blocked in the Code node by default; the loop needs no config change.
- **Every reject check runs before the dedupe.** Otherwise a refused id is marked handled and its retry gets a silent 200.
- **First names, tool and dates only.** n8n is a third-party system; less data, less to leak. The ids are kept so a real sender could look up the recipient later.

## Changed from the plan

- **The Lender's own tool removal also notifies.** Found while building: it shares the decline helper with the Admin removal. The helper was renamed `declineAndNotifyWaitingRequests` so its side effect shows.
- **The unknown-event check moved before the dedupe.** The first version threw in the log step, after the id was marked; the pre-PR review caught that a retry then returned a silent 200.
- **A 10-second fetch timeout was added.** A hung n8n would otherwise skip the retry and the error log.
- **`env_file` was replaced** by one `N8N_ENCRYPTION_KEY` entry, because `env_file` loaded the webhook secret into the container.

## Known gaps

- **The dedupe still runs before the log step.** If logging crashed, a retry of that id would be dropped. Fine for a mock; a real sender should mark the id only after a successful send.
- **Only the final failure is logged in Convex.** Attempts 1 and 2 leave no error line; they show in `_scheduled_functions`.
- **n8n shows a refused request as a green execution.** Open it to see it ended at Respond 401.
- **When an Admin removes a listing, the Borrower reads "<Lender> declined <tool>".** The event is `declined`; there is no reason field.
- **Only the final outcome is stored in `loanActivity`** (`sent`, or `failed` after the last retry). Attempts 1 and 2 leave no row.
- **Production needs HTTPS and secret rotation.** HTTPS keeps the body and signature private in transit; rotation accepts the old and new secret during a switch. There is no README production note yet; it lands with the final README pass.
