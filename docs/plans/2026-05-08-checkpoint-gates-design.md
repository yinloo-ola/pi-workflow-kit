# Design: Checkpoint gates and pre-commit discipline

## Problem

The `executing-tasks` skill instructs the agent to pause at checkpoints for human review before committing. In practice, the agent commits first then presents the review, defeating the purpose of checkpoints.

Root causes in executing-tasks:
1. "PAUSE if" reads as optional — the agent interprets it as "if you remember"
2. Steps 6-12 flow together as implement→commit — the pause gets swallowed
3. The diff format asks for committed state — nudges the agent to commit first

Root causes in writing-plans:
4. Task format says `git commit` after each task — the agent sees the commit line past the checkpoint and skips to it
5. Refactor and lessons are optional-sounding steps at the end of a long list — the agent skips them
6. The plan body has no structural enforcement — everything is just text the agent reads at once

Secondary issue: the agent skips steps 9 (Refactor if needed) and 10 (Learn from mistakes) because they're optional-sounding steps at the end of a long list.

## Key insight

The agent follows numbered steps and skips loose sections. **Output requirements** (things the agent has to produce) are stronger than instructions (things the agent is told to do). The checkpoint review format forces the agent to report refactoring and lessons — that's the enforcement mechanism.

No-checkpoint tasks are simple enough that refactor/lessons genuinely aren't needed — the task author chose no checkpoint because the task is trivial.

## Solution

- **writing-plans**: Generate task bodies with numbered steps (including refactor/lessons for checkpointed tasks) and checkpoint gates. Never include `git commit` in the plan.
- **executing-tasks**: Simplified runner — follow the plan step by step, pause at checkpoint gates, commit after approval.
- **Progress file**: Use Status column to enforce checkpoint gates. Agent can't go from `🔄 in-progress` → `✅ done` if the task has a checkpoint — must go through `⏸ test-review` or `⏸ done-review` first.

## Design

### Writing-plans: task format

The plan never includes `git commit`. That's the executing-tasks skill's responsibility.

**No-checkpoint task:**

```markdown
## Task 1: Create User model

<!-- tdd: new-feature -->
<!-- checkpoint: none -->

Files:
- `src/user/model.ts`
- `src/user/model.test.ts`

Steps:
1. Write failing test for User model creation
2. Run test — confirm it fails
3. Implement User model
4. Run test — confirm it passes
```

**Checkpoint: test task:**

```markdown
## Task 2: Write auth tests

<!-- tdd: new-feature -->
<!-- checkpoint: test -->

Files:
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement login handler
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.
```

**Checkpoint: done task:**

```markdown
## Task 3: Add login endpoint

<!-- tdd: new-feature -->
<!-- checkpoint: done -->

Files:
- `src/auth/login.ts`
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails
3. Implement login handler
4. Run test — confirm it passes
5. Add edge case tests (invalid password, missing email)
6. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
7. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```

**Task with both checkpoints:**

```markdown
## Task 4: Complex auth flow

<!-- tdd: new-feature -->
<!-- checkpoint: test -->
<!-- checkpoint: done -->

Steps:
1. Write failing test for auth flow
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement auth flow
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```

### Writing-plans: checkpoint labels table

| Checkpoint | When to use | What the plan should say |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Numbered steps only |
| **`checkpoint: test`** | Test design matters | Steps up to test → `⏸ CHECKPOINT: test` → implement steps (including refactor/lessons) |
| **`checkpoint: done`** | Implementation review matters | Steps (including refactor/lessons) → `⏸ CHECKPOINT: done` |
| Both | Non-obvious tests AND complex logic | Steps up to test → `⏸ CHECKPOINT: test` → implement steps (including refactor/lessons) → `⏸ CHECKPOINT: done` |

### Executing-tasks: simplified runner

The per-task execution becomes:

1. Mark `🔄 in-progress` in progress file
2. Read the current task from the plan
3. Execute each numbered step in order
4. When hitting `⏸ CHECKPOINT` in the plan:
   - Update progress to `⏸ test-review` or `⏸ done-review`
   - Present the checkpoint review (see format below)
   - Wait for human approval
   - On approval, update progress back to `🔄 in-progress`
   - Continue with the next step
5. After all steps are done (or for no-checkpoint tasks, after steps + commit):
   - `git add` and commit with a clear message
   - Update progress to `✅ done` + record commit hash

### Progress file: Status-enforced gates

Status values:

| Status | Meaning |
|--------|---------|
| `⬜ pending` | Not started |
| `🔄 in-progress` | Currently executing plan steps |
| `⏸ test-review` | Paused at checkpoint: test, waiting for human approval |
| `⏸ done-review` | Paused at checkpoint: done, waiting for human approval |
| `✅ done` | Committed successfully |
| `❌ failed` | Could not complete |
| `⏭ skipped` | User chose to skip |

Enforcement rules:
- Agent cannot go from `🔄 in-progress` → `✅ done` if the task has a checkpoint
- Must go through `⏸ test-review` or `⏸ done-review` first
- Can only return to `🔄 in-progress` after human says "approve"
- Can only go to `✅ done` after commit

Example progress file:

```markdown
# Progress: Auth feature

Plan: docs/plans/2026-05-08-auth-implementation.md
Branch: auth-feature
Started: 2026-05-08T10:00:00Z
Last updated: 2026-05-08T10:05:00Z

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✅ done | Create User model | abc123 |
| 2 | ⏸ done-review | Add login endpoint (checkpoint: done) | — |
| 3 | ⬜ pending | Add auth middleware (checkpoint: done) | — |
```

### Checkpoint review format

For `checkpoint: test`:

```
⏸ Paused at checkpoint: test for task [N]

**Test written:** [show test code]
**Expected behavior:** [what this validates]
**Next:** Continue implementing after approval

**Available actions:**
- **Approve** — continue to implementation
- **Request changes** — describe what to change
- **Revert** — undo this task and mark it back to pending
- `skip` — skip this task
- `stop` — pause here, resume later with `/skill:executing-tasks`
```

For `checkpoint: done`:

```
⏸ Paused at checkpoint: done for task [N]

**What was done:** [brief summary]
**Refactoring done:** [what changed, or "none needed — [reason]"]
**Lessons learned:** [new rule added, or "none"]
**Diff:** [run `git diff --cached` or `git diff` — do NOT commit first]
**Next:** Commit after approval

**Available actions:**
- **Approve** — commit and move to next task
- **Request changes** — describe what to change
- **Revert** — undo this task and mark it back to pending
- `skip` — skip this task
- `stop` — pause here, resume later with `/skill:executing-tasks`
```

## Files to change

- `skills/writing-plans/SKILL.md` — update task format template and checkpoint labels section
- `skills/executing-tasks/SKILL.md` — simplify per-task execution to plan-following runner, update progress file status values

## What stays the same

- executing-tasks: Before you start, First run, Resume, User override commands, Receiving code review, If you're stuck, After all tasks — all unchanged
- writing-plans: Process steps, vertical slices, TDD section — all unchanged
