# Cleanup legacy state, enforce thinking phases, fix autocomplete

> **REQUIRED SUB-SKILL:** Use the executing-tasks skill to implement this plan task-by-task.

**Goal:** Remove legacy `superpowers-state.json` fallback, block non-plans writes during brainstorm/plan phases, and fix artifact completions losing the phase word.

**Architecture:** Three independent changes in `workflow-monitor.ts` and `workflow-next-completions.ts` with corresponding test updates. Each change is self-contained.

**Tech Stack:** TypeScript, Node.js, vitest, pi extension API

---

### Task 1: Remove `superpowers-state.json` legacy fallback

**Type:** code
**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor.ts:67-100`
- Modify: `tests/extension/workflow-monitor/state-persistence.test.ts:274-500`

**Step 1: Run existing state persistence tests**

Run: `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`
Expected: All tests pass

**Step 2: Remove `getLegacyStateFilePath` and legacy fallback in source**

In `extensions/workflow-monitor.ts`:

1. Delete the `getLegacyStateFilePath` function (3 lines).
2. In `reconstructState`, simplify the file-read block — remove the `else if (stateFilePath === undefined)` branch that tries the legacy filename. The remaining code becomes:

```typescript
if (stateFilePath !== false) {
  try {
    const statePath = stateFilePath ?? getStateFilePath();
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, "utf-8");
      fileData = JSON.parse(raw);
    }
  } catch (err) {
    log.warn(
      `Failed to read state file, falling back to session entries: ${err instanceof Error ? err.message : err}`,
    );
  }
}
```

**Step 3: Update tests**

In `tests/extension/workflow-monitor/state-persistence.test.ts`:

1. Fix test name on line 274: `"getStateFilePath returns .pi/superpowers-state.json in cwd"` → `"getStateFilePath returns .pi/workflow-kit-state.json in cwd"`
2. On line 318: change `"superpowers-state.json"` → `"workflow-kit-state.json"`
3. On line 337: change `"superpowers-state.json"` → `"workflow-kit-state.json"`
4. Delete the entire `describe("state file rename to .pi/workflow-kit-state.json with legacy fallback", () => { ... })` block (4 tests, from line ~404 to ~530)

**Step 4: Run tests**

Run: `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`
Expected: All tests pass

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/state-persistence.test.ts
git commit -m "refactor: remove superpowers-state.json legacy fallback"
```

---

### Task 2: Enforce brainstorm/plan phase boundaries (block immediately)

**Type:** code
**TDD scenario:** Modifying tested code — update existing tests first

**Files:**
- Modify: `extensions/workflow-monitor.ts:135-520`
- Modify: `tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts`

**Step 1: Run existing enforcement tests**

Run: `npx vitest run tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts`
Expected: All tests pass

**Step 2: Update source — block immediately instead of escalating**

In `extensions/workflow-monitor.ts`:

1. Remove `pendingProcessWarnings` map declaration (line ~135).
2. Change `ViolationBucket` type from `"process" | "practice"` to `"practice"`.
3. Change `strikes` from `{ process: 0, practice: 0 }` to `{ practice: 0 }`.
4. Change `sessionAllowed` type to `Partial<Record<"practice", boolean>>`.
5. In `maybeEscalate`, change parameter type from `ViolationBucket` to `"practice"`.
6. In `tool_result` handler, remove the `pendingProcessWarnings.get(toolCallId)` / `.delete(toolCallId)` block (3 lines).
7. In `tool_call` handler (~line 506-516), replace the `maybeEscalate("process", ctx)` + `pendingProcessWarnings.set(...)` block with:

```typescript
return {
  blocked: true,
  reason:
    `⚠️ PROCESS VIOLATION: Wrote ${filePath} during ${phase} phase.\n` +
    "During brainstorming/planning you may only write to docs/plans/. " +
    "Read code and docs to understand the problem, then discuss the design before implementing.",
};
```

**Step 3: Update tests**

In `tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts`:

1. The first test (`"warns when writing outside docs/plans during brainstorm"`) currently checks for an injected warning in the tool result. After the change, the write is blocked in `on_tool_call` before it executes, so `on_tool_result` is never reached. Replace the test to check that `onToolCall` returns `{ blocked: true }` with a `reason` containing `"PROCESS VIOLATION"` and `"brainstorm"`. Remove the `onToolResult` call and its assertion.

2. Add a new test: `"blocks immediately on first violation during plan phase"` — same pattern as brainstorm but with `currentPhase: "plan"`, verify `{ blocked: true, reason: expect.stringContaining("PROCESS VIOLATION") }`.

3. The test `"second process violation hard-blocks (interactive)"` is no longer relevant — blocking is immediate now. Delete it.

**Step 4: Run enforcement tests**

Run: `npx vitest run tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts`
Expected: All tests pass

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/phase-aware-write-enforcement.test.ts
git commit -m "feat: block writes outside docs/plans immediately during brainstorm/plan phases"
```

---

### Task 3: Fix artifact completions losing the phase word

**Type:** code
**TDD scenario:** Modifying tested code — update existing tests first

**Files:**
- Modify: `extensions/workflow-monitor/workflow-next-completions.ts:50-60`
- Modify: `tests/extension/workflow-monitor/workflow-next-command.test.ts`

**Step 1: Run existing completion tests**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: All tests pass

**Step 2: Update source — prepend phase to artifact values**

In `extensions/workflow-monitor/workflow-next-completions.ts`, in `listArtifactsForPhase`, the function needs the `phase` parameter included in `item.value`. Change the final `.map()`:

```typescript
// Before:
.map((relPath) => ({ value: relPath, label: relPath }));

// After:
.map((relPath) => ({ value: `${phase} ${relPath}`, label: relPath }));
```

This ensures pi's `applyCompletion` replaces the full prefix (e.g. `"plan des"`) with `"plan docs/plans/..."` — preserving the phase word.

**Step 3: Update tests**

In `tests/extension/workflow-monitor/workflow-next-command.test.ts`, update these tests to expect `value` with the phase prefix:

1. `"suggests only design artifacts for plan phase"` — change `value: "docs/plans/..."` to `value: "plan docs/plans/..."`, keep `label` unchanged.

2. `"filters plan artifact suggestions by typed prefix"` — same value change.

3. `"suggests only implementation artifacts for execute and finalize"` — change execute value to `"execute docs/plans/..."` and finalize value to `"finalize docs/plans/..."`.

**Step 4: Run completion tests**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: All tests pass

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add extensions/workflow-monitor/workflow-next-completions.ts tests/extension/workflow-monitor/workflow-next-command.test.ts
git commit -m "fix: preserve phase word in /workflow-next artifact completions"
```
