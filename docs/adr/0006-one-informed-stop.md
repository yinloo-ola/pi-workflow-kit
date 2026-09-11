# ADR 0006: One informed stop — the feature-spec approval became a notice

Date: 2026-09-11

## Context

Under ADR 0002 the feature-gate flow paused after the feature-acceptance E2E was written,
so the human could confirm the E2E actually proved the feature. But the E2E encodes the
design doc's `## Feature acceptance` section, which the human had already written and
approved during brainstorm. The pause therefore asked the same question twice — ADR 0004's
"paying twice" failure, one phase later and with the same root cause: a gate positioned to
re-approve derived content.

A second and smaller instance of the same pattern was the `spec` value of the
per-requirement `### Checkpoints` tag, which paused mid-execution on the acceptance criteria
the design doc had just been approved for.

## Decision

The feature-spec checkpoint becomes a **notice**. The E2E is still written first, must still
be observed failing, and remains the primary enforced gate at the ship checkpoint — but it
is *reported* with its failing output, and execution continues straight into the implement
phase **without waiting for approval**. Mandatory human stops per feature drop from two to
one (ship). `pwk-status` renders `e2e-written` as `execute 0/N` and the `feature-spec`
display state is retired. The `spec` value is dropped from the Checkpoints enum, leaving
`none | full`.

Two reserved failure stops survive, and they are what makes the notice safe: an E2E that
cannot be brought to green, and an E2E that passes immediately while the expected behaviour
looks wrong, both halt and present rather than proceeding.

## Why

One fully-informed stop replaces one blind stop plus an approval that re-asked an answered
question. The notice keeps the human's window to object *before* implementation starts, at
zero stop cost, and the ship checkpoint remains the gate that signs off what was built.
Iterating the E2E to green is already the default behaviour, so removing the pause removes
ceremony rather than capability.

## Consequences

- **Accepted cost, and it is real:** nothing at execute time catches an E2E that encodes the
  *wrong* behaviour. A dutiful agent will "fix" correct code to satisfy a mis-specified test,
  and green looks like success. The catch is now the ship stop or the review's coverage
  table — later and more expensive than the old pause. The notice narrows the window; it
  does not close it.
- The E2E's authority shifts from "approved by a human at execute time" to "approved as the
  design's `## Feature acceptance`, then verified at ship". The design doc's
  definition-of-done section carries correspondingly more weight.
- Per-requirement ceremony reduces to one axis with two values (`Checkpoints: none | full`)
  plus the review tags; there is no longer a mid-execution correctness stop at all.
- Legacy progress files at `feature-spec-paused` resume into the implement phase, and the
  deprecated `spec` tag resolves to `none` rather than erroring.
- Minor version bump (2.2.0): the flow's stop count changes for every future feature, with a
  documented legacy resume mapping.
