# Oversight Model

`pi-workflow-kit` combines **skills** and **one extension**.

## Skills

Skills teach the agent the workflow. There are 4:

- **pwk-brainstorming** — explore ideas, produce a design doc with a Features table
- **pwk-writing-plans** — plan one feature at a time from the Features table
- **pwk-executing-tasks** — implement tasks, mark features done, loop to next feature
- **pwk-finalizing** — archive docs, create PR

Plus 3 on-demand skills:

- **pwk-design-review** — audit a plan doc for production risks (triggered by writing-plans)
- **pwk-verify** — post-implementation verification with security, optimization, and traceability passes
- **pwk-diagnose** — 6-phase debugging loop

They explain *what* to do and *when* to do it.

## Extension

The `workflow-guard` extension enforces one rule:

> During brainstorm, plan, and verify phases, `write` and `edit` are **hard-blocked** outside `docs/plans/`.

The agent can still use `read` and `bash` for investigation. It literally cannot call `write` or `edit` on source files — the tools are blocked at the extension level.

## Enforcement style

Hard block for write boundaries. No warnings, no escalation, no prompts. Either the tool call is allowed or it's blocked.

TDD, debugging, and code review are guidance in the skill instructions, not runtime-enforced.
