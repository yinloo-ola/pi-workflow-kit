# Progress: harness-neutral-tools

Design: docs/plans/2026-09-29-harness-neutral-tools/harness-neutral-tools-design.md

Branch: 2026-09-29-harness-neutral-tools

Setup: n/a

Started: 2026-09-29T13:20:00+08:00

Last updated: 2026-09-29T13:23:00+08:00

Feature phase: implementing (0/4)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | 🔄 | Tool-freedom clause in all six skills | — | — |
| 2 | ⬜ | Disposal blocks reframed as invariant + canonical example | — | — |
| 3 | ⬜ | Floor-not-prescription line in five role contracts | — | — |
| 4 | ⬜ | Prescription sweep in skill-lint | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Tool-freedom clause in all six skills | | |
| 2 | Disposal blocks reframed as invariant + canonical example | | |
| 3 | Floor-not-prescription line in five role contracts | | |
| 4 | Prescription sweep in skill-lint | | |

## Deviation records

<!-- One short paragraph per design-decision reversal (what changed, why, what was rejected), written at deviation time; leave this section empty when every Deviated? entry is mechanical. -->

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary
### Flow
- **Spine** — `<entry point> -> [R1] <step> -> [R2] <step> -> <outcome>`
- **Branches**
  - `<condition> -> <outcome>` [R2]
  - `<changed behavior> — was: <previous behavior>`
- **Side effects** — reads: `<what>` · writes: `<what>`
### Gotchas
- <one real risk per bullet>
### Key files
- `<file>` — <what shifted inside it>
