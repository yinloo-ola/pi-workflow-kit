---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the brainstorm/plan read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).

## Process

1. Glob `docs/plans/*-overview.md`, `*-design.md`, `*-implementation.md`, `*-progress.md` — this working tree only.
2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
3. **Group by split** — for each `*-overview.md`, take its sub-design roster and roll up each by state: **shipped** if the overview row says so; else **in-flight** if it has an active `*-implementation.md`/`*-progress.md`; else **not-started** (in-flight is inferred from the artifacts — no phase writes it). Print one roll-up line (`<umbrella> (split): n shipped · n in-flight · n not-started`), then nest the not-shipped sub-designs under it with their phase. Shipped+archived docs live in `docs/plans/completed/`; shipped+deleted leave no active docs — both count as shipped only. Topics whose design doc has no `Part of:` print flat.
4. Print a compact table, grouped under any umbrellas, e.g.:

   ```
   payments-revamp (split): 1 shipped · 1 in-flight · 1 not-started
     payments-core      ✅ shipped
     payments-ui        execute  2/3 done
     payments-webhooks  plan     —
   auth                execute  1/2 done
   ```

   If nothing, suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.