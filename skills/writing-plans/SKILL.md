---
name: writing-plans
description: "Use this to break a design into an implementation plan with bite-sized TDD tasks. Works with or without a prior brainstorm."
---

# Writing Plans

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. If no design doc exists, ask the user to describe what they want to build and read relevant code.
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

## Task format

Each task should be 2-5 minutes of work:

- Exact file paths to create/modify
- Complete code (not "add validation")
- Exact commands with expected output
- `git commit` after each task
- Optional `checkpoint: test` or `checkpoint: done` label

Each task must use a numbered heading:

```markdown
## Task N: <description>

<!-- tdd: new-feature -->
<!-- checkpoint: none -->
```

...where N starts at 1 and incrementally numbers each task in the plan.

The metadata comments (placed right after the heading) are optional but recommended. If present, they help the executing-tasks skill parse the plan correctly.

Valid TDD values: `new-feature`, `modifying-tested-code`, `trivial`

Valid checkpoint values: `none`, `test`, `done`

These comments are optional — if omitted, the agent infers TDD scenario and checkpoint from context.

Also use the `<!-- tdd: ... -->` and `<!-- checkpoint: ... -->` metadata comments to specify options explicitly. The inline `checkpoint: test` / `checkpoint: done` label format (e.g. in a task list) is also supported as a fallback, but the metadata comment is the canonical source.


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
