# Umbrella mechanics

An umbrella splits one large requirement into multiple design docs that ship together as **one PR**. It is a single-topic folder with more than one leaf: one branch, one `pwk-finalizing` at the end, which disposes the folder as one unit. Design only the current slice; ground later slices in implemented predecessor code. The split is intra-PR decomposition — a way to keep each design/execute cycle small and focused, not a multi-PR strategy.

**First brainstorm** (the requirement is too big for one design doc):

1. **Propose the split** — the parts, a one-line scope each, and build order. Get human approval before writing anything beyond discovery.
2. **Write the overview** — `docs/plans/<date>-<topic>/overview.md`, in the topic's own folder (every leaf lives beside it: `<leaf>-design.md`, `<leaf>-progress.md`, `<leaf>-review-packet*.md`), a **status-free roster**:

   ```markdown
   # Overview: <topic>

   Goal: <one line — what the whole requirement delivers>

   ## Parts (build order)
   1. <leaf> — <one-line scope>
   2. <leaf> — <one-line scope>
   ```

   The `## Parts (build order)` heading and the `N. <leaf> — <one-line scope>` item shape together are the **roster contract**: `pwk-finalizing` and `pwk-status` both read them, and both are lint-pinned so a drifted heading fails loudly instead of reading an empty roster. Goal, parts with one-line scopes, build order — **no status column**. No skill mutates the overview between this write and `pwk-finalizing` (which disposes it); part-completion is inferred from each leaf's own `*-progress.md`.
3. **Write the first part's design doc** — `docs/plans/<date>-<topic>/<leaf>-design.md` in the same folder, then hand off to `/skill:pwk-executing-tasks`.

**Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then report each prior leaf's `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <leaf>-progress.md` beside the overview — no body ingest; a leaf with no progress file yet reports `not started`) before designing the slice, then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. Predecessor phases are visibility, not enforcement: design the slice regardless; cross-slice decisions that must persist go in an ADR, not the overview.

The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the branch in its pre-flight and reuses it for later parts, and suggests the next part (or finalize after the last); `pwk-finalizing` disposes the whole folder — overview + every leaf — and ships one PR.

