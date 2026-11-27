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
- **Vitest reads the `@/` alias from `tsconfig.json`** (`resolve.tsconfigPaths`). Tests in subfolders such as `convex/lib/` can then follow the no-`../` import rule.
- **Cache Components stays on**, the Next.js 16 default. Clerk's `<Show>` sits inside `<Suspense>` because of it.

## Auth and roles

- **Clerk handles identity, Convex handles authorization.** Convex verifies the Clerk JWT; every permission check runs in a Convex function.
- **The role lives in the Convex `users` table, not Clerk metadata.** The checks run next to the data, and users cannot change it. The demo admin is set in the Convex dashboard.
- **Users are created on first sign-in by a `users.store` mutation.** Simple and enough for this scope. A Svix-signed Clerk webhook is the production upgrade.

- **Users are keyed on `tokenIdentifier`**, Clerk's issuer plus subject, as the Convex "Storing users" docs recommend. It stays unique even if a second login provider is added.
- **`users.store` looks up, then inserts if missing, with no unique constraint.** Convex mutations are serializable, so two tabs racing at first sign-in end with one row: the loser re-runs and finds the winner's row.
- **`requireIdentity` is separate from `requireUser`.** `users.store` runs before a users row exists, so it needs "signed in" without "has a row". All three helpers live in `convex/lib/auth.ts`, and no public function reads `ctx.auth` directly.
- **`requireUser` and `requireAdmin` throw on the server.** The UI also waits for `users.store` before running user queries, but that is only so the screen looks right. The server check is what protects the data.

- **Signed-in pages redirect with `auth.protect()` in the page, not a route matcher in `proxy.ts`.** Clerk 7 deprecates `createRouteMatcher` in favour of checks next to the resource. The redirect is still only convenience; `requireUser` in Convex is the real check.
- **Tool text is trimmed and length-checked in the Convex mutation before the write.** The browser's `maxLength` reads the same limits from one import-free file, so client and server cannot drift and no server code ships to the browser.

## Design

- **Screens follow one approved design, kept outside the repo.** It is drawn before the signed-in features so every screen shares one look; the mockup files sit in a gitignored folder and are deleted when the app is done.
- **Colours are Tailwind theme tokens named for their role** (ground, ink, accent…). Components use token classes, never raw hex, so a colour changes in one place.
- **One global focus ring in CSS** instead of focus classes on each control, so nothing interactive can ship without it.
- **Each category's icon and tile tint live in one `Record<Category, …>`.** A new category is a type error until it has both.
- **Step numbers use a darker marigold than the logo.** The design's marigold is 3.4:1 on white; text needs 4.5:1.
- **Signed in, the landing page hides its sign-in prompts**, the hero button and the "See something you need?" band, since their only job is to invite sign-in.
- **Loan status colours wait for the loan screens.** The landing page has no statuses to show.

## Data model

- **Loan dates are `"YYYY-MM-DD"` strings.** Convex has no Date type, loans cover whole days, and strings compare correctly as text. No timezone can shift a loan by a day.
- **Overdue is computed, never stored.** A stored flag would need a daily job and could go stale.
- **One app timezone decides "today"**, from a Convex env var. One neighbourhood, one calendar.
- **Removing a tool is a soft delete (`removedAt`).** Past loans and their activity keep pointing at a real tool. Pending requests are declined, future approved loans become `cancelled`, and a loan that is out stays until it is returned.
- **Loans copy `lenderId` from the tool.** A tool's owner never changes, so "Incoming requests" reads one index instead of joining through tools.
- **One `loanActivity` table with a `kind` field** for request notifications and overdue reminders. One place to read a loan's recent automation.
- **The seed is an internal mutation that does nothing if the demo users already exist**, with dates set from the day it runs. A reviewer sees every status without creating anything. It checks for a demo user, not "any user", so it still works after the reviewer has signed in.
- **"Today" comes from `Intl.DateTimeFormat` with the app timezone; days are added in UTC.** No date library. Adding days to a calendar date in UTC can't be shifted by daylight saving.
- **One `todayInAppTimezone()` helper reads `APP_TIMEZONE` itself.** Callers pass no timezone, so the seed and the board queries cannot disagree on what "today" is.
- **Date tests pin the clock to an instant where UTC and the app timezone disagree.** A test that reused the code's own "today" logic would pass even when that logic is wrong.

- **Category and condition are radio groups, not selects**, as the mockup draws them. Native radios in a `fieldset` with a `legend` keep them labelled and keyboard reachable.

- **"Lent out" is one index read of approved loans that have started.** The board never queries loans per tool, and the end date is ignored, so an overdue tool still shows as out until the lender marks it returned.
- **A lent-out tool carries one optional `lentOut: { until, isOverdue }` object.** "Out" and "overdue" can never appear one without the other.
- **The signed-in board works out `isMine` and the lender's first name on the server.** No owner id, user id, email or full name reaches the browser; the `returns` validator rejects anything extra.
- **`'YYYY-MM-DD'` dates are formatted in the browser in UTC.** The string is a calendar day, so no viewer timezone can move it.
- **The board greets with "Hi", not "Good morning".** Time of day differs between the server and browser render.

## Data minimisation

- **The public list shows tool name and category only.** Strangers do not need to know which house has a drill.
- **`tools.listPublic` maps each tool to `{ name, category }` and declares a `returns` validator for that shape.** Convex rejects the response if an extra field slips in, so a later schema change cannot leak data by accident.
- **The public list returns no `_id`.** Nothing public addresses a single tool, so the React key is position plus name.
- **The category union is defined once and shared by the schema and the public query.** The two cannot drift apart.
- **The public page reads the list with `useQuery`, a live subscription.** A tool added while a visitor has the page open appears without a reload. `fetchQuery` would be a one-off snapshot.
- **A failed public list shows a short message from a Next.js `catchError` boundary.** `useQuery` throws on failure; a function boundary needs no class and no new dependency.
- **The category filter runs in the browser over the full list.** The list is small and already loaded, so switching is instant.
- **n8n gets only the fields a message needs.**

## Integration

- **HMAC both directions, separate secrets**, verified on the raw body.
- **Reminder write-backs are idempotent on `loanId + date`.** A retried write-back changes nothing.
- **The reminder duplicate check reads the `loanId + date` index and filters on `kind`.** A loan has only a few activity rows a day, so a filter is cheap, and keeping `kind` out of the index keeps the per-loan activity list sorted by date.
- **`/overdue` skips loans already reminded today.** A manual rerun never sends a second email.
- **n8n writes back once per loan per run, `sent` or `failed`.** Retries happen on the send node; a final failure also triggers the error workflow.

## Later, if it grows

- **Paginate the public tool list.** It reads every tool per visit, fine for tens of tools.
- **Filter by category on the server, using the `by_category` index.** Goes together with pagination; for now the browser filters the full list.
- **Share the button focus-ring style.** Two buttons repeat the same Tailwind focus classes; pull them into one shared class when a third button needs them.
- **Index `removedAt`.** Today removed tools are read and dropped; an index skips them once many pile up.
