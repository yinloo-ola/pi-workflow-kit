# ADR 0005: Risk-scaled review — the review weight follows the design's declared risk

Date: 2026-09-11

## Context

Since 1.7.0 `pwk-brainstorming` auto-tagged every requirement carrying a non-empty
`### Production-risk notes` section as `### Review: parallel`, and `pwk-executing-tasks`
then ran four fresh-context reviewers for each such requirement **and** the same four
again over the whole feature diff at the ship checkpoint. A risk-touching part with four
risk requirements therefore paid up to twenty role spawns for coverage the feature review
already provided over the whole diff — the duplication, not the review, was the cost.

Two things were wrong with the rule, and only one of them was about cost. The auto-tag was
also *silent*: it committed reviewer budget on the agent's inference rather than the
human's decision, at the one moment where a human would have chosen differently had they
been asked.

## Decision

The per-requirement auto-tag is **deleted**. `### Review` defaults to `skip` everywhere and
**only the human tags a slice**.

The single feature review becomes `### Feature review: auto | parallel | inline`, default
`auto`. `auto` resolves on the design's own production-risk content — `parallel` (four
fresh-context read-only roles) when the design has a non-empty `## Production-risk areas`
section **or** any requirement has a non-empty `### Production-risk notes`, and `inline`
(one `/skill:pwk-code-review` pass) otherwise. An explicit `parallel` or `inline` is used
as written and always wins over `auto`, in both directions.

## Why

The review weight now follows a declaration the human approved at design time rather than
an agent's inference, and the review still runs exactly once per part over the whole diff —
so full coverage is retained while the per-requirement duplication disappears. Both mirrored
risk signals are read because the design rules keep the section and the per-requirement
notes in sync and either alone can drift.

## Consequences

- A risk-flagged requirement the human does not explicitly tag receives **no** slice review;
  the feature review still covers it, but in isolation-blind form. This is the deliberate
  trade — the human can tag `### Review: inline` on any slice to buy back the slice view.
- A design that declares risk in **neither** mirrored place silently resolves to one inline
  pass. The failure mode is under-review, not a false claim of coverage.
- The default feature review weight is now "as risky as the design says it is", so the
  design doc's risk declarations are load-bearing input rather than advisory color.
- `tests/skill-lint.mjs` carries three tag vocabularies (Checkpoints, Review, Feature
  review) and asserts the `auto` resolution wording in both skills, so the resolution rule
  cannot drift between them unnoticed.
- Minor version bump (2.2.0): the mechanism is unchanged and per-requirement ceremony
  remains available; only the defaults and the auto-tag behaviour change.
