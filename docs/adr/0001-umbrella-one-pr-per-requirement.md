# ADR 0001: One PR per requirement (umbrella), not one PR per design doc

Date: 2026-08-01

## Context

A requirement too big for one design doc needs decomposition into multiple design docs. The
earlier model shipped each design doc as its own PR, which forced the shared overview onto
`main` (blocked by branch protection) and swept sibling design docs into the first sub-design's
PR via the executor's `git add docs/plans/`. One-by-one brainstorming was also an undocumented
anti-pattern, yet it is the natural model (design each part against the real, implemented
predecessors).

## Decision

Ship the whole requirement as **one PR** ("umbrella"): a status-free overview roster on one
branch, with a per-part `(brainstorm → plan → execute) × N → finalize` cycle. A single design
doc (N=1) is the untouched degenerate case — the umbrella machinery is inert unless an overview
exists. Every skill's umbrella behavior is gated on one glob (`docs/plans/*-overview.md`); no
new skill or guard phase was added.

## Why

One branch dissolves the cross-branch / git-topology problems for free — the overview and every
design doc simply live on the branch, reached by `main` only via the single PR's merge. The
status-free roster (part-completion inferred from each part's own `*-progress.md`, never stored
in the overview) avoids the mutable-shared-table fragility the `## Features` status table was
removed for. Decomposition stays intra-PR: it exists to keep each cycle small and to let later
parts design against earlier parts' real, implemented code — not to ship independently.

## Consequences

- The PR unit is the **requirement** (umbrella), not the design doc. Design docs are
  decomposition units within a PR.
- An umbrella is worked serially on one branch; genuinely independent shippable units remain
  separate single-design-doc PRs (the common case).
- `pwk-finalizing` disposes the overview + every part's docs in one pass; `pwk-status` rolls
  parts up under the overview, inferring state from artifacts (the overview has no status).