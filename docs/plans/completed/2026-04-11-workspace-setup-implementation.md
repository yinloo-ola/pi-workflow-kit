# Workspace Setup: Implementation Plan

## Tasks

### Task 1: Update brainstorming/SKILL.md — add workspace setup to step 5

**Scenario:** Trivial (docs)

Replace step 5 with workspace creation + design doc commit.

**File:** `skills/brainstorming/SKILL.md`

Replace:

```
5. **Write the design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit.
```

With:

```
5. **Set up workspace & write the design doc** — create a branch for this work. For larger features, use a git worktree for isolation:
   ```
   git worktree add ../<repo>-<feature-name> -b <feature-name>
   ```
   Save the design doc to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit on the new branch.
```

**Commit:** `refactor(brainstorming): move workspace setup into step 5`

### Task 2: Update writing-plans/SKILL.md — remove step 2, expand step 1

**Scenario:** Trivial (docs)

Remove step 2 ("Set up workspace") entirely. Expand step 1 to verify the feature branch context. Renumber step 3 → 2.

**File:** `skills/writing-plans/SKILL.md`

Replace:

```
1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. If none exists, ask the user to describe what they want to build, read relevant code, and create the plan directly.
2. **Set up workspace** — create a branch for this work. For larger features, use a git worktree for isolation:
   ```
   git worktree add ../<repo>-<feature-name> -b <feature-name>
   ```
3. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
```

With:

```
1. **Check for a design doc & workspace** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. Verify you're on the feature branch (or in its worktree) created during brainstorming. If no design doc exists, ask the user to describe what they want to build, read relevant code, create a branch, and create the plan directly.
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
```

**Commit:** `refactor(writing-plans): remove workspace setup, verify branch context`
