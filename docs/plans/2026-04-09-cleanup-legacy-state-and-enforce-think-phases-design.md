# Cleanup legacy state file and enforce thinking-phase boundaries

Date: 2026-04-09

## Problem

1. **Legacy state file still read:** `workflow-monitor.ts` still has `getLegacyStateFilePath()` and a fallback read path for `.pi/superpowers-state.json`. The new filename (`workflow-kit-state.json`) is correct for writes, but the old one is still checked on read.

2. **Brainstorm/plan phases not enforced:** When the agent writes code during brainstorm or plan phase, the extension only warns (strike-based escalation allows first offense). The agent can ignore the warning and proceed with implementation work.

## Scope

Two changes, each confined to two files:

### 1. Remove `superpowers-state.json` legacy fallback

**`extensions/workflow-monitor.ts`:**
- Remove `getLegacyStateFilePath()` function
- In `reconstructState()`, remove the `else if (stateFilePath === undefined)` branch that reads the legacy filename

**`tests/extension/workflow-monitor/state-persistence.test.ts`:**
- Update two tests in `"file-based state persistence"` describe that write/read `superpowers-state.json` to use `workflow-kit-state.json`
- Fix test name `"getStateFilePath returns .pi/superpowers-state.json in cwd"`
- Remove the `"state file rename to .pi/workflow-kit-state.json with legacy fallback"` describe block (4 tests) — this migration behavior no longer exists

### 2. Enforce brainstorm/plan phase boundaries

**`extensions/workflow-monitor.ts`:**
- Replace the `maybeEscalate("process", ctx)` call + `pendingProcessWarnings.set(...)` with an immediate `{ blocked: true, reason: ... }` return that includes a reminder about what the agent should be doing instead
- Remove `"process"` from `ViolationBucket` type and `strikes` record (only `"practice"` remains, still used by TDD)
- Remove `pendingProcessWarnings` map (no longer needed)

## What stays the same

- `persistState()` already writes only to `.pi/workflow-kit-state.json` — no changes
- `maybeEscalate()` stays (still used for `"practice"` / TDD violations)
- The `isThinkingPhase` check (`phase === "brainstorm" || phase === "plan"`) already covers both phases — same treatment
- `docs/plans/` writes remain allowed during brainstorm/plan phases
