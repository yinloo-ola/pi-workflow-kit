# Cleanup legacy state file and enforce thinking-phase boundaries

Date: 2026-04-09

## Problem

1. **Legacy state file still read:** `workflow-monitor.ts` still has `getLegacyStateFilePath()` and a fallback read path for `.pi/superpowers-state.json`. The new filename (`workflow-kit-state.json`) is correct for writes, but the old one is still checked on read.

2. **Brainstorm/plan phases not enforced:** When the agent writes code during brainstorm or plan phase, the extension only warns (strike-based escalation allows first offense). The agent can ignore the warning and proceed with implementation work.

3. **`/workflow-next` tab completions lose the phase word:** When selecting a file artifact completion (e.g. `docs/plans/2026-04-09-foo-design.md`), pi replaces the entire argument prefix including the phase word. `/workflow-next plan des` → select file → `/workflow-next docs/plans/...` ("plan" gone).

4. **Phase completions lack trailing space:** Tab-completing a phase gives `/workflow-next plan` with no trailing space, requiring a manual space before artifact suggestions appear.

Note: Tab key does not trigger slash command argument completions at all (pi-side behavior — falls through to file path completion when `force=true`). Argument suggestions only appear on typing. This cannot be fixed on our side.

## Scope

Four changes:

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

### 3. Fix phase word lost on artifact completion selection

**`extensions/workflow-monitor/workflow-next-completions.ts`:**
- In `listArtifactsForPhase`, prepend the phase to `item.value` so pi's prefix replacement preserves it:
  - `value: "plan docs/plans/2026-04-09-foo-design.md"` (replaces "plan des" → keeps "plan")
  - `label: "docs/plans/2026-04-09-foo-design.md"` (display stays clean)
- Applies to all phases with artifacts: plan, execute, finalize

### 4. Add trailing space to phase completions

**`extensions/workflow-monitor/workflow-next-completions.ts`:**
- In `getPhaseCompletions`, add trailing space to `item.value`:
  - `value: "plan "` (after tab: `/workflow-next plan_` with cursor after space)
  - `label: "plan"` (display stays clean)
- Applies to all four phases (brainstorm has no artifacts but trailing space is harmless)
- The handler already parses correctly: `args.trim().split(/\s+/, 2)`

**`extensions/workflow-monitor.ts`:**
- Replace the `maybeEscalate("process", ctx)` call + `pendingProcessWarnings.set(...)` with an immediate `{ blocked: true, reason: ... }` return that includes a reminder about what the agent should be doing instead
- Remove `"process"` from `ViolationBucket` type and `strikes` record (only `"practice"` remains, still used by TDD)
- Remove `pendingProcessWarnings` map (no longer needed)

### Tests

**`tests/extension/workflow-monitor/workflow-next-completions.test.ts`:**
- Update artifact completion tests to expect `value` with phase prefix (e.g. `"plan docs/plans/..."`)
- Update phase completion tests to expect trailing space in `value`

## What stays the same

- `persistState()` already writes only to `.pi/workflow-kit-state.json` — no changes
- `maybeEscalate()` stays (still used for `"practice"` / TDD violations)
- The `isThinkingPhase` check (`phase === "brainstorm" || phase === "plan"`) already covers both phases — same treatment
- `docs/plans/` writes remain allowed during brainstorm/plan phases
- Tab not triggering argument completions is a pi-side issue — not in scope
