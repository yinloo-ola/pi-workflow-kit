# Progress: evidence-spine

Design: docs/plans/2026-10-14-evidence-spine/evidence-spine-design.md

Branch: 2026-10-14-evidence-spine

Setup: n/a

Started: 2026-10-14T09:11:23Z

Last updated: 2026-10-14T09:22:33Z

Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | PRD brief | — | 56cee4c |
| 2 | ✅ | Decide-by-experiment tier | — | 0009211 |
| 3 | ✅ | Probe test | — | 50d25b3 |
| 4 | ✅ | Evidence rows | — | 65c40f1 |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | PRD brief | Step 3 opens with a cited, zero-context brief (Background / Current situation / The delta); the human corrects it before frontier rounds; no source material, no brief | | brief markers pinned once in the owning skill — vitest + skill-lint green @ 56cee4c |
| 2 | Decide-by-experiment tier | Runnable-facts classification inside the facts-vs-decisions rule: bounded sketch, proof clause, INCONCLUSIVE return, round-summary listing; clause shape recorded in design-format | | tier markers green, failure point advanced to probeTest — vitest + skill-lint @ 0009211 |
| 3 | Probe test | One sentence in the completion gate plus its mirror in the design-format audit: a criterion with no nameable probe goes back for splitting or rephrasing; criteria never name tests | | probe markers green in both owners, failure point at evidenceColumn — vitest + skill-lint @ 50d25b3 |
| 4 | Evidence rows | Evidence column in the execution-summary template + rule paragraph (pairing, single probe test, refusal); executing fill rule + ship-checkpoint quoting; finalizing ride note; execSummaryTable marker migrated with its three consumers; README/workflow-phases/developer-usage-guide mirrors; CHANGELOG + 2.9.0 | | E2E fully green (3/3 scenarios), npm run check exit 0 — biome + vitest + skill-lint @ 65c40f1 |

## Deviation records

<!-- One short paragraph per design-decision reversal (what changed, why, what was rejected), written at deviation time; leave this section empty when every Deviated? entry is mechanical. -->

## Code digest

### Summary
Requirements are now grounded in evidence end to end: brainstorm opens with a cited PRD brief and settles runnable unknowns by bounded sketch, criteria must pass the probe test before the design is approved, and the execution summary carries an Evidence column that refuses an empty cell at ✅. The ship checkpoint quotes the evidence, so the human reads proof instead of claims. Ships as 2.9.0.

### Flow
- **Spine** — PRD brief -> frontier rounds -> decide-by-experiment -> probe-tested criteria -> implement -> Evidence cell at ✅ -> ship checkpoint quoting evidence
- **Branches**
  - `no source material` -> brief skipped, flow unchanged [R1]
  - `sketch inconclusive or blocked` -> `INCONCLUSIVE` recorded -> question returns to the human with the result [R2]
  - `no nameable probe` -> requirement sent back for splitting or rephrasing [R3]
  - `empty Evidence cell at ✅-time` -> marking refused — was: any row could go ✅ with prose only [R4]
### Gotchas
- none beyond review findings
### Key files
- `skills/pwk-brainstorming/SKILL.md` — brief rule, runnable-facts tier, probe sentence
- `skills/pwk-executing-tasks/references/progress-format.md` — Evidence column + pairing and refusal rules
- `tests/markers.mjs` — EVIDENCE_SPINE_MARKERS added; execSummaryTable migrated to five columns
- `tests/skill-lint.mjs` — fifteen new pins across brainstorming, executing, finalizing
- `tests/evidence-spine.e2e.test.ts` — feature E2E: exactly-once owners plus docs mirrors
