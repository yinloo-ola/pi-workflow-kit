# Progress: harness-neutral-tools

Design: docs/plans/2026-09-29-harness-neutral-tools/harness-neutral-tools-design.md

Branch: 2026-09-29-harness-neutral-tools

Setup: n/a

Started: 2026-09-29T13:20:00+08:00

Last updated: 2026-09-29T13:40:00+08:00

Feature phase: reviewing

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Tool-freedom clause in all six skills | — | 3b7fdb2 |
| 2 | ✅ | Disposal blocks reframed as invariant + canonical example | — | 8efdd54 |
| 3 | ✅ | Floor-not-prescription line in five role contracts | — | c1ac59b |
| 4 | ✅ | Prescription sweep in skill-lint | — | 696b18e |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Tool-freedom clause in all six skills | `TOOL_FREEDOM_MARKERS` in tests/markers.mjs pins the full clause + canonical fragment; new skill-lint check 14 asserts the clause in all six SKILL.md and byte-identity of the clause paragraph; the one-sentence clause inserted as its own paragraph after each intro. | no |
| 2 | Disposal blocks reframed as invariant + canonical example | `disposalInvariant` marker added to TOOL_FREEDOM_MARKERS; skill-lint asserts every finalizing bash fence is immediately preceded by a sentence carrying the marker — two invariant sentences (delete/archive) inserted as their own paragraphs before the fences, naming the folder unit and verification step; fenced commands untouched, DISPOSAL_ANCHORS stay green. | no |
| 3 | Floor-not-prescription line in five role contracts | `floorLine` marker (exact design sentence) in TOOL_FREEDOM_MARKERS; skill-lint asserts it in all five agents/*.md; inserted as its own paragraph at the same conduct-block spot in the four reviewers (byte-identity tests stay green) and after the intro paragraph in the recon-scout contract. | no |
| 4 | Prescription sweep in skill-lint | New `tests/prescription-sweep.mjs` (SANCTIONED prefixes + recipes, FRAMED markers, `sweepSkillDir` over the same file set skill-lint concatenates) wired into skill-lint as a check; six unit tests plus the E2E kit-copy scenario. First run surfaced 7 straggler sites, reconciled per the design error-handling rule: `python3`/`python3 --version` interpreter probes, the `grep -m1 '^Feature phase:'` header recipe, and `ls docs/plans/` deliberately pinned in SANCTIONED_COMMANDS; finalizing one mention reworded (never-`cd` → never-cd). | no |

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
