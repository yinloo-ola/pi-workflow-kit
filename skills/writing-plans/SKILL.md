---
name: writing-plans
description: "Use this to break a design into an implementation plan with bite-sized TDD tasks. Works with or without a prior brainstorm."
---

# Writing Plans

You may only create or edit files under `docs/plans/`. Do not modify source code or configuration.

## Process

1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. If the design doc is incomplete, fill gaps by asking the human. If no design doc exists, ask the user to describe what they want to build and read relevant code.
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`. If the design is too large for ~15 tasks, flag this to the human and ask whether to reduce scope or proceed with the full plan.
3. **Present the plan** — show the complete plan to the human. Wait for approval before suggesting execution.

## Task format

Each task should produce one committed, testable change:

- Exact file paths to create/modify
- Complete code (not "add validation"). For tasks that depend on types or utilities from earlier tasks, reference them explicitly (e.g., `import { User } from Task 2`) and include only the new code
- Exact commands with expected output
- `git commit` after each task
- Optional `checkpoint: test` or `checkpoint: done` label
- Each task's tests should cover the happy path and at least one edge case or error path

Each task must use a numbered heading:

```markdown
## Task N: <description>

<!-- tdd: new-feature -->
<!-- checkpoint: none -->
```

...where N starts at 1 and incrementally numbers each task in the plan.

The metadata comments (placed right after the heading) are optional. If omitted, the executing-tasks skill infers the TDD scenario and checkpoint from context. When in doubt, include them explicitly.

Valid TDD values: `new-feature`, `modifying-tested-code`, `trivial`

Valid checkpoint values: `none`, `test`, `done`


## Vertical slices

Each task should be a **vertical slice** — a thin path through ALL relevant layers end-to-end, delivering one complete piece of observable behavior.

```
WRONG (horizontal):
  Task 1: Create database schema for users
  Task 2: Write user API endpoints
  Task 3: Build user UI components
  Task 4: Wire everything together

RIGHT (vertical):
  Task 1: User can sign up (model + endpoint + validation + test)
  Task 2: User can log in (auth check + token + test)
  Task 3: User can view profile (query + endpoint + test)
```

Order tasks so each one can be verified independently and delivers a complete vertical slice. If a task requires infrastructure (models, types) that no previous task has created, include it in that task — don't create it as a separate task.

Vertical slices ensure every committed task leaves the codebase in a testable state and reduces the blast radius of a bad task.

## TDD in the plan

Label each task with its TDD scenario:

| Scenario | When | Instructions in the task |
|---|---|---|
| **New feature** | Adding new behavior | Write failing test → run it → implement → run it → commit |
| **Modifying tested code** | Changing existing behavior | Run existing tests first → modify → verify they pass → commit |
| **Trivial** | Config, docs, naming | Use judgment, commit when done |

## Checkpoint labels

Optionally label each task with a `checkpoint` to require human review before proceeding:

| Checkpoint | When to use | What happens during execution |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Auto-advance, no pause |
| **`checkpoint: test`** | Test design matters (API contracts, edge cases, complex behavior) | Pause after writing the failing test, before implementing |
| **`checkpoint: done`** | Implementation review matters (complex logic, security, performance) | Pause after implementation + tests pass, before committing |

Use judgment when assigning checkpoints. Prefer `checkpoint: test` for new features with non-obvious test design. Prefer `checkpoint: done` for tasks where the implementation approach is debatable. Most tasks should not need a checkpoint. The user can adjust checkpoints when reviewing the plan.

## After the plan

Ask: "Ready to execute? Run `/skill:executing-tasks`"
