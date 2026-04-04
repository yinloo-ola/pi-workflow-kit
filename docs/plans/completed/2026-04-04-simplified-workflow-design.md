# Simplified Workflow Design

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Simplify the workflow from 6 global phases to 4 global phases, with a per-task lifecycle that includes human gates and bounded retry loops.

**Architecture:** Replace 5 execution-oriented skills with one unified `executing-tasks` skill. Simplify the workflow monitor's global phase tracking. Update the plan tracker to support per-task phase and attempt tracking.

**Tech Stack:** TypeScript (extensions), Markdown (skills)

---

## Problem

The current workflow has 6 global phases (`brainstorm → plan → execute → verify → review → finish`) that don't map to reality. In practice, each task has its own verify/review/fix lifecycle. Global phase tracking is inaccurate because:

- Verify and review happen per-task, not once for the whole plan
- The agent jumps between tasks and phases, breaking the linear model
- The fix/optimize phase after review doesn't exist in the current model

## Solution

### Global Phases (simplified)

```
brainstorm → plan → execute → finalize
```

- **brainstorm** — unchanged (skill: `brainstorming`)
- **plan** — minor additions to `writing-plans` (task type, acceptance criteria)
- **execute** — new unified `executing-tasks` skill handles the per-task lifecycle
- **finalize** — PR creation + cleanup (built into `executing-tasks`)

### Per-Task Lifecycle (inside execute phase)

```
define → approve → execute → verify → review → fix
  ↑                         ↑        ↑      │
  └─────────────────────────┴────────┴──────┘ (loop on failure)
```

#### 1. Define
- **Code task** → agent writes actual test file(s) with assertions
- **Non-code task** → agent writes natural language acceptance criteria
- Task type is auto-detected or explicitly set in the plan

#### 2. Approve (human gate)
- Agent presents test cases / acceptance criteria
- Human reviews and approves, revises, or rejects
- No execution begins until approved

#### 3. Execute (max 3 attempts)
- Agent implements the task
- Each attempt: implement → run tests/checks
- If all pass → move to Verify
- If 3 attempts exhausted → **escalate to human** (revise scope, adjust tests, abandon)

#### 4. Verify
- Agent re-runs tests / checks acceptance criteria
- Reports results: ✅ passed conditions, ❌ failed conditions
- **Does not auto-fix** — flags failures to human
- If failures → human decides: go back to Execute, revise tests, or accept as-is

#### 5. Review (two layers)
- **Layer 1**: Subagent reviews implementation against task spec
- **Layer 2**: Agent presents summary to human for sign-off
- If issues found → move to Fix

#### 6. Fix (max 3 loops, re-enters Verify → Review)
- Agent addresses review feedback
- Re-enters Verify → Review cycle
- If 3 fix loops exhausted → **escalate to human** (proceed, keep fixing, abandon)

**Task complete** when both reviewers are satisfied and all conditions pass.

### Escalation Rules

| Event | Action |
|-------|--------|
| Execute 3 attempts exhausted | Escalate to human |
| Fix loop 3 attempts exhausted | Escalate to human |
| Verify fails | Flag to human, human decides |

No silent skipping. Consistent escalation everywhere.

### Finalize Phase

After all tasks complete (or are explicitly accepted by human):

1. **Final review** — dispatch subagent to review entire implementation holistically
2. **Create PR** — push branch, create PR with summary of all tasks
3. **Archive planning docs** — move all artifacts from `docs/plans/` to `docs/plans/completed/`
4. **Update repo docs** — CHANGELOG, README, inline docs as needed
5. **Update pi-superpowers-plus README** — document the new workflow, updated skill list, architecture changes
6. **Clean up worktree** if one was used

---

## Skills — What Changes

### Keep Unchanged (6)

| Skill | Why |
|-------|-----|
| `brainstorming` | Works well as-is |
| `systematic-debugging` | Used within execute phase when tests fail |
| `test-driven-development` | Used within execute phase by implementer |
| `receiving-code-review` | Used after finalize creates a PR and external reviewers comment |
| `using-git-worktrees` | Used before execute to set up isolated workspace |
| `dispatching-parallel-agents` | Available when tasks are independent |

### Keep with Minor Updates (1)

| Skill | Changes |
|-------|---------|
| `writing-plans` | Add optional `type: code \| non-code` per task, and `acceptance_criteria` field format |

### New Skill (1)

| Skill | Purpose |
|-------|---------|
| `executing-tasks` | Unified per-task lifecycle: define → approve → execute → verify → review → fix + finalize |

### Remove (5)

| Skill | Why |
|-------|-----|
| `executing-plans` | Replaced by `executing-tasks` |
| `subagent-driven-development` | Replaced by `executing-tasks` |
| `verification-before-completion` | Verify built into per-task lifecycle |
| `requesting-code-review` | Review built into per-task lifecycle |
| `finishing-a-development-branch` | Finalize built into `executing-tasks` |

### Sub-files to Remove

- `requesting-code-review/code-reviewer.md`
- `subagent-driven-development/implementer-prompt.md`
- `subagent-driven-development/spec-reviewer-prompt.md`
- `subagent-driven-development/code-quality-reviewer-prompt.md`

---

## Extensions — What Changes

### Keep As-Is (2)

| Extension | Why |
|-----------|-----|
| `logging` | No changes needed |
| `subagent` | Used by `executing-tasks` to dispatch agents |

### Update (2)

| Extension | Changes |
|-----------|---------|
| `plan-tracker` | Add per-task `phase` and `attempts` tracking. Update TUI widget to show per-task phase. Update tool parameters. |
| `workflow-monitor` | Simplify global phases from `brainstorm → plan → execute → verify → review → finish` to `brainstorm → plan → execute → finalize`. Remove per-task phase tracking from workflow-tracker (moved to plan-tracker). Update SKILL_TO_PHASE mapping. Update boundary prompts. |

### Workflow Tracker Phase Changes

**Current:**
```
["brainstorm", "plan", "execute", "verify", "review", "finish"]
```

**New:**
```
["brainstorm", "plan", "execute", "finalize"]
```

**SKILL_TO_PHASE mapping changes:**

| Skill | Current Phase | New Phase |
|-------|--------------|-----------|
| `brainstorming` | `brainstorm` | `brainstorm` (unchanged) |
| `writing-plans` | `plan` | `plan` (unchanged) |
| `executing-plans` | `execute` | `execute` (new skill: `executing-tasks`) |
| `subagent-driven-development` | `execute` | `execute` (removed) |
| `verification-before-completion` | `verify` | removed |
| `requesting-code-review` | `review` | removed |
| `finishing-a-development-branch` | `finish` | `finalize` |

**Transition boundaries:**

| Boundary | Current | New |
|----------|---------|-----|
| `design_committed` | brainstorm → plan | unchanged |
| `plan_ready` | plan → execute | unchanged |
| `execution_complete` | execute → verify | execute → finalize |
| `verification_passed` | verify → review | removed |
| `review_complete` | review → finish | removed |

---

## Plan Tracker Changes

### Current State Model

```ts
interface Task {
  name: string;
  status: "pending" | "in_progress" | "complete";
}
```

### New State Model

```ts
type TaskPhase = "define" | "approve" | "execute" | "verify" | "review" | "fix" | "complete" | "blocked";

interface Task {
  name: string;
  status: "pending" | "in_progress" | "complete" | "blocked";
  phase: TaskPhase;
  type: "code" | "non-code";
  executeAttempts: number;
  fixAttempts: number;
}

// New plan_tracker actions
plan_tracker({ action: "init", tasks: [...] })
plan_tracker({ action: "update", index: 0, status: "in_progress" })
plan_tracker({ action: "update", index: 0, phase: "define" })
plan_tracker({ action: "update", index: 0, phase: "approve" })
plan_tracker({ action: "update", index: 0, phase: "execute", attempts: 1 })
plan_tracker({ action: "update", index: 0, phase: "verify" })
plan_tracker({ action: "update", index: 0, phase: "review" })
plan_tracker({ action: "update", index: 0, phase: "fix", attempts: 1 })
plan_tracker({ action: "update", index: 0, status: "complete" })
plan_tracker({ action: "status" })
plan_tracker({ action: "clear" })
```

### TUI Widget Update

```
Tasks: ✓ ✓ → ○ ○  (2/4 complete)
  [2] auth flow — fix (attempt 2/3)
  [3] batch processing — define
```

---

## README Update

Update the repo README to reflect:

- New workflow: `brainstorm → plan → execute → finalize`
- Updated skill count (8 skills, down from 12)
- Removed skills section (what was removed and why)
- New `executing-tasks` skill description
- Per-task lifecycle explanation
- Updated architecture section
- Updated comparison table with pi-superpowers
- Updated phase tracking documentation
