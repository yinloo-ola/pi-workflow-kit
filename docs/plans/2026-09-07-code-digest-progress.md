# Progress: code-digest

Plan: docs/plans/2026-09-07-code-digest-implementation.md
Branch: code-digest
Started: 2026-09-07T12:00:00+08:00
Last updated: 2026-09-07T12:00:00+08:00
Feature phase: implementing (9/10)

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
| 10 | ⬜ | Docs mirrors | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Digest template | Progress template gains a ## Code digest block under the execution summary: four subsections (Summary/Flow/Gotchas/Key files) plus a once-only placeholder note. | |
| 2 | Digest write point | New step 4 in the ship-checkpoint flow: after review success, the agent fills ## Code digest from the packet (Commits/Changed files/Diff), re-running a stale packet first; same write point on resume. | |
| 3 | Checkpoint presentation | Ship-checkpoint presentation list gains a code-digest bullet right after the execution summary; full-diff-on-request stays last. | |
| 4 | Fill rules | Fill-rules paragraph beside the template: plain language, R# anchors, no test names, A -> B -> C flows, [ALERT] reviewer-confirmed only, honest empty, key files at 5. | |
| 5 | completed/ exclusion | One canonical phrase (excluding docs/plans/completed/) appended at all six discovery sites across status/brainstorming/executing/finalize; finalize disposal commands untouched (byte-guarded by tests). | |
| 6 | Frontier rounds | Step 3 rewritten: question tree seeded by the six-dimension checklist (nothing-to-ask printed), full-frontier rounds of numbered questions each carrying a ➡️ recommendation, four approvals kept single-decision; Principles rewritten. | |
| 7 | Facts vs decisions | Facts rule added to step 3: codebase/docs/tool facts are looked up (scout or inline), never asked of the human; a pending lookup holds only its downstream questions. | |
| 8 | Assumption gate | New block at step 6: before presenting the design, every unconfirmed assumption re-opens as a numbered question with a recommendation; honest empty gate; confirmed facts woven in, no new section. | |
| 9 | Termination and backstops | Stop rule rewritten to frontier-empty (nothing silently assumed); unwritable feature-acceptance steps bounce to the gate; writing-plans bounces un-derivable requirements back to brainstorm naming the gap. | |
| 10 | Docs mirrors | | |
