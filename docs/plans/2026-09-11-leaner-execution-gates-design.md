# Leaner execution gates

Date: 2026-09-11
Status: design (not yet executed)

## At a glance

Every feature currently pays ceremony that no longer buys anything. Two leaks: `pwk-brainstorming` silently auto-tags every requirement that carries production-risk notes for a four-reviewer per-requirement review, and `pwk-executing-tasks` then runs those four roles **per requirement** *and* again over the whole diff at the ship checkpoint — up to 20 reviewer spawns for a risk-touching part. Separately, the mandatory **feature-spec** checkpoint asks the human to approve the `## Feature acceptance` E2E, content the human already approved during brainstorm. This change deletes the auto-tag, scales the single feature review to the design's real risk content, turns the feature-spec stop into a one-line notice, drops the redundant `spec` checkpoint tag, and enriches the ship digest's `### Flow` so the one remaining stop is self-serve. No new machinery: the guard extension is untouched, and per-requirement ceremony stays available to a human who tags a slice.

**Key decisions**

- **Per-requirement review auto-tag deleted** — `### Review` defaults to `skip` everywhere; only a human tags a slice. (rejected: downgrade the auto-tag to `inline` — it preserves a silent opt-in review nobody asked for, and the feature review already covers the whole diff including risk requirements.)
- **One feature review per part, risk-scaled** via `### Feature review: auto | parallel | inline`, default `auto` — four roles when the design carries production-risk content, one inline pass otherwise. (rejected: keep `parallel` as the default — pays four fresh-context roles for a docs-only or config-only part; rejected: default `inline` — under-reviews the one review that exists, so a risky feature would get less scrutiny than before.)
- **Feature-spec checkpoint becomes a notice** — the E2E is still written first (red), still iterated to green, still the primary enforced gate at the ship stop; it is just no longer a pause. (rejected: keep the stop — it re-asks the `## Feature acceptance` question approved in brainstorm, which is ADR 0004's "paying twice" one phase later; rejected: no notice at all — an E2E that encodes the wrong behavior would drive an agent to "fix" correct code with no human window to catch it.)
- **`spec` dropped from the Checkpoints enum** (`none | full`) — it was a stop on acceptance criteria the human already approved. (rejected: keep it — the criteria were approved at design time, so the tests stop re-asks an answered question; `full` survives because a complete-slice stop is the only way to interrupt a risky slice mid-flight.)
- **Digest enrichment lands in `### Flow`, not a new index table** — spine + branches + `was:` clauses, labelled with symbol names. (rejected: an `R# | What changed | Entry point | Deviated?` table — a fourth R#-keyed table restating the Execution summary; rejected: a commit-SHA column — it stays correct but is one `git log` away, and `file:line` anchors rot on any edit above them; rejected: a reviewer-authored `Where` column in the coverage table — it goes stale exactly when a post-packet fix lands.)
- **Flow labels are symbol/module names; no line numbers anywhere in the digest** — they survive edits, and a hop chain is a navigable map only if the labels can be grepped. (rejected: per-requirement before → after sections — they read well for vertical slices but lose the composed end-to-end story that proves the requirements chain together.)

| R# | Requirement in one line | Risk |
|----|-------------------------|------|
| R1 | The per-requirement review auto-tag is deleted; `### Review` defaults to `skip` and only the human tags a slice | Low |
| R2 | `### Feature review: auto` resolves to four roles when the design has production-risk content, one inline pass otherwise | Med |
| R3 | The feature-spec checkpoint becomes a notice; `pwk-status` renders `e2e-written` as `execute 0/N` | Med |
| R4 | `spec` is removed from the Checkpoints enum across every consumer site | Med |
| R5 | The Code digest's `### Flow` is enriched (spine + `[R#]` + branches + `was:` + values + side effects), capped ~15 lines | Low |
| R6 | The written Flow must agree with the tracing report; a discrepancy is surfaced, never smoothed over | Low |

## Requirements

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

## Feature acceptance

- Given the kit with this change and a part whose design doc carries no production-risk content, When the part is executed end to end, Then the run reaches the ship checkpoint with exactly one mandatory human stop after design approval (the ship stop), zero per-requirement reviews and zero reviewer roles were requested, and the presented digest shows an `### Flow` with `[R#]`-tagged hops, a branches block, and no line numbers.
- Given the same flow but the design doc carries production-risk content and requirement R2 is explicitly tagged `### Review: inline`, When the part is executed, Then the feature review requests exactly four reviewer roles over the whole feature diff, R2 additionally receives one inline review pass with its own `-review-packet-r2.md` while every untagged requirement receives none, and the ship checkpoint reports both.
- Given a progress file at `Feature phase: e2e-written`, When `/skill:pwk-status` runs, Then the topic renders `execute 0/N` and never the retired `feature-spec` state.

### Feature review: parallel
