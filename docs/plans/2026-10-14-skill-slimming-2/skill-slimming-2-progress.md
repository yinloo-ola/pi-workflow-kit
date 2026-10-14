# Progress: skill-slimming-2

Design: docs/plans/2026-10-14-skill-slimming-2/skill-slimming-2-design.md

Branch: 2026-10-14-skill-slimming-2

Setup: n/a

Started: 2026-10-14T09:48:13Z

Last updated: 2026-10-14T11:45:00Z

Feature phase: implementing (3/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Word-budget ratchet for skill text | — | dac0577 |
| 2 | ✅ | Heaviest three SKILL.md cut | — | 920ffe5, fa5990e, 9926cb0 |
| 3 | ✅ | Light three SKILL.md cut | — | 531c9cc |
| 4 | ⬜ | Reference markdown cut | — | — |
| 5 | ⬜ | Fidelity and cost probe recorded | ⏸ full | — |
| 6 | ⬜ | Rules recorded, budgets tightened, release | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | Word-budget ratchet for skill text | A budget row for each of the 11 markdown files under `skills/` inside `skill-lint`, checked on every gate run, plus a rule that no file restates a 12-word sentence; both start green at the 2.9.0 counts so the gate exists before the cut it will police. | — | `skill-lint` measures all 11 files against their budgets and rejects an unbudgeted file or a restated rule — `node tests/skill-lint.mjs` green; the two quiet teeth proven on a throwaway kit copy by `tests/skill-budgets.test.ts` (2 passed). |
| 2 | Heaviest three SKILL.md cut | All three slimmed: `pwk-executing-tasks` 3,937 → 2,884 (26.8%), `pwk-brainstorming` 2,395 → 2,209 (7.8%), `pwk-finalizing` 1,827 → 1,641 (10.2%) — 8,159 → 6,734 combined, a 17.5% cut. Every contract sentence survived; the suite is the proof. | yes — measured floors instead of the designed 70%; `pwk-brainstorming` still has a deletion-led pass pending (see Deviation records) | `node docs/plans/2026-10-14-skill-slimming-2/free-lines.mjs <file>` maps per-line free prose; `pins-lost.mjs` reports 0 lost pins per file; `npx vitest run` 300 pass with only the three not-yet-built E2E scenarios red, `node tests/skill-lint.mjs` green. |
| 3 | Light three SKILL.md cut | Surgical pass on the lines the free-prose tool flagged: `pwk-code-review` 1,045 → 998 (4.5%), `pwk-status` 924 → 878 (5.0%), `pwk-walkthrough` left at 584 — a full-file rewrite of the first two cost nine pinned phrases for a 5% cut, so both were reverted and only genuinely free prose was touched. | yes — these files are contract text end to end; the designed 70% per file is unreachable here without breaking pinned assertions | `free-lines.mjs` per-line free prose; `pins-lost.mjs` reports 0 lost pins in all three; `npx vitest run` 300 pass (only the three not-yet-built E2E scenarios red); `node tests/skill-lint.mjs` green. |
| 4 | Reference markdown cut | | | |
| 5 | Fidelity and cost probe recorded | | | |
| 6 | Rules recorded, budgets tightened, release | | | |

## Deviation records

- **The effective pin surface is much larger than the pinned-word share.** Tests assert prose *fragments* (`/number each question/i`, `/passes immediately, probe why/`, `/every requirement's Done cell is terminal/`), and each fragment pins the sentence that carries it. The corrected census puts pinned words at ~15% of the corpus, yet a deletion-led rewrite of 12 heavy lines in `pwk-brainstorming` removed only 8% — the sentences around those fragments are effectively fixed. Closing the last stretch to a 30% cut would require re-anchoring fragment assertions to behavior (a test-side change the design deliberately excluded), which is its own topic, not a bigger editing pass.
- **R2 per-file ceilings are measured, not fixed at 70% (human decision, Option 1).** `pwk-executing-tasks` landed at 2,884 words — 73.2% of its 2.9.0 count, a 26.8% cut — with the full suite green. It did not reach the designed 2,755 (70%). Cause: the baseline census harvested test *string literals* but not assertions written as regex patterns, so it reported eight contract phrases as free text; each restoration cost words back. The same census now harvests regex-pinned phrases (pin pool 1,278 → 1,541; pinned words 2,059 → 2,290). Decision: each file is slimmed to its true floor with the suite green, the ratchet and the acceptance budgets are set from the achieved numbers, and the aggregate target is **≥25%** with 30% reported rather than required. Evidence: `docs/plans/2026-10-14-skill-slimming-2/pin-census-v2.mjs` (per-file pinned/free/slack) and `pins-for.mjs` / `pins-lost.mjs` (the corrected harvesters).

## Code digest
