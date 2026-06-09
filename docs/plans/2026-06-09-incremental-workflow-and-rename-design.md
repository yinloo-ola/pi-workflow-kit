# Incremental Workflow & Skill Rename

## Problem

Three issues with the current workflow:

1. **Design review runs too early.** The 8 hazard checks evaluate concrete code (missing indexes, raw SQL interpolation, unbounded concurrency). A design doc is too vague to audit effectively — most hazards are invisible until the plan has actual code.
2. **Large features create context pressure.** Planning all tasks upfront, then executing them all, means a 20-task plan accumulates massive context. Lessons learned mid-execution can't reshape later tasks. The plan goes stale.
3. **Skills aren't namespaced.** All 7 skills live in a flat namespace, making it hard to discover which skills belong to pi-workflow-kit versus third-party or user-installed skills.

## Decision

1. **Move design review after writing-plans.** The plan doc has concrete code, making hazard checks meaningful. Writing-plans already flags high-risk areas — when flagged, suggest design-review before executing.
2. **Incremental feature-based workflow.** Brainstorm names features. Each feature gets its own plan → execute → optional verify cycle. The brainstorm doc's `## Features` table tracks overall progress.
3. **Rename all skills with `pwk-` prefix.** All 7 skills and all cross-references updated.

## Workflow Change

### Before

```
brainstorm → [design-review?] → plan (all tasks) → execute (all tasks) → [verify?] → finalize
```

### After

```
brainstorm (name features)
  → plan next feature
    → [design-review if hazards flagged]
    → execute feature
    → [verify this feature? (optional)]
    → more features? → loop back to plan
    → all done?
      → [verify everything? (optional)]
      → finalize
```

## Feature Table

Brainstorm doc adds a `## Features` table. Simple features get one row. Complex features get many. The table is the feature-level state machine — it answers "what's next?" at any point.

```markdown
## Features

| # | Feature | Status | Observable Behavior |
|---|---------|--------|---------------------|
| 1 | User signup | ✅ done | User can create account with email+password |
| 2 | Email verification | 🔄 planned | User receives and confirms verification email |
| 3 | Password reset | ⬜ pending | User can reset password via email link |
```

Status values: `⬜ pending`, `🔄 planned`, `✅ done`, `⏭ skipped`.

### Table maintenance

- **Brainstorm** creates the table with all rows as `⬜ pending`
- **Writing-plans** marks the next feature as `🔄 planned` when it creates a plan for it
- **Executing-tasks** marks the feature as `✅ done` (or `⏭ skipped`) after completing all its tasks
- **Any skill can add rows** if a new feature is discovered mid-implementation (human decides, not agent)
- The table is a living document. If features need merging, splitting, or reordering, the human directs changes during execution

## Design Review Changes

### Timing

Design review moves from after-brainstorm to after-writing-plans.

**Trigger mechanism (already exists in writing-plans step 1):** Writing-plans checks for hazards (DB schema changes, auth, external APIs, concurrency, uploads, Redis/MQ). If any apply AND no architectural review section exists → prompt user to run `/skill:pwk-design-review` or type 'proceed' to skip.

If the plan doc notes "Simple change — no design review needed" → skip.

### Review input

Design review reads both the plan doc (concrete code) and the design doc (architectural context). This is better than the current flow — concrete code makes hazards visible.

### No mandatory per-feature review

Design review is suggested, not mandatory, for each feature. The writing-plans hazard check gates it. Low-risk features skip it entirely.

## Verify Changes

### Two modes

| | Per-feature verify | Full verify |
|---|---|---|
| **Scope** | One feature's code | All feature code together |
| **Catches** | Security, dead code, traceability within the feature | Cross-feature integration, duplicated patterns across features, overall consistency |
| **When** | After each feature (optional, human-initiated) | After all features (optional, human-initiated) |
| **Cost** | Low — small code surface | Higher — full codebase |

Neither is mandatory. The human decides based on risk and complexity.

### Executor prompts

After completing a feature:
```
✅ Feature "<name>" complete.
⏭  Next: "<next feature name>"
💡 Options:
   - Plan next feature: /skill:pwk-writing-plans
   - Verify this feature first: /skill:pwk-verify
   - Or just say "continue"
```

After all features complete:
```
✅ All features complete!
   - Verify everything: /skill:pwk-verify
   - Ship: /skill:pwk-finalizing
```

## Per-Feature Execution Model

### Plan docs

One plan doc per feature: `docs/plans/YYYY-MM-DD-<topic>-<feature-name>-implementation.md`

### Progress docs

One progress doc per feature: `docs/plans/YYYY-MM-DD-<topic>-<feature-name>-progress.md`

### Feature loop

1. **Writing-plans** reads design doc, identifies next `⬜ pending` feature, marks it `🔄 planned`, writes plan doc for that feature
2. **Design review** (if triggered) reviews plan doc + design doc
3. **Executing-tasks** executes the feature's plan, marks feature `✅ done` in design doc table
4. **Verify** (optional) reviews just the feature's code
5. **Loop** back to step 1 if more `⬜ pending` features exist

### Session boundaries

Each plan → execute cycle is a natural session break. The executor suggests `/new` between features for clean context, as it already does for long task runs.

## Skill Rename

All 7 skills renamed with `pwk-` prefix:

| Current | New |
|---------|-----|
| brainstorming | pwk-brainstorming |
| writing-plans | pwk-writing-plans |
| executing-tasks | pwk-executing-tasks |
| design-review | pwk-design-review |
| verify | pwk-verify |
| finalizing | pwk-finalizing |
| diagnose | pwk-diagnose |

All cross-references between skills updated (e.g. `Run /skill:executing-tasks` → `Run /skill:pwk-executing-tasks`).

## Files Changed

### Skill files (rename + content updates)
- `skills/brainstorming/SKILL.md` → `skills/pwk-brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md` → `skills/pwk-writing-plans/SKILL.md`
- `skills/executing-tasks/SKILL.md` → `skills/pwk-executing-tasks/SKILL.md`
- `skills/design-review/SKILL.md` → `skills/pwk-design-review/SKILL.md`
- `skills/verify/SKILL.md` → `skills/pwk-verify/SKILL.md`
- `skills/finalizing/SKILL.md` → `skills/pwk-finalizing/SKILL.md`
- `skills/diagnose/SKILL.md` → `skills/pwk-diagnose/SKILL.md`

### Documentation
- `docs/workflow-phases.md` — update skill names and flow diagram
- `docs/oversight-model.md` — update skill names
- `docs/developer-usage-guide.md` — update skill names

### Extension
- `extensions/workflow-guard.ts` — update skill name references:
  - `SKILL_TO_PHASE` keys: `brainstorming` → `pwk-brainstorming`, `writing-plans` → `pwk-writing-plans`
  - Phase-clearing triggers: `/skill:executing-tasks` → `/skill:pwk-executing-tasks`, `/skill:finalizing` → `/skill:pwk-finalizing`
  - Add `"pwk-verify": "verify"` to `SKILL_TO_PHASE` — enforce write restriction (only `docs/plans/`) during verify phase, matching the skill's read-only claim
- `tests/workflow-guard.test.ts` — update all skill name references and add test cases for `pwk-verify` phase

## Features (implementation slices)

1. **Rename skill directories and files** — move all 7 skill folders to `pwk-` prefix names, update frontmatter names
2. **Update cross-references in all skills** — find-and-replace all `/skill:` references across all 7 skill files
3. **Add feature table to brainstorming** — update brainstorming skill to produce a `## Features` table in design doc
4. **Update writing-plans for feature-at-a-time** — detect next `⬜ pending` feature, plan only that feature, mark `🔄 planned`, update file naming to per-feature
5. **Update executing-tasks for feature loop** — mark feature `✅ done` after all tasks, suggest next feature or verify/finalize
6. **Move design review trigger** — remove brainstorm's "after design" review suggestion, confirm writing-plans already has the trigger (it does)
7. **Update executor end-of-feature prompts** — new prompt format with verify option and next feature
8. **Update workflow-guard extension** — rename skill references, add `pwk-verify` to phase map
9. **Update documentation** — workflow-phases.md, oversight-model.md, developer-usage-guide.md

Simple change — no design review needed.
