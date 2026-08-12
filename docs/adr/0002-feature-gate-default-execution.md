# ADR 0002: Feature-gate as the default execution model

Date: 2026-08-12

## Context

`pwk-executing-tasks` (v1.0.0, 2026-07) enforced, for every requirement, a two-checkpoint +
four-reviewer review cycle, with the feature-acceptance E2E run only as a final integration gate.
In practice this over-ceremonied typical features and — worse — forced a test onto every
requirement slice; slices with no independent observable behavior produced meaningless tests that
asserted source text or passed without the real code running. The feature-acceptance E2E already
existed; it was just positioned as a trailing check rather than the primary gate.

## Decision

Make the feature-acceptance E2E the primary enforced gate, in one always-on flow: write the E2E
first (red) → `feature-spec` checkpoint → implement the requirements back-to-back →
`feature-complete` checkpoint (full suite + E2E green) → one feature-level review. Per-requirement
checkpoints and reviews become opt-in per requirement via the existing proportionality tags,
defaulting off; `pwk-writing-plans` flags only the requirements that genuinely need them.
Mid-implementation, each requirement still practices TDD (meaningful test → red → implement →
green) and the full existing suite is run after each commit; the feature E2E is gated only at
`feature-complete` (it is necessarily red until the last requirement lands).

## Why

This removes the source of meaningless tests (no forced per-slice tests for behavior-less
slices), collapses the redundant integration gate into the `feature-complete` checkpoint, and
matches how a feature is actually verified — while preserving test-first at feature granularity
(E2E first) and per slice (when meaningful), plus an escape hatch (per-requirement tags) for
genuinely risky or ambiguous slices.

## Consequences

- The default execution model loses the hard per-slice human gate; a wrong assumption can
  propagate further before the feature E2E catches it. Accepted because the `feature-spec`
  checkpoint front-loads the definition-of-done (the human approves the E2E before any
  implementation), and risky slices can still be tagged for per-requirement ceremony.
- Per-requirement tag defaults flip to `Checkpoints: none` / `Review: skip`; a feature-level
  `### Feature review: parallel | inline` is added. Existing in-flight plans are unaffected
  (they carry explicit tags from the prior skill).
- Minor version bump (1.3.0): backward-compatible mechanism (opt back in per requirement),
  changed defaults.
