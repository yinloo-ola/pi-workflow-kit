# Implementation Plan: Verification findings fix

## Overview

Fix 6 findings from `docs/plans/2026-06-09-incremental-workflow-and-rename-verification-report.md`.

All findings are small effort — documentation/comment fixes and minor instruction reordering.

## Task 1: Fix stale comments in workflow-guard.ts

<!-- tdd: trivial -->

Fix O-001 and O-002.

Files:
- `extensions/workflow-guard.ts`

Steps:
1. Change `shouldBlockFilePath` JSDoc: "during brainstorm and plan phases" → "during brainstorm, plan, and verify phases"
2. Change `DESTRUCTIVE_PATTERNS` comment: "blocked in brainstorm/plan phases" → "blocked in brainstorm/plan/verify phases"

## Task 2: Fix backtick formatting in executing-tasks

<!-- tdd: trivial -->

Fix O-003.

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. In per-task step 2, change `**Read \`docs/lessons.md` if it exists**` to `**Read \`docs/lessons.md\` if it exists**` (add closing backtick)

## Task 3: Reorder writing-plans hazard check after feature identification

<!-- tdd: trivial -->

Fix T-001. The hazard checklist currently runs before reading the Features table. Move the Features table reading to before the hazard check so the prompt can say "This feature involves..." accurately.

Files:
- `skills/pwk-writing-plans/SKILL.md`

Steps:
1. Move the Features table paragraph (currently at the end of step 1) to just after the design doc reading, before the hazard checklist
2. Verify the flow is now: read design doc → find next `⬜ pending` feature → mark `🔄 planned` → evaluate hazards for that feature

## Task 4: Narrow executing-tasks Features table read

<!-- tdd: trivial -->

Fix T-002.

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. In per-task step 2, change "Read the design doc's Features table for context on the overall feature set" to "Check the current feature's status in the design doc's Features table"

## Task 5: Add plan doc guard to design-review trivial case

<!-- tdd: trivial -->

Fix T-003.

Files:
- `skills/pwk-design-review/SKILL.md`

Steps:
1. In step 2, add a guard before the triviality check: "If no plan doc was found in step 1, skip this check and say: 'No plan doc found to append to. Run `/skill:pwk-writing-plans` first.' and stop."
