# Checkpoint Review Gates for Task Execution

## Problem

Executing-tasks runs through tasks without pausing. There's no way for the human to review tests before implementation, or review implementation before committing. The TDD labels in plans are advisory, not enforceable. There's no configuration for review gates.

## Design

Add optional `checkpoint` labels to individual tasks in the implementation plan. Executing-tasks pauses at checkpoint boundaries for human review.

## Checkpoint labels

Each task can optionally include a `checkpoint` label:

- **`checkpoint: test`** — pause after writing the failing test, before implementing
- **`checkpoint: done`** — pause after implementation + tests pass, before committing
- **No label** — auto-advance, no pause

The label is orthogonal to the TDD scenario. A "new feature" task with `checkpoint: test` means: write failing test → pause → implement → run tests → commit. Without a checkpoint, the same task flows straight through.

## Who sets checkpoints

The agent decides which tasks get checkpoints during plan writing, based on complexity and risk. The user reviews the plan before execution and can add, remove, or change checkpoints.

## Changes

### writing-plans/SKILL.md

Add `checkpoint` as an optional field in the task format section, with the two values and the "no label means auto-advance" rule. Update the TDD table to show how checkpoints interact with each scenario. Add guidance for the agent on when to use each checkpoint value.

### executing-tasks/SKILL.md

Update the per-task lifecycle to handle checkpoints:

- **No checkpoint** — existing flow unchanged
- **`checkpoint: test`** — write failing test → show diff → pause for review → proceed based on human input → implement → run tests → fix if needed → commit
- **`checkpoint: done`** — implement → run tests → fix if needed → show diff → pause for review → proceed based on human input → commit

The pause is a simple conversation stop — the agent shows what was done and the diff, then waits. The human can say anything: change the test, tweak the implementation, approve, revert, adjust the plan. No rigid menu.

Pause message format:

```
⏸ Paused at checkpoint: [test|done] for task [N]

**What was done:** [brief summary]
**Diff:** [show relevant diff]

Review and let me know how to proceed.
```
