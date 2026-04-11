# Finalizing: Merge Strategy Options

## Problem

The finalizing skill hard-codes "Create PR" as the only shipping option. In practice, small features often don't need a PR — they can be merged directly back to the parent branch.

## Design

Add a merge strategy step after updating documentation. The human chooses one of four options:

1. **Create PR** — push and open a PR for external review via `gh pr create`
2. **Rebase & merge** (recommended) — rebase onto parent, fast-forward merge, push parent, delete feature branch. Preserves per-task commit history linearly.
3. **Squash & merge** — squash all commits into one on parent, push parent, delete feature branch. Clean single-commit history.
4. **Merge commit** — merge with `--no-ff`, push parent, delete feature branch. Preserves all commits and branch topology.

### Flow for options 2–4 (local merge)

1. Detect parent branch (compare `main` vs `master`, fall back to `git show-branch`)
2. Switch to parent branch and pull latest
3. Execute the chosen merge strategy:
   - Rebase: `git rebase <parent>` on feature branch, then `git merge --ff-only <feature>` on parent
   - Squash: `git merge --squash <feature>` on parent, then `git commit`
   - Merge commit: `git merge --no-ff <feature>` on parent
4. Push parent to origin
5. Delete feature branch locally and remotely

### Prompting

The skill should ask the human which option they prefer, presenting rebase & merge as the default recommendation.

## Changes

- Update `skills/finalizing/SKILL.md` to replace the hard-coded PR step with the 4-option choice.
