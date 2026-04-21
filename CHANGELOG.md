# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.0] - 2026-04-11

### Added

- **Checkpoint review gates** — optional `checkpoint: test` and `checkpoint: done` labels on tasks in the implementation plan. The agent pauses at checkpoints for human review before proceeding. The agent assigns checkpoints based on complexity; the user can adjust when reviewing the plan.
- **Workspace setup in brainstorming** — brainstorming now creates the feature branch (or worktree) before committing the design doc, keeping `main` clean.
- **Merge strategy options in finalizing** — finalizing skill offers merge strategy choices (merge commit, squash, rebase) when completing a PR.

## [0.6.0] - 2026-04-10

### Changed

- **Complete rewrite**: replaced 25 extension files (~4,400 lines), 8 skills (~1,530 lines), 4 agent definitions, 3 custom tools, 2 custom commands, and complex session-based state persistence with 1 extension file (67 lines) and 4 skills (146 lines).

### Removed

- **Workflow monitor extension** (workflow-monitor.ts + 15-module workflow-monitor/ directory) — phase tracking, TDD warnings, debug enforcement, verification gating, branch safety, skip-confirmation gates, boundary prompts, and all session-based state persistence.
- **Plan tracker extension** (plan-tracker.ts) — per-task progress tool with TUI widget.
- **Subagent extension** (subagent/ directory, 7 files) — child process spawning for isolated implementation/review.
- **4 agent definitions** (implementer, worker, code-reviewer, spec-reviewer).
- **3 custom tools** (`plan_tracker`, `workflow_reference`, `subagent`).
- **2 custom commands** (`/workflow-next`, `/workflow-reset`).
- **4 supporting skills**: `test-driven-development`, `systematic-debugging`, `using-git-worktrees`, `receiving-code-review`, `dispatching-parallel-agents`.
- All 434 existing tests.

### Added

- **workflow-guard extension** (67 lines) — hard-blocks `write`/`edit` outside `docs/plans/` during brainstorm and plan phases. No state persistence. No custom tools.
- **4 simplified skills**:
  - `brainstorming` — explore, design, write design doc
  - `writing-plans` — break design into tasks with TDD scenarios, set up branch/worktree
  - `executing-tasks` — implement tasks with TDD discipline, handle code review
  - `finalizing` — archive docs, update changelog, create PR
- TDD three-scenario guidance merged into `writing-plans` and `executing-tasks` skills.
- Code review handling guidance merged into `executing-tasks` skill.
- Git worktree setup guidance merged into `writing-plans` skill.
- 6 unit tests for the workflow-guard extension.

### Design decisions

- Skills teach the agent *what* to do. The extension enforces *one* rule: no source writes during thinking phases.
- You control phases explicitly via `/skill:` commands. No auto-detection, no auto-advancing.
- `bash` stays available during brainstorm/plan for investigation commands. The theoretical bash-write loophole is accepted.
- No state persistence — phase resets on reload, you invoke the skill again.

## [0.8.1] - 2026-04-20

### Changed

- **Bash guard supports compound commands** — `&&`, `||`, `;` chains are now split and each sub-command is individually checked against the safe/destructive lists. Pipes (`|`) remain unsplit to allow `git log | head`-style usage.

### Fixed

- **Workflow guard write-blocking bug** — the tool_call handler returned `{ blocked: true }` instead of `{ block: true }`, so writes were never actually blocked during brainstorm/plan phases.
- **Skill matching was unanchored** — `/skill:finalizing` incorrectly matched `/skill:finalizing-extra` patterns; now requires `\b` word boundary.

## [0.8.0] - 2026-04-18

### Added

- **Bash guard during brainstorm/plan** — `bash` tool calls are restricted to a read-only allowlist (grep, find, cat, git status/log/diff, etc.). Destructive commands (rm, mv, install, git mutations, sudo, editors) are hard-blocked.

## [Unreleased]

### Added

- **Safe commands expansion** — allowlisted `cd`, GitHub CLI read-only subcommands (`gh pr view/list/diff/checks/status`, `gh issue view/list`, `gh repo view/fork/list`, `gh release view/list/download`, `gh run view/list`), and git read-only subcommands (`blame`, `shortlog`, `stash list`, `tag -l/--list`, `describe`).
- **Harmless redirect stripping** — `2>/dev/null` and `2>&1` are stripped before pattern matching, fixing false blocks on common stderr suppression.
- **Extracted `shouldBlockFilePath()`** — file-path blocking logic extracted into a testable pure function.
- **4 `shouldBlockFilePath` tests** — validates that only `docs/plans/` subtree is writable during brainstorm/plan, blocks directory itself and absolute paths.
- **Removed 5 tautological tests** — replaced `expect(true).toBe(true)` blocking logic stubs with the real `shouldBlockFilePath` tests.

### Fixed

- **`git stash list` and `git tag -l` falsely blocked** — destructive pattern now uses negative lookaheads `(?!\s+list)` and `(?!\s+(-l|--list))` to allow read-only variants while still blocking mutations.

[Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.8.1...HEAD
[0.8.1]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.7.0
[0.6.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.6.0
[0.5.1]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.5.0
