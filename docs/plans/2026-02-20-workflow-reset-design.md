# Workflow Tracker Reset & Brainstorm Git Protection — Design

**Date:** 2026-02-20  
**Status:** Design complete

## Problem

### 1. No workflow reset mechanism
The workflow tracker persists phase state to `.pi/superpowers-state.json` across sessions. When a user finishes one task and starts brainstorming a new one, the stale workflow state from the prior task remains. Phases show as "complete", "skipped", or "active" from an unrelated workflow. There is no way to start fresh.

### 2. "Active" treated as unresolved
`isPhaseUnresolved()` in `skip-confirmation.ts` treats both `"pending"` and `"active"` as unresolved. When a user works on a phase in session 1 (status becomes `"active"`), then invokes the next skill in session 2, skip-confirmation fires because it sees the prior `"active"` phase as unresolved — even though the user already engaged with it.

### 3. Brainstorming starts without git hygiene check
The brainstorming skill dives into questions without checking if the current branch has uncommitted or unmerged work from a prior task. This leads to new design work happening on stale feature branches.

## Changes

### Change 1: `WorkflowTracker.reset()` method

**File:** `extensions/workflow-monitor/workflow-tracker.ts`

Add a `reset()` method to `WorkflowTracker` that resets all phases to `"pending"`, clears `currentPhase` to `null`, clears all artifacts to `null`, and resets all `prompted` flags to `false`. Essentially restores `emptyState()`.

```ts
reset(): void {
  this.state = emptyState();
}
```

This is called by both reset triggers (changes 2 and 3).

### Change 2: Auto-reset on backward/same-phase navigation in `advanceTo()`

**File:** `extensions/workflow-monitor/workflow-tracker.ts`

Currently `advanceTo()` is forward-only — it returns `false` if the target phase index is ≤ the current phase index. Change this so that backward or same-phase navigation triggers a full reset, then activates the target phase.

Current behavior:
```ts
if (current) {
  const curIdx = WORKFLOW_PHASES.indexOf(current);
  if (nextIdx <= curIdx) return false;  // ← no-op
  // ...
}
```

New behavior:
```ts
if (current) {
  const curIdx = WORKFLOW_PHASES.indexOf(current);
  if (nextIdx <= curIdx) {
    // Backward/same-phase = new task. Reset everything.
    this.reset();
    // Fall through to activate target phase below
  } else {
    // Forward: auto-complete current phase
    if (this.state.phases[current] === "active") {
      this.state.phases[current] = "complete";
    }
  }
}
```

The rest of `advanceTo()` continues as before — sets `currentPhase` and marks the target phase `"active"`.

**Affected tests in `workflow-tracker.test.ts`:**
- `"advanceTo is forward-only (no-op when going backwards)"` — this test asserts backward navigation is a no-op. It must be updated to expect a reset + re-activation at the earlier phase instead.

### Change 3: `/workflow reset` command

**File:** `extensions/workflow-monitor.ts`

Register a new command `workflow-reset` using `pi.registerCommand()`. It calls `handler.resetState()` (which already exists and resets all state including TDD/debug/verification), persists state, updates the widget, and notifies the user.

```ts
pi.registerCommand("workflow-reset", {
  description: "Reset workflow tracker to fresh state for a new task",
  async handler(_args, ctx) {
    handler.resetState();
    persistState();
    updateWidget(ctx);
    if (ctx.hasUI) {
      ctx.ui.notify("Workflow reset. Ready for a new task.", "info");
    }
  },
});
```

The user invokes this by typing `/workflow-reset` in the editor.

### Change 4: Fix `isPhaseUnresolved`

**File:** `extensions/workflow-monitor/skip-confirmation.ts`

Change `isPhaseUnresolved` to only treat `"pending"` as unresolved. A phase with status `"active"` means the user already engaged with it — it should not trigger skip-confirmation.

```ts
// Before
export function isPhaseUnresolved(status: PhaseStatus): boolean {
  return status === "pending" || status === "active";
}

// After
export function isPhaseUnresolved(status: PhaseStatus): boolean {
  return status === "pending";
}
```

**Affected tests in `workflow-skip-confirmation.test.ts`:**
- No tests currently use `"active"` status in a way that depends on it being unresolved. The `isPhaseUnresolved` unit tests (in `workflow-transitions.test.ts` or inline) need updating if they assert `isPhaseUnresolved("active") === true`.

### Change 5: Brainstorm skill git protection

**File:** `skills/brainstorming/SKILL.md`

Add a new section at the top of "The Process", before "Understanding the idea":

```markdown
**Before anything else — check git state:**
- Run `git status` and `git log --oneline -5`
- If on a feature branch with uncommitted or unmerged work, ask the user:
  - "You're on `feat/old-thing` with uncommitted changes. Want to finish/merge that first, stash it, or continue here?"
- Only one of: finish prior work, stash, or explicitly continue
- If starting a new topic, suggest creating a new branch
```

This is a skill instruction change only — no code changes.

## Files Summary

| File | Change |
|------|--------|
| `extensions/workflow-monitor/workflow-tracker.ts` | Add `reset()` method |
| `extensions/workflow-monitor/workflow-tracker.ts` | Update `advanceTo()` — backward/same navigation triggers reset instead of no-op |
| `extensions/workflow-monitor.ts` | Register `/workflow-reset` command |
| `extensions/workflow-monitor/skip-confirmation.ts` | Remove `"active"` from `isPhaseUnresolved` |
| `skills/brainstorming/SKILL.md` | Add git state check before starting |
| `tests/extension/workflow-monitor/workflow-tracker.test.ts` | Update backward-navigation test |
| `tests/extension/workflow-monitor/workflow-skip-confirmation.test.ts` | Add/update tests for `"active"` not being unresolved |

## Ordering

1. Change 1 (`reset()`) — no dependencies
2. Change 2 (auto-reset in `advanceTo`) — depends on Change 1
3. Change 4 (`isPhaseUnresolved` fix) — independent
4. Change 3 (`/workflow-reset` command) — depends on Change 1 existing
5. Change 5 (brainstorm SKILL.md) — independent, do last
