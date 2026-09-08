# Implementation Plan: pwk2-single-doc

## Overview
Design: docs/plans/2026-09-08-pwk2-single-doc-design.md

## Crosswalk

| R# | Plan section | Tests |
|----|--------------|-------|
| 1 | Requirement 1: Merged design doc | `should instruct ### R<n> requirement blocks…`, `should never emit a crosswalk…`, `should audit criteria+tags exactly once`, digests E2E rethread |
| 2 | Requirement 2: Decisions-first At a glance | `should open At a glance summary → decisions → table`, `should mirror digest across user docs` |
| 3 | Requirement 3: Plan phase removed, execution rewired | `should map only brainstorming to a gated phase`, `should create branch in pre-flight…`, `should route legacy implementation docs…`, `should extract packet criteria from design doc`, `should write ADR 0004` |
| 4 | Requirement 4: Finalize learning sweep | `should sweep learning before disposal`, `should record architectural deviations at deviation time` |
| 5 | Requirement 5: pwk-walkthrough skill | `should ship a walkthrough skill with anchored template`, `should add pwk-walkthrough to UNLOCK_SKILLS atomically`, `should keep walkthroughs out of disposal` |

## Requirement 1: Merged design doc

### Acceptance criteria
- Given the `pwk-brainstorming` skill at 2.0.0, When its design-doc template and write instructions are inspected, Then `## Requirements` contains one `### R<n>: <name>` block per requirement carrying the one-line behavior, Given/When/Then criteria (incl. edge/error cases), and `### Checkpoints` / `### Review` tags — and the risk→`parallel` auto-tag rule lives here as the single source of truth.
- Given the skill text, When swept for 1.x plan artifacts, Then no instruction emits a `## Crosswalk` or a per-requirement test-name list, and no `-implementation.md` is ever created.
- Given the skill's audit step, When requirements are written, Then every requirement is verified to have criteria + both tags exactly once.
- Given a trivial change, When brainstormed, Then the `In short:` path still applies with a single requirement block.

### Integration tests
- `should instruct ### R<n> requirement blocks with criteria and tags in one design doc` — asserts the block template + auto-tag-rule marker in the skill (new-shape markers in `tests/markers.mjs`; a marker distinguishing `### R<n>:` blocks from the legacy `## Requirement N:` per the skill-lint new-vs-old lesson).
- `should never emit a crosswalk or per-requirement test-name list` — negative sweeps over the skill text and design template.
- `should audit every requirement has criteria and tags exactly once` — audit-rule marker present.
- human-review-digests E2E rethreaded to the single-doc shape (R# blocks → progress rows → coverage table).

### Checkpoints: none
### Review: parallel

### Production-risk notes
- `tests/markers.mjs` is a cross-file canonical registry — marker changes must land atomically in both suites; hard-coded literals outside it must be swept in the same change.

## Requirement 2: Decisions-first At a glance

### Acceptance criteria
- Given a design doc produced by 2.0.0, When read, Then `## At a glance` opens with a 2–4 sentence plain summary, then key-decision bullets (decision + why; `(rejected: X — reason)` clause only for real forks — never manufactured), then the `| R# | Requirement in one line | Risk |` table.
- Given the README and user docs, When compared to the skill, Then they mirror the decisions-first digest without contradicting it.

### Integration tests
- `should open At a glance summary → decisions → table` — skill-lint order + honest-empty rule sentence (regex assertions per the behavior-not-sentences lesson).
- `should mirror decisions-first digest across README and user docs` — docs-consistency suite.

### Checkpoints: none
### Review: skip

## Requirement 3: Plan phase removed, execution rewired

### Acceptance criteria
- Given the guard at 2.0.0, When inspected, Then `SKILL_TO_PHASE` maps only `pwk-brainstorming`, the `Phase` type is `brainstorm | null`, reminder wording says DESIGN, and invoking a skill named `pwk-writing-plans` no longer enters a phase (the skill no longer exists in `skills/` or the tarball).
- Given executing at 2.0.0, When its pre-flight runs on `main`, Then it creates the feature branch itself; when parsing a 2.0.0 design doc it reads `### R<n>` blocks + tags + `## Feature acceptance`.
- Given a stem-matched legacy `-implementation.md` (a 1.x in-flight feature), When executing/status discover work, Then the legacy flow is routed and all discovery globs cover both suffixes with the `completed/` exclusion (every consumer enumerated in the same change — lessons rule).
- Given the review-packet recipe, When run against a 2.0.0 design doc, Then acceptance criteria are extracted verbatim from the `### R1` → `## Feature acceptance` span.
- Given ADR 0004 was approved in brainstorm, When R3 lands, Then `docs/adr/0004-one-buildable-design-doc.md` exists with the approved text.

### Integration tests
- `should map only brainstorming to a gated phase` — guard export assertions; `pwk-writing-plans` absent from `skills/` and package files.
- `should reduce Phase to brainstorm | null` — `getCurrentPhase()` behavior (null initially, `brainstorm` on entry) with type-level compilation.
- `should create the branch in executing pre-flight and parse ### R blocks` — executing skill-text markers.
- `should route stem-matched legacy implementation docs through the old flow` — executing + status + finalize glob-wording assertions.
- `should extract packet criteria from the design doc` — review-packet suite re-anchored on a design-doc fixture (two-requirement fixture per the repeated-section sed lesson); the crosswalk-safety test is deleted with its premise.
- `should write ADR 0004` — file presence + approved-text markers.

### Checkpoints: spec
### Review: parallel

### Production-risk notes
- `UNLOCK_SKILLS` is the exported single source of truth (guard ↔ skill-lint ↔ skill set must change atomically — R3 must not alter its contents beyond R5's addition).
- Published npm package: breaking 2.0.0 — phase semantics and skill set change; CHANGELOG must carry a migration note for in-flight features.

## Requirement 4: Finalize learning sweep

### Acceptance criteria
- Given finalize at 2.0.0, When it runs, Then before any disposal command it reads the design doc's At-a-glance decisions **and `Approaches considered`**, the progress `Deviated?` entries (incl. deviation decision-records), and Code-digest `[ALERT]`s; 3-gate-passing items become ADR offers in `docs/adr/`; generic rules go to `docs/lessons.md`; honest-empty when nothing qualifies; thin material → asks the human rather than fabricating.
- Given executing at 2.0.0, When a departure reverses or alters a design decision, Then a short decision-record (what/why/rejected) is written into the progress file at deviation time; mechanical deviations keep one-liners.
- Given the disposal commands, When the sweep is inserted, Then the byte-guarded rm/mv lines are unchanged.

### Integration tests
- `should sweep learning before disposal` — finalize skill-text: sweep step ordered before the disposal commands; input list incl. `Approaches considered`; ask-don't-fabricate wording.
- `should record architectural deviations at deviation time` — executing skill-text marker.
- disposal byte-guards assert the rm/mv lines unchanged (existing suites stay green).

### Checkpoints: none
### Review: skip

## Requirement 5: pwk-walkthrough skill

### Acceptance criteria
- Given the kit at 2.0.0, When `skills/pwk-walkthrough/SKILL.md` is inspected, Then it is standalone (frontmatter/name), invoked on demand with topic/branch, derives from branch diff + code (+ optional surviving ADRs/lessons), and writes `docs/walkthroughs/<topic>.md` stamped with the commit range.
- Given a generated walkthrough, When read, Then it has Summary / How it works / Key flows / Gotchas & invariants / Change map sections and **every section anchors claims to concrete file paths (file:line)** — detailed enough to follow with the files open.
- Given an existing walkthrough, When the skill re-runs, Then the file is regenerated wholesale (never hand-edited); given finalize's disposal globs, When swept, Then `docs/walkthroughs/` is never disposed.
- Given `UNLOCK_SKILLS`, When inspected, Then `pwk-walkthrough` is present (single atomic addition).

### Integration tests
- `should ship a walkthrough skill with anchored template` — skill-lint: frontmatter, five sections, file:line mandate, SHA stamp, wholesale-regeneration wording.
- `should add pwk-walkthrough to UNLOCK_SKILLS atomically` — guard export ↔ skill-lint cross-check.
- `should keep walkthroughs out of finalize disposal` — negative sweep over finalize globs; package-integrity: the skill ships in the tarball.

### Checkpoints: none
### Review: parallel

### Production-risk notes
- `UNLOCK_SKILLS` atomicity (shared with R3 — land the export change exactly once).

## Feature acceptance
The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. Derived from the design doc: one end-to-end test exercising the requirements *together*. Make it concrete — a named test + the assertion that proves the composed behavior:
- `should thread pwk 2.0 end-to-end: one buildable design doc → executing → learning sweep → on-demand walkthrough` — Given the kit at 2.0.0 (skills + guard + tests at HEAD), When the full contract is asserted, Then brainstorming's single doc carries `### R#` blocks (criteria + tags, no crosswalk, no test-name lists) under a decisions-first At a glance; the guard maps only brainstorming to a phase and `pwk-writing-plans` no longer exists; executing parses the blocks, creates the branch, and the packet extracts criteria from the design doc; finalize sweeps learning (decisions + deviations + alerts → ADR offers/lessons) before disposal; and `pwk-walkthrough` — present in `UNLOCK_SKILLS` — writes a SHA-stamped, file:line-anchored `docs/walkthroughs/<topic>.md` that no disposal glob touches.
### Feature review: parallel
One review over the whole feature diff (always). Default `parallel`; `inline` for small features.
