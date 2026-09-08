# ADR 0004: One buildable design doc — plan phase merged into brainstorm

Date: 2026-09-08

## Context

Since 1.7.0 the design doc already carried testable requirements and the Feature-acceptance E2E;
the plan phase (`pwk-writing-plans`) then mechanically re-derived them into a second
`-implementation.md` the human approved with a one-line rubber stamp. Every feature paid for a
second skill load, a second approval, and restated content (criteria, risk notes, Feature
acceptance) — "paying twice" for derived data, while the executor read a stripped spec instead of
the design's architecture context.

## Decision

In 2.0.0, `pwk-writing-plans` and the plan phase are removed. The design doc is the single
buildable artifact: one `### R<n>:` block per requirement carrying the one-line behavior,
Given/When/Then acceptance criteria (edge and error cases included), and Checkpoints/Review tags,
plus the Feature-acceptance E2E with the feature-level review tag. `pwk-executing-tasks` creates
the feature branch in its pre-flight, parses the blocks, and extracts review-packet criteria from
the design doc. Durable knowledge is promoted at finalize (the learning sweep harvests decisions,
deviations, and alerts into ADRs and lessons.md) precisely because the doc itself is disposed.
A decisions-first At a glance (summary → key decisions with honest-empty rejected-alternative
clauses → R#/risk table) is the human digest; no crosswalk, no test-name lists — the block
structure is the map and the executor writes tests red-green from criteria.

## Consequences

- One meaningful approval replaces a rubber stamp; the executor inherits the full architecture
  context; per-feature token cost drops (one fewer skill load, zero restatement).
- Accepted cost: the plan phase's cold re-read is gone — mitigated by the brainstorm assumption
  gate and frontier rounds at design time, the E2E-first gate at execute, and reviewer fresh eyes.
- The guard's phase map reduces to `brainstorm | null` (the two phases were already
  behaviorally identical: `docs/plans/`-only writes).
- Legacy stem-matched `-implementation.md` docs route the old flow so in-flight 1.x features
  finish; breaking change, shipped as 2.0.0 with a CHANGELOG migration note.
