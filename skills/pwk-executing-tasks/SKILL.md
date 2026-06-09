---
name: executing-tasks
description: "Use this to implement an approved plan task-by-task. Run after writing-plans, before finalizing."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` task by task, with file-based progress tracking and session-aware context management.

## Before you start

1. **Check git state** — run `git status` and `git log --oneline -5`. Note any uncommitted changes.
2. **Find the plan** — look for `docs/plans/*-implementation.md`. If none exist, say "No implementation plan found. Run `/skill:writing-plans` first." and stop. If multiple exist, ask the user which one to execute.
3. **Check for existing progress** — look for `docs/plans/*-progress.md`. If one exists matching the plan, this is a **resume** (see [Resume](#resume)). If not, this is a **first run** (see [First run](#first-run)).

## First run

1. **Parse the implementation plan** — read the plan and extract all `## Task N:` headings. Build the progress table with all tasks as `⬜ pending`.
2. **Suggest workspace isolation** — if the user isn't already on a feature branch or worktree, present the options:

   - **Branch** (smaller changes):
     ```
     git checkout -b <feature-name>
     ```
   - **Worktree** (larger features, keeps main clean):
     ```
     git worktree add ../<repo>-<feature-name> -b <feature-name>
     ```

   Derive `<feature-name>` from the plan doc (e.g. `docs/plans/2026-04-16-auth-design.md` → `auth`). Ask the user which they prefer, then wait for confirmation before proceeding.

3. **If worktree was chosen — hand off to new session:**

   a. Ensure the worktree's `docs/plans/` directory exists:
      ```
      mkdir -p <worktree>/docs/plans
      mkdir -p <worktree>/docs/plans/adr
      ```

   b. Move plan docs into the worktree:
      ```
      mv docs/plans/*-design.md <worktree>/docs/plans/ 2>/dev/null || true
      mv docs/plans/*-implementation.md <worktree>/docs/plans/ 2>/dev/null || true
      mv docs/plans/*-progress.md <worktree>/docs/plans/ 2>/dev/null || true
      mv docs/plans/adr/*.md <worktree>/docs/plans/adr/ 2>/dev/null || true
      ```

   c. Commit the removal on the current branch (if any plan docs were committed):
      ```
      git rm docs/plans/*-design.md docs/plans/*-implementation.md docs/plans/*-progress.md 2>/dev/null || true
      git rm -r docs/plans/adr/ 2>/dev/null || true
      git commit -m "chore: move plan docs to worktree for <feature-name>"
      ```

   d. Stop and show the user:
      ```
      ✅ Worktree created at ../<repo>-<feature-name>
      📄 Plan docs moved to the worktree.

      To continue, start a new session there:
        cd ../<repo>-<feature-name> && pi

      Then run: /skill:executing-tasks
      ```

   e. **Create the progress file** in the worktree — save to `<worktree>/docs/plans/<plan-name>-progress.md`:

      ```markdown
      # Progress: <topic>

      Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
      Branch: <feature-name>
      Started: <ISO timestamp>
      Last updated: <ISO timestamp>

      | # | Status | Task | Commit |
      |---|--------|------|--------|
      | 1 | ⬜ pending | Task description (preserve checkpoint labels) | — |
      ```

      This ensures the new session in the worktree will detect the progress file and resume correctly.

   f. **Do not proceed with task execution.** The session ends here.

4. **If branch was chosen — continue with execution:**

   a. **Create the progress file** — save to `docs/plans/<plan-name>-progress.md` (replace `-implementation` with `-progress` in the plan filename):

      ```markdown
      # Progress: <topic>

      Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
      Branch: <actual branch name>
      Started: <ISO timestamp>
      Last updated: <ISO timestamp>

      | # | Status | Task | Commit |
      |---|--------|------|--------|
      | 1 | ⬜ pending | Task description (preserve checkpoint labels) | — |
      ```

      Use the actual branch name — whether it's the original branch or a new one from the isolation step.

   b. **Commit the plan docs** — if `docs/plans/` has uncommitted files, commit them on the new branch:
      ```
      git add docs/plans/ && git commit -m "docs: add design and implementation plan"
      ```

   c. **Begin task execution** — start with task 1 (see [Per-task execution](#per-task-execution)).

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
| `🔄 in-progress` | Currently executing plan steps |
| `⏸ test-review` | Paused at checkpoint: test, waiting for human approval |
| `⏸ done-review` | Paused at checkpoint: done, waiting for human approval |
| `✅ done` | Committed successfully |
| `❌ failed` | Could not complete (append `Failed: <reason>`) |
| `⏭ skipped` | User chose to skip |

**Update rules:**
- Mark `🔄 in-progress` immediately when starting a task
- Mark `⏸ test-review` or `⏸ done-review` when the agent reaches a `⏸ CHECKPOINT` gate in the plan — this must happen BEFORE any `git add` or `git commit`
- Can only return to `🔄 in-progress` after the human explicitly says "approve"
- Mark `✅ done` + record commit hash only after successful `git commit`
- Cannot go from `🔄 in-progress` → `✅ done` if the task has a checkpoint — must go through the review status first
- `git add` and `git commit` happen AFTER human approval, never before
- Mark `❌ failed` + append reason when the agent can't proceed after retrying
- Mark `⏭ skipped` when the user says "skip"
- Update `Last updated` timestamp on every change
- Preserve checkpoint labels in the task description column

## Per-task execution

For each task:

1. **Mark in-progress** — update the progress file: `🔄 in-progress`
2. **Read the plan** — read the plan's overview section (everything before `## Task 1:`). Skim all `## Task N:` headings for dependency awareness. Then read the current task's body in full. **Read `docs/lessons.md` if it exists** — follow all rules listed there while working on this task.
3. **Execute the plan steps** — follow each numbered step in the task body, in order. As you work, shift your cognitive focus through three frames:

   **QA Test frame** (when writing/running tests): Focus entirely on translating the task's `Given/When/Then` Acceptance Criteria into precise failing tests. Before running tests, verify the test environment is sandboxed — no real database connections, API calls, or live services. External dependencies must be mocked or stubbed. Ensure the test environment is isolated (e.g., `NODE_ENV=test`, `GO_ENV=test`, or equivalent for your stack).

   **Pragmatic Developer frame** (when implementing): Focus on the simplest possible code to make the tests green. Do not over-engineer or add code for future requirements. Keep complexity to a bare minimum.

   **Senior Refactoring frame** (when refactoring): Evaluate the craftsmanship of the code. Check for:
   - **Shallow modules** — is the interface nearly as complex as the implementation? Can complexity be hidden behind a simpler interface?
   - **Deletion test** — if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
   - **Duplication** — extract repeated patterns
   - **Seam discipline** — don't introduce abstraction unless something actually varies across it. One adapter = hypothetical seam. Two adapters = real seam

   Run tests after each refactor step. Never refactor while tests are failing.

   Stop at any `⏸ CHECKPOINT` gate (see [Checkpoint gates](#checkpoint-gates--when-the-plan-says-stop)).
4. **Verify against task description** — re-read the task from the plan. Does the implementation satisfy every requirement listed? If not, fix before proceeding.
5. **Learn from mistakes** — if you caught yourself making a mistake during this task that you've made before or that would apply to future tasks, append a rule to `docs/lessons.md`. Only add rules that would change future behavior. If the file doesn't exist, create it with the standard format (see below).

   Before writing, apply the **generalization test**: would this rule apply equally to a completely different feature or domain in this repo? If not, rewrite it — strip out specific service names, entity types, and domain concepts, and express the underlying pattern instead. If you can't express a generic form, don't write the rule.

   ❌ **Domain-specific** (only survives this sprint):
   > "Always validate `userId` before calling `UserProfile.Get`"

   ✅ **Generic** (applies across the whole repo):
   > "Always validate required ID fields at the service boundary — missing IDs should return 400, not 500"
6. **Commit** — after all steps are done (no checkpoint gates remain in the task), `git add` the relevant files and commit with a clear message.
7. **Update progress** — mark `✅ done` + record the commit hash.
8. **Suggest session break if needed** — after completing ~3-5 tasks since the last break, suggest:
   ```
   ✅ Tasks N-M done (commits: abc, def)
   Progress: X/Y tasks done
   ⏭  Next: Task [N+1] — [description]
   💡 Context is building up. For clean context on remaining tasks:
      /new  then  /skill:executing-tasks
      (or just say "continue" to keep going here)
   ```
   Also suggest at checkpoint review pauses when multiple tasks have been completed since the last break. Respect the user's choice if they say "continue".
9. **Loop** — go back to step 1 for the next `⬜ pending` task, or see [After all tasks](#after-all-tasks) if none remain.

### `docs/lessons.md` format

```markdown
# Lessons Learned

<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->

## Rules

- <new rule here>
```

When adding a new rule during execution, always append it under `## Rules`. The categorization into specific headers (e.g., `## Tool Usage`, `## Testing Patterns`) is done during finalizing — never during execution.

### Checkpoint gates — when the plan says STOP

The plan marks certain steps with `⏸ **CHECKPOINT: test**` or `⏸ **CHECKPOINT: done**`. These are hard stop points. When you reach one:

1. **Stop executing immediately.** Do not proceed to the next step in the task. Do not pass go.
2. **Do NOT run `git add` or `git commit`.** The code stays uncommitted until the human approves.
3. Update the progress file to `⏸ test-review` or `⏸ done-review`.
4. Present the checkpoint review (see below).
5. **Wait for the human to respond.** Do not continue executing steps, do not commit, do not move to the next task.
6. On approval, update progress back to `🔄 in-progress` and continue with the next step in the task.

The whole point of checkpoints is that the human reviews code at critical moments before the agent proceeds further. If you skip past a checkpoint without waiting, you defeat this purpose.

| Checkpoint type | What the agent has done at this point | What needs human approval |
|---|---|---|
| `checkpoint: test` | Written failing tests, confirmed they fail | The test design — are the right things being tested? |
| `checkpoint: done` | Implemented, refactored, written lessons | The implementation approach, the refactoring choices |

**For `checkpoint: test`:** Only the test file should exist at this point. No implementation code yet. The human reviews the test to confirm the right behavior is being specified.

**For `checkpoint: done`:** All code changes are made but NOT committed. Run `git diff` (not `git diff --cached` — nothing should be staged) to show the human what changed. The human reviews before anything is committed.

## Checkpoint review

When you hit a checkpoint gate, present a review to the human and **stop all execution** until they respond.

### At `checkpoint: test`

You have written the failing tests and confirmed they fail. No implementation code exists yet.

Present:
```
⏸ Paused at checkpoint: test for task [N]

**Test file:** `path/to/test.ts`

**Test code:**
[show the full test code]

**Test results:** [paste the failing test output showing which tests fail and why]

**What this validates:** [summarize the behavior these tests specify]
**Next step after approval:** Write the implementation to make these tests pass

What would you like to do?
- **approve** — I'll implement to make these tests pass
- **request changes** — tell me what to change in the tests
- **revert** — undo this task and go back to pending
- **skip** — skip this task entirely
- **stop** — pause here, resume later with /skill:executing-tasks
- **status** — show the full progress table
```

### At `checkpoint: done`

You have implemented the code, run the refactor step, and written any lessons. Nothing is committed yet.

Present:
```
⏸ Paused at checkpoint: done for task [N]

**What was done:** [brief summary — what feature/fix was implemented]

**Test results:** [run tests now, paste the passing output]

**Diff:** [run `git diff` — the unstaged changes are what this task produced]
[paste the full diff]

**Refactoring done:** [what changed during refactor, or "none needed — [reason]"]
**Lessons learned:** [new rule added to docs/lessons.md, or "none"]
**Next step after approval:** git add, commit, and move to next task

What would you like to do?
- **approve** — I'll commit and move to the next task
- **request changes** — tell me what to change, I'll update and re-present
- **revert** — undo this task and go back to pending
- **skip** — skip this task entirely
- **stop** — pause here, resume later with /skill:executing-tasks
- **status** — show the full progress table
```

**Do not commit before the human approves.** The diff you show at `checkpoint: done` is the uncommitted work. If the human requests changes, make the edits, re-run tests, and re-present the updated diff at the same checkpoint. Repeat until they say "approve".

Only after approval: `git add` the relevant files, commit, and mark the task `✅ done`.

## Progress file updates

Update the progress file by reading it, modifying the relevant row's status and commit hash, and writing it back. Target the specific task row — do not use pattern-matching approaches (e.g. sed) that could corrupt the table.

Update `Last updated` timestamp on every change.

## User override commands

The user can issue these commands at any time during execution:

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current task `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Mark current task back to `⬜ pending`, suggest `/new` |
| `retry` | Re-read current task section, start over |

## Receiving code review

When the user shares code review feedback (outside of a checkpoint pause):

1. **Verify the criticism** — read the relevant code. Is the feedback accurate?
2. **Evaluate the suggestion** — is the proposed fix the right approach? Consider alternatives.
3. **Implement or push back** — if valid, fix it, re-run tests, and amend the commit. If not, explain why with evidence from the codebase.
4. **Don't blindly implement** — every suggestion should be verified against the code before accepting.

## If you're stuck

1. Re-read the current task section from the plan — you may have drifted from the spec
2. Check git log — recent commits may reveal context
3. Ask the user — it's better to clarify than to guess wrong
4. If still stuck after asking, mark the task `❌ failed` with the reason in the progress file and move to the next task
5. **Check `docs/lessons.md`** — a previous lesson may be relevant to your current problem.

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
