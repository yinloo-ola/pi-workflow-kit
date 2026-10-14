# Progress: skill-slimming-2

Design: docs/plans/2026-10-14-skill-slimming-2/skill-slimming-2-design.md

Branch: 2026-10-14-skill-slimming-2

Setup: n/a

Started: 2026-10-14T09:48:13Z

Last updated: 2026-10-14T10:35:00Z

Feature phase: implementing (1/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Word-budget ratchet for skill text | — | dac0577 |
| 2 | ⬜ | Heaviest three SKILL.md cut | — | — |
| 3 | ⬜ | Light three SKILL.md cut | — | — |
| 4 | ⬜ | Reference markdown cut | — | — |
| 5 | ⬜ | Fidelity and cost probe recorded | ⏸ full | — |
| 6 | ⬜ | Rules recorded, budgets tightened, release | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | Word-budget ratchet for skill text | A budget row for each of the 11 markdown files under `skills/` inside `skill-lint`, checked on every gate run, plus a rule that no file restates a 12-word sentence; both start green at the 2.9.0 counts so the gate exists before the cut it will police. | — | `skill-lint` measures all 11 files against their budgets and rejects an unbudgeted file or a restated rule — `node tests/skill-lint.mjs` green; the two quiet teeth proven on a throwaway kit copy by `tests/skill-budgets.test.ts` (2 passed). |
| 2 | Heaviest three SKILL.md cut | | | |
| 3 | Light three SKILL.md cut | | | |
| 4 | Reference markdown cut | | | |
| 5 | Fidelity and cost probe recorded | | | |
| 6 | Rules recorded, budgets tightened, release | | | |

## Deviation records

- **R2 per-file ceilings are measured, not fixed at 70% (human decision, Option 1).** `pwk-executing-tasks` landed at 2,884 words — 73.2% of its 2.9.0 count, a 26.8% cut — with the full suite green. It did not reach the designed 2,755 (70%). Cause: the baseline census harvested test *string literals* but not assertions written as regex patterns, so it reported eight contract phrases as free text; each restoration cost words back. The same census now harvests regex-pinned phrases (pin pool 1,278 → 1,541; pinned words 2,059 → 2,290). Decision: each file is slimmed to its true floor with the suite green, the ratchet and the acceptance budgets are set from the achieved numbers, and the aggregate target is **≥25%** with 30% reported rather than required. Evidence: `docs/plans/2026-10-14-skill-slimming-2/pin-census-v2.mjs` (per-file pinned/free/slack) and `pins-for.mjs` / `pins-lost.mjs` (the corrected harvesters).

## Code digest
