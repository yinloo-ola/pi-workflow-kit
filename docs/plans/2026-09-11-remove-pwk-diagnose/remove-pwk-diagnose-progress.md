# Progress: remove-pwk-diagnose

Design: docs/plans/2026-09-11-remove-pwk-diagnose/remove-pwk-diagnose-design.md
Branch: remove-pwk-diagnose
Started: 2026-09-11T09:49:37Z
Last updated: 2026-09-11T11:40:00Z
Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Delete the skill and close the guard unlock | — | f291ec0 |
| 2 | ✅ | Update tests and lint that enumerate `pwk-diagnose` | — | f1eacd8 |
| 3 | ✅ | Sweep docs and the executing-tasks reference | — | 7bbd11f |
| 4 | ✅ | Align `pwk-code-review` checklists with the four role contracts | — | 43bae93, b1bbb5d |
| 5 | ✅ | Simplify remaining skills (clarity + redundancy pass) | — | 1187f03 |
| 6 | ✅ | One folder per topic — a single-part topic and an umbrella share one shape | — | 03261b5 |
| 7 | ✅ | Both flows share one identity model (local umbrella detection, one slug, one disposal path) | — | 03261b5, b1bbb5d |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Delete the skill and close the guard unlock | Deleted `skills/pwk-diagnose/` outright and removed the name from the exported `UNLOCK_SKILLS`; the input handler already dereferences that export, so no handler change was needed. Added a guard test proving an invocation of a removed skill leaves the gated phase in place. | No |
| 2 | Update tests and lint that enumerate `pwk-diagnose` | Dropped the name from the lint's expected unlock list and utility roster and deleted its unlock-claim assertion; retargeted the workflow-consistency hook test to its surviving half and fixed two hard-coded skill counts (7 → 6, and the stale-count guard inverted); made the human-review-digests corpus list derive from the skills tree instead of a literal list, so a future removal cannot leave it reading a missing file; removed the now-unused marker. | Yes — the design doc's checklist named three more test sites than actually referenced the token, and one listed site (`workflow-consistency.e2e.test.ts`) broke on a skill *count* rather than the token. Folded both in. |
| 3 | Sweep docs and the executing-tasks reference | Removed the skill from README (table row, tree line, unlock prose, workflow diagram, heading count), workflow-phases, the usage guide (block + its debugging-loop paragraph + phase line + unlock set), and the oversight model (bullet + unlock prose + phase line); dropped only the parenthetical example from the executing skill's mid-execution recording rule; added an Unreleased CHANGELOG entry. | Yes — the design doc placed the phase line in `docs/workflow-phases.md`; it actually lived in the usage guide and oversight model. Verified `package.json` names no skill (the doc said sweep, not change). |
| 4 | Align `pwk-code-review` checklists with the four role contracts | Ported the four role checklists into steps 2–5 of the review skill: tracing and the hazard audit verbatim, the spec checklist plus its coverage table, and the smell item list with the role's flag-for-the-main-agent direction inverted to match the unlocked inline path. Process, reporting, and framing sections untouched. | Yes — tracing could not be verbatim: the role says "integration tests", a phrase the stale-terminology guard bans in this file, so it reads "the acceptance criteria and the feature E2E". The spec coverage table keys to the design doc's headings instead of a packet, which the inline path never has. Follow-up (b1bbb5d): the spec reviewer recorded R4 as a gap because nothing pinned the alignment — the design had left role↔skill mirroring to a commit-message note — so Check 13c in `tests/skill-lint.mjs` now matches all twelve checklist items line-complete in both files, pins the three sanctioned divergences, and was mutation-verified in both directions. |
| 5 | Simplify remaining skills (clarity + redundancy pass) | Canonicalized the four skills' shared pre-flight prose to one wording each for the root check, the discovery frame, the umbrella parenthetical, and the recursion example, and added a lint assertion pinning all four; collapsed the code digest's inline fence comments into the canonical rules block below it (keeping the 15-line Flow cap, `[R<n>]` tagging and `was:` semantics untouched) and dropped the third restatement of the write-once rule in the ship step; turned the tags reference into a four-column table pointing at each tag's point of use; deleted the superseded seed notes. | Yes — the tags-reference compression moved the checkpoint enum from a header line into table cells, so two tests that pinned the old prose shape were updated to pin the table cell (same enum, same absence of `spec`), and a marker was added for the new shape. |
| 6 | One folder per topic — a single-part topic and an umbrella share one shape | Migrated this topic's own docs into `docs/plans/2026-09-11-remove-pwk-diagnose/` with undated leaf stems, then rewrote every creation, discovery, and disposal path in the four discovery skills plus README, AGENTS, workflow-phases, the usage guide, the oversight model, and the lessons glob to the one folder form. Re-anchored the byte-identical finalize-disposal pins in `tests/code-digest.test.ts` and `tests/skill-lint.mjs` to the folder commands, and the S1 discovery-frame pin to the topic wording. | Yes — the design left the leaf filename open; the leaf keeps the `<leaf>-` prefix so the folder name repeats (`remove-pwk-diagnose/remove-pwk-diagnose-design.md`) rather than nesting a second directory, keeping depth uniform at one level for a single-leaf topic and an umbrella alike. This topic's migration happened mid-flight, so finalize uses the folder path for it while the flat path stays covered by tests. |
| 7 | Both flows share one identity model | Made umbrella detection folder-local in `pwk-finalizing` (the rule `pwk-executing-tasks` already stated), defined `<topic>` as the folder slug in both skills so the branch and worktree probes agree, replaced the roster-successor next-part hint with the first-part-with-no-done-progress predicate, pinned the roster heading and item shape in the lint, removed the retired "integration tests"/"integration gate" prose, and stated disposal precedence so the flat globs never run for a folder topic. Follow-up (b1bbb5d): the tracing reviewer found the E2E's `is the folder slug` assertion was satisfied only by the worktree-cleanup sentence, so the topic-set derivation now states the rule as well. | Yes — R6 and R7 land as one commit: their edits interleave in the same lines of `pwk-finalizing` and `pwk-executing-tasks` (the folder paths and the rules that read them), so splitting would have been cosmetic rather than informative. The precedence assertion pins the phrase "the folder command is the disposal" rather than "folder move", because the delete path is `rm -rf`, not a move. |

## Code digest

### Summary

The kit ships one skill fewer and one planning-artifact shape. `skills/pwk-diagnose/` is deleted and the guard's unlock list lost its entry, so `/skill:pwk-diagnose` no longer resolves and a gated phase stays gated — `CHANGELOG.md` is the only place the name survives. Every topic, single-part or umbrella, now lives in `docs/plans/<date>-<topic>/`, which makes "umbrella" a property (how many leaves the folder holds) rather than a second layout, and the four discovery skills share one identity model for it. Alongside that, the code-review skill's four checklists come from the reviewer role contracts and are lint-pinned to them, and the six surviving skills carry one canonical wording for the prose they all repeat.

### Flow

Spine
  `/skill:pwk-diagnose` -> [R1] `SKILL_TO_PHASE` misses, `UNLOCK_SKILLS.some()` misses -> phase unchanged (still gated)
  topic folder `docs/plans/<date>-<topic>/` -> [R6] leaf design + progress + packet -> [R2] lint roster + unlock parity -> [R3] inventory docs -> `npm run check`
Branches
  ⚠️ a topic has more than one leaf -> an `overview.md` beside the design doc -> [R7] the roster is read there and nowhere else   was: a repo-wide `docs/plans/**/overview.md` search, which let a sibling umbrella route this finalize
  finalize disposes -> [R6][R7] the folder command is the disposal; the flat globs run only for a legacy flat topic   was: the per-topic flat globs ran alongside the folder move for every topic
  `pwk-code-review` runs -> [R4] steps 2–5 carry the four role checklists, now pinned to them   was: skill-local prose with nothing watching the alignment
  a role contract's checklist item is edited -> [R4] Check 13c fails `npm run check`   was: the drift was silent

### Gotchas

- [ALERT] The legacy flat-topic path is prose-only (tracing-reviewer finding 1). Discovery and disposal still carry the `????-??-??-<topic>-*` globs so pre-folder topics resume and ship, but no test builds a flat fixture and finalizes it — a broken flat glob would stay green. Deliberate: a migration script was rejected, and the flat path drains on its own.
- [ALERT] The sibling-umbrella rule is pinned as prose, not by a fixture (tracing-reviewer finding 2). The topic-set derivation is skill prose with no executable seam, so R7.1 is asserted as "the repo-wide rule is absent, the folder-local rule is present"; a two-folder regression test would first require the derivation to be code.
- [ALERT] R4's checklist alignment was moved from a commit-message obligation to a lint pin (spec-reviewer finding; fixed in `b1bbb5d`). Check 13c matches all twelve items line-complete, so an appended clause fails — mutation-verified in both directions before landing.
- [ALERT] The E2E's `is the folder slug` assertion was satisfied only by the worktree-cleanup sentence, not the topic-set derivation where the rule matters (tracing-reviewer finding 3; fixed in `b1bbb5d`).
- Three divergences from the role contracts are sanctioned and now pinned as such: the tracing object phrase reads "the acceptance criteria and the feature E2E" because "integration tests" is banned in that file, the spec table is keyed to the design doc's headings because the inline path has no packet, and the smell direction is inverted for the unlocked skill.
- The feature E2E scans git-tracked files, matching the design's clean-tree precondition; scenario 1 reads `skills/` from the filesystem, so an untracked stray is still caught.

### Key files

- `extensions/workflow-guard.ts` — the unlock array loses one entry; the input handler already dereferences it, so gating follows with no handler edit.
- `skills/pwk-finalizing/SKILL.md` — folder-local umbrella detection, one meaning for `<topic>`, and folder disposal with stated precedence over the legacy flat globs.
- `skills/pwk-executing-tasks/SKILL.md` — the folder-form progress and packet paths, the folder-slug branch convention, and the first-unbuilt next-part predicate.
- `skills/pwk-brainstorming/SKILL.md` — the topic folder is created here, and the `## Parts (build order)` roster is defined and pinned.
- `tests/skill-lint.mjs` — roster/unlock parity, the S1 shared-sentence pin, and Check 13c's role↔skill alignment pin.
