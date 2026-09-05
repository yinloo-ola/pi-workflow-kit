# ADR 0003: Ship gate — review runs before the final approval

Date: 2026-09-05

## Context

ADR 0002's flow approves the feature at `feature-complete` (full suite + E2E green, the human
reviews the whole diff) and only then runs the feature-level review — findings arrive after the
blessing, as follow-ups. For a time-poor human this is the worst of both: the checkpoint's
default artifact is the most expensive thing to read (the raw diff), and the approval it produces
is blind to what the reviewers find. Since 1.6.0 the review itself is cheap (script-assembled
packet, tiered roles), so the cost argument for approving first no longer holds.

## Decision

Merge `feature-complete` and the feature review into one **ship checkpoint**. When all
requirements are ✅: run the full suite + feature E2E (green) → run the feature review per the
plan's tag → apply smell fixes and re-green → then pause once. The pause presents the execution
summary (what each requirement became, deviations), the spec-reviewer's per-requirement coverage
table, findings status, and the full diff only on request. The phase enum gains `ship-paused`
(replacing `feature-complete-paused`); legacy progress files resume as `reviewing`.

## Why

One fully-informed stop replaces one blind one plus a findings afterparty. The human's approval
sees exactly what the reviewers saw, compressed into digests keyed by requirement ID — the raw
diff remains one command away for spot-checks where a verdict smells wrong. Nothing is lost:
the E2E still gates before the pause, and smell fixes still land before approval rather than
after it.

## Consequences

- The human reads a digest (execution summary + coverage table), not the diff, by default —
  the kit's contract changes from "you review the whole diff" to "you review the digests; the
  diff is on request".
- Review cost is now spent before an abort could have saved it; accepted because the E2E-green
  prerequisite already filters the abort-worthy cases, and the review is post-1.6.0 cheap.
- A reviewer report without a per-requirement coverage table is invalid (retry or inline
  completion) — the ship checkpoint is never presented without coverage.
- Minor version bump: checkpoint semantics change for executing-tasks sessions; in-flight
  progress files carry a documented legacy resume mapping.
