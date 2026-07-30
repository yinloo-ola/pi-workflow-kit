# pi-workflow-kit

> Stop AI agents from rushing to code. Enforce a structured brainstorm→plan→execute→finalize workflow with test-first discipline and per-requirement code review.

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

## What You Get

### 🛡️ Workflow Guard (extension)

Enforces phase-appropriate tool access — not just guidelines, but hard blocks:

| Phase | `write` / `edit` | `bash` |
|-------|:-:|:-:|
| **Brainstorm** / **Plan** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
| **Execute** / **Code-review** / **Finalize** | ✅ Full access | ✅ Full access |

The agent can read code and discuss design with you during brainstorm/plan, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is appended after your message each turn so the model self-restricts.

### 🧠 7 Workflow Skills

Guide the agent through a disciplined development process:

```
brainstorm → writing-plans → executing-tasks → finalizing
                             (per requirement: tests → checkpoint → implement → checkpoint → code-review)
                                ↕
                          diagnose (anytime)
```

For multi-design work (a large issue split into several design docs), run the pipeline once per design doc.

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc with a `## Requirements` list |
| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code) |
| **Execute** | `/skill:pwk-executing-tasks` | Per requirement: write tests (red) → **checkpoint: tests** → implement (green) → **checkpoint: complete** → code-review |
| **Code review** | `/skill:pwk-code-review` | Per requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check |
| **Finalize** | `/skill:pwk-finalizing` | Archive plan docs (per-topic), update README/CHANGELOG, create PR |
| **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup |

## The Workflow in Detail

### Phase Control

You control each phase — the agent never advances on its own. Invoke a skill to move forward:

```
/skill:pwk-brainstorming   →  discuss and design (lists Requirements)
/skill:pwk-writing-plans   →  turn each Requirement into acceptance criteria + integration tests
/skill:pwk-executing-tasks →  implement per requirement with two mandatory checkpoints
/skill:pwk-code-review     →  review each requirement (tracing, spec, smells, hazards)
/skill:pwk-finalizing       →  ship it
```

### Behavioral-Spec Planning

Plans specify *what*, not *how*. For each requirement, the plan gives **acceptance criteria + integration-test cases** — no implementation code, no file-by-file recipe. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes.

### Test-First per Requirement

Each requirement is implemented test-first:

1. Write the integration tests (red)
2. ⏸ **checkpoint: tests** — you review the test design
3. Implement to green (full autonomy)
4. ⏸ **checkpoint: complete** — you review the implementation
5. Commit → code review

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

No configuration needed — the file is created automatically when the first lesson is written.

### Two Mandatory Checkpoints per Requirement

Each requirement has **two hard human-review gates** (not optional):

| Checkpoint | What's done | What you review |
|---|---|---|
| **tests** | Integration tests written, confirmed failing | Are the right behaviors being specified? |
| **complete** | Implemented, tests green, refactored | Is the implementation correct before committing? |

The agent stops and waits at each — approve, request changes, or send it back.

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

# (per requirement: writes tests → checkpoint → implements → checkpoint → code-review)

> /skill:pwk-finalizing

# (agent archives docs, curates lessons, creates PR)
```

## Why?

- **AI agents skip design.** Left unchecked, they jump to code and over-engineer. This forces a think-first workflow.
- **Specs beat recipes.** Plans are behavioral specs (acceptance criteria + tests), not implementation recipes — they don't invalidate when details change.
- **You stay in control.** Two mandatory checkpoints per requirement let you approve test design and implementation before the agent commits.
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
├── docs/
│   ├── developer-usage-guide.md
│   ├── workflow-phases.md
│   ├── oversight-model.md
│   └── plans/                # active design/plan/progress docs (archived to docs/plans/completed/)
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