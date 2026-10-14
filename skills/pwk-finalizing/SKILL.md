---
name: pwk-finalizing
description: "Use after all requirements are complete to archive or delete consumed plan docs, curate lessons, update documentation, and ship the work."
---

# Finalizing

Ship the completed work.

Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

## Pre-finalization checks

1. **Verify the repo root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).
2. **Run the FULL test suite** — only a green suite ships; re-run it yourself rather than trusting the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
3. Read **every** relevant progress file — for a multi-leaf topic that's each leaf's progress file — discovered by listing `docs/plans` recursively, excluding docs/plans/completed/, for `*-progress.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every topic’s `Feature phase:` extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):

   ```javascript
   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
   const files = designs ? designs.split('\n') : [];
   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
   const heads = await Promise.all(files.map(d =>
     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
   ```

   More than one topic in flight? Ask which one this finalize ships — finalizing touches only its own topic, and another topic being designed or executed never blocks this run. Then match the chosen topic's `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only its ❌/⏭ verdict rows in the Requirements table (e.g. `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*❌'` / `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*⏭'` — scoped to Requirements-table rows because the Execution summary rows share the same row shape); the sections after the tables carry nothing the gate needs. Apply the gates below to the chosen topic's file(s) and no others:
   - **Any `❌ failed`** (in any leaf of the topic) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed`.
   - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
   - **`Feature phase` must be `done`** in every progress file of the topic — any other value (`e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`) means its ship checkpoint has not been approved: send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
4. **Cross-check the roster — fail closed on unstarted work.** The progress file's `Design:` ref names the design doc, and that directory is the topic folder. An `overview.md` **beside the design doc** (same folder — never a repo-wide `docs/plans/**/overview.md`) means a multi-leaf topic: read that overview's `## Parts (build order)` roster and require one `<leaf>-progress.md` per leaf. A roster leaf with no progress file is **unstarted** — **block**, naming the leaf, and send the user back to `/skill:pwk-executing-tasks` to build it; never dispose an unstarted design unread. (A leaf whose progress file is not `done` is already stopped by the gate above.)

## Process

1. **Derive the topic set** —
   - **Multi-leaf topic** (an `overview.md` beside the design doc, inside the same `docs/plans/<date>-<topic>/` folder — never a repo-wide `docs/plans/**/overview.md`, and always excluding docs/plans/completed/, so an archived or sibling topic never routes): the set is the topic folder itself, disposed as one unit.
   - **Single-leaf topic**: progress file → `Design:` ref → that design doc's own folder → `<topic>`, which **is the folder slug** — the topic directory's name, and the same value `pwk-executing-tasks` uses for the branch and worktree (never a leaf filename). One folder.

   Ambiguous with several designs in flight? Ask.
2. **Run the learning sweep — before any disposal command.** The planning docs are about to be destroyed, so extract the durable knowledge first, while its container still exists: each design doc's At-a-glance key-decision bullets **and its `Approaches considered` section** (every leaf's, for an umbrella), each progress file's `Deviated?` entries, and each Code digest's `[ALERT]` entries. (A trivial doc has no `## At a glance` and no `Approaches considered` — expect an honest-empty sweep.) Then:
   - **Offer an ADR** (in `docs/adr/`) for each item that passes the three gates — **hard to reverse**, **surprising without context**, **a real trade-off**.
   - **Append generic rules** to `docs/lessons.md` (strip domain specifics).
   - Both outputs are **honest-empty**: most features qualify for nothing — say so and move on; never manufacture. When an item passes the gates but the recorded material is too thin for a credible ADR, **ask the human rather than fabricating**.
   - The sweep is file-based by necessity: executing and finalizing usually run in fresh sessions with no memory of the brainstorm, so everything the sweep needs must already be on disk.
3. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its topic folder `docs/plans/<date>-<topic>/` **as one unit**: every leaf's `-design.md`, `-progress.md`, and `-review-packet*.md`, plus `overview.md` for an umbrella. The digest sections and the Evidence cells live inside their host docs and ride the folder. The folder path is taken verbatim from discovery, and the `????-??-??-` dated shape is the topic's identity — a bare `*<topic>*` pattern would over-match unrelated topics. Present both options and let the human choose:

   - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions. The invariant: the topic folder is the disposal unit — delete it entirely, nothing more and nothing less; any single operation achieving exactly this is correct, and the bash below is one canonical example.

     ```bash
     # the topic folder goes as one unit (every leaf, plus overview.md if it has one).
     # The folder path is taken verbatim from discovery — never typed or
     # reconstructed (rm -rf has no glob guard):
     rm -rf docs/plans/<date>-<topic>/
     git add -A docs/plans/<date>-<topic>/ && git commit -m "chore: delete planning docs for <topic>"
     # the add is scoped to the topic pathspec, so another in-flight topic's
     # uncommitted drafts never ride the disposal commit.
     ```

   - **Archive** — keep the planning history for future readers by moving the artifacts into `docs/plans/completed/`. The invariant: the topic folder moves whole into `docs/plans/completed/` and the destination is verified before committing; any single operation achieving exactly this is correct, and the bash below is one canonical example.

     ```bash
     mkdir -p docs/plans/completed
     # the topic folder goes as one unit (every leaf, plus overview.md if it has one).
     # No error suppression on the folder move: verify the archive landed before
     # committing, or a silently failed move would commit the deletion and destroy
     # the history the human chose to keep:
     mv docs/plans/<date>-<topic>/ docs/plans/completed/
     ls docs/plans/completed/<date>-<topic>/ >/dev/null
     # both sides of the move, and nothing else — another in-flight topic's
     # uncommitted drafts never ride the archive commit:
     git add -A docs/plans/<date>-<topic>/ docs/plans/completed/ && git commit -m "chore: archive planning docs for <topic>"
     ```

   Verify with `ls docs/plans/` before and after. Both paths commit the disposal so the shipped branch is clean. Neither touches `docs/adr/`, `docs/lessons.md`, `CHANGELOG.md`, or `README.md` — those are permanent.
4. **Curate lessons (Agile Scrum Master hat)** — if `docs/lessons.md` exists: add missed lessons, generalize domain-specific rules, de-duplicate, categorize, retire stale rules. None exists but lessons were learned? Create it. (The learning sweep feeds this; curation then shapes the whole file.)
5. **Update documentation** — if the API or surface changed: `README.md`, `CHANGELOG.md`, any inline docs. Bump the package version (major for breaking changes).
6. **Choose a merge strategy** — ask the human: 1. **Create PR** (`git push origin <branch>` then `gh pr create`). 2. **Rebase & merge** *(recommended)* — rebase onto parent, `--ff-only` merge, push parent, delete branch. 3. **Squash & merge**. 4. **Merge commit** (`--no-ff`).

   For 2–4, confirm the detected parent branch first. When a worktree was used, the parent-side commands (merge onto parent, push parent, branch deletion) run from the main working tree — the worktree holds the feature branch, so the parent cannot be checked out there (`git -C ../<repo> …`; the never-cd rule still holds) — and step 7's worktree removal comes **first**: a branch checked out in a worktree cannot be deleted.
7. **Clean up** — if a worktree was used, check `git worktree list` first: when the topic's worktree exists, remove it (`git worktree remove ../<repo>-<topic>`, `<topic>` being the folder slug, never a leaf slug) from the main working tree — `git -C ../<repo> worktree remove ../<repo>-<topic>` when the session stands inside the worktree, which git refuses to remove under itself. Absent → a silent no-op, never a failure.

## Principles

- The learning sweep runs before disposal and touches only `docs/adr/` and `docs/lessons.md` — the two permanent stores.
- Dispose of the active work's artifacts only, the human's choice — the unit is the topic folder `docs/plans/<date>-<topic>/`, one folder whether a single leaf or an umbrella's many. Unrelated topics stay in `docs/plans/`.
- ADRs are permanent institutional memory — never archived or rotated.
- Bump the package version if this is a published change (major for breaking changes).
