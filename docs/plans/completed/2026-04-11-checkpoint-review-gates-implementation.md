# Checkpoint Review Gates: Implementation Plan

## Tasks

### Task 1: Update writing-plans/SKILL.md — add checkpoint field and agent guidance

**Scenario:** Trivial (docs)

**File:** `skills/writing-plans/SKILL.md`

Add a "Checkpoint labels" section after "TDD in the plan" with the optional `checkpoint` field, values, and agent guidance. Also update the TDD table to show how checkpoints interact with each scenario.

After the "TDD in the plan" section, add:

```
## Checkpoint labels

Optionally label each task with a `checkpoint` to require human review before proceeding:

| Checkpoint | When to use | What happens during execution |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Auto-advance, no pause |
| **`checkpoint: test`** | Test design matters (API contracts, edge cases, complex behavior) | Pause after writing the failing test, before implementing |
| **`checkpoint: done`** | Implementation review matters (complex logic, security, performance) | Pause after implementation + tests pass, before committing |

Use judgment when assigning checkpoints. Prefer `checkpoint: test` for new features with non-obvious test design. Prefer `checkpoint: done` for tasks where the implementation approach is debatable. Most tasks should not need a checkpoint. The user can adjust checkpoints when reviewing the plan.
```

Also update the "Task format" section — after the `git commit` bullet, add:

```
- Optional `checkpoint: test` or `checkpoint: done` label
```

**Commit:** `feat(writing-plans): add checkpoint labels for review gates`

### Task 2: Update executing-tasks/SKILL.md — handle checkpoints in per-task lifecycle

**Scenario:** Trivial (docs)

**File:** `skills/executing-tasks/SKILL.md`

Replace the "Per-task lifecycle" section with checkpoint-aware flows. Add a "Checkpoint review" section.

Replace the existing "Per-task lifecycle" section with:

```
## Per-task lifecycle

Check each task for a `checkpoint` label and follow the appropriate flow:

### No checkpoint (auto-advance)

1. **Implement** — write the code as described in the plan
2. **Run tests** — verify the changes work
3. **Fix if needed** — if tests fail, debug and fix before moving on
4. **Commit** — `git add` the relevant files and commit with a clear message

### checkpoint: test

1. **Write the test** — follow the TDD scenario for the task
2. **Pause for review** — show what was done and the diff, then wait for human input
3. **Continue** — implement, run tests, fix if needed
4. **Commit** — `git add` the relevant files and commit with a clear message

### checkpoint: done

1. **Implement** — write the code as described in the plan
2. **Run tests** — verify the changes work
3. **Fix if needed** — if tests fail, debug and fix before moving on
4. **Pause for review** — show what was done and the diff, then wait for human input
5. **Commit** — `git add` the relevant files and commit with a clear message
```

After the "TDD discipline" section, add:

```
## Checkpoint review

When pausing at a checkpoint, present:

```
⏸ Paused at checkpoint: [test|done] for task [N]

**What was done:** [brief summary]
**Diff:** [show relevant diff]

Review and let me know how to proceed.
```

Wait for the human to respond. They may:
- Approve and continue
- Request changes to the test or implementation
- Ask to revert the task
- Adjust the remaining plan
```

**Commit:** `feat(executing-tasks): add checkpoint review gates`
