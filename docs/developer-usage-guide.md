# Developer Usage Guide

How to install and use `pi-workflow-kit` with Pi, and how its workflow roles map to other agent hosts.

The kit enforces a design → execute → finalize workflow: one buildable design doc per feature, executed through the feature gate, shipped once.

## What you get

- **4 pipeline skills** — brainstorm → executing-tasks → finalizing, with code-review running at the feature level during execution.
- **2 utility skills** — status (multi-topic overview) and walkthrough (on-demand explainer), both invoked on demand.
- **1 extension** — hard-blocks source writes during the design phase, and blocks destructive bash via a simple common-blacklist.

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

You control each phase by invoking the skill. One folder per topic: `docs/plans/<date>-<topic>/` holds the topic's design doc, progress file, and review packet, and is the unit disposed at finalize. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — more than one leaf in that same folder, under one status-free overview, on one branch, finalized once:

```
/skill:pwk-brainstorming  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
```

### 1. Brainstorm

Before entering the gated phase in Pi, optionally install the canonical role definitions:

```
/pwk-setup
```

The command creates `.agents/agents/` and installs the five PWK roles. It preserves differing files unless `--force` is supplied and is refused during the design phase. It does not install a delegation provider.

```
/skill:pwk-brainstorming
```

Explore the idea through collaborative dialogue. The agent reads code, asks questions, proposes approaches, and presents the design for your review. Questioning runs in **frontier rounds**: numbered questions each carrying a recommended answer, facts looked up rather than asked, an assumption gate before the design is presented, and a frontier-empty stop rule (nothing left silently assumed). On non-trivial topics with prior art, the skill requests the logical `codebase-recon` capability using the `pwk-recon-scout` role. A compatible host may dispatch that role in a fresh, bounded, read-only worker; otherwise the skill reports `Scout: unavailable` and performs the same five-section recon inline.

Outcome: `docs/plans/<date>-<topic>/<leaf>-design.md` — descriptive, opening with a `## At a glance` digest for the human (plain-language summary → **Key decisions** — `(rejected: …)` clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a too-big requirement, may start an **umbrella** (writes a status-free `overview.md` + the first leaf's design doc in the same folder). ADRs go to `docs/adr/` (permanent).

### 2. Execute

```
/skill:pwk-executing-tasks
```

Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **report it (no stop)** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. Two hard stops when the design carries `## Setup` (setup + ship); otherwise one (ship) at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).

### 3. Code review (feature level)

The `pwk-executing-tasks` skill resolves the design's `### Feature review` tag (`auto` by default) and then either requests the `parallel-review` capability for four logical roles over the whole feature diff — spec alignment, code tracing, code smells, and production hazards — when the design carries production-risk content, or runs one inline pass when it does not. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.

In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`, where compatible providers such as `@tintinweb/pi-subagents` can discover them. `/pwk-setup --fast-model <model>` (or the interactive picker) sets the fast-tier model for the smell/hazard reviewers — an advisory hint hosts may honor. Tintinweb may run the roles through its native `Agent` mechanism or map recon to its built-in read-only `Explore` type. The core kit does not require Tintinweb or any other provider.

*Fallback:* if no host/provider can guarantee the requested capabilities, the skill performs the missing recon or review work inline. Other Pi extensions are supported only when they expose the documented capabilities or have a separate adapter; arbitrary extensions are not automatically compatible. See `docs/provider-delegation-contract.md` for the integration contract.

### 4. Finalize

```
/skill:pwk-finalizing
```

**Pre-check: run the full test suite** — never ship a red suite (resume spans sessions). Then archive or delete consumed plan docs (the human's choice; archived docs land in `docs/plans/completed/`, and every discovery glob runs excluding docs/plans/completed/ so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), curate lessons, update CHANGELOG/README, create PR or merge.

### Walkthrough (on demand)

```
/skill:pwk-walkthrough
```

Generate a detailed, file:line-anchored walkthrough of a shipped feature or branch into `docs/walkthroughs/<topic>.md` — Summary / How it works / Key flows / Gotchas & invariants / Change map — stamped with the commit range, regenerated wholesale on re-run, never disposed. Exits the gated design phase.

### Status (on demand)

```
/skill:pwk-status
```

A read-only overview of all active design topics — which phase each is in and how far along. Use when resuming work or juggling several designs in parallel (e.g. across worktrees) and you're unsure which topic to continue. Not a pipeline phase, and **it does not exit the gated phase** — it needs no writes, so the design-phase write boundary stays up.

## What the extension does

The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit` and `bash` tool calls:

- **During the design phase**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
- **During executing-tasks, code-review, finalizing**: no restrictions.
- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-walkthrough` (walkthrough writes explainer output under `docs/walkthroughs/`); `pwk-status` stays read-only and runs inside the gate. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.

The destructive blacklist covers common file-mutating vectors (redirects, `tee`, `cp`/`mv`/`touch`/`rm`, `git commit`/`apply`, `npm install`, in-place editors like `sed -i`/`perl -i`, `patch`, `find -delete`). Exotic vectors (interpreter escapes like `node -e`, `python -c`, `| bash`) rely on the phase reminder — the guard is advisory, not a security boundary.

No configuration needed. It activates automatically after install.

## Test-first discipline

Design docs specify *what* (acceptance criteria + end-to-end scenarios); the executor writes the feature-acceptance E2E first (red), then implements to green. This keeps the spec stable — implementation details can change without invalidating the design.

## Tips

- Start with brainstorming for anything non-trivial.
- The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
- The feature-gate flow has two hard stops when the design carries `## Setup` (setup + ship), otherwise one (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`, default `none` — the acceptance criteria were approved at design time, so there is no per-requirement correctness stop) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The risk-scaled feature-level `### Feature review` covers the whole diff. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
- Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
