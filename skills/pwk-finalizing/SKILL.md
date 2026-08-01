---
name: pwk-finalizing
description: "Use after all requirements are complete to archive or delete consumed plan docs, curate lessons, update documentation, and ship the work."
---

# Finalizing

Ship the completed work.

## Pre-finalization checks

1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
2. Read **every** relevant progress file — for an umbrella that's each part's `docs/plans/*-progress.md`; for a standalone design doc, the one:
   - **Any `❌ failed`** (in any part) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
   - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").

## Process

1. **Derive the topic set** —
   - **Umbrella** (a `docs/plans/*-overview.md` exists): read its roster; the set is every part's `<topic>`. The overview is disposed too.
   - **Standalone**: progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. One topic.

   Ambiguous with several designs in flight? Ask.
2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md`, `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, also dispose the `-overview.md`. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:

   - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:

     ```bash
     # for each <topic> in the set:
     rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md
     # umbrella only:
     rm -f docs/plans/????-??-??-<umbrella>-overview.md
     git add -A docs/plans/ && git commit -m "chore: delete planning docs for <topic-or-umbrella>"
     ```

   - **Archive** — keep the planning history for future readers (e.g. a complex design worth preserving) by moving the artifacts into `docs/plans/completed/`:

     ```bash
     mkdir -p docs/plans/completed
     # for each <topic> in the set:
     mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true
     # umbrella only:
     mv docs/plans/????-??-??-<umbrella>-overview.md     docs/plans/completed/ 2>/dev/null || true
     git add docs/plans/ && git commit -m "chore: archive planning docs for <topic-or-umbrella>"
     ```

   The `????-??-??-` glob enforces the dated filename; a bare `*<topic>*` would over-match unrelated docs (e.g. topic `auth` would also hit `feature-auth-redesign-design.md`). Verify with `ls docs/plans/` before and after. `rm -f` and each `mv … || true` handle missing files. Both paths commit the disposal so the shipped branch is clean. Neither path touches `docs/adr/`, `docs/lessons.md`, `CHANGELOG.md`, or `README.md` — those are permanent.
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

- Dispose of the active work's artifacts only (archive or delete, the human's choice) — for a standalone design doc its three docs; for an umbrella its overview plus every part's docs. Unrelated topics stay in `docs/plans/`.
- ADRs are permanent institutional memory — they stay out of archive/rotation forever.
- Bump the package version if this is a published change (major for breaking changes).