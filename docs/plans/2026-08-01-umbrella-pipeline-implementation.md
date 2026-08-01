# Implementation Plan: umbrella-pipeline

## Overview
Design: docs/plans/2026-08-01-umbrella-pipeline-design.md

This is a change to pi-workflow-kit itself: support a requirement that needs more than one
design doc, shipping as **one PR**, via a status-free overview roster and a per-part
`(brainstorm → plan → execute) × N → finalize` cycle. N=1 (single design doc) stays untouched.

**Testing note for the executor:** this repo's test surface is `tests/skill-lint.mjs`
(content-consistency assertions over skill markdown) and `tests/workflow-guard.test.ts` (guard
pure helpers). "Integration tests" below are therefore skill-lint assertions the executor writes
**red** (skill doesn't claim X yet), then turns **green** by editing the skill/doc content. Guard
behavior is regression only (no guard edit in this change). N=1 regression is verified by the
existing skill-lint Checks 1–6 staying green throughout.

## Requirement 1: brainstorm proposes splits; writes the status-free overview + first part

Defines the overview (filename, status-free roster) that every other requirement consumes.

### Acceptance criteria
- Given a requirement too large for one design doc and no existing `*-overview.md`, When brainstorm runs, Then the LLM proposes a split (parts + one-line scope each + build order) and pauses for human approval before writing anything beyond discovery.
- Given human approval of a split, When brainstorm writes, Then it creates `<date>-<umbrella>-overview.md` as a status-free roster (goal + parts + build order, **no status column**) AND the first part's `<date>-<part>-design.md`.
- Given a requirement that fits one design doc, When brainstorm runs, Then it writes a single `<date>-<topic>-design.md` and **no** overview (N=1 path unchanged).
- Given the overview is written, When any later skill reads it, Then it finds only goal/parts/build-order — no status field to mutate.

### Integration tests
- `should claim brainstorm proposes a split and writes an overview + first part` — skill-lint asserts `pwk-brainstorming` content documents proposing splits + writing `*-overview.md`.
- `should define the overview as a status-free roster` — skill-lint asserts `pwk-brainstorming` documents the roster schema (goal/parts/build-order, no status column).
- `should preserve the N=1 single-design-doc path` — regression: existing Check 5 (`## Feature acceptance` in brainstorm) still passes.

### Checkpoints: full
### Review: inline

## Requirement 2: writing-plans reuses the branch for later parts

### Acceptance criteria
- Given the first part of an umbrella and no feature branch yet, When writing-plans runs, Then it creates branch `<umbrella>` (derived from the overview) and plans the part.
- Given a later part of an umbrella and the session is already on the umbrella's feature branch, When writing-plans runs, Then it detects the existing branch (`git branch --show-current`) and **reuses** it — it does not create a new branch.
- Given a single design doc (N=1), When writing-plans runs, Then it creates branch `<topic>` exactly as today.

### Integration tests
- `should claim writing-plans reuses an existing feature branch for later parts` — skill-lint asserts `pwk-writing-plans` documents the branch-reuse check.
- `should keep checkpoint/review vocab and plan-template coverage intact` — regression: existing Checks 2 & 3 still pass.

### Checkpoints: spec
### Review: inline

## Requirement 3: executing-tasks suggests finalize or brainstorm-next after each part

### Acceptance criteria
- Given the integration gate just passed and no overview exists (N=1), When executing-tasks reports, Then it suggests `/skill:pwk-finalizing`.
- Given the integration gate passed, an overview exists, and the completed part is the **last** in the roster, When executing-tasks reports, Then it suggests `/skill:pwk-finalizing`.
- Given the integration gate passed, an overview exists, and the completed part is **not** last, When executing-tasks reports, Then it suggests `/skill:pwk-brainstorming` for the **named** next part.
- Given the suggestion logic, When executing-tasks reads the overview, Then it reads only the roster/build-order (status-free) — it infers "last" from roster position, never a status column.

### Integration tests
- `should claim executing-tasks suggests finalize or brainstorm-next keyed on the overview roster` — skill-lint asserts `pwk-executing-tasks` documents the post-gate suggestion logic.
- `should keep the feature-acceptance integration-gate reference` — regression: existing Check 5 still passes.

### Checkpoints: full
### Review: inline

### Production-risk notes
- execute's "am I last?" assumes in-order execution per the build order; out-of-order/skipped parts are human-driven (the human invokes the next skill), so a wrong suggestion is overrideable, not a hard failure.

## Requirement 4: finalizing disposes the overview + all parts; ships one PR

### Acceptance criteria
- Given an overview exists (umbrella) and all parts are complete, When finalizing runs, Then it disposes the overview **and** every roster part's `<date>-<part>-{design,implementation,progress}.md`, then creates **one** PR.
- Given the disposal, When finalizing globs, Then it uses scoped `????-??-??-<part>-*` globs per roster entry and verifies with `ls docs/plans/` before/after — it does not blanket-delete unrelated docs.
- Given no overview exists (N=1), When finalizing runs, Then it disposes the single topic's three docs and creates one PR exactly as today.

### Integration tests
- `should claim finalizing disposes the overview + all parts and ships one PR` — skill-lint asserts `pwk-finalizing` documents dispose-all-when-overview + one PR.
- `should claim scoped disposal globs per roster entry` — skill-lint asserts `pwk-finalizing` documents the scoped `????-??-??-<part>-*` glob + `ls` verify.

### Checkpoints: full
### Review: inline

### Production-risk notes
- finalize disposing multiple docs — over-deletion risk if the roster names a wrong topic. Mitigation: scoped dated-topic globs per roster entry + `ls docs/plans/` before/after; the roster is brainstorm-authored and human-approved, not model-improvised at dispose time.

## Requirement 5: docs reflect the umbrella model

### Acceptance criteria
- Given the umbrella feature, When the pipeline docs are updated, Then `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, and `README.md` describe: a requirement may span multiple design docs shipping as one PR; the status-free overview; the per-part cycle; finalize-once.
- Given the docs, When skill-lint runs, Then it asserts the umbrella concept appears in `workflow-phases.md` and `developer-usage-guide.md`.
- Given the change, When `CHANGELOG.md` is updated, Then it has an entry under the umbrella feature.

### Integration tests
- `should document the umbrella model in pipeline docs` — new skill-lint check: `workflow-phases.md` + `developer-usage-guide.md` mention the umbrella/overview concept.
- `should preserve the spec+inline guard note in docs` — regression: existing Check 4 still passes.

### Checkpoints: spec
### Review: inline

## Requirement 6: guard + status unchanged; no new skill/phase (regression lock-in)

### Acceptance criteria
- Given the change, When skill-lint runs, Then it asserts no new skill directory was added and `SKILL_TO_PHASE` / `UNLOCK_SKILLS` are unchanged (no new phase, no new unlock).
- Given the change, When the guard tests run, Then `tests/workflow-guard.test.ts` passes unchanged (no guard edit).
- Given the change, When `pwk-status` is examined, Then it already rolls parts up under an overview (no change required).

### Integration tests
- `should assert no new skill and unchanged phase mapping` — skill-lint asserts the skill directory set + `SKILL_TO_PHASE` + `UNLOCK_SKILLS` match the pre-change values.
- `should pass the guard test suite unchanged` — `npm test` (`workflow-guard.test.ts`) green.

### Checkpoints: spec
### Review: inline

## Feature acceptance
Derived from the design doc. One end-to-end test exercising the requirements together:
- `should support a multi-design-doc requirement as one umbrella PR while leaving the single-design-doc flow unchanged` — Given the four pipeline skills + guard, When `npm run check` runs, Then skill-lint asserts brainstorm/writing-plans/executing-tasks/finalizing each carry their umbrella claim consistently, no new skill or guard phase was added, the guard tests pass, and the N=1 path is untouched (existing Checks 1–6 stay green). The N=3 end-to-end behavior (overview → per-part cycle → one-PR finalize) is verified by the design's Feature acceptance scenarios as a manual trace, since this repo cannot automate the multi-skill workflow.