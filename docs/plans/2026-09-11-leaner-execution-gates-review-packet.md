# Review packet: leaner-execution-gates — feature review

## Commits
ede3379 docs: mark feature phase reviewing
760b6c5 fix(gates): sweep the R2/R3 consumer sites the tracing review flagged
5da25d7 docs: record R6 commit in progress
8c7aa15 feat(digest): write the Flow from reviewed reality (R6)
e2f9e22 docs: record R5 commit in progress
a384c1d feat(digest): enriched Flow map in the code digest (R5)
0ebc463 docs: record R4 commit in progress
d880a49 fix(lint): stale checkpoint vocabulary comments (R4 review)
e0ce069 feat(gates): drop the spec checkpoint value (R4)
8afbbed docs: record R3 commit in progress
f6ccaac feat(gates): feature-spec checkpoint becomes a notice (R3)
17b7e93 docs: record R2 commit in progress
cefd1b3 feat(gates): risk-scaled single feature review (R2)
803fbc9 docs: record R1 commit in progress
54f6a68 feat(gates): delete per-requirement review auto-tag (R1)
2336b32 docs: add design doc

## Changed files
 CHANGELOG.md                                       |  20 ++
 README.md                                          |  19 +-
 docs/developer-usage-guide.md                      |   8 +-
 docs/oversight-model.md                            |   4 +-
 .../2026-09-11-leaner-execution-gates-design.md    | 240 ++++++++++++++++++
 .../2026-09-11-leaner-execution-gates-progress.md  |  36 +++
 ...9-11-leaner-execution-gates-review-packet-r4.md | 277 +++++++++++++++++++++
 docs/workflow-phases.md                            |  10 +-
 package.json                                       |   2 +-
 skills/pwk-brainstorming/SKILL.md                  |  10 +-
 skills/pwk-executing-tasks/SKILL.md                |  47 ++--
 skills/pwk-status/SKILL.md                         |   5 +-
 tests/code-digest.test.ts                          |  24 +-
 tests/lean-gates.e2e.test.ts                       | 148 +++++++++++
 tests/markers.mjs                                  |  34 +++
 tests/pwk-status.test.ts                           |   7 +-
 tests/pwk2-single-doc.e2e.test.ts                  |   4 +-
 tests/single-doc.test.ts                           |  12 +-
 tests/skill-lint.mjs                               | 206 ++++++++-------
 19 files changed, 976 insertions(+), 137 deletions(-)

## Acceptance criteria (verbatim from the design doc)
### R1: Per-requirement review auto-tag removed

`pwk-brainstorming` no longer silently tags requirements for review: a requirement's effective `### Review` value is `skip` unless the design doc explicitly tags it.

**Acceptance criteria** — since the deliverable is skill/document text, the observable interface is the file content the host loads and the test suite that asserts it.

- Given a design doc whose requirement block has a non-empty `### Production-risk notes` section and no explicit `### Review` tag, When executing-tasks parses the design doc, Then that requirement's effective review is `skip` — no reviewer roles are requested for it and no `-review-packet-r<N>.md` is written for it.
- Given `skills/pwk-brainstorming/SKILL.md` and `skills/pwk-executing-tasks/SKILL.md` and `docs/workflow-phases.md` and `docs/developer-usage-guide.md`, When the lint suite runs, Then none of them pairs the auto-tag concept with `Production-risk notes` (no silent tagging rule survives) and none claims a single source of truth for such a rule.
- Given `skills/pwk-brainstorming/SKILL.md`, When the lint suite runs, Then it still states that `### Review` accepts `skip | parallel | inline`, that `skip` is the default, and that the human may tag a requirement explicitly.
- Given a design doc that explicitly tags one requirement `### Review: inline`, When executing-tasks parses it, Then that one requirement gets a single inline review pass and the untagged requirements get none (edge case: explicit human tagging still works).

### Checkpoints: none
### Review: skip

### R2: Feature review is one risk-scaled pass

The single whole-part feature review resolves `auto` against the design doc's risk content, requesting four roles only when the design actually carries risk.

**Acceptance criteria**

- Given a design doc whose `## Feature acceptance` section carries `### Feature review: auto` and which has no `## Production-risk areas` section and no non-empty `### Production-risk notes` on any requirement, When executing-tasks reaches the feature review, Then it requests zero reviewer roles and performs one inline `pwk-code-review` pass over the whole feature diff.
- Given the same tag and a non-empty `## Production-risk areas` section, When the feature review runs, Then it requests all four reviewer roles (spec, tracing, smell, hazard) over the whole feature diff.
- Given the same tag and instead a non-empty `### Production-risk notes` on a single requirement, When the feature review runs, Then it likewise requests all four reviewer roles (edge case: either risk signal is sufficient).
- Given `### Feature review: parallel` on a design doc with no risk content, When the feature review runs, Then four roles run (explicit tag wins over `auto` resolution).
- Given `### Feature review: inline` on a design doc that does carry risk content, When the feature review runs, Then one inline pass runs and no roles are requested (explicit tag wins in both directions).
- Given no `### Feature review` tag at all, When the feature review runs, Then `auto` resolution applies (edge case: missing tag falls back to the default, not to no review).
- Given any resolution path, Then the feature review runs exactly once per part — never once per requirement (edge case: the total reviewer-role count for a risk-touching part is four, not four times the requirement count).

### Checkpoints: none
### Review: skip

### R3: Feature-spec checkpoint becomes a notice

The E2E is still written first and must be observed failing, but its presentation no longer pauses execution.

**Acceptance criteria**

- Given the feature E2E has been written and observed failing, When executing-tasks proceeds past it, Then it posts one notice — one or two plain-language lines stating what the E2E proves, plus the failing output — and continues directly into the implement phase without waiting for approval.
- Given the progress file after that notice, When a session resumes, Then `Feature phase: e2e-written` routes into the implement phase rather than re-presenting a stop.
- Given a progress file whose `Feature phase` is `e2e-written`, When `pwk-status` runs, Then the topic renders as `execute 0/N`.
- Given a legacy progress file whose `Feature phase` is `feature-spec-paused`, When `pwk-status` runs, Then the topic renders as `execute 0/N` and never as the retired `feature-spec` state.
- Given the E2E cannot be brought to green, When the agent is blocked, Then it stops and presents the failure rather than proceeding (iterate-to-green remains the default; the stop moves to the genuine failure case).
- Given the E2E passes immediately, When executing-tasks observes that, Then it probes the cause before proceeding and stops to present if the expected behavior still looks wrong (edge case: an E2E that encodes wrong behavior must not be implemented against silently).

### Checkpoints: none
### Review: skip

### R4: `spec` removed from the Checkpoints enum

Per-requirement checkpoints accept `none | full` only; the paired "`spec` requires at least `inline` review" rule goes with it.

**Acceptance criteria**

- Given `skills/pwk-brainstorming/SKILL.md`, `skills/pwk-executing-tasks/SKILL.md`, `docs/workflow-phases.md`, and `docs/developer-usage-guide.md`, When the lint suite runs, Then no `### Checkpoints` enumeration in any of them lists `spec`, and the lint vocabulary constant contains no `spec` value.
- Given the lint suite, When it runs, Then no file asserts the retired rule that `spec` requires at least `inline` review, and the two files that previously documented it no longer do.
- Given a design doc with no `### Checkpoints` tag, When executing-tasks parses it, Then the effective value is `none` and no per-requirement stop fires (default preserved).
- Given a design doc tagged `### Checkpoints: full`, When executing-tasks parses it, Then the tests stop and the complete stop both still fire (the surviving value is intact).
- Given an in-flight design doc whose requirement still carries the legacy `### Checkpoints: spec`, When executing-tasks parses it, Then it treats the unrecognized value as `none` and proceeds without a stop rather than failing (edge case: the migration path is defined, not accidental).
- Given the `CHANGELOG.md` entry for this change, Then it states the legacy `spec` → `none` mapping in its migration note.

### Checkpoints: none
### Review: inline

### R5: Enriched Code digest `### Flow`

The digest's `### Flow` becomes the ship stop's navigable map: a spine, its branches, and the changed behavior — with symbol labels and no line numbers.

**Acceptance criteria**

- Given a progress file written after a feature review, When the ship checkpoint is assembled, Then the `## Code digest`'s `### Flow` contains a spine whose hops each carry an `[R<n>]` tag, a branches list giving each alternative and error path as `condition -> outcome`, a `was: …` clause for every requirement whose behavior changed, worked values inline wherever a mapping is non-obvious, and a side-effects line naming the reads and writes when the feature performs I/O.
- Given any written digest, When it is inspected, Then `### Flow` contains no line numbers, and its labels are symbol or module names rather than file paths.
- Given a feature the Flow would describe in more than roughly 15 lines, When the ship checkpoint is assembled, Then `/skill:pwk-walkthrough` is offered as the deep read and the digest is not grown past the cap.
- Given a purely additive feature (no requirement changes existing behavior), Then no `was:` clause is required and none is invented (edge case: honest-empty).
- Given a feature that performs no I/O, Then the side-effects line is omitted rather than filled with a placeholder (edge case: honest-empty).
- Given the `## Execution summary` table, When the digest is written, Then it is unchanged — four columns, no location or commit column is added.

### Checkpoints: none
### Review: skip

### R6: Flow truth is checked against the tracing report

The Flow is written once, after the review, from reviewed reality rather than the author's recollection.

**Acceptance criteria**

- Given the feature review resolved to `parallel`, When the digest is written, Then every path hop in the `### Flow` corresponds to a path the tracing reviewer reported, or the Flow is corrected before it is written.
- Given the feature review resolved to `inline`, When the digest is written, Then the Flow is checked against that pass's spec-coverage result instead (edge case: no tracing report exists in this mode).
- Given a tracing report naming a path that the drafted Flow omits, When the discrepancy cannot be resolved, Then the ship checkpoint reports it to the human rather than writing the Flow as if complete.
- Given `skills/pwk-executing-tasks/SKILL.md`, When the lint suite runs, Then it states that the Flow must agree with the tracing report (or the inline spec-coverage pass) and that unresolved disagreements are surfaced, not smoothed over.

### Checkpoints: none
### Review: skip

## Problem

Two ceremony leaks and one thin digest.

1. **Duplicated reviews.** `pwk-brainstorming` owns the auto-tag rule: a requirement with a non-empty `### Production-risk notes` section is silently tagged `### Review: parallel`. `pwk-executing-tasks` then spawns four fresh-context reviewers for each such requirement, and the ship checkpoint spawns the same four roles again over the whole feature diff. A risk-touching part with four risk requirements therefore pays twenty role spawns for coverage the feature review already provides over the whole diff — at four times the wall-clock of the review that would have caught the same issues.
2. **A stop that re-asks an answered question.** The mandatory `feature-spec` checkpoint makes the human approve the `## Feature acceptance` E2E. That content was written during brainstorm and approved there as the feature's definition-of-done. Approving it twice is the same "paying twice" ADR 0004 removed when it merged the plan phase into brainstorm — one phase later. The `spec` per-requirement tag has the same shape: a stop on acceptance criteria the human already approved.
3. **A digest you have to dig behind.** The Code digest exists so the human approves from digests rather than the diff (ADR 0003). But `### Flow` carries no branches, no before → after, and no readable hop labels, and `### Key files` is capped at five files for the whole feature. Verifying one requirement's behavior therefore means grepping or opening the diff — exactly the digging the digest was built to prevent.

## Approaches considered

**Where to cut the review cost.** Three options. (a) *Narrow the reviewed diff to the "core" requirement* — rejected: the feature review is one pass over the whole part diff, and narrowing the diff leaves the other requirements unreviewed. Worse coverage, not leaner. (b) *Reduce reviewer count globally* — rejected: it under-reviews the only review that exists, and the packet mechanism already makes four roles cheaper than they look (reviewers read a script-assembled file; the 1.8x wall-clock win in this repo's own measurement came from that, not from cheap roles). (c) *Kill the per-requirement duplicate and scale the one remaining review to design risk* — chosen: it removes the duplication at its source and keeps full coverage where risk actually is.

**What replaces the auto-tag.** (a) *Remove it, default `skip`* — chosen. (b) *Downgrade it to `inline`* — rejected: still a silent opt-in review on the agent's judgment rather than the human's, and it hides the moment where a human would have chosen differently. The human can already tag `inline`; the auto-tag added no capability, only surprise.

**How the feature review should scale.** (a) *Keep `parallel` as default* — rejected: a docs-only or config-only part pays four fresh-context roles for nothing. (b) *Default `inline`, `parallel` opt-in* — rejected: the safety default would flip to the weakest setting, so a design that never says anything would get less scrutiny than today. (c) *`auto`, keyed on the design's own risk content* — chosen: the design doc already declares risk in two mirrored places, so the review weight follows a declaration a human approved rather than a guess.

**Which risk signal `auto` reads.** A non-empty `## Production-risk areas` section, or a non-empty `### Production-risk notes` on any requirement. Both, because the design rules mirror the two into each other and either alone can drift out of sync.

**How to replace the feature-spec stop.** (a) *Keep the stop* — rejected: re-asks the brainstorm-approved E2E. (b) *Delete it silently* — rejected: an E2E encoding the wrong behavior is the one failure the agent cannot self-detect; with no notice there is no human window before implementation burns against a wrong spec. (c) *A one-line notice and continue* — chosen: it preserves the window at zero stop cost, and the ship stop remains the gate.

**Where to put the digest's new detail.** (a) *A new `R# | What changed | Entry point | Deviated?` index table* — rejected: it would be the fourth R#-keyed table and duplicates the Execution summary's `Deviated?` and `How it was built`. (b) *Add a location column to the Execution summary, keyed by commit SHA* — rejected: the SHA is stable but adds nothing a `git log` does not, and it widens the one table that is already read every time. (c) *A reviewer-authored `Where` column in the coverage table* — rejected: reviewers report against a packet snapshot, so the column goes stale precisely when a post-packet fix lands, and it would need a separate rule for `inline` mode. (d) *Enrich `### Flow` into a spine + branches map with `[R#]` tags* — chosen: it is the one section whose job is already "how the change works", and enrichment there makes the coverage table navigable without adding an artifact to maintain.

**What identifies a location in the Flow.** (a) `file:line` — rejected: line numbers rot on any edit above them, and a stale anchor is worse than none. (b) `R#` only — rejected: not greppable into code. (c) *Symbol or module names* — chosen: greppable, stable under edits, and readable as prose inside a hop chain.

**Where the Flow's depth stops.** (a) *Let the digest grow* — rejected: the digest is the thing the human reads at the one remaining stop; an unbounded Flow recreates the digging problem. (b) *Offer `/skill:pwk-walkthrough` beyond a cap* — chosen: the kit already ships a wholesale-regenerated, `file:line`-anchored deep read, so depth has a home that is not the digest.

## Architecture

No new component, file, or runtime surface. The change is confined to skill text, the four `docs/*.md` guides, the lint/test suite, and the changelog:

- **`extensions/workflow-guard.ts` — untouched.** The guard models only `brainstorm | null` phases and enforces write boundaries; it never modelled checkpoints or reviews, so leaner gates carry zero extension risk and no new guard state.
- **Design-doc tags carry the whole protocol.** `### Checkpoints` (now `none | full`), `### Review` (human-tagged only), and `### Feature review` (now with `auto`) — the same in-band mechanism the kit already uses, so no configuration file is introduced.
- **Delegation contract unchanged.** The provider contract, the role files, the packet script, and the `parallel-review` capability request keep exactly their current shape; only the *decision* of which review weight to request changes.

## Components

| File | Change |
|------|--------|
| `skills/pwk-brainstorming/SKILL.md` | Delete the auto-tag rule and its "single source of truth" paragraph; `### Checkpoints: none | full`; delete the "`spec` requires at least `inline` review" rule; `### Feature review: auto | parallel | inline` (default `auto`) with one line defining what `auto` keys on |
| `skills/pwk-executing-tasks/SKILL.md` | `First run` step 6: checkpoint → notice and continue; delete the `spec` branch and the paired review rule; the Feature review section resolves `auto` before spawning; digest fill rules gain the enriched `### Flow` spec, the walkthrough escape hatch, and the flow-truth rule; tags reference updated |
| `skills/pwk-status/SKILL.md` | `e2e-written` → `execute 0/N`; legacy `feature-spec-paused` → `execute 0/N`; the `feature-spec` display state is retired |
| `docs/workflow-phases.md` | Lifecycle diagram, the Proportionality section, and the executing-tasks section updated to the one-stop flow |
| `docs/oversight-model.md` | executing-tasks bullet: "two mandatory checkpoints" → one (ship); auto-tag mention removed |
| `docs/developer-usage-guide.md` | Tips: tag vocabularies corrected, auto-tag sentence and `spec` guidance removed |
| `tests/skill-lint.mjs` | Checkpoint vocabulary drops `spec`; the "spec requires inline" checks become absence assertions; the `feature-spec` checkpoint marker becomes a notice assertion; `auto` joins the feature-review vocabulary; the auto-tag checks become absence assertions |
| `tests/markers.mjs` | State markers: `e2e-written` → `execute 0/N`; new markers for the notice and for `auto` |
| `tests/pwk-status.test.ts` | Fixture expectations updated to the new `execute 0/N` rendering |
| `tests/code-digest.test.ts`, `tests/human-review-digests.test.ts` | `### Flow` shape assertions updated to the enriched shape |
| `CHANGELOG.md`, `package.json` | **2.2.0** — changed defaults, backward-compatible; migration note covering `spec` → `none` and legacy `feature-spec-paused` resume |

## Data flow

```
/skill:pwk-brainstorming
  -> design doc; ## Feature acceptance carries ### Feature review: auto
  -> NO auto-tag on risk requirements; any requirement may be human-tagged

/skill:pwk-executing-tasks
  -> parse tags; resolve `auto` against the design's risk content
  -> write the feature E2E (red)
  -> NOTICE, not a stop: "E2E written, failing as expected - it proves X"     [e2e-written]
  -> implement R1..Rn back-to-back; TDD per slice; full suite after each commit  [implementing (k/N)]
     - per-requirement stop only when tagged `full`
     - per-requirement review only when the human tagged `inline`/`parallel`
  -> full suite + feature E2E green
  -> ONE review: four roles (risk content present) | one inline pass (not)    [reviewing]
  -> write the Code digest (enriched ### Flow; agrees with the tracing report)
  -> SHIP CHECKPOINT - the one mandatory stop                              [ship-paused]
  -> approved -> done

/skill:pwk-finalizing   (unchanged: full suite, learning sweep, dispose, merge)
```

Stop count per feature becomes: brainstorm Q&A + one ship stop. Before: brainstorm Q&A + feature-spec stop + ship stop + up to N x 4 reviewer spawns.

The enriched digest, concretely (labels are placeholders from an unrelated feature to show the shape):

```markdown
### Flow
Spine
  /skill:pwk-status
   -> [R2] list docs/plans recursively, skip completed/
   -> [R3] per progress file: readPhaseLine() - only the `Feature phase:` line
   -> [R1] mapPhaseToState()
   -> [R1] roll up by umbrella
   -> print

Branches
  `done`                 -> terminal, `done N/N` (tally = table row count)   [R1]
  `implementing (k/N)`   -> `execute k/N`                                    [R1]
  `e2e-written`          -> `execute 0/N`          was: shown as "feature-spec"
  `reviewing` (legacy `feature-complete-paused`) -> `review`
  design only            -> `design` + next-step hint
  roster only            -> `not started`
  unparseable header     -> `execute`   !! design-only part reads as in-flight

Side effects
  reads: docs/plans/**/*-progress.md - header line only
  writes: none
```

## Error handling

- **`auto` versus an explicit tag.** An explicit `### Review` / `### Feature review` value always wins; `auto` never overrides it in either direction — a human who tags `inline` on a risky design gets `inline`, and a human who tags `parallel` on a docs-only design gets `parallel`.
- **A missing `### Feature review` tag** resolves as `auto`, not as "no review". The feature review is always on.
- **An unknown or legacy checkpoint value** (in-flight `spec`) resolves to `none` and is documented in the changelog migration note, mirroring how the kit already routes legacy progress files rather than failing.
- **An E2E that cannot reach green** stops execution and presents the failure — iterate-to-green is the default, the stop is reserved for genuine blockage, and the agent must never leave partial work on the shipped branch.
- **An E2E that passes immediately** is probed before proceeding; if the expected behavior still looks wrong, the agent stops and presents rather than implementing against a wrong spec.
- **A reviewer report without a per-requirement coverage table** remains invalid: retry the role or complete it inline. The ship checkpoint is never presented without coverage.
- **A Flow that disagrees with the tracing report** is corrected before writing, or reported to the human at the ship stop — never smoothed over.


## Feature acceptance (verbatim)
## Feature acceptance

- Given the kit with this change and a part whose design doc carries no production-risk content, When the part is executed end to end, Then the run reaches the ship checkpoint with exactly one mandatory human stop after design approval (the ship stop), zero per-requirement reviews and zero reviewer roles were requested, and the presented digest shows an `### Flow` with `[R#]`-tagged hops, a branches block, and no line numbers.
- Given the same flow but the design doc carries production-risk content and requirement R2 is explicitly tagged `### Review: inline`, When the part is executed, Then the feature review requests exactly four reviewer roles over the whole feature diff, R2 additionally receives one inline review pass with its own `-review-packet-r2.md` while every untagged requirement receives none, and the ship checkpoint reports both.
- Given a progress file at `Feature phase: e2e-written`, When `/skill:pwk-status` runs, Then the topic renders `execute 0/N` and never the retired `feature-spec` state.


## Production-risk notes (verbatim, if any)

## Diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 929e8e6..b131ee0 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -4,6 +4,26 @@ All notable changes to this project will be documented in this file.
 
 The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
+## [2.2.0] - 2026-09-11
+
+### Changed
+
+- **Per-requirement review auto-tag removed** — `pwk-brainstorming` no longer tags a requirement `### Review: parallel` merely because it carries `### Production-risk notes`. `### Review` defaults to `skip` everywhere and **only the human tags** a slice; the feature review already covers the whole diff, including risk requirements. The removed rule was the source of reviewer-role multiplication: a part with four risk-tagged requirements paid four roles per requirement *plus* four at the ship checkpoint.
+- **One risk-scaled feature review** — the feature-level tag becomes `### Feature review: auto | parallel | inline` (default `auto`). `auto` resolves on the design's own production-risk content: `parallel` (four fresh-context roles) when the design has a non-empty `## Production-risk areas` section or any requirement has non-empty `### Production-risk notes`, `inline` (one `pwk-code-review` pass) otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`.
+- **Feature-spec checkpoint becomes a notice** — the feature-acceptance E2E is still written first (red) and is still the primary enforced gate at the ship checkpoint, but it is now *reported* with its failing output instead of pausing execution: its text was already approved as `## Feature acceptance` during brainstorm. Mandatory human stops per feature drop to one (ship). `pwk-status` renders `e2e-written` as `execute 0/N` and the `feature-spec` display state is retired.
+- **`spec` removed from the per-requirement Checkpoints enum** — `### Checkpoints` accepts `none | full` (default `none`). The retired value was a stop on acceptance criteria the human had already approved at design time; the paired "`spec` requires at least `inline` review" rule went with it.
+- **Enriched Code digest `### Flow`** — the ship digest's flow section becomes a navigable map: a `Spine` of `[R<n>]`-tagged hops named by symbol or module (no line numbers, no file paths), a `Branches` list giving every alternative and error path as `condition -> outcome`, `was: …` clauses where behavior changed, worked values inline, and a `Side effects` line when the feature performs I/O. Capped at roughly 15 lines; beyond that the ship checkpoint offers `/skill:pwk-walkthrough` as the deep read instead of growing the digest.
+
+### Added
+
+- **Flow-truth rule** — the digest's `### Flow` is written from reviewed reality: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names, and in `inline` mode it is checked against that pass's spec-coverage result. A discrepancy that cannot be resolved is surfaced to the human at the ship checkpoint rather than smoothed over.
+
+### Migration
+
+- In-flight design docs tagged with the retired `spec` checkpoint value resolve to `none` — no stop, no error.
+- Legacy progress files at `Feature phase: feature-spec-paused` resume into the implement phase and render as `execute 0/N` in `pwk-status`.
+- A missing `### Feature review` tag now means `auto` (risk-scaled), not unconditional `parallel`; a design that wants the previous always-four-roles behavior writes `### Feature review: parallel`.
+
 ## [2.1.2] - 2026-09-10
 
 ### Changed
diff --git a/README.md b/README.md
index 6a6cfb9..95fba91 100644
--- a/README.md
+++ b/README.md
@@ -63,7 +63,7 @@ Guide the agent through a disciplined development process:
 
 ```
 brainstorm → executing-tasks → finalizing
-                             (feature-gate: write feature E2E → feature-spec → implement → review → ship checkpoint)
+                             (feature-gate: write feature E2E → report it → implement → review → ⏸ ship checkpoint)
                                 ↕
                    diagnose (anytime)   ·   status (anytime)
 ```
@@ -73,7 +73,7 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
 | Phase | Trigger | What Happens |
 |-------|---------|--------------|
 | **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc opening with a `## At a glance` digest (plain summary → **Key decisions** — rejected-alternative clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) before the `## Requirements` blocks; each requirement block carries its own acceptance criteria + review tags. Interviews in **frontier rounds**: numbered questions each with a recommended answer, facts looked up rather than asked, an assumption gate before the design is presented. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
-| **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **checkpoint: feature-spec** → implement the design doc's `### R<n>` requirement blocks → feature review → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
+| **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **report it, no stop** → implement the design doc's `### R<n>` requirement blocks → feature review (risk-scaled: four roles or one inline pass) → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
 | **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
 | **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs or archive them under `docs/plans/completed/` (discovery always runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), update README/CHANGELOG, create PR |
 | **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
@@ -102,9 +102,9 @@ The design doc specifies *what*, not *how*. Each `### R<n>:` requirement block g
 The feature is implemented via the feature-gate flow:
 
 1. Write the feature-acceptance E2E test (red)
-2. ⏸ **checkpoint: feature-spec** — you confirm the E2E proves the feature
+2. **Report it — no stop** — one or two lines saying what the E2E proves, plus its failing output; the run continues straight into implementation (that text was already approved as `## Feature acceptance` during brainstorm, so this is the window to object before code is written, not a sign-off gate)
 3. Implement the requirements back-to-back (TDD: meaningful test → red → green per slice; full autonomy)
-4. Feature review (four fresh-context roles over a script-assembled review packet)
+4. Feature review — risk-scaled: four fresh-context roles over a script-assembled review packet when the design carries production-risk content, otherwise one inline pass
 5. ⏸ **ship checkpoint** — full suite + feature E2E green; you review the execution summary + coverage table (full diff on request)
 
 Per-requirement checkpoints/reviews are opt-in (default off); the feature-level review covers everything.
@@ -128,16 +128,15 @@ Rules are simple imperative bullets:
 
 No configuration needed — the agent creates `docs/lessons.md` on first use and it grows as the agent learns.
 
-### Two Feature-Level Checkpoints
+### One Feature-Level Checkpoint
 
-The feature-gate flow has **two hard human-review gates** (not optional):
+The feature-gate flow has **one hard human-review gate** (not optional):
 
 | Checkpoint | What's done | What you review |
 |---|---|---|
-| **feature-spec** | Feature-acceptance E2E written, confirmed failing | Does the E2E actually prove the feature? |
-| **ship** | All requirements implemented; full suite + E2E green; feature review collected | Execution summary + per-requirement coverage table — built as promised? (full diff on request) |
+| **ship** | All requirements implemented; full suite + E2E green; feature review collected | Execution summary + code digest + per-requirement coverage table — built as promised? (full diff on request) |
 
-The agent stops and waits at each — approve, request changes, or send it back.
+The agent stops and waits there — approve, request changes, or send it back. The feature-acceptance E2E is still written first and still gated at the ship checkpoint; it is reported before implementation without pausing, because its text was approved as `## Feature acceptance` during brainstorm.
 
 ### Before You Ship: the Ship Gate
 
@@ -170,7 +169,7 @@ pi install npm:@tianhai/pi-workflow-kit
 
 - **AI agents skip design.** Left unchecked, they jump to code and over-engineer. This forces a think-first workflow.
 - **Specs beat recipes.** Plans are behavioral specs (acceptance criteria + tests), not implementation recipes — they don't invalidate when details change.
-- **You stay in control.** Two feature-level checkpoints let you approve the feature spec (E2E) and the finished implementation before the agent ships.
+- **You stay in control.** One feature-level checkpoint (ship) lets you sign off the finished implementation — execution summary, code digest, and coverage table — before the agent ships; the E2E is reported before implementation so you can object early.
 - **Enforced, not suggested.** Hard blocks mean the agent can't ignore the rules — not even accidentally.
 
 ## Project
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index 5a88585..83f9985 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -62,11 +62,11 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with
 /skill:pwk-executing-tasks
 ```
 
-Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
+Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **report it (no stop)** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. One mandatory checkpoint (ship) at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
 
 ### 3. Code review (feature level)
 
-The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.
+The `pwk-executing-tasks` skill resolves the design's `### Feature review` tag (`auto` by default) and then either requests the `parallel-review` capability for four logical roles over the whole feature diff — spec alignment, code tracing, code smells, and production hazards — when the design carries production-risk content, or runs one inline pass when it does not. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.
 
 In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`, where compatible providers such as `@tintinweb/pi-subagents` can discover them. `/pwk-setup --fast-model <model>` (or the interactive picker) sets the fast-tier model for the smell/hazard reviewers — an advisory hint hosts may honor. Tintinweb may run the roles through its native `Agent` mechanism or map recon to its built-in read-only `Explore` type. The core kit does not require Tintinweb or any other provider.
 
@@ -124,6 +124,6 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
 
 - Start with brainstorming for anything non-trivial.
 - The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
-- The feature-gate flow has two checkpoints by default (feature-spec + ship): use them to steer the E2E spec and to sign off the finished implementation (digest + coverage, diff on request).
-- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-brainstorming`; the human can override or downgrade before design approval.
+- The feature-gate flow has **one** mandatory checkpoint (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
+- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`, default `none` — the acceptance criteria were approved at design time, so there is no per-requirement correctness stop) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The risk-scaled feature-level `### Feature review` covers the whole diff. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
 - Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
diff --git a/docs/oversight-model.md b/docs/oversight-model.md
index 342f2e1..f8e8454 100644
--- a/docs/oversight-model.md
+++ b/docs/oversight-model.md
@@ -7,8 +7,8 @@
 Skills teach the agent the workflow. There are 5 pipeline skills:
 
 - **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
-- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the design doc's `### R<n>` requirement blocks, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
-- **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review requests the `parallel-review` capability for four logical fresh-context, read-only roles; successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
+- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, report it (no stop), implement the design doc's `### R<n>` requirement blocks, then one risk-scaled feature-level review before the **ship checkpoint** (execution summary + code digest + coverage table presented for approval; full diff on request); one mandatory checkpoint (ship), per-requirement ceremony opt-in
+- **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review resolves the design's `### Feature review` tag (`auto` by default): four logical fresh-context, read-only roles when the design carries production-risk content, otherwise one inline pass. successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
 - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
 
 Plus 2 on-demand skills:
diff --git a/docs/plans/2026-09-11-leaner-execution-gates-design.md b/docs/plans/2026-09-11-leaner-execution-gates-design.md
new file mode 100644
index 0000000..f1068b8
--- /dev/null
+++ b/docs/plans/2026-09-11-leaner-execution-gates-design.md
@@ -0,0 +1,240 @@
+# Leaner execution gates
+
+Date: 2026-09-11
+Status: design (not yet executed)
+
+## At a glance
+
+Every feature currently pays ceremony that no longer buys anything. Two leaks: `pwk-brainstorming` silently auto-tags every requirement that carries production-risk notes for a four-reviewer per-requirement review, and `pwk-executing-tasks` then runs those four roles **per requirement** *and* again over the whole diff at the ship checkpoint — up to 20 reviewer spawns for a risk-touching part. Separately, the mandatory **feature-spec** checkpoint asks the human to approve the `## Feature acceptance` E2E, content the human already approved during brainstorm. This change deletes the auto-tag, scales the single feature review to the design's real risk content, turns the feature-spec stop into a one-line notice, drops the redundant `spec` checkpoint tag, and enriches the ship digest's `### Flow` so the one remaining stop is self-serve. No new machinery: the guard extension is untouched, and per-requirement ceremony stays available to a human who tags a slice.
+
+**Key decisions**
+
+- **Per-requirement review auto-tag deleted** — `### Review` defaults to `skip` everywhere; only a human tags a slice. (rejected: downgrade the auto-tag to `inline` — it preserves a silent opt-in review nobody asked for, and the feature review already covers the whole diff including risk requirements.)
+- **One feature review per part, risk-scaled** via `### Feature review: auto | parallel | inline`, default `auto` — four roles when the design carries production-risk content, one inline pass otherwise. (rejected: keep `parallel` as the default — pays four fresh-context roles for a docs-only or config-only part; rejected: default `inline` — under-reviews the one review that exists, so a risky feature would get less scrutiny than before.)
+- **Feature-spec checkpoint becomes a notice** — the E2E is still written first (red), still iterated to green, still the primary enforced gate at the ship stop; it is just no longer a pause. (rejected: keep the stop — it re-asks the `## Feature acceptance` question approved in brainstorm, which is ADR 0004's "paying twice" one phase later; rejected: no notice at all — an E2E that encodes the wrong behavior would drive an agent to "fix" correct code with no human window to catch it.)
+- **`spec` dropped from the Checkpoints enum** (`none | full`) — it was a stop on acceptance criteria the human already approved. (rejected: keep it — the criteria were approved at design time, so the tests stop re-asks an answered question; `full` survives because a complete-slice stop is the only way to interrupt a risky slice mid-flight.)
+- **Digest enrichment lands in `### Flow`, not a new index table** — spine + branches + `was:` clauses, labelled with symbol names. (rejected: an `R# | What changed | Entry point | Deviated?` table — a fourth R#-keyed table restating the Execution summary; rejected: a commit-SHA column — it stays correct but is one `git log` away, and `file:line` anchors rot on any edit above them; rejected: a reviewer-authored `Where` column in the coverage table — it goes stale exactly when a post-packet fix lands.)
+- **Flow labels are symbol/module names; no line numbers anywhere in the digest** — they survive edits, and a hop chain is a navigable map only if the labels can be grepped. (rejected: per-requirement before → after sections — they read well for vertical slices but lose the composed end-to-end story that proves the requirements chain together.)
+
+| R# | Requirement in one line | Risk |
+|----|-------------------------|------|
+| R1 | The per-requirement review auto-tag is deleted; `### Review` defaults to `skip` and only the human tags a slice | Low |
+| R2 | `### Feature review: auto` resolves to four roles when the design has production-risk content, one inline pass otherwise | Med |
+| R3 | The feature-spec checkpoint becomes a notice; `pwk-status` renders `e2e-written` as `execute 0/N` | Med |
+| R4 | `spec` is removed from the Checkpoints enum across every consumer site | Med |
+| R5 | The Code digest's `### Flow` is enriched (spine + `[R#]` + branches + `was:` + values + side effects), capped ~15 lines | Low |
+| R6 | The written Flow must agree with the tracing report; a discrepancy is surfaced, never smoothed over | Low |
+
+## Requirements
+
+### R1: Per-requirement review auto-tag removed
+
+`pwk-brainstorming` no longer silently tags requirements for review: a requirement's effective `### Review` value is `skip` unless the design doc explicitly tags it.
+
+**Acceptance criteria** — since the deliverable is skill/document text, the observable interface is the file content the host loads and the test suite that asserts it.
+
+- Given a design doc whose requirement block has a non-empty `### Production-risk notes` section and no explicit `### Review` tag, When executing-tasks parses the design doc, Then that requirement's effective review is `skip` — no reviewer roles are requested for it and no `-review-packet-r<N>.md` is written for it.
+- Given `skills/pwk-brainstorming/SKILL.md` and `skills/pwk-executing-tasks/SKILL.md` and `docs/workflow-phases.md` and `docs/developer-usage-guide.md`, When the lint suite runs, Then none of them pairs the auto-tag concept with `Production-risk notes` (no silent tagging rule survives) and none claims a single source of truth for such a rule.
+- Given `skills/pwk-brainstorming/SKILL.md`, When the lint suite runs, Then it still states that `### Review` accepts `skip | parallel | inline`, that `skip` is the default, and that the human may tag a requirement explicitly.
+- Given a design doc that explicitly tags one requirement `### Review: inline`, When executing-tasks parses it, Then that one requirement gets a single inline review pass and the untagged requirements get none (edge case: explicit human tagging still works).
+
+### Checkpoints: none
+### Review: skip
+
+### R2: Feature review is one risk-scaled pass
+
+The single whole-part feature review resolves `auto` against the design doc's risk content, requesting four roles only when the design actually carries risk.
+
+**Acceptance criteria**
+
+- Given a design doc whose `## Feature acceptance` section carries `### Feature review: auto` and which has no `## Production-risk areas` section and no non-empty `### Production-risk notes` on any requirement, When executing-tasks reaches the feature review, Then it requests zero reviewer roles and performs one inline `pwk-code-review` pass over the whole feature diff.
+- Given the same tag and a non-empty `## Production-risk areas` section, When the feature review runs, Then it requests all four reviewer roles (spec, tracing, smell, hazard) over the whole feature diff.
+- Given the same tag and instead a non-empty `### Production-risk notes` on a single requirement, When the feature review runs, Then it likewise requests all four reviewer roles (edge case: either risk signal is sufficient).
+- Given `### Feature review: parallel` on a design doc with no risk content, When the feature review runs, Then four roles run (explicit tag wins over `auto` resolution).
+- Given `### Feature review: inline` on a design doc that does carry risk content, When the feature review runs, Then one inline pass runs and no roles are requested (explicit tag wins in both directions).
+- Given no `### Feature review` tag at all, When the feature review runs, Then `auto` resolution applies (edge case: missing tag falls back to the default, not to no review).
+- Given any resolution path, Then the feature review runs exactly once per part — never once per requirement (edge case: the total reviewer-role count for a risk-touching part is four, not four times the requirement count).
+
+### Checkpoints: none
+### Review: skip
+
+### R3: Feature-spec checkpoint becomes a notice
+
+The E2E is still written first and must be observed failing, but its presentation no longer pauses execution.
+
+**Acceptance criteria**
+
+- Given the feature E2E has been written and observed failing, When executing-tasks proceeds past it, Then it posts one notice — one or two plain-language lines stating what the E2E proves, plus the failing output — and continues directly into the implement phase without waiting for approval.
+- Given the progress file after that notice, When a session resumes, Then `Feature phase: e2e-written` routes into the implement phase rather than re-presenting a stop.
+- Given a progress file whose `Feature phase` is `e2e-written`, When `pwk-status` runs, Then the topic renders as `execute 0/N`.
+- Given a legacy progress file whose `Feature phase` is `feature-spec-paused`, When `pwk-status` runs, Then the topic renders as `execute 0/N` and never as the retired `feature-spec` state.
+- Given the E2E cannot be brought to green, When the agent is blocked, Then it stops and presents the failure rather than proceeding (iterate-to-green remains the default; the stop moves to the genuine failure case).
+- Given the E2E passes immediately, When executing-tasks observes that, Then it probes the cause before proceeding and stops to present if the expected behavior still looks wrong (edge case: an E2E that encodes wrong behavior must not be implemented against silently).
+
+### Checkpoints: none
+### Review: skip
+
+### R4: `spec` removed from the Checkpoints enum
+
+Per-requirement checkpoints accept `none | full` only; the paired "`spec` requires at least `inline` review" rule goes with it.
+
+**Acceptance criteria**
+
+- Given `skills/pwk-brainstorming/SKILL.md`, `skills/pwk-executing-tasks/SKILL.md`, `docs/workflow-phases.md`, and `docs/developer-usage-guide.md`, When the lint suite runs, Then no `### Checkpoints` enumeration in any of them lists `spec`, and the lint vocabulary constant contains no `spec` value.
+- Given the lint suite, When it runs, Then no file asserts the retired rule that `spec` requires at least `inline` review, and the two files that previously documented it no longer do.
+- Given a design doc with no `### Checkpoints` tag, When executing-tasks parses it, Then the effective value is `none` and no per-requirement stop fires (default preserved).
+- Given a design doc tagged `### Checkpoints: full`, When executing-tasks parses it, Then the tests stop and the complete stop both still fire (the surviving value is intact).
+- Given an in-flight design doc whose requirement still carries the legacy `### Checkpoints: spec`, When executing-tasks parses it, Then it treats the unrecognized value as `none` and proceeds without a stop rather than failing (edge case: the migration path is defined, not accidental).
+- Given the `CHANGELOG.md` entry for this change, Then it states the legacy `spec` → `none` mapping in its migration note.
+
+### Checkpoints: none
+### Review: inline
+
+### R5: Enriched Code digest `### Flow`
+
+The digest's `### Flow` becomes the ship stop's navigable map: a spine, its branches, and the changed behavior — with symbol labels and no line numbers.
+
+**Acceptance criteria**
+
+- Given a progress file written after a feature review, When the ship checkpoint is assembled, Then the `## Code digest`'s `### Flow` contains a spine whose hops each carry an `[R<n>]` tag, a branches list giving each alternative and error path as `condition -> outcome`, a `was: …` clause for every requirement whose behavior changed, worked values inline wherever a mapping is non-obvious, and a side-effects line naming the reads and writes when the feature performs I/O.
+- Given any written digest, When it is inspected, Then `### Flow` contains no line numbers, and its labels are symbol or module names rather than file paths.
+- Given a feature the Flow would describe in more than roughly 15 lines, When the ship checkpoint is assembled, Then `/skill:pwk-walkthrough` is offered as the deep read and the digest is not grown past the cap.
+- Given a purely additive feature (no requirement changes existing behavior), Then no `was:` clause is required and none is invented (edge case: honest-empty).
+- Given a feature that performs no I/O, Then the side-effects line is omitted rather than filled with a placeholder (edge case: honest-empty).
+- Given the `## Execution summary` table, When the digest is written, Then it is unchanged — four columns, no location or commit column is added.
+
+### Checkpoints: none
+### Review: skip
+
+### R6: Flow truth is checked against the tracing report
+
+The Flow is written once, after the review, from reviewed reality rather than the author's recollection.
+
+**Acceptance criteria**
+
+- Given the feature review resolved to `parallel`, When the digest is written, Then every path hop in the `### Flow` corresponds to a path the tracing reviewer reported, or the Flow is corrected before it is written.
+- Given the feature review resolved to `inline`, When the digest is written, Then the Flow is checked against that pass's spec-coverage result instead (edge case: no tracing report exists in this mode).
+- Given a tracing report naming a path that the drafted Flow omits, When the discrepancy cannot be resolved, Then the ship checkpoint reports it to the human rather than writing the Flow as if complete.
+- Given `skills/pwk-executing-tasks/SKILL.md`, When the lint suite runs, Then it states that the Flow must agree with the tracing report (or the inline spec-coverage pass) and that unresolved disagreements are surfaced, not smoothed over.
+
+### Checkpoints: none
+### Review: skip
+
+## Problem
+
+Two ceremony leaks and one thin digest.
+
+1. **Duplicated reviews.** `pwk-brainstorming` owns the auto-tag rule: a requirement with a non-empty `### Production-risk notes` section is silently tagged `### Review: parallel`. `pwk-executing-tasks` then spawns four fresh-context reviewers for each such requirement, and the ship checkpoint spawns the same four roles again over the whole feature diff. A risk-touching part with four risk requirements therefore pays twenty role spawns for coverage the feature review already provides over the whole diff — at four times the wall-clock of the review that would have caught the same issues.
+2. **A stop that re-asks an answered question.** The mandatory `feature-spec` checkpoint makes the human approve the `## Feature acceptance` E2E. That content was written during brainstorm and approved there as the feature's definition-of-done. Approving it twice is the same "paying twice" ADR 0004 removed when it merged the plan phase into brainstorm — one phase later. The `spec` per-requirement tag has the same shape: a stop on acceptance criteria the human already approved.
+3. **A digest you have to dig behind.** The Code digest exists so the human approves from digests rather than the diff (ADR 0003). But `### Flow` carries no branches, no before → after, and no readable hop labels, and `### Key files` is capped at five files for the whole feature. Verifying one requirement's behavior therefore means grepping or opening the diff — exactly the digging the digest was built to prevent.
+
+## Approaches considered
+
+**Where to cut the review cost.** Three options. (a) *Narrow the reviewed diff to the "core" requirement* — rejected: the feature review is one pass over the whole part diff, and narrowing the diff leaves the other requirements unreviewed. Worse coverage, not leaner. (b) *Reduce reviewer count globally* — rejected: it under-reviews the only review that exists, and the packet mechanism already makes four roles cheaper than they look (reviewers read a script-assembled file; the 1.8x wall-clock win in this repo's own measurement came from that, not from cheap roles). (c) *Kill the per-requirement duplicate and scale the one remaining review to design risk* — chosen: it removes the duplication at its source and keeps full coverage where risk actually is.
+
+**What replaces the auto-tag.** (a) *Remove it, default `skip`* — chosen. (b) *Downgrade it to `inline`* — rejected: still a silent opt-in review on the agent's judgment rather than the human's, and it hides the moment where a human would have chosen differently. The human can already tag `inline`; the auto-tag added no capability, only surprise.
+
+**How the feature review should scale.** (a) *Keep `parallel` as default* — rejected: a docs-only or config-only part pays four fresh-context roles for nothing. (b) *Default `inline`, `parallel` opt-in* — rejected: the safety default would flip to the weakest setting, so a design that never says anything would get less scrutiny than today. (c) *`auto`, keyed on the design's own risk content* — chosen: the design doc already declares risk in two mirrored places, so the review weight follows a declaration a human approved rather than a guess.
+
+**Which risk signal `auto` reads.** A non-empty `## Production-risk areas` section, or a non-empty `### Production-risk notes` on any requirement. Both, because the design rules mirror the two into each other and either alone can drift out of sync.
+
+**How to replace the feature-spec stop.** (a) *Keep the stop* — rejected: re-asks the brainstorm-approved E2E. (b) *Delete it silently* — rejected: an E2E encoding the wrong behavior is the one failure the agent cannot self-detect; with no notice there is no human window before implementation burns against a wrong spec. (c) *A one-line notice and continue* — chosen: it preserves the window at zero stop cost, and the ship stop remains the gate.
+
+**Where to put the digest's new detail.** (a) *A new `R# | What changed | Entry point | Deviated?` index table* — rejected: it would be the fourth R#-keyed table and duplicates the Execution summary's `Deviated?` and `How it was built`. (b) *Add a location column to the Execution summary, keyed by commit SHA* — rejected: the SHA is stable but adds nothing a `git log` does not, and it widens the one table that is already read every time. (c) *A reviewer-authored `Where` column in the coverage table* — rejected: reviewers report against a packet snapshot, so the column goes stale precisely when a post-packet fix lands, and it would need a separate rule for `inline` mode. (d) *Enrich `### Flow` into a spine + branches map with `[R#]` tags* — chosen: it is the one section whose job is already "how the change works", and enrichment there makes the coverage table navigable without adding an artifact to maintain.
+
+**What identifies a location in the Flow.** (a) `file:line` — rejected: line numbers rot on any edit above them, and a stale anchor is worse than none. (b) `R#` only — rejected: not greppable into code. (c) *Symbol or module names* — chosen: greppable, stable under edits, and readable as prose inside a hop chain.
+
+**Where the Flow's depth stops.** (a) *Let the digest grow* — rejected: the digest is the thing the human reads at the one remaining stop; an unbounded Flow recreates the digging problem. (b) *Offer `/skill:pwk-walkthrough` beyond a cap* — chosen: the kit already ships a wholesale-regenerated, `file:line`-anchored deep read, so depth has a home that is not the digest.
+
+## Architecture
+
+No new component, file, or runtime surface. The change is confined to skill text, the four `docs/*.md` guides, the lint/test suite, and the changelog:
+
+- **`extensions/workflow-guard.ts` — untouched.** The guard models only `brainstorm | null` phases and enforces write boundaries; it never modelled checkpoints or reviews, so leaner gates carry zero extension risk and no new guard state.
+- **Design-doc tags carry the whole protocol.** `### Checkpoints` (now `none | full`), `### Review` (human-tagged only), and `### Feature review` (now with `auto`) — the same in-band mechanism the kit already uses, so no configuration file is introduced.
+- **Delegation contract unchanged.** The provider contract, the role files, the packet script, and the `parallel-review` capability request keep exactly their current shape; only the *decision* of which review weight to request changes.
+
+## Components
+
+| File | Change |
+|------|--------|
+| `skills/pwk-brainstorming/SKILL.md` | Delete the auto-tag rule and its "single source of truth" paragraph; `### Checkpoints: none | full`; delete the "`spec` requires at least `inline` review" rule; `### Feature review: auto | parallel | inline` (default `auto`) with one line defining what `auto` keys on |
+| `skills/pwk-executing-tasks/SKILL.md` | `First run` step 6: checkpoint → notice and continue; delete the `spec` branch and the paired review rule; the Feature review section resolves `auto` before spawning; digest fill rules gain the enriched `### Flow` spec, the walkthrough escape hatch, and the flow-truth rule; tags reference updated |
+| `skills/pwk-status/SKILL.md` | `e2e-written` → `execute 0/N`; legacy `feature-spec-paused` → `execute 0/N`; the `feature-spec` display state is retired |
+| `docs/workflow-phases.md` | Lifecycle diagram, the Proportionality section, and the executing-tasks section updated to the one-stop flow |
+| `docs/oversight-model.md` | executing-tasks bullet: "two mandatory checkpoints" → one (ship); auto-tag mention removed |
+| `docs/developer-usage-guide.md` | Tips: tag vocabularies corrected, auto-tag sentence and `spec` guidance removed |
+| `tests/skill-lint.mjs` | Checkpoint vocabulary drops `spec`; the "spec requires inline" checks become absence assertions; the `feature-spec` checkpoint marker becomes a notice assertion; `auto` joins the feature-review vocabulary; the auto-tag checks become absence assertions |
+| `tests/markers.mjs` | State markers: `e2e-written` → `execute 0/N`; new markers for the notice and for `auto` |
+| `tests/pwk-status.test.ts` | Fixture expectations updated to the new `execute 0/N` rendering |
+| `tests/code-digest.test.ts`, `tests/human-review-digests.test.ts` | `### Flow` shape assertions updated to the enriched shape |
+| `CHANGELOG.md`, `package.json` | **2.2.0** — changed defaults, backward-compatible; migration note covering `spec` → `none` and legacy `feature-spec-paused` resume |
+
+## Data flow
+
+```
+/skill:pwk-brainstorming
+  -> design doc; ## Feature acceptance carries ### Feature review: auto
+  -> NO auto-tag on risk requirements; any requirement may be human-tagged
+
+/skill:pwk-executing-tasks
+  -> parse tags; resolve `auto` against the design's risk content
+  -> write the feature E2E (red)
+  -> NOTICE, not a stop: "E2E written, failing as expected - it proves X"     [e2e-written]
+  -> implement R1..Rn back-to-back; TDD per slice; full suite after each commit  [implementing (k/N)]
+     - per-requirement stop only when tagged `full`
+     - per-requirement review only when the human tagged `inline`/`parallel`
+  -> full suite + feature E2E green
+  -> ONE review: four roles (risk content present) | one inline pass (not)    [reviewing]
+  -> write the Code digest (enriched ### Flow; agrees with the tracing report)
+  -> SHIP CHECKPOINT - the one mandatory stop                              [ship-paused]
+  -> approved -> done
+
+/skill:pwk-finalizing   (unchanged: full suite, learning sweep, dispose, merge)
+```
+
+Stop count per feature becomes: brainstorm Q&A + one ship stop. Before: brainstorm Q&A + feature-spec stop + ship stop + up to N x 4 reviewer spawns.
+
+The enriched digest, concretely (labels are placeholders from an unrelated feature to show the shape):
+
+```markdown
+### Flow
+Spine
+  /skill:pwk-status
+   -> [R2] list docs/plans recursively, skip completed/
+   -> [R3] per progress file: readPhaseLine() - only the `Feature phase:` line
+   -> [R1] mapPhaseToState()
+   -> [R1] roll up by umbrella
+   -> print
+
+Branches
+  `done`                 -> terminal, `done N/N` (tally = table row count)   [R1]
+  `implementing (k/N)`   -> `execute k/N`                                    [R1]
+  `e2e-written`          -> `execute 0/N`          was: shown as "feature-spec"
+  `reviewing` (legacy `feature-complete-paused`) -> `review`
+  design only            -> `design` + next-step hint
+  roster only            -> `not started`
+  unparseable header     -> `execute`   !! design-only part reads as in-flight
+
+Side effects
+  reads: docs/plans/**/*-progress.md - header line only
+  writes: none
+```
+
+## Error handling
+
+- **`auto` versus an explicit tag.** An explicit `### Review` / `### Feature review` value always wins; `auto` never overrides it in either direction — a human who tags `inline` on a risky design gets `inline`, and a human who tags `parallel` on a docs-only design gets `parallel`.
+- **A missing `### Feature review` tag** resolves as `auto`, not as "no review". The feature review is always on.
+- **An unknown or legacy checkpoint value** (in-flight `spec`) resolves to `none` and is documented in the changelog migration note, mirroring how the kit already routes legacy progress files rather than failing.
+- **An E2E that cannot reach green** stops execution and presents the failure — iterate-to-green is the default, the stop is reserved for genuine blockage, and the agent must never leave partial work on the shipped branch.
+- **An E2E that passes immediately** is probed before proceeding; if the expected behavior still looks wrong, the agent stops and presents rather than implementing against a wrong spec.
+- **A reviewer report without a per-requirement coverage table** remains invalid: retry the role or complete it inline. The ship checkpoint is never presented without coverage.
+- **A Flow that disagrees with the tracing report** is corrected before writing, or reported to the human at the ship stop — never smoothed over.
+
+## Feature acceptance
+
+- Given the kit with this change and a part whose design doc carries no production-risk content, When the part is executed end to end, Then the run reaches the ship checkpoint with exactly one mandatory human stop after design approval (the ship stop), zero per-requirement reviews and zero reviewer roles were requested, and the presented digest shows an `### Flow` with `[R#]`-tagged hops, a branches block, and no line numbers.
+- Given the same flow but the design doc carries production-risk content and requirement R2 is explicitly tagged `### Review: inline`, When the part is executed, Then the feature review requests exactly four reviewer roles over the whole feature diff, R2 additionally receives one inline review pass with its own `-review-packet-r2.md` while every untagged requirement receives none, and the ship checkpoint reports both.
+- Given a progress file at `Feature phase: e2e-written`, When `/skill:pwk-status` runs, Then the topic renders `execute 0/N` and never the retired `feature-spec` state.
+
+### Feature review: parallel
diff --git a/docs/plans/2026-09-11-leaner-execution-gates-progress.md b/docs/plans/2026-09-11-leaner-execution-gates-progress.md
new file mode 100644
index 0000000..1afcc91
--- /dev/null
+++ b/docs/plans/2026-09-11-leaner-execution-gates-progress.md
@@ -0,0 +1,36 @@
+# Progress: leaner-execution-gates
+
+Design: docs/plans/2026-09-11-leaner-execution-gates-design.md
+Branch: leaner-execution-gates
+Started: 2026-09-11T04:39:56Z
+Last updated: 2026-09-11T06:41:20Z
+Feature phase: reviewing
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | Per-requirement review auto-tag removed | — | 54f6a68 |
+| 2 | ✅ | Feature review is one risk-scaled pass | — | cefd1b3 |
+| 3 | ✅ | Feature-spec checkpoint becomes a notice | — | f6ccaac |
+| 4 | ✅ | `spec` removed from the Checkpoints enum | 🔎 inline | e0ce069 · d880a49 |
+| 5 | ✅ | Enriched Code digest `### Flow` | — | a384c1d |
+| 6 | ✅ | Flow truth is checked against the tracing report | — | 8c7aa15 |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? |
+|----|-------------|------------------|-----------|
+| 1 | Per-requirement review auto-tag removed | Deleted the silent rule that mapped non-empty `### Production-risk notes` to `### Review: parallel`; the tag vocabulary and the `skip` default stay, but the human is now the only writer. Lint assertions flipped from presence to absence so a re-introduced silent tag fails. | — |
+| 2 | Feature review is one risk-scaled pass | The single feature review now reads `### Feature review: auto` and resolves on the design's own risk content — four reviewers when the design declares production-risk areas or per-requirement risk notes, one inline pass otherwise; an explicit tag is used as written. Lint gained a third tag vocabulary so `auto` cannot drift between the two skills. | — |
+| 3 | Feature-spec checkpoint becomes a notice | The E2E is still written first and reported with its failing output, but the run continues into implementation instead of pausing; `e2e-written` and the legacy `feature-spec-paused` both render as `execute 0/N` in status, and the retired display state is gone from the roll-up. | yes — also refreshed README.md (not in the design's file table); it mirrors the same flow and would have shipped stale |
+| 4 | `spec` removed from the Checkpoints enum | The per-requirement enum is now `none | full` in both skills and both guides; the retired value and its paired "needs inline review" rule are asserted absent by the lint suite, and a legacy `spec` resolves to `none`. The 2.2.0 changelog entry carries the migration note and the package version is bumped. Its inline review swept every consumer site and caught two stale vocabulary comments in the lint suite, fixed in a follow-up commit. | — |
+| 5 | Enriched Code digest `### Flow` | The digest's flow section is now a spine/branches map: hops carry `[R#]` tags and symbol names, branches list each `condition -> outcome` with a `was:` clause only where behavior changed, worked values show inline, and side effects appear only when the feature does I/O. Code-digest tests assert the shape plus the honest-empty cases and the walkthrough escape hatch at the line cap. | — |
+| 6 | Flow truth is checked against the tracing report | The digest write point now reconciles the Flow against reviewed reality before writing: every hop must match a path the tracing reviewer named, or in inline mode the spec-coverage result, and an unresolvable discrepancy is surfaced in the ship checkpoint's findings status instead of being smoothed over. | — |
+
+## Code digest
+
+<!-- Written once, after the feature review passes; never back-filled per requirement. -->
+
+### Summary — 2–3 sentences: what the code now does differently, and why.
+### Flow — execution/data movement through the changed code, as arrow chains.
+### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
+### Key files — 3–5 pivotal files, one line each: what shifted inside them.
diff --git a/docs/plans/2026-09-11-leaner-execution-gates-review-packet-r4.md b/docs/plans/2026-09-11-leaner-execution-gates-review-packet-r4.md
new file mode 100644
index 0000000..79d7381
--- /dev/null
+++ b/docs/plans/2026-09-11-leaner-execution-gates-review-packet-r4.md
@@ -0,0 +1,277 @@
+# Review packet: leaner-execution-gates — per-requirement review (R4)
+
+## Commits (this requirement only)
+e0ce069 feat(gates): drop the spec checkpoint value (R4)
+
+## Changed files
+ CHANGELOG.md                        | 15 ++++++++++
+ docs/developer-usage-guide.md       |  2 +-
+ docs/workflow-phases.md             |  2 +-
+ package.json                        |  2 +-
+ skills/pwk-brainstorming/SKILL.md   |  6 ++--
+ skills/pwk-executing-tasks/SKILL.md |  6 ++--
+ tests/lean-gates.e2e.test.ts        | 11 +++++--
+ tests/single-doc.test.ts            |  5 ++--
+ tests/skill-lint.mjs                | 59 +++++++++++++++++++------------------
+ 9 files changed, 66 insertions(+), 42 deletions(-)
+
+## Acceptance criteria (verbatim from the design doc)
+### R4: `spec` removed from the Checkpoints enum
+
+Per-requirement checkpoints accept `none | full` only; the paired "`spec` requires at least `inline` review" rule goes with it.
+
+**Acceptance criteria**
+
+- Given `skills/pwk-brainstorming/SKILL.md`, `skills/pwk-executing-tasks/SKILL.md`, `docs/workflow-phases.md`, and `docs/developer-usage-guide.md`, When the lint suite runs, Then no `### Checkpoints` enumeration in any of them lists `spec`, and the lint vocabulary constant contains no `spec` value.
+- Given the lint suite, When it runs, Then no file asserts the retired rule that `spec` requires at least `inline` review, and the two files that previously documented it no longer do.
+- Given a design doc with no `### Checkpoints` tag, When executing-tasks parses it, Then the effective value is `none` and no per-requirement stop fires (default preserved).
+- Given a design doc tagged `### Checkpoints: full`, When executing-tasks parses it, Then the tests stop and the complete stop both still fire (the surviving value is intact).
+- Given an in-flight design doc whose requirement still carries the legacy `### Checkpoints: spec`, When executing-tasks parses it, Then it treats the unrecognized value as `none` and proceeds without a stop rather than failing (edge case: the migration path is defined, not accidental).
+- Given the `CHANGELOG.md` entry for this change, Then it states the legacy `spec` → `none` mapping in its migration note.
+
+### Checkpoints: none
+### Review: inline
+
+
+## Diff
+diff --git a/CHANGELOG.md b/CHANGELOG.md
+index 929e8e6..81c5f00 100644
+--- a/CHANGELOG.md
++++ b/CHANGELOG.md
+@@ -4,6 +4,21 @@ All notable changes to this project will be documented in this file.
+ 
+ The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
+ 
++## [2.2.0] - 2026-09-11
++
++### Changed
++
++- **Per-requirement review auto-tag removed** — `pwk-brainstorming` no longer tags a requirement `### Review: parallel` merely because it carries `### Production-risk notes`. `### Review` defaults to `skip` everywhere and **only the human tags** a slice; the feature review already covers the whole diff, including risk requirements. The removed rule was the source of reviewer-role multiplication: a part with four risk-tagged requirements paid four roles per requirement *plus* four at the ship checkpoint.
++- **One risk-scaled feature review** — the feature-level tag becomes `### Feature review: auto | parallel | inline` (default `auto`). `auto` resolves on the design's own production-risk content: `parallel` (four fresh-context roles) when the design has a non-empty `## Production-risk areas` section or any requirement has non-empty `### Production-risk notes`, `inline` (one `pwk-code-review` pass) otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`.
++- **Feature-spec checkpoint becomes a notice** — the feature-acceptance E2E is still written first (red) and is still the primary enforced gate at the ship checkpoint, but it is now *reported* with its failing output instead of pausing execution: its text was already approved as `## Feature acceptance` during brainstorm. Mandatory human stops per feature drop to one (ship). `pwk-status` renders `e2e-written` as `execute 0/N` and the `feature-spec` display state is retired.
++- **`spec` removed from the per-requirement Checkpoints enum** — `### Checkpoints` accepts `none | full` (default `none`). The retired value was a stop on acceptance criteria the human had already approved at design time; the paired "`spec` requires at least `inline` review" rule went with it.
++
++### Migration
++
++- In-flight design docs tagged with the retired `spec` checkpoint value resolve to `none` — no stop, no error.
++- Legacy progress files at `Feature phase: feature-spec-paused` resume into the implement phase and render as `execute 0/N` in `pwk-status`.
++- A missing `### Feature review` tag now means `auto` (risk-scaled), not unconditional `parallel`; a design that wants the previous always-four-roles behavior writes `### Feature review: parallel`.
++
+ ## [2.1.2] - 2026-09-10
+ 
+ ### Changed
+diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
+index 00af0a4..3574265 100644
+--- a/docs/developer-usage-guide.md
++++ b/docs/developer-usage-guide.md
+@@ -125,5 +125,5 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
+ - Start with brainstorming for anything non-trivial.
+ - The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
+ - The feature-gate flow has **one** mandatory checkpoint (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
+-- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
++- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`, default `none` — the acceptance criteria were approved at design time, so there is no per-requirement correctness stop) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The risk-scaled feature-level `### Feature review` covers the whole diff. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
+ - Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
+diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
+index d4862e9..be38817 100644
+--- a/docs/workflow-phases.md
++++ b/docs/workflow-phases.md
+@@ -40,7 +40,7 @@ No write restrictions. All tools available.
+ 
+ The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:
+ 
+-- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
++- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. There is no per-requirement correctness stop, because those criteria were approved at design time.
+ - **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
+ - **Feature review** — `parallel` (four reviewers over the whole feature diff, **default**) | `inline` (one pass, small features). Always on. The review scope is a script-assembled review packet (diff + criteria verbatim), so reviewers never re-derive scope; smell/hazard reviewers run on the fast tier set via `/pwk-setup --fast-model` (advisory hint).
+ 
+diff --git a/package.json b/package.json
+index fe8cdea..9949ce0 100644
+--- a/package.json
++++ b/package.json
+@@ -1,6 +1,6 @@
+ {
+   "name": "@tianhai/pi-workflow-kit",
+-  "version": "2.1.2",
++  "version": "2.2.0",
+   "description": "Enforce structured design→execute→finalize workflow with TDD discipline in AI coding agents",
+   "keywords": [
+     "pi-package",
+diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
+index 48751e8..c477306 100644
+--- a/skills/pwk-brainstorming/SKILL.md
++++ b/skills/pwk-brainstorming/SKILL.md
+@@ -77,7 +77,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
+    - Given … When … Then …
+    - Given … When … Then … (edge case)
+ 
+-   ### Checkpoints: none | full | spec
++   ### Checkpoints: none | full
+    ### Review: skip | parallel | inline
+ 
+    ### Production-risk notes
+@@ -90,9 +90,9 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
+    Block rules:
+ 
+    - **No test-name lists.** The criteria are the test spec — the executor writes and names the actual tests red-green from them, so the doc contains no test-name lists and no R#-to-section mapping tables: the block structure is the map.
+-   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops; `spec` = tests stop only) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` or `spec` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
++   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
+    - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area is flagged in the At-a-glance risk column and carries its `### Production-risk notes`, but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
+-   - **`spec` requires at least `inline` review** — dropping the complete stop is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
++   - **No per-requirement spec stop, by design** — the acceptance criteria are approved right here, at design time; re-checking them mid-execution asks a question the human already answered. A legacy `spec` tag in an in-flight design doc resolves to `none`.
+    - **Production-risk notes** — a requirement touching a production-risk area carries its notes inside the block. Risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
+    - **Ordering** — dependencies come earlier in the list; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
+ 
+diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
+index 7939dc9..7b847fa 100644
+--- a/skills/pwk-executing-tasks/SKILL.md
++++ b/skills/pwk-executing-tasks/SKILL.md
+@@ -82,7 +82,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
+ 
+ 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
+ 2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
+-3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
++3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full`, stop and present after the tests and again after the slice is complete. With the default `none`, show the red→green inline and proceed.
+ 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
+ 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
+ 6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
+@@ -91,7 +91,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
+ 
+ If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
+ 
+-`Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
++With the default `none`, no per-requirement stop fires — the per-requirement test still runs red→green, and the feature review covers implementation quality. A legacy `spec` value in an in-flight design doc resolves to `none` — no stop, no error.
+ 
+ ### Checkpoint gates are mandatory (when the tag says so)
+ 
+@@ -167,7 +167,7 @@ On success, continue assembling the ship checkpoint; once the human approves it,
+ 
+ The design doc tags each requirement and the feature level:
+ 
+-- **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
++- **`### Checkpoints: none | full`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete.
+ - **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. Nothing is tagged silently: **only the human tags** a slice, and the feature review below covers everything else.
+ - **`### Feature review: auto | parallel | inline`** — the one whole-feature review (always present). Default `auto`: `parallel` when the design carries production-risk content, `inline` when it does not. An explicit `parallel` or `inline` is used as written and always wins over `auto`. Never once per requirement — the review covers the whole feature diff.
+ 
+diff --git a/tests/lean-gates.e2e.test.ts b/tests/lean-gates.e2e.test.ts
+index 764174e..9acd0c6 100644
+--- a/tests/lean-gates.e2e.test.ts
++++ b/tests/lean-gates.e2e.test.ts
+@@ -46,7 +46,8 @@ describe("leaner execution gates (feature E2E)", () => {
+     expect(status).not.toMatch(/feature-spec-paused`\s*→\s*`feature-spec/);
+     expect(status).not.toMatch(/→\s*`feature-spec`/);
+ 
+-    // R4 — the checkpoint enum is none | full across every consumer site.
++    // R4 — the checkpoint enum is none | full across every consumer site, and the
++    // retired `spec` value is gone from the enumerations and the paired rule.
+     expect(brainstorming).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
+     expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
+     for (const rel of [
+@@ -54,9 +55,13 @@ describe("leaner execution gates (feature E2E)", () => {
+       "skills/pwk-executing-tasks/SKILL.md",
+       "docs/workflow-phases.md",
+       "docs/developer-usage-guide.md",
++      "README.md",
+     ]) {
+-      expect(read(rel)).not.toMatch(/Checkpoints:.*\bspec\b/);
+-      expect(read(rel)).not.toMatch(/requires at least `inline`/);
++      const specLines = read(rel)
++        .split("\n")
++        .filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
++      expect(specLines, `${rel} still enumerates \`spec\``).toEqual([]);
++      expect(read(rel), rel).not.toMatch(/requires at least `inline`/);
+     }
+ 
+     // R5 — the digest's Flow is a navigable map: spine + branches + was: clause +
+diff --git a/tests/single-doc.test.ts b/tests/single-doc.test.ts
+index 0629998..94ac38b 100644
+--- a/tests/single-doc.test.ts
++++ b/tests/single-doc.test.ts
+@@ -18,8 +18,9 @@ describe("single-doc: merged design doc (R1)", () => {
+     // leaner-execution-gates R1: nothing is tagged silently — the human owns the tag.
+     expect(bs).toMatch(/only the human tags/i);
+     expect(bs).not.toMatch(/auto-tag/i);
+-    // spec+skip incompatibility travels with the tags
+-    expect(bs).toMatch(/`spec` requires at least `inline`/);
++    // leaner-execution-gates R4: the `spec` checkpoint value and its paired rule are gone.
++    expect(bs).toMatch(/### Checkpoints: none \| full/);
++    expect(bs).not.toMatch(/requires at least `inline`/);
+   });
+ 
+   it("should never emit a crosswalk or per-requirement test-name list", () => {
+diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
+index b286165..12d8d47 100644
+--- a/tests/skill-lint.mjs
++++ b/tests/skill-lint.mjs
+@@ -64,7 +64,7 @@ for (const skill of loadSkills()) {
+ 
+ // --- Check 2: tag vocabulary consistency across the pipeline ---
+ // The canonical vocabularies, defined in pwk-brainstorming and consumed by pwk-executing-tasks.
+-const CHECKPOINT_VOCAB = ["full", "spec", "none"];
++const CHECKPOINT_VOCAB = ["none", "full"];
+ const REVIEW_VOCAB = ["parallel", "inline", "skip"];
+ // leaner-execution-gates R2: the feature-level review gained a risk-scaled `auto`.
+ const FEATURE_REVIEW_VOCAB = ["auto", "parallel", "inline"];
+@@ -143,33 +143,36 @@ if (bs && et) {
+   }
+ }
+ 
+-// --- Check 4: spec+skip incompatibility documented wherever tags are enumerated ---
+-console.log("spec+skip guard:");
+-const docsToCheck = [join(root, "docs/workflow-phases.md"), join(root, "docs/developer-usage-guide.md")];
+-for (const f of docsToCheck) {
+-  let content;
+-  try {
+-    content = readFileSync(f, "utf8");
+-  } catch {
+-    fail(`${f}: not found`);
+-    continue;
+-  }
+-  // Must mention spec and the inline-requirement constraint somewhere.
+-  const hasSpec = /\bspec\b/.test(content);
+-  const hasGuard = /spec.*inline|inline.*spec/i.test(content) || /requires at least `inline`/.test(content);
+-  if (hasSpec && hasGuard) ok(`${f.split("/").pop()}: documents spec requires inline review`);
+-  else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
+-}
+-// And in the skills themselves
+-if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
+-  ok("pwk-brainstorming: documents spec requires inline review");
+-} else if (bs) {
+-  fail("pwk-brainstorming: missing spec+inline guard note");
+-}
+-if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
+-  ok("pwk-executing-tasks: documents spec requires inline review");
+-} else if (et) {
+-  fail("pwk-executing-tasks: missing spec+inline guard note");
++// --- Check 4: the `spec` checkpoint value is gone (leaner-execution-gates R4) ---
++// It was a stop on acceptance criteria the human already approved during brainstorm, so
++// the enum is `none | full` and the paired "spec requires inline review" rule went with it.
++// A legacy in-flight `spec` resolves to `none` rather than erroring.
++console.log("spec checkpoint removed:");
++const specSites = [
++  ["docs/workflow-phases.md", readFileSync(join(root, "docs/workflow-phases.md"), "utf8")],
++  ["docs/developer-usage-guide.md", readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8")],
++  ["pwk-brainstorming", bs?.content ?? ""],
++  ["pwk-executing-tasks", et?.content ?? ""],
++];
++let specFree = true;
++for (const [name, content] of specSites) {
++  const specLines = content.split("\n").filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
++  if (specLines.length > 0) {
++    fail(`${name}: Checkpoints enum still lists \`spec\`: "${specLines[0].trim()}"`);
++    specFree = false;
++  }
++  if (/requires at least `inline`/.test(content)) {
++    fail(`${name}: the retired \`spec\` ⇒ inline rule must be gone`);
++    specFree = false;
++  }
++}
++if (specFree) ok("`spec` checkpoint value removed from every site (enum + paired rule)");
++// The legacy value migrates instead of erroring.
++const legacySpecLine = (et?.content ?? "").split("\n").find((l) => /legacy/i.test(l) && /`spec`/.test(l)) ?? "";
++if (legacySpecLine && /`none`/.test(legacySpecLine)) {
++  ok("pwk-executing-tasks: legacy `spec` resolves to `none` (migration documented)");
++} else {
++  fail("pwk-executing-tasks: must document the legacy `spec` → `none` migration on one line");
+ }
+ 
+ // --- Check 5: Feature acceptance contract across the pipeline ---
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index 92ad463..c0d8486 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -4,7 +4,7 @@
 
 ```
 brainstorm → executing-tasks → finalizing
-                (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
+                (feature-gate: write feature E2E → report it → implement requirements → feature review → ⏸ ship)
 ```
 
 A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → execute) × N → finalize`).
@@ -28,7 +28,7 @@ Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
 /skill:pwk-executing-tasks
 ```
 
-- **Feature-gate flow:** write the feature-acceptance E2E test (red) → **⏸ checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (request the `parallel-review` capability for four logical read-only roles when the host supports it; otherwise run `/skill:pwk-code-review` inline — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + code digest + reviewer coverage table; full diff on request).
+- **Feature-gate flow:** write the feature-acceptance E2E test (red) → **report it, no stop** (1–2 lines saying what the E2E proves, plus its failing output — the `## Feature acceptance` text was already approved in brainstorm, so the run continues straight into implementation; the report is the human's window to object before code is written) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (one review over the whole feature diff: the `parallel-review` capability for four logical read-only roles when the design carries production-risk content, otherwise one inline `/skill:pwk-code-review` pass — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + code digest + reviewer coverage table; full diff on request).
 - After the review passes, the executor writes a **code digest** into the progress file — plain-language summary, execution flow, gotchas, key files — derived from the review packet; it rides the existing disposal globs.
 - Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the design doc tags (default off); see [Proportionality](#proportionality).
 - **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
@@ -40,9 +40,9 @@ No write restrictions. All tools available.
 
 The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:
 
-- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
+- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. There is no per-requirement correctness stop, because those criteria were approved at design time.
 - **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
-- **Feature review** — `parallel` (four reviewers over the whole feature diff, **default**) | `inline` (one pass, small features). Always on. The review scope is a script-assembled review packet (diff + criteria verbatim), so reviewers never re-derive scope; smell/hazard reviewers run on the fast tier set via `/pwk-setup --fast-model` (advisory hint).
+- **Feature review** — `auto` (risk-scaled, **default**) | `parallel` (four reviewers over the whole feature diff) | `inline` (one pass). Always on, exactly one per part. `auto` resolves on the design's own production-risk content: `parallel` when the design has a non-empty `## Production-risk areas` section or a non-empty `### Production-risk notes` on any requirement, `inline` otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`. The review scope is a script-assembled review packet (diff + criteria verbatim), so reviewers never re-derive scope; smell/hazard reviewers run on the fast tier set via `/pwk-setup --fast-model` (advisory hint).
 
 Flag a requirement for a checkpoint when it has complex logic or is the main part of the feature; for a review when it touches production-risk. A trivial fix can also skip the multi-turn brainstorm dialogue via the brainstorming trivial fast-path (compress to one turn, minimal design doc) — the guard still enforces read-only.
 
@@ -54,7 +54,7 @@ Flag a requirement for a checkpoint when it has complex logic or is the main par
 
 The **inline reviewer**: code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check. Unlocked — may modify code to fix smells.
 
-**Not a phase you drive manually.** During `pwk-executing-tasks`, the feature-level review requests four logical roles (`pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`) through the host’s `parallel-review` capability. Roles are fresh-context, read-only reporters; successful reports are retained and failed roles are retried or completed inline. If no compatible provider is available, the whole review runs inline. In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`; [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) is one compatible provider. See `docs/provider-delegation-contract.md` for the provider contract. You can also invoke `/skill:pwk-code-review` standalone for an ad-hoc review of any diff.
+**Not a phase you drive manually.** During `pwk-executing-tasks`, the feature-level review resolves the design's `### Feature review` tag (`auto` by default) and either requests four logical roles (`pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`) through the host’s `parallel-review` capability — when the design carries production-risk content — or runs one inline pass when it does not. Roles are fresh-context, read-only reporters; successful reports are retained and failed roles are retried or completed inline. If no compatible provider is available, the whole review runs inline. In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`; [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) is one compatible provider. See `docs/provider-delegation-contract.md` for the provider contract. You can also invoke `/skill:pwk-code-review` standalone for an ad-hoc review of any diff.
 
 No write restrictions.
 
diff --git a/package.json b/package.json
index fe8cdea..9949ce0 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@tianhai/pi-workflow-kit",
-  "version": "2.1.2",
+  "version": "2.2.0",
   "description": "Enforce structured design→execute→finalize workflow with TDD discipline in AI coding agents",
   "keywords": [
     "pi-package",
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 60fccd6..c477306 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -77,7 +77,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    - Given … When … Then …
    - Given … When … Then … (edge case)
 
-   ### Checkpoints: none | full | spec
+   ### Checkpoints: none | full
    ### Review: skip | parallel | inline
 
    ### Production-risk notes
@@ -90,9 +90,9 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    Block rules:
 
    - **No test-name lists.** The criteria are the test spec — the executor writes and names the actual tests red-green from them, so the doc contains no test-name lists and no R#-to-section mapping tables: the block structure is the map.
-   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops; `spec` = tests stop only) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` or `spec` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
-   - **Auto-tag rule (this skill is the one source of truth for the auto-tag rule):** a requirement with a non-empty `### Production-risk notes` section gets `### Review: parallel` as the default; requirements without risk notes keep `Review: skip`. The tag is silently applied and editable — the human can override or downgrade it to `inline` or `skip` at design approval, and `pwk-executing-tasks` honors the edited value. Other skills and the docs link here; they do not restate the rule.
-   - **`spec` requires at least `inline` review** — dropping the complete stop is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
+   - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area is flagged in the At-a-glance risk column and carries its `### Production-risk notes`, but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
+   - **No per-requirement spec stop, by design** — the acceptance criteria are approved right here, at design time; re-checking them mid-execution asks a question the human already answered. A legacy `spec` tag in an in-flight design doc resolves to `none`.
    - **Production-risk notes** — a requirement touching a production-risk area carries its notes inside the block. Risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
    - **Ordering** — dependencies come earlier in the list; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
 
@@ -100,7 +100,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
 
    Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` **immediately after the last requirement block** — inside the `### R1 → ## Feature acceptance` span, so the review packet carries it to reviewers verbatim — and mirror the risks into each touched block's `### Production-risk notes`. `pwk-code-review` audits it per requirement, and finalize's learning sweep reads it.
 
-   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). The section carries the feature-level `### Feature review: parallel | inline` tag — the one whole-feature review; default `parallel` (thoroughness lives here — it is the only review in the common case), `inline` for small features. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
+   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). The section carries the feature-level `### Feature review: auto | parallel | inline` tag — the one whole-feature review; default `auto`, which resolves on the design's own production-risk content to `parallel` (all four reviewers) when the design has any — a non-empty `## Production-risk areas` section, or a non-empty `### Production-risk notes` on any requirement — and to `inline` (one pass) otherwise. An explicit `parallel` or `inline` is written as-is, never resolved, so the human always overrides `auto`. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
 
    ```markdown
    ## Feature acceptance
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 7241cec..e785fa5 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -14,7 +14,7 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
+2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
 3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
 
 ## First run
@@ -47,24 +47,39 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
    <!-- Written once, after the feature review passes; never back-filled per requirement. -->
 
    ### Summary — 2–3 sentences: what the code now does differently, and why.
-   ### Flow — execution/data movement through the changed code, as arrow chains.
+   ### Flow
+   Spine
+     <entry point> -> [R1] <step, named by symbol or module> -> [R2] <step> -> <outcome>
+   Branches
+     <condition> -> <outcome>   [R2]        <!-- every alternative and error path -->
+     <changed behavior>   was: <previous behavior>
+   Side effects
+     reads: <what>   writes: <what>          <!-- only when the feature does I/O -->
    ### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
    ### Key files — 3–5 pivotal files, one line each: what shifted inside them.
    ```
 
    The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
 
+   **Flow shape** — this is the ship stop's navigable map, so it is the one digest section that carries structure, not just prose:
+
+   - **Spine** — the happy path as `A -> B -> C` hops, each hop named by symbol or module, with no line numbers anywhere and no file paths: symbol names survive edits and stay greppable, so a stale anchor can never mislead. Tag each hop `[R<n>]` with the requirement it comes from — that is what lets the coverage table's verdict rows be traced into the code without opening the diff.
+   - **Branches** — every alternative and error path as `condition -> outcome` (a linear spine with no branches reads as "there are no edge cases", which is rarely true). Put ⚠️ on the genuinely surprising ones. Add a `was: <previous behavior>` clause for each requirement whose behavior changed; skip it for purely additive requirements — honest-empty, never invented.
+   - **Inline worked values** — where a mapping is non-obvious, show it concretely (`` `implementing (2/5)` -> `execute 2/5` ``), so a reader can falsify it without running anything.
+   - **Side effects** — a line naming what is read and written, only when the feature performs I/O, network, or migrations; omit it entirely otherwise rather than filling a placeholder.
+   - **Cap: roughly 15 lines.** If the change genuinely needs more, the ship checkpoint **offers `/skill:pwk-walkthrough`** as the deep read (it regenerates a `file:line`-anchored walkthrough on demand) instead of growing the digest — the digest is what the human reads at the one remaining stop, and an unbounded Flow recreates the digging it exists to prevent.
+
    `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)
 
 4. **Commit the design docs** — `git add docs/plans/ && git commit -m "docs: add design doc"`.
-5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
-6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.
+5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, probe why before proceeding: the behavior may already exist, or the test may be asserting too little. If it still passes and the expected behavior looks wrong, **stop and present** rather than implementing against a wrong spec. Iterate it to green as you implement — fixing the implementation is the default, and you **stop and present only when you are genuinely blocked** (nothing you can do makes it pass, or the E2E itself is wrong). That stop is the reserved failure case; it is not the flow's default pause.
+6. **Notice, not a stop — report the E2E and continue.** Post 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), plus the E2E test and its failing output, then go straight into the implement phase **without waiting for approval** — the `## Feature acceptance` text was approved during brainstorm, so there is nothing new here for the human to sign off. The notice is the window to object *before* implementation starts: a human who sees the E2E asserting the wrong thing says so, and you revise, re-run, and re-notice. Keep `Feature phase: e2e-written`.
 
 ## Resume
 
 Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not `✅` routes the next requirement — `⬜`, `🔄`, and blank all mean not-done), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
-- `e2e-written` → write the E2E if not yet present, then present the **feature-spec** checkpoint.
-- `feature-spec-paused` → re-present the feature-spec checkpoint and wait.
+- `e2e-written` → write the E2E if not yet present, post the notice, and continue into the implement phase (no stop).
+- `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → post the notice and continue into the implement phase.
 - `implementing (k/N)` → continue the next not-yet-✅ requirement.
 - `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
 - `ship-paused` → re-present the ship checkpoint and wait.
@@ -76,13 +91,13 @@ Update the matching requirement row directly (not via pattern matching that coul
 
 **Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.
 
-## Implement phase (after feature-spec is approved)
+## Implement phase (after the E2E notice)
 
 Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
 
 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
 2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
-3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
+3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full`, stop and present after the tests and again after the slice is complete. With the default `none`, show the red→green inline and proceed.
 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
 6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
@@ -91,7 +106,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 
 If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
 
-`Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+With the default `none`, no per-requirement stop fires — the per-requirement test still runs red→green, and the feature review covers implementation quality. A legacy `spec` value in an in-flight design doc resolves to `none` — no stop, no error.
 
 ### Checkpoint gates are mandatory (when the tag says so)
 
@@ -108,6 +123,8 @@ When every requirement's Done column is ✅:
 2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
 3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
 4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
+
+   **Reconcile the Flow against reviewed reality before writing it.** The Flow is written from what was reviewed, not from recollection: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names — no hop invented, no reported path dropped. In `inline` mode there is no tracing report, so check the Flow against that pass's spec-coverage result instead. A discrepancy you cannot resolve is **surfaced** to the human in the ship checkpoint's findings status, never smoothed over by writing a Flow that omits the path.
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green;
    - the **execution summary** — what each requirement became, deviations included;
@@ -124,7 +141,7 @@ The old "integration gate" is gone — the feature E2E at the ship checkpoint *i
 
 ## Feature review
 
-This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
+This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag — exactly one per part, never once per requirement. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
 
 **Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
 
@@ -154,7 +171,9 @@ PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # besid
 } > "$PACKET"
 ```
 
-- **`parallel`** (default) — request the host’s `parallel-review` capability for four fresh-context, read-only logical roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, and `pwk-hazard-reviewer`. Spawn each role with a **one-liner** — a pointer to the packet file with the role framing appended last: the checklist name of the role (`spec alignment`, `code tracing`, `code smells`, or `production hazards`). For example: `Read docs/plans/<dated-stem>-review-packet.md. Your role: spec alignment.` The packet never appears in spawn arguments. Require independent execution and one collected outcome per role. The reviewer role contracts live in `agents/pwk-*-reviewer.md`; do not duplicate their checklists in the workflow instructions. Reviewers are read-only reporters; you apply smell fixes yourself (full suite + E2E must stay green, commit) and flag trace/spec/hazard findings as follow-ups for the human.
+- **Resolve the tag first.** `auto` (the default, and what a missing tag means) resolves on the design's own production-risk content: if the design carries a non-empty `## Production-risk areas` section, or any requirement carries a non-empty `### Production-risk notes`, resolve to `parallel`; otherwise resolve to `inline`. An explicit `parallel` or `inline` is used as written and always wins over `auto` — explicit tag wins in both directions, so a human who wants one pass on a risky design gets one pass.
+
+- **`parallel`** (the `auto` resolution when risk content is present) — request the host’s `parallel-review` capability for four fresh-context, read-only logical roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, and `pwk-hazard-reviewer`. Spawn each role with a **one-liner** — a pointer to the packet file with the role framing appended last: the checklist name of the role (`spec alignment`, `code tracing`, `code smells`, or `production hazards`). For example: `Read docs/plans/<dated-stem>-review-packet.md. Your role: spec alignment.` The packet never appears in spawn arguments. Require independent execution and one collected outcome per role. The reviewer role contracts live in `agents/pwk-*-reviewer.md`; do not duplicate their checklists in the workflow instructions. Reviewers are read-only reporters; you apply smell fixes yourself (full suite + E2E must stay green, commit) and flag trace/spec/hazard findings as follow-ups for the human.
 
 - **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
 - **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
@@ -165,9 +184,9 @@ On success, continue assembling the ship checkpoint; once the human approves it,
 
 The design doc tags each requirement and the feature level:
 
-- **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
-- **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. The auto-tag default for requirements with non-empty `### Production-risk notes` is `parallel` (see `pwk-brainstorming` for the rule).
-- **`### Feature review: parallel | inline`** — the one whole-feature review (always present). Default `parallel`; `inline` for small features.
+- **`### Checkpoints: none | full`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete.
+- **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. Nothing is tagged silently: **only the human tags** a slice, and the feature review below covers everything else.
+- **`### Feature review: auto | parallel | inline`** — the one whole-feature review (always present). Default `auto`: `parallel` when the design carries production-risk content, `inline` when it does not. An explicit `parallel` or `inline` is used as written and always wins over `auto`. Never once per requirement — the review covers the whole feature diff.
 
 ## User override commands
 
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index c12644f..87e4147 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -14,7 +14,8 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. Map the line to the displayed state:
    - `done` → **`done`** — terminal, never shown as in-flight; append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`); at `done` every row is complete
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
-   - `e2e-written`, `feature-spec-paused` → `feature-spec`
+   - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state)
+   - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
    - `reviewing`, legacy `feature-complete-paused` → `review`
    - `ship-paused` → `ship-paused`
    - no progress file, only `*-design.md` → `design` — next: `/skill:pwk-executing-tasks`
@@ -22,7 +23,7 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
    - no parseable `Feature phase` line → `execute` (with tally if parseable).
 
    A legacy 1.x topic (`*-implementation.md` stem-matched) uses the same phase-line inference on its progress file.
-3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, feature-spec, review, ship-paused), not-started parts. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
+3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, review, ship-paused), not-started parts. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
 4. Print a compact table, grouped under any umbrellas, e.g.:
 
    ```text
diff --git a/tests/code-digest.test.ts b/tests/code-digest.test.ts
index 71719cf..d6da08a 100644
--- a/tests/code-digest.test.ts
+++ b/tests/code-digest.test.ts
@@ -2,7 +2,7 @@ import { readFileSync } from "node:fs";
 import { dirname, join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, it } from "vitest";
-import { CODE_DIGEST_MARKERS } from "./markers.mjs";
+import { CODE_DIGEST_MARKERS, LEAN_GATES_MARKERS } from "./markers.mjs";
 
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
@@ -94,6 +94,28 @@ describe("code-digest per-slice", () => {
     expect(rules).toContain(CODE_DIGEST_MARKERS.honestEmptyGotchas);
     expect(rules).toContain(CODE_DIGEST_MARKERS.keyFilesCap);
   });
+
+  // leaner-execution-gates R5 — the Flow becomes a navigable map: spine + branches +
+  // was: clauses + inline values + side effects, symbol-labelled, no line numbers.
+  it("should enrich the Flow into a spine/branches map with no line numbers", () => {
+    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
+    const flowAt = executing.indexOf("**Flow shape**");
+    expect(flowAt).toBeGreaterThan(-1);
+    const flow = executing.slice(flowAt, flowAt + 1400);
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowSpine); // Spine
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowBranches); // Branches
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowWasClause); // was:
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowSideEffects); // Side effects
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowNoLineNumbers);
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowCap); // 15 lines
+    expect(flow).toContain(LEAN_GATES_MARKERS.flowWalkthroughOffer);
+    expect(flow).toMatch(/symbol|module/); // greppable labels, not paths
+    // honest-empty: the was: clause and the side-effects line are both optional
+    expect(flow).toMatch(/additive|no was:/i);
+    expect(flow).toMatch(/omit/i);
+    // the [R#] hop tag ties the Flow to the coverage table
+    expect(flow).toContain("[R<n>]");
+  });
   it("should exclude completed/ from every recursive discovery glob", () => {
     const sites: Array<[string, string]> = [
       ["skills/pwk-status/SKILL.md", "1. **Discover**"],
diff --git a/tests/lean-gates.e2e.test.ts b/tests/lean-gates.e2e.test.ts
new file mode 100644
index 0000000..1496efa
--- /dev/null
+++ b/tests/lean-gates.e2e.test.ts
@@ -0,0 +1,148 @@
+import { readFileSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { DIGEST_MARKERS, LEAN_GATES_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";
+
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+
+function read(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+/**
+ * Feature acceptance for leaner-execution-gates.
+ *
+ * The deliverable is skill/document text, so the observable interface is the
+ * content the host loads: these encode the design doc's `## Feature acceptance`
+ * scenarios through that interface.
+ */
+describe("leaner execution gates (feature E2E)", () => {
+  it("should reach the ship checkpoint as the only mandatory stop, with a navigable digest and no reviewer roles when the design carries no risk", () => {
+    const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+    const finalizing = read("skills/pwk-finalizing/SKILL.md");
+
+    // R1 — the silent per-requirement review tag is gone; the human owns the tag.
+    expect(brainstorming).toContain(LEAN_GATES_MARKERS.onlyHumanTags);
+    expect(brainstorming).not.toContain(SINGLE_DOC_MARKERS.autoTagTruth);
+    expect(executing).not.toMatch(/auto-tag default/i);
+
+    // R2 — one risk-scaled feature review, keyed on the design's own risk content.
+    expect(brainstorming).toContain(LEAN_GATES_MARKERS.featureReviewTag);
+    expect(brainstorming).toContain(LEAN_GATES_MARKERS.autoKeyedOnRisk);
+    expect(executing).toContain(LEAN_GATES_MARKERS.autoKeyedOnRisk);
+    expect(executing).toContain(LEAN_GATES_MARKERS.explicitTagWins);
+
+    // R2 sweep — every consumer site describes the conditional, not an unconditional
+    // four-role review (a glob-scope change must enumerate all its consumers).
+    for (const rel of [
+      "docs/workflow-phases.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "README.md",
+    ]) {
+      const doc = read(rel);
+      expect(doc, rel).toMatch(/production-risk content/);
+      expect(doc, rel).toMatch(/risk-scaled|or one inline pass|otherwise one inline|one inline pass when it does not/);
+    }
+
+    // R3 sweep — the retired `feature-spec` display state appears in no example line.
+    for (const rel of ["skills/pwk-executing-tasks/SKILL.md", "skills/pwk-status/SKILL.md"]) {
+      const bare = read(rel)
+        .split("\n")
+        .filter((line) => /feature-spec(?!-paused)/.test(line));
+      expect(bare, `${rel} still uses the retired feature-spec vocabulary`).toEqual([]);
+    }
+
+    // R3 — the reserved failure stops survive the notice (they are the reason the
+    // notice is safe): ungreenable E2E and an immediately-passing wrong E2E both halt.
+    expect(executing).toMatch(/stop and present/i);
+    expect(executing).toMatch(/genuinely blocked/i);
+
+    // R3 — the feature-spec stop is a notice; the ship stop remains the one stop.
+    expect(executing).toContain(LEAN_GATES_MARKERS.specNotice);
+    expect(executing).not.toMatch(/CHECKPOINT: feature-spec/);
+    expect(executing).toContain(DIGEST_MARKERS.shipCheckpoint);
+    expect(read("skills/pwk-status/SKILL.md")).toContain(LEAN_GATES_MARKERS.statusExecuteZero);
+
+    // R3 — status renders the pre-implementation state as execute 0/N, never as
+    // the retired `feature-spec` display state.
+    const status = read("skills/pwk-status/SKILL.md");
+    expect(status).not.toMatch(/feature-spec-paused`\s*→\s*`feature-spec/);
+    expect(status).not.toMatch(/→\s*`feature-spec`/);
+
+    // R4 — the checkpoint enum is none | full across every consumer site, and the
+    // retired `spec` value is gone from the enumerations and the paired rule.
+    expect(brainstorming).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
+    expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
+    for (const rel of [
+      "skills/pwk-brainstorming/SKILL.md",
+      "skills/pwk-executing-tasks/SKILL.md",
+      "docs/workflow-phases.md",
+      "docs/developer-usage-guide.md",
+      "README.md",
+    ]) {
+      const specLines = read(rel)
+        .split("\n")
+        .filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
+      expect(specLines, `${rel} still enumerates \`spec\``).toEqual([]);
+      expect(read(rel), rel).not.toMatch(/requires at least `inline`/);
+    }
+
+    // R5 — the digest's Flow is a navigable map: spine + branches + was: clause +
+    // side effects, symbol labels, no line numbers, capped with a deep-read offer.
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowSpine);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowBranches);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowWasClause);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowSideEffects);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowNoLineNumbers);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowCap);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowWalkthroughOffer);
+    // The Execution summary stays four columns — no location/commit column.
+    expect(DIGEST_MARKERS.execSummaryTable).toBe("| R# | Requirement | How it was built | Deviated? |");
+    expect(executing).not.toMatch(/\|\s*Look at\s*\|/);
+
+    // R6 — the Flow must agree with reviewed reality, and disagreements surface.
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowTruth);
+    expect(executing).toContain(LEAN_GATES_MARKERS.flowSurfaced);
+
+    // The clean end of the flow is unchanged: finalize still ships it.
+    expect(finalizing).toContain("pwk-finalizing");
+  });
+
+  it("should request exactly four reviewer roles over the whole diff when the design carries risk content, plus only the explicitly tagged slice reviews", () => {
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+    const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
+
+    // R2 — the auto resolution keys on either mirrored risk signal, and the four
+    // roles run once over the whole feature diff (never once per requirement).
+    expect(executing).toContain("pwk-spec-reviewer");
+    expect(executing).toContain("pwk-tracing-reviewer");
+    expect(executing).toContain("pwk-smell-reviewer");
+    expect(executing).toContain("pwk-hazard-reviewer");
+    expect(brainstorming).toContain("Production-risk");
+    expect(executing).toMatch(/whole feature diff/);
+    expect(executing).not.toMatch(/auto-tag/i);
+
+    // R1 — an explicit human tag is the only path to a per-requirement review;
+    // the untagged requirements get none.
+    expect(executing).toContain(LEAN_GATES_MARKERS.onlyHumanTags);
+    expect(executing).toMatch(/review-packet-r<N>\.md/);
+
+    // R6 — in inline mode (no tracing role) the Flow is checked against the
+    // spec-coverage pass instead.
+    expect(executing).toMatch(/spec-coverage|coverage pass/);
+  });
+
+  it("should render a pre-implementation topic as execute 0/N in pwk-status", () => {
+    const status = read("skills/pwk-status/SKILL.md");
+
+    // R3 — `e2e-written` is a real state that routes into implementation; the
+    // legacy `feature-spec-paused` file renders the same way.
+    expect(status).toContain("`e2e-written`");
+    expect(status).toContain(LEAN_GATES_MARKERS.statusExecuteZero);
+    expect(status).toContain("`feature-spec-paused`");
+    expect(status).not.toMatch(/feature-spec\b(?!-paused)/);
+  });
+});
diff --git a/tests/markers.mjs b/tests/markers.mjs
index e8afc7d..34791ac 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -77,6 +77,40 @@ export const STATUS_STATE_MARKERS = {
   resumeExtract: "nothing the resume needs",
 };
 
+/**
+ * Markers for the leaner-execution-gates feature: the deleted per-requirement
+ * review auto-tag, the risk-scaled single feature review (`auto`), the
+ * feature-spec notice replacing the mandatory stop, the dropped `spec`
+ * checkpoint value, the enriched `### Flow` digest, and flow-truth checking.
+ * Same contract as DIGEST_MARKERS — one canonical string per behavior, shared
+ * by skill-lint and the vitest suites. Each marker is chosen to distinguish the
+ * new shape from the old (e.g. `### Checkpoints: none | full` vs `...| spec`).
+ */
+export const LEAN_GATES_MARKERS = {
+  // R1 — no silent per-requirement tagging; the human owns the tag.
+  onlyHumanTags: "only the human tags",
+  // R2 — one risk-scaled feature review.
+  featureReviewTag: "### Feature review: auto | parallel | inline",
+  autoKeyedOnRisk: "production-risk content",
+  explicitTagWins: "explicit tag wins",
+  // R3 — the feature-spec stop becomes a notice; status renders execute 0/N.
+  specNotice: "without waiting for approval",
+  statusExecuteZero: "execute 0/N",
+  // R4 — the `spec` checkpoint value is gone.
+  checkpointsEnum: "### Checkpoints: none | full",
+  // R5 — the enriched Flow shape.
+  flowSpine: "Spine",
+  flowBranches: "Branches",
+  flowWasClause: "was:",
+  flowSideEffects: "Side effects",
+  flowCap: "15 lines",
+  flowNoLineNumbers: "no line numbers",
+  flowWalkthroughOffer: "/skill:pwk-walkthrough",
+  // R6 — the Flow is checked against reviewed reality.
+  flowTruth: "tracing report",
+  flowSurfaced: "surfaced",
+};
+
 /**
  * Markers for the code-digest feature: the ship-time code digest, the
  * completed/ exclusion on recursive discovery globs, and frontier-round
diff --git a/tests/pwk-status.test.ts b/tests/pwk-status.test.ts
index 0539fdf..7add0b9 100644
--- a/tests/pwk-status.test.ts
+++ b/tests/pwk-status.test.ts
@@ -22,8 +22,11 @@ describe("pwk-status phase-driven state (feature E2E)", () => {
   it("infers per-topic state from the Feature phase line — every executor phase value maps to a displayed state", () => {
     const status = readRepo("skills/pwk-status/SKILL.md");
     expect(status).toContain(STATUS_STATE_MARKERS.phaseLine);
-    expect(status).toMatch(/`e2e-written`[^→]*→[^→]{0,60}`feature-spec`/);
-    expect(status).toMatch(/`feature-spec-paused`[^→]*→[^→]{0,60}`feature-spec`/);
+    // leaner-execution-gates R3: the pre-implementation states render as execute 0/N;
+    // the retired `feature-spec` display state is gone.
+    expect(status).toMatch(/`e2e-written`[^→]*→[^→]{0,60}`execute 0\/N`/);
+    expect(status).toMatch(/`feature-spec-paused`[^→]*→[^→]{0,60}`execute 0\/N`/);
+    expect(status).not.toMatch(/`feature-spec`/);
     expect(status).toMatch(/`implementing \(k\/N\)`[^→]*→[^→]{0,60}`execute k\/N`/);
     expect(status).toMatch(/`reviewing`[^→]*→[^→]{0,60}`review`/);
     expect(status).toMatch(/legacy `feature-complete-paused`[^→]*→[^→]{0,60}`review`/);
diff --git a/tests/pwk2-single-doc.e2e.test.ts b/tests/pwk2-single-doc.e2e.test.ts
index aabb357..c9ef839 100644
--- a/tests/pwk2-single-doc.e2e.test.ts
+++ b/tests/pwk2-single-doc.e2e.test.ts
@@ -20,7 +20,9 @@ describe("pwk 2.0 single-doc feature (E2E)", () => {
     expect(brainstorming).toContain(SINGLE_DOC_MARKERS.criteriaInBlock);
     expect(brainstorming).toContain(SINGLE_DOC_MARKERS.noTestNameLists);
     expect(brainstorming).toContain(SINGLE_DOC_MARKERS.auditExactlyOnce);
-    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.autoTagTruth);
+    // leaner-execution-gates R1: the auto-tag rule and its single-source claim are removed.
+    expect(brainstorming).toContain("only the human tags");
+    expect(brainstorming).not.toContain(SINGLE_DOC_MARKERS.autoTagTruth);
     expect(brainstorming).not.toContain("Crosswalk");
     expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);
 
diff --git a/tests/single-doc.test.ts b/tests/single-doc.test.ts
index 56f53fc..94ac38b 100644
--- a/tests/single-doc.test.ts
+++ b/tests/single-doc.test.ts
@@ -15,12 +15,12 @@ describe("single-doc: merged design doc (R1)", () => {
     expect(bs).toContain(SINGLE_DOC_MARKERS.criteriaInBlock);
     expect(bs).toContain("### Checkpoints");
     expect(bs).toContain("### Review");
-    expect(bs).toContain(SINGLE_DOC_MARKERS.autoTagTruth);
-    // auto-tag rule: non-empty risk notes trigger parallel; editable by the human
-    expect(bs).toMatch(/non-empty[^\n]*Production-risk notes|Production-risk notes[^\n]*non-empty/i);
-    expect(bs).toMatch(/override or downgrade/i);
-    // spec+skip incompatibility travels with the tags
-    expect(bs).toMatch(/`spec` requires at least `inline`/);
+    // leaner-execution-gates R1: nothing is tagged silently — the human owns the tag.
+    expect(bs).toMatch(/only the human tags/i);
+    expect(bs).not.toMatch(/auto-tag/i);
+    // leaner-execution-gates R4: the `spec` checkpoint value and its paired rule are gone.
+    expect(bs).toMatch(/### Checkpoints: none \| full/);
+    expect(bs).not.toMatch(/requires at least `inline`/);
   });
 
   it("should never emit a crosswalk or per-requirement test-name list", () => {
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 6c16ca6..759187a 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -64,19 +64,23 @@ for (const skill of loadSkills()) {
 
 // --- Check 2: tag vocabulary consistency across the pipeline ---
 // The canonical vocabularies, defined in pwk-brainstorming and consumed by pwk-executing-tasks.
-const CHECKPOINT_VOCAB = ["full", "spec", "none"];
+const CHECKPOINT_VOCAB = ["none", "full"];
 const REVIEW_VOCAB = ["parallel", "inline", "skip"];
+// leaner-execution-gates R2: the feature-level review gained a risk-scaled `auto`.
+const FEATURE_REVIEW_VOCAB = ["auto", "parallel", "inline"];
 
-function vocabOf(text, kind) {
-  // Collect the option tokens that appear after a "Checkpoints" or "Review" header/label.
-  // Matches `### Checkpoints: full | spec | none` and prose like `full | spec | none`.
+function vocabOf(text, label, exclude) {
+  // Collect the option tokens that appear after a vocabulary header/label.
+  // Matches `### Checkpoints: none | full` and prose like `none | full`.
+  // `exclude` drops lines that belong to a longer label (plain `Review` must not swallow
+  // `### Feature review: auto | parallel | inline`).
   const lines = text.split("\n");
   const hits = new Set();
-  const want = kind === "checkpoint" ? "Checkpoints" : "Review";
   for (const line of lines) {
-    if (!line.includes(want)) continue;
+    if (!line.includes(label)) continue;
+    if (exclude && line.includes(exclude)) continue;
     // Match `|`-separated tokens, tolerating backticks, spaces, and a leading colon/paren.
-    // e.g. "### Checkpoints: full | spec | none" and "accepted values: `parallel | inline | skip`)".
+    // e.g. "### Checkpoints: none | full" and "accepted values: `parallel | inline | skip`)".
     const pipeMatch = line.match(/[`:]\s*`?([a-z]+(?:\s*\|\s*`?[a-z]+)+)`?/);
     if (pipeMatch) {
       for (const t of pipeMatch[1].split("|")) hits.add(t.replace(/`/g, "").trim());
@@ -91,21 +95,38 @@ const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
 if (!bs) fail("pwk-brainstorming skill missing");
 if (!et) fail("pwk-executing-tasks skill missing");
 if (bs && et) {
-  for (const [kind, vocab] of [
-    ["checkpoint", CHECKPOINT_VOCAB],
-    ["review", REVIEW_VOCAB],
+  for (const [label, vocab] of [
+    ["Checkpoints", CHECKPOINT_VOCAB],
+    ["Review", REVIEW_VOCAB],
+    ["Feature review", FEATURE_REVIEW_VOCAB],
   ]) {
-    const bsV = vocabOf(bs.content, kind);
-    const etV = vocabOf(et.content, kind);
-    const label = kind === "checkpoint" ? "checkpoint" : "review";
+    const exclude = label === "Review" ? "Feature review" : undefined;
+    const bsV = vocabOf(bs.content, label, exclude);
+    const etV = vocabOf(et.content, label, exclude);
+    const kind = label.toLowerCase();
+    const isPerReq = label === "Checkpoints" || label === "Review";
     for (const v of vocab) {
       if (!bsV.has(v)) fail(`pwk-brainstorming: ${label} vocab missing "${v}"`);
       if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
     }
     // No stray tokens
-    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${label} token "${t}"`);
-    for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${label} token "${t}"`);
+    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${kind} token "${t}"`);
+    for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${kind} token "${t}"`);
     if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across brainstorming + executing-tasks`);
+    // leaner-execution-gates R2 — the feature review is risk-scaled: `auto` resolves on the
+    // design's own production-risk content, and an explicit human tag wins both ways.
+    if (!isPerReq) {
+      if (/production-risk content/i.test(bs.content) && /production-risk content/i.test(et.content)) {
+        ok("feature review: `auto` is keyed on the design's production-risk content (both skills)");
+      } else {
+        fail("feature review: both skills must state what `auto` keys on (production-risk content)");
+      }
+      if (/explicit tag wins/i.test(et.content)) {
+        ok("pwk-executing-tasks: an explicit feature-review tag wins over `auto`");
+      } else {
+        fail("pwk-executing-tasks: must state that an explicit feature-review tag wins over `auto`");
+      }
+    }
   }
 }
 
@@ -122,33 +143,36 @@ if (bs && et) {
   }
 }
 
-// --- Check 4: spec+skip incompatibility documented wherever tags are enumerated ---
-console.log("spec+skip guard:");
-const docsToCheck = [join(root, "docs/workflow-phases.md"), join(root, "docs/developer-usage-guide.md")];
-for (const f of docsToCheck) {
-  let content;
-  try {
-    content = readFileSync(f, "utf8");
-  } catch {
-    fail(`${f}: not found`);
-    continue;
-  }
-  // Must mention spec and the inline-requirement constraint somewhere.
-  const hasSpec = /\bspec\b/.test(content);
-  const hasGuard = /spec.*inline|inline.*spec/i.test(content) || /requires at least `inline`/.test(content);
-  if (hasSpec && hasGuard) ok(`${f.split("/").pop()}: documents spec requires inline review`);
-  else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
-}
-// And in the skills themselves
-if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
-  ok("pwk-brainstorming: documents spec requires inline review");
-} else if (bs) {
-  fail("pwk-brainstorming: missing spec+inline guard note");
-}
-if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
-  ok("pwk-executing-tasks: documents spec requires inline review");
-} else if (et) {
-  fail("pwk-executing-tasks: missing spec+inline guard note");
+// --- Check 4: the `spec` checkpoint value is gone (leaner-execution-gates R4) ---
+// It was a stop on acceptance criteria the human already approved during brainstorm, so
+// the enum is `none | full` and the paired "spec requires inline review" rule went with it.
+// A legacy in-flight `spec` resolves to `none` rather than erroring.
+console.log("spec checkpoint removed:");
+const specSites = [
+  ["docs/workflow-phases.md", readFileSync(join(root, "docs/workflow-phases.md"), "utf8")],
+  ["docs/developer-usage-guide.md", readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8")],
+  ["pwk-brainstorming", bs?.content ?? ""],
+  ["pwk-executing-tasks", et?.content ?? ""],
+];
+let specFree = true;
+for (const [name, content] of specSites) {
+  const specLines = content.split("\n").filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
+  if (specLines.length > 0) {
+    fail(`${name}: Checkpoints enum still lists \`spec\`: "${specLines[0].trim()}"`);
+    specFree = false;
+  }
+  if (/requires at least `inline`/.test(content)) {
+    fail(`${name}: the retired \`spec\` ⇒ inline rule must be gone`);
+    specFree = false;
+  }
+}
+if (specFree) ok("`spec` checkpoint value removed from every site (enum + paired rule)");
+// The legacy value migrates instead of erroring.
+const legacySpecLine = (et?.content ?? "").split("\n").find((l) => /legacy/i.test(l) && /`spec`/.test(l)) ?? "";
+if (legacySpecLine && /`none`/.test(legacySpecLine)) {
+  ok("pwk-executing-tasks: legacy `spec` resolves to `none` (migration documented)");
+} else {
+  fail("pwk-executing-tasks: must document the legacy `spec` → `none` migration on one line");
 }
 
 // --- Check 5: Feature acceptance contract across the pipeline ---
@@ -282,7 +306,14 @@ if (bs) {
 }
 // Requirement 2 — pwk-executing-tasks feature-gate flow
 if (et) {
-  fgMark("pwk-executing-tasks", et.content, "feature-spec", "feature-spec checkpoint");
+  // leaner-execution-gates R3: the feature-spec checkpoint became a notice — the E2E is still
+  // written first and still gates, it just no longer pauses execution.
+  fgMark("pwk-executing-tasks", et.content, "without waiting for approval", "feature-spec notice (no stop)");
+  if (!/CHECKPOINT: feature-spec/.test(et.content)) {
+    ok("pwk-executing-tasks: the retired feature-spec checkpoint is gone");
+  } else {
+    fail("pwk-executing-tasks: the feature-spec checkpoint must be a notice, not a stop");
+  }
   fgMark("pwk-executing-tasks", et.content, "ship checkpoint", "ship checkpoint (review before final approval)");
   fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
   fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
@@ -296,6 +327,22 @@ fgMark("docs/lessons.md", lessonsMd, "Test observable behavior", "meaningful-tes
 fgMark("pwk-code-review", crSkill?.content, "whole feature diff", "whole-feature-diff scope");
 fgMark("pwk-brainstorming", bs?.content, "primary enforced spec", "Feature acceptance as primary spec");
 
+// leaner-execution-gates R5/R6 — the digest's `### Flow` is a navigable map, and it is
+// written from reviewed reality: it must agree with the tracing report (or, in `inline`
+// mode, the spec-coverage pass), with unresolved disagreements surfaced, not smoothed over.
+console.log("flow truth:");
+if (et) {
+  fgMark("pwk-executing-tasks", et.content, "**Flow shape**", "enriched Flow shape block");
+  fgMark("pwk-executing-tasks", et.content, "tracing report", "Flow truth-checked against the tracing report");
+  if (/inline[\s\S]{0,260}spec-coverage|spec-coverage[\s\S]{0,260}inline/i.test(et.content)) {
+    ok("pwk-executing-tasks: inline mode falls back to the spec-coverage pass");
+  } else {
+    fail("pwk-executing-tasks: must check the Flow against the spec-coverage pass in inline mode");
+  }
+  if (/surfaced/i.test(et.content)) ok("pwk-executing-tasks: unresolved Flow disagreement is surfaced");
+  else fail("pwk-executing-tasks: unresolved Flow disagreement must be surfaced to the human");
+}
+
 // --- Check 10: parallelize-workflow (R1 scout + R2 auto-tag + R3 cross-skill) ---
 // pwk-recon-scout is a new read-only package agent dispatched from pwk-brainstorming before
 // design; pwk-brainstorming (since pwk 2.0) auto-tags `### Review: parallel` for requirements
@@ -375,59 +422,45 @@ if (bs) {
     fail("pwk-brainstorming: must skip scout on trivial changes (proportionality shortcut)");
   }
 }
-// R2: auto-tag rule — since pwk 2.0 the tags live in the design doc's requirement
-// blocks, so pwk-brainstorming owns the rule (non-empty Production-risk notes ⇒
-// Review: parallel). The marker must be unique to this rule.
+// R2 (leaner-execution-gates R1): the per-requirement review auto-tag is DELETED.
+// The human owns `### Review` — nothing is tagged silently. The old rule (non-empty
+// Production-risk notes ⇒ Review: parallel) must not survive anywhere, and no skill may
+// re-introduce a silent tag. Markers are absence-shaped so a stale skill fails.
 if (bs) {
-  if (/Production-risk notes/.test(bs.content) && /Review:\s*parallel/.test(bs.content)) {
-    ok("pwk-brainstorming: documents Production-risk notes → Review: parallel auto-tag");
+  if (/only the human tags/i.test(bs.content)) {
+    ok("pwk-brainstorming: only the human tags a slice for review");
   } else {
-    fail("pwk-brainstorming: must document the auto-tag rule (Production-risk notes ⇒ Review: parallel)");
+    fail("pwk-brainstorming: must state that only the human tags a slice");
   }
-  // The default must still be `skip` for requirements WITHOUT risk notes (no over-broaden).
-  if (/Review:\s*skip/.test(bs.content)) {
-    ok("pwk-brainstorming: still documents `Review: skip` as the default (no over-broaden)");
+  if (/Production-risk notes/.test(bs.content) && !/Review:\s*parallel/.test(bs.content)) {
+    ok("pwk-brainstorming: risk notes no longer imply `Review: parallel` (auto-tag removed)");
   } else {
-    fail("pwk-brainstorming: must keep `Review: skip` as the default for non-risky requirements");
+    fail("pwk-brainstorming: must not map Production-risk notes to `Review: parallel`");
   }
-  // The auto-tag must be presented as editable (the human can downgrade it).
-  if (/edit/i.test(bs.content) && /downgrade|change|override/i.test(bs.content)) {
-    ok("pwk-brainstorming: auto-tag is editable (human can downgrade before approval)");
+  // The default must still be `skip` for requirements the human does not tag.
+  if (/### Review: skip \| parallel \| inline/.test(bs.content)) {
+    ok("pwk-brainstorming: still documents `### Review: skip | parallel | inline`");
   } else {
-    fail("pwk-brainstorming: must document that the auto-tag is editable");
+    fail("pwk-brainstorming: must keep the Review tag vocabulary with `skip`");
   }
-  // Negative case: the auto-tag must require a NON-EMPTY Production-risk notes section.
-  if (/non-empty[^\n]*Production-risk notes|Production-risk notes[^\n]*non-empty/i.test(bs.content)) {
-    ok("pwk-brainstorming: auto-tag requires non-empty Production-risk notes (negative case)");
-  } else {
-    fail("pwk-brainstorming: must qualify the auto-tag with `non-empty` (empty notes must not trigger)");
-  }
-  // The rule must be single-sourced: pwk-brainstorming owns the auto-tag concept pair
-  // (`auto-tag` + `Production-risk notes`). Any other skill that mentions both must do so
-  // in a line that also names `pwk-brainstorming` (link by name, do not restate).
-  const restated = loadSkills().filter((s) => s.name !== "pwk-brainstorming");
-  let restateViolations = 0;
-  for (const s of restated) {
-    const lines = s.content.split("\n");
-    for (const line of lines) {
-      const hasConcept = /auto-tag/i.test(line) && /Production-risk notes/.test(line);
-      if (!hasConcept) continue;
-      if (!/pwk-brainstorming/.test(line)) {
-        restateViolations++;
-        fail(`${s.name}: restates the auto-tag rule without linking to pwk-brainstorming: "${line.trim()}"`);
-      }
+}
+// No skill may re-introduce silent tagging: the concept must be absent repo-wide.
+let autoTagSurvivors = 0;
+for (const s of loadSkills()) {
+  for (const line of s.content.split("\n")) {
+    if (/auto-tag/i.test(line)) {
+      autoTagSurvivors++;
+      fail(`${s.name}: still mentions auto-tagging: "${line.trim()}"`);
     }
   }
-  if (restateViolations === 0) {
-    ok("pwk-brainstorming: auto-tag rule is single-source (other skills do not restate it)");
-  }
 }
-// R3: pwk-executing-tasks must reference pwk-brainstorming for the auto-tag rule (not restate).
+if (autoTagSurvivors === 0) ok("no skill auto-tags requirements (silent tagging removed)");
+// The cross-skill link survives independently of the removed rule.
 if (et) {
   if (/pwk-brainstorming/.test(et.content)) {
-    ok("pwk-executing-tasks: references pwk-brainstorming (single source of truth)");
+    ok("pwk-executing-tasks: references pwk-brainstorming (tag semantics)");
   } else {
-    fail("pwk-executing-tasks: must reference pwk-brainstorming (do not restate the auto-tag rule)");
+    fail("pwk-executing-tasks: must reference pwk-brainstorming");
   }
 }
 
@@ -454,7 +487,12 @@ if (bs) {
   fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.criteriaInBlock, "criteria inside the block");
   fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.noTestNameLists, "no test-name lists");
   fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.auditExactlyOnce, "audit: criteria + tags exactly once");
-  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.autoTagTruth, "auto-tag rule single source of truth");
+  // leaner-execution-gates R1 — the auto-tag rule and its single-source claim are gone.
+  if (!bs.content.includes(SINGLE_DOC_MARKERS.autoTagTruth)) {
+    ok("pwk-brainstorming: removed auto-tag rule leaves no single-source claim");
+  } else {
+    fail("pwk-brainstorming: the removed auto-tag rule must not leave its single-source claim behind");
+  }
   if (!/crosswalk/i.test(bs.content)) ok("pwk-brainstorming: no mapping-table instruction");
   else fail("pwk-brainstorming: must not instruct a crosswalk mapping table");
   if (!/pwk-writing-plans/.test(bs.content)) ok("pwk-brainstorming: no plan-phase hand-off");
