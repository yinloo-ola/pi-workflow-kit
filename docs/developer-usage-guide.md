# Developer Usage Guide

How to install and use `pi-workflow-kit` with Pi, and how its workflow roles map to other agent hosts.

## What you get

- **5 pipeline skills** — brainstorm → writing-plans → executing-tasks → finalizing, with code-review running at the feature level during execution.
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

You control each phase by invoking the skill. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once:

```
/skill:pwk-brainstorming  →  /skill:pwk-writing-plans  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
```

### 1. Brainstorm

Before entering the gated phase in Pi, optionally install the canonical role definitions:

```
/pwk-setup
```

The command creates `.agents/agents/` and installs the five PWK roles. It preserves differing files unless `--force` is supplied and is refused during brainstorm and plan phases. It does not install a delegation provider.

```
/skill:pwk-brainstorming
```

Explore the idea through collaborative dialogue. The agent reads code, asks questions, proposes approaches, and presents the design for your review. On non-trivial topics with prior art, the skill requests the logical `codebase-recon` capability using the `pwk-recon-scout` role. A compatible host may dispatch that role in a fresh, bounded, read-only worker; otherwise the skill reports `Scout: unavailable` and performs the same five-section recon inline.

Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## Requirements` list. For a too-big requirement, may start an **umbrella** (writes a status-free overview + the first part's design doc). ADRs go to `docs/adr/` (permanent).

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

Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → **checkpoint: feature-complete** (full suite + E2E green) → feature review. Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).

### 4. Code review (feature level)

The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human.

In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`, where compatible providers such as `@tintinweb/pi-subagents` can discover them. Tintinweb may run the roles through its native `Agent` mechanism or map recon to its built-in read-only `Explore` type. The core kit does not require Tintinweb or any other provider.

*Fallback:* if no host/provider can guarantee the requested capabilities, the skill performs the missing recon or review work inline. Other Pi extensions are supported only when they expose the documented capabilities or have a separate adapter; arbitrary extensions are not automatically compatible. See `docs/provider-delegation-contract.md` for the integration contract.

### 5. Finalize

```
/skill:pwk-finalizing
```

**Pre-check: run the full test suite** — never ship a red suite (resume spans sessions). Then archive or delete consumed plan docs (the human's choice), curate lessons, update CHANGELOG/README, create PR or merge.

### Diagnose (on demand)

```
/skill:pwk-diagnose
```

A debugging loop you invoke when something is broken. Not a pipeline phase. **Invoking it exits the gated brainstorm/plan phase** — diagnosis needs to write failing tests and debug instrumentation. If you only want read-only investigation mid-design, use `pwk-status` or re-lock with `/pwk-guard on`.

### Status (on demand)

```
/skill:pwk-status
```

A read-only overview of all active design topics — which phase each is in and how far along. Use when resuming work or juggling several designs in parallel (e.g. across worktrees) and you're unsure which topic to continue. Not a pipeline phase, and **it does not exit the gated phase** — it needs no writes, so the brainstorm/plan write boundary stays up.

## What the extension does

The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit` and `bash` tool calls:

- **During brainstorm and writing-plans**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
- **During executing-tasks, code-review, finalizing, diagnose**: no restrictions.
- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`; `pwk-status` stays gated. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.

The destructive blacklist covers common file-mutating vectors (redirects, `tee`, `cp`/`mv`/`touch`/`rm`, `git commit`/`apply`, `npm install`, in-place editors like `sed -i`/`perl -i`, `patch`, `find -delete`). Exotic vectors (interpreter escapes like `node -e`, `python -c`, `| bash`) rely on the phase reminder — the guard is advisory, not a security boundary.

No configuration needed. It activates automatically after install.

## Test-first discipline

Plans specify *what* (acceptance criteria + integration tests); the executor writes the tests first (red), then implements to green. This keeps the spec stable — implementation details can change without invalidating the plan.

## Tips

- Start with brainstorming for anything non-trivial.
- The plan is a behavioral spec, not an implementation recipe — let the executor choose how.
- The feature-gate flow has two checkpoints by default (feature-spec + feature-complete): use them to steer the E2E spec and the finished implementation.
- **Right-size each requirement at plan time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-writing-plans`; the human can override or downgrade before plan approval.
- Put all plan artifacts under `docs/plans/`; ADRs under `docs/adr/`.
