# Design: Executing Tasks Redesign

**Date:** 2026-04-28
**Status:** Approved

## Problem

The current `executing-tasks` skill has three issues:

1. **No progress tracking** — tasks are iterated in-memory with no file-based state. If the session crashes or the user starts a new session, all progress is lost.
2. **High token consumption** — the entire plan, all implementation work, and accumulated tool outputs stay in a single session. Even with auto-compaction, the LLM re-reads the full plan repeatedly.
3. **No context separation** — one monolithic thread handles everything. Early tasks' tool outputs bleed into later tasks' context.

## Solution Overview

Introduce a **progress file** as the single source of truth for task state, and design the skill to work naturally across **multiple sessions** with fresh context.

### Core Principles

- The progress file is the state — not the session, not git history
- Each task is an isolated unit of work — the agent reads only what it needs
- The agent suggests `/new` (fresh session) at natural break points
- Resume is trivial — re-invoke the skill, it reads the progress file and picks up

## Progress File

**Path:** `docs/plans/YYYY-MM-DD-<topic>-progress.md`

Created by `executing-tasks` on first run by parsing the implementation plan.

**Format:**

```markdown
# Progress: auth

Plan: docs/plans/2026-04-28-auth-implementation.md
Branch: auth
Started: 2026-04-28T10:00:00Z
Last updated: 2026-04-28T10:45:00Z

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✅ done | Create User model | a1b2c3d |
| 2 | ✅ done | Write User model tests | e4f5g6h |
| 3 | 🔄 in-progress | Add login endpoint | — |
| 4 | ⬜ pending | Write login tests | — |
| 5 | ⏭ skipped | checkpoint: test — Add auth middleware | — |
```

**Status values:**

| Status | Meaning |
|--------|---------|
| `⬜ pending` | Not started |
| `🔄 in-progress` | Currently being worked on |
| `✅ done` | Committed successfully |
| `❌ failed` | Could not complete (with reason appended) |
| `⏭ skipped` | User chose to skip |

**Rules:**

- Mark `🔄 in-progress` immediately when starting a task
- Mark `✅ done` + record commit hash only after successful `git commit`
- Mark `❌ failed` + append `Failed: <reason>` when the agent can't proceed after retrying
- Mark `⏭ skipped` when the user says "skip"
- Update `Last updated` timestamp on every change
- Preserve checkpoint labels from the plan in the task description

## Implementation Plan Format

No file splitting. Keep one `implementation.md` but enforce a strict heading format:

```markdown
## Task 1: Create User model

<!-- tdd: new-feature -->
<!-- checkpoint: none -->

- Create `src/models/user.ts`...
```

The agent reads the progress file to find the current task number, then reads only that task's section from the implementation plan (via grep/jump to heading).

## Session Lifecycle

### First Run

1. Read progress file → doesn't exist
2. Parse implementation.md, create progress file with all tasks as `⬜ pending`
3. Ensure on correct branch / worktree (same as current skill)
4. Read task 1 section, begin work

### Continuing in Same Session

After completing a non-checkpoint task:
1. Update progress file: current task → `✅ done`
2. Peek at next task:
   - **Has checkpoint** → pause for review (stay in session)
   - **No checkpoint** → continue working on next task
3. After ~3-5 non-checkpoint tasks, suggest `/new`:

```
✅ Tasks 3-5 done (commits: a1b2, e4f5, i7j8)

Progress: 5/10 tasks done

⏭  Next: Task 6 — Add auth middleware (no checkpoint)

💡 Context is building up. For clean context on remaining tasks:
   /new  then  /skill:executing-tasks
   (or just say "continue" to keep going here)
```

### Resuming in a New Session

1. Read progress file → find first `⬜ pending` or `❌ failed` task
2. Read that task's section from implementation.md
3. Continue work — no re-reading of earlier tasks

### Checkpoint Review

Same as current skill — show what was done, show the diff, wait for user approval:

```
⏸ Paused at checkpoint: test for task 4

**What was done:** [brief summary]
**Diff:** [show relevant diff]

Review and let me know how to proceed.
```

## Resume & Failure Recovery

| Scenario | What the agent sees | What it does |
|----------|-------------------|--------------|
| **Clean resume** | Next task is `⬜ pending` | Read task section, start working |
| **Mid-task crash** | A task is `🔄 in-progress` | Check git log since last done task. If commits exist → ask user to verify. If no commits → restart the task |
| **Failed task** | A task is `❌ failed` | Show failure reason, ask: retry, skip, or abort? |
| **All done** | No `⬜ pending` or `❌ failed` | Show summary, suggest `/skill:finalizing` |
| **No progress file** | File doesn't exist | Parse implementation.md, create progress file, start from task 1 |
| **Skipped tasks remain** | `⏭ skipped` tasks exist | Noted in finalizing, no action during execution |

## User Override Commands

Available at any time during execution:

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current task `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Mark current task back to `⬜ pending`, suggest `/new` |
| `retry` | Re-read current task section, start over |

## Changes to Other Skills

### writing-plans (minor)

- Enforce `## Task N: <description>` heading format
- Optional metadata comments: `<!-- tdd: ... -->` and `<!-- checkpoint: ... -->`
- Everything else stays the same

### finalizing (minor)

- Warn on skipped tasks before archiving: "Tasks 4 and 7 were skipped. Continue with finalizing, or go back?"
- Archive the progress file to `docs/plans/completed/`
- Use progress file for PR/commit summaries instead of re-reading the full plan

### brainstorming

- No changes
