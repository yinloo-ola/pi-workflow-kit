# TDD Enforcement Redesign

**Date:** 2026-02-20
**Status:** Design Complete
**Branch:** feat/tdd-enforcement-redesign

## Problem

The current TDD enforcement system has three layers — hard runtime blocks (`tdd-guard.ts`), violation escalation (`tdd-monitor` + `workflow-monitor`), and skill prompt text — but none work well together:

1. **Hard blocks cause false positives.** `tdd-guard.ts` blocks all non-test file writes until tests have run in the session. A one-line fix to well-tested code gets the same block as a brand new feature.
2. **Warnings get ignored.** The agent ignores runtime warnings and escalation, so the complexity adds friction without changing behavior.
3. **Skill text is too rigid.** The TDD skill treats every change as "write a failing test first, no exceptions," which doesn't match reality.
4. **Critical guidance was moved behind `workflow_reference`.** Red flags, rationalizations, verification checklists, and detailed phase instructions were removed from inline skill text and put behind on-demand calls the agent never makes.
5. **Verification monitor interrupts execution.** The workflow-monitor prompts "skip verification?" during plan execution, breaking flow.

## Design

### 1. TDD Guard → Warnings Only

**Remove:**
- `tdd-guard.ts` — delete entirely (hard blocker)
- Escalation logic in `workflow-monitor.ts` — `maybeEscalate("practice", ...)` calls for TDD violations
- `pendingViolations` map and repeat-violation ramp-up logic
- `formatViolationWarning` for TDD violation types

**Keep:**
- `TddMonitor` class and phase tracking (RED → GREEN → REFACTOR)
- TUI phase widget display

**Change:**
- When `TddMonitor` detects a violation (`source-before-test`, `source-during-red`), inject a **short warning** into the tool result. 1-2 sentences. No escalation, no blocking.
- Same behavior for main agent and subagents.

**Warning format:**
```
⚠️ TDD: Writing source code before tests. Consider whether this change needs a failing test first, or if existing tests already cover it.
```

### 2. TDD Skill Text Upgrade

Replace the current rigid "always write a failing test first" with three scenarios:

**Scenario 1 — New feature / new file:**
Full TDD cycle. Write a failing test, make it pass, refactor. No shortcuts.

**Scenario 2 — Modifying code with existing tests:**
Run existing tests first to confirm green. Make the change. Run tests again. If the change isn't covered by existing tests, add a test. If it is, done.

**Scenario 3 — Trivial change (typo, config, rename):**
Use judgment. If relevant tests exist, run them after. Don't write a new test for a string change.

**Interpreting warnings:**
Add a section teaching the agent: "If you see a `source-before-test` warning, pause and consider which scenario applies. If existing tests cover your change, run them and proceed. If not, write a test first."

### 3. Restore Critical Inline Skill Content

The following content was moved to `workflow_reference` but must come back inline because the agent doesn't proactively call `workflow_reference`:

**TDD skill — restore:**
- Red flags / stop triggers (patterns that indicate you're skipping TDD)
- Rationalizations table with rebuttals (counters to "I'll add tests later")
- Verification checklist (every function has a test, watched each fail, etc.)
- Detailed phase instructions (each phase needs a paragraph, not one line)

**Systematic debugging skill — restore:**
- Red flags — "STOP and Follow Process" list
- Common rationalizations table
- Multi-component diagnostic example

**Verification skill — restore:**
- Common Failures table (claim → requires → not sufficient)
- Rationalization Prevention table
- "When To Apply" trigger list

**Keep `workflow_reference` as supplemental** — the agent can still call it for examples and deep-dive content, but the critical guardrails are always visible in the prompt.

### 4. Subagent TDD Prompt Injection

When the subagent extension dispatches an implementation subagent, auto-append a condensed TDD instruction block to the task description:

```
## TDD Requirements
- New files: write a failing test first, then implement.
- Modifying existing code: run existing tests first, make your change, run tests again. Add tests if the change isn't covered.
- Trivial changes: run relevant tests after if they exist.
- If you see a ⚠️ TDD warning, pause and decide which scenario applies before proceeding.
```

This is appended automatically — the orchestrator doesn't need to remember. Non-implementation subagents (review, docs, analysis) see the text but it's short enough to be irrelevant noise.

### 5. Writing-Plans TDD Scenario Hints

The plan template adds a TDD scenario hint to each implementation task:

```markdown
### Task 3: Add rate limiting to API handler
**TDD scenario:** New feature — full TDD cycle
**Files:** src/api/rate-limiter.ts (new), tests/api/rate-limiter.test.ts (new)

### Task 4: Fix off-by-one in pagination
**TDD scenario:** Modifying tested code — run existing tests first
**Files:** src/api/pagination.ts, tests/api/pagination.test.ts (exists)
```

This gives the implementer (main agent or subagent) upfront context on whether to write new tests or lean on existing coverage. No runtime heuristics needed.

### 6. Subagent-Driven Skill Update

Update the TDD integration section from:
> TDD - Failing test first for all production code (enforced by workflow-monitor, instructions in implementer prompt)

To:
> TDD - Runtime warnings on source-before-test patterns. Implementer subagents receive TDD instructions via auto-injected prompt. Three scenarios: new feature (full TDD), modifying tested code (run existing tests), trivial change (judgment call).

### 7. Verification Monitor — Suppress During Execution

**Problem:** The workflow-monitor prompts "skip verification?" during plan execution, interrupting flow. Task-level verification (run tests after implementing) is handled by the agent within the plan — that's fine. The workflow-monitor's own skip-confirmation gate is the problem.

**Fix:** When a plan is being executed (detected via plan_tracker state or subagent execution context), the workflow-monitor suppresses its verification prompts. Prompts only fire after execution completes.

**Implementation:** Add a flag check in the verification prompt path:
- If plan execution is in progress → suppress prompt, default to verification ON
- If plan execution is complete → prompt as normal (once, at the end)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `extensions/tdd-guard.ts` | **Delete** | Hard blocker removed entirely |
| `extensions/workflow-monitor.ts` | **Modify** | Remove TDD escalation logic, add execution-aware verification suppression |
| `extensions/workflow-monitor/tdd-monitor.ts` | **Modify** | Keep phase tracking, change violations to short warnings only |
| `extensions/workflow-monitor/warnings.ts` | **Modify** | Simplify TDD warning text, remove escalation messages |
| `skills/test-driven-development/SKILL.md` | **Rewrite** | Three scenarios, restore red flags/rationalizations/checklist, warning interpretation |
| `skills/systematic-debugging/SKILL.md` | **Modify** | Restore red flags, rationalizations, diagnostic example |
| `skills/verification-before-completion/SKILL.md` | **Modify** | Restore common failures, rationalization prevention, trigger list |
| `skills/subagent-driven-development/SKILL.md` | **Modify** | Update TDD integration section |
| `skills/writing-plans/SKILL.md` | **Modify** | Add TDD scenario hint to plan template |
| `extensions/subagent/` | **Modify** | Add auto-injection of TDD prompt to implementation subagent tasks |

## Testing

- Verify main agent can write source files without being blocked
- Verify warnings appear on source-before-test writes
- Verify subagents receive TDD instructions in task descriptions
- Verify verification monitor does not prompt during plan execution
- Verify verification monitor prompts once after execution completes
- Verify TUI phase widget still displays correctly
- Manual: run a small fix workflow and confirm no false-positive friction
- Manual: run a new feature workflow and confirm full TDD cycle guidance works
