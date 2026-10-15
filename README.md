# pi-workflow-kit

> Stop AI agents from rushing to code. Enforce a structured design → execute → finalize workflow with test-first discipline and a feature-gate execution model.

AI coding agents tend to skip design and jump straight into implementation, producing over-engineered or misaligned code. **pi-workflow-kit** solves this by hard-blocking write operations during the design phase — the agent *literally cannot modify your source files* until you approve the design.

[pi](https://github.com/badlogic/pi-mono) package. Skills are portable; the workflow guard and `/pwk-setup` command are Pi integrations.

## Install

```bash
pi install npm:@tianhai/pi-workflow-kit
```

The deterministic helpers — design validation, the review packet, the progress writer, the section extractor, and the staging check — are dependency-free Node scripts. No Python is required.

For Pi delegation providers that discover project agents, install the canonical PWK roles before starting a gated workflow:

```text
/pwk-setup
```

This creates the five role definitions under `.agents/agents/`. It does not install or configure a provider. Existing customized files are preserved; use `/pwk-setup --force` only when you explicitly want to replace differing role files. Run setup before `/skill:pwk-brainstorming`; the command is refused during the design phase.

Optionally set a fast-tier model for the smell/hazard reviewers (they carry `thinking: low` and a turn budget by default): `/pwk-setup --fast-model <model>` — or pick one interactively when setup offers — and `--all-roles` to apply it to all four reviewers. The hint is advisory; hosts that cannot honor it keep the default model. Bare re-runs keep the recorded choice; only `--force` replaces local edits beyond the model line.

**Want to try before committing?**

```bash
pi -e npm:@tianhai/pi-workflow-kit
```

**Optional — delegated recon and review.** The skills request logical capabilities rather than a specific agent tool. If the host has no safe compatible provider, they perform recon and review inline. In Pi, [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) is one compatible provider:

```bash
pi install npm:@tintinweb/pi-subagents
```

After `/pwk-setup`, Tintinweb can discover the five named roles from `.agents/agents/`; recon can also use its built-in read-only `Explore` agent. No running subagents need to be pre-created. Other Pi extensions require the documented capabilities or a separate adapter; arbitrary extensions are not automatically compatible.

### Using the roles on other hosts

The five role files define portable logical roles, not a required provider API. Claude Code can map them to its native read-only task/subagent mechanism, but must enforce its own permissions or hooks because the Pi workflow guard does not transfer outside Pi. A different Pi extension can use the same roles when it provides the documented capabilities or an adapter; otherwise PWK performs recon and review inline.

See [`docs/provider-delegation-contract.md`](docs/provider-delegation-contract.md) for the normalized capability and outcome contract. The core kit does not install a provider, require `@tintinweb/pi-subagents`, or provide automatic compatibility with every Pi subagent extension.

## What You Get

### 🛡️ Workflow Guard (extension)

Enforces phase-appropriate tool access — not just guidelines, but hard blocks:

| Phase | `write` / `edit` | `bash` |
|-------|:-:|:-:|
| **Design** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
| **Execute** / **Code-review** / **Finalize** / **Walkthrough** | ✅ Full access | ✅ Full access |
| **Status** | Unchanged — status never exits the gate (read-only orientation) | Unchanged — the active phase's bash rules still apply |

The agent can read code and discuss design with you during the design phase, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.

Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-walkthrough` (all write beyond `docs/plans/`, so all exit the gate); `pwk-status` stays read-only and runs inside the gate. The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.

### 🧠 6 Workflow Skills

Guide the agent through a disciplined development process:

```
brainstorm → executing-tasks → finalizing
                             (feature-gate: write feature E2E → report it → implement → review → ⏸ ship checkpoint)
                                ↕
                             status (anytime)
```

A **design doc is one PR**; a **requirement is one testable slice within it**. **One folder per topic** — `docs/plans/<date>-<topic>/` holds the topic's design doc, progress file, and review packet, and is the unit disposed at finalize. A requirement too big for one design doc but shipping as one PR is an **umbrella** — more than one leaf in that same folder, under one status-free overview, on one branch, finalized once.

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc opening with a `## At a glance` digest (plain summary → **Key decisions** — rejected-alternative clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) before the `## Requirements` blocks; each requirement block carries its own acceptance criteria + review tags. Interviews in **frontier rounds**: numbered questions each with a recommended answer, facts looked up rather than asked, an assumption gate before the design is presented. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
| **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **report it, no stop** → implement the design doc's `### R<n>` requirement blocks → feature review (risk-scaled: four roles or one inline pass) → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
| **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
| **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs or archive them under `docs/plans/completed/` (discovery always runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), update README/CHANGELOG, create PR |
| **Walkthrough** | `/skill:pwk-walkthrough` | On demand: generate a detailed, file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md` (Summary / How it works / Key flows / Gotchas & invariants / Change map); stamped with the commit range, regenerated wholesale, never disposed. **Exits the gated phase** |
| **Status** | `/skill:pwk-status` | Read-only overview of all active design topics — phase + progress. Use when resuming or juggling several designs in parallel worktrees. Not a pipeline phase; **does not exit the gated phase**. |

### ⚡ Batched tool calls (pi ≥ 1.0.0 `codemode`)

Every skill treats its shell recipes as fallbacks: when the host grants a sandboxed batch executor, the kit prefers it — on pi ≥ 1.0.0 that is `codemode` (turn it on via pi's "Enable codemode" settings documentation; the guard announces it once per session when active, and the discovery sweeps demonstrate the one-call shape). The dated cross-harness instance table — opencode's `execute`, Claude's Programmatic Tool Calling, and the verified absences — lives in `docs/developer-usage-guide.md`. On hosts without such a tool, the bash recipes are the path and nothing changes.

## The Workflow in Detail

### Phase Control

You control each phase — the agent never advances on its own. Invoke a skill to move forward:

```
/skill:pwk-brainstorming   →  discuss and design — the design doc IS the buildable spec
/skill:pwk-executing-tasks →  feature-gate flow: branch, E2E-first, implement ### R<n> blocks, review, ship checkpoint
/skill:pwk-code-review     →  auto-runs at the feature level inside executing-tasks; also invocable manually for ad-hoc reviews
/skill:pwk-finalizing       →  ship it
```

### Behavioral-Spec Design

The design doc specifies *what*, not *how*. Each `### R<n>:` requirement block gives **acceptance criteria** (Given/When/Then, edge and error cases included) — no implementation code, no file-by-file recipe, no test-name lists. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria survive implementation changes.

Brainstorm opens with a **PRD brief** when source material exists — background, current situation, and the delta, cited and zero-context, corrected by you before any requirement is written. Unknowns settle by **decide-by-experiment**: a question a run can answer is answered by a bounded sketch, never guessed. A criterion passes the **probe test**: its `Then` names an outcome a command can observe.

### Feature-Gate Execution

The feature is implemented via the feature-gate flow:

1. Write the feature-acceptance E2E test (red)
2. **Report it — no stop** — one or two lines saying what the E2E proves, plus its failing output; the run continues straight into implementation (that text was already approved as `## Feature acceptance` during brainstorm, so this is the window to object before code is written, not a sign-off gate)
3. Implement the requirements back-to-back (TDD: meaningful test → red → green per slice; full autonomy)
4. Feature review — risk-scaled: four fresh-context roles over a script-assembled review packet when the design carries production-risk content, otherwise one inline pass
5. ⏸ **ship checkpoint** — full suite + feature E2E green; you review the execution summary **Evidence rows** (plain words + pointer per requirement) + coverage table (full diff on request)

Per-requirement checkpoints/reviews are opt-in (default off); the feature-level review covers everything.

### Lessons Learned

A persistent rules file (`docs/lessons.md`) helps the agent learn from repeat mistakes across sessions. When the agent catches itself making the same error, it writes a generic rule immediately. Future sessions (even after `/new`) pick it up automatically.

```
brainstorm → reads lessons (design context)
execute     → reads lessons per requirement, writes new ones on repeat mistakes
finalize    → reviews, generalizes, and retires stale rules
```

Rules are simple imperative bullets:

- After completing each requirement, run `make lint && make fmt` before committing
- Never import `testify` in this project
- Always check for existing test helpers before writing new ones

No configuration needed — the agent creates `docs/lessons.md` on first use and it grows as the agent learns.

### Feature-Level Checkpoints

The feature-gate flow's hard human-review gates (not optional) — **two hard stops when the design carries `## Setup`** (setup + ship), otherwise one (ship):

| Checkpoint | What's done | What you review |
|---|---|---|
| **setup** *(only when the design has a `## Setup` section)* | Dependencies installed, migrations applied, existing suite run | Setup results — approve before implementation starts |
| **ship** | All requirements implemented; full suite + E2E green; feature review collected | Execution summary + code digest + per-requirement coverage table — built as promised? (full diff on request) |

The agent stops and waits there — approve, request changes, or send it back. The feature-acceptance E2E is still written first and still gated at the ship checkpoint; it is reported before implementation without pausing, because its text was approved as `## Feature acceptance` during brainstorm.

### Before You Ship: the Ship Gate

The feature-level review checks the whole diff composed and runs **before** the **ship checkpoint** — so your one final approval is fully informed (execution summary + coverage table; the raw diff stays one command away). The ship checkpoint already ran the full suite + the feature-acceptance E2E green — that *is* the integration check (there is no separate end pass). Finalize re-runs the full suite too — it never ships a red suite, even across resumed sessions.

### Skill-Text Budgets

The skill text a host loads is ratcheted. `skill-lint` holds a per-file word budget — the measured count plus 10% headroom, rounded up — and a corpus ceiling, and fails by file name and count when either is exceeded, so a slimming pass cannot quietly undo itself. The numbers come from measurement rather than a target percentage (ADR 0010). Each release's claim is checked by a recorded fidelity probe: six authorized sessions comparing the kit before and after on one fixture task, with the transcripts committed and the token totals recomputed from raw usage lines (`tests/evals/skill-slimming/`).

## Quick Start

```bash
# Install
pi install npm:@tianhai/pi-workflow-kit

# Start a new feature
> /skill:pwk-brainstorming
> I want to add OAuth2 login to our API

# (agent explores approaches, writes the buildable design doc: At a glance,
#  ### R<n> blocks with acceptance criteria + review tags, Feature acceptance E2E)
# (write/edit are blocked — your code is safe)

> /skill:pwk-executing-tasks

# (feature-gate: creates the branch → setup stop when the design carries `## Setup` → writes feature E2E → notice → implements the blocks → feature review → ship checkpoint)

> /skill:pwk-finalizing

# (agent deletes consumed plan docs, curates lessons, creates PR)
```

## Why?

- **AI agents skip design.** Left unchecked, they jump to code and over-engineer. This forces a think-first workflow.
- **Specs beat recipes.** Plans are behavioral specs (acceptance criteria + tests), not implementation recipes — they don't invalidate when details change.
- **You stay in control.** One or two feature-level stops (setup when the design carries `## Setup`, then ship) let you sign off the finished implementation — execution summary, code digest, and coverage table — before the agent ships; the E2E is reported before implementation so you can object early.
- **Enforced, not suggested.** Hard blocks mean the agent can't ignore the rules — not even accidentally.

## Project

```
pi-workflow-kit/
├── extensions/
│   └── workflow-guard.ts      # Write blocker during the design phase; destructive-bash blacklist
├── skills/
│   ├── pwk-brainstorming/SKILL.md
│   ├── pwk-executing-tasks/SKILL.md
│   ├── pwk-code-review/SKILL.md
│   ├── pwk-finalizing/SKILL.md
│   ├── pwk-status/SKILL.md
│   └── pwk-walkthrough/SKILL.md      # on-demand explainer; docs/walkthroughs/ output
├── agents/                   # canonical role contracts; /pwk-setup copies them to .agents/agents/
├── docs/
│   ├── developer-usage-guide.md
│   ├── workflow-phases.md
│   ├── oversight-model.md
│   ├── provider-delegation-contract.md
│   ├── lessons.md
│   ├── adr/                  # permanent architectural decisions (never archived)
│   └── plans/                # active design/plan/progress docs (deleted after finalization)
├── tests/
│   └── workflow-guard.test.ts
├── package.json
└── README.md
```

## Development

```bash
npm test
```

## License

[MIT](LICENSE)