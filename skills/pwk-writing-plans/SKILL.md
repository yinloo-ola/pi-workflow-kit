---
name: pwk-writing-plans
description: "Turn a design doc's requirements into a behavioral spec — acceptance criteria + integration tests per requirement. Use after pwk-brainstorming, before pwk-executing-tasks. Use when the user says 'let's plan', 'write a plan', 'break this down', or after a brainstorm when ready to move to implementation."
---

# Writing Plans

Turn the design doc's requirements into a **behavioral spec** the executor implements against.

One design doc = one plan = one PR. The plan lists **all** the design's requirements; the executor builds them one at a time, in the order you list them (see **Ordering** below).

You may only create or edit files under `docs/plans/`. Do not modify source code or configuration.

## Process

1. **Find the design doc** — look for `docs/plans/*-design.md`. (For a full multi-topic overview when several are in flight, use `/skill:pwk-status`.) If none, ask the user to run `/skill:pwk-brainstorming` first. If several exist (a large issue was split), list them and ask which to plan. **Read `docs/lessons.md`** if it exists — incorporate known patterns into the acceptance criteria and tests.
2. **Create the feature branch first** — `git checkout -b <topic>` (branch creation is allowed in the plan phase). The design + plan docs are written on this branch (committed at the start of `pwk-executing-tasks`), not `main`.
3. **Read the Requirements** — the design doc opens with a `## Requirements` list; each requirement is one testable behavior the user will get. This plan covers **all** requirements in the design doc (one pipeline per design doc). If the design has no Requirements list, derive the requirements from its described behaviors and confirm them with the human before proceeding.

4. **Write the plan — acceptance criteria + integration tests per requirement.** For each requirement specify:
   - **Acceptance criteria** — `Given/When/Then` behavioral statements that define "done" for that requirement.
   - **Integration tests** — the concrete test cases that encode the acceptance criteria: a test name and what each asserts. This is the spec the executor writes and implements against.
   - **Challenge the design first** *(if `## Production-risk areas` exists)* — before writing acceptance criteria, stress-test the design against the flagged risks: ask the uncomfortable "what breaks under load / on failure / on bad input" questions and confirm the approach holds. If a risk invalidates a design choice, stop and return to `/skill:pwk-brainstorming` rather than planning around a flawed design.
   - **Ordering** — list requirements in the order they should be built. If a requirement depends on another, the dependency must come **earlier in the list**; the executor runs requirements in listed order and does not reorder. Aim for each requirement to be a vertical slice that merges cleanly on its own — if a dependency can't be sliced away, position resolves it (there is no parsed dependency graph).
   - **Production-risk notes** *(if the design flagged any in `## Production-risk areas`)* — carried forward so the executor and `pwk-code-review` account for them.

   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`:

   ```markdown
   # Implementation Plan: <topic>

   ## Overview
   Design: docs/plans/YYYY-MM-DD-<topic>-design.md

   ## Requirement 1: <name>

   ### Acceptance criteria
   - Given … When … Then …
   - Given … When … Then … (edge cases)

   ### Integration tests
   - `should <behavior>` — asserts <observable outcome>
   - `should <error case>` — asserts <failure outcome>

   ### Production-risk notes
   - <from the design's Production-risk areas, if any>

   ## Requirement 2: <name>
   …
   ```

   **If the design has `## Production-risk areas`** that flag schema migrations, new dependencies, external API integrations, or seed data, emit a `## Setup` section between `## Overview` and `## Requirement 1`:

   ```markdown
   ## Setup

   - **Dependencies:** what to install (and how)
   - **Migrations:** each migration with a brief description
   - **Seed / test data:** what data to prepare
   - **Verify:** how to confirm setup worked (e.g. `npm test` still passes)
   ```

5. **Before presenting — audit the spec:**
   - Every requirement has acceptance criteria **and** matching integration tests.
   - Acceptance criteria are observable behaviors, not implementation steps.
   - Edge/error cases are covered.
   - Production-risk areas from the design are reflected.
   Fix gaps before presenting.

6. **Set up workspace isolation** *(before approving)* — you're already on the `<topic>` feature branch (step 2); the design + plan docs live here, not on `main` (committed at the start of `pwk-executing-tasks`). For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
7. **Present the plan** — show the complete plan and wait for approval. On approval, hand off to `/skill:pwk-executing-tasks` — running it is what transitions out of the gated plan phase (the guard unlocks on the skill, not on the word "approve").

## What the plan is NOT

- **Not an implementation recipe** — no exact code, no file-by-file breakdowns, no signatures, no stubs. (A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes.)
- **Not micro-tasks** — one coarse block per requirement. The executor decides how to structure and slice the implementation.
- **Not the tests themselves** — the plan specifies *what* the tests prove (names + assertions); `pwk-executing-tasks` writes the actual test files first (red), then implements to green.

The executor has **full autonomy** to choose structure, signatures, and internals — bounded only by the acceptance criteria and the two mandatory checkpoints per requirement (after integration tests are written, and after the requirement is complete), enforced by `pwk-executing-tasks`.

## After the plan

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"