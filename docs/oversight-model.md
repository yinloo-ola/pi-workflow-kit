# Oversight Model

`pi-superpowers-plus` combines **skills** and **extensions**.

## Skills

Skills teach the agent the intended workflow:

- `brainstorming`
- `writing-plans`
- `executing-tasks`
- supporting skills such as TDD, debugging, worktrees, and review handling

They explain *what* to do and *when* to do it.

## Extensions

Extensions observe runtime behavior and add lightweight enforcement:

- **workflow-monitor** tracks workflow phase, injects TDD/debug/verification warnings, and prompts at phase boundaries
- **plan-tracker** stores per-task execution state, including task type, phase, and attempt counts
- **subagent** runs isolated helper agents for implementation and review work

## Enforcement style

The package is intentionally **warning-first**.

- TDD violations are injected into tool results as warnings
- Debug guardrails escalate after repeated failing cycles
- Verification checks warn on `git commit`, `git push`, and `gh pr create` when passing tests have not been run recently
- During brainstorm and plan, writes outside `docs/plans/` trigger process warnings and may escalate to an interactive stop in the TUI

In interactive sessions, repeated violations can trigger a human decision prompt.

## Workflow model

Global workflow phases:

```text
brainstorm → plan → execute → finalize
```

Inside **execute**, each task follows the per-task lifecycle tracked by `plan_tracker`:

```text
define → approve → execute → verify → review → fix
```

This keeps global workflow tracking simple while still reflecting the real per-task feedback loop.
