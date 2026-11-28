# AI feature workflow

How we build features, fix bugs and make changes with an AI agent in this repo.
Entry point: `/new-feature`. The goal is twofold: ship features that are
reliable and tested, and make sure the developer understands what was built
(the flow, the system design, the decisions), not just that it works.

`CLAUDE.md` still applies throughout, including **How we build**: stop after
every phase and wait for an answer.

## Triage first

1. **Trivial**: copy, a one-line fix, a style tweak, a typo. Make the change
   directly, run the checks, report.
2. **Bug**: run `/diagnosing-bugs`. It ends with a regression test and an entry
   in the bug log.
3. **Feature**: anything with logic across files, a new table, Convex function,
   HTTP endpoint or n8n workflow, or a change in how something works. Follow
   the phases below; never skip 1, 2 or 6.

A change that looks trivial but touches `convex/lib/auth.ts`, a permission
check, HMAC signing or verification, or an n8n workflow is a **Feature**.

## Feature phases

1. **Alignment**: `/grill-with-docs`. One round of questions at a time.
   Product questions come with a recommended answer. Design questions (where
   the logic lives, data, failure, retries, security) ask for the developer's
   own answer first, then correct it. Terms go into `GLOSSARY.md`,
   hard-to-reverse decisions into `docs/adr/`.
2. **Spec**: `/to-spec`. Writes `issues/<feature-slug>/prd.md`: user stories,
   decisions, test seams, acceptance criteria, out of scope, assumptions.
3. **Tickets**: `/to-tickets`. One file per ticket in `issues/<feature-slug>/`.
   Each ticket is a vertical slice (schema, Convex function, UI, tests) with
   its blockers named.
4. **Build**: `/implement`, the only way tickets are built. One ticket at a
   time: a fresh subagent builds it test first, two fresh subagents review it
   (Standards and Spec), the builder fixes the findings, then the agent reports
   with a commit message and stops. Commit only when told.
5. **Review**: `/code-review` on the whole branch against `main`, once every
   ticket is in. Then `/review` for a fresh-eyes pass against
   `docs/REVIEW_CHECKLIST.md`.
6. **Walkthrough**: `/walkthrough`. The agent writes the feature doc in
   `docs/`, then quizzes the developer on how it works. The feature is ready
   when the developer can explain it without the code.
7. **Retro**: `/retro`. Improve `CLAUDE.md`, the skills or the checks so the
   next feature goes better. Add the feature's decisions to
   `docs/decisions.md`. Then delete `issues/<feature-slug>/`.

## Checks

Per ticket, only what the ticket touches; the full suite once per feature. The
exact rules are in the `implement` skill under _Checks per ticket_. Read the
`Tests:` line: a suite that died in setup proved nothing.

## Where things live

| What                       | Where                                 | Read by agents?  |
| -------------------------- | ------------------------------------- | ---------------- |
| Assignment and context     | `BRIEF.md` (gitignored)               | Yes              |
| Spec and tickets           | `issues/<feature-slug>/` (gitignored) | Yes, while built |
| Decisions and reasons      | `docs/decisions.md`                   | Yes              |
| Review rules               | `docs/REVIEW_CHECKLIST.md`            | Yes              |
| Domain terms               | `GLOSSARY.md` (created when needed)   | Yes              |
| Hard-to-reverse decisions  | `docs/adr/` (created when needed)     | Yes              |
| How a feature works        | `docs/<feature>.md`                   | Yes              |
| What the developer learned | `~/learning/lendloop/learnings/`      | No, write only   |
| Bugs fixed, as stories     | `~/learning/lendloop/bug-log.md`      | No, append only  |

`/wait-what` at any point: the last explanation did not land, say it again more
simply.
