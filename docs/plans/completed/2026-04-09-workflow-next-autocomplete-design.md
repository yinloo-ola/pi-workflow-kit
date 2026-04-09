# /workflow-next Autocomplete Design

Date: 2026-04-09

## Summary

Add argument autocomplete to the `/workflow-next` extension command so the workflow phase is easier to enter and the optional artifact argument is easier to discover.

The command should support:
- phase autocomplete for `brainstorm`, `plan`, `execute`, and `finalize`
- workflow-aware artifact suggestions after a valid phase is entered
- strict phase-to-artifact mapping:
  - `plan` → `docs/plans/*-design.md`
  - `execute` → `docs/plans/*-implementation.md`
  - `finalize` → `docs/plans/*-implementation.md`
  - `brainstorm` → no artifact suggestions

This is a UX-only improvement. It must not change workflow tracking, session creation, or `/workflow-next` validation behavior.

## Goals

- Make `/workflow-next` faster and less error-prone to use
- Surface valid workflow phases directly in slash-command autocomplete
- Suggest likely plan artifacts without requiring users to remember exact filenames
- Keep runtime behavior unchanged outside command completion

## Non-goals

- Infer suggestions from workflow tracker state
- Change `/workflow-next` command semantics or validation
- Add artifact suggestions for `brainstorm`
- Implement broad filesystem completion beyond workflow-specific plan artifacts

## Recommended Approach

Keep command registration in `extensions/workflow-monitor.ts`, but extract completion logic into a focused helper module, e.g.:

- `extensions/workflow-monitor/workflow-next-completions.ts`

This helper should be stateless and filesystem-based. It should accept the raw argument prefix and return command completion items using pi's `getArgumentCompletions` hook.

This keeps the command registration simple while making the completion logic independently testable and easier to maintain than inline logic inside the already-large workflow monitor extension.

## Architecture

### Command registration

The existing `/workflow-next` command remains the single public entry point.

Enhance its registration with `getArgumentCompletions(prefix)`.

Responsibilities stay split as follows:
- `handler(args, ctx)` remains the source of truth for execution and validation
- `getArgumentCompletions(prefix)` provides UX hints only
- completion helper handles parsing, matching, and file discovery

### Completion helper

The helper module should expose a small API, such as:
- a list of valid workflow phases
- a function that returns completion items for a raw argument prefix

Internally it should:
1. determine whether the user is completing the first argument or second argument
2. return filtered phase suggestions when completing the first argument
3. after an exact valid phase is present, return artifact suggestions based on strict phase mapping
4. return `null` when no suggestions are appropriate

## Components

### 1. Phase completion

Supported phases:
- `brainstorm`
- `plan`
- `execute`
- `finalize`

Behavior:
- empty prefix returns all phases
- partial first token returns phases filtered by prefix
- invalid first token still returns matching phase suggestions when possible
- phase completion applies only to the first argument

### 2. Artifact completion

Artifact suggestions activate only after the first token exactly matches a valid phase and the user begins the second argument.

Strict mapping:
- `plan` → only files under `docs/plans/` ending in `-design.md`
- `execute` → only files under `docs/plans/` ending in `-implementation.md`
- `finalize` → only files under `docs/plans/` ending in `-implementation.md`
- `brainstorm` → no artifact suggestions

Returned suggestions should use relative paths such as:
- `docs/plans/2026-04-09-feature-design.md`
- `docs/plans/2026-04-09-feature-implementation.md`

### 3. Filesystem discovery

Artifact completion should scan `docs/plans/` in the current working directory and filter matching filenames by suffix and typed prefix.

The logic should be conservative:
- if `docs/plans/` does not exist, return `null`
- if no files match the required suffix, return `null`
- if a typed artifact prefix narrows the set, return only matching entries

No workflow-state coupling is needed.

## Data flow

1. User types `/workflow-next ...`
2. pi invokes `getArgumentCompletions(prefix)` for the command
3. the completion helper parses the raw argument prefix
4. helper decides between phase mode and artifact mode
5. helper returns:
   - phase suggestions, or
   - matching artifact path suggestions, or
   - `null`
6. user selects a suggestion
7. existing `/workflow-next` handler runs unchanged when the command is submitted

This preserves a clean separation: autocomplete assists input, while the handler remains authoritative for correctness.

## Error handling

The completion path should fail quietly.

Expected behavior:
- missing `docs/plans/` → no suggestions
- unreadable directory or filesystem error → no suggestions
- `brainstorm` second argument → no suggestions
- invalid phase token → stay in phase suggestion mode instead of trying artifact inference

The command handler should continue to enforce valid usage and show the existing error message for invalid submitted phases.

## Testing strategy

Add focused tests around `/workflow-next` command registration and completion behavior.

Primary test coverage:
- no args returns all four phases
- partial phase like `pl` returns `plan`
- `plan ` suggests only `docs/plans/*-design.md`
- `execute ` suggests only `docs/plans/*-implementation.md`
- `finalize ` suggests only `docs/plans/*-implementation.md`
- `brainstorm ` returns no artifact suggestions
- artifact prefix filtering works for partial paths
- invalid first token stays in phase-suggestion mode
- missing `docs/plans/` returns `null`
- no matching files returns `null`

Implementation detail for tests:
- extend `tests/extension/workflow-monitor/workflow-next-command.test.ts`
- capture the registered command object, not just the handler
- create temporary `docs/plans/` fixtures in a temp cwd
- assert returned completion items directly

## Risks and trade-offs

### Chosen trade-off

Use strict workflow-specific suggestions instead of broad generic path completion.

Benefits:
- better guidance for the intended workflow
- faster selection of the right artifact files
- lower cognitive load for users

Cost:
- more custom logic than plain phase-only completion
- artifact matching rules must stay aligned with workflow naming conventions

### Why not use workflow state

State-aware suggestions could be smarter, but they would add coupling to session state and create more edge cases. For this improvement, filesystem-based suggestions are sufficient and easier to reason about.

## Acceptance criteria

- `/workflow-next` autocompletes phase names
- after a valid phase, artifact suggestions follow the strict mapping above
- suggestions are filtered by the typed prefix
- `brainstorm` does not suggest artifacts
- invalid submitted phases are still rejected by the handler
- existing `/workflow-next` behavior is otherwise unchanged
