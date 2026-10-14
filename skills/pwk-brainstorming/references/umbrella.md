# Umbrella mechanics

An umbrella splits one large requirement into multiple design docs shipping as **one PR**: one topic folder, more than one leaf, one branch, one `pwk-finalizing` at the end disposing the folder as one unit. Design only the current slice, grounded in implemented predecessor code.

**First brainstorm** (the requirement is too big for one design doc):

1. **Propose the split** — the parts, a one-line scope each, and build order; human approval before anything beyond discovery.
2. **Write the overview** — `docs/plans/<date>-<topic>/overview.md`, in the topic's own folder (every leaf lives beside it):

   ```markdown
   # Overview: <topic>

   Goal: <one line — what the whole requirement delivers>

   ## Parts (build order)
   1. <leaf> — <one-line scope>
   2. <leaf> — <one-line scope>
   ```

   The `## Parts (build order)` heading and the `N. <leaf> — <one-line scope>` item shape are the **roster contract**: `pwk-finalizing` and `pwk-status` read them, and both are lint-pinned. Goal, parts, build order — **no status column**; no skill mutates the overview before `pwk-finalizing` disposes it, and part-completion comes from each leaf's own `*-progress.md`.
3. **Write the first part's design doc** — `docs/plans/<date>-<topic>/<leaf>-design.md` beside the overview, then hand off to `/skill:pwk-executing-tasks`.

**Later parts** — re-run `/skill:pwk-brainstorming`. Read the overview for roster context, then report each prior leaf's `Feature phase:` line (`grep -m1 '^Feature phase:' <leaf>-progress.md` beside the overview; no progress file yet → `not started`) before designing the slice — prior parts are implemented code by then. Cross-slice decisions that must persist go in an ADR.

One branch and one PR: `pwk-executing-tasks` creates the branch in its pre-flight and reuses it for later parts; `pwk-finalizing` disposes the whole folder — overview and every leaf.
