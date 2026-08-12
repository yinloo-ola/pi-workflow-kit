# Implementation Plan: feature-gate-execution

## Overview
Design: docs/plans/2026-08-12-feature-gate-execution-design.md
ADR: docs/adr/0002-feature-gate-default-execution.md
Branch: feature-gate-execution

Promote the feature-acceptance E2E to the primary enforced gate; make per-requirement
checkpoints/reviews opt-in (default off); add two always-on feature checkpoints and one
feature-level review; document the meaningful-test rules. No guard change.

## How requirements are verified here

This repo tests skill/doc content via `tests/skill-lint.mjs` (content assertions) and
`npm run check` (biome + vitest + skill-lint). Per `docs/lessons.md`, skill/doc work is
**test-first**: add the skill-lint assertion (red — the skill doesn't yet claim the behavior),
then edit the skill markdown to satisfy it (green). Each requirement below names its
**distinguishing marker** (a string only the new model has — avoids the false-green trap noted
in `docs/lessons.md`).

**Constraints every requirement must respect** (existing skill-lint checks that must stay green):
- Check 2 — keep checkpoint vocab `{full, spec, none}` and review vocab `{parallel, inline, skip}` present in both `pwk-writing-plans` and `pwk-executing-tasks`.
- Check 3 — keep `### Checkpoints`, `### Review`, `## Requirement`, `## Setup` in both skills.
- Check 4 — **leave the `spec`-requires-`inline` text intact** (see "Design implication" below).
- Checks 5/7 — keep `## Feature acceptance`, `## Umbrella`, `status-free`, `next part`, branch `reuse`.
- Checks 6/8 — **no guard change**: `UNLOCK_SKILLS` and `SKILL_TO_PHASE` (2 gated skills) untouched.

## Requirement 1: pwk-writing-plans — flip tag defaults + feature-level review tag

### Acceptance criteria
- Given the `pwk-writing-plans` skill, When read, Then per-requirement `### Checkpoints` default is `none` and `### Review` default is `skip`, stated explicitly (was `full` / `parallel`).
- Given the `pwk-writing-plans` plan template, When read, Then it includes a feature-level `### Feature review: parallel | inline` (default `parallel`, always present) alongside the per-requirement tags.
- Given the `pwk-writing-plans` skill, When read, Then `## Feature acceptance` is described as the primary enforced spec, with a concrete named E2E test + its assertion derived from the design.
- Given the `pwk-writing-plans` skill, When read, Then the planner is guided to flag a requirement for a **checkpoint** when it contains complex logic or is the main part of the feature, and for a **review** when it touches production-risk areas; all other requirements stay at the off-defaults; the audit step reflects the new defaults.

### Integration tests (skill-lint, test-first)
- Add assertion: `pwk-writing-plans` contains `### Feature review` (distinguishing marker — absent today).
- Add assertion: `pwk-writing-plans` contains the default-flip marker `default to \`none\` / \`skip\`` (replaces today's `default to \`full\` / \`parallel\``).
- Add assertion: `pwk-writing-plans` contains `primary enforced spec` near `## Feature acceptance`.

### Checkpoints: spec
### Review: inline

## Requirement 2: pwk-executing-tasks — feature-gate execution flow

### Acceptance criteria
- Given the `pwk-executing-tasks` skill, When read, Then it describes one always-on flow: write the feature-acceptance E2E (red) → `feature-spec` checkpoint → implement requirements back-to-back → `feature-complete` checkpoint (full suite + E2E green, whole diff) → feature review → suggest finalize.
- Given the `pwk-executing-tasks` skill, When read, Then per-requirement checkpoints/reviews are opt-in, firing only for tagged requirements (default none) — not the mandatory per-requirement loop of v1.0.0.
- Given the `pwk-executing-tasks` skill, When read, Then mid-implementation regression testing is "run the requirement's meaningful tests + the full existing suite after each commit"; the feature E2E is gated only at `feature-complete` (expected red until the last requirement).
- Given the `pwk-executing-tasks` skill, When read, Then the progress file tracks a feature-level phase (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `feature-complete-paused`, `reviewing`, `done`) plus a requirement checklist, so a resume re-enters correctly.
- Given the `pwk-executing-tasks` skill, When read, Then it still references `### Checkpoints`, `### Review`, `## Setup`, `Feature acceptance`, `umbrella`, `next part` (keeps checks 3/5/7 green).

### Integration tests (skill-lint, test-first)
- Add assertion: `pwk-executing-tasks` contains both `feature-spec` and `feature-complete` (distinguishing markers).
- Add assertion: `pwk-executing-tasks` contains `opt-in` describing per-requirement ceremony (distinguishing marker — today it is mandatory, never called opt-in).

### Checkpoints: spec
### Review: inline

## Requirement 3: Meaningful-test rules mirrored

### Acceptance criteria
- Given the two meaningful-test rules (positive framing), When the three files are read, Then `pwk-writing-plans` (acceptance-criteria authoring), `pwk-executing-tasks` (test authoring), and `docs/lessons.md` each contain both rules verbatim:
  1. **Test observable behavior.** Assert on what the feature produces or changes — a return value, persisted/updated data, an emitted event, an HTTP response — through its public interface. These assertions describe what the feature does, so they keep passing as the implementation changes.
  2. **Write a per-slice test when the slice has its own observable behavior.** When a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.

### Integration tests (skill-lint, test-first)
- Add assertion: `pwk-writing-plans`, `pwk-executing-tasks`, and `docs/lessons.md` each contain the distinguishing marker `Test observable behavior`.

### Checkpoints: none
### Review: skip

## Requirement 4: pwk-code-review + pwk-brainstorming wording

### Acceptance criteria
- Given the `pwk-code-review` skill, When read, Then it notes the default review scope is the whole feature diff (vs a single requirement when a per-requirement review is invoked), and still states it is `unlocked` (keeps check 6 green).
- Given the `pwk-brainstorming` skill, When read, Then it emphasizes `## Feature acceptance` as the primary enforced spec to invest in, and still emits the `## Feature acceptance` header, `## Umbrella`, and `status-free` (keeps checks 5/7 green).

### Integration tests (skill-lint, test-first)
- Add assertion: `pwk-code-review` contains the distinguishing marker `whole feature diff`.
- Add assertion: `pwk-brainstorming` contains the distinguishing marker `primary enforced spec`.

### Checkpoints: none
### Review: skip

## Requirement 5: Docs describe the single feature-gate flow

### Acceptance criteria
- Given `docs/workflow-phases.md`, When read, Then the executing-tasks section + ASCII pipeline describe the single feature-gate flow (E2E → `feature-spec` → implement → `feature-complete` → feature review) with per-requirement tags as opt-in, and Proportionality reflects the flipped defaults.
- Given `docs/developer-usage-guide.md`, When read, Then its workflow description matches the feature-gate flow (and still documents the umbrella `status-free` model — keeps check 7 green).
- Given `README.md` and `docs/oversight-model.md`, When read, Then their workflow descriptions match the feature-gate flow.

### Integration tests (skill-lint, test-first)
- Add assertion: `docs/workflow-phases.md` contains the distinguishing marker `feature-spec` (or `feature-complete`) and describes the feature-gate flow as the default.

### Checkpoints: none
### Review: skip

## Requirement 6: CHANGELOG + version bump

### Acceptance criteria
- Given `CHANGELOG.md`, When read, Then it has an entry under the new version describing the feature-gate default, opt-in per-requirement tags, and the meaningful-test rules (Keep-a-Changelog format).
- Given `package.json`, When read, Then the version is `1.3.0`.

### Integration tests
- `npm run check` green (biome + vitest + skill-lint) is the gate; no new assertion needed.

### Checkpoints: none
### Review: skip

## Production-risk areas

- **Published package default flip** — `@tianhai/pi-workflow-kit` users relying on the heavy per-requirement default get lighter behavior unless they tag requirements. Fully reversible (opt back in per requirement); the always-on feature review adds rigor the old model lacked. Mitigation: minor version bump (Requirement 6) + CHANGELOG entry.
- **No runtime/DB/auth/external-API risk.** No guard change; `tests/workflow-guard.test.ts` is untouched.

## Feature acceptance

- **Given** the `feature-gate-execution` branch with the design + ADR-0002 committed, **When** all six requirements are implemented in order, **Then** `npm run check` (biome + vitest + skill-lint) is green with the **new** assertions present and passing — `### Feature review` and `default to \`none\` / \`skip\`` in `pwk-writing-plans`; `feature-spec`, `feature-complete`, and `opt-in` in `pwk-executing-tasks`; `Test observable behavior` in writing-plans + executing-tasks + lessons; `whole feature diff` in code-review; `primary enforced spec` in brainstorming; `feature-spec` in workflow-phases — **and** every existing check still passes (checkpoint/review vocab, template coverage, `spec`-requires-`inline` text, feature-acceptance + umbrella contracts, `UNLOCK_SKILLS`, 2 gated skills), **and** `package.json` reads `1.3.0`.

## Design implication to confirm (not in this plan)

The always-on feature review covers implementation quality for the whole diff, so the old
"**`spec` requires `inline` review**" constraint (skill-lint Check 4) may now be redundant —
`Checkpoints: spec` + `Review: skip` becomes safe because the feature review catches it. This
plan **keeps the constraint intact** to stay in scope and keep the suite green. If you want it
dissolved, that's a small follow-up plan: remove the text from `pwk-writing-plans`,
`pwk-executing-tasks`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, and rewrite
Check 4 — all atomically. Flag this when reviewing.
