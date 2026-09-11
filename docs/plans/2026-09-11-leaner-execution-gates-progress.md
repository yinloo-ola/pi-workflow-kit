# Progress: leaner-execution-gates

Design: docs/plans/2026-09-11-leaner-execution-gates-design.md
Branch: leaner-execution-gates
Started: 2026-09-11T04:39:56Z
Last updated: 2026-09-11T07:22:44Z
Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Per-requirement review auto-tag removed | — | 54f6a68 |
| 2 | ✅ | Feature review is one risk-scaled pass | — | cefd1b3 |
| 3 | ✅ | Feature-spec checkpoint becomes a notice | — | f6ccaac |
| 4 | ✅ | `spec` removed from the Checkpoints enum | 🔎 inline | e0ce069 · d880a49 |
| 5 | ✅ | Enriched Code digest `### Flow` | — | a384c1d |
| 6 | ✅ | Flow truth is checked against the tracing report | — | 8c7aa15 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Per-requirement review auto-tag removed | Deleted the silent rule that mapped non-empty `### Production-risk notes` to `### Review: parallel`; the tag vocabulary and the `skip` default stay, but the human is now the only writer. Lint assertions flipped from presence to absence so a re-introduced silent tag fails. | — |
| 2 | Feature review is one risk-scaled pass | The single feature review now reads `### Feature review: auto` and resolves on the design's own risk content — four reviewers when the design declares production-risk areas or per-requirement risk notes, one inline pass otherwise; an explicit tag is used as written. Lint gained a third tag vocabulary so `auto` cannot drift between the two skills. | — |
| 3 | Feature-spec checkpoint becomes a notice | The E2E is still written first and reported with its failing output, but the run continues into implementation instead of pausing; `e2e-written` and the legacy `feature-spec-paused` both render as `execute 0/N` in status, and the retired display state is gone from the roll-up. | yes — also refreshed README.md (not in the design's file table); it mirrors the same flow and would have shipped stale |
| 4 | `spec` removed from the Checkpoints enum | The per-requirement enum is now `none | full` in both skills and both guides; the retired value and its paired "needs inline review" rule are asserted absent by the lint suite, and a legacy `spec` resolves to `none`. The 2.2.0 changelog entry carries the migration note and the package version is bumped. Its inline review swept every consumer site and caught two stale vocabulary comments in the lint suite, fixed in a follow-up commit. | — |
| 5 | Enriched Code digest `### Flow` | The digest's flow section is now a spine/branches map: hops carry `[R#]` tags and symbol names, branches list each `condition -> outcome` with a `was:` clause only where behavior changed, worked values show inline, and side effects appear only when the feature does I/O. Code-digest tests assert the shape plus the honest-empty cases and the walkthrough escape hatch at the line cap. | — |
| 6 | Flow truth is checked against the tracing report | The digest write point now reconciles the Flow against reviewed reality before writing: every hop must match a path the tracing reviewer named, or in inline mode the spec-coverage result, and an unresolvable discrepancy is surfaced in the ship checkpoint's findings status instead of being smoothed over. | — |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary
Execution no longer pays for ceremony it already earned. The per-requirement review auto-tag is gone — a requirement with production-risk notes no longer silently buys four reviewers — and the one remaining feature review is risk-scaled: four roles only when the design declares risk, a single inline pass otherwise. The feature-spec stop became a notice (that E2E text was approved in brainstorm), the `spec` checkpoint value was dropped, and the ship digest's Flow became a navigable map so the one remaining stop is self-serve.

### Flow
Spine
  /skill:pwk-brainstorming -> [R1] tags written from the human's answer only -> [R2] `### Feature review: auto` -> design doc
  /skill:pwk-executing-tasks -> [R3] E2E red -> postNotice(), no pause -> [R1] per-slice tag read -> implement -> [R2] resolveFeatureReview() -> [R6] reconcileFlowAgainstReview() -> [R5] writeCodeDigest() -> ship checkpoint

Branches
  design declares risk -> four roles | no risk -> one inline pass            [R2]   was: four roles unconditionally
  explicit feature-review tag -> used as written                              [R2]
  requirement tagged -> one slice pass | untagged -> none                     [R1]   was: risk notes implied `Review: parallel`
  legacy `spec` -> `none`                                                     [R4]
  E2E green immediately -> probe, stop if wrong                               [R3]   was: approval pause before implementing
  E2E ungreenable -> stop and present                                         [R3]
  hop missing from the tracing report -> surfaced, never smoothed              [R6]
  Flow over ~15 lines -> offer `/skill:pwk-walkthrough`                        [R5]

Side effects
  reads: the design doc, progress files, the review packet, the tracing report
  writes: the progress file's digest, test files, feature-branch commits

### Gotchas
- [ALERT] the `spec` vocabulary detector is line-scoped — an enumeration wrapped across two lines would evade it; the piped-token vocabulary check is the second net.
- [ALERT] the `auto` resolution depends on the design doc declaring risk in one of the two mirrored places; a risky design that declares neither silently gets the inline pass.
- [ALERT] legacy `spec` and `feature-spec-paused` values are supported but no longer produced, so the migration paths are untested by real traffic.
- The digest's Flow is capped at ~15 lines; beyond that the deep read moves to `pwk-walkthrough` rather than growing the one thing the human reads.

### Key files
- skills/pwk-executing-tasks/SKILL.md — notice-not-stop flow, `auto` resolution, enriched Flow shape and its truth rule
- skills/pwk-brainstorming/SKILL.md — human-only tagging, `none | full`, `Feature review: auto`
- skills/pwk-status/SKILL.md — `e2e-written` and legacy paused states render as `execute 0/N`
- tests/skill-lint.mjs — three tag vocabularies, the `spec`-removal sweep, the Flow-truth checks
- tests/lean-gates.e2e.test.ts + tests/lean-gates.criteria.test.ts — the feature scenarios and the per-criterion coverage
