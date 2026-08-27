# pi-workflow-kit

> Stop AI agents from rushing to code. Enforce a structured brainstorm→plan→execute→finalize workflow with test-first discipline and a feature-gate execution model.

AI coding agents tend to skip design and jump straight into implementation, producing over-engineered or misaligned code. **pi-workflow-kit** solves this by hard-blocking write operations during brainstorm and planning phases — the agent *literally cannot modify your source files* until you approve the design.

[pi](https://github.com/badlogic/pi-mono) package. Zero configuration required.

## Install

```bash
pi install npm:@tianhai/pi-workflow-kit
```

No setup needed — skills and guards activate automatically after install.

**Want to try before committing?**

```bash
pi -e npm:@tianhai/pi-workflow-kit
```

**Optional — parallel code review.** The feature-level review can run four specialized reviewers in parallel over the whole feature diff via the `subagent` tool. Install [`pi-subagents`](https://pi.dev/packages/pi-subagents) to enable it:

```bash
pi install npm:pi-subagents
```

The four reviewers (`pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`) ship with this kit as **package agents** — `pi-subagents` discovers them automatically, no extra setup. Without `pi-subagents`, `pwk-executing-tasks` falls back to inline `/skill:pwk-code-review`.

## What You Get

### 🛡️ Workflow Guard (extension)

Enforces phase-appropriate tool access — not just guidelines, but hard blocks:

| Phase | `write` / `edit` | `bash` |
|-------|:-:|:-:|
| **Brainstorm** / **Plan** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
| **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Status** | ✅ Full access | ✅ Full access |

The agent can read code and discuss design with you during brainstorm/plan, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.

Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose` (all need source writes); `pwk-status` deliberately stays gated (read-only orientation). The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.

### 🧠 7 Workflow Skills

Guide the agent through a disciplined development process:

```
brainstorm → writing-plans → executing-tasks → finalizing
                             (feature-gate: write feature E2E → feature-spec → implement → feature-complete → review)
                                ↕
                   diagnose (anytime)   ·   status (anytime)
```

A **design doc is one PR**; a **requirement is one testable slice within it**. A requirement too big for one design doc but shipping as one PR is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once.

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc with a `## Requirements` list. On non-trivial topics, dispatches the `pwk-recon-scout` agent (read-only) to map the codebase before design. |
| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code) |
| **Execute** | `/skill:pwk-executing-tasks` | Write the feature E2E (red) → **checkpoint: feature-spec** → implement requirements → **checkpoint: feature-complete** → feature review |
| **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check |
| **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs, update README/CHANGELOG, create PR |
| **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
| **Status** | `/skill:pwk-status` | Read-only overview of all active design topics — phase + progress. Use when resuming or juggling several designs in parallel worktrees. Not a pipeline phase; **does not exit the gated phase**. |

## The Workflow in Detail

### Phase Control

You control each phase — the agent never advances on its own. Invoke a skill to move forward:

```
/skill:pwk-brainstorming   →  discuss and design (lists Requirements)
/skill:pwk-writing-plans   →  turn each Requirement into acceptance criteria + integration tests
/skill:pwk-executing-tasks →  feature-gate flow: E2E-first, implement, feature review (two checkpoints)
/skill:pwk-code-review     →  auto-runs at the feature level inside executing-tasks; also invocable manually for ad-hoc reviews
/skill:pwk-finalizing       →  ship it
```

### Behavioral-Spec Planning

Plans specify *what*, not *how*. For each requirement, the plan gives **acceptance criteria + integration-test cases** — no implementation code, no file-by-file recipe. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes.

### Feature-Gate Execution

The feature is implemented via the feature-gate flow:

1. Write the feature-acceptance E2E test (red)
2. ⏸ **checkpoint: feature-spec** — you confirm the E2E proves the feature
3. Implement the requirements back-to-back (TDD: meaningful test → red → green per slice; full autonomy)
4. ⏸ **checkpoint: feature-complete** — full suite + feature E2E green, you review the whole diff
5. Feature review → commit

Per-requirement checkpoints/reviews are opt-in (default off); the feature-level review covers everything.

### Lessons Learned

A persistent rules file (`docs/lessons.md`) helps the agent learn from repeat mistakes across sessions. When the agent catches itself making the same error, it writes a generic rule immediately. Future sessions (even after `/new`) pick it up automatically.

```
brainstorm → reads lessons (design context)
plan        → reads lessons (acceptance criteria / tests)
execute     → reads lessons per requirement, writes new ones on repeat mistakes
finalize    → reviews, generalizes, and retires stale rules
```

Rules are simple imperative bullets:

- After completing each requirement, run `make lint && make fmt` before committing
- Never import `testify` in this project
- Always check for existing test helpers before writing new ones

No configuration needed — the agent creates `docs/lessons.md` on first use and it grows as the agent learns.

### Two Feature-Level Checkpoints

The feature-gate flow has **two hard human-review gates** (not optional):

| Checkpoint | What's done | What you review |
|---|---|---|
| **feature-spec** | Feature-acceptance E2E written, confirmed failing | Does the E2E actually prove the feature? |
| **feature-complete** | All requirements implemented; full suite + E2E green | Is the whole feature correct before review? |

The agent stops and waits at each — approve, request changes, or send it back.

### Before You Ship: the Feature-Complete Gate

The feature-level review checks the whole diff composed. The **feature-complete** checkpoint already ran the full suite + the feature-acceptance E2E green — that *is* the integration check (there is no separate end pass). Finalize re-runs the full suite too — it never ships a red suite, even across resumed sessions.

## Quick Start

```bash
# Install
pi install npm:@tianhai/pi-workflow-kit

# Start a new feature
> /skill:pwk-brainstorming
> I want to add OAuth2 login to our API

# (agent explores approaches, writes a design doc with a Requirements list)
# (write/edit are blocked — your code is safe)

> /skill:pwk-writing-plans

# (agent turns each Requirement into acceptance criteria + integration tests)

> /skill:pwk-executing-tasks

# (feature-gate: writes feature E2E → checkpoint → implements requirements → checkpoint → feature review)

> /skill:pwk-finalizing

# (agent deletes consumed plan docs, curates lessons, creates PR)
```

## Why?

- **AI agents skip design.** Left unchecked, they jump to code and over-engineer. This forces a think-first workflow.
- **Specs beat recipes.** Plans are behavioral specs (acceptance criteria + tests), not implementation recipes — they don't invalidate when details change.
- **You stay in control.** Two feature-level checkpoints let you approve the feature spec (E2E) and the finished implementation before the agent ships.
- **Enforced, not suggested.** Hard blocks mean the agent can't ignore the rules — not even accidentally.

## Project

```
pi-workflow-kit/
├── extensions/
│   └── workflow-guard.ts      # Write blocker during brainstorm/plan; destructive-bash blacklist
├── skills/
│   ├── pwk-brainstorming/SKILL.md
│   ├── pwk-writing-plans/SKILL.md
│   ├── pwk-executing-tasks/SKILL.md
│   ├── pwk-code-review/SKILL.md
│   ├── pwk-finalizing/SKILL.md
│   ├── pwk-status/SKILL.md
│   └── pwk-diagnose/SKILL.md
├── agents/                   # package agents for parallel code-review + recon scout (discovered by pi-subagents)
├── docs/
│   ├── developer-usage-guide.md
│   ├── workflow-phases.md
│   ├── oversight-model.md
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