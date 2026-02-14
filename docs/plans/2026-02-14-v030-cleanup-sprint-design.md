# v0.3.0 Cleanup Sprint — Biome + Code Review Debt

Date: 2026-02-14

## Goal

Single batch that resolves all Biome lint warnings and all 10 code-review debt items from Phase 1 and Phase 2 reviews. Result: clean lint, no known false-positive warnings in daily TDD/debug workflow, test suite remains green.

## Scope

### Part A: Biome Lint Cleanup

20 issues total:
- **16 × `noExplicitAny`** — selectively suppress with `// biome-ignore` + justification where the `any` comes from pi SDK boundaries (e.g. `event.input`, handler signatures). Fix the rest with proper types (`unknown`, `Record<string, unknown>`, etc.).
- **3 × `useTemplate`** — auto-fix with `biome check --write --unsafe`.
- **1 × `noNonNullAssertion`** — replace with optional chain or guard.

### Part B: Code Review Debt

#### Logging review (3 items from `logging-review-fixes.md`)

| # | Item | Status | Action |
|---|------|--------|--------|
| L1 | Replace brittle source-inspection tests | **Open** — `readFileSync` pattern was removed but need to verify behavioral mocks exist | Audit the 3 error-handling test files; add missing behavioral assertions if any |
| L2 | Log rotation time-based check | **Done** — `lastRotationCheck` + `rotationCheckInterval` already in `logging.ts` | Verify test coverage exists; close |
| L3 | Message truncation + sync I/O docs | **Done** — `truncateMessage()` + JSDoc on `write()` already in `logging.ts` | Verify test coverage exists; close |

#### Phase 2 review (7 items from `phase2-code-review-findings.md`)

| # | Item | Severity | Action |
|---|------|----------|--------|
| P1 | `source-during-red` false-positives | Critical | **Redesign** — add `red-pending` phase (see below) |
| P2 | DebugMonitor conflicts with TDD | Critical | **Redesign** — DebugMonitor defers when TDD is active (see below) |
| P3 | Investigation detection gaps | Important | Expand investigation signals to include `definition`, `references`, `hover`, `symbols` LSP actions and `kota_search`/`kota_deps`/`kota_usages` tool calls |
| P4 | Excessive fix attempts off-by-one | Important | Increment `fixAttempts` on source-write-then-fail cycle; display "N failed attempts so far" not "attempt #N" |
| P5 | Warning injection overwrites content | Minor | **Already fixed** — line 558 uses spread. Close. |
| P6 | Unused `handleBashInvestigation` API | Minor | Keep — used in tests and provides API for future bash-event wiring. Add `@internal` JSDoc. |

#### Phase 1 deferred (carried forward)

| # | Item | Action |
|---|------|--------|
| D4 | Duplicate regex in heuristics | Deduplicate `TEST_PATTERNS` — remove overlapping `/test/` entries |
| D5 | Generic pass-pattern false positives | Tighten `/\bpassed\b/i` — require numeric prefix like `/\d+\s+(tests?\s+)?passed/i` |

---

## TDD Monitor Redesign: `red-pending` Phase

### Current state machine

```
idle → red (on test-file write) → green (on test pass) → refactor (on source write) → green (on test pass)
                                                                                     └→ idle (on commit)
```

Problem: `red` persists after tests are run and fail. Editing source to make the test pass triggers `source-during-red`.

### New state machine

```
idle → red-pending (on test-file write)
red-pending → red (on first test run, regardless of pass/fail)
red → green (on test pass)
green → refactor (on source write)
refactor → green (on test pass)
any → idle (on commit)
```

Key change: **`source-during-red` only fires in `red-pending`** — i.e., you wrote a test but haven't run it yet. Once you've run the test (even if it fails), you're in `red` and source edits are allowed (you're making it pass).

Implementation:
- Add `"red-pending"` to `TddPhase` union type.
- `onFileWritten(testFile)` → set phase to `"red-pending"`, set `redVerificationPending = true`.
- `onFileWritten(sourceFile)` + phase `"red-pending"` → return `source-during-red` violation.
- `onTestResult(passed)`:
  - If `red-pending` → transition to `red`, clear `redVerificationPending`.
  - If `red` and passed → transition to `green`.
  - If `refactor` and passed → transition to `green`.
- `onFileWritten(sourceFile)` + phase `"red"` → **allowed** (no violation). Transition to `red` stays.
- Warning text update: "Run your new test before editing source code" (instead of current "Don't edit source while tests are failing").

### DebugMonitor + TDD interaction

Rule: **DebugMonitor only activates when TDD monitor is idle.**

Implementation in `workflow-handler.ts`:
- `onTestFailed()`: check `tddMonitor.getPhase()`. If not `idle`, skip `debugMonitor.onTestFailed()`.
- This means: during active TDD (red-pending/red/green/refactor), test failures are TDD's domain. DebugMonitor only activates for surprise failures outside TDD flow.

---

## Investigation Detection Expansion

Current: regex patterns on bash commands + `read` tool.

Add recognition for:
- **LSP tool calls**: `definition`, `references`, `hover`, `symbols` actions.
- **Kota tool calls**: `kota_search`, `kota_deps`, `kota_usages`, `kota_impact`.
- **Browser tool**: `browser` with `get` subcommand (reading page content).
- **Search tools**: `web_search`, `fetch_content`.

Implementation: add `isInvestigationToolCall(toolName: string, params?: unknown): boolean` alongside existing `isInvestigationCommand()`.

---

## Fix Attempt Counter Fix

Current: increments on fail-after-edit, but reports on next edit. "Attempt #3" is actually attempt #4.

Fix:
- Display: "You've had N failed fix attempts so far" (using the counter value directly).
- Threshold stays at 3 — fires when `fixAttempts >= 3` on source write.
- Warning copy: "3 fix attempts haven't resolved the issue. Consider stepping back to investigate root cause."

---

## Test Plan

- All existing tests pass (no regressions).
- New tests for:
  - `red-pending` → `red` transition on test run.
  - Source edit allowed in `red` (after test run), blocked in `red-pending`.
  - DebugMonitor silent when TDD phase ≠ idle.
  - Investigation detection for LSP/kota tool calls.
  - Fix attempt counter displays correct number.
  - Biome check exits with 0 warnings.

## Out of Scope

- Session persistence (v0.3.0 item 5 — separate work).
- Security audit (v0.3.0 item 3 — separate work).
- Subagent hardening (v0.3.0 item 4 — separate work).
- Error surfacing review (v0.3.0 item 6 — separate work).
