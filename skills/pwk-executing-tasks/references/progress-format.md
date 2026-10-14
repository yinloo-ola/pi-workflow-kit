# Progress format and code digest

Read before creating or changing progress rows, or writing/re-presenting the code digest. This reference owns the unchanged progress artifact schema.

2. **Create the progress file** `docs/plans/<date>-<topic>/<leaf>-progress.md`, beside the design doc it belongs to (`<leaf>` is `<topic>` for a single-part topic; an umbrella part uses its roster slug). Keep the blank lines between the header fields: the blank lines are load-bearing, because CommonMark merges consecutive plain lines into one paragraph.

   ```markdown
   # Progress: <topic>

   Design: docs/plans/<date>-<topic>/<leaf>-design.md

   Branch: <branch>

   Setup: n/a

   Started: <ISO timestamp>

   Last updated: <ISO timestamp>

   Feature phase: e2e-written

   <!-- a trivial design doc (no `## Feature acceptance`) starts at `implementing (0/N)` -->

   ## Requirements
   | # | Done | Requirement | Per-req ceremony | Commit |
   |---|------|-------------|-----------------|--------|
   | 1 | ⬜ | <requirement name> | — | — |

   ## Execution summary
   | R# | Requirement | How it was built | Deviated? | Evidence |
   |----|-------------|------------------|-----------|----------|
   | 1 | <requirement name> | | | |

   ## Deviation records

   <!-- One short paragraph per design-decision reversal -->

   ## Code digest

   <!-- Written once, after the feature review passes; never back-filled per requirement. -->

   ### Summary
   ### Flow
   - **Spine** — `<entry point> -> [R1] <step> -> [R2] <step> -> <outcome>`
   - **Branches**
     - `<condition> -> <outcome>` [R2]
     - `<changed behavior> — was: <previous behavior>`
   - **Side effects** — reads: `<what>` · writes: `<what>`
   ### Gotchas
   - <one real risk per bullet>
   ### Key files
   - `<file>` — <what shifted inside it>
   ```

   The `## Code digest` is filled once, at the write point in the ship checkpoint — never back-filled per requirement. Fill rules: plain language, R# anchors where natural, no test names. `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains, one spine or branch per bullet line. `### Gotchas` lifts real risks from the review findings, one real risk per bullet — `[ALERT]` only for reviewer-confirmed issues, never invented; with none, write `none beyond review findings`. `### Key files` is capped at 5 pivotal files, one bullet each.

   **Flow shape** — the ship stop's navigable map, the one digest section carrying structure:
   - **Spine** — the happy path, each hop named by symbol — no line numbers, no file paths (those go stale). Tag each hop `[R<n>]`, so coverage verdicts trace into the code.
   - **Branches** — every alternative and error path as `condition -> outcome`; a bare spine reads as "no edge cases". Put ⚠️ on the surprising ones, and a `was: <previous behavior>` clause on each requirement whose behavior changed — skip it for purely additive ones.
   - **Inline worked values** — a non-obvious mapping shown concretely (`` `implementing (2/5)` -> `execute 2/5` ``).
   - **Side effects** — what is read and written, only for I/O, network, or migrations; otherwise omit the bullet.
   - **Cap: roughly 15 lines.** A longer Flow gets the ship checkpoint's `/skill:pwk-walkthrough` offer instead.

   `Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.

   The `Setup:` header slot takes one of `Setup: pending | done | n/a` — the header starts `Setup: pending` when the design doc has a `## Setup` section, else `Setup: n/a`; the setup checkpoint flips it to `done` on approval. The phase line stays `e2e-written` through the setup stop, and the E2E is written after setup.

## Progress file

Update the matching row directly, never via pattern matching (which corrupts the table). Update `Last updated` and `Feature phase` on every change.

**Row vocabulary (canonical — this file owns it):**

- **Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. A `❌`/`⏭` row carries its reason as a suffix in the Requirement cell, and its test coverage is reconciled in the same step — assertions removed or skipped with the reason, leaving the suite green. A requirement under review stays `🔄`: `pwk-code-review` never edits the Done cell — the loop only ever flips `🔄`→`✅` when the review returns clean; findings leave the row `🔄` for another pass.
- **Per-req ceremony cell** echoes the design doc's tag, not progress: `—` (default `none`/`skip`) · `⏸ full` (fires two stops — after the slice's tests and after it is complete) · `🔎 inline` · `🔎 parallel`.

**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted. "How it was built" = one or two plain sentences: what it does now plus the approach taken, file names sparingly, **no test-name lists, no code**. The `Evidence` cell pairs **what it proves in plain words** with a pointer — a commit, a `file:line`, a command with its output line, or one probe test — single-line. No requirement is marked ✅ with an empty `Evidence` cell: either the pointer exists or the requirement is not done. A deviating implementation fills the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written while the knowledge is fresh; mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.

## Commit entries for packet assembly

Record immutable hexadecimal commit IDs (7–64 characters). A cell holds one ID or an ordered, whitespace-separated list: initial implementation first, review-fix commits last. Preserve the first recorded commit when appending a fix — replacing it loses the feature base. Record a hash after committing, never amend a commit to carry its own hash.

The helper reads only the Requirements table Commit column. A done or in-review row needs a recorded commit; a terminal `❌`/`⏭` row may have `—`, which supplies no bound. If the selected or previous requirement lacks a bound, stop and correct the record from Git evidence; never invent one.
