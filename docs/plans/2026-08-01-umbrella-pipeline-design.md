# Design: Umbrella pipeline — one requirement, multiple design docs, one PR

## Requirements

1. A requirement that fits one design doc (no overview) flows **exactly as today** — brainstorm → writing-plans → executing-tasks → finalizing, one PR. No behavior change for the single-doc case.
2. When brainstorm recognizes a requirement is too big for one design doc, the **LLM proposes the split** — the parts, a one-line scope each, and build order — and on human approval writes a status-free `*-overview.md` plus the first part's design doc.
3. The overview is a **status-free roster** (goal, parts with one-line scopes, build order). No skill mutates it between brainstorm (write) and finalizing (dispose). Part-completion is inferred from each part's self-contained `*-progress.md`, never stored in the overview.
4. writing-plans creates the feature branch on the first part and **reuses it for every later part** (detected via `git branch --show-current`), so the whole umbrella lives on one branch.
5. After its integration gate, executing-tasks suggests the correct next step: **no overview → finalize**; overview present and the just-completed part is last in the roster → finalize; otherwise → brainstorm the named next part.
6. finalizing, with an overview present, **disposes the overview plus every roster part's design/plan/progress docs and creates one PR**; with no overview it disposes one topic's docs (today's behavior).
7. The guard re-engages read-only for each later part's brainstorm and writing-plans; **no guard change is required**.
8. pwk-status rolls all roster parts up under the overview (already implemented; no change).

## Problem

The kit's "one design doc = one PR" axiom, combined with brainstorm writing the overview *and every sub-design doc at once*, produced three incoherences for multi-design-doc requirements:

- **Sibling-doc pollution.** All sub-design docs are written uncommitted on `main`; `executing-tasks`'s `git add docs/plans/ && git commit` sweeps the overview *and every sibling design* onto sub-design #1's branch, so PR #1 contains other parts' design docs.
- **No home for the overview across branches.** Sub-design #2 forked from `main` before #1 merges sees no overview; its `writing-plans` globs, finds nothing, bails.
- **One-by-one brainstorming is an anti-pattern.** The skills say "don't re-brainstorm per sub-design," yet one-by-one is the natural model (design each part against the real, implemented predecessors).

The driver's constraints dissolve all three: the **LLM** proposes the split; design docs are handled **one by one**; and **one PR is created after the whole requirement is complete**. Once the whole umbrella is one PR on one branch, the overview and every design doc simply live on that branch — there is no cross-branch read, no overview-on-`main`, and no pollution (only one part's docs exist when its `git add docs/plans/` runs). The split stops being a shipping strategy and becomes pure intra-PR decomposition.

## Approaches considered

### PR unit

- **One PR per design doc (today).** *Rejected* — forces the overview onto `main` (blocked by branch protection) plus cross-branch reads and sibling pollution.
- **One PR per umbrella (chosen).** All docs on one branch; no cross-branch anything; the split is intra-PR decomposition.

### Cycle shape

- **Flattened** — `brainstorm-all → plan-all → execute-all → finalize` (just 4 commands). *Rejected* — re-introduces the oversized-execute + implicit-loop problems the `2026-07-29-simplify-workflow` redesign deliberately removed, and forfeits designing each part against its predecessors' real code.
- **Per-part cycle (chosen)** — `(brainstorm → plan → execute) × N`, finalize once. Reuses the known self-contained flow per part; no new concepts; each part stays small with its own checkpoints (the reason to split at all).

### Overview model

- **Status table** mutated by each transition. *Rejected* — this is exactly the fragility the `## Features` table redesign removed (multiple skills mutating a shared table via fragile cross-doc parsing, driving an implicit loop).
- **Status-free roster + infer completion from per-part progress (chosen).** The overview is read-only until dispose; completion lives in each part's self-contained progress file; this matches the inference `pwk-status` already performs ("in-flight is inferred from the artifacts — no phase writes it").

### Who proposes the split

- **Human supplies the roster.** *Rejected* — the user wants the LLM to do it.
- **LLM proposes in the first brainstorm; human approves (chosen).**

### Where the overview lives

- **Committed to `main` directly.** *Rejected* — branch protection blocks it.
- **On the single umbrella branch (chosen)** — written in brainstorm #1, carried onto the branch by the first `writing-plans`, committed by the first `executing-tasks`, disposed by `finalizing`. It reaches `main` only via the one PR's merge; never via direct commit.

## Architecture

### Pipeline shape

```
brainstorm* → writing-plans → executing-tasks   │   brainstorm → writing-plans → executing-tasks   │   …   │   finalizing
 (overview + part 1)                              (part 2, same branch)                                  (once: one PR)
            \_____________________ one branch, one PR _____________________/
```

*The first brainstorm proposes the split (human approves) and writes the overview. Each later part reads the overview for big-picture/roster context, then designs its slice by exploring the codebase as brainstorm always does — prior parts are just implemented code in the repo by then. One finalize at the end.*

The single-doc case is the degenerate N=1: no overview is written, and the flow is `brainstorm → plan → execute → finalize` exactly as today.

### One signal

Every skill's umbrella behavior is gated on a single glob: **does `docs/plans/*-overview.md` exist for this work?** No → today's behavior. Yes → the skill adds one small branch. N=1 never enters the umbrella logic.

### Overview schema (status-free)

```markdown
# Overview: <umbrella>

Goal: <one line — what the whole requirement delivers>

## Parts (build order)
1. payments-core — pricing + charge orchestration. (no deps)
2. payments-ui — checkout UI on core's PricingService. (needs 1)
3. payments-webhooks — event delivery off core's emitter. (needs 1)
```

Goal, parts with one-line scopes, build order. Nothing else — no status column, no composition-surface contracts. The build order is the sequence parts are worked; it is the input executing-tasks reads to decide "am I last?".

**What the overview is for:** the big picture and slice boundaries — context the codebase can't convey on its own. It tells each part the umbrella goal, its siblings, and where its own slice ends, so it composes with siblings rather than reinventing them or creeping past its boundary. The LLM still reads the codebase naturally to design and implement each slice (including any already-implemented predecessors, which are just part of the code by then). There is no special "read your predecessors" step; brainstorm and execute behave exactly as today, plus the roster for context. Cross-slice decisions that must persist go in ADRs (permanent, read naturally when relevant), not in the overview.

## Components touched

Four skills add one check each, gated on the overview glob. The other four change nothing.

| Skill | N=1 (unchanged) | N>1 — added logic (gated on `overview exists?`) |
|---|---|---|
| **brainstorm** | write `*-design.md` | big request + no overview → propose split, write overview + part 1; later parts get roster context from the overview, then explore the codebase (incl. implemented predecessors) to design their slice — as brainstorm always does |
| **writing-plans** | `git checkout -b <topic>`, plan | `git branch --show-current` — already on a branch → reuse it; else create the umbrella branch |
| **executing-tasks** | implement → "→ finalize" | after integration gate, read overview roster: just-done part is last → "→ finalize"; else → "→ brainstorm `<next>`" |
| **finalizing** | dispose 1 topic's docs, 1 PR | dispose overview + every roster part's docs, 1 PR |
| status | flat | rolls up under overview *(already does this)* |
| code-review | per-requirement | per-requirement — no change |
| diagnose | on-demand | on-demand — no change |
| guard | follows the skill | re-engages read-only per later part's brainstorm/plan — no change |

## Data flow

### N=1 — single design doc (regression baseline)

brainstorm writes `<topic>-design.md` (uncommitted, `main`) → writing-plans `git checkout -b <topic>` + writes `-implementation.md` → executing-tasks `git add docs/plans/ && git commit` (the doc + plan + progress), implements, integration gate, suggests finalize → finalizing disposes `<topic>`'s three docs, one PR. Identical to today.

### N=3 — umbrella

1. **brainstorm:** proposes 3-part split, human approves; writes `payments-revamp-overview.md` + `payments-core-design.md` (uncommitted, `main`).
2. **writing-plans (core):** `git checkout -b payments-revamp`; writes core's `-implementation.md`.
3. **executing-tasks (core):** `git add docs/plans/` commits overview + core docs (the only docs that exist → no pollution); implements core; integration gate; reads roster, core is not last → "→ brainstorm payments-ui".
4. **brainstorm (ui):** reads the overview for big-picture/roster context (knows pricing is core's slice → compose, don't rebuild), then explores the codebase — now including core's implemented code — to design the ui slice, as brainstorm always does. Writes `payments-ui-design.md`. *(guard re-engages read-only.)*
5. **writing-plans (ui):** `git branch --show-current` → already on `payments-revamp` → reuse; writes ui's `-implementation.md`.
6. **executing-tasks (ui):** implements ui; integration gate runs core+ui; reads roster, ui is not last → "→ brainstorm payments-webhooks".
7. **brainstorm/plan/execute (webhooks):** same shape; webhooks is last → "→ finalize".
8. **finalizing:** overview present → dispose it + core/ui/webhooks design+plan+progress docs (10 files, scoped per roster entry); full suite; **one PR**.

One branch, one PR, all scaffolding added and removed within that PR.

## Error handling

- **Split turns out wrong mid-flight** — re-run brainstorm; revise the overview roster (add/remove/reorder parts); continue. Already-done parts' docs are preserved (finalize only runs once, at the end).
- **A part's design diverges** — brainstorm updates *that part's* design doc. If the divergence changes the split itself, revise the overview roster.
- **Stale roster when execute/finalize read it** — both verify against actual files before acting: execute confirms the next part's design doc is expected; finalize uses scoped `????-??-??-<part>-*` globs per roster entry with `ls docs/plans/` before/after, so a roster entry whose docs were never created is skipped (`|| true`), not fatal.

## Testing

- `tests/skill-lint.mjs`: brainstorm claims to propose splits + write the overview; writing-plans claims branch-reuse; executing-tasks claims the post-gate suggestion logic; finalizing claims dispose-all-when-overview. Assert no new skill is added and `UNLOCK_SKILLS`/`SKILL_TO_PHASE` are unchanged.
- `tests/workflow-guard.test.ts`: unchanged (no new phase, no guard edit) — regression only.
- Behavioral (acceptance criteria in the plan): N=1 produces identical behavior to today; N=3 produces one branch, one PR, and finalizing disposes overview + 3×(design+plan+progress); executing-tasks suggests finalize only at the last part and "brainstorm next" otherwise.

## Production-risk areas

- **finalize disposing multiple docs** — risk of over-deletion if the roster names a wrong topic. Mitigation: scoped dated-topic globs per roster entry + `ls docs/plans/` before/after, as today; the roster is brainstorm-authored and human-approved, not model-improvised at dispose time.
- **execute's "am I last?" inference** — assumes in-order execution (the build order's purpose). Out-of-order or skipped parts: the human drives every transition and can override the suggestion. If robustness is later needed, fall back to "are all roster parts' progress files complete?" (read each).

## Feature acceptance

- **Given** a single-design-doc requirement, **When** the user runs the pipeline, **Then** no overview is written and the flow is identical to today — one PR, same four commands.
- **Given** a large requirement, **When** brainstorm proposes a 3-part split and the human approves, **Then** an overview + part-1 design are written onto a single branch; parts 2 and 3 are each brainstormed, planned, and executed in sequence against the prior parts' real, implemented code; executing-tasks suggests "brainstorm next" after parts 1–2 and "finalize" after part 3; and a single finalizing creates **one PR** and disposes the overview plus every part's scaffolding docs.