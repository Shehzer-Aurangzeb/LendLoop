# Issue tracker: Local Markdown

Specs and tickets for this repo live as markdown files in `issues/` at the repo root.

## Conventions

- One feature per directory: `issues/<feature-slug>/`
- The spec (PRD) is `issues/<feature-slug>/prd.md`
- Tickets are one file per ticket at `issues/<feature-slug>/<NN>-<slug>.md`, numbered from `01` in dependency order (blockers first). Never put several tickets in one combined file.
- Triage state is recorded as a `Status:` line near the top of each file (see `triage-labels.md` for the role strings)
- Comments and conversation history are appended to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `issues/<feature-slug>/`, creating the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## When the feature ships

`issues/` is gitignored, so it never reaches a PR. Delete `issues/<feature-slug>/` locally once the feature ships, after moving any decision worth keeping into `docs/adr/`.
