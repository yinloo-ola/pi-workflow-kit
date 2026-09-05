# Progress: human-review-digests

Plan: docs/plans/2026-09-05-human-review-digests-implementation.md
Branch: human-review-digests
Started: 2026-09-05T09:34:37Z
Last updated: 2026-09-05T11:45:00Z
Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Design digest (`## At a glance`) | — | ffdc4a0 |
| 2 | ✅ | Plan crosswalk + one-line confirmation | — | 2156419 |
| 3 | ✅ | Execution summary + merged ship gate | — | 7e5a2c6 |
| 4 | ✅ | Spec-reviewer coverage table | — | 1d3c424 |
| 5 | ✅ | Umbrella folders | — | 2f1d6d2 |
| 6 | ✅ | Finalize done-gate + docs consistency sweep | — | 2b23216 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Design digest | Brainstorming skill step 7 now mandates an at-a-glance digest (plain 2–4 sentence summary + R# one-line table) immediately before Requirements; trivial docs get an `In short:` line; four user docs mirror it; skill-lint pins the markers. | no |
| 2 | Plan crosswalk | Writing-plans emits a `## Crosswalk` table (R# → section → tests) after Overview and strictly before Requirement 1, so the review-packet sed spans are untouched (fixture-proven); audit checks every R# exactly once; the human is shown a one-line confirmation instead of the full plan. | no |
| 3 | Ship gate | Executing-tasks gained the execution-summary progress section (fill-as-you-land, plain how-built rows, deviations logged when they happen) and the merged ship checkpoint: review runs before the single final approval, presenting digest + coverage table, diff on request; phase enum swaps feature-complete-paused → ship-paused with a legacy resume mapping; ADR 0003 records the reorder; README + three docs re-worded. | yes — E2E/skill-lint assertions originally banned the token `feature-complete-paused` file-wide; the resume map legitimately names it, so the ban was scoped to the phase-enum line (lesson recorded). |
| 4 | Coverage table | Spec-reviewer's own checklist section now mandates the report open with a per-requirement table (verdict + file:line evidence, keyed by packet Requirement headings); shared conduct block untouched — byte-identity test still passes; other three checklists deliberately unchanged. | no |
| 5 | Umbrella folders | Umbrella docs move into `docs/plans/<date>-<umbrella>/` (overview.md + part docs beside it); all five skills' discovery globs went recursive; finalize disposes the folder as one unit (rm -rf / mv); packet lives beside the plan doc; guard already allows subfolders (test pins it); AGENTS.md updated. | no |
| 6 | Finalize gate | Finalizing pre-checks now require every progress file at `Feature phase: done` (legacy states named, bounce back to executing-tasks); digest sections ride existing disposal globs (stated); docs-consistency test sweeps all five user docs for stale "review the whole diff"/"read the full plan" defaults. | no |
