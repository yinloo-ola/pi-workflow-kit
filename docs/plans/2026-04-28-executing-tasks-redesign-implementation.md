# Implementation Plan: Executing Tasks Redesign

**Design:** `docs/plans/2026-04-28-executing-tasks-redesign-design.md`

## Task 1: Rewrite executing-tasks skill — progress file and startup flow

<!-- tdd: modifying-tested-code -->
<!-- checkpoint: done -->

Rewrite `skills/executing-tasks/SKILL.md` with the new startup and resume logic.

**File to modify:** `/Users/yinlootan/.nvm/versions/node/v22.16.0/lib/node_modules/@tianhai/pi-workflow-kit/skills/executing-tasks/SKILL.md`

Replace the entire file with the new skill content. The new skill has these sections:

1. **Startup flow** — check git state, find the implementation plan (glob `docs/plans/*-implementation.md`), check for existing progress file (`docs/plans/*-progress.md`)
2. **First run** — parse the implementation plan for `## Task N:` headings, create a progress file with all tasks as `⬜ pending`, then proceed to workspace isolation and task execution
3. **Resume** — read the progress file, find the first `⬜ pending`, `❌ failed`, or `🔄 in-progress` task, and continue from there
4. **Mid-task crash recovery** — if a task is `🔄 in-progress`, check `git log` since the last `✅ done` task's commit. If commits exist, ask the user to verify. If no commits, restart the task
5. **Workspace isolation** — keep the existing branch/worktree suggestion logic (unchanged from current skill)
6. **Commit plan docs** — keep the existing logic to commit uncommitted plan files on the new branch

The frontmatter stays:
```
---
name: executing-tasks
description: "Use this to implement an approved plan task-by-task. Run after writing-plans, before finalizing."
---
```

The progress file format section should include the full table structure and all 5 status values (`⬜ pending`, `🔄 in-progress`, `✅ done`, `❌ failed`, `⏭ skipped`).

After editing, verify by reading the file back. No tests needed — this is a markdown skill file.

```
git add skills/executing-tasks/SKILL.md
git commit -m "rewrite(executing-tasks): progress file, startup flow, and resume logic"
```

## Task 2: Add per-task execution, batching, and session management to executing-tasks

<!-- tdd: modifying-tested-code -->
<!-- checkpoint: done -->

Continue building on the rewritten skill file. Add the per-task execution sections.

**File to modify:** `/Users/yinlootan/.nvm/versions/node/v22.16.0/lib/node_modules/@tianhai/pi-workflow-kit/skills/executing-tasks/SKILL.md`

Add these sections after the startup flow (append or integrate into the existing file from task 1):

### Per-task execution

For each task the agent works on:
1. Mark task `🔄 in-progress` in the progress file
2. Read only the relevant `## Task N:` section from the implementation plan (not the whole file)
3. Implement following the existing TDD discipline and checkpoint logic (keep the current `checkpoint: test` and `checkpoint: done` flows verbatim)
4. After commit: update progress file with `✅ done` + commit hash
5. Check the next task:
   - **Has checkpoint** → pause for review
   - **No checkpoint** → continue to the next task in the same session

### Batching and /new suggestions

After completing ~3-5 non-checkpoint tasks in the same session, the agent should suggest a fresh session with this output format:

```
✅ Tasks 3-5 done (commits: a1b2, e4f5, i7j8)

Progress: 5/10 tasks done

⏭  Next: Task 6 — Add auth middleware (no checkpoint)

💡 Context is building up. For clean context on remaining tasks:
   /new  then  /skill:executing-tasks
   (or just say "continue" to keep going here)
```

The user can say "continue" to keep going in the same session.

### User override commands

Add a section for commands the user can issue at any time:

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current task `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Mark current task back to `⬜ pending`, suggest `/new` |
| `retry` | Re-read current task section, start over |

### After all tasks

When no `⬜ pending` or `❌ failed` tasks remain, show a summary and suggest `/skill:finalizing`.

Keep the existing "Receiving code review" and "If you're stuck" sections from the current skill — they're still useful.

After editing, verify by reading the file back.

```
git add skills/executing-tasks/SKILL.md
git commit -m "feat(executing-tasks): add per-task batching, session management, and user commands"
```

## Task 3: Update writing-plans skill — enforce task heading format

<!-- tdd: modifying-tested-code -->

Minor update to `writing-plans` to enforce the `## Task N:` heading format and metadata comments.

**File to modify:** `/Users/yinlootan/.nvm/versions/node/v22.16.0/lib/node_modules/@tianhai/pi-workflow-kit/skills/writing-plans/SKILL.md`

In the **Task format** section, add:

> Each task must use a numbered heading: `## Task N: <description>` where N starts at 1.
> 
> Optionally include metadata comments on the line after the heading:
> ```
> ## Task 1: Create User model
> 
> <!-- tdd: new-feature -->
> <!-- checkpoint: none -->
> ```
> 
> Valid TDD values: `new-feature`, `modifying-tested-code`, `trivial`
> 
> Valid checkpoint values: `none`, `test`, `done`
> 
> These comments are optional — if omitted, the agent infers TDD scenario and checkpoint from context.

Also update the checkpoint labels table to reference the `<!-- checkpoint: ... -->` comment format as the canonical way to specify checkpoints (while still supporting the inline label format as fallback).

After editing, verify by reading the file back.

```
git add skills/writing-plans/SKILL.md
git commit -m "docs(writing-plans): enforce Task N heading format with metadata comments"
```

## Task 4: Update finalizing skill — archive progress file and warn on skipped tasks

<!-- tdd: modifying-tested-code -->

Minor update to `finalizing` to handle the progress file.

**File to modify:** `/Users/yinlootan/.nvm/versions/node/v22.16.0/lib/node_modules/@tianhai/pi-workflow-kit/skills/finalizing/SKILL.md`

### Change 1: Archive progress file

In step 1 ("Move planning docs"), add the progress file to the archive command:
```
mv docs/plans/*-progress.md docs/plans/completed/
```

### Change 2: Warn on skipped tasks

Before step 1, add a new pre-check:

> **Check for skipped tasks** — if a progress file exists (`docs/plans/*-progress.md`), read it and check for any `⏭ skipped` tasks. If found, warn:
> 
> ```
> ⚠️ Tasks 4 and 7 were skipped. Continue with finalizing, or go back?
> ```
> 
> Wait for the user to confirm before proceeding.

### Change 3: Use progress file for summaries

In step 3 ("Choose a merge strategy"), when generating PR descriptions or squash commit messages, read the progress file to build a task-by-task summary:

> Use the progress file to generate the summary. Convert the task table to a bulleted list:
> ```
> - ✅ Create User model
> - ✅ Write User model tests
> - ⏭ Add auth middleware (skipped)
> - ✅ Add login endpoint
> ```

After editing, verify by reading the file back.

```
git add skills/finalizing/SKILL.md
git commit -m "feat(finalizing): archive progress file, warn on skipped tasks"
```

## Task 5: End-to-end review — read all four skill files and verify consistency

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Read all four skill files and verify they form a coherent workflow:

1. `skills/writing-plans/SKILL.md` — produces `*implementation.md` with `## Task N:` headings
2. `skills/executing-tasks/SKILL.md` — reads the plan, creates/maintains `*progress.md`, works across sessions
3. `skills/finalizing/SKILL.md` — archives `*progress.md`, warns on skipped tasks

Check for:
- [ ] Terminology is consistent across all three skills (status names, file paths, checkpoint labels)
- [ ] `executing-tasks` correctly describes how to parse the `## Task N:` format that `writing-plans` enforces
- [ ] `finalizing` correctly references the progress file path that `executing-tasks` creates
- [ ] No orphaned references to old behavior (e.g., no references to in-memory task tracking)
- [ ] The user override commands in `executing-tasks` are complete and non-contradictory

Fix any inconsistencies found. This is a checkpoint: done task — present the review findings and wait for approval before committing.

```
git add skills/
git commit -m "chore: consistency review across workflow skills"
```
