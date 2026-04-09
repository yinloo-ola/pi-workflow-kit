# /workflow-next Handoff State Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-tasks skill to implement this plan task-by-task.

**Goal:** Make `/workflow-next` preserve prior completed workflow history for same-feature handoffs, enforce immediate-next-only transitions, and rename the persisted local state file with legacy fallback.

**Architecture:** Add a small workflow-next state helper that validates allowed handoffs and derives the workflow snapshot for the new session. Update the workflow monitor to seed the new session through `ctx.newSession({ setup })` with derived workflow state plus fresh monitor state, and add focused tests for validation, state derivation, and file migration behavior.

**Tech Stack:** TypeScript, Vitest, pi extension API (`ctx.newSession({ setup })`, `SessionManager.appendCustomEntry`)

---

## Verification

All tasks completed. Final test results:
- `tests/extension/workflow-monitor/workflow-next-command.test.ts` — 17/17 pass
- `tests/extension/workflow-monitor/state-persistence.test.ts` — 25/25 pass
- `tests/extension/workflow-monitor/` (full suite) — 360/360 pass

No regressions. All acceptance criteria met.


---

### Task 1: Add failing tests for workflow-next handoff validation and state seeding

**Type:** code
**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `tests/extension/workflow-monitor/workflow-next-command.test.ts`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts`

**Step 1: Write the failing tests**

Add tests covering:
- allows `plan -> execute` only when `plan` is complete
- rejects same-phase handoff
- rejects backward handoff
- rejects direct jump handoff
- rejects handoff when current phase is active
- seeds new session setup with derived workflow state preserving earlier completed phases, artifacts, and prompted flags
- resets TDD/debug/verification state in the seeded session snapshot

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: FAIL with missing validation and missing setup-state assertions

**Step 3: Write minimal implementation support in test scaffolding only if needed**

If needed, extend the fake `ctx.newSession` stub in the test so it records the `setup` callback and lets the test invoke it with a fake session manager that captures appended custom entries.

**Step 4: Run test to verify it still fails for the intended production behavior gap**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: FAIL only on the new assertions tied to unimplemented production code

**Step 5: Commit**

```bash
git add tests/extension/workflow-monitor/workflow-next-command.test.ts
git commit -m "test: cover workflow-next handoff validation"
```

### Task 2: Add failing tests for state-file rename and legacy fallback

**Type:** code
**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `tests/extension/workflow-monitor/state-persistence.test.ts`
- Test: `tests/extension/workflow-monitor/state-persistence.test.ts`

**Step 1: Write the failing tests**

Add tests covering:
- `getStateFilePath()` returns `.pi/workflow-kit-state.json`
- `reconstructState()` prefers `.pi/workflow-kit-state.json` when present
- `reconstructState()` falls back to `.pi/superpowers-state.json` when the new file is absent
- extension persistence writes the new filename only

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`
Expected: FAIL because current code still uses `.pi/superpowers-state.json`

**Step 3: Keep test fixtures minimal**

Reuse existing `withTempCwd()` and fake pi helpers. When testing persistence wiring, assert against files under `.pi/` in the temp directory rather than broad repo state.

**Step 4: Run test to verify it still fails for the intended production behavior gap**

Run: `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`
Expected: FAIL only on filename/migration assertions

**Step 5: Commit**

```bash
git add tests/extension/workflow-monitor/state-persistence.test.ts
git commit -m "test: cover workflow state file migration"
```

### Task 3: Implement workflow-next handoff validation and derived state helper

**Type:** code
**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `extensions/workflow-monitor/workflow-next-state.ts`
- Modify: `extensions/workflow-monitor.ts`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts`

**Step 1: Write the helper module with pure functions**

Implement functions such as:
- `getImmediateNextPhase(currentPhase)`
- `validateWorkflowNextRequest(currentState, requestedPhase)`
- `deriveWorkflowHandoffState(currentState, requestedPhase)`

Behavior:
- require an existing current phase
- require current phase status to be exactly `complete`
- allow only the immediate next phase
- reject same/backward/direct-jump handoffs with precise messages
- derive workflow state with earlier phases `complete`, target `active`, later `pending`
- preserve earlier-phase artifacts and prompted flags

**Step 2: Update `/workflow-next` to use the helper and seed session state**

In `extensions/workflow-monitor.ts`:
- import the helper functions
- validate before calling `ctx.newSession(...)`
- use `ctx.newSession({ parentSession, setup })`
- inside `setup`, append a `superpowers_state` custom entry containing:
  - derived `workflow`
  - fresh `tdd` from `TDD_DEFAULTS`
  - fresh `debug` from `DEBUG_DEFAULTS`
  - fresh `verification` from `VERIFICATION_DEFAULTS`
  - `savedAt: Date.now()`
- keep the editor prefill behavior unchanged

**Step 3: Run targeted tests**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: PASS

**Step 4: Review for YAGNI and edge cases**

Verify:
- helper stays pure and focused
- no generic tracker semantics are changed outside `/workflow-next`
- invalid requests exit before session creation

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-next-state.ts extensions/workflow-monitor.ts tests/extension/workflow-monitor/workflow-next-command.test.ts
git commit -m "feat: preserve workflow state across workflow-next"
```

### Task 4: Implement state-file rename with legacy fallback

**Type:** code
**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `extensions/workflow-monitor.ts`
- Test: `tests/extension/workflow-monitor/state-persistence.test.ts`

**Step 1: Update state file path helpers**

In `extensions/workflow-monitor.ts`:
- change `getStateFilePath()` to return `.pi/workflow-kit-state.json`
- add a legacy-path helper for `.pi/superpowers-state.json` if needed
- update `reconstructState()` to check new path first, then legacy path

**Step 2: Keep persistence write path singular**

Ensure `persistState()` writes only the new path and does not continue writing the legacy file.

**Step 3: Run targeted tests**

Run: `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`
Expected: PASS

**Step 4: Verify no unintended regressions in reconstruction logic**

Confirm the existing session-entry reconstruction behavior still works when no file exists.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/state-persistence.test.ts
git commit -m "refactor: rename workflow state file"
```

### Task 5: Update user-facing docs for the new workflow-next contract

**Type:** non-code

**Files:**
- Modify: `README.md`
- Modify: `docs/developer-usage-guide.md`
- Modify: `docs/workflow-phases.md`

**Acceptance criteria:**
- Criterion 1: `/workflow-next` docs describe immediate-next-only handoff semantics.
- Criterion 2: docs mention that the command preserves prior completed workflow history for the same feature.
- Criterion 3: docs do not claim arbitrary phase jumps are supported.

**Implementation notes:**
- Keep examples aligned with allowed transitions only.
- Mention the stricter behavior near existing `/workflow-next` examples rather than adding a long new section.
- If the local state file is mentioned anywhere, rename it to `.pi/workflow-kit-state.json`.

**Verification:**
- Review each acceptance criterion one-by-one.
- Confirm wording matches the implemented behavior and test coverage.

### Task 6: Run focused verification and capture final status

**Type:** code
**TDD scenario:** Trivial change — use judgment

**Files:**
- Modify: `docs/plans/2026-04-09-workflow-next-handoff-state-implementation.md`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts`
- Test: `tests/extension/workflow-monitor/state-persistence.test.ts`

**Step 1: Run focused verification**

Run:
- `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
- `npx vitest run tests/extension/workflow-monitor/state-persistence.test.ts`

Expected: PASS

**Step 2: Run a broader confidence check**

Run: `npx vitest run tests/extension/workflow-monitor`
Expected: PASS

**Step 3: Update the implementation plan artifact with verification notes if useful**

Add a short note under the plan or in a small completion section summarizing which test commands passed.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-09-workflow-next-handoff-state-implementation.md
git commit -m "test: verify workflow-next handoff changes"
```
