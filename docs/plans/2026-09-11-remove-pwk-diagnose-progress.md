# Progress: remove-pwk-diagnose

Design: docs/plans/2026-09-11-remove-pwk-diagnose-design.md
Branch: remove-pwk-diagnose
Started: 2026-09-11T09:49:37Z
Last updated: 2026-09-11T10:31:00Z
Feature phase: reviewing

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Delete the skill and close the guard unlock | — | f291ec0 |
| 2 | ✅ | Update tests and lint that enumerate `pwk-diagnose` | — | f1eacd8 |
| 3 | ✅ | Sweep docs and the executing-tasks reference | — | 7bbd11f |
| 4 | ✅ | Align `pwk-code-review` checklists with the four role contracts | — | 43bae93 |
| 5 | ✅ | Simplify remaining skills (clarity + redundancy pass) | — | (this commit) |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Delete the skill and close the guard unlock | Deleted `skills/pwk-diagnose/` outright and removed the name from the exported `UNLOCK_SKILLS`; the input handler already dereferences that export, so no handler change was needed. Added a guard test proving an invocation of a removed skill leaves the gated phase in place. | No |
| 2 | Update tests and lint that enumerate `pwk-diagnose` | Dropped the name from the lint's expected unlock list and utility roster and deleted its unlock-claim assertion; retargeted the workflow-consistency hook test to its surviving half and fixed two hard-coded skill counts (7 → 6, and the stale-count guard inverted); made the human-review-digests corpus list derive from the skills tree instead of a literal list, so a future removal cannot leave it reading a missing file; removed the now-unused marker. | Yes — the design doc's checklist named three more test sites than actually referenced the token, and one listed site (`workflow-consistency.e2e.test.ts`) broke on a skill *count* rather than the token. Folded both in. |
| 3 | Sweep docs and the executing-tasks reference | Removed the skill from README (table row, tree line, unlock prose, workflow diagram, heading count), workflow-phases, the usage guide (block + its debugging-loop paragraph + phase line + unlock set), and the oversight model (bullet + unlock prose + phase line); dropped only the parenthetical example from the executing skill's mid-execution recording rule; added an Unreleased CHANGELOG entry. | Yes — the design doc placed the phase line in `docs/workflow-phases.md`; it actually lived in the usage guide and oversight model. Verified `package.json` names no skill (the doc said sweep, not change). |
| 4 | Align `pwk-code-review` checklists with the four role contracts | Ported the four role checklists into steps 2–5 of the review skill: tracing and the hazard audit verbatim, the spec checklist plus its coverage table, and the smell item list with the role's flag-for-the-main-agent direction inverted to match the unlocked inline path. Process, reporting, and framing sections untouched. | Yes — tracing could not be verbatim: the role says "integration tests", a phrase the stale-terminology guard bans in this file, so it reads "the acceptance criteria and the feature E2E". The spec coverage table keys to the design doc's headings instead of a packet, which the inline path never has. |
| 5 | Simplify remaining skills (clarity + redundancy pass) | Canonicalized the four skills' shared pre-flight prose to one wording each for the root check, the discovery frame, the umbrella parenthetical, and the recursion example, and added a lint assertion pinning all four; collapsed the code digest's inline fence comments into the canonical rules block below it (keeping the 15-line Flow cap, `[R<n>]` tagging and `was:` semantics untouched) and dropped the third restatement of the write-once rule in the ship step; turned the tags reference into a four-column table pointing at each tag's point of use; deleted the superseded seed notes. | Yes — the tags-reference compression moved the checkpoint enum from a header line into table cells, so two tests that pinned the old prose shape were updated to pin the table cell (same enum, same absence of `spec`), and a marker was added for the new shape. |
