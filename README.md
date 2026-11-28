# LendLoop

Borrow what you need. Lend what you don't.

A neighbourhood tool-lending board. Neighbours list tools, ask to borrow them for a date range, and the lender approves, declines and marks returns. n8n sends a notification on every request change and a daily reminder for overdue loans. Admins remove listings, see every loan and mark Trusted Lenders.

**Stack:** Next.js 16 (App Router) · Clerk · Convex · n8n (Docker) · TypeScript

## Demo video

> _Video link goes here._

## Contents

- [What you can do](#what-you-can-do)
- [Setup](#setup)
- [n8n](#n8n)
- [Make the demo admin](#make-the-demo-admin)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [Security decisions](#security-decisions)
- [Data minimisation](#data-minimisation)
- [Reliability and error handling](#reliability-and-error-handling)
- [Known limits](#known-limits)
- [What I'd change for production](#what-id-change-for-production)
- [Commands and tests](#commands-and-tests)

## What you can do

- **Signed out:** see the tagline and a live list of available tools, name and category only, and a "Sign in to lend or borrow" button.
- **Board (`/board`):** every tool with its status (available, out, overdue), filterable by category, with a Trusted Lender badge on trusted owners.
- **Tool page (`/tools/[id]`):** the days already lent, and a form to request a date range.
- **My tools (`/my-tools`):** list, edit and remove your own tools, and see waiting requests per tool.
- **Loans (`/loans`):** incoming requests to approve or decline, tools you've lent out (mark as returned), and what you're borrowing (cancel a waiting request). Each loan shows its latest automation, like "Reminder sent 2 days ago".
- **Admin (`/admin`):** remove any listing, see all loans by status, and toggle Trusted Lender.

The seed script fills the board with six demo neighbours, 15 tools and a loan in every status, so all of this shows on first run.

## Setup

Needs Node 20 or newer, pnpm and Docker. Convex runs as a local deployment, so no Convex account is needed.

1. Install packages.

   ```bash
   pnpm install
   ```

2. Make a Clerk app (Clerk's [Convex guide](https://docs.convex.dev/auth/clerk)):
   1. At [dashboard.clerk.com](https://dashboard.clerk.com), create an application and pick any sign-in method, such as email.
   2. Under **JWT templates**, create a template from the **Convex** preset. Keep the name `convex`, since Convex's Clerk provider asks for a token by that name. Add these claims, so Convex gets each neighbour's name and email:

      ```json
      { "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}" }
      ```

   3. Copy the template's **Issuer** URL (like `https://your-app.clerk.accounts.dev`). It is `CLERK_JWT_ISSUER_DOMAIN` in step 5.
   4. Under **API keys**, copy the publishable key and the secret key.

3. Copy `.env.example` to `.env.local` and fill in the two Clerk keys. Convex writes `NEXT_PUBLIC_CONVEX_URL` itself in the next step.

   ```bash
   cp .env.example .env.local
   ```

4. Start Convex and Next.js. The first time, Convex asks how to run: choose to run it locally, without an account. The first push fails until the env vars in the next step are set; that's expected.

   ```bash
   pnpm dev
   ```

5. In a second terminal, set the Convex env vars. `APP_TIMEZONE` is the neighbourhood's timezone and decides what "today" means for loans.

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   npx convex env set APP_TIMEZONE America/Toronto
   ```

   Then stop and restart `pnpm dev` so Convex pushes again.

6. Load the demo neighbours, tools and loans. It's safe to run more than once, and before or after you sign in.

   ```bash
   npx convex run seed:run
   ```

7. Open http://localhost:3000 and sign in.

## n8n

n8n sends the request notifications and the daily overdue reminders. It runs in Docker; Convex reaches it at `localhost:5678`, and n8n reaches Convex at `host.docker.internal:3211`.

1. From the repo root, make the n8n env file. Fill every value, each with its own `openssl rand -hex 32`, with no quotes around them.

   ```bash
   cd n8n
   cp .env.example .env
   ```

2. Still in `n8n/`, start n8n.

   ```bash
   docker compose up -d
   ```

3. Open http://localhost:5678 and create the owner account. It stays on your machine.
4. Go to **Credentials**, create a **Crypto** credential named `LendLoop webhook secret`, and set **Hmac Secret** to the `LENDLOOP_WEBHOOK_SECRET` value from `n8n/.env`.
5. Create a workflow, open the **...** menu, choose **Import from File**, and pick `n8n/workflows/request-notification.json`. Open the **Sign raw body** node and select the `LendLoop webhook secret` credential if it is not already selected. Then **Publish** the workflow.
6. Go back to the repo root and, with `pnpm dev` running, point Convex at the webhook and give it the same secret.

   ```bash
   cd ..
   npx convex env set N8N_REQUEST_WEBHOOK_URL http://localhost:5678/webhook/lendloop-request-notification
   npx convex env set N8N_WEBHOOK_SECRET "$(grep '^LENDLOOP_WEBHOOK_SECRET=' n8n/.env | cut -d= -f2)"
   ```

7. From the repo root, send a signed test message. The output ends in `HTTP 200`. Pass `tampered` or `stale` instead to see `HTTP 401`, or `spaced` to see that odd JSON spacing still verifies, since n8n hashes the raw bytes.

   ```bash
   cd n8n
   set -a; . ./.env; set +a
   scripts/send-test-notification.sh valid
   ```

8. See the message: in n8n open **Executions**, pick the newest run, and open the **Log mock message** node. Its `message` reads `To Ben: Asha approved Drill, 2026-12-01 to 2026-12-05`. It does not appear in `docker compose logs`.

In the app, approving, declining or returning a loan, or making or cancelling a request, adds a new execution the same way. With a single account, request one of the seeded tools: the newest execution shows the message to its Lender, like `To <lender>: <your first name> asked to borrow <tool>, <start> to <end>`. If n8n is down, the change still saves; Convex retries after 1 and 5 minutes, then logs an error in the `pnpm dev` output.

### Overdue reminders

Every day at 09:00 (n8n's `GENERIC_TIMEZONE`), n8n asks Convex for overdue loans not yet reminded today, logs a mock reminder for each, and writes `sent` or `failed` back to Convex. Convex refuses any request not signed with `CONVEX_WEBHOOK_SECRET`.

1. With `pnpm dev` running, give Convex the secret n8n signs with.

   ```bash
   npx convex env set CONVEX_WEBHOOK_SECRET "$(grep '^CONVEX_WEBHOOK_SECRET=' n8n/.env | cut -d= -f2)"
   ```

2. In n8n, create a second **Crypto** credential named `LendLoop Convex secret` and set **Hmac Secret** to the `CONVEX_WEBHOOK_SECRET` value from `n8n/.env`.
3. Import `n8n/workflows/error-handler.json` the same way as before, then **Publish** it. n8n runs it only when published.
4. Import `n8n/workflows/overdue-reminders.json`. Open **Sign due request**, **Sign sent result** and **Sign failed result** and select the `LendLoop Convex secret` credential if it is not already selected. The file presets `LendLoop error handler` as its error workflow, but a UI import gives the error handler a new id, so in the **...** menu open **Settings** and pick **Error workflow** `LendLoop error handler` again. Then **Publish** it so the 09:00 schedule runs.
5. Check that Convex answers a signed request. From `n8n/`, the output ends in `HTTP 200` and lists today's due reminders. Pass `tampered` or `stale` to see `HTTP 401`.

   ```bash
   cd n8n
   set -a; . ./.env; set +a
   scripts/fetch-overdue-reminders.sh valid
   ```

6. Run it now: open the workflow and click **Execute workflow**. The seed data has one overdue loan. Open the **Send mock reminder** node to read `To Maya: please return Circular saw, it was due <date>`. The loan's activity row shows in the Convex dashboard, table `loanActivity`. A second run the same day finds nothing to send.

- **See a failure:** set `isFailingOnPurpose = true` at the top of **Send mock reminder**. The node tries 3 times, 5 seconds apart, then the error branch writes `failed` for every due loan and **Fail run: reminders failed** ends the run in error, so `LendLoop error handler` runs too. Set it back and run again: the loans are retried and their rows become `sent`.
- **See a crashed run:** stop `pnpm dev` and run the workflow. **Fetch due reminders** fails, so the run fails, and **Executions** shows a run of `LendLoop error handler`. Its **Log failed run** node shows the workflow name, the failed run's URL, the last node and the error message.
- **Convex not on port 3211?** Change `convexSiteUrl` at the top of **Build due request**. It is the only place the URL is set.

## Make the demo admin

1. Sign in once, so your row exists in the `users` table.
2. With `pnpm dev` running, open the local Convex dashboard:

   ```bash
   npx convex dashboard
   ```

3. Go to **Data**, then the `users` table, and edit your row: set `role` to `"admin"`.
4. The Admin link appears in the header without a reload.

## Environment variables

Real values live only in `.env.local`, Convex env vars and n8n credentials. `.env.example` and `n8n/.env.example` list the names with no values.

| Name | Where | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Clerk publishable key, safe in the browser. |
| `CLERK_SECRET_KEY` | `.env.local` | Clerk secret key, server only. |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Convex URL for the browser. Written by `convex dev`, along with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_SITE_URL`. |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | Clerk issuer URL. Convex trusts tokens only from here. Declared in `convex/convex.config.ts`, so a deploy fails loudly if it is missing. |
| `APP_TIMEZONE` | Convex | IANA timezone, like `America/Toronto`. Decides "today" for loans and reminders. |
| `N8N_REQUEST_WEBHOOK_URL` | Convex | The request-notification webhook in n8n. |
| `N8N_WEBHOOK_SECRET` | Convex | HMAC secret Convex signs request notifications with. |
| `CONVEX_WEBHOOK_SECRET` | Convex | HMAC secret Convex verifies n8n's reminder requests with. |
| `N8N_ENCRYPTION_KEY` | `n8n/.env` | Encrypts the credentials n8n stores. The only value passed into the container. |
| `LENDLOOP_WEBHOOK_SECRET` | `n8n/.env` + n8n credential `LendLoop webhook secret` | Same value as `N8N_WEBHOOK_SECRET`. The file copy is for the test script. |
| `CONVEX_WEBHOOK_SECRET` | `n8n/.env` + n8n credential `LendLoop Convex secret` | Same value as the Convex one. The file copy is for the test script. |

Set Convex env vars with `npx convex env set NAME value`, never in `.env.local`.

## Architecture

```
Browser ── Next.js (screens) ── Clerk (sign-in, issues JWT)
   │
   └─ live queries / mutations, with the Clerk JWT ──► Convex
                                                       │  database + functions
                                                       │  every permission check
   Convex mutation ─ schedules ─► Convex action ─ HMAC POST ─► n8n webhook
                                                                (request notification)
   n8n schedule 09:00 ─ HMAC POST ─► Convex HTTP endpoint /overdue-reminders/due
   n8n, per loan     ─ HMAC POST ─► Convex HTTP endpoint /overdue-reminders/result
```

| Piece | Job | Runs |
| --- | --- | --- |
| Next.js | Screens (App Router). `proxy.ts` is Clerk's middleware. | Browser + local dev server |
| Clerk | Identity: sign-in, sessions, JWT | Clerk's cloud |
| Convex | Database, backend functions, live sync, scheduler | Local deployment |
| n8n | Notification and reminder workflows | Docker, `localhost:5678` |

**Where the code lives**

- `app/`: one folder per route. Pages are thin: they redirect signed-out visitors and render components.
- `components/`: UI. Data fetching sits in `use*.ts` hooks, kept apart from the markup.
- `convex/schema.ts`: tables `users`, `tools`, `loans`, `loanActivity`.
- `convex/lib/auth.ts`: `requireIdentity`, `requireUser`, `requireAdmin`. No public function reads `ctx.auth` directly.
- `convex/tools.ts`, `loans.ts`, `admin.ts`, `users.ts`: the public functions.
- `convex/notifications.ts`: builds, signs and sends request notifications (all `internal`).
- `convex/http.ts` + `overdueReminders.ts`: the two signed endpoints n8n calls, and the internal functions behind them.
- `convex/seed.ts`: the demo data.
- `n8n/`: `docker-compose.yml`, the three exported workflows, and two signed test scripts.

**Key flows**

- **First sign-in:** the browser calls `users.store`, which creates a `users` row with `role: "user"`.
- **Request a tool:** `loans.request` checks you are signed in, it is not your tool, the dates are valid and nobody has those days. It inserts the loan and schedules `sendRequestNotification`. The action signs the payload and POSTs it to n8n, which verifies it and logs a message to the lender.
- **Approve, decline, cancel, return:** the same shape. Each mutation checks the caller and the current status, then schedules one notification.
- **Overdue reminders:** n8n asks `/overdue-reminders/due` for overdue loans not reminded today, sends a reminder for each, and writes `sent` or `failed` to `/overdue-reminders/result`.

Every decision and its reason is in [`docs/decisions.md`](docs/decisions.md). The request-notification flow is walked through in [`docs/request-notifications.md`](docs/request-notifications.md).

## Security decisions

- **Clerk handles identity; Convex handles authorization.** Convex verifies the Clerk JWT against `CLERK_JWT_ISSUER_DOMAIN`. Hiding a button or redirecting a route in Next.js is only convenience.
- **Every public Convex function validates its `args`, then checks the caller** through `convex/lib/auth.ts`, then checks ownership or role. Functions only the scheduler or HTTP endpoints call are `internal`, so the browser cannot call them.
- **The role lives in the Convex `users` table, not Clerk metadata.** Users cannot change it, and the check runs next to the data. Every admin function calls `requireAdmin` first.
- **Users are keyed on `tokenIdentifier`** (Clerk issuer plus subject), as the Convex docs recommend.
- **Every loan change allow-lists both the caller and the status.** For example, only the lender can approve, and only a `requested` loan. "Not the borrower" would let a third neighbour through.
- **Approving re-reads the tool's approved loans and refuses a clash.** Convex mutations are serializable, so two approvals racing for the same days cannot both commit.
- **Input is trimmed and length-checked in the mutation.** The browser's `maxLength` reads the same limits from one file, so the two cannot drift.
- **HMAC-SHA256 in both directions, with separate secrets.** Convex signs what it sends to n8n with `N8N_WEBHOOK_SECRET`; n8n signs what it sends to Convex with `CONVEX_WEBHOOK_SECRET`. A leak of one does not let an attacker fake the other.
- **Signatures are checked on the raw body, in constant time.** Re-parsed JSON could change spacing or key order; `===` leaks how many characters matched.
- **Replay defence.** Each signed body carries `sentAt`, which must be within 5 minutes. n8n also dedupes request notifications on `notificationId`; Convex write-backs are idempotent, so a replay changes nothing.
- **Convex parses JSON only after the signature passes.** A refusal is a bare `401` with no detail.
- **Secrets never sit in code or in the exported workflow JSON.** The JSON names n8n credentials by id and name only. `docker-compose.yml` passes only `N8N_ENCRYPTION_KEY` into the container, and binds n8n to `127.0.0.1`.
- **Mutations never call n8n directly.** They schedule an action, which runs only if the write commits, so n8n never hears about a change that was rolled back.

## Data minimisation

- **The public list returns tool name and category only**, with no `_id` and no owner. Strangers don't need to know which house has a drill.
- **Queries declare exact `returns` validators.** Convex rejects a response with an extra field, so a later schema change cannot leak data by accident.
- **The browser gets first names only.** No email, full name or user id leaves Convex; "is this mine" is worked out on the server.
- **The tool page shows lent days as dates only**, not who has the tool.
- **n8n gets only what a message needs:** first names, tool name, dates, plus ids and `sentAt`. No email or full name reaches n8n.
- **Loan activity shows only on the borrower's and lender's own lists**, so no new access check is needed.

## Reliability and error handling

- **Request notifications retry after 1 and then 5 minutes**, then log an error. Each send has a 10-second timeout. The outcome (`sent` or `failed`) is stored in `loanActivity`. A failed send never undoes the loan change.
- **Overdue reminders retry inside the run:** the send node tries 3 times, 5 seconds apart. A send that still fails writes `failed`, and the run ends in error so the error workflow shows it.
- **The reminder write-back is idempotent on `loanId + date + kind`.** One row per loan per day; `failed` can become `sent`, never the other way. A lost response or a retry adds nothing.
- **`/overdue-reminders/due` skips loans already sent today but keeps failed ones**, so a manual rerun never sends twice but does retry failures.
- **The `LendLoop error handler` workflow catches any failed run**, including Convex being down, and logs the workflow name, run URL, last node and error. Failures are never silent.
- **Bonus:** each loan shows its latest automation, like "Reminder sent 2 days ago".

## Known limits

- **A page left open overnight can show a stale "out" or "overdue"** until the next write or reload. Convex reruns a query only when its data changes, and "today" is worked out on the server. Reminders are not affected.
- **The mock reminder sender handles the batch as one unit**, so one failure marks the whole batch `failed`. A real sender should send per loan.
- **n8n marks a notification as handled before logging it.** Fine for a mock logger; a real sender should dedupe after a successful send.
- **One reminder per overdue loan**, not one per borrower.

## What I'd change for production

- **Sync users with a Clerk webhook.** Today `users.store` creates the row on first sign-in. A Svix-signed `user.created` / `user.updated` / `user.deleted` webhook keeps names and emails current and removes deleted users.
- **Rate limiting.** Limit requests per user on `loans.request` and `tools.create` (for example with the Convex rate-limiter component), and on the HTTP endpoints.
- **Cloud Convex.** Move from the local deployment to a hosted dev and prod deployment, with env vars set per deployment.
- **Hosted n8n over HTTPS.** n8n Cloud or a server behind TLS, so payloads and signatures are private in transit. Rotate secrets by accepting the old and new one for a short switch-over.
- **A real email provider.** Replace the mock log nodes with an email service (such as Resend or Postmark). Look up the email inside n8n's call to Convex, or send from Convex, so emails never sit in a payload. Send per loan, and dedupe after a successful send.
- **CI.** Run `pnpm lint`, `pnpm typecheck` and `pnpm test` on every pull request, and deploy Convex from CI on merge.
- **Audit log.** Record every admin action (remove listing, Trusted Lender change) and every role change: who, what, when. Keep it append-only.
- **Tool photos.** Upload with Convex file storage: the mutation checks the caller owns the tool and the file type and size before saving the storage id, and queries return a short-lived URL. Today each tool shows its category icon on a tinted tile.
- **Smaller items:** paginate the tool lists and filter by category on the server; set an admin through a script instead of the dashboard; add error monitoring (such as Sentry) for the Convex `console.error` lines.

## Commands and tests

pnpm only.

- `pnpm dev`: Convex and Next.js together (localhost:3000, Convex on 3210, HTTP endpoints on 3211)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: Vitest with `convex-test`, run once. Tests sit next to the code as `convex/**/*.test.ts` and cover the permission checks, loan rules, dates across timezones, signatures and idempotent write-backs.
