---
name: brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design before implementation."
---

# Brainstorming

Read-only exploration. You may **not** edit or create any files except under `docs/plans/`.

## Process

1. **Check git state** — run `git status` and `git log --oneline -5`. If there's uncommitted work, ask the user what to do with it first.
2. **Understand the idea** — read existing code, docs, and recent commits. Ask questions one at a time to refine the idea. Prefer multiple choice when possible.
3. **Explore approaches** — propose 2-3 approaches with trade-offs. Lead with your recommendation.
4. **Present the design** — break it into sections of 200-300 words. Check after each section whether it looks right. Cover: architecture, components, data flow, error handling, testing.
5. **Write the design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit.

## Principles

- One question at a time
- YAGNI — remove unnecessary features
- Design for testability
- Always explore alternatives before settling

## After the design

Ask: "Ready to plan? Run `/skill:writing-plans`"
