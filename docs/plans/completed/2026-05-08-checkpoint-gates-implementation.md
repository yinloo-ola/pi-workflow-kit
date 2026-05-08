# Implementation: Checkpoint gates and pre-commit discipline

Design: `docs/plans/2026-05-08-checkpoint-gates-design.md`

## Overview

Update two skill files so that:
1. `writing-plans` generates task bodies with checkpoint gates and numbered refactor/lessons steps, never includes `git commit`
2. `executing-tasks` becomes a simplified plan-following runner with status-enforced checkpoint gates

## Task 1: Update writing-plans task format and checkpoint labels

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Files:
- `skills/writing-plans/SKILL.md`

Changes:

### Task format section

Replace the task format section. Key changes:
- Remove `git commit` from bullet points (commit is the executing-tasks skill's responsibility)
- Remove `<!-- checkpoint: none -->` from the default template (omit when no checkpoint)
- Add task body examples for each checkpoint type (none, test, done, both)
- For checkpointed tasks, include numbered refactor and lessons steps
- For checkpointed tasks, include `⏸ CHECKPOINT` gate in the task body
- No task body should include `git commit`

### Checkpoint labels section

Replace the checkpoint labels table. Change the last column from "What happens during execution" to "What the plan should include", showing the gate structure for each checkpoint type.

### TDD section

Remove "→ commit" from the Instructions column — commit is not part of the plan.

## Task 2: Update executing-tasks per-task execution and progress file

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Files:
- `skills/executing-tasks/SKILL.md`

Changes:

### Per-task execution section

Replace the current 15-step list with a simplified plan-following runner:

1. Mark `🔄 in-progress` in progress file
2. Read the current task from the plan
3. Execute each numbered step in order
4. When hitting `⏸ CHECKPOINT` in the plan:
   - Update progress to `⏸ test-review` or `⏸ done-review`
   - Present the checkpoint review
   - Wait for human approval
   - On approval, update progress back to `🔄 in-progress`
   - Continue with the next step
5. After all steps done:
   - `git add` and commit with a clear message
   - Update progress to `✅ done` + record commit hash

Remove the inline refactor/lessons steps — they're now in the plan for checkpointed tasks.

### Progress file section

Add `⏸ test-review` and `⏸ done-review` status values. Add enforcement rule: agent cannot go from `🔄 in-progress` → `✅ done` if task has a checkpoint.

### Checkpoint review section

Update `checkpoint: done` review to include:
- **Refactoring done:** field
- **Lessons learned:** field
- **Diff:** uses `git diff --cached` or `git diff`, with "do NOT commit first"

Simplify available actions (remove "Adjust plan" since the plan drives execution).

### Keep unchanged

- Before you start, First run, Resume, User override commands, Receiving code review, If you're stuck, After all tasks
