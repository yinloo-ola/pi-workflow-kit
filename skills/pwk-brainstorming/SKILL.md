---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Proportionality: trivial vs non-trivial

Classify the change at the very start. The right amount of brainstorm depends on the size of the change.

- **Trivial** — a typo or obvious bugfix with no open design questions, a config/version bump, a single-function change with no architectural impact, or anything the human flags as trivial. For trivial changes:
  - Skip steps 3–5 (the multi-turn approach exploration and sectioned design presentation).
  - Write a **minimal** design doc in one turn: a one-line context sentence, a `## Requirements` list with the single requirement, and (if applicable) a `## Production-risk areas` line. No approaches section, no sectioned review.
  - Tell the human the plan can be a single inline requirement, and hand off to `/skill:pwk-writing-plans`.
  - The guard still enforces read-only — trivial does **not** skip the phase; it compresses it to one turn.
- **Non-trivial** — anything with open design questions, multiple viable approaches, cross-module impact, or new behavior. Run the full Process below.

When unsure, ask the human: "This looks like a trivial fix — want me to fast-path it, or do a full brainstorm?" Default to full if they don't say.

## Granularity

**A design doc is one pull request; a requirement is one testable slice within it.** Two decomposition levels answer two different questions:

- **How many PRs?** — split a large issue into **multiple design docs** only when each part could ship as its own PR (independently reviewable and mergeable). Each design doc runs its own plan → execute → finalize pipeline → its own PR. Example: "add OAuth" and "add dark mode" are unrelated → two design docs.
- **How to build one PR incrementally?** — within a design doc, decompose the work into **requirements**, each "one testable behavior." The plan covers all of them; the executor builds them one at a time. Example: "add OAuth" = R1 redirect flow, R2 token refresh, R3 error states → one design doc, three requirements, one PR.

Requirements are the leaf unit — never split further. Decision rule: **could this part be reviewed and merged on its own?** Yes → separate design doc. No → one design doc, multiple requirements. Most work is a single design doc; splitting is opt-in.

## Process

1. **Check git state** — run `git status` and `git log --oneline -5`. If there's uncommitted work, ask the user what to do with it first.
2. **Discovery** *(skip if this is a brand-new repo with no `docs/plans/`)* — glob `docs/plans/*-design.md`. Report active topics found (e.g. `In-flight: auth (plan), billing (brainstorm)`). Multiple designs may run in parallel. If the new idea continues an existing topic, ask the human whether to extend it or start fresh before designing.
3. **Understand the idea** — read existing code, docs, and recent commits. Grep for related functionality, check package.json/dependencies and module structure. **Check `docs/lessons.md`** if it exists — known constraints and patterns may affect the design. Read only what's necessary to ground the design — don't read the entire codebase. Ask questions to refine the idea. Prefer multiple choice when possible. After each question, check: can you clearly articulate (a) what the user wants to build, (b) why, and (c) key constraints? If yes, present your understanding as a short summary and ask: "Should I proceed with this, or is there more to add?" The human decides when to move on.
4. **Explore approaches** — propose 2-3 approaches. For each approach, sketch the concrete interface (types, method signatures, example caller code) so the comparison is grounded in actual code, not abstract descriptions. Lead with your recommendation.
5. **Present the design** — break it into focused sections. Each section should be one screen of reading. Present each section to the human and wait for approval before continuing. Cover: architecture, components, data flow, error handling, testing. On feedback, incorporate it and re-present the revised section.

   When a significant architectural decision is identified, offer to write a lightweight ADR to `docs/adr/`. Only write an ADR when all three are true:

   1. **Hard to reverse** — changing your mind later has meaningful cost
   2. **Surprising without context** — a future reader will wonder "why?"
   3. **A real trade-off** — there were genuine alternatives

   ADR format — a title and 1-3 sentences covering context, decision, and why:

   ```markdown
   # <Short title of the decision>

   <1-3 sentences: context, decision, and why.>
   ```

   ADRs live under `docs/adr/` permanently — they are institutional memory, never archived.

6. **Write the design doc** — save it to `docs/plans/YYYY-MM-DD-<topic>-design.md` as a descriptive document (not a task list). **Open with a `## Requirements` list** — each requirement one testable behavior the user will get (`pwk-writing-plans` derives acceptance criteria + integration tests per requirement). Then cover: problem, approaches considered, architecture, components, data flow, error handling, and testing.

   If the design touches any production-risk area — database schema changes or migrations, authentication or authorization, external API or service integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues — add a short `## Production-risk areas` section noting them. `pwk-writing-plans` carries these notes into the plan, and `pwk-code-review` audits them after each requirement.

   **Splitting large issues:** if the work is large enough to be multiple PRs, propose splitting it into multiple design docs (one per sub-issue, each with its own `<topic>`) and get the human's approval first — see [Granularity](#granularity) for the decision rule. Each design doc then runs its own pipeline.

   Branch creation and workspace setup happen at the end of `/skill:pwk-writing-plans` (after the plan is approved); the design + plan docs are committed at the start of `pwk-executing-tasks`. Until then the session is read-only and uncommitted.

## Principles

- One question at a time
- YAGNI — remove unnecessary features
- Design for testability
- Always explore alternatives before settling

## After the design

Ask: "Ready to plan? Run `/skill:pwk-writing-plans`"
