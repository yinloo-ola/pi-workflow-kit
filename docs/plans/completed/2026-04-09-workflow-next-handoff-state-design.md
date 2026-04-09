# /workflow-next Handoff State Design

Date: 2026-04-09
Status: approved

## Summary

Fix `/workflow-next` so that, for the same feature, a fresh handoff session preserves prior completed workflow history instead of showing earlier phases as `pending` again.

The command should become a strict forward-only handoff for the immediate next phase. It must not allow same-phase handoff, backward handoff, or direct jumps across multiple phases.

## Problem

Today `/workflow-next` creates a new session and pre-fills the editor with the next skill, but it does not explicitly seed the new session with a derived workflow state for the same feature.

As a result, the new session may start from an empty workflow tracker state:

- `brainstorm: pending`
- `plan: pending`
- `execute: pending`
- `finalize: pending`

When the prefilled skill is then detected, the tracker advances only to the requested phase. Earlier phases remain `pending`, even when they were already completed in the previous session.

## Goals

- Preserve prior completed workflow phases across `/workflow-next` handoff for the same feature.
- Preserve earlier-phase artifact paths and prompted flags.
- Keep TDD, debug, and verification state fresh in the new session.
- Make `/workflow-next` a strict immediate-next handoff command.
- Reject invalid handoffs before creating a new session.
- Rename the persisted state file to reflect current naming.

## Non-goals

- Allow arbitrary phase switching.
- Allow skipping phases through `/workflow-next`.
- Carry over TDD/debug/verification runtime state into the new session.
- Change the existing slash-command UX beyond stricter validation and correct state seeding.

## Decisions

### 1. Preserve derived workflow-only state

When `/workflow-next <phase>` is used for the same feature, the new session will receive a derived workflow snapshot.

Rules:

- all phases before the requested phase are `complete`
- the requested phase is `active`
- all phases after the requested phase are `pending`
- `currentPhase` is the requested phase
- earlier-phase artifacts are preserved
- earlier-phase prompted flags are preserved

This snapshot is derived from the current workflow state, not reconstructed from filenames alone.

### 2. Do not preserve execution-local monitor state

The new session must start with fresh:

- TDD state
- debug state
- verification state

Only workflow lineage is preserved.

### 3. `/workflow-next` is immediate-next only

Allowed transitions:

- `brainstorm -> plan`
- `plan -> execute`
- `execute -> finalize`

Only when the current phase status is exactly `complete`.

Disallowed transitions:

- same-phase handoff
- backward handoff
- direct jumps such as `brainstorm -> execute` or `plan -> finalize`
- moving forward when the current phase is `pending`, `active`, or `skipped`

Skipped phases do not qualify for `/workflow-next`.

### 4. Hard-fail invalid handoffs

Invalid requests must show an error and stop before opening a new session.

Examples:

- `Cannot hand off to execute from brainstorm. /workflow-next only supports the immediate next phase.`
- `Cannot hand off to plan because brainstorm is not complete.`
- `Cannot hand off to plan from plan. Use /workflow-reset for a new task or continue in this session.`

### 5. Rename persisted state file

Rename the local state file from:

- `.pi/superpowers-state.json`

To:

- `.pi/workflow-kit-state.json`

Migration behavior:

- reconstruction first checks `.pi/workflow-kit-state.json`
- if absent, it falls back to `.pi/superpowers-state.json`
- persistence writes only `.pi/workflow-kit-state.json`

This preserves compatibility for existing users while moving to clearer naming.

## Proposed implementation

## Helper module

Add a small helper module under `extensions/workflow-monitor/`, for example:

- `workflow-next-state.ts`

Responsibilities:

### `validateNextWorkflowPhase(currentState, requestedPhase)`

Input:

- current workflow state
- requested target phase

Behavior:

- require a current phase to exist
- require the requested phase to be the immediate next phase
- require `currentState.phases[currentState.currentPhase] === "complete"`
- return either success or a precise error message

### `deriveWorkflowHandoffState(currentState, requestedPhase)`

Input:

- current workflow state
- requested target phase

Behavior:

- produce a new workflow snapshot for the handoff session
- mark prior phases `complete`
- mark the requested phase `active`
- leave later phases `pending`
- preserve artifacts and prompted flags for earlier phases
- set `currentPhase` to the requested phase

## `/workflow-next` handler changes

Update `extensions/workflow-monitor.ts` so the handler:

1. parses `phase` and optional artifact path
2. validates the phase value against the known set
3. reads `handler.getWorkflowState()`
4. calls `validateNextWorkflowPhase(...)`
5. if invalid, notifies with an error and returns
6. creates the new session
7. seeds the new session with a fresh snapshot containing:
   - derived `workflow`
   - default `tdd`
   - default `debug`
   - default `verification`
8. pre-fills the editor text as today

The prefilled text remains useful, but the session no longer depends on skill detection to reconstruct earlier history.

## Persistence flow

### Current

State is persisted in two places:

- session custom entry (`superpowers_state`)
- local JSON file under `.pi/`

### New behavior

Keep the same general persistence model, but:

- continue using the full snapshot shape for session persistence
- write the renamed local file
- allow reconstruction from either the new or legacy filename

## Testing

Add or update tests for:

### Workflow-next validation

- allows `brainstorm -> plan` only when `brainstorm` is `complete`
- allows `plan -> execute` only when `plan` is `complete`
- allows `execute -> finalize` only when `execute` is `complete`
- rejects same-phase handoff
- rejects backward handoff
- rejects direct jumps
- rejects handoff when current phase is `active`
- rejects handoff when current phase is `pending`
- rejects handoff when current phase is `skipped`

### Derived state

- preserves prior completed phases in the new session
- preserves artifacts for earlier phases
- preserves prompted flags for earlier phases
- marks requested phase `active`
- leaves later phases `pending`
- resets TDD/debug/verification state in the new session

### State-file migration

- `getStateFilePath()` returns `.pi/workflow-kit-state.json`
- reconstruction reads the new file when present
- reconstruction falls back to `.pi/superpowers-state.json` when the new file is absent
- persistence writes only the new filename

## Risks and mitigations

### Risk: session seeding API constraints

Depending on the pi session API, the new session may not directly expose a way to append a custom state entry before user submission.

Mitigation:

- if direct session seeding is supported, use it
- otherwise encode the derived workflow state into the handoff path using the existing persistence/reconstruction mechanism with minimal, well-scoped changes
- verify behavior with an integration test around `/workflow-next`

### Risk: invalidating existing expectations

Tests and current behavior explicitly allow advancing to a later phase from empty state without backfilling earlier phases.

Mitigation:

- limit the stricter semantics to `/workflow-next`
- keep generic workflow tracker behavior unchanged unless a separate design chooses otherwise

## Acceptance criteria

- Using `/workflow-next` for the immediate next phase of the same feature preserves prior completed phases in the fresh session.
- Earlier completed phases do not regress to `pending` in the new session.
- Artifacts and prompted flags for earlier phases are preserved.
- TDD/debug/verification state is fresh in the new session.
- Same-phase, backward, and direct-jump handoffs are rejected.
- The local state file is renamed to `.pi/workflow-kit-state.json` with fallback support for the legacy filename.
