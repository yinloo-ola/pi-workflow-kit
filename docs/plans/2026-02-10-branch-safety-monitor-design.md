# Branch Safety Monitor Design

> **Date:** 2026-02-10
> **Context:** Identified during skill blindspot work. Users forget to check/switch branches before starting work. The agent should surface this automatically.

## Problem

Users start sessions on stale or wrong branches — old feature branches, main, whatever was left from the last session. Edits happen before anyone notices. Skills can't solve this because the user might not invoke a skill before making changes.

## Solution

Two-layer branch awareness in the workflow-monitor extension:

### Layer 1: Session Start Notice

On `session_start` / `session_switch` / `session_fork`, inject a notice into the first tool result of the session:

```
📌 Current branch: `fix/old-thing`
```

Purely informational. No interruption. Gives the agent and user early awareness of where they are.

### Layer 2: First Write Gate

On the first `write` or `edit` tool call of a session (before any file has been modified), inject a stronger warning:

```
⚠️ First write of this session. You're on branch `fix/old-thing`.
Confirm with the user this is the correct branch before continuing, or create a new branch/worktree.
```

This fires once per session. After the first write, set `branchConfirmed = true` and don't prompt again.

## Implementation

### State

Add to the workflow-monitor's module-level state (alongside `pendingViolation`, etc.):

```typescript
let branchNoticeShown = false;   // Layer 1: has session start notice been shown?
let branchConfirmed = false;      // Layer 2: has first-write gate fired?
```

Reset both to `false` on `session_start`, `session_switch`, `session_fork`, `session_tree` (same events that already reset TDD state).

### Layer 1: Session Start Notice

In the `tool_result` handler, before any other processing:

```typescript
if (!branchNoticeShown) {
  branchNoticeShown = true;
  const branch = execSync('git branch --show-current').toString().trim();
  // Prepend notice to the tool result content
  // "📌 Current branch: `<branch>`"
}
```

This fires on the very first tool result of the session, regardless of tool type.

### Layer 2: First Write Gate

In the `tool_call` handler, when `toolName` is `write` or `edit`:

```typescript
if (!branchConfirmed) {
  branchConfirmed = true;
  const branch = execSync('git branch --show-current').toString().trim();
  // Set pending branch warning (similar to pendingViolation pattern)
  // Inject into tool_result:
  // "⚠️ First write of this session. You're on branch `<branch>`.
  //  Confirm with the user this is the correct branch before continuing,
  //  or create a new branch/worktree."
}
```

### Edge Cases

- **Not a git repo:** Skip both layers silently. `git branch --show-current` will fail — catch and ignore.
- **Detached HEAD:** Show the short SHA instead of branch name.
- **Session forks:** Reset state so the new fork gets its own notice + gate.

## Finish Phase: Documentation + Learnings Prompt

Separate from branch safety but identified in the same session. The workflow-monitor should prompt at the finish phase boundary (similar to existing boundary prompts):

When transitioning to the finish phase, inject a reminder:

```
Before finishing:
- Does this work require documentation updates? (README, CHANGELOG, API docs, inline docs)
- What was learned during this implementation? (surprises, codebase knowledge, things to do differently)
```

This reinforces the Step 1.5 added to `finishing-a-development-branch` skill, ensuring it happens even if the skill text is skimmed.

### Where it fits

The workflow-monitor already has boundary prompting in `agent_end`. The finish phase prompt would be added to `workflow-transitions.ts` as part of the transition prompt for the `execution_complete` or `verification_passed` boundary.

## Scope

- Branch safety (Layer 1 + Layer 2) is the primary feature
- Finish phase prompt is a small addition to existing boundary prompting
- Both are enforcement of guidance that already exists in skills — the monitor just makes sure it's not skipped
