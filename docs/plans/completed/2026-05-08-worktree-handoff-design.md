# Worktree Handoff: Stop & Restart in New Directory

## Problem

When the user asks the agent to create a worktree during `executing-tasks`, the agent creates the worktree on disk but continues running in the original directory. All subsequent file operations, git commands, and task execution happen in the wrong place.

Pi sessions are tied to their working directory — the agent cannot `cd` or spawn a sub-session in a different directory.

## Root cause

The `executing-tasks` skill creates the worktree (step 2) then continues executing tasks in the original directory instead of stopping and handing off to a new session.

## Solution

When the user chooses worktree isolation in `executing-tasks`, the agent:

1. Creates the worktree
2. Moves all plan docs into the worktree
3. Commits the removal on the current branch
4. Stops and tells the user to restart in the worktree

The new session in the worktree finds the plan docs and continues seamlessly.

## Changes

### `skills/executing-tasks/SKILL.md`

Replace step 2 ("Suggest workspace isolation") with a "Create & handoff" pattern for worktrees:

```
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

   a. Move plan docs into the worktree:
      ```
      mv docs/plans/*-design.md docs/plans/*-implementation.md docs/plans/*-progress.md <worktree>/docs/plans/ 2>/dev/null || true
      mv docs/plans/adr/*.md <worktree>/docs/plans/adr/ 2>/dev/null || true
      ```

   b. Commit the removal on the current branch (if files were committed):
      ```
      git rm docs/plans/*-design.md docs/plans/*-implementation.md docs/plans/*-progress.md 2>/dev/null || true
      git rm -r docs/plans/adr/ 2>/dev/null || true
      git commit -m "chore: move plan docs to worktree for <feature-name>"
      ```

   c. Stop and show the user:
      ```
      ✅ Worktree created at ../<repo>-<feature-name>
      📄 Plan docs moved to the worktree.

      To continue, start a new session there:
        cd ../<repo>-<feature-name> && pi

      Then run: /skill:executing-tasks
      ```

   d. **Do not proceed with task execution.** The session ends here.
```

Remove the current step 3–4 numbering (progress file, commit plan docs) and renumber to account for the new handoff step. The "First run" flow becomes:

1. Parse the implementation plan
2. Suggest workspace isolation (branch or worktree)
3. **If branch:** create progress file, commit plan docs, begin execution (existing flow)
4. **If worktree:** move docs, commit removal, stop with handoff message (new flow)

### No changes to other skills

- `brainstorming` — read-only phase, no isolation needed
- `writing-plans` — read-only phase, no isolation needed
- `finalizing` — already handles worktree cleanup (`git worktree remove`)

## User experience

### Branch isolation (unchanged)

```
Agent: Would you like branch or worktree isolation?
User: branch
Agent: [creates branch, creates progress file, begins executing tasks]
```

### Worktree isolation (new)

```
Agent: Would you like branch or worktree isolation?
User: worktree
Agent: ✅ Worktree created at ../my-repo-auth
       📄 Plan docs moved to the worktree.

       To continue, start a new session there:
         cd ../my-repo-auth && pi

       Then run: /skill:executing-tasks
```

User opens a new terminal, runs the commands, and the new session picks up where the old one left off.

## Edge cases

- **No plan docs exist yet** — just create the worktree, don't try to move files
- **Partial progress (some tasks done)** — progress file is moved, preserving state
- **Uncommitted plan docs** — `mv` removes them, no `git rm` needed; commit only if they were previously committed
- **Other uncommitted changes on current branch** — only touch plan docs, leave everything else untouched
