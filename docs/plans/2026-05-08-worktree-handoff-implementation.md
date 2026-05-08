# Implementation Plan: Worktree Handoff

## Overview

Modify `skills/executing-tasks/SKILL.md` so that when the user chooses worktree isolation, the agent moves plan docs to the worktree, commits the removal, and stops with a handoff message instead of continuing execution in the wrong directory.

**Design doc:** `docs/plans/2026-05-08-worktree-handoff-design.md`

---

## Task 1: Add worktree handoff flow to executing-tasks

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Modify the "First run" section of `skills/executing-tasks/SKILL.md`. After the workspace isolation prompt (step 2), add a branching path: if the user chose worktree, move docs and stop; if branch, continue with existing flow.

### File: `skills/executing-tasks/SKILL.md`

Replace the current steps 2–5 in the "First run" section:

```markdown
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

3. **Create the progress file** — save to `docs/plans/<plan-name>-progress.md` (replace `-implementation` with `-progress` in the plan filename):

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

4. **Commit the plan docs** — if `docs/plans/` has uncommitted files, commit them on the new branch:
   ```
   git add docs/plans/ && git commit -m "docs: add design and implementation plan"
   ```

5. **Begin task execution** — start with task 1 (see [Per-task execution](#per-task-execution)).
```

With:

```markdown
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

   c. **Begin task execution** — start with task 1 (see [Per-task execution](#per-task execution)).
```

**Commit:** `feat(executing-tasks): add worktree handoff with plan doc migration`
