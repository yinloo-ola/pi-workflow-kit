---
name: executing-tasks
description: "Use this to implement an approved plan task-by-task. Run after writing-plans, before finalizing."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` task by task.

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

## TDD discipline

Follow the TDD scenario from the plan:

- **New feature**: write the test first, see it fail, then implement
- **Modifying tested code**: run existing tests before and after
- **Trivial change**: use judgment

Don't skip tests because "it's obvious." The test is the contract.

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

## Receiving code review

When the user shares code review feedback:

1. **Verify the criticism** — read the relevant code. Is the feedback accurate?
2. **Evaluate the suggestion** — is the proposed fix the right approach? Consider alternatives.
3. **Implement or push back** — if valid, fix it. If not, explain why with evidence from the codebase.
4. **Don't blindly implement** — every suggestion should be verified against the code before accepting.

## If you're stuck

- Re-read the plan — you may have drifted from the spec
- Check git log — recent commits may reveal context
- Ask the user — it's better to clarify than to guess wrong

## After all tasks

Ask: "All tasks done? Run `/skill:finalizing` to ship."
