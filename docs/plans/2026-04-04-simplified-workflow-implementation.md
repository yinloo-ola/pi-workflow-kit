# Simplified Workflow Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Simplify the workflow from 6 global phases to 4, replace 5 skills with one unified `executing-tasks` skill, update plan tracker with per-task phase tracking, and update the README.

**Architecture:** Remove 5 skills, create 1 new skill, update 2 extensions, update README. Tests updated to match new phase model.

**Tech Stack:** TypeScript (extensions), Markdown (skills), Vitest (tests)

---

## Phase 1: Foundation — Workflow Tracker & Plan Tracker

These changes are the foundation that everything else builds on.

### Task 1: Simplify workflow-tracker phases

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor/workflow-tracker.ts`
- Test: `tests/extension/workflow-monitor/workflow-tracker.test.ts`

**Step 1: Run existing tests to confirm green baseline**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: All tests pass

**Step 2: Update WORKFLOW_PHASES array**

In `workflow-tracker.ts`, change:

```ts
export const WORKFLOW_PHASES = ["brainstorm", "plan", "execute", "finalize"] as const;
```

**Step 3: Update SKILL_TO_PHASE mapping**

Change:

```ts
export const SKILL_TO_PHASE: Record<string, Phase> = {
  brainstorming: "brainstorm",
  "writing-plans": "plan",
  "executing-tasks": "execute",
  "using-git-worktrees": "execute",  // worktree setup is part of execute
};
```

Remove entries for: `executing-plans`, `subagent-driven-development`, `verification-before-completion`, `requesting-code-review`, `finishing-a-development-branch`.

**Step 4: Update TransitionBoundary type**

Change:

```ts
export type TransitionBoundary = "design_committed" | "plan_ready" | "execution_complete";
```

**Step 5: Update computeBoundaryToPrompt**

Remove boundaries for `verification_passed` and `review_complete`. Change `execution_complete` to target `finalize`:

```ts
export function computeBoundaryToPrompt(state: WorkflowTrackerState): TransitionBoundary | null {
  if (state.phases.brainstorm === "complete" && !state.prompted.brainstorm) {
    return "design_committed";
  }
  if (state.phases.plan === "complete" && !state.prompted.plan) {
    return "plan_ready";
  }
  if (state.phases.execute === "complete" && !state.prompted.execute) {
    return "execution_complete";
  }
  return null;
}
```

**Step 6: Update tests**

In `workflow-tracker.test.ts`:
- Update `SKILL_TO_PHASE` test to match new mapping
- Update all tests that reference removed phases (`verify`, `review`, `finish`)
- Update `WORKFLOW_PHASES` iteration in tests
- Add tests for new `finalize` phase behavior

**Step 7: Run tests to verify**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: All tests pass

**Step 8: Commit**

```bash
git add extensions/workflow-monitor/workflow-tracker.ts tests/extension/workflow-monitor/workflow-tracker.test.ts
git commit -m "feat: simplify workflow phases to brainstorm → plan → execute → finalize"
```

### Task 2: Update workflow-transitions for simplified phases

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor/workflow-transitions.ts`
- Test: `tests/extension/workflow-monitor/workflow-transitions.test.ts`

**Step 1: Run existing tests to confirm green baseline**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-transitions.test.ts`
Expected: All tests pass

**Step 2: Update getTransitionPrompt**

Remove cases for `verification_passed` and `review_complete`. Update `execution_complete` to target `finalize`:

```ts
export function getTransitionPrompt(boundary: TransitionBoundary, artifactPath: string | null): TransitionPrompt {
  switch (boundary) {
    case "design_committed":
      return { boundary, title: "Design committed. What next?", nextPhase: "plan", artifactPath, options: BASE_OPTIONS };
    case "plan_ready":
      return { boundary, title: "Plan ready. What next?", nextPhase: "execute", artifactPath, options: BASE_OPTIONS };
    case "execution_complete":
      return { boundary, title: "All tasks complete. What next?", nextPhase: "finalize", artifactPath, options: BASE_OPTIONS };
    default:
      return { boundary, title: "What next?", nextPhase: "plan", artifactPath, options: BASE_OPTIONS };
  }
}
```

**Step 3: Update tests**

- Update existing test to expect `finalize` as next phase for `execution_complete`
- Add test for finalize boundary
- Remove tests for removed boundaries

**Step 4: Run tests**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-transitions.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-transitions.ts tests/extension/workflow-monitor/workflow-transitions.test.ts
git commit -m "feat: update workflow transitions for simplified phases"
```

### Task 3: Update skip-confirmation for simplified phases

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor/skip-confirmation.ts` (no code changes expected, but verify)
- Test: `tests/extension/workflow-monitor/skip-confirmation.test.ts`

**Step 1: Run existing tests**

Run: `npx vitest run tests/extension/workflow-monitor/skip-confirmation.test.ts`
Expected: All tests pass (it uses WORKFLOW_PHASES from workflow-tracker which is already updated)

**Step 2: Update tests referencing removed phases**

Update tests that reference `verify`, `review`, `finish` to use the new phase set (`brainstorm`, `plan`, `execute`, `finalize`).

**Step 3: Run tests**

Run: `npx vitest run tests/extension/workflow-monitor/skip-confirmation.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add extensions/workflow-monitor/skip-confirmation.ts tests/extension/workflow-monitor/skip-confirmation.test.ts
git commit -m "feat: update skip-confirmation for simplified phases"
```

### Task 4: Update plan-tracker with per-task phase and attempts

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Modify: `extensions/plan-tracker.ts`

**Step 1: Write the failing test**

Create `tests/extension/plan-tracker.test.ts` with tests for:

```ts
// Test per-task phase tracking
plan_tracker({ action: "init", tasks: ["Task 1", "Task 2"] })
plan_tracker({ action: "update", index: 0, phase: "define" })
// Expected: Task 0 has phase "define"

// Test per-task type
plan_tracker({ action: "update", index: 0, type: "code" })
// Expected: Task 0 has type "code"

// Test attempt counting
plan_tracker({ action: "update", index: 0, phase: "execute", attempts: 1 })
// Expected: Task 0 has executeAttempts 1
plan_tracker({ action: "update", index: 0, phase: "fix", attempts: 1 })
// Expected: Task 0 has fixAttempts 1

// Test backward compatibility (status still works)
plan_tracker({ action: "update", index: 0, status: "complete" })
// Expected: status works, phase becomes "complete"
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/plan-tracker.test.ts`
Expected: FAIL — `phase`, `type`, `attempts` parameters don't exist yet

**Step 3: Implement per-task state model**

In `plan-tracker.ts`, update the Task interface:

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
```

Update `PlanTrackerParams` to accept `phase`, `type`, and `attempts` on the update action. Update execute handler for `update` action to handle new fields.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/plan-tracker.test.ts`
Expected: PASS

**Step 5: Update TUI widget**

Update `formatWidget` to show per-task phase:

```
Tasks: ✓ ✓ → ○ ○  (2/4 complete)
  [2] auth flow — fix (attempt 2/3)
  [3] batch processing — define
```

**Step 6: Update renderResult to show per-task phase**

**Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 8: Commit**

```bash
git add extensions/plan-tracker.ts tests/extension/plan-tracker.test.ts
git commit -m "feat: per-task phase and attempt tracking in plan tracker"
```

### Task 5: Update workflow-monitor main entry point for simplified phases

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor.ts`

**Step 1: Run existing tests**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-monitor.test.ts tests/extension/workflow-monitor/transition-prompt.test.ts tests/extension/workflow-monitor/workflow-skip-confirmation.test.ts tests/extension/workflow-monitor/workflow-next-command.test.ts tests/extension/workflow-monitor/workflow-widget.test.ts tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts tests/extension/workflow-monitor/completion-action-gate.test.ts`
Expected: All pass (or identify failures from prior phase changes)

**Step 2: Update phaseToSkill mapping**

In `workflow-monitor.ts`, update the mapping used by boundary prompting and skip-confirmation:

```ts
const phaseToSkill: Record<string, string> = {
  brainstorm: "brainstorming",
  plan: "writing-plans",
  execute: "executing-tasks",
  finalize: "executing-tasks",
};
```

**Step 3: Update boundaryToPhase mapping**

```ts
const boundaryToPhase: Record<TransitionBoundary, keyof typeof phaseToSkill> = {
  design_committed: "brainstorm",
  plan_ready: "plan",
  execution_complete: "execute",
};
```

**Step 4: Update completion action gate phase references**

The completion action gate currently references `verify` and `review` phases. Update to only check for execute-phase completion. During execute phase, verification gating is handled at the per-task level by the skill, not the workflow monitor.

**Step 5: Update /workflow-next command phase validation**

Update valid phases: `brainstorm | plan | execute | finalize`.

**Step 6: Update agent_end boundary prompting**

Ensure the boundary prompt for `execution_complete` offers `finalize` as next step with appropriate prefill (cleanup reminder).

**Step 7: Fix any failing tests**

Run the full test suite and fix tests that reference removed phases.

**Step 8: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 9: Commit**

```bash
git add extensions/workflow-monitor.ts
git commit -m "feat: update workflow-monitor for simplified phases"
```

### Task 6: Update remaining workflow-monitor tests

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: remaining test files that reference removed phases

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: Some tests fail due to removed phases

**Step 2: Fix failing tests**

For each failing test file, update references from old phases to new phases. Key files to check:
- `workflow-handler-tracker.test.ts`
- `workflow-reset-command.test.ts`
- `extension-lifecycle.test.ts`
- `state-persistence.test.ts`
- `verification-gate-phase.test.ts`
- `warning-escalation-practice.test.ts`
- `phase-aware-write-enforcement.test.ts`
- `workflow-widget.test.ts`

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: update workflow-monitor tests for simplified phases"
```

---

## Phase 2: Skills

### Task 7: Update writing-plans skill

**TDD scenario:** Trivial change — use judgment

**Files:**
- Modify: `skills/writing-plans/SKILL.md`

**Step 1: Add task type and acceptance criteria to task template**

Add to the task structure section:

```markdown
**Type:** [code | non-code] (auto-detected if omitted)

**Acceptance Criteria:**
- [ ] condition 1
- [ ] condition 2
```

Add note: "For code tasks, the agent will write test files as acceptance criteria. For non-code tasks, acceptance criteria are natural language."

**Step 2: Update task structure example**

Show both code and non-code task examples.

**Step 3: Commit**

```bash
git add skills/writing-plans/SKILL.md
git commit -m "docs: add task type and acceptance criteria to writing-plans skill"
```

### Task 8: Create executing-tasks skill

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `skills/executing-tasks/SKILL.md`

**Step 1: Write the skill**

Create `skills/executing-tasks/SKILL.md` with the full per-task lifecycle:
- Prerequisites check (branch, plan file)
- Initialize plan_tracker with tasks
- Per-task loop: define → approve → execute → verify → review → fix
- Escalation rules (3 execute attempts, 3 fix loops)
- Finalize: PR + archive + cleanup
- Human gates at approve and verify
- Two-layer review (subagent + human)

**Step 2: Verify skill content**

Read the file and verify it covers all decisions from the design doc.

**Step 3: Commit**

```bash
git add skills/executing-tasks/SKILL.md
git commit -m "feat: add executing-tasks skill with per-task lifecycle"
```

### Task 9: Remove obsolete skills

**TDD scenario:** Trivial change — use judgment

**Files:**
- Remove: `skills/executing-plans/SKILL.md`
- Remove: `skills/subagent-driven-development/SKILL.md`
- Remove: `skills/subagent-driven-development/implementer-prompt.md`
- Remove: `skills/subagent-driven-development/spec-reviewer-prompt.md`
- Remove: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`
- Remove: `skills/verification-before-completion/SKILL.md`
- Remove: `skills/requesting-code-review/SKILL.md`
- Remove: `skills/requesting-code-review/code-reviewer.md`
- Remove: `skills/finishing-a-development-branch/SKILL.md`

**Step 1: Remove all obsolete skill directories**

```bash
rm -rf skills/executing-plans
rm -rf skills/subagent-driven-development
rm -rf skills/verification-before-completion
rm -rf skills/requesting-code-review
rm -rf skills/finishing-a-development-branch
```

**Step 2: Run tests to ensure nothing is broken**

Run: `npx vitest run`
Expected: All tests pass (extensions don't depend on skill files at runtime)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove 5 obsolete skills replaced by executing-tasks"
```

---

## Phase 3: Documentation

### Task 10: Update README

**TDD scenario:** Trivial change — use judgment

**Files:**
- Modify: `README.md`

**Step 1: Update skill count and list**

Change from "12 workflow skills" to "8 workflow skills".

Update skill table:
```
| Phase | Skill | What Happens |
|-------|-------|--------------|
| Brainstorm | `/skill:brainstorming` | Refines your idea into a design document |
| Plan | `/skill:writing-plans` | Breaks design into typed tasks with acceptance criteria |
| Execute | `/skill:executing-tasks` | Per-task lifecycle: define → approve → execute → verify → review → fix |
| Finalize | (built into executing-tasks) | PR creation, archive docs, update repo docs, cleanup |
```

**Step 2: Update workflow diagram**

```
Brainstorm → Plan → Execute (per-task lifecycle) → Finalize
```

**Step 3: Update phase strip example**

```
-brainstorm → ✓plan → [execute] → finalize
```

**Step 4: Update extensions section**

Remove references to removed skills. Update TDD/Debug/Verification sections to mention they operate within the per-task lifecycle.

**Step 5: Update architecture section**

Remove 5 skill directories, add `executing-tasks`. Update extension descriptions.

**Step 6: Update comparison table**

Remove references to removed skills. Update phase count from 6 to 4.

**Step 7: Update "Upgrading from pi-superpowers" section**

Remove references to removed skills.

**Step 8: Commit**

```bash
git add README.md
git commit -m "docs: update README for simplified workflow"
```

### Task 11: Update cross-references in remaining skills

**TDD scenario:** Trivial change — use judgment

**Files:**
- Modify: `skills/brainstorming/SKILL.md`
- Modify: `skills/test-driven-development/SKILL.md`
- Modify: `skills/systematic-debugging/SKILL.md`
- Modify: `skills/receiving-code-review/SKILL.md`
- Modify: `skills/using-git-worktrees/SKILL.md`
- Modify: `skills/dispatching-parallel-agents/SKILL.md`

**Step 1: Update related skills references**

In each skill's `> **Related skills:**` section, update references:
- Replace `/skill:executing-plans` with `/skill:executing-tasks`
- Replace `/skill:subagent-driven-development` with `/skill:executing-tasks`
- Replace `/skill:verification-before-completion` with `/skill:executing-tasks`
- Replace `/skill:finishing-a-development-branch` with `/skill:executing-tasks` (or remove if finalize is mentioned)
- Replace `/skill:requesting-code-review` with `/skill:executing-tasks` (review is now per-task)

**Step 2: Commit**

```bash
git add skills/
git commit -m "docs: update cross-references in remaining skills"
```

### Task 12: Archive planning docs and move to completed

**TDD scenario:** Trivial change — use judgment

**Files:**
- Move: `docs/plans/2026-04-04-simplified-workflow-design.md` → `docs/plans/completed/`

**Step 1: Create completed directory if needed**

```bash
mkdir -p docs/plans/completed
```

**Step 2: Move design doc**

```bash
git mv docs/plans/2026-04-04-simplified-workflow-design.md docs/plans/completed/
```

**Step 3: Commit**

```bash
git commit -m "chore: archive simplified workflow design doc to completed"
```

---

## Task Dependency Order

```
Task 1 (workflow-tracker phases) → Task 2 (transitions) → Task 3 (skip-confirmation)
Task 1 → Task 4 (plan-tracker)
Task 1 → Task 5 (workflow-monitor main) → Task 6 (remaining tests)
Task 1-6 → Task 7 (writing-plans) → Task 8 (executing-tasks) → Task 9 (remove skills)
Task 8-9 → Task 10 (README) → Task 11 (cross-refs) → Task 12 (archive)
```

Tasks 2 and 3 can run in parallel after Task 1.
Tasks 4 and 5 can run in parallel after Task 1.
Tasks 7 and 8 can run in parallel after Task 6.
