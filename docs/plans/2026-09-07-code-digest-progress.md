# Progress: code-digest

Plan: docs/plans/2026-09-07-code-digest-implementation.md
Branch: code-digest
Started: 2026-09-07T12:00:00+08:00
Last updated: 2026-09-07T12:00:00+08:00
Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Digest template | — | R1 |
| 2 | ✅ | Digest write point | — | R2 |
| 3 | ✅ | Checkpoint presentation | — | R3 |
| 4 | ✅ | Fill rules | — | R4 |
| 5 | ✅ | completed/ exclusion | 🔎 parallel | R5 |
| 6 | ✅ | Frontier rounds | — | R6 |
| 7 | ✅ | Facts vs decisions | — | R7 |
| 8 | ✅ | Assumption gate | — | R8 |
| 9 | ✅ | Termination and backstops | — | R9 |
| 10 | ✅ | Docs mirrors | — | R10 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Digest template | Progress template gains a ## Code digest block under the execution summary: four subsections (Summary/Flow/Gotchas/Key files) plus a once-only placeholder note. | |
| 2 | Digest write point | New step 4 in the ship-checkpoint flow: after review success, the agent fills ## Code digest from the packet (Commits/Changed files/Diff), re-running a stale packet first; same write point on resume. | |
| 3 | Checkpoint presentation | Ship-checkpoint presentation list gains a code-digest bullet right after the execution summary; full-diff-on-request stays last. | |
| 4 | Fill rules | Fill-rules paragraph beside the template: plain language, R# anchors, no test names, A -> B -> C flows, [ALERT] reviewer-confirmed only, honest empty, key files at 5. | |
| 5 | completed/ exclusion | One canonical phrase (excluding docs/plans/completed/) appended at all discovery sites across status/brainstorming/writing-plans/executing/finalize (writing-plans added per review findings); finalize disposal commands untouched (byte-guarded by tests). | |
| 6 | Frontier rounds | Step 3 rewritten: question tree seeded by the six-dimension checklist (nothing-to-ask printed), full-frontier rounds of numbered questions each carrying a ➡️ recommendation, four approvals kept single-decision; Principles rewritten. | |
| 7 | Facts vs decisions | Facts rule added to step 3: codebase/docs/tool facts are looked up (scout or inline), never asked of the human; a pending lookup holds only its downstream questions. | |
| 8 | Assumption gate | New block at step 6: before presenting the design, every unconfirmed assumption re-opens as a numbered question with a recommendation; honest empty gate; confirmed facts woven in, no new section. | |
| 9 | Termination and backstops | Stop rule rewritten to frontier-empty (nothing silently assumed); unwritable feature-acceptance steps bounce to the gate; writing-plans bounces un-derivable requirements back to brainstorm naming the gap. | |
| 10 | Docs mirrors | README, workflow-phases, and developer-usage-guide now describe the ship-checkpoint code digest, the completed/ exclusion at archive time, and frontier-round questioning. | |

## Code digest

### Summary
The kit now explains its own changes. When a feature review passes, the executor writes a plain-language code digest — summary, execution flow, gotchas, key files — into the progress file from the review packet and presents it at the ship checkpoint. Discovery globs no longer see archived plan docs (R5), closing the 1.7.0 regression that could misroute a finalized standalone topic down an archived umbrella's path — up to rm -rf on the archive. Brainstorming now interviews in frontier rounds (R6–R9): numbered questions each with a recommended answer, facts looked up rather than asked, an assumption gate on the drafted design, and a frontier-empty stop rule, with the planner bouncing requirements too vague to test.

### Flow
- Digest: review passes -> executor reads packet (Commits / Changed files / Diff) -> fills `## Code digest` in `*-progress.md` -> ship checkpoint presents it after the execution summary -> finalize archives or deletes it with the progress file.
- Discovery: `docs/plans/**` glob -> excluding docs/plans/completed/ -> active topics only -> status / brainstorm / plan / execute / finalize routing see no archived work.
- Brainstorm: topic + scout facts -> question tree seeded by 6 dimensions -> frontier rounds (numbered questions + recommendation) -> assumption gate on the draft -> design doc -> planner derives AC -> (un-derivable -> bounce to brainstorm).

### Gotchas
- None beyond review findings — all spec/tracing findings were fixed in-flight (writing-plans glob, single-source links, lint parity, umbrella-glob canonical phrase, R6 replacement assertions); hazard confirmed the finalize rm -rf vector is narrowed and disposal lines are byte-pinned by tests.
- Implicit assumption kept: the exclusion is wording-level (the globs are LLM-executed), enforced by content tests — any future recursive `docs/plans/**` glob needs its own site entry in both harnesses.

### Key files
- `skills/pwk-executing-tasks/SKILL.md` — digest template, write step 4, presentation item, fill rules; find-the-plan + routing exclusions.
- `skills/pwk-brainstorming/SKILL.md` — frontier protocol, facts rule, assumption gate, stop rule, scenario forcing; Principles rewritten.
- `skills/pwk-writing-plans/SKILL.md` — bounce rule; both discovery globs carry the exclusion.
- `skills/pwk-finalizing/SKILL.md` + `skills/pwk-status/SKILL.md` — exclusion wording only; disposal commands byte-identical.
- `tests/code-digest.test.ts` + `tests/markers.mjs` + `tests/skill-lint.mjs` — 15 tests over shared markers; skill-lint Check 12.
