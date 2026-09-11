# Progress: workflow-hint-gaps

Design: docs/plans/2026-09-11-workflow-hint-gaps-design.md
Branch: workflow-hint-gaps
Setup: n/a
Started: 2026-09-11T09:17:18Z
Last updated: 2026-09-11T09:17:18Z
Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Next-step routing never bounces | — | c995e31 | — | — |
| 2 | ✅ | Every rendered state is complete | — | b5e6c94 | — | — |
| 3 | ✅ | Sessions see the state they route on | — | f957c59 | — | — |
| 4 | ✅ | Gates and vocabulary match reality | — | 0eca7a9 | — | — |
| 5 | ✅ | One worktree per branch, created once, removed once | — | 4634962 | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Next-step routing never bounces | Status ship-paused now points at executing-tasks, code review returns to the ship checkpoint, and after-review routing reads only the current design's folder. | |
| 2 | Every rendered state is complete | The e2e-written tally now cites its row-count source, awaiting setup joins the in-flight buckets, and notice-phase parts explicitly roll up as execute. | |
| 3 | Sessions see the state they route on | Brainstorm discovery now reports each in-flight topic's phase line, later parts report prior phases before designing, and execute pre-flight surfaces them as advisory context. | |
| 4 | Gates and vocabulary match reality | Finalizing now blocks on roster parts with no progress file, and the live phase enumeration lists only phases the flow writes. | |
| 5 | One worktree per branch, created once, removed once | Pre-flight now adopts the existing branch worktree instead of re-offering creation, and finalize cleanup verifies presence before removing. | |

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary — 2–3 sentences: what the code now does differently, and why.
Five skills' prose now routes fresh sessions without bouncing, guessing, or gating vacuously: status hints land on skills whose gates accept the state, every rendered tally names its source and bucket, predecessor phases travel on disk, finalizing fails closed on unstarted parts, and worktrees are adopted and cleaned up exactly once. No guard or test code changed — the defect was prose, so the fix is prose, pinned by an ephemeral E2E.
### Flow
Spine
  fresh session -> [R1] status hint / review return / folder-scoped after-review -> executing-tasks ship checkpoint -> [R4] finalize gate (done + roster cross-check) -> disposal
Branches
  part at E2E notice -> rolls up as execute [R2]
  part awaiting setup -> in-flight bucket [R2]
  design-only topic -> `design`, unchanged [R3]
  roster part with no progress file -> block naming the part [R4]
  worktree exists -> adopt / remove it; absent -> offer creation / silent no-op [R5]
Side effects
  reads: skills/*/SKILL.md (E2E greps)   writes: skills prose only
### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
- Bare `feature-spec` (unquoted) must never appear in status — an existing vocabulary test forbids it; the notice rolls up as execute instead (R2-NOTE in the E2E).
- Two repo tests pin old skill sentences verbatim; edits retain those substrings (code-review step 7, after-review completed/ exclusion).
### Key files — 3–5 pivotal files, one line each: what shifted inside them.
- skills/pwk-status/SKILL.md — ship-paused routes to executing-tasks; tallies cite sources; buckets cover awaiting setup.
- skills/pwk-executing-tasks/SKILL.md — folder-scoped after-review routing; advisory prior phases; live-only phase enum; worktree adopt.
- skills/pwk-finalizing/SKILL.md — unstarted-part roster block; presence-verified worktree cleanup.
- skills/pwk-brainstorming/SKILL.md — discovery reports phase lines; later parts report prior phases.
- skills/pwk-code-review/SKILL.md — returns to executing-tasks; step 7 names the row under review.
