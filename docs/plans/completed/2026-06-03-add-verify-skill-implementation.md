# Implementation Plan: Add Verify Skill

Design: `docs/plans/2026-06-03-add-verify-skill-design.md`

## Overview

Add a `verify` skill to pi-workflow-kit — a post-implementation code verification phase that runs three expert review passes (security, optimization, traceability) over implemented code. Also update the README to reflect the expanded workflow pipeline.

Full SKILL.md content is in `docs/plans/2026-06-03-verify-skill-design.md` (lines 7-176, inside the code fence).

## Task 1: Create the verify skill

<!-- tdd: trivial -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: No `skills/verify/` directory exists
  - When: `skills/verify/SKILL.md` is created
  - Then: The file contains valid YAML frontmatter with `name: verify` and a description mentioning security, optimization, and traceability. The file body contains all three review pass sections, the report format template, and the principles section.
- **Edge Case (skill already exists)**:
  - Given: `skills/verify/SKILL.md` already exists
  - When: Task runs
  - Then: The existing file is overwritten with the new content

Files:
- `skills/verify/SKILL.md`

Steps:
1. Create the directory `skills/verify/`
2. Create `skills/verify/SKILL.md` with the full content from the design draft. The content is the markdown inside the code fence in `docs/plans/2026-06-03-verify-skill-design.md` (lines 8-176). Copy it exactly — it includes:
   - YAML frontmatter with name and description
   - # Verify heading and intro paragraph
   - ## Process section (5 steps)
   - ## Pass 1 — Security Review 🔴 (framing, what to look for, severity table)
   - ## Pass 2 — Optimization Review 🟡 (framing, what to look for, priority table)
   - ## Pass 3 — Traceability Review 🔵 (framing, what to look for 4 sub-items, severity table)
   - ## Report Format section (full template with summary table, findings sections, remediation task list)
   - ## Principles section (5 bullets)

## Task 2: Update README with verify skill

<!-- tdd: trivial -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: README.md has the current workflow (brainstorm → design-review → plan → execute → finalize)
  - When: README is updated
  - Then: All five sections are updated — tagline, workflow diagram, skill table, phase control, quick start, and project structure — to include `verify` between execute and finalize.
- **Edge Case (verify already in README)**:
  - Given: README already contains verify references
  - When: Task runs
  - Then: No duplicate entries are introduced

Files:
- `README.md`

Steps:

1. Update the tagline (line 3) — change `brainstorm→plan→execute→finalize` to `brainstorm→plan→execute→verify→finalize`:
   ```
   > Stop AI agents from rushing to code. Enforce a structured brainstorm→plan→execute→verify→finalize workflow with TDD discipline.
   ```

2. Update the "🧠 6 Workflow Skills" heading (line 36) to "🧠 7 Workflow Skills"

3. Update the workflow diagram (lines 40-44) to:
   ```
   brainstorm → design-review → plan → execute → verify → finalize
                                            ↕
                                         diagnose (anytime)
   ```

4. Add verify to the skill table (after the Execute row, before Finalize):
   ```
   | **Verify** | `/skill:verify` | Three expert review passes (security, optimization, traceability) on implemented code |
   ```

5. Update the phase control section (lines 61-67) to add verify:
   ```
   /skill:brainstorming   →  discuss and design
   /skill:design-review   →  audit for production risks (non-trivial designs)
   /skill:writing-plans   →  break into tasks
   /skill:executing-tasks →  implement with TDD
   /skill:verify          →  review code for security, optimization, and traceability issues
   /skill:finalizing      →  ship it
   ```

6. Update the quick start section (lines 110-135) to add verify between executing-tasks and finalizing:
   ```
   > /skill:executing-tasks

   # (agent implements with TDD, cognitive persona shifts, all tools unlocked)
   > /skill:verify

   # (agent runs security, optimization, and traceability reviews on implemented code)
   > /skill:finalizing

   # (agent archives docs, curates lessons, creates PR)
   ```

7. Update the project structure (lines 146-161) to add verify:
   ```
   ├── skills/
   │   ├── brainstorming/SKILL.md
   │   ├── design-review/SKILL.md
   │   ├── writing-plans/SKILL.md
   │   ├── executing-tasks/SKILL.md
   │   ├── verify/SKILL.md
   │   ├── finalizing/SKILL.md
   │   └── diagnose/SKILL.md
   ```
