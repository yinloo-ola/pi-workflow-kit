---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the design read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).

## Process

0. **Verify the root** — run `pwd` and `git rev-parse --show-toplevel`; if they differ, report both paths and stop — tell the user to restart the session at the repo root; never `cd` (a worktree root counts).
1. **Discover** — run `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'`, excluding docs/plans/completed/ — for each suffix (Windows: `Get-ChildItem -Recurse docs/plans -Filter '<suffix>'`, minus any `completed` folder): `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, `overview.md` — recursive by construction (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived topics are not in flight) — this working tree only.
2. **State per topic/part — extract, never ingest.** For each progress file read only the header (`head -n 10` — the `Feature phase:` line sits in the first 10 lines of the executor's template); never the file body (execution summary, review reports, code digest), and never open design docs. Map the line to the displayed state:
   - `done` → **`done`** — terminal, never shown as in-flight; append the ✅ tally as `N/N` when wanted (`grep -c '✅' <file>` — a count, not content)
   - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
   - `e2e-written`, `feature-spec-paused` → `feature-spec`
   - `reviewing`, legacy `feature-complete-paused` → `review`
   - `ship-paused` → `ship-paused`
   - no progress file, only `*-design.md` → `design` — next: `/skill:pwk-executing-tasks`
   - roster-only (named in the overview, no artifacts) → `not started`
   - no parseable `Feature phase` line → `execute` (with tally if parseable); if the line is missing from the header, `grep -m1 '^Feature phase:' <file>` finds it without a full read.

   A legacy 1.x topic (`*-implementation.md` stem-matched) uses the same phase-line inference on its progress file.
3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, feature-spec, review, ship-paused), not-started parts. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
4. Print a compact table, grouped under any umbrellas, e.g.:

   ```text
   payments-revamp (umbrella): 1 done · 2 in-flight · 1 not-started
     payments-core      done      3/3
     payments-ui        execute   1/2
     payments-review    review    —
     payments-webhooks  not started
   auth                ship-paused   — ready for /skill:pwk-finalizing
   ```

   If nothing, suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.