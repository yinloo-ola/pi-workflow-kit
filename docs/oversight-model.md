# Oversight Model

`pi-workflow-kit` combines **skills** and **one extension**.

## Skills

Skills teach the agent the workflow. There are 4:

- **brainstorming** — explore ideas, produce a design doc
- **writing-plans** — break design into TDD tasks
- **executing-tasks** — implement tasks, handle code review
- **finalizing** — archive docs, create PR

They explain *what* to do and *when* to do it.

## Extension

The `workflow-guard` extension enforces one rule:

> During brainstorm and plan phases, `write` and `edit` are **hard-blocked** outside `docs/plans/`.

The agent can still use `read` and `bash` for investigation. It literally cannot call `write` or `edit` on source files — the tools are blocked at the extension level.

## Enforcement style

Hard block for write boundaries. No warnings, no escalation, no prompts. Either the tool call is allowed or it's blocked.

TDD, debugging, and code review are guidance in the skill instructions, not runtime-enforced.
