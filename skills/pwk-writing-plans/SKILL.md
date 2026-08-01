---
name: pwk-writing-plans
description: "Turn a design doc's requirements into a behavioral spec — acceptance criteria + integration tests per requirement. Use after pwk-brainstorming, before pwk-executing-tasks. Use when the user says 'let's plan', 'write a plan', 'break this down', or after a brainstorm when ready to move to implementation."
---

# Writing Plans

Turn the design doc's requirements into a **behavioral spec** the executor implements against.

One design doc = one plan = one PR. The plan lists **all** the design's requirements in build order; the executor builds them one at a time.

Your writes go into `docs/plans/` and nowhere else. Source code and configuration get written later, in `pwk-executing-tasks` — this phase produces the document the executor builds from.

## Process

1. **Find the design doc** — glob `docs/plans/*-design.md`. If none, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. **Read `docs/lessons.md`** if it exists — known patterns belong in the acceptance criteria. **Umbrella part?** If `docs/plans/*-overview.md` exists and this design is one of its roster parts, read the overview for the umbrella goal + roster — plan this part as one slice, composing with what earlier parts already established in the code. Note the umbrella in the plan's Overview so the executor inherits the context.
2. **Create or reuse the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. Otherwise `git checkout -b <topic>` — the umbrella's `<topic>` if this is part of an overview, else the design doc's `<topic>` (branch creation is allowed in the plan phase). Design + plan docs live on this branch, committed at the start of `pwk-executing-tasks`.
3. **Read the `## Requirements` list** — the plan covers **all** of them. If the design has none, derive requirements from its described behaviors and confirm with the human before proceeding.
4. **Write the plan** — for each requirement:
   - **Acceptance criteria** — `Given/When/Then` behavioral statements defining "done". Write observable behaviors, not implementation steps; cover edge and error cases.
   - **Integration tests** — test name + what each asserts. This is the spec the executor writes tests from.
   - **`### Checkpoints: full | spec | none`** — how many human stops. `full` = tests + complete (default); `spec` = tests stop only (clear spec, low implementation risk — the complete checkpoint is dropped); `none` = trivial only (config line, typo).
   - **`### Review: parallel | inline | skip`** — `parallel` = four reviewers via subagent (default, non-trivial diffs); `inline` = one `pwk-code-review` pass (small/medium diffs); `skip` = trivial diffs with no behavioral surface.
   - Tag every requirement — missing tags default to `full` / `parallel`. **`spec` requires at least `inline` review** — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
   - **Production-risk notes** — carry forward the design's `## Production-risk areas`, if any.
   - **Challenge the design first** *(if production-risk areas exist)* — stress-test the design against the flagged risks before writing criteria. If a risk invalidates a design choice, stop and return to `/skill:pwk-brainstorming` rather than planning around a flawed design.
   - **Ordering** — dependencies come **earlier** in the list; the executor runs in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.

   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`:

   ```markdown
   # Implementation Plan: <topic>

   ## Overview
   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
   Umbrella: docs/plans/YYYY-MM-DD-<umbrella>-overview.md   *(umbrella part only — else omit)*

   ## Requirement 1: <name>

   ### Acceptance criteria
   - Given … When … Then …
   - Given … When … Then … (edge cases)

   ### Integration tests
   - `should <behavior>` — asserts <observable outcome>
   - `should <error case>` — asserts <failure outcome>

   ### Checkpoints: full | spec | none
   ### Review: parallel | inline | skip

   ### Production-risk notes
   - <from the design's Production-risk areas, if any>

   ## Requirement 2: <name>
   …

   ## Feature acceptance
   Derived from the design doc. One end-to-end test exercising the requirements *together*:
   - `should <the PRD's end-to-end claim>` — Given <starting state>, When <trigger>, Then <composed outcome across requirements>.
   ```

   **If the design has no `## Feature acceptance` section**, stop and ask the human to run `/skill:pwk-brainstorming` to add one — the feature's definition-of-done is missing. (A trivial single-requirement design may fold the scenario into that requirement's criteria; note it and skip the separate section.)

   **If `## Production-risk areas` flagged** schema migrations, new dependencies, external APIs, or seed data, emit a `## Setup` section between `## Overview` and `## Requirement 1` (dependencies, migrations, seed data, and how to verify setup worked).

5. **Audit before presenting:**
   - Every requirement has criteria **and** matching tests, a checkpoint tag, a review tag.
   - No `spec` + `skip` combination.
   - A `## Feature acceptance` section exists (or the trivial-fold note).
   - Production-risk areas from the design are reflected.
6. **Workspace isolation** — you're on the `<topic>` branch. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
7. **Present the plan** and wait for approval. On approval, hand off: "Ready to execute? Run `/skill:pwk-executing-tasks`" (running it is what exits the gated plan phase).

## What belongs in the plan — and what stays out

The plan carries: observable behavior (acceptance criteria), the test names + assertions that prove it, and per-requirement tags. Everything about implementation *how* — code, signatures, file-by-file breakdowns, micro-task decomposition — stays with the executor, which picks structure against the spec. That's the division that keeps the plan stable when a detail shifts mid-implementation.

## After the plan

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"