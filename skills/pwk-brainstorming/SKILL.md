---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. (Once an ADR is approved by the human, `docs/adr/` becomes writable too — ask the user to unlock or run the write.) Planning produces the document the executor builds from; source-writing happens in later phases.

## Proportionality: trivial vs non-trivial

Classify the change at the start.

- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–7; write a **minimal** design doc in one turn (an `In short:` one-liner — what + why + approach in plain words, a `## Requirements` list with the single requirement, optional `## Production-risk areas` line), and hand off to `/skill:pwk-writing-plans`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
- **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.

When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.

## Granularity

**One design doc = one PR; one requirement = one testable slice within it.** Most work is a single design doc.

- Within a doc, decompose into **requirements**, each one testable behavior.
- A requirement too big for one design doc but shipping as a single PR is an **umbrella** — multiple design docs decomposed under one overview, on one branch, finalized once. See [Umbrella](#umbrella) below.

## Umbrella

An umbrella splits one large requirement into multiple design docs that ship together as **one PR**. One branch; one `pwk-finalizing` at the end. The split is intra-PR decomposition — a way to keep each design/plan/execute cycle small and focused, not a multi-PR strategy.

**First brainstorm** (the requirement is too big for one design doc):

1. **Propose the split** — the parts, a one-line scope each, and build order. Get human approval before writing anything beyond discovery.
2. **Write the overview** — `docs/plans/<date>-<umbrella>/overview.md`, in the umbrella's own folder (every part doc lives beside it: `<part>-design.md`, `<part>-implementation.md`, `<part>-progress.md`, `*-review-packet.md`), a **status-free roster**:

   ```markdown
   # Overview: <umbrella>

   Goal: <one line — what the whole requirement delivers>

   ## Parts (build order)
   1. <topic> — <one-line scope>
   2. <topic> — <one-line scope>
   ```

   Goal, parts with one-line scopes, build order — **no status column**. No skill mutates the overview between this write and `pwk-finalizing` (which disposes it); part-completion is inferred from each part's own `*-progress.md`.
3. **Write the first part's** `<part>-design.md` in the same umbrella folder, then hand off to `/skill:pwk-writing-plans`.

**Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. There is no special "read your predecessors" step; cross-slice decisions that must persist go in an ADR, not the overview.

The whole umbrella is one branch and one PR: `pwk-writing-plans` creates the branch on the first part and reuses it for later parts; `pwk-executing-tasks` suggests the next part (or finalize after the last); `pwk-finalizing` disposes the overview + every part's docs and ships one PR.

## Process

1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/**/*-design.md` and `docs/plans/**/overview.md` (recursive — each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder, excluding docs/plans/completed/ — archived work is not in flight); report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR unlock. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.

   **Assumptions to confirm first** — before presenting, sweep the drafted design: every assumption it would bake in unconfirmed (business rules, defaults, edge-case resolutions) re-opens as a numbered question carrying your recommended answer; the human confirms, strikes, or corrects each in one reply. An honest empty gate ("no unconfirmed assumptions") when the draft is clean — never invent items. Hard rule: no business behavior enters the design doc on the agent's assumption. Confirmed facts are woven into the doc's existing sections — no new template section.

   Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; write it only after the user approves and unlocks.)
7. **Write the design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`, descriptive (not a task list). **Open with `## At a glance`** — the human's two-minute digest, immediately before `## Requirements`. It contains (1) a 2–4 sentence plain-language summary: what is wrong or needed, what will be built, the key approach in plain words; (2) a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, where **R# = the requirement's number in the `## Requirements` list below** — this ID is what every later digest keys on (plan crosswalk, progress rows, reviewer coverage table). Plain language only: short sentences, no jargon, no Given/When/Then — those live in the body sections for the executor. An umbrella overview gains no at-a-glance section; its roster already serves that role.

   Then **`## Requirements`** — one testable behavior each; `pwk-writing-plans` derives acceptance criteria and tests from these. Then: problem, approaches considered, architecture, components, data flow, error handling, testing.

   Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` — `pwk-writing-plans` carries it into the plan and `pwk-code-review` audits it per requirement.

   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-writing-plans` derives a feature-level test from it; `pwk-executing-tasks` runs it as the **primary enforced spec** (the test it gates on first). Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.

   ```markdown
   ## Feature acceptance

   - Given <starting state>, When <trigger>, Then <end-to-end outcome the feature promises>.
   ```

   Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."

   **Splitting large issues:** if the requirement needs more than one design doc, propose an umbrella split (one `<topic>` per part) and get human approval first — see [Umbrella](#umbrella). On approval, write the status-free overview (`docs/plans/<date>-<umbrella>/overview.md`) and the **first part's** `-design.md` beside it, then hand off to `/skill:pwk-writing-plans`. Later parts are brainstormed one by one (each re-reading the overview) — do not write every part's design doc up front.

The session stays read-only and uncommitted through brainstorm and plan: branch creation happens at the end of `/skill:pwk-writing-plans`; plan docs are committed at the start of `pwk-executing-tasks`.

## Principles

- Detail-gathering asks in frontier rounds; approvals ask one decision at a time
- No silent assumptions — ask, gate, or look it up
- YAGNI — remove unnecessary features
- Design for testability
- Explore alternatives before settling

## After the design

Ask: "Ready to plan? Run `/skill:pwk-writing-plans`"