---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design, then writes the single buildable design doc (requirements with acceptance criteria + review tags) that pwk-executing-tasks builds from. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. (An approved ADR goes to `docs/adr/`, which sits outside the writable boundary — the human writes it themselves or briefly runs `/pwk-guard off`; the design phase never unlocks it.) The design doc is the **single buildable artifact** — each requirement carries its own acceptance criteria and review tags, and the executor builds straight from it; nothing is re-derived into a second document later. Source-writing happens in `pwk-executing-tasks`.

## Proportionality: trivial vs non-trivial

Classify the change at the start.

- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–6; read the design-format reference and run the validator in step 7, writing a **minimal** design doc in one turn (an `In short:` one-liner — what + why + approach in plain words, plus a single `### R1:` requirement block with its criteria and tags, and an optional `## Production-risk areas` line — and deliberately **no `## Feature acceptance`**: a trivial slice's ship gate is the full existing suite, no E2E is manufactured for it), and hand off to `/skill:pwk-executing-tasks`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
- **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.

When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.

## Scope and granularity

**One design doc = one PR; one requirement = one testable slice within it.** Most work is a single design doc; several requirements serving one cohesive outcome do not force an umbrella.

Before drafting, assess whether a large request has distinct testable outcomes that need separate design/execute cycles. If so, propose an **umbrella** of vertical slices with one-line scopes and a build order, and get human approval before writing an overview or design. A layers-only split (database, API, UI) is not a vertical split: each slice delivers testable behavior. Design only the current slice; ground later designs in implemented code, not speculative sibling designs. The umbrella still ships as one PR on one branch, finalized once.

**One folder per topic:** `docs/plans/<date>-<topic>/`, containing `<leaf>-design.md`, `<leaf>-progress.md`, and `<leaf>-review-packet*.md`; `<leaf>` is `<topic>` for a single-part topic. More than one leaf adds `overview.md`. The whole folder is the creation/discovery/disposal unit.

**Umbrella trigger:** before proposing or writing a new umbrella, or when discovery finds an existing `overview.md` beside this design, read [references/umbrella.md](references/umbrella.md). It defines the status-free roster, first/later-slice procedures, and header-only predecessor reporting. Build order is advisory, not an enforcement gate. An existing roster means the split is already decided; design the current slice against it.

## Process

1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics report `design`. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` **beside the design doc** means the split is already decided — read it for the roster and design this part's `<leaf>-design.md` against it (read [references/umbrella.md](references/umbrella.md) before proceeding).
3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.

   **Assumptions to confirm first** — before presenting, sweep the drafted design: every assumption it would bake in unconfirmed (business rules, defaults, edge-case resolutions) re-opens as a numbered question carrying your recommended answer; the human confirms, strikes, or corrects each in one reply. An honest empty gate ("no unconfirmed assumptions") when the draft is clean — never invent items. Hard rule: no business behavior enters the design doc on the agent's assumption. Confirmed facts are woven into the doc's existing sections — no new template section.

   Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; the human writes the approved ADR themselves or briefly runs `/pwk-guard off` — the agent never writes it while the design phase is gated.)
7. **Write the design doc** — validate its structure before handing off; before writing either a trivial or non-trivial doc, read [references/design-format.md](references/design-format.md) for the exact format, tag defaults, risk/Setup rules, and audit. Requirement blocks carry acceptance criteria plus `### Checkpoints` / `### Review` tags. Missing tags default to `none` / `skip`. Write `docs/plans/<date>-<topic>/<leaf>-design.md`, creating the topic folder when absent. It is descriptive, not a task list; the executor builds directly from it.

   **Completion gate:** Test observable behavior through the public interface. Audit every requirement's criteria, tags, and risk notes; confirm each appears exactly once. For non-trivial work, finish with end-to-end `## Feature acceptance` as the primary enforced spec. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — an unwritable step means an unspecified requirement, not permission to guess. Risk notes never set the tag — the written `### Review` value stays `skip` unless the human sets it, and only the human tags a slice for review. Keep designing until the requirements compose into a coherent feature and the human approves the design, including feature acceptance. Trivial work retains the compressed one-turn path above, not another recurring approval stop.

   **Python prerequisite:** structural validation requires Python 3.9+ where commands execute, using only its standard library (no pip or project Node configuration). Confirm a compatible `python3` exists before invoking the helper. If Python is missing, unavailable, or too old, report the blocker and request a suitable runtime; stop at this gate. Do not auto-install Python, use a fallback implementation, or claim validation succeeded.

   Resolve the helper from this installed skill's directory; pass explicit paths and quote paths with spaces. Relative input paths resolve from the caller's working directory, not the skill directory:

   ```sh
   python3 "<brainstorming-skill-dir>/scripts/validate-design.py" "<design-path>"
   ```

   Nonzero means validation did not succeed: report file-specific diagnostics, correct structural errors, and rerun. A missing local reference or helper is a blocker before its dependent action; do not silently skip it. Success verifies structure only, never semantic correctness, sound slicing, confirmed assumptions, or human approval.

The session stays read-only and uncommitted through brainstorm: branch creation and the design-doc commit happen at the start of `pwk-executing-tasks` (its pre-flight creates the feature branch).

## Principles

- Detail-gathering asks in frontier rounds; approvals ask one decision at a time
- No silent assumptions — ask, gate, or look it up
- YAGNI — remove unnecessary features
- Design for testability
- Explore alternatives before settling

## After the design

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"

## Contract index

The detailed design contract is in `references/design-format.md`; this compact index keeps
the pipeline markers visible to tools that inspect only the entrypoint:
`## At a glance` → **Key decisions** → `| R# | Requirement in one line | Risk |`;
`### R<n>: <name>` blocks contain Given/When/Then criteria, no test-name lists, and both
tags. The feature section ends with `### Feature review: auto | parallel | inline`.
Production-risk display is `⚠ production-risk` if and only if notes exist; alternatives
are never manufactured. The umbrella roster uses `## Parts (build order)` and
`N. <leaf> — <one-line scope>`.
The design format carries `Given/When/Then criteria`, `no test-name lists`, and tags;
the full contract also states `written \`### Review\` value stays \`skip\`` and records
architectural deviations `at deviation time`.

```markdown
## Feature acceptance
- Given <starting state>, When <trigger>, Then <outcome>.
### Feature review: auto | parallel | inline
```
