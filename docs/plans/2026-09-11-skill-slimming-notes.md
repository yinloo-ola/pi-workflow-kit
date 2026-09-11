# Skill-file slimming — deferred topic seed

Recorded 2026-09-11 at the end of the `workflow-consistency` brainstorm (which ships as the F1–F15 batch). This is the "skill-file slimming explicitly deferred" item from the 2.0 design, now scoped. **Timing gate: do not start until the consistency batch (2.3.0) ships** — its R1–R3 reword the same paragraphs, and slimming first means double-editing them.

Anchors are grep-able phrases, not line numbers — the consistency batch shifts lines. Corpus at time of writing: 639 lines / 7 skills; `pwk-executing-tasks` is ~half (231).

## S1 — Standardize the cross-skill boilerplate to verbatim-identical

The root-check paragraph ("run `pwd` … never `cd` (a worktree root counts)") and the discovery recipe ("list `docs/plans` recursively … `find docs/plans -name '<suffix>' -not -path '*/completed/*'`") appear 4× each (pwk-brainstorming, pwk-executing-tasks, pwk-finalizing, pwk-status) as *near*-identical variants — different parentheticals, different suffix lists. That drift-shape is what F7–F11 were in the docs.

**Fix:** pick one canonical wording per block, land it verbatim in all four skills (suffix lists legitimately differ; everything else byte-for-byte), and add a skill-lint assertion that the shared sentences match across files. Converts duplication into an enforced invariant.

**Do NOT extract to a shared file.** Skills load independently in fresh sessions — each must be self-contained. DRY-extraction across independent entry points is the wrong abstraction for this medium. (This decision is settled; don't re-litigate it in the next brainstorm.)

## S2 — Code-digest prose double-explains its template (pwk-executing-tasks)

The `## Code digest` fenced template's inline comments and the fill-rules + "Flow shape" bullets below it restate each other; "no test names" appears three times in the file (execution-summary rules, digest fill rules, Flow-shape bullets). ~25–30 lines recoverable by keeping one canonical layer and pointing to it ("same rule as the execution summary"). The 15-line Flow cap, [R<n>] tagging rule, and `was:` clause semantics must survive verbatim — they are ship-checkpoint contracts.

## S3 — Tags reference compresses to a table (pwk-executing-tasks)

The `## Tags reference` section restates the `auto`-resolution rule already explained at its point of use (feature review section). Compress the reference to a table (tag | values | default | fires); keep the full resolution prose only where the decision executes. Note: after the consistency batch, R4 also changes the risk-column story — check the two rules still read as one source (notes-only) after both edits.

## S4 — Legacy 1.x scaffolding removal (gated)

`feature-spec-paused`, `feature-complete-paused`, `Plan:` ref chains, and the `*-implementation.md` parse rules exist so pre-2.0 in-flight topics stay resumable. ~25 lines across pwk-executing-tasks + pwk-finalizing. **Gate:** no legacy `*-implementation.md` or old-valued progress files exist anywhere the kit still serves. Best simplification is deletion; only time grants it. The consistency batch's R2 already restates "legacy path unaffected" — that sentence becomes deletable along with the scaffolding.

## Non-goals (decided, do not reopen)

- **No cross-skill extraction/shared includes** — self-containment beats DRY for independently-loaded skills.
- **No brevity pass on checkpoint/ship-gate prose** — every clause there is a decision record from an ADR (0003, 0006); verbosity is informed-stop design, not waste.
- **No line-count target** — clarity over compactness; the corpus is already lean. The real win is S1's canonicalization, not the ~55 lines S2–S4 recover.

## Hand-off

Route through `/skill:pwk-brainstorming` when picked up (this file is a seed, not a design doc — discovery globs won't surface it, same as the consistency notes). Delete at that topic's finalize.
