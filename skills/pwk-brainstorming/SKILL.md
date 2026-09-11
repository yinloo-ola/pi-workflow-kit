---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design, then writes the single buildable design doc (requirements with acceptance criteria + review tags) that pwk-executing-tasks builds from. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. (Once an ADR is approved by the human, `docs/adr/` becomes writable too — ask the user to unlock or run the write.) The design doc is the **single buildable artifact** — each requirement carries its own acceptance criteria and review tags, and the executor builds straight from it; nothing is re-derived into a second document later. Source-writing happens in `pwk-executing-tasks`.

## Proportionality: trivial vs non-trivial

Classify the change at the start.

- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–7; write a **minimal** design doc in one turn (an `In short:` one-liner — what + why + approach in plain words, plus a single `### R1:` requirement block with its criteria and tags, and an optional `## Production-risk areas` line), and hand off to `/skill:pwk-executing-tasks`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
- **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.

When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.

## Granularity

**One design doc = one PR; one requirement = one testable slice within it.** Most work is a single design doc.

- Within a doc, decompose into **requirements** — one `### R<n>: <name>` block per requirement, each one testable behavior carrying its own acceptance criteria and tags.
- A requirement too big for one design doc but shipping as a single PR is an **umbrella** — multiple design docs decomposed under one overview, on one branch, finalized once. See [Umbrella](#umbrella) below.

## Umbrella

An umbrella splits one large requirement into multiple design docs that ship together as **one PR**. One branch; one `pwk-finalizing` at the end. The split is intra-PR decomposition — a way to keep each design/execute cycle small and focused, not a multi-PR strategy.

**First brainstorm** (the requirement is too big for one design doc):

1. **Propose the split** — the parts, a one-line scope each, and build order. Get human approval before writing anything beyond discovery.
2. **Write the overview** — `docs/plans/<date>-<umbrella>/overview.md`, in the umbrella's own folder (every part doc lives beside it: `<part>-design.md`, `<part>-progress.md`, `*-review-packet.md`), a **status-free roster**:

   ```markdown
   # Overview: <umbrella>

   Goal: <one line — what the whole requirement delivers>

   ## Parts (build order)
   1. <topic> — <one-line scope>
   2. <topic> — <one-line scope>
   ```

   Goal, parts with one-line scopes, build order — **no status column**. No skill mutates the overview between this write and `pwk-finalizing` (which disposes it); part-completion is inferred from each part's own `*-progress.md`.
3. **Write the first part's** `<part>-design.md` in the same umbrella folder, then hand off to `/skill:pwk-executing-tasks`.

**Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then report each prior part's `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <part>-progress.md` beside the overview — no body ingest) before designing the slice, then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. Predecessor phases are visibility, not enforcement: design the slice regardless; cross-slice decisions that must persist go in an ADR, not the overview.

The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the branch in its pre-flight and reuses it for later parts, and suggests the next part (or finalize after the last); `pwk-finalizing` disposes the overview + every part's docs and ships one PR.

## Process

1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics still report `design` exactly as today. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR unlock. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.

   **Assumptions to confirm first** — before presenting, sweep the drafted design: every assumption it would bake in unconfirmed (business rules, defaults, edge-case resolutions) re-opens as a numbered question carrying your recommended answer; the human confirms, strikes, or corrects each in one reply. An honest empty gate ("no unconfirmed assumptions") when the draft is clean — never invent items. Hard rule: no business behavior enters the design doc on the agent's assumption. Confirmed facts are woven into the doc's existing sections — no new template section.

   Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; write it only after the user approves and unlocks.)
7. **Write the design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`, descriptive (not a task list). This is the single artifact the executor builds from.

   **Open with `## At a glance`** — the human's two-minute digest, immediately before `## Requirements`. It contains (1) a 2–4 sentence plain-language summary: what is wrong or needed, what will be built, the key approach in plain words; (2) **Key decisions** — one line each: decision + why, with a `(rejected: <alternative> — <reason>)` clause only when the fork was real and load-bearing (never manufactured — no fork, no clause); (3) a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, where **R# = the requirement's block number in the `## Requirements` section below** — this ID is what every later digest keys on (progress rows, execution summary, reviewer coverage table). Plain language only: short sentences, no jargon, no Given/When/Then — those live in the requirement blocks for the executor. An umbrella overview gains no at-a-glance section; its roster already serves that role.

   Then **`## Requirements`** — one block per requirement, each one testable behavior:

   ```markdown
   ## Requirements

   ### R1: <name>
   <one-line testable behavior — what the feature produces or changes, through its public interface>

   **Acceptance criteria** — Given/When/Then criteria defining "done". Test observable behavior — what the feature produces or changes through its public interface; not implementation steps. Cover edge and error cases.
   - Given … When … Then …
   - Given … When … Then … (edge case)

   ### Checkpoints: none | full
   ### Review: skip | parallel | inline

   ### Production-risk notes
   - <only when the requirement touches a risk area>

   ### R2: <name>
   …
   ```

   Block rules:

   - **No test-name lists.** The criteria are the test spec — the executor writes and names the actual tests red-green from them, so the doc contains no test-name lists and no R#-to-section mapping tables: the block structure is the map.
   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
   - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area carries its `### Production-risk notes` in the block and is flagged `⚠ production-risk` in the At-a-glance Risk column (the column is derived, **display-only**: `⚠ production-risk` if and only if the block carries non-empty `### Production-risk notes`, else `—` — never normative, never an input; `auto` reads the notes only), but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
   - **No per-requirement spec stop, by design** — the acceptance criteria are approved right here, at design time; re-checking them mid-execution asks a question the human already answered. A legacy `spec` tag in an in-flight design doc resolves to `none`.
   - **Production-risk notes** — a requirement touching a production-risk area carries its notes inside the block. Risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
   - **Ordering** — dependencies come earlier in the list; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.

   Then the narrative sections the executor reads as context — problem, approaches considered, architecture, components, data flow, error handling. **Approaches considered records every real fork and why each loser lost** — the executor needs the reasoning, and the finalize learning sweep harvests it for ADRs.

   Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` **immediately after the last requirement block** — inside the `### R1 → ## Feature acceptance` span, so the review packet carries it to reviewers verbatim — and mirror the risks into each touched block's `### Production-risk notes`. `pwk-code-review` audits it per requirement, and finalize's learning sweep reads it.

   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). The section carries the feature-level `### Feature review: auto | parallel | inline` tag — the one whole-feature review; default `auto`, which resolves on the design's own production-risk content to `parallel` (all four reviewers) when the design has any — a non-empty `## Production-risk areas` section, or a non-empty `### Production-risk notes` on any requirement — and to `inline` (one pass) otherwise. An explicit `parallel` or `inline` is written as-is, never resolved, so the human always overrides `auto`. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.

   ```markdown
   ## Feature acceptance

   - Given <starting state>, When <trigger>, Then <end-to-end outcome the feature promises>.

   ### Feature review: auto | parallel | inline — the one whole-feature review; leave `auto` unless the human says otherwise.
   ```

   Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."

   **Audit before finishing:** every requirement block has acceptance criteria and both tags, and each requirement appears **exactly once** — none dropped, none duplicated. A `## Feature acceptance` section exists as the primary enforced spec. Production-risk areas are reflected in the requirement blocks that touch them.

   **Splitting large issues:** if the requirement needs more than one design doc, propose an umbrella split (one `<topic>` per part) and get human approval first — see [Umbrella](#umbrella). On approval, write the status-free overview (`docs/plans/<date>-<umbrella>/overview.md`) and the **first part's** `-design.md` beside it, then hand off to `/skill:pwk-executing-tasks`. Later parts are brainstormed one by one (each re-reading the overview) — do not write every part's design doc up front.

The session stays read-only and uncommitted through brainstorm: branch creation and the design-doc commit happen at the start of `pwk-executing-tasks` (its pre-flight creates the feature branch).

## Principles

- Detail-gathering asks in frontier rounds; approvals ask one decision at a time
- No silent assumptions — ask, gate, or look it up
- YAGNI — remove unnecessary features
- Design for testability
- Explore alternatives before settling

## After the design

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"
