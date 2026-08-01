---
name: pwk-finalizing
description: "Use after all requirements are complete to archive or delete consumed plan docs, curate lessons, update documentation, and ship the work."
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
2. **Dispose of consumed plan docs — ask archive or delete** — only this design's three artifacts, matched by the exact topic slug (with the `YYYY-MM-DD-` prefix) so similarly-named plans for other topics survive. **Split sub-design? Note the design doc's `Part of: docs/plans/…-overview.md` line now** — the dispose below deletes/archives the doc that holds it. Then present both options and let the human choose:

   - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:

     ```bash
     rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md
     ```

   - **Archive** — keep the planning history for future readers (e.g. a complex design worth preserving) by moving the artifacts into `docs/plans/completed/`:

     ```bash
     mkdir -p docs/plans/completed
     mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true
     git add docs/plans/ && git commit -m "chore: archive planning docs for <topic>"
     ```

   The `????-??-??-` glob enforces the dated filename; a bare `*<topic>*` would over-match unrelated docs (e.g. topic `auth` would also hit `feature-auth-redesign-design.md`). Verify with `ls docs/plans/` before and after. `rm -f` and each `mv … || true` handle missing files. Neither path touches `docs/adr/`, `docs/lessons.md`, `CHANGELOG.md`, or `README.md` — those are permanent. **Split sub-design — close the overview lifecycle.** Open the overview (from the `Part of:` line noted above) and mark this sub-design's status row **shipped**. Then scan the rows: if every sibling row is already shipped, the split is complete — offer the same archive-or-delete choice for the overview itself; if any row isn't shipped yet, leave it for the remaining sub-designs.
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

- Dispose of **only** the active design's artifacts (archive or delete, the human's choice) — un-started designs and any overarching `*-overview.md` stay in `docs/plans/`.
- ADRs are permanent institutional memory — they stay out of archive/rotation forever.
- Bump the package version if this is a published change (major for breaking changes).