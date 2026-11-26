---
name: implement
description: 'Implement a piece of work based on a spec or set of tickets.'
disable-model-invocation: true
---

Build the tickets the user names, **one ticket at a time**. The main conversation is the coordinator: it writes briefs, runs the review, reports and commits. Subagents do the building.

If the user passes a ticket reference, read it from `issues/<feature-slug>/` and state its title before starting. If the reference is ambiguous, ask.

## Per ticket

### 1. Build, in a fresh subagent

Start a fresh general-purpose subagent with a brief that stands on its own. It carries:

- The ticket path, `issues/<feature-slug>/prd.md`, and the instruction to read `CLAUDE.md` first.
- What earlier tickets of this feature already built (commit hashes, the functions and files to reuse), from `git log` and their reports.
- Scope: the files and areas this ticket touches. A schema change, a migration, a new dependency or a file outside that scope means stop and report it as an open question.
- Test first, with the `tdd` skill at the seams the spec names.
- The checks, scoped to the ticket (see _Checks per ticket_ below). Read each `Tests:` line; a suite that died in setup proved nothing.
- Break it on purpose **once**: break the ticket's key rule, see a named test go red, put it back, see green. Use the fastest test that covers the rule; a unit test beats a browser run.
- Do not commit or change git state.
- The report it returns: what changed, every file touched, anything outside the ticket and why, the exact `Tests:` lines, the break-on-purpose result.

Done when the builder reports every check green, or reports a blocker.

### 2. Review, in fresh subagents

Run the `code-review` skill on the **uncommitted** ticket changes, with the ticket as the spec. It starts two fresh subagents, Standards and Spec, that did not write the code.

Done when both reports are back.

### 3. Fix, in the builder

Send both reports to the **same builder subagent** (`SendMessage` to its id), so it fixes with its context intact. It:

- fixes every documented-standard breach and every spec gap or wrong behaviour;
- fixes a judgement-call smell when it agrees, and otherwise says why not;
- re-runs only the tests covering what the fixes touched, plus typecheck and lint;
- returns what it fixed, what it declined and why, and the new `Tests:` lines.

Done when every finding is fixed or declined with a reason, and the checks are green. A bug the review caught gets a bug-log entry, written by the coordinator.

### 4. Report and stop

Report to the user, in short plain bullets:

- what now works
- every file touched
- anything outside the ticket, and why
- the `Tests:` lines and the break-on-purpose result
- review: findings fixed, findings declined and why
- a ready commit message: conventional commits, a body of short simple-English bullets, no `Co-Authored-By` line, no double hyphens

Then stop and wait (`CLAUDE.md`, _How we build_).

## Commit and next ticket

When the user says to commit (for example "commit 03, start 04"): commit with the drafted message, set the ticket's `**Status:**` to `done`, then start the next ticket at step 1. Commit only when told.

## Checks per ticket

Full suite runs once per feature, not per ticket. The exact commands are in the **Commands** section of `CLAUDE.md`.

- **Always:** format check, lint, typecheck, and the tests the ticket adds or touches.
- **Convex functions:** when `git diff --name-only` touches `convex/`, run the Convex tests and confirm `npx convex dev` pushes the functions without errors.
- **n8n workflows:** when a ticket changes a workflow, run it once from the n8n UI, read the execution log, and confirm the exported JSON in `n8n/workflows/` has no secret in it.
- **Do not test pure layout** (columns, spacing). Test behaviour: a rule refused, a status changed, a record written once. Layout is checked by eye.
- **Keep output short:** read the summary, not the whole log.

## Before the pull request

Once per feature, after the last ticket: the full test suite, lint, typecheck and a production build. Fix anything red before opening the PR.
