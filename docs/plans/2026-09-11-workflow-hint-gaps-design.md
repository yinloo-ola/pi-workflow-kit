# Design: workflow-hint-gaps

Fix the workflow's routing, rendering, gate, visibility, and worktree defects found by fresh-session simulation (gaps G1–G5, U1–U4, plus the worktree lifecycle). Text edits only — no guard or test changes.

## At a glance

Fresh sessions bounce between skills (status hints finalizing, finalizing refuses; code review skips the ship gate), render states with undefined parts, route blind to predecessor state, gate umbrellas vacuously, and re-offer worktrees that already exist. Five grouped fixes — one per workflow concern, not per skill — each verified by re-running the simulation that found it.

**Key decisions**
- Scope is repo `skills/` prose only; guard and `tests/skill-lint.mjs` untouched (rejected: bundling lint/guard updates — separate topic, separate PR).
- KISS first: each criterion states the observable invariant, never the edit; the executor picks the smallest wording that satisfies it.
- Legacy v1.x paths (`*-implementation.md`, `feature-complete-paused`, `Checkpoints: spec`, `Plan:` refs) are out of scope — left verbatim, untested (rejected: stripping them here — behavior change for any in-flight 1.x docs, separate topic if ever).
- Requirements are grouped by concern so each slice is independently shippable; file order inside a slice is free (rejected: nine per-gap slices — fragments the review, hides interactions like status-hint vs finalize-gate).
- A roster part with no progress file **blocks** finalizing (rejected: warn-and-confirm — risks disposing an unstarted design unread).
- Build order stays advisory; later parts only gain predecessor visibility (rejected: hard enforcement — breaks legitimate parallel-part work and would need guard support).
- One worktree per branch, adopted on reuse (rejected: one worktree per part — git forbids two checkouts of one branch, so per-part creation always collides).
- Installed-copy drift (`.pi` copies still document live `spec` and default-`parallel` review) is out of scope (rejected: editing user-local copies — hand-synced, not shipped).

| R# | Requirement in one line | Risk |
|----|-------------------------|------|
| 1 | Next-step routing never bounces | low |
| 2 | Every rendered state is complete | low |
| 3 | Sessions see the state they route on | low |
| 4 | Gates and vocabulary match reality | medium |
| 5 | One worktree per branch, created once, removed once | low |

## Requirements

### R1: Next-step routing never bounces

Every "what next" hint must land on a skill whose gate accepts the current state.

**Acceptance criteria**
- Given a topic at `ship-paused`, When a fresh session runs status, Then it renders next step `/skill:pwk-executing-tasks` (approve the ship checkpoint) and no state other than `done` ever carries a finalizing hint.
- Given any code-review completion (per-requirement or whole-feature, clean or with findings), When the review ends, Then the next step is `/skill:pwk-executing-tasks`, and no already-terminal requirement row regresses (step 7 states which row `🔄` applies to: the requirement under review).
- Given two umbrellas in flight plus a standalone design, When a feature review completes, Then a standalone feature takes the standalone branch and a part reads the roster from the overview in its own folder (finalizing text unchanged — its ambiguous-case ask already covers this).

### Checkpoints: none
### Review: skip

### R2: Every rendered state is complete

No tally without a defined source, no state without a bucket.

**Acceptance criteria**
- Given a progress file at `e2e-written` with K requirement rows, When status renders it, Then it shows `execute 0/K` where K comes from one bounded Requirements-table row count, with the source stated next to the mapping. (Legacy mappings out of scope — untouched.)
- Given parts at `feature-spec` and `awaiting setup`, When status groups by umbrella, Then each lands in a named bucket, and the bucket enumeration matches the state vocabulary one-to-one.

### Checkpoints: none
### Review: skip

### R3: Sessions see the state they route on

Extend-vs-fresh and slice-vs-sibling decisions need predecessor phases on disk, not assumed.

**Acceptance criteria**
- Given an in-flight topic (design + progress at any phase), When a fresh brainstorm session runs discovery, Then its report includes the topic's `Feature phase:` line (matched, header-only — no body ingest); design-only topics still report `design` exactly as today.
- Given an umbrella with part 1 at any phase, When a fresh session brainstorms part 2, Then it reports part 1's phase line before designing the slice.
- Given a later part's execute pre-flight with a prior part not at `done`, When it reports, Then it surfaces the prior parts' phases as advisory context (no refusal, no reorder).

### Checkpoints: none
### Review: skip

### R4: Gates and vocabulary match reality

The finalize gate must fail closed on unstarted work; the phase vocabulary must not list values nothing writes.

**Acceptance criteria**
- Given an umbrella roster of 3 parts where 2 progress files read `done` and the third has no progress file, When finalizing pre-checks run, Then the run blocks naming the unstarted part and routes back to `/skill:pwk-executing-tasks`; all-`done` umbrellas and standalone topics behave exactly as today (existing `❌`/`⏭` rules untouched).
- Given the executing-tasks text, When read, Then its live phase enumeration contains only phases the flow writes. (Pre-notice files are legacy — out of scope, untouched.)

### Checkpoints: none
### Review: skip

### R5: One worktree per branch, created once, removed once

Umbrella parts share one branch, so at most one worktree can ever back it; resume sessions must adopt, not duplicate.

**Acceptance criteria**
- Given a part-1 worktree already checking out the umbrella branch, When a later part's pre-flight runs, Then it adopts the existing worktree (same `../<repo>-<topic>` convention, branch topic) instead of offering a new `git worktree add`; a standalone resume with an existing worktree likewise adopts rather than re-offers.
- Given finalizing cleanup, When the topic's worktree exists, Then it is removed after verifying presence (`git worktree list`); when absent, cleanup is a silent no-op — never a failure.

### Checkpoints: none
### Review: skip

## Problem

Fresh-session simulation of the whole workflow (new session per phase, disk state only) closes the happy path but the seams leak: routing hints bounce (status→finalizing→executing-tasks, code-review skipping the ship gate, unscoped overview checks), renders go undefined (sourceless tallies, bucketless states), sessions assume predecessor state they never read, the umbrella gate passes unstarted parts vacuously, the phase list names a value nothing writes, and worktree offer/cleanup disagree on reuse. The file handoffs themselves (progress file, packet, overview, disposal globs) are sound — every defect is prose. Five grouped slices, independently reviewable, one PR.

## Approaches considered

- **Grouped vs per-gap slices:** nine per-gap slices mirror the bug list but fragment review and hide interactions (the status hint and the finalize gate are one loop, not two fixes). Grouped-by-concern wins — five slices, each verifiable end to end by its own simulation.
- **U4 block vs warn-and-confirm:** warn mirrors the existing `⏭ skipped` treatment, but a skipped requirement was built and judged while an unstarted part was never built — confirming still disposes its design unread. Block wins; the user returns via executing-tasks, the normal path.
- **Order visibility vs enforcement:** enforcement (refuse out-of-order work) would need resume-time predecessor checks plus guard support, and it forbids legitimate parallel-part execution. Visibility (report phases, proceed) closes the blind assumption at prose cost only. Visibility wins.
- **Discovery glob vs status pointer (G4):** a pointer preserves brainstorm's discovery shape but forces a skill switch to answer one question. One extra suffix glob keeps the session self-sufficient within the existing header-only economy. Glob wins.
- **Worktree adopt vs per-part:** per-part worktrees collide by construction — git refuses two checkouts of the shared umbrella branch, and the stale path breaks resume. Adopt-if-exists keyed on the branch topic wins; creation stays a one-time offer.

## Feature acceptance

- Given a topic at `ship-paused`, When a fresh session runs status then finalizing, Then status routes to executing-tasks and finalizing is never wrongly invoked (R1).
- Given a completed inline feature review, When the reviewer finishes, Then the session continues in executing-tasks through the ship checkpoint to `done` (R1).
- Given an umbrella with an unstarted roster part, When finalizing pre-checks run, Then the run blocks naming the part (R4).
- Given two umbrellas plus a standalone design in flight, When each feature review completes, Then every routing decision uses only the current design's folder (R1).
- Given any single state in the phase vocabulary, When status renders it standalone and inside an umbrella, Then the output names a bucket, a next step, and no undefined tally (R2).
- Given an umbrella worktree from part 1, When part 2 pre-flights and the umbrella finalizes, Then part 2 adopts the worktree and finalize removes exactly it (R5).

### Feature review: auto
