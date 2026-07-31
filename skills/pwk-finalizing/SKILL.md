---
name: pwk-finalizing
description: "Use after all requirements are complete to delete consumed plan docs, curate lessons, update documentation, and ship the work."
---

# Finalizing

Ship the completed work.

## Pre-finalization checks

1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
2. Read the progress file (`docs/plans/*-progress.md`):
   - **Any `❌ failed`** → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
   - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").

## Process

1. **Derive the topic** — progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. Ambiguous with several designs in flight? Ask.
2. **Delete consumed plan docs** — only this design's three artifacts, matched by the exact topic slug (with the `YYYY-MM-DD-` prefix) so similarly-named plans for other topics survive:

   ```bash
   rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md
   ```

   The `????-??-??-` glob enforces the dated filename; a bare `*<topic>*` would over-match unrelated docs (e.g. topic `auth` would also hit `feature-auth-redesign-design.md`). Verify with `ls docs/plans/` before and after. `rm -f` handles missing files. `docs/adr/`, `docs/lessons.md`, `CHANGELOG.md`, and `README.md` are permanent — leave them entirely out of the delete set.
3. **Curate lessons (Agile Scrum Master hat)** — if `docs/lessons.md` exists: add missed lessons, generalize domain-specific rules into generic patterns, de-duplicate, categorize, retire stale rules. None exists but lessons were learned? Create it.
4. **Update documentation** — if the API or surface changed: `README.md`, `CHANGELOG.md`, any inline docs.
5. **Choose a merge strategy** — ask the human:

   1. **Create PR** — `git push origin <branch>` then `gh pr create`.
   2. **Rebase & merge** *(recommended)* — rebase onto parent, `--ff-only` merge, push parent, delete branch.
   3. **Squash & merge** — squash onto parent, push, delete branch.
   4. **Merge commit** — `--no-ff` merge, push parent, delete branch.

   For 2–4, confirm the detected parent branch before proceeding.
6. **Clean up** — remove the worktree if one was used: `git worktree remove ../<repo>-<topic>`.

## Principles

- Delete **only** the active design's artifacts — un-started designs (from a split) stay in `docs/plans/`.
- ADRs are permanent institutional memory — they stay out of archive/rotation forever.
- Bump the package version if this is a published change (major for breaking changes).