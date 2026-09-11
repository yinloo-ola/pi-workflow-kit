# Progress: leaner-execution-gates

Design: docs/plans/2026-09-11-leaner-execution-gates-design.md
Branch: leaner-execution-gates
Started: 2026-09-11T04:39:56Z
Last updated: 2026-09-11T06:31:55Z
Feature phase: implementing (5/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Per-requirement review auto-tag removed | — | 54f6a68 |
| 2 | ✅ | Feature review is one risk-scaled pass | — | cefd1b3 |
| 3 | ✅ | Feature-spec checkpoint becomes a notice | — | f6ccaac |
| 4 | ✅ | `spec` removed from the Checkpoints enum | 🔎 inline | e0ce069 · d880a49 |
| 5 | ✅ | Enriched Code digest `### Flow` | — | a384c1d |
| 6 | ⬜ | Flow truth is checked against the tracing report | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Per-requirement review auto-tag removed | Deleted the silent rule that mapped non-empty `### Production-risk notes` to `### Review: parallel`; the tag vocabulary and the `skip` default stay, but the human is now the only writer. Lint assertions flipped from presence to absence so a re-introduced silent tag fails. | — |
| 2 | Feature review is one risk-scaled pass | The single feature review now reads `### Feature review: auto` and resolves on the design's own risk content — four reviewers when the design declares production-risk areas or per-requirement risk notes, one inline pass otherwise; an explicit tag is used as written. Lint gained a third tag vocabulary so `auto` cannot drift between the two skills. | — |
| 3 | Feature-spec checkpoint becomes a notice | The E2E is still written first and reported with its failing output, but the run continues into implementation instead of pausing; `e2e-written` and the legacy `feature-spec-paused` both render as `execute 0/N` in status, and the retired display state is gone from the roll-up. | yes — also refreshed README.md (not in the design's file table); it mirrors the same flow and would have shipped stale |
| 4 | `spec` removed from the Checkpoints enum | The per-requirement enum is now `none | full` in both skills and both guides; the retired value and its paired "needs inline review" rule are asserted absent by the lint suite, and a legacy `spec` resolves to `none`. The 2.2.0 changelog entry carries the migration note and the package version is bumped. Its inline review swept every consumer site and caught two stale vocabulary comments in the lint suite, fixed in a follow-up commit. | — |
| 5 | Enriched Code digest `### Flow` | The digest's flow section is now a spine/branches map: hops carry `[R#]` tags and symbol names, branches list each `condition -> outcome` with a `was:` clause only where behavior changed, worked values show inline, and side effects appear only when the feature does I/O. Code-digest tests assert the shape plus the honest-empty cases and the walkthrough escape hatch at the line cap. | — |
| 6 | Flow truth is checked against the tracing report | | |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary — 2–3 sentences: what the code now does differently, and why.
### Flow — execution/data movement through the changed code, as arrow chains.
### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
### Key files — 3–5 pivotal files, one line each: what shifted inside them.
