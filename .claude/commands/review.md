---
description: Review the current branch diff against the project review checklist before committing or opening a PR.
argument-hint: "[base branch — optional, defaults to main]"
---

Pre-review this work the way a Fluence reviewer would, BEFORE we commit or open a PR,
so we catch issues first.

1. Find the base and diff:
   - Base is `main` unless `$ARGUMENTS` names another branch.
   - Committed work: `git diff $(git merge-base HEAD <base>)...HEAD`.
   - Uncommitted work (or no commits yet): `git diff HEAD` plus every untracked file in
     `git status --short`.
2. Launch the `pr-reviewer` subagent (fresh context) and give it: the diff, and
   tell it to read `docs/REVIEW_CHECKLIST.md` and `CLAUDE.md` as the rules.
3. Relay its findings grouped by severity (HIGH → LOW), each as
   `path:line — [category] — problem — suggested fix`.
4. Do NOT auto-fix. For each finding wait for my go-ahead, then fix.
5. If nothing material: say "clean" and stop.

When a finding shows a pattern the checklist missed, propose a new rule for
`docs/REVIEW_CHECKLIST.md` (rule plus one-line why). Add it only after I confirm.
