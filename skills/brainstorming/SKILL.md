---
name: brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Check git state** — run `git status` and `git log --oneline -5`. If there's uncommitted work, ask the user what to do with it first.
2. **Understand the idea** — read existing code, docs, and recent commits. Grep for related functionality, check package.json/dependencies and module structure. **Check `docs/lessons.md`** if it exists — known constraints and patterns may affect the design. Read only what's necessary to ground the design — don't read the entire codebase. Ask questions to refine the idea. Prefer multiple choice when possible. After each question, check: can you clearly articulate (a) what the user wants to build, (b) why, and (c) key constraints? If yes, present your understanding as a short summary and ask: "Should I proceed with this, or is there more to add?" The human decides when to move on.
3. **Explore approaches** — propose 2-3 approaches. For each approach, sketch the concrete interface (types, method signatures, example caller code) so the comparison is grounded in actual code, not abstract descriptions. Lead with your recommendation.
4. **Present the design** — break it into focused sections. Each section should be one screen of reading. Present each section to the human and wait for approval before continuing. Cover: architecture, components, data flow, error handling, testing. On feedback, incorporate it and re-present the revised section.

   When a significant architectural decision is identified, offer to write a lightweight ADR to `docs/plans/adr/`. Only write an ADR when all three are true:

   1. **Hard to reverse** — changing your mind later has meaningful cost
   2. **Surprising without context** — a future reader will wonder "why?"
   3. **A real trade-off** — there were genuine alternatives

   ADR format — a title and 1-3 sentences covering context, decision, and why:

   ```markdown
   # <Short title of the decision>

   <1-3 sentences: context, decision, and why.>
   ```

   ADRs live under `docs/plans/adr/` and are archived during finalizing alongside the design doc.

   For non-trivial designs, note any areas that may need production-risk review (database schema changes, authentication or authorization, external API integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues). You don't need to audit them here — just flag them for the design-review stage.

   For trivial changes (config, naming, simple field additions), note "Simple change — no design review needed" in the design doc.
5. **Write the design doc** — save it to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Organize features as end-to-end slices (each slice delivers one observable behavior through all relevant layers) so the planning phase can decompose them directly into tasks. Branch creation, committing, and workspace setup are handled by `/skill:executing-tasks`.

## Principles

- One question at a time
- YAGNI — remove unnecessary features
- Design for testability
- Always explore alternatives before settling

## After the design

- **Non-trivial design**: Ask: "Design looks good. Run `/skill:design-review` to check for production risks before planning."
- **Trivial change**: Ask: "Simple change — skip design review. Ready to plan? Run `/skill:writing-plans`"
