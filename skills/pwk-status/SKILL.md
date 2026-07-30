---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on all in-flight pipelines (split designs may run in parallel across worktrees). Read-only.

## Process

1. Glob `docs/plans/*-design.md`, `*-implementation.md`, `*-progress.md`.
2. For each `<topic>`, infer the furthest artifact present:
   - only `*-design.md` → brainstorm done, plan next
   - `*-implementation.md` but no progress → plan done, execute next
   - `*-progress.md` → execute phase — show `done/total` requirement count
3. Print a one-line table, e.g.:

   ```
   | Topic   | Phase   | Progress | Branch           |
   |---------|---------|----------|------------------|
   | auth    | execute | 2/3 done | auth             |
   | billing | plan    | —        | ../repo-billing  |
   ```

4. If none, say so and suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.