# Progress: extract-never-ingest-gates

Design: docs/plans/2026-09-10-extract-never-ingest-gates-design.md
Branch: extract-never-ingest-gates
Started: 2026-09-10T17:40:00Z
Last updated: 2026-09-10T18:15:00Z
Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Extract-never-ingest for the last two progress-file reads | — | 4c62883 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Extract-never-ingest for the last two progress-file reads | Finalizing gate now matches the `Feature phase:` line and reads only the matching ❌/⏭ verdict rows in the Requirements table; executing resume reads header + Requirements table (first Done cell ≠ `✅` routes) + Execution summary rows, stopping before the optional sections; pwk-status aligned (grep -m1 primary, row-count tally). | No |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary
The last two full-read sites now obey extract-never-ingest: the finalizing gate matches the `Feature phase:` line and reads only the matching ❌/⏭ verdict rows in the Requirements table, and the executing resume reads header + Requirements table (first Done cell ≠ `✅` routes) + Execution summary rows, stopping before the optional sections. pwk-status aligned: `grep -m1` matching is the primary example (the 10-line estimate retired) and the done tally is the Requirements-table row count — no icon counting anywhere.

### Flow
Finalizing gate: recursive discovery -> per progress file: match `Feature phase:` line -> read matching ❌/⏭ rows -> gate decisions (phase + verdicts) with no body reads. Executing resume: match phase line -> read top through end of `## Execution summary` -> first Done cell ≠ `✅` routes the next requirement; sections after the tables are finalize material.

### Gotchas
- Routing and tallies key on structure (Done cell, table rows), not icon presence — blank/hand-edited cells route correctly.
- The design doc is still parsed in full everywhere — it is the executor's input, not history; the extraction contract is scoped to progress files.
- `[ALERT]` The finalizing pre-check anchor window (400 chars to `excluding docs/plans/completed/`) still applies after the inserted extraction sentence — future edits to that step must keep the phrase inside the window (lint enforces).

### Key files
- `skills/pwk-finalizing/SKILL.md` — gate extraction: line-match + verdict rows, nothing-after-tables.
- `skills/pwk-executing-tasks/SKILL.md` — resume extraction: header + tables + stop-before-optional; Done-cell routing.
- `skills/pwk-status/SKILL.md` — grep -m1 primary, row-count tally, 10-line estimate retired.
- `tests/markers.mjs` + `tests/pwk-status.test.ts` — gateExtract/resumeExtract markers, headerRead retargeted to the grep form, new E2E group.
