# Oversight Model

`pi-workflow-kit` combines **skills** and **one extension**.

## Skills

Skills teach the agent the workflow. There are 5 pipeline skills:

- **pwk-brainstorming** — explore ideas, produce a descriptive design doc that opens with a `## Requirements` list
- **pwk-writing-plans** — turn each requirement into acceptance criteria + integration-test cases (a behavioral spec, no implementation code)
- **pwk-executing-tasks** — implement requirement-by-requirement, test-first, with two mandatory human checkpoints per requirement
- **pwk-code-review** — after each requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check
- **pwk-finalizing** — archive the design's planning docs (per-topic), curate lessons, update docs, create PR or merge

Plus 2 on-demand skills:

- **pwk-status** — read-only overview of all active design topics (phase + progress), for resuming or juggling parallel designs
- **pwk-diagnose** — 6-phase debugging loop, invoked anytime something is broken

They explain *what* to do and *when* to do it. Phase control is manual — you invoke each skill with `/skill:`; the agent never advances on its own.

## Extension

The `workflow-guard` extension enforces one rule:

> During brainstorm and plan phases, `write` and `edit` are **hard-blocked** outside `docs/plans/`.

The agent can still use `read` and `bash` for investigation. During those gated phases, `bash` is governed by a simple destructive-command blacklist (`rm`, `>`, `git commit`, `npm install`, in-place editors, etc.) — a command is allowed unless it matches a destructive pattern. A short phase reminder is shown once when the gated phase begins so the model self-restricts.

During executing-tasks, code-review, and finalizing, nothing is restricted.

## Enforcement style

Hard block for write boundaries during gated phases. No warnings, no escalation, no prompts. Either the tool call is allowed or it's blocked.

TDD, checkpoints, debugging, and code review are guidance in the skill instructions, not runtime-enforced. The bash blacklist covers common destructive vectors only; exotic escapes (interpreter one-liners, piped shells) rely on the phase reminder — the guard is advisory, not a security boundary.