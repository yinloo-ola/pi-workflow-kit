# Lessons Learned

Date: 2026-05-08

## Problem

During task execution, the AI agent repeatedly makes the same project-specific mistakes — e.g., forgetting to run `make lint && make fmt` in Go projects, ignoring test helper conventions, or violating code style rules. These mistakes persist across sessions because there's no persistent memory the agent reads at the start of each task.

## Solution

A flat rules file (`docs/lessons.md`) that the agent reads before each task and writes to when it catches repeat mistakes. Integrated into the existing 4 workflow skills.

## File: `docs/lessons.md`

Created automatically when the first lesson is written. Never archived or moved.

```markdown
# Lessons Learned

<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Retire rules that no longer apply during finalizing.
-->

## Rules

- After completing each task in a Go project, run `make lint && make fmt` before committing
```

### Rules for the agent

- Each rule is a single bullet under `## Rules`
- Write rules as imperative commands ("do X", "never Y", "always Z before W")
- A rule is only added when it would **change future behavior** — not one-off errors
- Rules can be removed (retired) during finalizing if they no longer apply

## Data flow

```
brainstorming ──── reads lessons (context for design)
       │
writing-plans ──── reads lessons (informs task breakdown)
       │
executing-tasks ── reads lessons at start of EACH task
       │            appends new lessons when catching repeat mistakes
       │
finalizing ─────── reviews session for missed lessons
                    retires stale rules
```

Lessons are persisted to disk as soon as they're learned, so `/new` sessions don't lose them.

## Skill changes

### executing-tasks (3 changes)

1. **Per-task execution, step 2** — add bullet: "Read `docs/lessons.md` if it exists — follow all rules listed there while working on this task."
2. **New step between step 9 (refactor) and step 10 (checkpoint: done)** — "Learn from mistakes: if you caught yourself making a repeat mistake, append a rule to `docs/lessons.md`. Only add rules that would change future behavior."
3. **"If you're stuck" section** — add at end: "Check `docs/lessons.md` — a previous lesson may be relevant."

### finalizing (1 change)

Add a new step before "Update documentation": "Review `docs/lessons.md` if it exists — add missed lessons, retire stale rules. Create it if lessons were learned but the file doesn't exist yet."

### brainstorming (1 change)

Step 2 (understand the idea) — add after checking package.json/dependencies: "Check `docs/lessons.md` if it exists — known constraints and patterns may affect the design."

### writing-plans (1 change)

Step 1 (check for a design doc) — add after reading relevant code: "Read `docs/lessons.md` if it exists — incorporate known patterns into the task breakdown."

## Slice

Single slice: all 5 skill changes + file format convention. No new skills, extensions, or config.
