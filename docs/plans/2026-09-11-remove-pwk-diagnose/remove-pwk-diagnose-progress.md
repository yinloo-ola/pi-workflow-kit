# Progress: remove-pwk-diagnose

Design: docs/plans/2026-09-11-remove-pwk-diagnose/remove-pwk-diagnose-design.md
Branch: remove-pwk-diagnose
Started: 2026-09-11T09:49:37Z
Last updated: 2026-09-11T11:05:00Z
Feature phase: reviewing

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Delete the skill and close the guard unlock | — | f291ec0 |
| 2 | ✅ | Update tests and lint that enumerate `pwk-diagnose` | — | f1eacd8 |
| 3 | ✅ | Sweep docs and the executing-tasks reference | — | 7bbd11f |
| 4 | ✅ | Align `pwk-code-review` checklists with the four role contracts | — | 43bae93 |
| 5 | ✅ | Simplify remaining skills (clarity + redundancy pass) | — | 1187f03 |
| 6 | ✅ | One folder per topic — a single-part topic and an umbrella share one shape | — | 03261b5 |
| 7 | ✅ | Both flows share one identity model (local umbrella detection, one slug, one disposal path) | — | 03261b5 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Delete the skill and close the guard unlock | Deleted `skills/pwk-diagnose/` outright and removed the name from the exported `UNLOCK_SKILLS`; the input handler already dereferences that export, so no handler change was needed. Added a guard test proving an invocation of a removed skill leaves the gated phase in place. | No |
| 2 | Update tests and lint that enumerate `pwk-diagnose` | Dropped the name from the lint's expected unlock list and utility roster and deleted its unlock-claim assertion; retargeted the workflow-consistency hook test to its surviving half and fixed two hard-coded skill counts (7 → 6, and the stale-count guard inverted); made the human-review-digests corpus list derive from the skills tree instead of a literal list, so a future removal cannot leave it reading a missing file; removed the now-unused marker. | Yes — the design doc's checklist named three more test sites than actually referenced the token, and one listed site (`workflow-consistency.e2e.test.ts`) broke on a skill *count* rather than the token. Folded both in. |
| 3 | Sweep docs and the executing-tasks reference | Removed the skill from README (table row, tree line, unlock prose, workflow diagram, heading count), workflow-phases, the usage guide (block + its debugging-loop paragraph + phase line + unlock set), and the oversight model (bullet + unlock prose + phase line); dropped only the parenthetical example from the executing skill's mid-execution recording rule; added an Unreleased CHANGELOG entry. | Yes — the design doc placed the phase line in `docs/workflow-phases.md`; it actually lived in the usage guide and oversight model. Verified `package.json` names no skill (the doc said sweep, not change). |
| 4 | Align `pwk-code-review` checklists with the four role contracts | Ported the four role checklists into steps 2–5 of the review skill: tracing and the hazard audit verbatim, the spec checklist plus its coverage table, and the smell item list with the role's flag-for-the-main-agent direction inverted to match the unlocked inline path. Process, reporting, and framing sections untouched. | Yes — tracing could not be verbatim: the role says "integration tests", a phrase the stale-terminology guard bans in this file, so it reads "the acceptance criteria and the feature E2E". The spec coverage table keys to the design doc's headings instead of a packet, which the inline path never has. |
| 5 | Simplify remaining skills (clarity + redundancy pass) | Canonicalized the four skills' shared pre-flight prose to one wording each for the root check, the discovery frame, the umbrella parenthetical, and the recursion example, and added a lint assertion pinning all four; collapsed the code digest's inline fence comments into the canonical rules block below it (keeping the 15-line Flow cap, `[R<n>]` tagging and `was:` semantics untouched) and dropped the third restatement of the write-once rule in the ship step; turned the tags reference into a four-column table pointing at each tag's point of use; deleted the superseded seed notes. | Yes — the tags-reference compression moved the checkpoint enum from a header line into table cells, so two tests that pinned the old prose shape were updated to pin the table cell (same enum, same absence of `spec`), and a marker was added for the new shape. |
| 6 | One folder per topic — a single-part topic and an umbrella share one shape | Migrated this topic's own docs into `docs/plans/2026-09-11-remove-pwk-diagnose/` with undated leaf stems, then rewrote every creation, discovery, and disposal path in the four discovery skills plus README, AGENTS, workflow-phases, the usage guide, the oversight model, and the lessons glob to the one folder form. Re-anchored the byte-identical finalize-disposal pins in `tests/code-digest.test.ts` and `tests/skill-lint.mjs` to the folder commands, and the S1 discovery-frame pin to the topic wording. | Yes — the design left the leaf filename open; the leaf keeps the `<leaf>-` prefix so the folder name repeats (`remove-pwk-diagnose/remove-pwk-diagnose-design.md`) rather than nesting a second directory, keeping depth uniform at one level for a single-leaf topic and an umbrella alike. This topic's migration happened mid-flight, so finalize uses the folder path for it while the flat path stays covered by tests. |
| 7 | Both flows share one identity model | Made umbrella detection folder-local in `pwk-finalizing` (the rule `pwk-executing-tasks` already stated), defined `<topic>` as the folder slug in both skills so the branch and worktree probes agree, replaced the roster-successor next-part hint with the first-part-with-no-done-progress predicate, pinned the roster heading and item shape in the lint, removed the retired "integration tests"/"integration gate" prose, and stated disposal precedence so the flat globs never run for a folder topic. | Yes — R6 and R7 land as one commit: their edits interleave in the same lines of `pwk-finalizing` and `pwk-executing-tasks` (the folder paths and the rules that read them), so splitting would have been cosmetic rather than informative. The precedence assertion pins the phrase "the folder command is the disposal" rather than "folder move", because the delete path is `rm -rf`, not a move. |

## Code digest

### Summary

The kit ships one skill fewer: `skills/pwk-diagnose/` is deleted and the guard's unlock list lost its entry, so `/skill:pwk-diagnose` no longer resolves and a gated phase stays gated — `CHANGELOG.md` is the only place the name survives. In the same pass the code-review skill's four checklists now come from the canonical reviewer role contracts, so the inline path and the four delegated roles review the same things. The six surviving skills were then simplified behavior-neutrally: their shared pre-flight prose is verbatim-identical and lint-pinned, and the executing skill's code-digest explanation and tags reference each collapse to a single layer.

### Flow

Spine
  `/skill:pwk-diagnose` -> [R1] `SKILL_TO_PHASE` lookup misses, `UNLOCK_SKILLS.some()` misses -> phase unchanged (still gated)
  `skills/` listing -> [R1] six surviving skill dirs -> [R2] lint roster + unlock parity -> [R3] inventory docs -> `npm run check`
Branches
  ⚠️ `pwk-code-review` invoked (inline or per-requirement) -> [R4] steps 2–5 carry the four role checklists   was: skill-local prose
  role-contract checklist edited -> mirrored into `pwk-code-review` by hand — R5's lint pins the shared pre-flight sentences, not the checklists
  a doc or test names a removed skill -> [R2][R3] parity checks fail loudly   was: a path a reader could follow to nothing

### Gotchas

- [ALERT] R4's checklist alignment has no pinning test — the design deliberately left role↔skill mirroring to a commit-message obligation. The spec reviewer recorded R4 as `gap` on exactly that basis; the alignment itself was verified by hand and is faithful modulo the divergences below.
- The tracing checklist cannot read verbatim: the role says "integration tests", a phrase this repo bans in that file as stale terminology, so it reads "the acceptance criteria and the feature E2E". The spec checklist likewise keys its coverage table to the design doc's headings and drops the role's reporting lines, because the inline path has no packet.
- `pwk-code-review` stays unlocked: where the smell role flags large refactors for a main agent, the skill applies the fix, re-greens, and commits.
- The feature E2E scans git-tracked files, matching the design's clean-tree precondition; an untracked stray under `skills/` is still caught, since scenario 1 reads that directory from the filesystem.

### Key files

- `extensions/workflow-guard.ts` — the unlock array loses one entry; the input handler already dereferences it, so gating follows with no handler edit.
- `skills/pwk-code-review/SKILL.md` — steps 2–5 now carry the four reviewer checklists.
- `skills/pwk-executing-tasks/SKILL.md` — the mid-execution recording rule keeps its obligation and loses the example; digest and tags reference collapse to one layer each.
- `tests/skill-lint.mjs` — unlock/roster lists shrink to six skills, and a new check pins the four shared pre-flight sentences.
- `tests/remove-pwk-diagnose.e2e.test.ts` — the acceptance gate: tree, guard export, repo-wide content scan, roster/count coherence.
