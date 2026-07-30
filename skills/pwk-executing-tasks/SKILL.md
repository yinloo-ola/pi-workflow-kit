---
name: pwk-executing-tasks
description: "Implement a plan requirement-by-requirement with test-first discipline and full autonomy. Run after pwk-writing-plans. Each requirement: write integration tests (red) → checkpoint → implement to green → checkpoint → pwk-code-review."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` requirement-by-requirement, with file-based progress tracking.

The plan is a **behavioral spec** (acceptance criteria + integration tests). You have **full autonomy** to choose structure, signatures, and internals — the acceptance criteria and integration tests define *what*; you decide *how*. Do not ask the plan for implementation steps; it deliberately doesn't contain them.

## Before you start

1. **Check git state** — `git status` and `git log --oneline -5`. Note uncommitted changes.
2. **Find the plan + report** — look for `docs/plans/*-implementation.md`. If several, list them and ask which. Print a one-line discovery report, e.g. `Found: design "auth" — execute phase (1/3 requirements done)`. If a matching `*-progress.md` exists, this is a **resume** (see [Resume](#resume)).
3. **Workspace isolation** — if not already on a feature branch/worktree, suggest:
   - **Branch** (smaller): `git checkout -b <topic>` (derive `<topic>` from the plan doc)
   - **Worktree** (larger; keeps main clean): `git worktree add ../<repo>-<topic> -b <topic>` — moves plan docs in and hands off to a new session there
   Wait for the user's choice.

## First run

1. **Parse the plan** — read all `## Requirement N:` headings. Build the progress table with all requirements as `⬜ pending`.
2. **Create the progress file** at `docs/plans/<plan-name>-progress.md`:

   ```markdown
   # Progress: <topic>

   Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
   Branch: <branch>
   Started: <ISO timestamp>
   Last updated: <ISO timestamp>

   | # | Status | Requirement | Commit |
   |---|--------|-------------|--------|
   | 1 | ⬜ pending | <requirement name> | — |
   ```
3. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
4. Begin requirement 1 (see [Per-requirement execution](#per-requirement-execution)).

## Resume

1. Read the progress file. Find the first requirement that is `⬜ pending`, `🔄 in-progress`, `⏸ tests-review`, or `⏸ complete-review`.
2. Resume from the recorded state:
   - `⏸ tests-review` / `⏸ complete-review` → re-present that checkpoint and wait.
   - `🔄 in-progress` mid-write → continue the requirement.
   - `⬜ pending` → start it.

## Progress file

Path: `docs/plans/<plan-name>-progress.md`. Update the matching row directly (not via pattern matching that could corrupt the table). Update `Last updated` on every change.

| Status | Meaning |
|--------|---------|
| `⬜ pending` | Not started |
| `🔄 in-progress` | Writing tests or implementing |
| `⏸ tests-review` | Paused at checkpoint: tests, awaiting human approval |
| `⏸ complete-review` | Paused at checkpoint: complete, awaiting human approval |
| `✅ done` | Committed and code-reviewed |
| `❌ failed` | Could not complete (append `Failed: <reason>`) |
| `⏭ skipped` | User chose to skip |

## Per-requirement execution

For each requirement:

1. **Mark in-progress** — `🔄 in-progress`.
2. **Write the integration tests (red).** Read the requirement's acceptance criteria + integration-test cases from the plan and write the actual test files. Run them — confirm they **fail** (red). If they pass immediately, the behavior may already exist or the tests are wrong; investigate before proceeding.
3. **⏸ CHECKPOINT: tests.** Stop. Do not implement yet. Mark `⏸ tests-review`. Present the integration tests and the failing output to the human, and wait for approval. The human reviews whether the right behaviors are being specified.
   - **approve** → return to `🔄 in-progress` and continue.
   - **request changes** → revise the tests, re-run, re-present.
4. **Implement (green).** With full autonomy, implement whatever is needed to make the integration tests pass and satisfy the acceptance criteria — you choose the structure, modules, signatures, and internals. Run the tests after each meaningful change. Refactor for clarity (shallow modules, no duplication, seam discipline) while tests stay green.
5. **Learn.** If you caught a repeat mistake, append a **generic** rule to `docs/lessons.md` (strip domain specifics).
6. **⏸ CHECKPOINT: complete.** Stop. Do **not** commit yet. Mark `⏸ complete-review`. Run the tests (show passing output) and `git diff`, present the implementation to the human, and wait for approval.
   - **approve** → return to `🔄 in-progress` and continue.
   - **request changes** → revise, re-run, re-present at this same checkpoint.
7. **Commit.** `git add` the relevant files and commit with a clear message. Mark `✅ done` and record the commit hash.
8. **Code review.** Run `/skill:pwk-code-review` for this requirement (code tracing, spec alignment, code smells, hazard check). It may apply smell fixes; if so, commit those. Flagged non-trivial issues become follow-ups.
9. **Loop** — go to step 1 for the next `⬜ pending` requirement, or see [After all requirements](#after-all-requirements).

### Checkpoint gates are mandatory

Both checkpoints are **hard stops, not optional**. When you reach one:
- Stop executing immediately. Do not pass it without explicit human approval.
- **Never** `git add` or `git commit` before the human approves at a checkpoint.
- Mark the progress file to the review status **before** pausing.

## User override commands

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current requirement `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` to resume later |
| `retry` | Re-read the requirement, start over |

## Receiving feedback (outside a checkpoint)

When the user shares review feedback outside a checkpoint: verify the criticism against the code, evaluate the suggestion, then implement (with tests) or push back with evidence. Don't blindly apply.

## After all requirements

When no `⬜ pending` or `❌ failed` requirements remain:

```
✅ All requirements complete!

| # | Status | Requirement |
|---|--------|-------------|
| 1 | ✅ done | <name> |
| … | … | … |

   - Ship: /skill:pwk-finalizing
```

## If you're stuck

1. Re-read the requirement's acceptance criteria — you may have drifted.
2. Check `git log` for context.
3. Ask the user — clarify beats guessing.
4. If still stuck, mark `❌ failed` with the reason and move on.
5. Check `docs/lessons.md` — a prior lesson may apply.