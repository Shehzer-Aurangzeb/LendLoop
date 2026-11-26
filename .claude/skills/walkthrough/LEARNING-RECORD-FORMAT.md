# Learning Record Format

Learning records live outside the repo in `~/learning/lendloop/learnings/`, numbered `0001-slug.md`, `0002-slug.md`, and so on. They belong to the user, not to agents: write them, never read them back. To pick the next number, list the file names only (`ls`), then add one.

## When to write one

- A misconception was corrected: the user believed something wrong about how the system works and now sees why. These are the most valuable.
- The user filled a real gap: a design idea they had not met before (a race condition, an index, idempotency) and can now use.

Coverage is not learning. Something merely explained, with no wrong answer or gap behind it, gets no record.

## Template

```md
# {Short title of what was learned}

Feature: {feature name} · {YYYY-MM-DD}

- **What I thought:** the user's answer, in their words.
- **What is true:** the correct picture, in plain English.
- **Why it matters:** a concrete LendLoop example of what breaks if you get it wrong.
```

## Supersession

When a later record corrects an earlier one, add `Status: superseded by NNNN` to the old record instead of deleting it.
