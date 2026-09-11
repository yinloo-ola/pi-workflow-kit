# Progress: workflow-consistency

Design: docs/plans/2026-09-11-workflow-consistency-design.md
Branch: workflow-consistency
Started: 2026-09-11T07:16:58Z
Last updated: 2026-09-11T07:16:58Z
Feature phase: implementing (4/9)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | One row-state and ceremony vocabulary | — | 3f27184 |
| 2 | ✅ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | 9380ad3 |
| 3 | ✅ | Setup checkpoint made implementable | — | 
| 4 | ✅ | Derived At-a-glance Risk column | — | 
| 5 | ⬜ | Feature-acceptance template renders its review tag | — | — |
| 6 | ⬜ | Inventory doc parity sweep | — | — |
| 7 | ⬜ | Doc-inventory parity lint | — | — |
| 8 | ⬜ | Packet base defined from the Commit column | — | — |
| 9 | ⬜ | Diagnose ↔ execution recording hook | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | One row-state and ceremony vocabulary | Canonical vocabulary block in pwk-executing-tasks's Progress-file section (5 Done glyphs + ceremony echo values, terminal=resolved rule, reason suffix); code-review's phantom 🔎 review value replaced with the canonical ✅ flip. | |
| 2 | Terminal-state ship gate and reachable failure branches | Ship gate + digest + resume + status re-keyed on terminal rows; failure/skip paths name glyphs and reason suffixes; pwk-finalizing untouched and now reachable; ADR 0007 written. | E2E-reconciliation added at slice review (tracing #5): marking a row terminal also reconciles its test coverage |
| 3 | Setup checkpoint made implementable | Progress file created before the checkpoint with a Setup: slot (pending if ## Setup else n/a); approval flips to done; resume re-verifies on pending; status renders awaiting setup; five count-claim doc sites reworded conditionally. | |
| 4 | Derived At-a-glance Risk column | At-a-glance Risk column declared derived display-only (⚠ iff non-empty risk notes, else —); auto still reads notes only, at all three consumer sites. | |
| 5 | Feature-acceptance template renders its review tag | | |
| 6 | Inventory doc parity sweep | | |
| 7 | Doc-inventory parity lint | | |
| 8 | Packet base defined from the Commit column | | |
| 9 | Diagnose ↔ execution recording hook | | |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Deviation decision-record — R2: terminal rows reconcile their E2E coverage

**What changed:** the design's failure/skip paths only named the glyph + reason suffix. At the R2 slice review the tracing reviewer found the untouched ship step 2 ("E2E must be green") would deadlock a feature with a `❌` row whose assertions stay red — a residual F1 shape. **Decision:** marking a row terminal (`❌`/`⏭`) now includes reconciling its test coverage in the same step — assertions removed or skipped with the reason; the suite must stay green; the ship digest's verdict rows surface what was waived. **Rejected:** waiving the green-E2E gate at the ship checkpoint (weakens the gate for every feature to serve the failure case) and a per-requirement E2E carve-out list (new bookkeeping for a case the verdict rows already expose). Recorded in the vocabulary block, the skip override, the failure path, and ship step 2; pinned by `coverageReconciled`.
