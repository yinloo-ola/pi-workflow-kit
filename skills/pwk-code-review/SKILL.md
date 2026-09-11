---
name: pwk-code-review
description: "Review a completed requirement's code — trace the logic, check spec alignment against the acceptance criteria, fix code smells, and run a production hazard check. Runs as the feature-level review in pwk-executing-tasks (whole feature diff), or per-requirement when tagged. Unlocked: may edit code to apply smell fixes."
---

# Code Review

Review the code just implemented for a requirement. **Unlocked** — you may edit code to apply smell fixes; flag everything else as a follow-up.

## Process

1. **Identify the scope** — in the feature-gate flow (the default), you review the **whole feature diff** at the feature-level review (`git diff $FEATURE_BASE...HEAD` — the parent of the first Commit-column entry; see the executing skill's packet recipe); all acceptance criteria in the design doc and the `## Feature acceptance` E2E are in scope. When invoked per-requirement (`Review: inline`/`parallel` on a tagged requirement), scope is just that requirement — read its acceptance criteria from the design doc, run `git log --oneline -5` and `git diff` to see what changed for it.

2. **🔍 Code tracing** — trace the new/changed code paths end-to-end against the acceptance criteria and the feature E2E. For each path: does data flow correctly from entry to the asserted outcome? Note any branch the tests don't exercise, any dead branch, any path where the trace breaks.

3. **📐 Spec alignment** — for each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.

4. **🧹 Code smells — fix these directly:**
   - Shallow modules (interface nearly as complex as the implementation)
   - Duplication
   - Missing seams / premature abstraction
   - Poor naming, magic values, dead code
   Apply the fix, re-run the full suite (must stay green), and commit. If a smell needs a refactor large enough to risk the requirement, **flag** it instead of applying.

5. **⚠️ Production hazard check** — audit the changed code against the high-risk hazards. For each, write `[SAFE]` (1-line justification) or `[TRIGGERED]` (concrete mitigation):
   1. **Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), or full-table loads filtered in memory.
   2. **Missing indexes** — hot queries on unindexed columns (table scans under load).
   3. **Unbounded concurrency** — unthrottled fan-out (`Promise.all` without batch limits).
   4. **Long-running transactions** — holding DB connections/locks across slow external calls.
   5. **Query/command interpolation** — raw variables merged into SQL or shell (injection).
   6. **Unrestricted uploads / temp flooding** — uploads to local temp without limits or `finally` cleanup.
   7. **Silent swallowing loops** — background workers catching and suppressing exceptions without logging/back-off.
   Also check the design's `## Production-risk areas`, if any.

6. **Report** — summarize: tracing findings, spec gaps, smells fixed (with commits), hazards `[TRIGGERED]`. Non-trivial findings become follow-up items — the user decides whether to address now or defer.
7. **Mark done** — set the requirement's Done cell `✅` for the requirement under review (it was left `🔄` while under review; findings leave it `🔄`). Already-terminal rows of other requirements never regress. Done means reviewed, not just committed.

## Principles

- **Tracing and spec alignment are the core** — they catch what tests miss: untested branches, missing criteria, scope creep.
- **Fix smells in place; flag everything else.** Keep the review scoped — the goal is polish on the requirement that just landed, not a redesign pass.
- **Be proportional** — a one-function change doesn't need the depth of a batch pipeline. When this skill runs as the inline path because the plan tagged the requirement `Review: inline`, that was a deliberate call at plan time — keep the review focused and don't second-guess the tag.

## After the review

Return to `/skill:pwk-executing-tasks` — the next requirement, or the ship checkpoint when every requirement is done. Finalizing is proposed from the ship checkpoint, never from here. (The human tagged this requirement at design approval when its `### Review` tag was set — keep the review focused on the tag's scope.)