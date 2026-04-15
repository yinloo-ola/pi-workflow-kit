# Bash Guard for Workflow Guard Extension

## Problem

`workflow-guard.ts` blocks `write`/`edit` outside `docs/plans/` during brainstorm and plan phases, but ignores `bash` entirely. The LLM can mutate files via bash (e.g. `echo "..." > file.ts`, `sed -i`, `tee`, heredocs).

## Design

Adopt the `isSafeCommand()` approach from [pi-mono plan-mode example](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/plan-mode/utils.ts).

### Approach

**No changes to `pi.setActiveTools()`** — `write`/`edit` remain active so the existing path-based `tool_call` guard continues to allow writes to `docs/plans/`.

**Add a bash guard** in the existing `tool_call` handler using `isSafeCommand()`:
- Copy SAFE_PATTERNS and DESTRUCTIVE_PATTERNS from the example's `utils.ts` as-is
- Copy `isSafeCommand()` logic as-is
- In the `tool_call` handler, when phase is set and tool is `bash`, check `isSafeCommand(event.input.command)`
- Block with reason if not safe
- Notify via `ctx.ui.notify()` when blocking

### Changes

1. **`extensions/workflow-guard.ts`**
   - Add `isSafeCommand()` function (copied from example, with DESTRUCTIVE_PATTERNS and SAFE_PATTERNS)
   - Extend `tool_call` handler to also intercept `bash` when phase is set
   - Check `event.input.command` against `isSafeCommand()`
   - Block and notify if unsafe

2. **`tests/workflow-guard.test.ts`**
   - Add tests for bash guard: safe commands pass, destructive commands blocked, redirects blocked
   - Import and test `isSafeCommand` directly (it's a pure function, easy to unit test)

### What stays the same

- Phase detection via `/skill:` commands (no change)
- `write`/`edit` path-based blocking for `docs/plans/` (no change)
- `docs/plans/` write exception (no change)
- No `pi.setActiveTools()` usage
