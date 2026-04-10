---
name: writing-plans
description: "Use this to break a design into an implementation plan with bite-sized TDD tasks. Run after brainstorming, before executing."
---

# Writing Plans

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Read the design doc** — find the latest `docs/plans/*-design.md`.
2. **Set up workspace** — create a branch for this work. For larger features, use a git worktree for isolation:
   ```
   git worktree add ../<repo>-<feature-name> -b <feature-name>
   ```
3. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

## Task format

Each task should be 2-5 minutes of work:

- Exact file paths to create/modify
- Complete code (not "add validation")
- Exact commands with expected output
- `git commit` after each task

## TDD in the plan

Label each task with its TDD scenario:

| Scenario | When | Instructions in the task |
|---|---|---|
| **New feature** | Adding new behavior | Write failing test → run it → implement → run it → commit |
| **Modifying tested code** | Changing existing behavior | Run existing tests first → modify → verify they pass → commit |
| **Trivial** | Config, docs, naming | Use judgment, commit when done |

## After the plan

Ask: "Ready to execute? Run `/skill:executing-tasks`"
