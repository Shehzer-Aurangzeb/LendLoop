# Bug Log Format

The bug log is `~/learning/lendloop/bug-log.md`, outside the repo. It is the user's record of real bugs and how they were solved, kept so they can tell each story later. Agents **append** to it and never read it back: add the entry with a shell append (`>>`), not by opening the file.

Write an entry for every real bug fixed: wrong behaviour a user or test could see. Typos, lint and formatting fixes are not bugs.

## Template

```md
## {YYYY-MM-DD}: {short title of the symptom}

- **Symptom:** what the user saw, in their words.
- **Root cause:** the actual reason, one or two sentences.
- **How we found it:** the debugging path: the loop we built, the hypotheses, the one that was right.
- **Fix:** what changed, and why there and not elsewhere.
- **Guard:** the test that now fails if it comes back, or why there is none.
- **Lesson:** what to watch for next time.
```

Write it in plain English, pitched at a frontend-focused full-stack developer. Keep each line short; the story should be retellable from memory.
