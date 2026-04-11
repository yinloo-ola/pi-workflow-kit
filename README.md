# pi-workflow-kit

Structured workflow skills and enforcement for [pi](https://github.com/badlogic/pi-mono).

## What You Get

**4 workflow skills** that guide the agent through a structured development process:

```
brainstorm → plan → execute → finalize
```

**1 extension** that enforces the rules:

- During brainstorming and planning, `write` and `edit` are **hard-blocked** outside `docs/plans/`. The agent can only read code and discuss the design with you — it literally cannot modify source files.
- `bash` stays available for investigation (`grep`, `find`, `git log`, etc.).

No configuration required. Skills and extensions activate automatically after install.

## Install

```bash
pi install npm:@tianhai/pi-workflow-kit
```

## The Workflow

You control each phase explicitly by invoking the skill:

| Phase | Command | What Happens |
|-------|---------|--------------|
| **Brainstorm** | `/skill:brainstorming` | Refine your idea into a design doc via collaborative dialogue |
| **Plan** | `/skill:writing-plans` | Break the design into bite-sized TDD tasks with exact file paths and code |
| **Execute** | `/skill:executing-tasks` | Implement the plan task-by-task with TDD discipline and optional checkpoint review gates |
| **Finalize** | `/skill:finalizing` | Archive plan docs, update README/CHANGELOG, create PR |

During brainstorm and plan, the extension blocks `write`/`edit` outside `docs/plans/`. During execute and finalize, all tools are available.

### Skills

| Skill | Lines | Description |
|-------|------:|-------------|
| `brainstorming` | ~30 | Explore the idea, propose approaches, write design doc |
| `writing-plans` | ~35 | Break design into tasks with TDD scenarios, set up branch/worktree |
| `executing-tasks` | ~50 | Implement tasks with TDD discipline, checkpoint review gates, handle code review |
| `finalizing` | ~20 | Archive docs, update changelog, create PR, clean up |

### TDD Three-Scenario Model

The plan labels each task with its TDD scenario:

| Scenario | When | Rule |
|----------|------|------|
| New feature | Adding new behavior | Write failing test → implement → pass |
| Modifying tested code | Changing existing behavior | Run existing tests first → modify → verify |
| Trivial | Config, docs, naming | Use judgment |

### Checkpoint Review Gates

Optionally label tasks with a `checkpoint` to pause for human review:

| Checkpoint | When to use | What happens |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Auto-advance, no pause |
| `checkpoint: test` | Test design matters | Pause after failing test, before implementing |
| `checkpoint: done` | Implementation review matters | Pause after implementation passes tests, before committing |

## Architecture

```
pi-workflow-kit/
├── extensions/
│   └── workflow-guard.ts      # Write blocker during brainstorm/plan
├── skills/
│   ├── brainstorming/SKILL.md
│   ├── writing-plans/SKILL.md
│   ├── executing-tasks/SKILL.md
│   └── finalizing/SKILL.md
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

MIT
