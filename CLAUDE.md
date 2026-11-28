# CLAUDE.md — LendLoop

Context for AI assistants working on this codebase.

**Read `BRIEF.md` first** (gitignored, local only). It holds the full assignment
and every decision settled before the build started.

---

## How to answer me

Read this section first. It applies to every reply.

- **Who I am.** A frontend-focused full-stack developer. Strong on React, Next.js and TypeScript; backend experience with NestJS, Express, PostgreSQL and Prisma. **New to Convex and n8n, a little Clerk.** Pitch explanations from there.
- **I must be able to explain every file.** Building it is not enough; I have to understand why it is built that way.
- **Use simple English.** Plain words beat jargon.
- **Answer in short bullets, like checkpoints.** One idea per bullet. No long paragraphs.
- **Name an unavoidable term once with a plain note**, e.g. "`httpAction` (a Convex function with a public URL)".
- **Compare new things to what I know.** Convex mutation ≈ NestJS service method in a transaction; `ctx.scheduler` ≈ a BullMQ job.
- **Stay high level by default.** I will ask for detail.
- **Say the "so what"** for each point.
- **Be honest.** Broken is broken. Unsure is unsure.
- **One recommendation, not a menu.** Pick first, alternative in one line.
- **After each step, tell me what a reviewer might ask about it**, and add the decision to `docs/decisions.md`.

---

## How we build — a hard rule

**Build in small phases. Stop after every phase and wait for my answer.**

Do not batch phases because they are small, related, or "already planned".

After each phase, stop and tell me:

- what changed, and every file you touched
- anything you did that was not in the plan, and why
- what you are about to do next

Then wait. No further edits until I reply.

**Say up front when a phase needs a file I did not expect.** Ask before writing it.

Why: in one long run you get most of it right and quietly get small things wrong, and the tests pass anyway because they were written against the same wrong idea. Stopping catches that.

Naming is part of this. A function name should say what it does without reading it. When two functions differ subtly, make their names differ obviously.

---

## Check the docs, not memory

Clerk, Convex, Next.js and n8n change quickly. Before writing code with one of them, check its current docs and use the latest stable version. Say which doc page you followed.

---

## AI workflow

New features, bug fixes and changes go through [`AI_WORKFLOW.md`](AI_WORKFLOW.md),
started with `/new-feature`. It runs alongside the hard rule above.

- Specs and tickets: `issues/<feature-slug>/`, gitignored. See `docs/agents/issue-tracker.md`.
- Domain terms and decisions: `GLOSSARY.md` and `docs/adr/`, created when first needed. See `docs/agents/domain.md`.
- Pre-PR review: `/review` runs the `pr-reviewer` agent against `docs/REVIEW_CHECKLIST.md`.
- **Every real bug fix adds an entry to `~/learning/lendloop/bug-log.md`**, in the format of `.claude/skills/diagnosing-bugs/BUG-LOG-FORMAT.md`. Append only.
- `~/learning/lendloop/` is my personal learning folder. Write to it when a skill says so; never read it for context.

---

## Commits and pull requests

- **Never commit or push without my explicit go-ahead.** The repo goes on my personal GitHub.
- **Commit message:** conventional commits (`feat:`, `fix:`, `chore:` …). No `Co-Authored-By` line.
- **Commit body:** short simple-English bullets, what changed and why.
- **No double hyphens (`--`)** in commit messages. Command flags inside code blocks are fine.

---

## Secrets — a hard rule

- Real secrets live only in `.env.local`, the Convex dashboard env vars, and n8n credentials.
- `n8n/.env` is gitignored and holds the local n8n encryption key and the test script's webhook secret.
- `.env.example` lists every variable name with no value.
- Exported n8n workflow JSON must contain no secret. Check before saving it to the repo.
- `BRIEF.md` and `issues/` are gitignored. Never stage them.

---

## My coding style

- Keep it simple. Do not build for a future that has not arrived. Reviewers grade clarity.
- Smallest change that works. Do not refactor things I did not ask about.
- Reuse what already exists in the repo before writing anything new.
- Prefer the framework's built-in way over a new library.
- No new dependencies unless there is no reasonable alternative. Say why.
- Fix the root cause, not the one screen that showed the bug.
- Do not leave half-finished work. If part is blocked, finish the rest and say exactly what is left.

### Frontend work

- **A component file stops at about 200 lines.** Split where the seams are; going over is fine when splitting would be worse, say why in one line.
- **Split on meaning, not line count.**
- **Pull a piece out the moment it is used twice.**
- **Keep data fetching, state and markup apart.**
- **Name the thing after what it is**, not where it sits.
- **Props are an API.** Few, named for meaning, no booleans that secretly select a layout.
- **Accessibility is not a later pass.** Real labels, real buttons, focus states, keyboard reachable.
- **Delete the thing you replaced.**

### Comments

- Default is no comment. Comment the **why**, never the what.
- One line, two if the reason needs it.
- A comment earns its place for a workaround, a non-obvious rule, a deliberate shortcut, or a value that looks wrong but is not.
- No JSDoc blocks, no section banners, no comments that restate the code.

### Code conventions

Taken from my past projects. ESLint enforces the ones marked (lint).

- Arrow functions everywhere (lint). Next.js pages and layouts keep `export default function`.
- Blank line before `return` and after a run of declarations (lint).
- No `../` imports; use `@/` (lint). Same-folder `./x` is fine.
- `import type` for type-only imports. Order: react, packages, then `@/` paths.
- Components: default export. Hooks and helpers: named `export const`.
- Booleans start with `is`, `has` or `can`. String unions, not enums. No `any`.
- Props destructured in the signature. Early returns over nested `if`.
- No barrel (`index.ts`) files.
- Data fetching lives in hooks (`useQuery`/`useMutation` from Convex), not in markup components.
- Loading shows a skeleton; errors show a short user message, never a raw error.

---

## What this app is

**LendLoop** is a neighbourhood tool-lending board. Neighbours list tools, request to borrow them for a date range, and the lender approves, declines and marks returns. n8n sends request notifications and daily overdue reminders. Admins remove listings, see all loans and mark Trusted Lenders.

## Stack and where it runs

| Piece   | Job                                         | Runs                         |
| ------- | ------------------------------------------- | ---------------------------- |
| Next.js | Screens (App Router)                        | Browser + local dev server   |
| Clerk   | Identity: sign-in, sessions, JWT            | Clerk's cloud                |
| Convex  | Database, backend functions, live sync      | Convex deployment            |
| n8n     | Notification and reminder workflows         | Docker, `localhost:5678`     |

## Security rules (non-negotiable)

- **Authorization lives in Convex functions.** Hiding a button or a route in Next.js is not security.
- **Every public Convex function** validates its `args`, checks the caller with `ctx.auth.getUserIdentity()` through the helpers in `convex/lib/auth.ts`, and checks ownership or role.
- Functions only the scheduler or n8n-facing code call are `internal*`.
- **Public data is minimal.** The signed-out tool list returns name and category only. n8n payloads carry only the fields the message needs.
- **Signed both ways.** Convex signs requests to n8n; n8n signs requests to Convex HTTP endpoints. Verify HMAC on the raw body, with a constant-time compare.
- **Write-backs are idempotent**, keyed on `loanId + date`.
- Mutations never call n8n directly; they schedule an action, so n8n is called only if the write commits.

## Project layout

List only folders that exist; add one here when it is created.

```
app/          Next.js routes (App Router)
components/   Shared React components
convex/       Schema and backend functions; tests sit next to them as *.test.ts
n8n/          docker-compose, exported workflow JSON and a signed test script
proxy.ts      Clerk middleware (Next.js 16 name for middleware.ts)
```

## Commands

pnpm only. Convex runs as a local deployment (no account); its data lives in `.convex/`.

- `pnpm dev`: Convex and Next.js together (localhost:3000, Convex on 3210)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: Vitest with `convex-test`, run once. `pnpm test:watch` to watch.
- `npx convex env set NAME value`: Convex env vars, never in `.env.local`

## Docs folder

| File                       | What it holds                                                              |
| -------------------------- | -------------------------------------------------------------------------- |
| `decisions.md`             | **Running list of decisions and reasons. Becomes the README's design notes.** |
| `REVIEW_CHECKLIST.md`      | **Rules the `pr-reviewer` agent checks every diff against.**               |
| `request-notifications.md` | **How F6 request notifications flow from a loan change to n8n.**           |
| `adr/`                     | **Hard-to-reverse decisions, one file each, created when needed.**         |
| `agents/`                  | **How the AI workflow skills find the issue tracker and domain docs.**     |
