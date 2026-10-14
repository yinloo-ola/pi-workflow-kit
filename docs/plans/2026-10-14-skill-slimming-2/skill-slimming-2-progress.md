# Progress: skill-slimming-2

Design: docs/plans/2026-10-14-skill-slimming-2/skill-slimming-2-design.md

Branch: 2026-10-14-skill-slimming-2

Setup: n/a

Started: 2026-10-14T09:48:13Z

Last updated: 2026-10-14T14:35:00Z

Feature phase: implementing (6/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Word-budget ratchet for skill text | — | dac0577 |
| 2 | ✅ | Heaviest three SKILL.md cut | — | 920ffe5, fa5990e, 9926cb0 |
| 3 | ✅ | Light three SKILL.md cut | — | 531c9cc |
| 4 | ✅ | Reference markdown cut | — | 88e9e24 |
| 5 | ✅ | Fidelity and cost probe recorded | ⏸ full | c3df7fc, 9ce701c |
| 6 | ✅ | Rules recorded, budgets tightened, release | — | accc45f |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | Word-budget ratchet for skill text | A budget row for each of the 11 markdown files under `skills/` inside `skill-lint`, checked on every gate run, plus a rule that no file restates a 12-word sentence; both start green at the 2.9.0 counts so the gate exists before the cut it will police. | — | `skill-lint` measures all 11 files against their budgets and rejects an unbudgeted file or a restated rule — `node tests/skill-lint.mjs` green; the two quiet teeth proven on a throwaway kit copy by `tests/skill-budgets.test.ts` (2 passed). |
| 2 | Heaviest three SKILL.md cut | All three slimmed: `pwk-executing-tasks` 3,937 → 2,884 (26.8%), `pwk-brainstorming` 2,395 → 2,209 (7.8%), `pwk-finalizing` 1,827 → 1,641 (10.2%) — 8,159 → 6,734 combined, a 17.5% cut. Every contract sentence survived; the suite is the proof. | yes — measured floors instead of the designed 70%; `pwk-brainstorming` still has a deletion-led pass pending (see Deviation records) | `node docs/plans/2026-10-14-skill-slimming-2/free-lines.mjs <file>` maps per-line free prose; `pins-lost.mjs` reports 0 lost pins per file; `npx vitest run` 300 pass with only the three not-yet-built E2E scenarios red, `node tests/skill-lint.mjs` green. |
| 3 | Light three SKILL.md cut | Surgical pass on the lines the free-prose tool flagged: `pwk-code-review` 1,045 → 998 (4.5%), `pwk-status` 924 → 878 (5.0%), `pwk-walkthrough` left at 584 — a full-file rewrite of the first two cost nine pinned phrases for a 5% cut, so both were reverted and only genuinely free prose was touched. | yes — these files are contract text end to end; the designed 70% per file is unreachable here without breaking pinned assertions | `free-lines.mjs` per-line free prose; `pins-lost.mjs` reports 0 lost pins in all three; `npx vitest run` 300 pass (only the three not-yet-built E2E scenarios red); `node tests/skill-lint.mjs` green. |
| 4 | Reference markdown cut | All five reference files slimmed against their pins: `umbrella.md` 402→275 (31.6%), `resume.md` 646→449 (30.5%), `review.md` 804→607 (24.5%), `progress-format.md` 1,298→1,007 (22.4%), `design-format.md` 1,498→1,308 (12.7%) — 4,648→3,646 combined. Explanatory sentences and in-file restatements went; every rule, command recipe, and pinned phrase stayed. | yes — three files cannot reach 70% without cutting contract text (see Deviation records) | `pins-lost.mjs` reports 0 lost pins in all five files; `npx vitest run` 300 pass with only this topic's three unbuilt E2E scenarios red; `node tests/skill-lint.mjs` green (budgets, no-restatement, prescription sweep). |
| 5 | Fidelity and cost probe recorded | A probe kit (`protocol.json`, fixture task, `usage.mjs`, `validate.mjs`, fixtures) plus one authorized run: baseline 2.9.0 vs the slimmed kit, three trials each, in isolated HOMEs that load only the kit under test. Behavior held in every trial; the candidate median landed 1.3% higher, so the size claim and the cost claim are reported as two separate facts — the cut bought no measurable token saving. | yes — the criterion demanding a lower candidate median became a reported finding (ADR 0009) | `node tests/evals/skill-slimming/validate.mjs tests/evals/skill-slimming/runs/2026-10-14/report.json` → exit 0, `candidate median 2021740 vs baseline median 1995148 -> higher-or-equal (+26592)`; six transcripts + recomputed usage in `runs/2026-10-14/`; 5/5 assessments per trial. |
| 6 | Rules recorded, budgets tightened, release | The five editorial rules are in `AGENTS.md` as `E1:`–`E5:`; `skill-lint` and the feature E2E carry per-file budgets = measured count + 10% headroom and a 14,143-word corpus ceiling, so the achieved floor is ratcheted rather than promised; the release ships as 2.10.0 with a CHANGELOG entry naming the topic. | yes — the designed 70% per-file target became the measured floor (ADR 0010), and the aggregate claim is the achieved 16.3%, not 30% | `npm run check` green (biome, 308 vitest, skill-lint); `tests/skill-slimming.e2e.test.ts` fully green including the budget and `E1:`–`E5:` scenarios; `package.json` at 2.10.0 plus a `[2.10.0]` CHANGELOG entry. |

## Deviation records

- **The effective pin surface is much larger than the pinned-word share.** Tests assert prose *fragments* (`/number each question/i`, `/passes immediately, probe why/`, `/every requirement's Done cell is terminal/`), and each fragment pins the sentence that carries it. The corrected census puts pinned words at ~15% of the corpus, yet a deletion-led rewrite of 12 heavy lines in `pwk-brainstorming` removed only 8% — the sentences around those fragments are effectively fixed. Closing the last stretch to a 30% cut would require re-anchoring fragment assertions to behavior (a test-side change the design deliberately excluded), which is its own topic, not a bigger editing pass.
- **R2 per-file ceilings are measured, not fixed at 70% (human decision, Option 1).** `pwk-executing-tasks` landed at 2,884 words — 73.2% of its 2.9.0 count, a 26.8% cut — with the full suite green. It did not reach the designed 2,755 (70%). Cause: the baseline census harvested test *string literals* but not assertions written as regex patterns, so it reported eight contract phrases as free text; each restoration cost words back. The same census now harvests regex-pinned phrases (pin pool 1,278 → 1,541; pinned words 2,059 → 2,290). Decision: each file is slimmed to its true floor with the suite green, the ratchet and the acceptance budgets are set from the achieved numbers, and the aggregate target is **≥25%** with 30% reported rather than required. Evidence: `docs/plans/2026-10-14-skill-slimming-2/pin-census-v2.mjs` (per-file pinned/free/slack) and `pins-for.mjs` / `pins-lost.mjs` (the corrected harvesters).

- **R5's cost criterion was amended: the validator reports the direction, it does not require it (ADR 0009).** The probe measured a candidate median of 2,021,740 against the baseline's 1,995,148 (+1.3%), with within-condition spreads of 266,689 (13%) and 554,058 (27%). The original criterion required the candidate median to be *below* the baseline's, so the validator rejected a report that was complete, honest, and fully recomputable — on the direction of its result. Decision: a report validates on structure and verifiable numbers only, and the direction is printed as a finding. Cause of the non-result: ~95% of a trial's tokens are context re-read, the skill corpus is ~22% of the context, so a 16.3% word cut is a ~3.7% effect against a 13–27% noise band — unmeasurable at three trials. Rejected: keeping the criterion and failing R5 (which would assert "slimming made sessions costlier" from noise), and adding trials until the direction flipped. Human decision 2026-10-14 (Option b).

- **R4's 70% per-file cut is unreachable for three of the five reference files; the topic aggregate misses even the relaxed target (measured 2026-10-14).** Achieved, against each file's 70% ceiling:

  | File | 2.9.0 | Now | Cut | 70% cap | |
  |---|---|---|---|---|---|
  | `umbrella.md` | 402 | 275 | 31.6% | 281 | ✅ inside |
  | `resume.md` | 646 | 449 | 30.5% | 452 | ✅ inside |
  | `review.md` | 804 | 607 | 24.5% | 562 | ✖ over |
  | `progress-format.md` | 1,298 | 1,007 | 22.4% | 908 | ✖ over |
  | `design-format.md` | 1,498 | 1,308 | 12.7% | 1,048 | ✖ over |

  Every cut preserved the pinned phrase set (`pins-lost.mjs` → 0 lost per file) and the suite (300 pass; only this topic's three unbuilt E2E scenarios red). Cause: once the explanatory sentences are gone these files are rules end to end — `design-format.md`'s block rules, `progress-format.md`'s row vocabulary and digest fill rules, `review.md`'s packet-helper CLI contract — each machine-pinned or keep-list K5 contract. The cuttable prose measures 15–25%, not 30%. The corpus therefore lands at ~12,860 of 15,360 words — **a 16.3% cut**, below the design's 30% and below the ≥25% set as the relaxed target in the R2 deviation (Option 1). Decision needed: accept the measured floors (budgets from achieved numbers, as R2/R3) with the aggregate claim reduced to what was achieved, or extend scope (e.g. re-anchoring pinned assertions off prose — a design non-goal). **Human decision (2026-10-14, Option 1): accept the measured floors.** R4 closes ✅ with the deviation recorded; at R6 the budget table and the acceptance budgets are set from the achieved counts plus 10% headroom, and the aggregate claim is reduced to the achieved ~16%.

## Code digest
