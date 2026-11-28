---
name: walkthrough
description: After a feature is built and reviewed, explain how it actually works and quiz the user until they can explain it without the code. Writes the feature doc and the user's learning records.
disable-model-invocation: true
---

The feature is built and reviewed. The goal now is that the user **understands what was built**: the flow, the system design and the decisions. The code matters less than their picture of it.

The user is a frontend-focused full-stack developer: strong on React, Next.js and TypeScript, has used NestJS, Prisma and Postgres, and is new to Convex and n8n. They must be able to explain this build without the code. Pitch everything from what they know up to what they don't, in plain words.

## 1. Gather what was built

Read the spec (`issues/<feature-slug>/prd.md`), the diff against `main` (`git diff origin/main...HEAD`), and any ADR in `docs/adr/` it touches. Note where the code drifted from the plan: drift is where surprises hide.

## 2. Write the feature doc

Create or update the feature's doc in `docs/`, This doc is for agents and humans alike: it is the truth about the code. It covers:

- **What it does**: one paragraph.
- **How it flows**: screen, then Convex function, then database, then n8n when involved, and back. Name the real files and functions.
- **Decisions**: each one with why, and what we rejected.
- **Changed from the plan**: what drifted, and why.
- **Known gaps**: also added to the production note in `README.md`.

Add a row for a new doc to the docs table in `CLAUDE.md`.

## 3. Quiz the user

Ask in rounds, one round at a time, and wait for the answers.

1. **Explain it back.** "Walk me through what happens when a borrower clicks X." The user answers first.
2. **What happens if.** Five to eight questions on the design: concurrency ("two neighbours request the same drill for the same dates at once"), failure ("n8n is down when the request is created"), retries ("n8n sends the write-back twice"), data ("the borrower deletes their account mid-loan"), security ("a signed-in user calls `approveLoan` on someone else's tool from devtools").

For each answer: say what was right, then what was missing or wrong and why, with a LendLoop example. Never show your answer before the user's.

A question the user cannot answer is a finding. Either the doc gets clearer, or the answer exposes a real hole in the feature: then say so plainly, and add it to the doc's known gaps or raise a ticket.

## 4. Record what was learned

For every correction or real gap, write a learning record in the format of [LEARNING-RECORD-FORMAT.md](LEARNING-RECORD-FORMAT.md). Write it as it happens, not at the end.

## Done when

The user has explained the flow and answered every question correctly (after correction), the feature doc matches the code, and every correction has a learning record. Then the feature is ready to merge.
