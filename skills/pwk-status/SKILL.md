---
name: pwk-status
description: "Show all active pipeline topics and their phase/progress. Use when the user asks 'where are we', 'status', 'what's in flight', or when resuming and unsure which design to continue. Read-only discovery. Not a pipeline phase."
---

# Status

Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the design read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).

## Process

0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).
1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, and `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` (with `## Setup` in the design doc) renders the topic as **`awaiting setup`** — the setup checkpoint was never approved — ahead of any phase-derived state below. Map the line to the displayed state:
   - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when a scoped table-row count finds any — `grep -c '^| [0-9].*❌'` / `grep -c '^| [0-9].*⏭'` (one bounded read each; table rows only, so digest or summary mentions of the glyphs do not inflate the count) — render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
   - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
   - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state; N comes from the Requirements-table row count — `grep -c '^| [0-9]' <file>` — so no tally renders without a defined source)
   - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
   - `reviewing`, legacy `feature-complete-paused` → `review`
   - `ship-paused` → `ship-paused` — next: `/skill:pwk-executing-tasks` (approve the ship checkpoint). Never hint finalizing: only `done` routes there.
   - no progress file, only `*-design.md` → `design` — next: `/skill:pwk-executing-tasks`
   - roster-only (named in the overview, no artifacts) → `not started`
   - no parseable `Feature phase` line → `execute` (with tally if parseable).

   A legacy 1.x topic (`*-implementation.md` stem-matched) uses the same phase-line inference on its progress file.
3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, review, ship-paused, awaiting setup), not-started parts. A part sitting at the feature-E2E notice (`e2e-written`) rolls up as execute — the notice is a routing moment, not a bucket of its own. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
4. Print a compact table, grouped under any umbrellas, e.g.:

   ```text
   payments-revamp (umbrella): 1 done · 2 in-flight · 1 not-started
     payments-core      done      3/3
     payments-ui        execute   1/2
     payments-review    review    —
     payments-webhooks  not started
   auth                ship-paused   — ready for /skill:pwk-executing-tasks
   ```

   If nothing, suggest `/skill:pwk-brainstorming`.

Keep it short — this is orientation, not analysis. No writes; the `<topic>` slug is the identity.