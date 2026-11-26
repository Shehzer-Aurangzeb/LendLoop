---
name: new-feature
description: Entry point for building a feature, fixing a bug, or making a change with the AI workflow. Triages the request, then does it directly, runs the bug loop, or starts the feature phases.
disable-model-invocation: true
---

1. Read `AI_WORKFLOW.md` at the repo root. It is the source of truth for this workflow.

2. Triage the request with its **Triage first** section. If the request is too vague to triage, ask one question to settle it, then triage.

3. **Trivial:** say in one line that it is trivial and why. Make the change, run the checks in `AI_WORKFLOW.md`, and report.

4. **Bug:** call the Skill tool with `diagnosing-bugs`.

5. **Feature:**
   - List the phases in one short line: Alignment, Spec, Tickets, Build, Review, Walkthrough, Retro.
   - Call the Skill tool with `grill-with-docs`.
   - Ask the first round of questions in this same turn.
   - When a phase ends, say which phase comes next and what command starts it. Start the next phase only when the user confirms.
