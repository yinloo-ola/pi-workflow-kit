# Progress format and code digest

Read before creating or changing progress rows, or writing/re-presenting the code digest. This reference owns the unchanged progress artifact schema.

2. **Create the progress file** `docs/plans/<date>-<topic>/<leaf>-progress.md`, beside the design doc it belongs to (`<leaf>` is `<topic>` for a single-part topic; an umbrella part uses its roster slug), so `pwk-finalizing` finds it inside the topic folder:

   ```markdown
   # Progress: <topic>

   Design: docs/plans/<date>-<topic>/<leaf>-design.md
   Branch: <branch>
   Setup: n/a
   Started: <ISO timestamp>
   Last updated: <ISO timestamp>
   Feature phase: e2e-written

   <!-- a trivial design doc (no `## Feature acceptance`) starts at `implementing (0/N)` instead — there is no E2E to write -->

   ## Requirements
   | # | Done | Requirement | Per-req ceremony | Commit |
   |---|------|-------------|-----------------|--------|
   | 1 | ⬜ | <requirement name> | — | — |

   ## Execution summary
   | R# | Requirement | How it was built | Deviated? |
   |----|-------------|------------------|-----------|
   | 1 | <requirement name> | | |

   ## Deviation records

   <!-- One short paragraph per design-decision reversal (what changed, why, what was rejected), written at deviation time; leave this section empty when every Deviated? entry is mechanical. -->

   ## Code digest

   <!-- Written once, after the feature review passes; never back-filled per requirement. -->

   ### Summary
   ### Flow
   Spine
     <entry point> -> [R1] <step> -> [R2] <step> -> <outcome>
   Branches
     <condition> -> <outcome>   [R2]
     <changed behavior>   was: <previous behavior>
   Side effects
     reads: <what>   writes: <what>
   ### Gotchas
   ### Key files
   ```

   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.

   **Flow shape** — this is the ship stop's navigable map, so it is the one digest section that carries structure, not just prose:

   - **Spine** — the happy path as `A -> B -> C` hops, each hop named by symbol or module, with no line numbers anywhere and no file paths: symbol names survive edits and stay greppable, so a stale anchor can never mislead. Tag each hop `[R<n>]` with the requirement it comes from — that is what lets the coverage table's verdict rows be traced into the code without opening the diff.
   - **Branches** — every alternative and error path as `condition -> outcome` (a linear spine with no branches reads as "there are no edge cases", which is rarely true). Put ⚠️ on the genuinely surprising ones. Add a `was: <previous behavior>` clause for each requirement whose behavior changed; skip it for purely additive requirements — honest-empty, never invented.
   - **Inline worked values** — where a mapping is non-obvious, show it concretely (`` `implementing (2/5)` -> `execute 2/5` ``), so a reader can falsify it without running anything.
   - **Side effects** — a line naming what is read and written, only when the feature performs I/O, network, or migrations; omit it entirely otherwise rather than filling a placeholder.
   - **Cap: roughly 15 lines.** If the change genuinely needs more, the ship checkpoint **offers `/skill:pwk-walkthrough`** as the deep read (it regenerates a `file:line`-anchored walkthrough on demand) instead of growing the digest — the digest is what the human reads at the one remaining stop, and an unbounded Flow recreates the digging it exists to prevent.

   `Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.

   The `Setup:` header slot takes one of `Setup: pending | done | n/a` — the header starts `Setup: pending` when the design doc has a `## Setup` section, else `Setup: n/a`; the main skill's setup checkpoint flips it to `done` on approval. The phase line stays `e2e-written` through the setup stop — the Setup slot, not the phase, is what flags the not-yet-approved window, and the E2E is written after setup.


## Progress file

Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change.

**Row vocabulary (canonical — this file owns it):**

- **Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. A `❌`/`⏭` row carries its reason as a suffix in the Requirement cell (finalizing's verdict greps read it), and its test coverage is reconciled in the same step — assertions removed or skipped with the reason; the suite must stay green. This skill sets all five values. A requirement under review stays `🔄`: `pwk-code-review` reports findings and never edits the Done cell — the loop only ever flips `🔄`→`✅` when the review returns clean, and findings leave the row `🔄` for another pass.
- **Per-req ceremony cell** echoes the design doc's tag, not progress: `—` (default `none`/`skip`) · `⏸ full` (fires two stops — after the slice's tests and after it is complete) · `🔎 inline` · `🔎 parallel`.

**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.


## Commit entries for packet assembly

Record immutable hexadecimal commit IDs (7–64 characters). A cell can hold one ID or an ordered, whitespace-separated list: initial implementation first, review-fix commits last. Preserve the first recorded commit when appending a fix; replacing it loses the feature base. Record a commit hash after committing, never amend a commit to include its own hash.

The helper reads only the Requirements table Commit column. A done or in-review row needs a recorded commit. Terminal `❌`/`⏭` rows may have `—` when no commit remains; this does not supply a bound for a requirement packet. If the selected or immediately previous requirement lacks a bound, stop and correct the record from Git evidence; never invent one.
