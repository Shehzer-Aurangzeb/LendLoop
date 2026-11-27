# Review checklist

Rules the `pr-reviewer` agent checks every diff against. Concise rule plus a one-line why. Grow it when a review or a bug teaches something new.

## Authorization (Convex)

- **Every public query, mutation and action declares `args` validators.** Why: every exported Convex function is a public endpoint anyone can call with any input.
- **Every public function that is not the signed-out tool list gets the caller through `convex/lib/auth.ts`.** Why: one place to check identity means no function forgets.
- **Ownership or role is checked on the server, against the stored record, not a value from `args`.** Why: a client can send any `ownerId` or `role`.
- **Admin-only functions call `requireAdmin`.** Why: hiding the admin page is not security.
- **Functions only the scheduler or HTTP handlers call are `internalQuery`, `internalMutation` or `internalAction`.** Why: the browser cannot call internal functions at all.

## Data minimisation

- **The signed-out tool list returns name and category only.** Why: no owner details to strangers.
- **Queries return only the fields the screen needs; no whole user documents.** Why: what the client gets, anyone can read in devtools.
- **n8n payloads carry only the fields the message needs.** Why: less data in a third-party system means less to leak.

## Integration (Convex and n8n)

- **Mutations never `fetch`; they schedule an action with `ctx.scheduler.runAfter`.** Why: the call happens only if the write commits, and mutations must stay deterministic.
- **HMAC is computed on the raw body and compared in constant time; a missing or bad signature returns 401 before any work.** Why: re-serialised JSON changes the bytes, and a plain `===` leaks timing.
- **Signed requests carry a timestamp, and old ones are rejected.** Why: stops replay of a captured request.
- **Write-backs are idempotent on `loanId + date`.** Why: n8n retries must never create a second reminder record.
- **A duplicate check matches the full idempotency key, including the activity kind.** Why: a partly matched key lets one kind of row block another.
- **No secret appears in code, in `.env.example` values, or in exported workflow JSON.** Why: the repo is public.

## Loans

- **Date ranges are validated on the server: end after start, start not in the past, no overlap with an approved loan for the same tool.** Why: the date picker is not the only client.
- **Status changes follow the allowed transitions only** (requested to approved or declined; approved to returned). Why: stops returning a declined loan or approving twice.
- **A user cannot request their own tool.** Why: obvious rule, easy to forget on the server.

## Code

- **Follow `CLAUDE.md`: My coding style, Frontend work, Comments.**
- **No new dependency without a one-line reason.**
- **A new required Convex env var goes into `.env.example` and the README setup steps in the same PR.** Why: otherwise a fresh clone fails on a variable nobody mentioned.
