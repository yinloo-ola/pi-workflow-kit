---
name: pwk-finalizing
description: "Use after all requirements are complete to archive or delete consumed plan docs, curate lessons, update documentation, and ship the work."
---

# Finalizing

Ship the completed work.

## Pre-finalization checks

1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
2. **Verify the repo root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then:
3. Read **every** relevant progress file — for a multi-leaf topic that's each leaf's progress file — discovered by listing `docs/plans` recursively, excluding docs/plans/completed/, for `*-progress.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. Match the `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only the matching ❌/⏭ verdict rows in the Requirements table (e.g. `grep '❌' <file>` / `grep '⏭' <file>` — rows with reasons); the sections after the tables carry nothing the gate needs. For a single-leaf topic, the one:
   - **Any `❌ failed`** (in any leaf) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
   - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
   - **`Feature phase` must be `done`** in every progress file — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or a legacy `feature-complete-paused` from before the ship gate) means the feature is still in flight: the ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
4. **Cross-check the roster — fail closed on unstarted work.** Find the topic folder locally: the progress file's `Design:` ref names the design doc, and that directory is the topic folder. An `overview.md` **beside the design doc** (same folder — never a repo-wide `docs/plans/**/overview.md`, or a sibling topic's overview would route this finalize) means a multi-leaf topic. Read that overview's `## Parts (build order)` roster and require one `<leaf>-progress.md` per leaf. A roster leaf with no progress file is **unstarted** — **block**, naming the leaf, and send the user back to `/skill:pwk-executing-tasks` to build it; never dispose an unstarted design unread. (A leaf with a progress file that is not `done` is already stopped by the gate above.)

## Process

1. **Derive the topic set** —
   - **Multi-leaf topic** (an `overview.md` sits beside the design doc, inside the same `docs/plans/<date>-<topic>/` folder — never a repo-wide `docs/plans/**/overview.md`, and always excluding docs/plans/completed/, so an archived or sibling topic never routes): read its roster; the set is the topic folder itself, disposed as one unit.
   - **Single-leaf topic**: progress file → `Design:` ref → that design doc's own folder → `<topic>`, which **is the folder slug** — the topic directory's name, and the same value `pwk-executing-tasks` uses for the branch and worktree (never a leaf filename). One folder. (Legacy flat progress file: `Plan:` ref → the implementation doc's `Design:` ref → design doc.)

   Ambiguous with several designs in flight? Ask.
2. **Run the learning sweep — before any disposal command.** The planning docs are about to be destroyed; extract the durable knowledge first, while its container still exists. Read the design doc's At-a-glance key-decision bullets **and its `Approaches considered` section** (the full forks with their reasoning), the progress file's `Deviated?` entries (including any deviation decision-records), and the Code digest's `[ALERT]` entries. Then:
   - **Offer an ADR** (in `docs/adr/`) for each item that passes the three gates — **hard to reverse**, **surprising without context**, **a real trade-off** — informed by how the decision actually played out during execution, not just how it looked at design time.
   - **Append generic rules** to `docs/lessons.md` (strip domain specifics).
   - Both outputs are **honest-empty**: most features qualify for nothing — say so and move on; never manufacture. When an item passes the gates but the recorded material is too thin to draft a credible ADR, **ask the human rather than fabricating** context — the human was there.
   - The sweep is file-based by necessity: executing and finalizing usually run in fresh sessions with no memory of the brainstorm conversation — everything the sweep needs must already be on disk.
3. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md` (legacy — a 2.0 feature has none; the glob harmlessly no-ops), `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:

   - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:

     ```bash
     # the topic folder goes as one unit (every leaf, plus overview.md if it has one).
     # The folder path is taken verbatim from discovery — never typed or
     # reconstructed (rm -rf has no glob guard):
     rm -rf docs/plans/<date>-<topic>/
     # legacy flat topic only (resume/ship of a pre-folder topic):
     rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md docs/plans/????-??-??-<topic>-review-packet*.md docs/plans/????-??-??-<topic>-notes.md
     git add -A docs/plans/ && git commit -m "chore: delete planning docs for <topic>"
     ```

   - **Archive** — keep the planning history for future readers (e.g. a complex design worth preserving) by moving the artifacts into `docs/plans/completed/`:

     ```bash
     mkdir -p docs/plans/completed
     # the topic folder goes as one unit (every leaf, plus overview.md if it has one).
     # No error suppression on the folder move: verify the archive landed before
     # committing, or a silently failed move would commit the deletion and destroy
     # the history the human chose to keep:
     mv docs/plans/<date>-<topic>/ docs/plans/completed/
     ls docs/plans/completed/<date>-<topic>/ >/dev/null
     # legacy flat topic only (resume/ship of a pre-folder topic):
     mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-review-packet*.md   docs/plans/completed/ 2>/dev/null || true
     mv docs/plans/????-??-??-<topic>-notes.md            docs/plans/completed/ 2>/dev/null || true
     git add docs/plans/ && git commit -m "chore: archive planning docs for <topic>"
     ```

   **Disposal precedence:** for a folder topic the folder command is the disposal, and the legacy flat globs do not run at all — they exist only for a flat topic, where there is no folder. Skipping them for a folder topic is what keeps an unrelated flat topic alive when a leaf slug happens to equal its slug. For a flat topic the folder command simply does not apply.

   The `????-??-??-` glob enforces the dated filename; a bare `*<topic>*` would over-match unrelated docs (e.g. topic `auth` would also hit `feature-auth-redesign-design.md`). Verify with `ls docs/plans/` before and after. `rm -f` and each `mv … || true` handle missing files. Both paths commit the disposal so the shipped branch is clean. Neither path touches `docs/adr/`, `docs/lessons.md`, `CHANGELOG.md`, or `README.md` — those are permanent.
4. **Curate lessons (Agile Scrum Master hat)** — if `docs/lessons.md` exists: add missed lessons, generalize domain-specific rules into generic patterns, de-duplicate, categorize, retire stale rules. None exists but lessons were learned? Create it. (The learning sweep above feeds this; curation then shapes the whole file.)
5. **Update documentation** — if the API or surface changed: `README.md`, `CHANGELOG.md`, any inline docs. Bump the package version (major for breaking changes).
6. **Choose a merge strategy** — ask the human:

   1. **Create PR** — `git push origin <branch>` then `gh pr create`.
   2. **Rebase & merge** *(recommended)* — rebase onto parent, `--ff-only` merge, push parent, delete branch.
   3. **Squash & merge** — squash onto parent, push, delete branch.
   4. **Merge commit** — `--no-ff` merge, push parent, delete branch.

   For 2–4, confirm the detected parent branch before proceeding.
7. **Clean up** — if a worktree was used, verify presence first (`git worktree list`): when the topic's worktree exists, remove it (`git worktree remove ../<repo>-<topic>`, where `<topic>` is the folder slug — the same one `pwk-executing-tasks` created the branch under, never a leaf slug); when absent, cleanup is a silent no-op — never a failure.

## Principles

- The learning sweep runs before disposal and touches only `docs/adr/` and `docs/lessons.md` — the two permanent stores.

- Dispose of the active work's artifacts only (archive or delete, the human's choice) — the unit is the topic folder `docs/plans/<date>-<topic>/`, one folder whether the topic has a single leaf or an umbrella's many, and a legacy flat topic keeps its per-file paths. Unrelated topics stay in `docs/plans/`.
- ADRs are permanent institutional memory — they stay out of archive/rotation forever.
- Bump the package version if this is a published change (major for breaking changes).