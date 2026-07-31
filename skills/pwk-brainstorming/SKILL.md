---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. (Once an ADR is approved by the human, `docs/adr/` becomes writable too — ask the user to unlock or run the write.) Planning produces the document the executor builds from; source-writing happens in later phases.

## Proportionality: trivial vs non-trivial

Classify the change at the start.

- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–5; write a **minimal** design doc in one turn (one-line context, a `## Requirements` list with the single requirement, optional `## Production-risk areas` line), and hand off to `/skill:pwk-writing-plans`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
- **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.

When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.

## Granularity

**One design doc = one PR; one requirement = one testable slice within it.**

- Split into **multiple design docs** only when each part could ship as its own PR (independently reviewable and mergeable). Each runs its own plan → execute → finalize pipeline.
- Within a doc, decompose into **requirements**, each one testable behavior. Decision rule: could this part be reviewed and merged on its own? Yes → separate design doc. No → one doc, multiple requirements. Most work is a single doc; splitting is opt-in.

## Process

1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/*-design.md`; report in-flight topics. If the new idea continues an existing topic, ask whether to extend it or start fresh.
3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions one at a time, prefer multiple choice. Once you can articulate what/why/constraints, present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
4. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
5. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.

   Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; write it only after the user approves and unlocks.)
6. **Write the design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`, descriptive (not a task list). **Open with `## Requirements`** — one testable behavior each; `pwk-writing-plans` derives acceptance criteria and tests from these. Then: problem, approaches considered, architecture, components, data flow, error handling, testing.

   Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` — `pwk-writing-plans` carries it into the plan and `pwk-code-review` audits it per requirement.

   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-writing-plans` derives a feature-level test from it; `pwk-executing-tasks` runs it at the integration gate. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature.

   ```markdown
   ## Feature acceptance

   - Given <starting state>, When <trigger>, Then <end-to-end outcome the feature promises>.
   ```

   Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."

   **Splitting large issues:** propose multiple design docs (one `<topic>` per sub-issue) and get human approval first — see [Granularity](#granularity). Each runs its own pipeline.

The session stays read-only and uncommitted through brainstorm and plan: branch creation happens at the end of `/skill:pwk-writing-plans`; plan docs are committed at the start of `pwk-executing-tasks`.

## Principles

- One question at a time
- YAGNI — remove unnecessary features
- Design for testability
- Explore alternatives before settling

## After the design

Ask: "Ready to plan? Run `/skill:pwk-writing-plans`"