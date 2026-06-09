# pi-workflow-kit

> Stop AI agents from rushing to code. Enforce a structured brainstorm→plan→execute→verify→finalize workflow with TDD discipline.

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
| **Brainstorm** / **Plan** / **Verify** | 🔒 Blocked outside `docs/plans/` | 🔒 Read-only only (grep, find, cat, git status, curl…) |
| **Execute** / **Finalize** | ✅ Full access | ✅ Full access |

The agent can read code and discuss design with you during brainstorm/plan, but it physically cannot modify source files or run mutating commands.

### 🧠 7 Workflow Skills

Guide the agent through a disciplined development process:

brainstorm → plan → [design-review?] → execute → [verify?] → finalize
                ↕
             diagnose (anytime)

For multi-feature designs, the plan→execute loop repeats per feature.

| Phase | Trigger | What Happens |
|-------|---------|--------------|
| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, debate tradeoffs, produce a design doc with a Features table |
| **Design Review** | `/skill:pwk-design-review` | Audit plan and design for production risks (security, scalability, fault tolerance) |
| **Plan** | `/skill:pwk-writing-plans` | Plan one feature at a time from the Features table — bite-sized TDD tasks with acceptance criteria |
| **Execute** | `/skill:pwk-executing-tasks` | Implement tasks one-by-one with TDD discipline and pre-commit checkpoint review gates |
| **Verify** | `/skill:pwk-verify` | Three expert review passes (security, optimization, traceability) on implemented code |
| **Finalize** | `/skill:pwk-finalizing` | Archive plan docs, update README/CHANGELOG, create PR |
| **Diagnose** | `/skill:pwk-diagnose` | 6-phase debugging loop: reproduce → hypothesize → instrument → fix → verify |

## The Workflow in Detail

### Phase Control

You control each phase — the agent never advances on its own. Invoke a skill to move forward:

/skill:pwk-brainstorming   →  discuss and design (names features)
/skill:pwk-writing-plans   →  plan next feature from the Features table
/skill:pwk-design-review   →  audit for production risks (on demand)
/skill:pwk-executing-tasks →  implement with TDD
/skill:pwk-verify           →  review code for security, optimization, and traceability
/skill:pwk-finalizing       →  ship it

### Feature-Based Planning

Design docs include a `## Features` table that tracks each feature's status:

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | User signup | ✅ done | |
| 2 | Email verification | 🔄 planned | Plan: docs/plans/...-email-verification-implementation.md |
| 3 | Password reset | ⬜ pending | |

This enables incremental development — plan and execute one feature at a time, then loop back for the next.

### TDD Three-Scenario Model

Each task is labeled with its TDD scenario during planning:

| Scenario | When | Rule |
|----------|------|------|
| **New feature** | Adding new behavior | Write failing test → implement → pass |
| **Modifying tested code** | Changing existing behavior | Run existing tests first → modify → verify |
| **Trivial** | Config, docs, naming | Use judgment |

### Lessons Learned

A persistent rules file (`docs/lessons.md`) helps the agent learn from repeat mistakes across sessions. When the agent catches itself making the same error — like forgetting to run `make lint` — it writes a rule immediately. Future sessions (even after `/new`) pick it up automatically.

```
brainstorm → reads lessons (design context)
plan        → reads lessons (task breakdown)
execute     → reads lessons per task, writes new ones on repeat mistakes
finalize    → reviews and retires stale rules
```

Rules are simple imperative bullets:

- After completing each task, run `make lint && make fmt` before committing
- Never import `testify` in this project
- Always check for existing test helpers before writing new ones

No configuration needed — the file is created automatically when the first lesson is written.

### Checkpoint Review Gates

Optionally label tasks with a `checkpoint` to pause for human review. At each checkpoint the agent stops and waits for your feedback — you can approve, ask for changes, or send it back to rethink. Only when you're satisfied does it move on to the next task.

| Checkpoint | When to Use | What Happens |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Auto-advance, no pause |
| `checkpoint: test` | Test design matters | Agent writes the failing test, then pauses for your review. Verify the test covers the right cases before the agent implements. |
| `checkpoint: done` | Implementation review matters | Agent implements and passes tests, then pauses for your review. Verify the implementation is correct before committing. |

## Quick Start

```bash
# Install
pi install npm:@tianhai/pi-workflow-kit

# Start a new feature
> /skill:pwk-brainstorming
> I want to add OAuth2 login to our API

# (agent explores approaches, writes design doc with Features table)
# (write/edit are blocked — your code is safe)

> /skill:pwk-writing-plans

# (agent picks next feature, breaks into TDD tasks)
# (triggers design review for non-trivial features)
> /skill:pwk-executing-tasks

# (agent implements with TDD, cognitive persona shifts, all tools unlocked)
> /skill:pwk-verify

# (agent runs security, optimization, and traceability reviews on implemented code)
> /skill:pwk-finalizing

# (agent archives docs, curates lessons, creates PR)
```

## Why?

- **AI agents skip design.** Left unchecked, they jump to code and over-engineer. This forces a think-first workflow.
- **TDD needs structure.** The three-scenario model gives the agent clear rules for when to write tests first.
- **You stay in control.** Checkpoint review gates let you approve test designs and implementations before the agent commits.
- **Enforced, not suggested.** Hard blocks mean the agent can't ignore the rules — not even accidentally.

## Project

```
pi-workflow-kit/
├── extensions/
│   └── workflow-guard.ts      # Write blocker during brainstorm/plan/verify
├── skills/
│   ├── pwk-brainstorming/SKILL.md
│   ├── pwk-design-review/SKILL.md
│   ├── pwk-writing-plans/SKILL.md
│   ├── pwk-executing-tasks/SKILL.md
│   ├── pwk-verify/SKILL.md
│   ├── pwk-finalizing/SKILL.md
│   └── pwk-diagnose/SKILL.md
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
