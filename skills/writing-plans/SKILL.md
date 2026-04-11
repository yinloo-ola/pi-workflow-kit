---
name: writing-plans
description: "Use this to break a design into an implementation plan with bite-sized TDD tasks. Works with or without a prior brainstorm."
---

# Writing Plans

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Check for a design doc & workspace** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. Verify you're on the feature branch (or in its worktree) created during brainstorming. If no design doc exists, ask the user to describe what they want to build, read relevant code, create a branch, and create the plan directly.
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

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
