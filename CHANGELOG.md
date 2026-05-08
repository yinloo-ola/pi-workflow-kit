# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.14.0] - 2026-05-09

### Changed

- **Writing-plans concrete code guidance** — added "Level of detail" section requiring plans to include copy-pasteable code (SQL schemas, type definitions, function bodies, test assertions) instead of vague summaries like "implement bookmark model".
- **Writing-plans checkpoint gates** — rewrote checkpoint handling with explicit rules: checkpoints must fire BEFORE any `git add`/`git commit`, code stays uncommitted until human approval, and `checkpoint: done` now uses `git diff` (not `git diff --cached`) since nothing should be staged.
- **Executing-tasks simplified** — replaced the complex multi-step executor with a straightforward plan-following runner with status-driven flow. Removed redundant verification and review steps in favor of a cleaner loop.
- **Skill trigger clarifications** — updated brainstorming and diagnose skill descriptions for more accurate auto-triggering.

## [0.13.0] - 2026-05-08

### Added

- Lessons learned: persistent rules file (`docs/lessons.md`) read at every workflow phase and written to when the agent catches repeat mistakes. Survives `/new` sessions.

## [0.13.2] - 2026-05-08

### Changed

- **Migrated to @earendil-works** — peer dependencies updated from `@mariozechner/*` to `@earendil-works/pi-coding-agent`. Dropped unused `@mariozechner/pi-ai` and `@mariozechner/pi-tui` peer deps. Added `@earendil-works/pi-coding-agent` as devDependency for IDE type resolution.
- **Executing-tasks worktree handoff** — when the user chooses worktree isolation, the agent now moves plan docs into the worktree, commits the removal on the current branch, and stops with a handoff message instead of continuing execution in the wrong directory.

## [0.11.0] - 2026-05-04

### Changed

- **Brainstorming convergence** — agent now self-assesses after each question and presents a summary when it can articulate what, why, and constraints. Human decides when to move on (no fixed question limit).
- **Brainstorming codebase exploration** — step now includes grepping for related functionality, checking dependencies and module structure, with explicit guidance to read only what's necessary.
- **Brainstorming design presentation** — sections are now "one screen of reading" instead of 200-300 words. Agent must present each section for human approval before continuing, and incorporate feedback before re-presenting.
- **Brainstorming doc commit** — branch creation, committing, and workspace setup now fully delegated to executing-tasks.
- **Writing-plans task sizing** — "2-5 minutes of work" replaced with "one committed, testable change" since agents can't measure wall-clock time.
- **Writing-plans read-only header** — replaced misleading "read-only exploration" with explicit "you may only create or edit files under docs/plans/."
- **Writing-plans scope flagging** — large designs (~15+ tasks) now flagged to human with option to reduce scope or proceed (no longer assumes reduction).
- **Writing-plans ordering** — vertical slice ordering now explicitly prohibits separate infrastructure tasks; shared infrastructure must be included in the first slice that needs it.
- **Executing-tasks plan reading** — "read only the relevant task" replaced with selective reading: overview section + all task headings + current task body.
- **Executing-tasks workspace isolation** — reordered to happen before progress file creation so the branch field is accurate.
- **Executing-tasks checkpoint review** — split into two distinct templates: checkpoint: test shows test code with expected behavior; checkpoint: done shows implementation diff. Both show next task for context.
- **Finalizing archive** — `mv` commands now gracefully handle missing files with `2>/dev/null || true`.

### Added

- **Writing-plans plan review** — new step 3: present complete plan to human and wait for approval before suggesting execution.
- **Writing-plans incomplete design handling** — agent now fills gaps in incomplete design docs by asking the human.
- **Writing-plans test scope** — tasks now require tests covering happy path and at least one edge case or error path.
- **Writing-plans cross-task dependencies** — tasks can reference types from earlier tasks (e.g., `import { User } from Task 2`) instead of requiring complete code.
- **Executing-tasks plan-not-found** — explicit error message when no implementation plan exists, directing user to writing-plans.
- **Executing-tasks task verification** — new step 8: re-read task from plan and verify implementation satisfies every requirement before proceeding.
- **Executing-tasks next-task preview** — checkpoint reviews now show the next task so humans can evaluate whether current approach scales.

## [0.10.0] - 2026-05-02

### Added

- **Diagnose skill** — standalone 6-phase debugging loop (build feedback loop → reproduce → minimize → hypothesise → instrument → fix → cleanup). Invoked on demand with `/skill:diagnose`.
- **Design-it-twice in brainstorming** — approaches now include concrete interface sketches (types, method signatures, caller code) for grounded comparison.
- **ADRs in brainstorming** — lightweight architecture decision records written to `docs/plans/adr/` for hard-to-reverse, surprising, trade-off decisions. Archived during finalizing.
- **Vertical slices in planning** — guidance for end-to-end task structure with horizontal slicing called out as an anti-pattern.
- **Refactoring checklist in executing-tasks** — post-test-pass checks for shallow modules, deletion test, duplication, and seam discipline using depth/seam/locality vocabulary.
- **ADR archival in finalizing** — finalizing now archives `docs/plans/adr/` to `docs/plans/completed/adr/` alongside design docs.

## [0.9.0] - 2026-04-30

### Added

- **Safe commands expansion** — allowlisted `cd`, GitHub CLI read-only subcommands (`gh pr view/list/diff/checks/status`, `gh issue view/list`, `gh repo view/fork/list`, `gh release view/list/download`, `gh run view/list`), and git read-only subcommands (`blame`, `shortlog`, `stash list`, `tag -l/--list`, `describe`).
- **Harmless redirect stripping** — `2>/dev/null` and `2>&1` are stripped before pattern matching, fixing false blocks on common stderr suppression.
- **Extracted `shouldBlockFilePath()`** — file-path blocking logic extracted into a testable pure function.
- **4 `shouldBlockFilePath` tests** — validates that only `docs/plans/` subtree is writable during brainstorm/plan, blocks directory itself and absolute paths.

### Fixed

- **`git stash list` and `git tag -l` falsely blocked** — destructive pattern now uses negative lookaheads to allow read-only variants while still blocking mutations.

## [0.8.3] - 2026-04-22

### Added

- **Go read-only commands** — `go doc`, `go list`, `go version`, and `go env` are now allowlisted during brainstorm and plan phases.

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


[0.14.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.13.2...v0.14.0
[0.13.2]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.13.1...v0.13.2
[Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.14.0...HEAD
[0.11.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.9.0...v0.10.0
[0.7.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.7.0
[0.6.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.6.0
[0.5.1]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.5.0
