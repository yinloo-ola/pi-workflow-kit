# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.2] - 2026-04-10

### Changed
- Bumped version to 0.5.2 for publishing updates.

## [0.5.1] - 2026-04-09

### Fixed
- **Phase not marked complete on natural transition**: Writing a design doc now immediately marks brainstorm as complete (not just active), enabling `/workflow-next plan` to work correctly. Same fix for implementation plan → plan phase.
- **Backward-navigation state reset during execute**: Writing plan files during execute/finalize phases (e.g. updating the plan) no longer triggers `advanceTo()` for earlier phases, which previously reset all workflow state to defaults.
- **`/workflow-reset` now clears plan-tracker tasks**: Emits a `plan_tracker_cleared` custom entry so the plan-tracker extension reconstructs to an empty task list after reset.
- **`/workflow-reset` now deletes stale state file**: Removes `.pi/workflow-kit-state.json` before re-persisting, preventing stale file-based state from shadowing the reset.

### Changed
- **Removed file-based state persistence**: The `.pi/workflow-kit-state.json` file is no longer written or read. The session journal (pi's `.jsonl` session files) is now the single source of truth for all workflow state, eliminating the dual-store timestamp-comparison logic that caused stale-state bugs.
- **Removed `getStateFilePath` export** and all file I/O from `reconstructState`.

## [0.5.0] - 2026-04-08

### Added

#### Simplified 4-phase workflow
- **brainstorm → plan → execute → finalize** workflow phases replacing the previous multi-step per-task lifecycle.
- Per-task phase and attempt tracking in the plan-tracker extension.
- Backward phase navigation prevention during skill re-invocation.
- Workflow monitor enforcement aligned to the 4-phase model (TDD gates, verification gates, skip-confirmation).

#### executing-tasks skill
- New skill with per-task lifecycle: define → approve → execute → verify → review → fix.
- Bounded retry loops (3 execute attempts, 3 fix attempts) with human escalation.
- Two-layer review: subagent review + human sign-off.
- Task type support (`code` / `non-code`) with TDD for code tasks and acceptance criteria for non-code tasks.

#### /workflow-next handoff state preservation
- Completed workflow phases are preserved across `/workflow-next` handoff for the same feature.
- Earlier-phase artifacts and prompted flags carry over to new sessions.
- TDD/debug/verification state resets fresh in each new session.
- Strict immediate-next-only validation — rejects same-phase, backward, and multi-phase jump handoffs.
- Derived workflow state module (`workflow-next-state.ts`).

#### /workflow-next autocomplete
- Phase name autocomplete (brainstorm, plan, execute, finalize).
- Artifact path autocomplete based on the target phase.
- `workflow-next-completions.ts` module.

#### Subagent model inheritance
- Child subagent processes inherit the parent session's provider and model when no pinned model is set.
- Agent-pinned models remain authoritative over inherited defaults.

#### Testing
- 461 tests across 44 test files covering all extensions, skills, and workflow transitions.
- Dedicated test suites for workflow-next validation, handoff state seeding, state-file migration, and model inheritance.

### Changed
- Project rebranded from `pi-superpowers-plus` to `@tianhai/pi-workflow-kit`.
- Removed 5 obsolete skills (creating-specs, implementing-plans, self-review, shipping-work, receiving-feedback) replaced by the unified `executing-tasks` skill.
- Updated writing-plans skill with task type and acceptance criteria support.
- Consolidated plan-tracker status/phase sync and backward branch search.

### Removed
- Obsolete planning docs and legacy workflow state files cleaned up.

[Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.5.0
