# Progress: workflow-consistency

Design: docs/plans/2026-09-11-workflow-consistency-design.md
Branch: workflow-consistency
Started: 2026-09-11T07:16:58Z
Last updated: 2026-09-11T07:16:58Z
Feature phase: done

## Review reports

### Spec alignment — coverage table (feature review)

| R# | Verdict | Evidence |
|----|---------|----------|
| 1 | covered | executing:96-99, code-review:36; per-slice R1 |
| 2 | covered | executing:131,142,87, status:14-15; per-slice R2 (5 its) + E2E sc3 |
| 3 | covered | executing:20-76 + resume rule, status:14; per-slice R3 + E2E sc4 |
| 4 | covered | brainstorming:94; per-slice R4 |
| 5 | covered | brainstorming:106-110 fence, skill-lint FA_TAG, packet fixtures; per-slice R5 + E2E sc2 |
| 6 | gap -> fixed | finalizing:37,53 lacked the -notes.md glob; code-digest pins froze the omission; landed + per-slice R6 notes-disposal pin |
| 7 | covered | skill-lint parity section; per-slice R7 + E2E sc1 |
| 8 | gap -> fixed | prose pins only, no executable span fixture; real-repo c1^/c2..c3 fixture added |
| 9 | covered | executing implement-phase mandate, diagnose:57; per-slice R9 |

### Code tracing — no broken traces on any asserted path

Untested branches noted: (1) lint negative paths described-not-executed -> verified live post-review (8th pwk-* dir fails real lint, exit 1); (2) statusVerdictGrep single-suite coverage (accepted); (3) legacy routing text-pinned not behavior-executed (accepted, kit idiom).

### Code smells — no findings (split node:fs import merged)

### Production hazards — all 7 SAFE, no findings

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | One row-state and ceremony vocabulary | — | 3f27184 |
| 2 | ✅ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | 9380ad3 |
| 3 | ✅ | Setup checkpoint made implementable | — | d488253 |
| 4 | ✅ | Derived At-a-glance Risk column | — | 86f6803 |
| 5 | ✅ | Feature-acceptance template renders its review tag | — | f6df5f9 |
| 6 | ✅ | Inventory doc parity sweep | — | 360822d |
| 7 | ✅ | Doc-inventory parity lint | — | 0405342 |
| 8 | ✅ | Packet base defined from the Commit column | — | 9552525 |
| 9 | ✅ | Diagnose ↔ execution recording hook | — | 14be433 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | One row-state and ceremony vocabulary | Canonical vocabulary block in pwk-executing-tasks's Progress-file section (5 Done glyphs + ceremony echo values, terminal=resolved rule, reason suffix); code-review's phantom 🔎 review value replaced with the canonical ✅ flip. | |
| 2 | Terminal-state ship gate and reachable failure branches | Ship gate + digest + resume + status re-keyed on terminal rows; failure/skip paths name glyphs and reason suffixes; pwk-finalizing untouched and now reachable; ADR 0007 written. | E2E-reconciliation added at slice review (tracing #5): marking a row terminal also reconciles its test coverage |
| 3 | Setup checkpoint made implementable | Progress file created before the checkpoint with a Setup: slot (pending if ## Setup else n/a); approval flips to done; resume re-verifies on pending; status renders awaiting setup; five count-claim doc sites reworded conditionally. | |
| 4 | Derived At-a-glance Risk column | At-a-glance Risk column declared derived display-only (⚠ iff non-empty risk notes, else —); auto still reads notes only, at all three consumer sites. | |
| 5 | Feature-acceptance template renders its review tag | FA fenced block gains its ### Feature review line; skill-lint pins the tag inside the fence so the gap stays closed; packet fixtures cover tag-present docs. | |
| 6 | Inventory doc parity sweep | pwk-walkthrough in all four inventory docs + three unlock sites; stale 1.x counts/terminology/split ordering repaired; code-review half-migration finished; README guard table corrected; -notes.md disposal glob learned. | |
| 7 | Doc-inventory parity lint | skill-lint gains an inventory-parity section: skill roster vs tree, UNLOCK_SKILLS vs prose sites, stated counts vs computed counts — drift fails CI both ways. | |
| 8 | Packet base defined from the Commit column | Step 6 records the commit hash; feature packet bases on parent-of-first-Commit-entry, per-req spans chain previous-last → this-last; code-review scope mirrors; bare <merge-base> gone from executing. | |
| 9 | Diagnose ↔ execution recording hook | Executing mandates mid-execution fixes as summary content with Deviated? marks at fix time; diagnose's closing phase records the fix in the progress file (one sentence both sides). | |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Deviation decision-record — R2: terminal rows reconcile their E2E coverage

**What changed:** the design's failure/skip paths only named the glyph + reason suffix. At the R2 slice review the tracing reviewer found the untouched ship step 2 ("E2E must be green") would deadlock a feature with a `❌` row whose assertions stay red — a residual F1 shape. **Decision:** marking a row terminal (`❌`/`⏭`) now includes reconciling its test coverage in the same step — assertions removed or skipped with the reason; the suite must stay green; the ship digest's verdict rows surface what was waived. **Rejected:** waiving the green-E2E gate at the ship checkpoint (weakens the gate for every feature to serve the failure case) and a per-requirement E2E carve-out list (new bookkeeping for a case the verdict rows already expose). Recorded in the vocabulary block, the skip override, the failure path, and ship step 2; pinned by `coverageReconciled`.
