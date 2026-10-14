# Workspace and resume details

Read before adopting a topic branch/worktree, or when a matching progress file exists.

## Workspace

3. **Workspace — create the feature branch** — already on **this topic's** feature branch → **reuse** it (a later umbrella part continues on part 1's branch). Else `git checkout <topic>`, or `git checkout -b <topic>` if new — **`<topic>` is the folder slug** everywhere in this skill: the `docs/plans/<date>-<topic>/` directory name, shared by every umbrella leaf, never a leaf slug — and it names the branch and the `../<repo>-<topic>` worktree. Check `git worktree list` first: adopt a worktree already on this branch rather than adding a second (one per branch); otherwise offer `git worktree add ../<repo>-<topic> <topic>` and hand off to a new session there, so the session's working directory is the worktree. **Uncommitted planning docs do not cross a worktree boundary** (brainstorm never commits the design doc): commit the topic folder with the main skill's scoped First-run add, switch this tree back to the branch it came from (git refuses `worktree add` of a branch still checked out here), then add the worktree. If this tree holds uncommitted topic docs while another worktree holds the branch, git refuses to commit from here — copy the topic folder into that worktree's `docs/plans/`, confirm the copy landed, and remove the source copy. Wait for the user's choice.

## Resume

Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not terminal routes the next requirement — `⬜`, `🔄`, and blank all mean not-done; `✅`/`❌`/`⏭` are resolved and are skipped past), and the Execution summary rows; stop after `## Execution summary` — later sections carry nothing the resume needs, with one exception: the `ship-paused` route re-presents the ship checkpoint, so it also reads the `## Code digest`. Before routing: a `Setup: pending` header on a design doc with a `## Setup` section means the setup checkpoint was never approved — re-run the setup verification and wait at it:
- `e2e-written` → write the E2E if not yet present, post the notice, and continue into the implement phase (no stop). A trivial design doc has no `## Feature acceptance` — skip both and go straight into the implement phase.
- `implementing (k/N)` → continue the next not-yet-terminal requirement.
- `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
- `ship-paused` → re-present the ship checkpoint and wait — the execution summary, verdict rows, and code digest re-read from the progress file; if the prior session's reviewer reports are gone, re-run the feature review per the tag first (the checkpoint is never presented without coverage).
