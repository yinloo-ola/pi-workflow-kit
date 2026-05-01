---
name: brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation."
---

# Brainstorming

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Check git state** — run `git status` and `git log --oneline -5`. If there's uncommitted work, ask the user what to do with it first.
2. **Understand the idea** — read existing code, docs, and recent commits. Ask questions one at a time to refine the idea. Prefer multiple choice when possible.
3. **Explore approaches** — propose 2-3 approaches. For each approach, sketch the concrete interface (types, method signatures, example caller code) so the comparison is grounded in actual code, not abstract descriptions. Lead with your recommendation.
4. **Present the design** — break it into sections of 200-300 words. Check after each section whether it looks right. Cover: architecture, components, data flow, error handling, testing.

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
5. **Write the design doc** — save it to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Ask the user to commit it. Branch creation and worktree setup should be deferred to the execution phase (`/skill:executing-tasks`).

## Principles

- One question at a time
- YAGNI — remove unnecessary features
- Design for testability
- Always explore alternatives before settling

## After the design

Ask: "Ready to plan? Run `/skill:writing-plans`"
