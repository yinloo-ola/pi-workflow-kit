# Implementation Plan: Lessons Learned

Design: `docs/plans/2026-05-08-lessons-learned-design.md`

## Overview

Add a `docs/lessons.md` rules file that the agent reads at natural points in the workflow and writes to when it catches repeat mistakes. Changes are purely instructional — edits to 4 SKILL.md files plus documentation updates.

No TypeScript code changes. No new extensions or skills. The existing `workflow-guard.ts` already allows writes to `docs/` during execute/finalize phases (it only blocks outside `docs/plans/` during brainstorm/plan). Since `docs/lessons.md` is at `docs/` level (not inside `docs/plans/`), it won't interfere with archiving.

---

## Task 1: Add lessons-learned read step to executing-tasks skill

<!-- tdd: trivial -->
<!-- checkpoint: done -->

**File:** `skills/executing-tasks/SKILL.md`

**Change 1** — In "Per-task execution", step 2, add a new bullet after the existing ones:

```
- **Read `docs/lessons.md` if it exists** — follow all rules listed there while working on this task.
```

The full step 2 should become:

```markdown
2. **Read the plan selectively** — read the plan's overview section (everything before `## Task 1:`). Skim all `## Task N:` headings for dependency awareness. Then read the current task's body in full. **Read `docs/lessons.md` if it exists** — follow all rules listed there while working on this task.
```

**Change 2** — In "Per-task execution", insert a new step between step 9 (Refactor if needed) and step 10 (checkpoint: done). The new step becomes step 10, and all subsequent steps renumber by 1 (step 10→11, 11→12, 12→13, 13→14, 14→15):

```markdown
10. **Learn from mistakes** — if you caught yourself making a mistake during this task that you've made before or that would apply to future tasks, append a rule to `docs/lessons.md`. Only add rules that would change future behavior. If the file doesn't exist, create it with the standard format (see below). Do not add one-off errors or things you self-corrected immediately.

    **`docs/lessons.md` format:**
    ```markdown
    # Lessons Learned

    <!--
    Agent: read this at the start of each task during executing-tasks.
    Follow every rule. Add new rules when you catch yourself making repeat mistakes.
    Retire rules that no longer apply during finalizing.
    -->

    ## Rules

    - <new rule here>
    ```
```

**Change 3** — In "If you're stuck" section, add a new item at the end:

```markdown
5. **Check `docs/lessons.md`** — a previous lesson may be relevant to your current problem.
```

Renumber the existing item 4 to 5 if needed (it's currently the last item).

**Command:**
```
git add skills/executing-tasks/SKILL.md
git commit -m "feat(executing-tasks): read and write lessons learned per task"
```

---

## Task 2: Add lessons-learned review step to finalizing skill

<!-- tdd: trivial -->
<!-- checkpoint: none -->

**File:** `skills/finalizing/SKILL.md`

Insert a new step between the existing step 1 (Move planning docs) and step 2 (Update documentation). The new step becomes step 2, and existing steps 2-4 renumber to 3-5:

```markdown
2. **Review lessons learned** — if `docs/lessons.md` exists, review it:
   - Add any lessons from this session that were missed during execution
   - Retire rules that no longer apply (remove the bullet)
   - If no changes are needed, leave it as-is

   If `docs/lessons.md` doesn't exist but lessons were learned this session, create it with the standard format:

   ```markdown
   # Lessons Learned

   <!--
   Agent: read this at the start of each task during executing-tasks.
   Follow every rule. Add new rules when you catch yourself making repeat mistakes.
   Retire rules that no longer apply during finalizing.
   -->

   ## Rules

   - <rule 1>
   - <rule 2>
   ```
```

**Command:**
```
git add skills/finalizing/SKILL.md
git commit -m "feat(finalizing): review and update lessons learned"
```

---

## Task 3: Add lessons-learned read step to brainstorming skill

<!-- tdd: trivial -->
<!-- checkpoint: none -->

**File:** `skills/brainstorming/SKILL.md`

In step 2 (Understand the idea), add a new bullet after "check package.json/dependencies and module structure":

```markdown
   - **Check `docs/lessons.md`** if it exists — known constraints and patterns may affect the design.
```

The full relevant part of step 2 should become:

```markdown
2. **Understand the idea** — read existing code, docs, and recent commits. Grep for related functionality, check package.json/dependencies and module structure. **Check `docs/lessons.md`** if it exists — known constraints and patterns may affect the design. Read only what's necessary to ground the design — don't read the entire codebase. Ask questions to refine the idea. Prefer multiple choice when possible. After each question, check: can you clearly articulate (a) what the user wants to build, (b) why, and (c) key constraints? If yes, present your understanding as a short summary and ask: "Should I proceed with this, or is there more to add?" The human decides when to move on.
```

**Command:**
```
git add skills/brainstorming/SKILL.md
git commit -m "feat(brainstorming): read lessons learned for design context"
```

---

## Task 4: Add lessons-learned read step to writing-plans skill

<!-- tdd: trivial -->
<!-- checkpoint: none -->

**File:** `skills/writing-plans/SKILL.md`

In step 1 (Check for a design doc), add a new sentence after "If no design doc exists, ask the user to describe what they want to build and read relevant code.":

```markdown
   **Read `docs/lessons.md`** if it exists — incorporate known patterns into the task breakdown (e.g., if a lesson says "always run lint before commit," include that in relevant task instructions).
```

**Command:**
```
git add skills/writing-plans/SKILL.md
git commit -m "feat(writing-plans): read lessons learned for task breakdown"
```

---

## Task 5: Update README.md with lessons-learned feature documentation

<!-- tdd: trivial -->
<!-- checkpoint: done -->

**File:** `README.md`

Add a new section after "TDD Three-Scenario Model" and before "Checkpoint Review Gates":

```markdown
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
```

**Command:**
```
git add README.md
git commit -m "docs: add lessons-learned section to README"
```

---

## Task 6: Update CHANGELOG.md

<!-- tdd: trivial -->
<!-- checkpoint: none -->

**File:** `CHANGELOG.md`

Add a new entry at the top (after the header):

```markdown
## [0.13.0] - 2026-05-08

### Added

- Lessons learned: persistent rules file (`docs/lessons.md`) read at every workflow phase and written to when the agent catches repeat mistakes. Survives `/new` sessions.
```

Bump version in `package.json` from `0.12.0` to `0.13.0`.

**Command:**
```
git add CHANGELOG.md package.json
git commit -m "chore: bump version to 0.13.0"
```
