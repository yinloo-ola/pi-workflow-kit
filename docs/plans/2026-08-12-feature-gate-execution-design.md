# Design: Feature-gate execution mode

## Requirements

1. **Feature-acceptance E2E is the primary enforced gate.** Executing a plan writes the feature-acceptance E2E test first (red), stops for a `feature-spec` checkpoint, implements the requirements, stops for a `feature-complete` checkpoint (E2E green), then runs one feature-level review.
2. **Per-requirement ceremony is opt-in, defaulting off.** A requirement gets its own checkpoint/review only when the plan tags it; untagged requirements get none. `pwk-writing-plans` flags the requirements that genuinely warrant it.
3. **Two feature-level checkpoints, always.** `feature-spec` (after the E2E is written, red) and `feature-complete` (full suite + E2E green, whole diff) — regardless of per-requirement tags.
4. **One feature-level review, always.** `parallel` (default — it is the single review point, so thoroughness lives here) or `inline` (small features), tagged at feature level.
5. **Mid-implementation regression signal comes from the meaningful tests + the full existing suite, not the feature E2E.** After each requirement commit, run that requirement's meaningful tests (green) and the full existing suite (green). The feature E2E is expected to stay red until the last requirement lands; it is gated only at `feature-complete`.
6. **Meaningful-test rules are documented and applied** — the two rules in [Meaningful-test rules](#meaningful-test-rules) below, mirrored in `pwk-writing-plans`, `pwk-executing-tasks`, and `docs/lessons.md`.
7. **Per-requirement tag defaults flip:** `### Checkpoints: none` and `### Review: skip` (was `full` / `parallel`). Feature level gains `### Feature review: parallel | inline`.
8. **skill-lint asserts** the new tags/defaults, the always-on feature gate, and the meaningful-test rules.
9. **Docs describe the single flow** (`docs/workflow-phases.md`, `README.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`).

## Problem

`pwk-executing-tasks` (v1.0.0, 2026-07) enforces, for *every* requirement: write integration tests (red) → checkpoint → implement → checkpoint → commit → per-requirement review (four parallel reviewers by default). For a 5-requirement feature that is ~10 human stops and 5 reviews (20 subagent runs). Two problems result:

- **Ceremony weight** — most requirements do not need their own human stops and review; the defaults are heavy.
- **Meaningless tests** — forcing a test onto every slice produces tests that assert the source contains text or that pass without the real code running, because slices with no independent observable behavior have nothing meaningful to assert.

The feature-acceptance E2E test *already exists* as the integration gate at the end of `pwk-executing-tasks`. The proposal is to promote it from "final check after N per-requirement rounds" to "the primary enforced gate," and demote per-requirement ceremony to an opt-in flag the plan sets only where warranted.

## Approaches considered

**Option A — Feature E2E is the only enforced test; per-requirement TDD stays as encouraged discipline (chosen).** The feature gate (E2E + two checkpoints + one review) is always on. Per-requirement checkpoints/reviews are opt-in via the existing proportionality tags, defaulting off; the plan flags the requirements that need them. Mid-implementation, the executor still practices TDD (write a meaningful test → red → implement → green) but it is not individually gated or reviewed. Removes the source of meaningless tests by not forcing tests onto behavior-less slices, while keeping test-first alive both at feature granularity (E2E first) and per slice (when meaningful).

**Option B — Keep per-requirement test-first, drop only the ceremony.** Still force a red→green test per requirement; remove the per-requirement stops/reviews; one feature review at the end. Lighter than today but does not fix the meaningless-test problem — the pressure to manufacture a test per tiny slice remains. Rejected.

**Option C — A separate `per-requirement` plan mode alongside a `feature-gate` mode.** Rejected as needlessly complex: the existing per-requirement tags already express "this slice gets ceremony." Flipping their defaults to off and adding the always-on feature gate achieves the same outcome with one flow and one mechanism.

## Architecture

One execution flow. The feature gate is always on; per-requirement ceremony is layered in only for tagged requirements.

```
write feature-acceptance E2E test (red)          ← from the plan's ## Feature acceptance
        ↓
  ⏸ CHECKPOINT: feature-spec                     ← human confirms the E2E proves the feature
        ↓
for each requirement (listed build order):
  · TDD discipline: write a MEANINGFUL test → red → implement → green
    (skip the per-slice test if the slice has no independent observable behavior)
  · if tagged Checkpoints: full | spec  → ⏸ that requirement's checkpoint(s)
  · run this requirement's meaningful tests (green) + the FULL existing suite (green)
  · commit (clear message)
  · if tagged Review: parallel | inline  → run that requirement's review now
        ↓
  ⏸ CHECKPOINT: feature-complete                 ← full suite + feature E2E green, whole diff
        ↓
  FEATURE REVIEW (parallel | inline) over the whole diff
  · smell-fixes applied by executor (tests stay green, commit)
  · trace/spec/hazard findings flagged as follow-ups for the human
        ↓
  suggest /skill:pwk-finalizing
```

The old "integration gate" collapses into the `feature-complete` checkpoint — the feature E2E *is* the gate, so there is no redundant second pass.

### Why the feature E2E is not a per-commit gate

A feature E2E exercises the requirements *together*; before the last requirement lands it is necessarily red. Running it per-commit and expecting green is wrong. Instead:

- **Per-commit:** the requirement's meaningful tests (green) + the full existing suite (green). The full suite is what catches cross-requirement regressions (a later requirement breaking an earlier requirement's meaningful test).
- **Feature E2E:** gated only at `feature-complete`. Running it mid-way is a *progress signal* (watch the failure point advance from "fails at step 1" toward "passes"), never a per-commit gate.

## Meaningful-test rules

Two rules, mirrored into `pwk-writing-plans` (acceptance-criteria authoring), `pwk-executing-tasks` (test authoring), and `docs/lessons.md`:

1. **Test observable behavior.** Assert on what the feature *produces or changes* — a return value, persisted/updated data, an emitted event, an HTTP response — through its public interface. These assertions describe what the feature does, so they keep passing as the implementation changes.
2. **Write a per-slice test when the slice has its own observable behavior.** When a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.

## Components (file changes)

| File | Change |
|------|--------|
| `skills/pwk-writing-plans/SKILL.md` | Per-requirement tag defaults flip to `### Checkpoints: none` / `### Review: skip`; add feature-level `### Feature review: parallel \| inline` (default `parallel`). Promote `## Feature acceptance` to the primary spec (concrete named E2E test + assertion). Guide the planner to flag a requirement for a checkpoint when it contains complex logic or is the main part of the feature, and for a review when it touches production-risk areas. Add meaningful-test rules for acceptance-criteria authoring. Update the plan template + audit step. |
| `skills/pwk-executing-tasks/SKILL.md` | Replace the per-requirement loop with the feature-gate flow above. Per-requirement checkpoints/reviews fire only for tagged requirements (default none). Two always-on feature checkpoints + one feature review. Mid-implementation testing = meaningful tests + full existing suite (E2E is final gate). Progress file gains feature-level phase tracking + a requirement checklist (implemented Y/N) for resume. Enforce meaningful-test rules. |
| `skills/pwk-code-review/SKILL.md` | Note it reviews the whole feature diff in the default flow (vs a single requirement when a per-requirement review is invoked). Minor. |
| `skills/pwk-brainstorming/SKILL.md` | Emphasize `## Feature acceptance` is now the primary enforced spec — invest in it (already says "treat 'I can write this scenario' as the green light"; strengthen). Light. |
| `docs/workflow-phases.md` | Rewrite the executing-tasks section + ASCII pipeline for the single feature-gate flow with opt-in per-requirement tags; update Proportionality. |
| `README.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md` | Update the workflow description to match. |
| `docs/lessons.md` | Add the meaningful-test lesson (positive framing). |
| `tests/skill-lint.mjs` | Assert: per-requirement tag defaults are `none`/`skip`; feature-level `### Feature review` exists; executing-tasks references the two feature checkpoints and the feature-gate flow; feature-gate is the documented default; meaningful-test rules are present in writing-plans and executing-tasks. |
| `CHANGELOG.md` | Entry under [Unreleased] / new version. |

**No guard change.** The guard's phases (brainstorm/plan/execute) and `UNLOCK_SKILLS` are unaffected — the feature gate is an executing-tasks internal, not a guard phase. `tests/workflow-guard.test.ts` is untouched. This keeps the change lower-risk.

## Data flow

- `pwk-brainstorming` → design doc with a strong `## Feature acceptance` (the feature's definition-of-done).
- `pwk-writing-plans` → implementation plan: per-requirement acceptance criteria + the feature-level review tag + per-requirement tags defaulting off (flagged on only where warranted) + a concrete `## Feature acceptance` E2E spec.
- `pwk-executing-tasks` → feature-gate flow; progress file tracks feature phase + requirement checklist.
- `pwk-finalizing` → unchanged (disposes the topic's docs; ships the PR).

## Error handling / edge cases

- **E2E cannot run before any implementation.** It is fine for it to fail-to-compile/run (that is red). A pure-refactor feature with no behavior change: the plan notes "no feature E2E; gate on the full suite staying green" (documented exception).
- **Feature-gate with a single requirement.** The feature E2E ≈ the requirement's meaningful test; works. Trivial fixes still use the brainstorming trivial fast-path (one-turn minimal design doc).
- **Resume.** The progress file records the feature phase (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `feature-complete-paused`, `reviewing`, `done`) so a new session resumes correctly mid-flow.
- **Backward compatibility.** Existing in-flight plans were written with *explicit* tags under the old skill (`### Checkpoints: full`, etc.), so resuming them still applies their stated ceremony — no silent change. New plans inherit the off-defaults when a tag is omitted.
- **Large feature diff in one review.** Reviewers focus by requirement within the whole diff. For very large features, recommend an umbrella split or tagging key requirements for per-requirement review.

## Production-risk areas

This is a **published package** (`@tianhai/pi-workflow-kit`) and the change **flips documented defaults** (per-requirement ceremony on → off by default; adds an always-on feature gate). Risk: users relying on the heavy default get lighter behavior unless they tag requirements. Mitigation: per-requirement tags remain available and explicit; the feature gate adds rigor the old model lacked. Recommend a **minor version bump (1.3.0)** — the mechanism is backward-compatible (opt back in per requirement), defaults change but are trivially reversed. The kit modifying its own skills: `skill-lint` must stay green throughout.

## Testing (how the change itself is verified)

No guard-logic change → `tests/workflow-guard.test.ts` untouched. All assertions are skill-content checks via `tests/skill-lint.mjs`:

- The plan template (in `pwk-writing-plans`) shows per-requirement `Checkpoints: none` / `Review: skip` defaults and a feature-level `### Feature review`.
- `pwk-executing-tasks` references both feature checkpoints (`feature-spec`, `feature-complete`) and the feature-gate flow, and states per-requirement ceremony is opt-in.
- Feature-gate is named as the default in `docs/workflow-phases.md`.
- Meaningful-test rules (positive framing) appear in `pwk-writing-plans` and `pwk-executing-tasks`.
- No new guard phase or `UNLOCK_SKILLS` entry was introduced.

## Feature acceptance

- **Given** a design doc with a `## Feature acceptance` scenario and three requirements (requirement 2 flagged `Checkpoints: spec` + `Review: inline`; requirements 1 and 3 left at default), **When** `pwk-writing-plans` runs, **Then** the plan carries a feature-level `### Feature review`, per-requirement tags defaulting to `none`/`skip` with requirement 2 explicitly flagged, and a concrete `## Feature acceptance` E2E spec — and nothing else is gated per requirement.
- **Given** that plan, **When** `pwk-executing-tasks` runs, **Then** it writes the feature E2E (red), **stops at `feature-spec`**, implements all three requirements in order (stopping only for requirement 2's tagged checkpoint and review; requirements 1 and 3 get no per-requirement stop or review), **stops at `feature-complete`** with the full suite + feature E2E green, runs one feature review over the whole diff, and suggests `/skill:pwk-finalizing` — with the feature E2E observed red (failure advancing) mid-implementation and green only at `feature-complete`.
