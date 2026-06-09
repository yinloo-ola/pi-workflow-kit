# Implementation Plan: Code review findings fix

## Overview

Fix 5 findings from the cross-skill code review. All are small — documentation clarity and minor correctness guards.

## Task 1: Add explicit fallback documentation in executing-tasks "Find the plan"

<!-- tdd: trivial -->

Fix finding #1. The primary path expects a design doc with Features table, but the fallback for plans without one is implicit.

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. In step 2 ("Find the plan"), after the fallback sentence, append: "This covers plans created without a brainstorm session (no design doc or Features table)."

## Task 2: Add metadata-missing guard in executing-tasks per-task step 2

<!-- tdd: trivial -->

Fix finding #2. When a plan has no `Design:` / `Feature:` metadata (no Features table), the "Extract metadata" instruction is dangling.

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. In per-task step 2, after "Extract the `Design:` and `Feature:` metadata to know which design doc and feature row this execution covers.", add: "If no `Design:` or `Feature:` metadata is present, the plan covers the entire design (no feature table). Skip design doc reading and proceed directly to task execution."

## Task 3: Document worktree handoff behavior for multi-feature plans

<!-- tdd: trivial -->

Fix finding #3. The worktree glob moves all plan docs, which is correct but should be documented explicitly.

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. In step 3b ("Move plan docs into the worktree"), add a note before the mv commands:
   > When using the feature table, all plan docs for this design move together — completed feature plans, the current feature's plan, and the design doc. This is intentional: the worktree works on one design at a time.

## Task 4: Add unstarted-features guard to finalizing

<!-- tdd: trivial -->

Fix finding #4. Archiving the design doc while features are still `⬜ pending` makes them invisible to future planning.

Files:
- `skills/pwk-finalizing/SKILL.md`

Steps:
1. In step 1 ("Move planning docs"), before the archive commands, add a check:
   > If the design doc has a `## Features` table with any `⬜ pending` or `🔄 planned` features, warn:
   > ```
   > ⚠️ Design doc has N unplanned features. Archive anyway, or go back to plan them?
   > ```
   > Wait for the user to confirm before proceeding.

## Task 5: Add verification report to finalizing archive step

<!-- tdd: trivial -->

Fix finding #5. Verification reports are left behind in `docs/plans/` after finalizing.

Files:
- `skills/pwk-finalizing/SKILL.md`

Steps:
1. In step 1, after the existing `mv` commands, add:
   ```
   mv docs/plans/*-verification-report.md docs/plans/completed/ 2>/dev/null || true
   ```
