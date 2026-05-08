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

   e. **Do not proceed with task execution.** The session ends here.

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
2. **Read the plan selectively** — read the plan's overview section (everything before `## Task 1:`). Skim all `## Task N:` headings for dependency awareness. Then read the current task's body in full. **Read `docs/lessons.md` if it exists** — follow all rules listed there while working on this task.
3. **Write the test** — for `new-feature`: write a failing test. For `modifying-tested-code`: run existing tests first. For `trivial`: skip steps 3-5, go to step 6.
4. **Run the test** — confirm it fails (new-feature) or passes (modifying-tested-code). Fix if needed.
5. **⏸ PAUSE if `checkpoint: test`** — present the [checkpoint review](#checkpoint-review) below. Wait for human input. On changes, update and re-present at this same pause.
6. **Implement** — write the code to make the test pass.
7. **Run tests** — verify everything passes. If tests fail and you cannot fix them after retrying, see [If you're stuck](#if-youre-stuck). If still stuck, mark the task `❌ failed` with the reason in the progress file and move to the next task.
8. **Verify against task description** — re-read the task from the plan. Does the implementation satisfy every requirement in the description? If not, fix before proceeding.
9. **Refactor if needed** — after all tests pass, check for refactoring opportunities:
   - **Shallow modules** — is the interface nearly as complex as the implementation? Can complexity be hidden behind a simpler interface?
   - **Deletion test** — if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
   - **Duplication** — extract repeated patterns
   - **Seam discipline** — don't introduce abstraction unless something actually varies across it. One adapter = hypothetical seam. Two adapters = real seam

   Run tests after each refactor step. Never refactor while tests are failing.
10. **Learn from mistakes** — if you caught yourself making a mistake during this task that you've made before or that would apply to future tasks, append a rule to `docs/lessons.md`. Only add rules that would change future behavior. If the file doesn't exist, create it with the standard format (see below). Do not add one-off errors or things you self-corrected immediately.

    **`docs/lessons.md` format:**
    ```markdown
    # Lessons Learned

    <!--
    Agent: read this at the start of each task during executing-tasks.
    Follow every rule. Add new rules when you catch yourself making repeat mistakes.
    Retire rules that no longer apply during finalizing.
    -->

    ## Rules

    - <new rule here>
    ```
11. **⏸ PAUSE if `checkpoint: done`** — present the [checkpoint review](#checkpoint-review) below. Wait for human input. On changes, update and re-present at this same pause.
12. **Commit** — `git add` the relevant files and commit with a clear message.
13. **Update progress** — mark `✅ done` + record the commit hash.
14. **Suggest session break if needed** — after completing ~3-5 tasks since the last break, suggest:
    ```
    ✅ Tasks N-M done (commits: abc, def)
    Progress: X/Y tasks done
    ⏭  Next: Task [N+1] — [description]
    💡 Context is building up. For clean context on remaining tasks:
       /new  then  /skill:executing-tasks
       (or just say "continue" to keep going here)
    ```
    Also suggest at checkpoint review pauses when multiple tasks have been completed since the last break. Respect the user's choice if they say "continue".
15. **Loop** — go back to step 1 for the next `⬜ pending` task, or see [After all tasks](#after-all-tasks) if none remain.

## Checkpoint review

When pausing at a `checkpoint: test`, present the test code first:

```
⏸ Paused at checkpoint: test for task [N]

**Test written:**
[show the test code]

**Expected behavior:** [what this test validates]
**Next:** Task [N+1] — [description]

**Available actions:**
- **Approve** — continue to implementation (step 6)
- **Request changes** — describe what to change, I'll update and re-present
- **Revert** — undo this task and mark it back to pending
- **Adjust plan** — modify the remaining tasks in the implementation plan
- `skip` — skip this task and move on
- `stop` — pause here, start a fresh session later with `/skill:executing-tasks`
- `status` — show the full progress table
```

When pausing at a `checkpoint: done`, present the implementation review:

```
⏸ Paused at checkpoint: done for task [N]

**What was done:** [brief summary]
**Diff:** [show relevant diff]
**Next:** Task [N+1] — [description]

**Available actions:**
- **Approve** — continue to the next task
- **Request changes** — describe what to change, I'll update and re-present
- **Revert** — undo this task and mark it back to pending
- **Adjust plan** — modify the remaining tasks in the implementation plan
- `skip` — skip this task and move on
- `stop` — pause here, start a fresh session later with `/skill:executing-tasks`
- `status` — show the full progress table
```

Wait for the human to respond. On **request changes**, make the edits, then re-present at the same checkpoint. Repeat until approved.

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
