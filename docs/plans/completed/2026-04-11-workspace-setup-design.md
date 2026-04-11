# Workspace Setup: Move Branch Creation to Brainstorming

## Problem

Brainstorming commits the design doc to whatever branch you're on (usually `main`), polluting it. If the idea is scrapped, you have to revert the commit. The implementation branch created later by writing-plans starts from a point after the design commit, which is messy.

## Design

Move branch/worktree creation from writing-plans into brainstorming. The design doc lands on the feature branch from the start, keeping `main` clean.

## Changes

### brainstorming/SKILL.md

Step 5 changes from writing + committing the design doc on the current branch to:

1. Create a feature branch (`git checkout -b <feature-name>`) or worktree (`git worktree add ../<repo>-<feature-name> -b <feature-name>`) for larger features
2. Write the design doc to `docs/plans/YYYY-MM-DD-<topic>-design.md`
3. Single commit on the new branch with the design doc

Feature name is derived from the topic slug in the design doc filename.

### writing-plans/SKILL.md

- Remove step 2 ("Set up workspace") entirely
- Step 1 expands to verify the feature branch/worktree context created by brainstorming
- Steps renumber: 1→2→3 becomes 1→2
- Fallback path (no design doc, brainstorming was skipped) still creates a branch itself so writing-plans works standalone
