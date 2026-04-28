---
name: executing-tasks
description: "Use this to implement an approved plan task-by-task. Run after writing-plans, before finalizing."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` task by task, with file-based progress tracking and session-aware context management.

## Before you start

1. **Check git state** — run `git status` and `git log --oneline -5`. Note any uncommitted changes.
2. **Find the plan** — look for `docs/plans/*-implementation.md`. If multiple exist, ask the user which one to execute.
3. **Check for existing progress** — look for `docs/plans/*-progress.md`. If one exists matching the plan, this is a **resume** (see [Resume](#resume)). If not, this is a **first run** (see [First run](#first-run)).

## First run

1. **Parse the implementation plan** — read the plan and extract all `## Task N:` headings. Build the progress table with all tasks as `⬜ pending`.
2. **Create the progress file** — save to `docs/plans/<plan-name>-progress.md` (replace `-implementation` with `-progress` in the plan filename):

   ```markdown
   # Progress: <topic>

   Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
   Branch: <current-branch>
   Started: <ISO timestamp>
   Last updated: <ISO timestamp>

   | # | Status | Task | Commit |
   |---|--------|------|--------|
   | 1 | ⬜ pending | Task description (preserve checkpoint labels) | — |
   ```

3. **Suggest workspace isolation** — if the user isn't already on a feature branch or worktree, present the options:

   - **Branch** (smaller changes):
     ```
     git checkout -b <feature-name>
     ```
   - **Worktree** (larger features, keeps main clean):
     ```
     git worktree add ../<repo>-<feature-name> -b <feature-name>
     ```

   Derive `<feature-name>` from the plan doc (e.g. `docs/plans/2026-04-16-auth-design.md` → `auth`). Ask the user which they prefer, then wait for confirmation before proceeding.

4. **Commit the plan docs** — if `docs/plans/` has uncommitted files, commit them on the new branch:
   ```
   git add docs/plans/ && git commit -m "docs: add design and implementation plan"
   ```

5. **Begin task execution** — start with task 1 (see [Per-task execution](#per-task-execution)).

## Resume

1. **Read the progress file** — find the first task with status `⬜ pending`, `❌ failed`, or `🔄 in-progress`.
2. **Handle in-progress task** — if a task is `🔄 in-progress` (mid-task crash):
   - Check `git log --oneline` since the last `✅ done` task's commit
   - If commits exist: ask the user — "Task N was in progress and commits were made. Continue from here, or reset it to pending?"
   - If no commits: restart the task (reset to `🔄 in-progress` and begin)
3. **Handle failed task** — if a task is `❌ failed`:
   - Show the failure reason from the progress file
   - Ask: "Retry, skip, or abort?"
4. **Handle pending task** — proceed normally
5. **All done** — if no `⬜ pending` or `❌ failed` tasks remain, show summary and suggest `/skill:finalizing`
6. **Begin task execution** — proceed from the identified task

## Progress file

**Path:** `docs/plans/<plan-name>-progress.md`

**Status values:**

| Status | Meaning |
|--------|---------|
| `⬜ pending` | Not started |
| `🔄 in-progress` | Currently being worked on |
| `✅ done` | Committed successfully |
| `❌ failed` | Could not complete (append `Failed: <reason>`) |
| `⏭ skipped` | User chose to skip |

**Update rules:**
- Mark `🔄 in-progress` immediately when starting a task
- Mark `✅ done` + record commit hash only after successful `git commit`
- Mark `❌ failed` + append reason when the agent can't proceed after retrying
- Mark `⏭ skipped` when the user says "skip"
- Update `Last updated` timestamp on every change
- Preserve checkpoint labels in the task description column

## Per-task execution

For each task the agent works on:

1. **Mark in-progress** — update the progress file: `🔄 in-progress`
2. **Read only the relevant task** — grep/jump to `## Task N:` in the implementation plan. Do not read the entire plan.
3. **Implement** — follow the TDD discipline (see [TDD discipline](#tdd-discipline)) and checkpoint flow (see [Checkpoints](#checkpoints))
4. **Commit** — `git add` the relevant files and commit with a clear message
5. **Update progress** — mark `✅ done` + record the commit hash
6. **Check next task** — look at the next task in the progress file:
   - **Has checkpoint** → pause for review (see [Checkpoint review](#checkpoint-review))
   - **No checkpoint** → continue to the next task

## Checkpoints

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

## TDD discipline

Follow the TDD scenario from the plan:

- **New feature**: write the test first, see it fail, then implement
- **Modifying tested code**: run existing tests before and after
- **Trivial change**: use judgment

Don't skip tests because "it's obvious." The test is the contract.

## Batching and session management

After completing ~3-5 non-checkpoint tasks in the same session, suggest a fresh session:

```
✅ Tasks 3-5 done (commits: a1b2, e4f5, i7j8)

Progress: 5/10 tasks done

⏭  Next: Task 6 — Add auth middleware (no checkpoint)

💡 Context is building up. For clean context on remaining tasks:
   /new  then  /skill:executing-tasks
   (or just say "continue" to keep going here)
```

The user can say "continue" to keep going in the same session. Respect their choice.

Also suggest `/new` at checkpoint review pauses when multiple tasks have been completed since the last session break.

## User override commands

The user can issue these commands at any time during execution:

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current task `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Mark current task back to `⬜ pending`, suggest `/new` |
| `retry` | Re-read current task section, start over |

## Receiving code review

When the user shares code review feedback:

1. **Verify the criticism** — read the relevant code. Is the feedback accurate?
2. **Evaluate the suggestion** — is the proposed fix the right approach? Consider alternatives.
3. **Implement or push back** — if valid, fix it. If not, explain why with evidence from the codebase.
4. **Don't blindly implement** — every suggestion should be verified against the code before accepting.

## If you're stuck

- Re-read the current task section from the plan — you may have drifted from the spec
- Check git log — recent commits may reveal context
- Ask the user — it's better to clarify than to guess wrong

## After all tasks

When no `⬜ pending` or `❌ failed` tasks remain, show a summary:

```
✅ All tasks complete!

| # | Status | Task |
|---|--------|------|
| 1 | ✅ done | Create User model |
| 2 | ✅ done | Write User model tests |
| 3 | ⏭ skipped | Add auth middleware |

Ready to ship? Run `/skill:finalizing`
```
