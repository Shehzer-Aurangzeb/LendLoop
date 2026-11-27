# Decisions and reasons

Running list, one entry per decision. Becomes the design and security section of the README.

## Architecture

- **One repo, not a monorepo.** Convex lives in `convex/` inside the Next.js app, its standard setup, and the generated types are imported directly. n8n is configuration (workflow JSON plus docker-compose), so a folder is enough.
- **Mutations schedule the n8n call instead of making it.** `ctx.scheduler.runAfter(0, ...)` runs only if the mutation commits, so n8n never hears about a loan that was not saved.

## Setup

- **pnpm, with its supply-chain age check left on.** It refuses packages published less than a day ago. Clerk 7.10.10 was a few hours old, so we pinned 7.10.9 instead of adding an exception.
- **Only `esbuild` may run an install script.** The Convex CLI uses it to bundle functions. `sharp` and `unrs-resolver` stay blocked, as `create-next-app` set them.
- **Next.js 16 uses `proxy.ts`, not `middleware.ts`.** Same Clerk code, new file name (Clerk Next.js quickstart).
- **Clerk env var is declared in `convex/convex.config.ts`.** A deploy fails loudly if `CLERK_JWT_ISSUER_DOMAIN` is missing, instead of auth failing quietly at runtime (Convex Clerk guide).
- **Local Convex deployment, no hosting.** The brief asks for a repo and local setup, not a deploy. Reviewers run Convex without an account, and n8n in Docker reaches it without a tunnel.
- **Cache Components stays on**, the Next.js 16 default. Clerk's `<Show>` sits inside `<Suspense>` because of it.

## Auth and roles

- **Clerk handles identity, Convex handles authorization.** Convex verifies the Clerk JWT; every permission check runs in a Convex function.
- **The role lives in the Convex `users` table, not Clerk metadata.** The checks run next to the data, and users cannot change it. The demo admin is set in the Convex dashboard.
- **Users are created on first sign-in by a `users.store` mutation.** Simple and enough for this scope. A Svix-signed Clerk webhook is the production upgrade.

- **Users are keyed on `tokenIdentifier`**, Clerk's issuer plus subject, as the Convex "Storing users" docs recommend. It stays unique even if a second login provider is added.
- **`users.store` looks up, then inserts if missing, with no unique constraint.** Convex mutations are serializable, so two tabs racing at first sign-in end with one row: the loser re-runs and finds the winner's row.
- **`requireUser` and `requireAdmin` throw on the server.** The UI also waits for `users.store` before running user queries, but that is only so the screen looks right. The server check is what protects the data.

## Data model

- **Loan dates are `"YYYY-MM-DD"` strings.** Convex has no Date type, loans cover whole days, and strings compare correctly as text. No timezone can shift a loan by a day.
- **Overdue is computed, never stored.** A stored flag would need a daily job and could go stale.
- **One app timezone decides "today"**, from a Convex env var. One neighbourhood, one calendar.
- **Removing a tool is a soft delete (`removedAt`).** Past loans and their activity keep pointing at a real tool. Pending requests are declined, future approved loans become `cancelled`, and a loan that is out stays until it is returned.
- **Loans copy `lenderId` from the tool.** A tool's owner never changes, so "Incoming requests" reads one index instead of joining through tools.
- **One `loanActivity` table with a `kind` field** for request notifications and overdue reminders. One place to read a loan's recent automation.
- **The seed is an internal mutation that does nothing if data exists**, with dates set from the day it runs. A reviewer sees every status without creating anything.

## Data minimisation

- **The public list shows tool name and category only.** Strangers do not need to know which house has a drill.
- **n8n gets only the fields a message needs.**

## Integration

- **HMAC both directions, separate secrets**, verified on the raw body.
- **Reminder write-backs are idempotent on `loanId + date`.** A retried write-back changes nothing.
- **`/overdue` skips loans already reminded today.** A manual rerun never sends a second email.
- **n8n writes back once per loan per run, `sent` or `failed`.** Retries happen on the send node; a final failure also triggers the error workflow.
