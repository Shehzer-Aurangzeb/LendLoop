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

- **Signed-in neighbours never see the landing page.** Sign-in and sign-up land on `/board` (`forceRedirectUrl` on the sign-in button), and `proxy.ts` sends a signed-in visit to `/` to `/board` before anything renders, so there is no flash and the landing page stays static for visitors. Convenience only; Clerk keeps real protection next to the resource.
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

- **`tools.update` answers "Tool not found" for a missing or removed tool, before the ownership check.** Editing is allowed while a tool is lent out; only removal is blocked by a loan.
- **The edit form holds the id of the tool being edited and reads the tool from the live list.** A tool removed elsewhere drops the form back to "List a tool" with no stale copy; a `key` per tool resets the fields without an effect.

- **A lender's remove (`tools.removeOwn`) is refused while any approved loan exists, started or not, and declines pending requests in the same transaction.** Every check throws before the first write, so a refused removal changes nothing. The admin's remove in F5 is a separate function.
- **One `requireOwnTool` helper decides "exists, not removed, and yours"** for every lender change, so update and remove cannot drift apart.
- **The two-step remove is one button whose label changes, with no `confirm()`.** Focus stays on it between steps; after a removal it moves to the form heading, since the tool's row is gone.

- **My tools reads each of the lender's tools' loans by `by_tool`; the board does one approved-loans read for every tool.** One lender has few tools, and My tools also needs the waiting-request count per tool.
- **One server rule each for "lent out" and "first name", shared by the board and My tools.** The two screens cannot disagree on whether a tool is out, and no full name leaves Convex.
- **An overdue tool reads "due back <day>" on both screens** ("Out, due back…" on the board, "With Liam, due back…" on My tools), so "until" never names a day that has passed.
- **Timezone tests run in both directions**: an app timezone behind UTC (Toronto) and one ahead of it (Auckland).

- **The tool page query takes the URL id as a string and checks it with `normalizeId`.** A broken or old link shows "Tool not found" instead of the generic load error; an id from another table also comes back `null`.
- **The tool page lists approved loans as dates only, overdue ones included.** A borrower can pick free days without learning who has the tool; an overdue tool really is still out.
- **The request form's `min` date uses the browser's today; the server's app-timezone today is the real check.** Near midnight the two can differ by a day, and the server's refusal message covers it. Passing the server's today down would go stale overnight anyway.
- **"Already lent" sits above the date inputs on the tool page.** The borrower sees the taken days before picking, and the form needs no slot for it.
- **A borrower whose own request overlaps their approved or waiting loan hears "You already asked for some of these days."** Their own loans are left out of the "already lent" clash so the message names the real reason.
- **Approve re-reads the tool's approved loans and refuses a clash; other overlapping requests stay waiting.** Convex mutations are serializable, so two approvals racing for the same days cannot both commit: the second re-runs and sees the first. The test runs the two approvals one after the other; the real race rests on that Convex guarantee.
- **Every loan change allow-lists both the caller and the status** (lender and `requested` for approve and decline). "Not the borrower" or "not cancelled" would let a third neighbour or an old declined loan through.
- **The header Loans badge is darker than the mockup's marigold.** White on the mockup colour is about 3:1; the darker shade passes AA for small text.
- **"You've lent out" shows a pill (Approved, Out now, Overdue) but no "back in 2 days" hint.** The hint needs today in the app timezone: worked out in the browser it can be a day off, and on the server it goes stale overnight. The pill carries the state.
- **The borrower's "You're borrowing" list also flags an overdue loan.** The borrower is the one who must hand the tool back, and the mockup shows the pill there too. It uses the same overdue rule as the lender's list.
- **`approve` refuses a loan whose tool was removed.** Removing a tool already declines its waiting requests, but the check keeps F5's admin removal from reopening that gap.
- **Mark as returned needs an approved loan that has started.** A loan that never began cannot be closed as returned; the lender declines or waits.
- **The admin's remove (`admin.removeListing`) works even while the tool is lent out.** Refusing would leave a busy spam listing stuck forever. Setting `removedAt` already hides it and blocks new requests and approvals; the approved loan runs to its end and the lender still marks it returned. Waiting requests are declined in the same transaction.
- **Every admin function calls `requireAdmin` first.** The header link and the `/admin` page read `users.amIAdmin`, a boolean that only shapes the UI. Because Convex queries are live, a demoted admin's open page loses its data at once.
- **Removing a listing asks "Yes, remove / Keep it" for the admin too.** Removal cannot be undone from the app, so both remove buttons share the same confirm step.
- **With a status filter, the admin loan list is ordered by end date, latest first; with "All" it is newest created first.** The filter reads the `by_status_and_endDate` index, which sorts by end date. A one-field status index would give true newest-first, but it is not worth a new index for an admin list.
- **The admin lender list shows owners of live tools only.** A neighbour whose tools are all removed drops off it, and their Trusted Lender mark stays as it is, so it comes back if they list again.
- **Trusted Lender is a toggle the admin can grant and revoke.** The board badge reads `users.isTrustedLender` live, so it follows at once and a mistake is one click to undo.
- **The lender toggle is a button with `aria-pressed`, not a checkbox.** It saves on click, like the other admin actions, and screen readers announce it as on or off.

## Data minimisation

- **The public list shows tool name and category only.** Strangers do not need to know which house has a drill.
- **`tools.listPublic` maps each tool to `{ name, category }` and declares a `returns` validator for that shape.** Convex rejects the response if an extra field slips in, so a later schema change cannot leak data by accident.
- **Admin queries return first names only, never an email or a whole user row.** Each declares an exact `returns` validator, so Convex rejects any extra field.
- **The public list returns no `_id`.** Nothing public addresses a single tool, so the React key is position plus name.
- **The category union is defined once and shared by the schema and the public query.** The two cannot drift apart.
- **The public page reads the list with `useQuery`, a live subscription.** A tool added while a visitor has the page open appears without a reload. `fetchQuery` would be a one-off snapshot.
- **A failed public list shows a short message from a Next.js `catchError` boundary.** `useQuery` throws on failure; a function boundary needs no class and no new dependency.
- **The category filter runs in the browser over the full list.** The list is small and already loaded, so switching is instant.
- **n8n gets only the fields a message needs.** A request notification carries first names, the tool name and the dates, plus ids and `sentAt`. No email and no full name reach n8n, a third-party system. The internal query that builds it declares an exact `returns` validator, so an extra field fails loudly.

## Integration

- **HMAC both directions, separate secrets, verified on the raw body.** For request notifications, Convex signs the exact body string with HMAC-SHA256, hex, in the `X-LendLoop-Signature` header; n8n hashes the raw request bytes, not re-parsed JSON, so spacing or key order cannot break or fake a match. Web Crypto, so no new dependency.
- **Reminder write-backs are idempotent on `loanId + date + kind`.** One `overdue-reminder` row per loan per day: `failed` upgrades to `sent`, `sent` never goes back to `failed`. A lost response or an n8n retry changes nothing. The mutation reads then inserts; Convex mutations are serializable, so a racing retry cannot add a second row.
- **The reminder duplicate check reads the `loanId + date` index and filters on `kind`.** A loan has only a few activity rows a day, so a filter is cheap, and keeping `kind` out of the index keeps the per-loan activity list sorted by date.
- **`/overdue-reminders/due` skips loans with a `sent` reminder today; a `failed` one stays in.** A manual rerun never sends a second message, but it does retry the failures.
- **Convex HTTP actions only verify, then delegate.** `convex/http.ts` checks the signature and body shape and calls an `internal` query or mutation. Data access stays in normal Convex functions that tests and other code can reuse; an HTTP action has no `ctx.db` anyway.
- **n8n signs its requests to Convex with its own secret, `CONVEX_WEBHOOK_SECRET`**, separate from F6's `N8N_WEBHOOK_SECRET`. A leak of one direction does not let an attacker fake the other.
- **Both reminder endpoints are `POST`, even `/due` which only reads.** A `GET` has no body, so there would be nothing to sign or to carry `sentAt`.
- **Convex parses JSON only after the signature passes.** Unsigned input never reaches the parser. Refusals are a bare 401 with no detail; a missing secret is a 500 and a logged error; a signed body with no `sentAt` is a 401 too, since it cannot prove it is fresh; any other malformed signed body is a 400; an unknown loan is a 404.
- **Signed `sentAt` must be within 5 minutes (and at most 60 s ahead).** A replayed `/due` only reads a list, and a replayed `/result` is a no-op thanks to the idempotent write-back, so no extra id dedupe is needed on the Convex side.
- **The `/result` mutation takes `loanId` as a plain string and checks it with `normalizeId`.** Only the database can tell a malformed id (400) from a well-formed id of a deleted loan (404).
- **A request notification stores its final outcome in `loanActivity`.** `sent` on success, `failed` only after the last retry, plain insert with no dedupe. Nothing is stored when no send was attempted (env missing or loan gone), since there is no outcome to report; the `console.error` covers those.
- **n8n writes back once per loan per run, `sent` or `failed`.** Retries happen on the send node. After the `failed` rows are saved, **Fail run: reminders failed** throws once with the count, so a fully failed send also ends the run in error and triggers the error workflow.
- **Every loan status change, and each request declined by a tool removal, schedules one request notification.** The mutation passes only `loanId` and `event`; the action builds the payload. Both removals share `declineAndNotifyWaitingRequests`, so neither can forget to notify.
- **Who is told:** the Lender for `requested` and `cancelled`; the Borrower for `approved`, `declined` and `returned`, including a decline caused by a tool removal.
- **n8n compares signatures in constant time.** A normal `===` stops at the first wrong character, which leaks how much matched.
- **Replay defence has two parts: a `sentAt` time inside the signed body and a `notificationId` dedupe.** The 5-minute window makes an old captured request useless; the dedupe stops a replay inside that window and our own retry from logging twice. Neither covers both cases alone.
- **`sentAt` may be up to 60 seconds in the future.** Small clock drift between the Convex host and the n8n container should not reject a real request.
- **`notificationId` is `<loanId>:<event>`.** A loan's status only moves forward, so each pair happens once per loan.
- **Retries after 1 minute, then 5 minutes, then a `console.error`.** Three tries ride out a short n8n restart. Each retry sends a fresh `sentAt` and a new signature but the same `notificationId`, so a late success is still deduped.
- **The action never throws on a send failure.** The loan change already committed; a notifier problem is a log line, not a failed approval.
- **`N8N_REQUEST_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET` are read with `process.env` in the action**, not declared in `convex.config.ts`. A missing value is a logged error, and Convex still deploys without n8n.
- **The shared secret lives in Convex env vars, the n8n Crypto credential, and the gitignored `n8n/.env` for the local test script.** The exported workflow JSON names the credential by id and name only, so it is safe to commit.
- **docker-compose passes only `N8N_ENCRYPTION_KEY` into the container**, not the whole `n8n/.env`. The webhook secret in that file is for the test script, so it never enters the container's environment.
- **n8n's port is bound to `127.0.0.1`.** Only this machine can reach the webhook and the editor.
- **The signature check reads the raw body back from the Webhook node.** The Crypto node drops the binary it hashed. Tested in n8n's default and filesystem binary modes.
- **An unknown `event` is refused with a 401 in the signature check, before the dedupe.** Refused there, the id is never marked handled, so Convex retries and finally logs it instead of getting a silent 200 on the retry.
- **Each send has a 10-second timeout.** A hung n8n becomes a normal failed try, so the retry and the final error log still happen.
- **The overdue workflow's mock send has Retry On Fail (3 tries, 5 s apart) and an error output that writes `failed`.** A short hiccup is retried inside the same run; a send that still fails is recorded, never silent, and the next run retries it. The write-back node retries too, since a lost write-back would leave no row.
- **A failed `/overdue-reminders/due` request fails the whole run.** The HTTP node is left to fail on a non-2xx, so a Convex outage or a bad secret shows in the `LendLoop error handler` workflow instead of looking like a quiet day with nothing due.
- **The mock send runs once for all items, with an `isFailingOnPurpose` switch.** Simplest shape: one throw is one outcome for the whole batch, retried as a unit. Known limit: one failing loan fails the batch, fine for a mock; a real sender should send per item. A throw yields a single error item that n8n pairs to the first loan only, so "Build failed result" reads every loan from the split node to write `failed` for each.
- **A write-back that fails for good (400 or 404) stops the rest of the batch after its retries**, and the error workflow shows the run. Loans not written back yet are retried by the next run.
- **The Convex base URL lives in one constant in the first Code node.** All HTTP nodes read it, so moving Convex means one edit.
- **Every HTTP node in the overdue workflow has a 10-second timeout.** A hung Convex fails the try instead of holding the run; with Retry On Fail it becomes a retry, and on `/due` it fails the run so the error workflow shows it.
- **The overdue workflow has a manual trigger next to the schedule.** `n8n execute` and the **Execute workflow** button both need one; the schedule handles the daily run.
- **The test script passes the secret to `openssl` as an argument.** Other local processes could see it in the process list; fine for a local test tool, never for production code. The README's `npx convex env set N8N_WEBHOOK_SECRET` step has the same local-only trade-off.
- **One overdue reminder per loan, not one per Borrower.** The brief says a reminder to each borrower; a Borrower with two overdue loans gets two messages. The write-back is per loan anyway, and grouping would need a second key for the idempotency check.
- **Loan activity shows only the latest row, on the Borrower's and Lender's own lists.** It rides on `listMyBorrowing` and `listMyLentOut`, which already scope to the caller, so no new access check is needed. A request notification shows only to the person it went to, worked out from the loan's current status; an overdue reminder shows to both. The label ("Reminder sent 2 days ago") is worked out on the server because only the server knows `APP_TIMEZONE`. Waiting requests show none: their only activity is the notification the Lender is already reading.

## Documentation

- **The README keeps the full setup and a short version of every security, data and reliability decision; `docs/decisions.md` keeps the reasons.** A reviewer gets the whole picture from one file without reading 160 lines of decisions, and each README bullet can be traced here.
- **The production note lists what changes, not how to build it.** Clerk webhook sync, rate limiting, cloud Convex, hosted n8n over HTTPS, a real email provider, CI and an audit log. Each is a known gap of the local demo, named so a reviewer sees it was a choice.

## Known limits

- **The board, My tools, the Loans page and the admin loan list may show a stale "out" or "overdue" across midnight.** Their queries work out today on the server, and Convex reruns a query only when its data changes. The loan activity line ("Reminder sent today") has the same limit. A page left open overnight catches up on the next write or reload; until then "Mark as returned" can stay hidden on a loan that started that day. Reminders are unaffected: n8n asks the server fresh each run. Fix if it matters: return raw dates and compare in the browser.
- **n8n marks a `notificationId` as handled before the log step runs.** If the log step crashed after that, a retry of the same id would be dropped as a duplicate. Fine for a mock logger; a real sender should dedupe after a successful send.

## Later, if it grows

- **Production n8n needs HTTPS and secret rotation.** HTTPS keeps the body and signature private in transit; rotation means accepting the old and new secret for a short switch-over.
- **Paginate the public tool list.** It reads every tool per visit, fine for tens of tools. The admin `listListings` and `listLenders` load every tool too.
- **Filter by category on the server, using the `by_category` index.** Goes together with pagination; for now the browser filters the full list.
- **Share the button focus-ring style.** Two buttons repeat the same Tailwind focus classes; pull them into one shared class when a third button needs them.
- **Index `removedAt`.** Today removed tools are read and dropped; an index skips them once many pile up.
- **Cap waiting requests per borrower per tool.** F4 already refuses a request that overlaps the borrower's own waiting or approved loan on that tool, so spam needs deliberate non-overlapping ranges. If it happens, refuse a fourth waiting request from the same borrower for the same tool (one count read inside the request mutation).
- **Tool photos with Convex file storage.** Left out because the brief's tool fields are name, category, condition and description, and uploads add type, size and ownership checks. When added: the owner uploads to a short-lived upload URL, the mutation checks ownership, type and size before saving the storage id, and the board reads URLs from `ctx.storage.getUrl`.
