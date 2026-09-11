# Progress: leaner-execution-gates

Design: docs/plans/2026-09-11-leaner-execution-gates-design.md
Branch: leaner-execution-gates
Started: 2026-09-11T04:39:56Z
Last updated: 2026-09-11T05:39:07Z
Feature phase: implementing (3/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Per-requirement review auto-tag removed | — | 54f6a68 |
| 2 | ✅ | Feature review is one risk-scaled pass | — | cefd1b3 |
| 3 | ✅ | Feature-spec checkpoint becomes a notice | — | f6ccaac |
| 4 | ⬜ | `spec` removed from the Checkpoints enum | 🔎 inline | — |
| 5 | ⬜ | Enriched Code digest `### Flow` | — | — |
| 6 | ⬜ | Flow truth is checked against the tracing report | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Per-requirement review auto-tag removed | Deleted the silent rule that mapped non-empty `### Production-risk notes` to `### Review: parallel`; the tag vocabulary and the `skip` default stay, but the human is now the only writer. Lint assertions flipped from presence to absence so a re-introduced silent tag fails. | — |
| 2 | Feature review is one risk-scaled pass | The single feature review now reads `### Feature review: auto` and resolves on the design's own risk content — four reviewers when the design declares production-risk areas or per-requirement risk notes, one inline pass otherwise; an explicit tag is used as written. Lint gained a third tag vocabulary so `auto` cannot drift between the two skills. | — |
| 3 | Feature-spec checkpoint becomes a notice | The E2E is still written first and reported with its failing output, but the run continues into implementation instead of pausing; `e2e-written` and the legacy `feature-spec-paused` both render as `execute 0/N` in status, and the retired display state is gone from the roll-up. | yes — also refreshed README.md (not in the design's file table); it mirrors the same flow and would have shipped stale |
| 4 | `spec` removed from the Checkpoints enum | | |
| 5 | Enriched Code digest `### Flow` | | |
| 6 | Flow truth is checked against the tracing report | | |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary — 2–3 sentences: what the code now does differently, and why.
### Flow — execution/data movement through the changed code, as arrow chains.
### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
### Key files — 3–5 pivotal files, one line each: what shifted inside them.
