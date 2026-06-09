# Implementation Plan: Incremental Workflow & Skill Rename

## Overview

Rename all 7 skills with `pwk-` prefix, update cross-references, add feature-table support to brainstorming, convert writing-plans and executing-tasks to feature-at-a-time loop, move design-review trigger to after writing-plans, add per-feature verify support, update workflow-guard extension.

One feature, 9 tasks.

## Task 1: Rename skill directories

<!-- tdd: trivial -->

Move all 7 skill directories to `pwk-` prefixed names.

Files:
- `skills/brainstorming/SKILL.md` → `skills/pwk-brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md` → `skills/pwk-writing-plans/SKILL.md`
- `skills/executing-tasks/SKILL.md` → `skills/pwk-executing-tasks/SKILL.md`
- `skills/design-review/SKILL.md` → `skills/pwk-design-review/SKILL.md`
- `skills/verify/SKILL.md` → `skills/pwk-verify/SKILL.md`
- `skills/finalizing/SKILL.md` → `skills/pwk-finalizing/SKILL.md`
- `skills/diagnose/SKILL.md` → `skills/pwk-diagnose/SKILL.md`

Steps:
1. Run these commands:
```
cd skills
mv brainstorming pwk-brainstorming
mv writing-plans pwk-writing-plans
mv executing-tasks pwk-executing-tasks
mv design-review pwk-design-review
mv verify pwk-verify
mv finalizing pwk-finalizing
mv diagnose pwk-diagnose
ls -1
```

Expected output:
```
pwk-brainstorming
pwk-design-review
pwk-diagnose
pwk-executing-tasks
pwk-finalizing
pwk-verify
pwk-writing-plans
```

2. Lessons — none.

## Task 2: Update frontmatter names in all skills

<!-- tdd: trivial -->

Update the YAML frontmatter `name:` field in each renamed skill file.

Files:
- `skills/pwk-brainstorming/SKILL.md`
- `skills/pwk-writing-plans/SKILL.md`
- `skills/pwk-executing-tasks/SKILL.md`
- `skills/pwk-design-review/SKILL.md`
- `skills/pwk-verify/SKILL.md`
- `skills/pwk-finalizing/SKILL.md`
- `skills/pwk-diagnose/SKILL.md`

Steps:
1. In each file, update the frontmatter `name:` to the `pwk-` prefixed version. For example, `pwk-brainstorming/SKILL.md`:

Before:
```yaml
---
name: brainstorming
description: "Use this before any creative work..."
---
```

After:
```yaml
---
name: pwk-brainstorming
description: "Use this before any creative work..."
---
```

Apply the same pattern to all 7 files — only the `name:` field changes, `description:` stays the same.

2. Verify with:
```
grep -r '^name:' skills/pwk-*/SKILL.md
```

Expected output:
```
skills/pwk-brainstorming/SKILL.md:name: pwk-brainstorming
skills/pwk-design-review/SKILL.md:name: pwk-design-review
skills/pwk-diagnose/SKILL.md:name: pwk-diagnose
skills/pwk-executing-tasks/SKILL.md:name: pwk-executing-tasks
skills/pwk-finalizing/SKILL.md:name: pwk-finalizing
skills/pwk-verify/SKILL.md:name: pwk-verify
skills/pwk-writing-plans/SKILL.md:name: pwk-writing-plans
```

3. Lessons — none.

## Task 3: Update cross-references in all skills

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Update all `/skill:` references in all 7 skill files to use `pwk-` prefixed names.

Cross-reference map:
- `/skill:brainstorming` → `/skill:pwk-brainstorming`
- `/skill:writing-plans` → `/skill:pwk-writing-plans`
- `/skill:executing-tasks` → `/skill:pwk-executing-tasks`
- `/skill:finalizing` → `/skill:pwk-finalizing`
- `/skill:design-review` → `/skill:pwk-design-review`
- `/skill:verify` → `/skill:pwk-verify`
- `/skill:diagnose` → `/skill:pwk-diagnose`

Files:
- `skills/pwk-brainstorming/SKILL.md` — 3 references
- `skills/pwk-design-review/SKILL.md` — 3 references
- `skills/pwk-verify/SKILL.md` — 2 references
- `skills/pwk-writing-plans/SKILL.md` — 2 references
- `skills/pwk-executing-tasks/SKILL.md` — 8 references
- `skills/pwk-finalizing/SKILL.md` — 0 references (verify after update)
- `skills/pwk-diagnose/SKILL.md` — 0 references (verify after update)

Steps:
1. In `skills/pwk-brainstorming/SKILL.md`, update:
   - `handled by /skill:executing-tasks` → `handled by /skill:pwk-executing-tasks`
   - `Run /skill:design-review` → `Run /skill:pwk-design-review`
   - `Run /skill:writing-plans` → `Run /skill:pwk-writing-plans`

2. In `skills/pwk-design-review/SKILL.md`, update:
   - `Run /skill:brainstorming first` → `Run /skill:pwk-brainstorming first`
   - Two instances of `Run /skill:writing-plans` → `Run /skill:pwk-writing-plans`

3. In `skills/pwk-verify/SKILL.md`, update:
   - `Run /skill:executing-tasks first` → `Run /skill:pwk-executing-tasks first`
   - `Run /skill:writing-plans` → `Run /skill:pwk-writing-plans`

4. In `skills/pwk-writing-plans/SKILL.md`, update:
   - `Run /skill:design-review first` → `Run /skill:pwk-design-review first`
   - `Run /skill:executing-tasks` → `Run /skill:pwk-executing-tasks`

5. In `skills/pwk-executing-tasks/SKILL.md`, update all 8 references:
   - `Run /skill:writing-plans first` → `Run /skill:pwk-writing-plans first`
   - `/skill:executing-tasks` (handoff text) → `/skill:pwk-executing-tasks`
   - `/skill:finalizing` → `/skill:pwk-finalizing`
   - Two instances of `/skill:executing-tasks` (session break, stop commands) → `/skill:pwk-executing-tasks`
   - All remaining `/skill:executing-tasks` references → `/skill:pwk-executing-tasks`

6. Verify no old references remain:
```
grep -rn '/skill:brainstorming\|/skill:writing-plans\|/skill:executing-tasks\|/skill:finalizing\|/skill:design-review\|/skill:verify\|/skill:diagnose' skills/pwk-*/SKILL.md | grep -v 'pwk-'
```

Expected output: empty (no matches).

7. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.

## Task 4: Add feature table to brainstorming and update after-design section

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Update `skills/pwk-brainstorming/SKILL.md` to:
1. Update the production-risk flagging prose in step 4 (review now runs after planning, not as a separate stage)
2. Add a `## Features` table to the design doc (step 5)
3. Replace the "After the design" section to remove design-review suggestion, since review now runs after writing-plans

Files:
- `skills/pwk-brainstorming/SKILL.md`

Steps:
1. In step 4 ("Present the design"), update the prose that flags production-risk review. Replace:

```
   For non-trivial designs, note any areas that may need production-risk review (database schema changes, authentication or authorization, external API integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues). You don't need to audit them here — just flag them for the design-review stage.
```

With:

```
   For non-trivial designs, note any areas that may need production-risk review (database schema changes, authentication or authorization, external API integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues). You don't need to audit them here — just flag them. Writing-plans will check for these when planning each feature and suggest `/skill:pwk-design-review` if needed.
```

2. In step 5 ("Write the design doc"), add the Features table requirement. Replace the existing step 5 text:

Before:
```
5. **Write the design doc** — save it to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Organize features as end-to-end slices (each slice delivers one observable behavior through all relevant layers) so the planning phase can decompose them directly into tasks. Branch creation, committing, and workspace setup are handled by `/skill:pwk-executing-tasks`.
```

After:
```
5. **Write the design doc** — save it to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Include a `## Features` table listing each feature as a testable, observable behavior. Simple features get one row. Complex features get many.

   Table format:
   ```markdown
   ## Features

   | # | Feature | Status | Observable Behavior |
   |---|---------|--------|---------------------|
   | 1 | Feature name | ⬜ pending | What the user can do when this is complete |
   ```

   Status values: `⬜ pending`, `🔄 planned`, `✅ done`, `⏭ skipped`.

   For trivial changes where the entire feature is a single row, note "Simple change — no design review needed" below the table. For non-trivial designs, note areas that may need production-risk review (database schema changes, authentication or authorization, external API integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues).

   Branch creation, committing, and workspace setup are handled by `/skill:pwk-executing-tasks`.
```

3. Replace the "After the design" section:

Before:
```
## After the design

- **Non-trivial design**: Ask: "Design looks good. Run `/skill:pwk-design-review` to check for production risks before planning."
- **Trivial change**: Ask: "Simple change — skip design review. Ready to plan? Run `/skill:pwk-writing-plans`"
```

After:
```
## After the design

Ask: "Ready to plan? Run `/skill:pwk-writing-plans`"

> Design review runs after planning, not here. The plan doc has concrete code that makes hazard checks meaningful. Writing-plans will flag high-risk features and suggest `/skill:pwk-design-review` when needed.
```

4. Verify the skill file reads correctly:
```
cat skills/pwk-brainstorming/SKILL.md | grep -A2 '## Features'
```

Expected output contains the table format.

5. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.

## Task 5: Update writing-plans for feature-at-a-time

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Update `skills/pwk-writing-plans/SKILL.md` to operate on one feature at a time from the design doc's Features table. Add plan doc metadata so the executor can find the design doc and feature row.

Files:
- `skills/pwk-writing-plans/SKILL.md`

Steps:
1. Update step 1 to read the Features table from the design doc and identify the next `⬜ pending` feature. Also remove the "design doc already has Architectural Review" condition from the hazard check — review is now per-feature (per-plan doc), not per-design-doc.

Replace the first sentence of step 1:

Before:
```
1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan.
```

After:
```
1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. Read the `## Features` table to identify the next feature with status `⬜ pending`. Mark that feature as `🔄 planned` by editing the design doc. This plan will cover only that one feature.
```

Also update the hazard check text (currently step 1, after the features table change). Replace:
```
    If any apply AND the design doc does not already have an `## Architectural Review` section, prompt the user: "This design involves [list what you found] but hasn't been reviewed for production risks. Run `/skill:pwk-design-review` first, or type 'proceed' to skip."
```
With:
```
    If any apply, prompt the user: "This feature involves [list what you found] but hasn't been reviewed for production risks. Run `/skill:pwk-design-review` first, or type 'proceed' to skip."
```

Also update the Plan Acceptance Audit's Risk Enforcement item (step 3 of the plan). The review now appends to the plan doc, not the design doc. Replace:
```
    - **Risk Enforcement**: If the design doc's Architectural Review section flagged any hazards as `[TRIGGERED]`, verify the corresponding tasks have `checkpoint: done` and a `Hazard Mitigation Verification` section.
```
With:
```
    - **Risk Enforcement**: If this plan doc's Architectural Review section flagged any hazards as `[TRIGGERED]`, verify the corresponding tasks have `checkpoint: done` and a `Hazard Mitigation Verification` section.
```

2. Update step 2 to name the plan doc per-feature and add metadata header:

Before:
```
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`. If the design is too large for ~15 tasks, flag this to the human and ask whether to reduce scope or proceed with the full plan.
```

After:
```
2. **Write the implementation plan** — break the feature into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-<feature-name>-implementation.md` (derive `<feature-name>` from the feature's name in the table, slugified). Include metadata at the top of the plan doc so the executor can find the design doc and feature row:

   ```markdown
   # Implementation Plan: <feature name>

   ## Overview

   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
   Feature: <feature name> (row N in Features table)
   ```

   If the design is too large for ~15 tasks for a single feature, flag this to the human and ask whether to reduce scope or proceed with the full plan.
```

3. Update "After the plan" to reflect the feature loop:

Before:
```
## After the plan

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"
```

After:
```
## After the plan

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"

> After executing this feature, the executor will check for more `⬜ pending` features and suggest planning the next one.
```

4. Verify the changes read correctly:
```
grep -n 'feature\|Feature' skills/pwk-writing-plans/SKILL.md
```

Expected: multiple matches showing feature-at-a-time language.

5. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.

## Task 6: Update executing-tasks for feature loop and verify prompts

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Update `skills/pwk-executing-tasks/SKILL.md` to:
1. Resolve the plan doc from the design doc's Features table (not glob)
2. Read design doc metadata during plan setup
3. Mark features as `✅ done` in the design doc's Features table after completing all tasks
4. Show per-task summary then feature-level next steps

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Steps:
1. Update step 2 ("Find the plan") to resolve from design doc's Features table:

Before:
```
2. **Find the plan** — look for `docs/plans/*-implementation.md`. If none exist, say "No implementation plan found. Run `/skill:pwk-writing-plans` first." and stop. If multiple exist, ask the user which one to execute.
```

After:
```
2. **Find the plan** — look for `docs/plans/*-design.md` to get the Features table. Find the feature with status `🔄 planned`. The plan doc is `docs/plans/YYYY-MM-DD-<topic>-<slugified-feature-name>-implementation.md`. If no design doc exists, fall back to looking for a single `*-implementation.md` (backward compatibility with plans not using the feature table). If multiple plan docs exist and no design doc, ask the user which one to execute.
```

2. Update "Per-task execution" step 2 ("Read the plan") to extract design doc metadata:

Before:
```
2. **Read the plan** — read the plan's overview section (everything before `## Task 1:`). Skim all `## Task N:` headings for dependency awareness. Then read the current task's body in full. **Read `docs/lessons.md`** if it exists — follow all rules listed there while working on this task.
```

After:
```
2. **Read the plan** — read the plan's overview section (everything before `## Task 1:`). Extract the `Design:` and `Feature:` metadata to know which design doc and feature row this execution covers. Read the design doc's Features table for context on the overall feature set. Skim all `## Task N:` headings for dependency awareness. Then read the current task's body in full. **Read `docs/lessons.md`** if it exists — follow all rules listed there while working on this task.
```

3. In "Per-task execution", after step 7 ("Update progress"), add:

```
8. **Update design doc** — if the progress file shows all tasks for the current feature are `✅ done`, find the design doc (from plan metadata), and mark the current feature row as `✅ done` in the Features table.
```

4. Replace the "After all tasks" section:

Before:
```
## After all tasks

When no `⬜ pending` or `❌ failed` tasks remain, show a summary:

```
✅ All tasks complete!

| # | Status | Task |
|---|--------|------|
| 1 | ✅ done | Create User model |
| 2 | ✅ done | Write User model tests |
| 3 | ⏭ skipped | Add auth middleware |

Ready to ship? Run `/skill:pwk-finalizing`
```
```

After:
```
## After all tasks

When no `⬜ pending` or `❌ failed` tasks remain for the current feature, read the design doc's Features table. Show the per-task summary from the progress file, then check for more features:

### More features remaining

```
✅ Feature "<feature name>" complete.

| # | Status | Task |
|---|--------|------|
| 1 | ✅ done | Create User model |
| 2 | ✅ done | Add signup endpoint |

⏭  Next: "<next pending feature name>"
💡 Options:
   - Plan next feature: /skill:pwk-writing-plans
   - Verify this feature first: /skill:pwk-verify
   - Or just say "continue"
```

### All features complete

```
✅ All features complete!

| # | Status | Feature |
|---|--------|---------|
| 1 | ✅ done | User signup |
| 2 | ✅ done | Email verification |
| 3 | ⏭ skipped | Password reset |

| # | Status | Task |
|---|--------|------|
| 1 | ✅ done | Create User model |
| 2 | ✅ done | Add signup endpoint |
| ... | ... | ... |

   - Verify everything: /skill:pwk-verify
   - Ship: /skill:pwk-finalizing
```
```

5. Verify the changes:
```
grep -n 'Feature\|feature\|design doc' skills/pwk-executing-tasks/SKILL.md | head -15
```

Expected: matches showing feature table resolution, design doc metadata reading, feature status update, and feature loop prompts.

6. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.

## Task 7: Update design-review to read plan doc alongside design doc

<!-- tdd: trivial -->

Update `skills/pwk-design-review/SKILL.md` to reflect its new position in the workflow (after writing-plans, not after brainstorming) and read both docs for review.

Files:
- `skills/pwk-design-review/SKILL.md`

Steps:
1. Update the description (frontmatter):

Before:
```
description: "Audit a design doc for production risks — security, scalability, fault tolerance, and operational hazards. Use after brainstorming for non-trivial designs, or when you want to stress-test a design for production readiness."
```

After:
```
description: "Audit a plan and design doc for production risks — security, scalability, fault tolerance, and operational hazards. Use after writing-plans for non-trivial features, when the plan has concrete code that makes hazard checks meaningful."
```

2. Update step 1 to also read the plan doc:

Before:
```
1. **Find the design doc** — look for `docs/plans/*-design.md`. If none exists, say "No design doc found. Run `/skill:pwk-brainstorming` first." and stop.
```

After:
```
1. **Find the design and plan docs** — look for `docs/plans/*-design.md` and `docs/plans/*-implementation.md`. If neither exists, say "No design or plan doc found. Run `/skill:pwk-brainstorming` first." and stop. Read the plan doc for concrete code context alongside the design doc for architectural context.
```

3. Update step 3 to read both docs:

Before:
```
3. **Read the design doc in full** — understand the architecture, data flow, components, and error handling proposed.
```

After:
```
3. **Read the design and plan docs in full** — understand the architecture from the design doc, and concrete code from the plan doc. The plan doc's implementation details (SQL queries, type definitions, function bodies) are what the hazard checks audit.
```

4. Update step 8 to append review findings to the plan doc, not the design doc:

Before:
```
8. **Append to design doc** — add a `## Architectural Review` section to the design doc. Two cases:
```

After:
```
8. **Append to plan doc** — add a `## Architectural Review` section to the plan doc (not the design doc — review is per-feature, and the plan doc is the per-feature artifact). Two cases:
```

5. Verify:
```
head -10 skills/pwk-design-review/SKILL.md
```

Expected: updated description and step 1 referencing both docs.

5. Lessons — none.

## Task 8: Update workflow-guard extension and tests

<!-- tdd: modifying-tested-code -->
<!-- checkpoint: done -->

Update `extensions/workflow-guard.ts` to rename skill references and add `pwk-verify` to the phase map. Update `tests/workflow-guard.test.ts` to match.

Files:
- `extensions/workflow-guard.ts`
- `tests/workflow-guard.test.ts`

Steps:
1. Run existing tests first:
```
npx vitest run tests/workflow-guard.test.ts
```
Expected: all tests pass.

2. In `extensions/workflow-guard.ts`, update the `SKILL_TO_PHASE` map:

Before:
```ts
const SKILL_TO_PHASE: Record<string, Phase> = {
  brainstorming: "brainstorm",
  "writing-plans": "plan",
};
```

After:
```ts
const SKILL_TO_PHASE: Record<string, Phase> = {
  "pwk-brainstorming": "brainstorm",
  "pwk-writing-plans": "plan",
  "pwk-verify": "verify",
};
```

3. Update the phase-clearing triggers:

Before:
```ts
    if (text.startsWith("/skill:executing-tasks") || text.startsWith("/skill:finalizing")) {
      phase = null;
    }
```

After:
```ts
    if (text.startsWith("/skill:pwk-executing-tasks") || text.startsWith("/skill:pwk-finalizing")) {
      phase = null;
    }
```

4. In `tests/workflow-guard.test.ts`, no changes needed — tests cover `isSafeCommand` and `shouldBlockFilePath` which don't depend on skill names. The phase detection is tested via the extension event system which isn't unit-tested here.

5. Run tests:
```
npx vitest run tests/workflow-guard.test.ts
```
Expected: all tests still pass.

6. Verify no old skill names remain in the extension:
```
grep -n 'brainstorming\|"writing-plans"\|executing-tasks\|finalizing' extensions/workflow-guard.ts
```
Expected: empty (no matches for old names).

7. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.

## Task 9: Update documentation files

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Update the three documentation files with `pwk-` prefixed skill names and the new workflow diagram.

Files:
- `docs/workflow-phases.md`
- `docs/oversight-model.md`
- `docs/developer-usage-guide.md`

Steps:
1. In `docs/workflow-phases.md`, update the flow diagram and all skill references:

Before:
```
# Workflow Phases

`pi-workflow-kit` has 4 phases and 1 utility skill. You invoke each one explicitly with `/skill:`.

```
brainstorm → plan → execute → finalize
```
```

After:
```
# Workflow Phases

`pi-workflow-kit` has 4 phases and 1 utility skill. You invoke each one explicitly with `/skill:`.

```
brainstorm → plan → [design-review?] → execute → [verify?] → finalize
```

For complex features, each phase loops per feature:
```
brainstorm (name features) → plan next feature → [design-review?] → execute feature → [verify?] → loop...
```
```

2. In `docs/workflow-phases.md`, update all `/skill:` references:
- `/skill:brainstorming` → `/skill:pwk-brainstorming`
- `/skill:writing-plans` → `/skill:pwk-writing-plans`
- `/skill:executing-tasks` → `/skill:pwk-executing-tasks`
- `/skill:finalizing` → `/skill:pwk-finalizing`
- `/skill:diagnose` → `/skill:pwk-diagnose`

3. In `docs/oversight-model.md`, update the skill names in the Skills section:
- `brainstorming` → `pwk-brainstorming`
- `writing-plans` → `pwk-writing-plans`
- `executing-tasks` → `pwk-executing-tasks`
- `finalizing` → `pwk-finalizing`

4. In `docs/developer-usage-guide.md`, update all `/skill:` references:
- `/skill:brainstorming` → `/skill:pwk-brainstorming`
- `/skill:writing-plans` → `/skill:pwk-writing-plans`
- `/skill:executing-tasks` → `/skill:pwk-executing-tasks`
- `/skill:finalizing` → `/skill:pwk-finalizing`
- `/skill:diagnose` → `/skill:pwk-diagnose`

5. Verify no old references remain in active docs:
```
grep -rn '/skill:brainstorming\|/skill:writing-plans\|/skill:executing-tasks\|/skill:finalizing\|/skill:design-review\|/skill:verify\|/skill:diagnose' docs/workflow-phases.md docs/oversight-model.md docs/developer-usage-guide.md | grep -v 'pwk-'
```

Expected: empty (no matches).

6. Lessons — none.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
