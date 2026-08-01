---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the brainstorm/plan read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).

## Process

1. Glob `docs/plans/*-overview.md`, `*-design.md`, `*-implementation.md`, `*-progress.md` — this working tree only.
2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
3. **Group by umbrella** — for each `*-overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its docs — overview included — are disposed, so it no longer appears here. Topics not part of an overview print flat.
4. Print a compact table, grouped under any umbrellas, e.g.:

   ```
   payments-revamp (umbrella): 2 in-flight · 1 not-started
     payments-core      execute  2/3 done
     payments-ui        plan     —
     payments-webhooks  not started
   auth                execute  1/2 done
   ```

   If nothing, suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.