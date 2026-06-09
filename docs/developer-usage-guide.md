# Developer Usage Guide

How to install and use `pi-workflow-kit` with the Pi coding agent.

## What you get

- **4 workflow skills** that guide the agent through a structured feature-based workflow
- **3 on-demand skills** for design review, verification, and debugging
- **1 extension** that hard-blocks source writes during brainstorm, plan, and verify phases

## Installation

### From npm

```bash
pi install npm:@tianhai/pi-workflow-kit
```

### From your own repo

```bash
pi install git:github.com/<your-user>/pi-workflow-kit.git
```

Or in `.pi/settings.json` / `~/.pi/agent/config.json`:

```json
{
  "packages": ["git:github.com/<your-user>/pi-workflow-kit.git"]
}
```

## The workflow

You control each phase by invoking the skill. For multi-feature designs, the plan→execute loop repeats per feature:

```
/skill:pwk-brainstorming  →  /skill:pwk-writing-plans  →  /skill:pwk-executing-tasks  →  loop or /skill:pwk-finalizing
```

### 1. Brainstorm

```
/skill:pwk-brainstorming
```

Explore the idea through collaborative dialogue. The agent reads code, asks questions one at a time, proposes 2-3 approaches, and presents the design in sections for your review.

Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` with a `## Features` table

Optionally writes ADRs to `docs/plans/adr/` for significant architectural decisions.

### 2. Plan

```
/skill:pwk-writing-plans
```

Read the design doc's Features table, pick the next `⬜ pending` feature, and create a per-feature implementation plan with exact file paths, complete code, and TDD scenarios. Optionally set up a branch or worktree.

Outcome: `docs/plans/YYYY-MM-DD-<topic>-<feature-name>-implementation.md`

### 3. Execute

```
/skill:pwk-executing-tasks
```

Implement the plan task-by-task. Each task: implement → run tests → fix if needed → commit. When the feature is done, marks it `✅ done` in the design doc and suggests planning the next feature.

### 4. Finalize

```
/skill:pwk-finalizing
```

Archive plan docs, update CHANGELOG/README, create PR, clean up worktree.

### 5. Design Review (on demand)

```
/skill:pwk-design-review
```

Audit a plan doc for production risks — security, scalability, fault tolerance, and operational hazards. Triggered by writing-plans for non-trivial features. Review findings append to the plan doc, not the design doc.

### 6. Verify (on demand)

```
/skill:pwk-verify
```

Post-implementation verification with three expert passes — security, optimization, and traceability. Run after executing a feature or before finalizing.

### 7. Diagnose (on demand)

```
/skill:pwk-diagnose
```

A 6-phase debugging loop you invoke when something is broken. Build a feedback loop first, then reproduce, hypothesise, instrument, fix, and cleanup. Not a pipeline phase — use whenever needed.

## What the extension does

The `workflow-guard` extension watches `write` and `edit` tool calls:

- **During brainstorm and plan**: blocks writes outside `docs/plans/`. The agent can read code and use bash, but cannot modify source files.
- **During verify**: same read-only enforcement — the agent can inspect code but not modify it.
- **During execute and finalize**: no restrictions. All tools available.

No configuration needed. It activates automatically after install.

## TDD guidance

The plan labels each task with a TDD scenario:

| Scenario | When | Rule |
|----------|------|------|
| New feature | Adding new behavior | Write failing test → implement → pass |
| Modifying tested code | Changing existing behavior | Run existing tests first → modify → verify |
| Trivial | Config, docs, naming | Use judgment |

This is guidance in the skill instructions, not runtime enforcement.

## Tips

- Start with brainstorming for anything non-trivial
- Use writing-plans before touching code for multi-step work
- Put all plan artifacts under `docs/plans/`
- During execute, the agent handles code review feedback by verifying criticism before implementing
