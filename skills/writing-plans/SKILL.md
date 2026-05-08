---
name: writing-plans
description: "Use this to break a design into an implementation plan with bite-sized TDD tasks. Works with or without a prior brainstorm. Use this skill when the user says 'let's plan', 'break this down', 'write a plan', 'create tasks', or after a brainstorm session when they want to move to implementation. Also use when the user has a clear idea and wants to jump straight to a structured plan."
---

# Writing Plans

You may only create or edit files under `docs/plans/`. Do not modify source code or configuration.

## Process

1. **Check for a design doc** — look for `docs/plans/*-design.md`. If one exists, use it as the basis for the plan. If the design doc is incomplete, fill gaps by asking the human. If no design doc exists, ask the user to describe what they want to build and read relevant code. **Read `docs/lessons.md`** if it exists — incorporate known patterns into the task breakdown (e.g., if a lesson says "always run lint before commit," include that in relevant task instructions).
2. **Write the implementation plan** — break the design into tasks. Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`. If the design is too large for ~15 tasks, flag this to the human and ask whether to reduce scope or proceed with the full plan.
3. **Present the plan** — show the complete plan to the human. Wait for approval before suggesting execution.

## Task format

Each task should produce one testable change. The executing-tasks skill handles committing — do not include `git commit` in the task body.

Each task must include:
- Exact file paths to create/modify
- **Concrete code** — include the actual implementation, not a summary. Write out SQL schemas, type definitions, function signatures with bodies, route handler code, and test assertions. A developer should be able to copy-paste from the plan and have working code. For tasks that depend on types or utilities from earlier tasks, reference them explicitly (e.g., `import { User } from Task 2`) and include only the new code
- Exact commands with expected output (e.g., `npx vitest run src/user/model.test.ts` → shows 1 test passing)
- Each task's tests should cover the happy path and at least one edge case or error path, with concrete assertions

Each task must use a numbered heading with optional metadata comments:

```markdown
## Task N: <description>

<!-- tdd: new-feature -->
```

...where N starts at 1 and incrementally numbers each task in the plan.

The metadata comments (placed right after the heading) are optional. If omitted, the executing-tasks skill infers the TDD scenario and checkpoint from context. When in doubt, include them explicitly.

Valid TDD values: `new-feature`, `modifying-tested-code`, `trivial`

Valid checkpoint values: `none`, `test`, `done`

### Level of detail

This is the #1 thing to get right. The plan is not a high-level outline — it's a detailed recipe that the executing-tasks skill will follow step by step. If you write "implement login handler" without showing the code, the executing agent has to guess, and that defeats the purpose of the plan.

Think of it this way: the plan author (you, now) has the full design context, the domain model, and the architecture in mind. The plan executor (a future agent session) will have none of that context — just the plan file. Write accordingly.

**What "concrete code" means in practice:**
- SQL: `CREATE TABLE` statements with all columns, types, and constraints
- Types/interfaces: full type definitions with fields
- Functions: signature + body (the logic, not just the name)
- Tests: concrete assertions (`expect(result.status).toBe(409)`) not descriptions ("test that it returns an error")
- Routes: the actual handler code with validation, error handling, and response format
- Config: exact values, not "configure appropriately"

**Bad** (too vague — the executor must guess):
```
3. Implement bookmark model
```

**Good** (executor can copy-paste):
```
3. Implement `src/db/bookmarks.ts`:

```ts
import db from '../db.js';

export function createBookmarksTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      messageId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, messageId)
    )
  `);
}

export function insertBookmark(userId: string, messageId: string) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO bookmarks (id, userId, messageId) VALUES (?, ?, ?)').run(id, userId, messageId);
  return { id, userId, messageId };
}
```
```

### Task body structure

The examples below show the structure — headings, metadata comments, checkpoints, and step numbering. For the code content within steps, follow the detail level described above.

**No checkpoint** — numbered steps only:
```markdown
## Task 1: Create User model

<!-- tdd: new-feature -->

Files:
- `src/user/model.ts`
- `src/user/model.test.ts`

Steps:
1. Write failing test for User model creation
2. Run test — confirm it fails
3. Implement User model
4. Run test — confirm it passes
```

**`checkpoint: test`** — gate after test, before implementing:
```markdown
## Task 2: Write auth tests

<!-- tdd: new-feature -->
<!-- checkpoint: test -->

Files:
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement login handler
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.
```

**`checkpoint: done`** — gate after all steps including refactor/lessons:
```markdown
## Task 3: Add login endpoint

<!-- tdd: new-feature -->
<!-- checkpoint: done -->

Files:
- `src/auth/login.ts`
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails
3. Implement login handler
4. Run test — confirm it passes
5. Add edge case tests (invalid password, missing email)
6. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
7. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```

**Both checkpoints** — gate after test, then gate after refactor/lessons:
```markdown
## Task 4: Complex auth flow

<!-- tdd: new-feature -->
<!-- checkpoint: test -->
<!-- checkpoint: done -->

Steps:
1. Write failing test for auth flow
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement auth flow
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```


## Vertical slices

Each task should be a **vertical slice** — a thin path through ALL relevant layers end-to-end, delivering one complete piece of observable behavior.

```
WRONG (horizontal):
  Task 1: Create database schema for users
  Task 2: Write user API endpoints
  Task 3: Build user UI components
  Task 4: Wire everything together

RIGHT (vertical):
  Task 1: User can sign up (model + endpoint + validation + test)
  Task 2: User can log in (auth check + token + test)
  Task 3: User can view profile (query + endpoint + test)
```

Order tasks so each one can be verified independently and delivers a complete vertical slice. If a task requires infrastructure (models, types) that no previous task has created, include it in that task — don't create it as a separate task.

Vertical slices ensure every committed task leaves the codebase in a testable state and reduces the blast radius of a bad task.

## TDD in the plan

Label each task with its TDD scenario:

| Scenario | When | Instructions in the task |
|---|---|---|
| **New feature** | Adding new behavior | Write failing test → run it → implement → run it |
| **Modifying tested code** | Changing existing behavior | Run existing tests first → modify → verify they pass |
| **Trivial** | Config, docs, naming | Use judgment |

## Checkpoint labels

Label each task with a `checkpoint` to require human review before proceeding. The checkpoint gate (`⏸ CHECKPOINT`) goes in the task body — the agent follows the plan step by step and pauses when it reaches the gate.

| Checkpoint | When to use | What the plan should include |
|---|---|---|
| *(none)* | Trivial tasks, well-understood changes | Numbered steps only |
| **`checkpoint: test`** | Test design matters (API contracts, edge cases, complex behavior) | Steps up to test → `⏸ CHECKPOINT: test` → implement steps (including refactor/lessons) |
| **`checkpoint: done`** | Implementation review matters (complex logic, security, performance) | Steps (including refactor/lessons) → `⏸ CHECKPOINT: done` |
| Both | Non-obvious tests AND complex logic | Steps up to test → `⏸ CHECKPOINT: test` → implement steps (including refactor/lessons) → `⏸ CHECKPOINT: done` |

Use judgment when assigning checkpoints. Prefer `checkpoint: test` for new features with non-obvious test design. Prefer `checkpoint: done` for tasks where the implementation approach is debatable. Most tasks should not need a checkpoint. The user can adjust checkpoints when reviewing the plan.

## After the plan

Ask: "Ready to execute? Run `/skill:executing-tasks`"
