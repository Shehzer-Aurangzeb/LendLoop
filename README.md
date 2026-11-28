# LendLoop

Borrow what you need. Lend what you don't.

## Setup

Needs Node and pnpm. Convex runs as a local deployment, so no Convex account is needed.

1. Install packages.

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the Clerk keys from your Clerk dashboard.
3. In Clerk, create a JWT template named `convex` with these claims, so Convex gets each neighbour's name and email:

   ```json
   { "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}" }
   ```

4. Start Convex and Next.js. The first Convex push fails until the env vars in the next step are set; that's expected.

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
