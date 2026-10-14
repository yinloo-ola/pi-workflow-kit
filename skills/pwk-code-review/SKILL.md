---
name: pwk-code-review
description: "Review a completed requirement's code — trace the logic, check spec alignment against the acceptance criteria, fix code smells, and run a production hazard check. Runs as the feature-level review in pwk-executing-tasks (whole feature diff), or per-requirement when tagged. Unlocked: may edit code to apply smell fixes."
---

# Code Review

Review the code just implemented — one tagged requirement, or the whole feature at the feature-level review. **Unlocked** — you may edit code to apply smell fixes; flag everything else as a follow-up.

Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

## Process

1. **Identify the scope** — in the feature-gate flow (the default) you review the **whole feature diff** at the feature-level review (`git diff $FEATURE_BASE...HEAD`, `$FEATURE_BASE` being the parent of the first Commit-column entry; see the executing skill's packet recipe), with every design-doc acceptance criterion and the `## Feature acceptance` E2E in scope. Invoked per-requirement (`Review: inline` on a tagged requirement, or inline-completing a missing delegated role when the tag is `parallel`), the scope is that requirement alone — read its acceptance criteria from the design doc and use `git log --oneline -5` plus `git diff` to see what changed. Invoked standalone — no invoking skill, no design doc, no packet — review the span the user names (the working-tree diff, or the branch's commits against its parent): tracing, smell fixes, and the hazard check run as usual, while spec alignment has no criteria to key on — say so and judge the diff against its stated intent rather than manufacturing a coverage table. When the invoking skill already assembled a packet (the feature packet, or the requirement-scoped `<leaf>-review-packet-r<N>.md`), work from the packet — it is the scope of record; re-derive nothing it states.

2. **🔍 Code tracing** — trace the new or changed code paths end-to-end against the acceptance criteria and the feature E2E (a trivial design doc has no feature E2E — its acceptance criteria alone are the spec). For each path, determine whether data flows correctly from entry to the asserted outcome. Note any branch the tests do not exercise, any dead branch, or any path where the trace breaks.

3. **📐 Spec alignment** — for each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.

   **Open the report with a coverage table** — one row per requirement in scope, keyed by the design doc's `### R<n>:` headings (R# = n; the whole design doc at the feature-level review, just the tagged requirement when invoked per-requirement):

   | R# | Verdict | Evidence |
   |----|---------|----------|
   | 1 | <verdict> | file:line (code), file:line (test) |

   Verdict per requirement: `covered | gap | scope-creep` — `covered` = every criterion has covering code and a test; `gap` = a criterion lacks code or a test; `scope-creep` = the code does more than the criteria specify; findings elaborate on every non-`covered` row, and an all-`covered` table needs no elaboration.

4. **🧹 Code smells — fix these directly:** review the changed code and affected files against the requirement and feature scope, then fix what you find.
   - Shallow modules (interface nearly as complex as implementation)
   - Duplication
   - Missing seams or premature abstraction
   - Poor naming, magic values, dead code
   Apply the fix, re-run the full suite (must stay green), and commit. Only a smell that requires a refactor large enough to risk the requirement is **flagged** instead of applied.

5. **⚠️ Production hazard check** — audit the changed code against the high-risk hazards. For each, write `[SAFE]` (1-line justification) or `[TRIGGERED]` (concrete mitigation):
   1. **Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), full-table loads filtered in memory
   2. **Missing indexes** — hot queries on unindexed columns (table scans under load)
   3. **Unbounded concurrency** — unthrottled fan-out (`Promise.all` without batch limits)
   4. **Long-running transactions** — holding DB connections/locks across slow external calls
   5. **Query/command interpolation** — raw variables merged into SQL or shell (injection)
   6. **Unrestricted uploads / temp flooding** — uploads to local temp without limits or `finally` cleanup
   7. **Silent swallowing loops** — background workers catching/suppressing exceptions without logging/back-off
   Also check the design's `## Production-risk areas`, if any.

6. **Report** — summarize: tracing findings, spec gaps, smells fixed (with commits), hazards `[TRIGGERED]`. Non-trivial findings become follow-up items — the user decides whether to address now or defer.
7. **Mark done** — the review never edits the progress file. A clean pass hands back so the executing loop can set the requirement's Done cell `✅` (the row was left `🔄` while under review) and write its execution-summary row; findings leave the row `🔄` for another pass. (At the feature-level review every row is already terminal — verify none regressed and move on.) Already-terminal rows of other requirements never regress. Done means reviewed, not just committed.

## Principles

- **Tracing and spec alignment are the core** — they catch what tests miss: untested branches, missing criteria, scope creep.
- **Fix smells in place; flag everything else.** Keep the review scoped — the goal is polish on the requirement that just landed, not a redesign pass.
- **Be proportional** — a one-function change doesn't need the depth of a batch pipeline; a `Review: inline` tag was a deliberate call at design approval — keep the review focused and don't second-guess it.

## After the review

Return to `/skill:pwk-executing-tasks` — the next requirement, or the ship checkpoint when every requirement is done. Finalizing is proposed from the ship checkpoint, never from here.