---
name: pwk-finalizing
description: "Use after all requirements are complete to archive planning docs, curate lessons, update documentation, and ship the work."
---

# Finalizing

Ship the completed work.

## Pre-finalization checks

1. **Run the FULL test suite.** Every test must pass. Resume spans sessions — don't assume the last execute session left the suite green. If anything fails, stop and send the user back to `/skill:pwk-executing-tasks` to fix; never archive or open a PR against a red suite.

2. Read the progress file (`docs/plans/*-progress.md`). If any requirements are `⏭ skipped` or `❌ failed`, warn and confirm before proceeding:

   ```
   ⚠️ Requirements 4 and 7 were skipped/failed. Continue with finalizing, or go back?
   ```

## Process

1. **Derive the topic** — from the progress file → its `Plan:` ref → the plan's `Design:` ref → the design-doc filename → `<topic>`. If several designs are in flight and it's ambiguous, ask which is being shipped.

2. **Archive this design's planning docs** — only this design's artifacts; leave other (un-started) design docs in place:

   ```bash
   mkdir -p docs/plans/completed
   mv docs/plans/*<topic>*-design.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/*<topic>*-implementation.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/*<topic>*-progress.md docs/plans/completed/ 2>/dev/null || true
   git add docs/plans/ && git commit -m "chore: archive planning docs"
   ```

   Each `mv` gracefully handles a missing file. **Do not touch `docs/adr/`** — ADRs are permanent institutional memory, never archived.

3. **Review & polish lessons (Agile Scrum Master Hat)** — if `docs/lessons.md` exists, curate it for future sprints: add missed lessons, generalize domain-specific rules into generic patterns, de-duplicate, categorize under clear headers, retire stale rules. If it doesn't exist but lessons were learned, create it with the standard format.

4. **Update documentation** — if the API or surface changed: update `README.md`, `CHANGELOG.md`, and any inline docs.

5. **Choose a merge strategy** — ask the human which they prefer:

   1. **Create PR** — push and open a PR for external review:
      ```
      git push origin <branch>
      gh pr create --title "feat: <summary>" --body "<summary>"
      ```
   2. **Rebase & merge** *(recommended)* — rebase onto parent, fast-forward merge, push parent, delete branch:
      ```
      parent=$(git show-branch -a 2>/dev/null | grep '\*' | grep -v "$(git branch --show-current)" | head -1 | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/[\^~].*//')
      git checkout "$parent" && git pull
      git checkout - && git rebase "$parent"
      git checkout "$parent" && git merge --ff-only -
      git push origin "$parent"
      git branch -d - && git push origin --delete -
      ```
   3. **Squash & merge** — squash all commits into one on parent, push, delete branch.
   4. **Merge commit** — merge with `--no-ff`, push parent, delete branch.

   For options 2–4, confirm the detected parent branch before proceeding.

6. **Clean up** — if a worktree was used, remove it:
   ```
   git worktree remove ../<repo>-<topic>
   ```

## Principles

- Archive **only** the active design's artifacts — un-started designs (from a split) stay in `docs/plans/`.
- ADRs are never archived.
- Bump the package version if this is a published change (major bump for breaking changes).