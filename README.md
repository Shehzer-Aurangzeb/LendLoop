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

n8n sends the request notifications. It runs in Docker; Convex reaches it at `localhost:5678`.

1. From the repo root, make the n8n env file. Fill both values, each with its own `openssl rand -hex 32`, with no quotes around them.

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

## Make the demo admin

1. Sign in once, so your row exists in the `users` table.
2. With `pnpm dev` running, open the local Convex dashboard:

   ```bash
   npx convex dashboard
   ```

3. Go to **Data**, then the `users` table, and edit your row: set `role` to `"admin"`.
4. The Admin link appears in the header without a reload.
