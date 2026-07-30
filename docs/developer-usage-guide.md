# Developer Usage Guide

How to install and use `pi-workflow-kit` with the Pi coding agent.

## What you get

- **5 pipeline skills** — brainstorm → writing-plans → executing-tasks → finalizing, with code-review running per requirement during execution.
- **2 utility skills** — diagnose (debugging) and status (multi-topic overview), both on demand.
- **1 extension** — hard-blocks source writes during brainstorm and writing-plans, and blocks destructive bash via a simple common-blacklist.

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

You control each phase by invoking the skill. A design doc is one PR; a requirement is one testable slice within it. For multi-design work (a large issue split), run the pipeline once per design doc:

```
/skill:pwk-brainstorming  →  /skill:pwk-writing-plans  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
```

### 1. Brainstorm

```
/skill:pwk-brainstorming
```

Explore the idea through collaborative dialogue. The agent reads code, asks questions, proposes approaches, and presents the design for your review.

Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## Requirements` list. May split a large issue into multiple design docs. ADRs go to `docs/adr/` (permanent).

### 2. Plan

```
/skill:pwk-writing-plans
```

Read the design doc's Requirements and turn each into **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code).

Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

### 3. Execute

```
/skill:pwk-executing-tasks
```

Implement requirement-by-requirement with **full autonomy**: write the integration tests (red) → **checkpoint: tests** → implement to green → **checkpoint: complete** → commit → code-review. Two mandatory human checkpoints per requirement. After all requirements, an **integration gate** runs the full suite and confirms the requirements compose into the feature before finalize.

### 4. Code review (per requirement)

```
/tool:subagent { tasks: [{ agent: "pwk-spec-reviewer", task: "..." }, ...], agentScope: "project" }
```

Per requirement, four specialized reviewers launch in parallel — each reviewing from a different dimension (spec gaps & scope creep, end-to-end code tracing, code smells, production hazards). Agents live under `.pi/agents/pwk-*.md`. All report findings only; no agent edits files or produces commits. The main agent collects results, applies smell fixes itself, runs integration tests after each fix, then updates progress to `✅ done`.

*Fallback:* if the `subagent` tool is unavailable, the skill falls back to inline `/skill:pwk-code-review` as before.

### 5. Finalize

```
/skill:pwk-finalizing
```

**Pre-check: run the full test suite** — never ship a red suite (resume spans sessions). Then archive the design's planning docs (per-topic), curate lessons, update CHANGELOG/README, create PR or merge.

### Diagnose (on demand)

```
/skill:pwk-diagnose
```

A debugging loop you invoke when something is broken. Not a pipeline phase.

### Status (on demand)

```
/skill:pwk-status
```

A read-only overview of all active design topics — which phase each is in and how far along. Use when resuming work or juggling several designs in parallel (e.g. across worktrees) and you're unsure which topic to continue. Not a pipeline phase.

## What the extension does

The `workflow-guard` extension watches `write`/`edit` and `bash` tool calls:

- **During brainstorm and writing-plans**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
- **During executing-tasks, code-review, finalizing**: no restrictions.
- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.

The destructive blacklist covers common file-mutating vectors (redirects, `tee`, `cp`/`mv`/`touch`/`rm`, `git commit`/`apply`, `npm install`, in-place editors like `sed -i`/`perl -i`, `patch`, `find -delete`). Exotic vectors (interpreter escapes like `node -e`, `python -c`, `| bash`) rely on the phase reminder — the guard is advisory, not a security boundary.

No configuration needed. It activates automatically after install.

## Test-first discipline

Plans specify *what* (acceptance criteria + integration tests); the executor writes the tests first (red), then implements to green. This keeps the spec stable — implementation details can change without invalidating the plan.

## Tips

- Start with brainstorming for anything non-trivial.
- The plan is a behavioral spec, not an implementation recipe — let the executor choose how.
- Each requirement has two mandatory checkpoints: use them to steer test design and implementation.
- Put all plan artifacts under `docs/plans/`; ADRs under `docs/adr/`.