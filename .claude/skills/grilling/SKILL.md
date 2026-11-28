---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and tag it **[Product]** or **[Design]** (see _Two kinds of question_). Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body>

🤔 How would you do it?
```

A [Product] question carries your recommended answer; a [Design] question carries only the prompt for the user's answer.

For a [Product] question, word it so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

## Two kinds of question

The user is a frontend-focused full-stack developer: strong on React, Next.js and TypeScript, has used NestJS, Prisma and Postgres, and is new to Convex and n8n. They must be able to explain this build without the code. Pitch every question and explanation from what they know up to what they don't, in plain words.

- **[Product]**: what the feature does: behaviour, copy, layout, rules neighbours care about. Give your recommended answer; the user accepts or changes it.
- **[Design]**: how the system does it: where the logic lives, the data model, what runs on the server versus the browser, concurrency, failure and recovery, performance, security, trade-offs and what we reject. **Ask the user's own answer first, with no recommendation shown.** Then confirm or correct it: say what was right, what was missing, and why, with a concrete LendLoop example ("two neighbours request the same drill for overlapping dates at the same moment").

Every correction on a [Design] question becomes a **learning record**: write it straight away, in the format of the `walkthrough` skill's `LEARNING-RECORD-FORMAT.md`. This is for the user, not for agents: write the record and never read the learning folder back.

If a question can't be settled by talking (layout, feel, flow), say so and suggest a throwaway prototype instead of rephrasing it.

## Ending the session

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

Close with a short summary in three parts:

1. **Decided**: the product and design decisions that were settled.
2. **Assumed**: anything we are building on without proof (a load we expect, a rule we guessed), each with how we would find out.
3. **Learned**: the learning records written this session, one line each.
