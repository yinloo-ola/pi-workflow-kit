---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the brainstorm/plan read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).

## Process

1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
2. For each topic, infer the furthest artifact: only `*-design.md` → execute next; `*-implementation.md` (legacy) or `*-progress.md` → execute, show `done/total`.
3. **Group by umbrella** — for each umbrella `overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
4. Print a compact table, grouped under any umbrellas, e.g.:

   ```
   payments-revamp (umbrella): 2 in-flight · 1 not-started
     payments-core      execute  2/3 done
     payments-ui        design   —
     payments-webhooks  not started
   auth                execute  1/2 done
   ```

   If nothing, suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.