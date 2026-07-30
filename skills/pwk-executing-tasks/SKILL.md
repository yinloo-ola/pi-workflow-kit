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
3. **Workspace isolation should already be done** — `pwk-writing-plans` set up the branch/worktree before handoff. If you land here still on `main`, tell the user the workspace wasn't set up and suggest doing it before executing.

## First run

1. **Parse the plan** — read all `## Requirement N:` headings. Build the progress table with all requirements as `⬜ pending`. Process them in **listed order** — the plan is already in build order; do not reorder.
2. **Setup pre-flight** — if the plan has a `## Setup` section, follow it: install dependencies, apply migrations, and seed data. Run the existing test suite to confirm nothing broke. **⏸ CHECKPOINT: setup** — present the migration/output to the human and wait for approval.
   - **approve** → continue.
   - **request changes** → revise and re-present.
   (Only runs on the first `First run` — the progress file is created after this step, so a resumed session skips setup.)
3. **Create the progress file** at `docs/plans/<plan-name>-progress.md`:

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
4. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
5. Begin requirement 1 (see [Per-requirement execution](#per-requirement-execution)).

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
| `🔎 review` | Committed; `pwk-code-review` in progress |
| `✅ done` | `pwk-code-review` complete (smells fixed, hazards noted), all green |
| `❌ failed` | Could not complete; partial work discarded/reverted (append `Failed: <reason>`) |
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
7. **Commit.** `git add` the relevant files and commit with a clear message. (Status stays `🔄 in-progress` — not done yet.)
8. **Code review.** Mark `🔎 review`. Attempt isolated code-review via the `subagent` tool — four agents review the same diff in parallel, each from a different dimension (each gets a fresh context window, zero pollution from previous requirements):

   Gather the requirement's scope: acceptance criteria, integration test cases, and git diff (`git log --oneline -5 && git diff HEAD~N..HEAD`).

   **If the `subagent` tool is available**, invoke it with parallel tasks:
   ```json
   {
     "tasks": [
       {"agent": "pwk-spec-reviewer", "task": "<scope + diff here>\n\n## Spec Review\nFor each acceptance criterion, point to the code and test that satisfy it. Flag gaps (criterion with no covering code or test) and scope creep (code beyond criteria). Report only — do not modify files. Your findings are collected by the parent agent which applies fixes and commits changes."},
       {"agent": "pwk-tracing-reviewer", "task": "<scope + diff here>\n\n## Trace Review\nTrace every new/changed code path end-to-end against tests. Note untested branches, dead branches, paths where the trace breaks. Report only — do not modify files. Your findings are collected by the parent agent which applies fixes and commits changes."},
       {"agent": "pwk-smell-reviewer", "task": "<scope + diff here>\n\n## Smell Review\nReport: shallow modules (interface ≈ implementation complexity), duplication, missing seams / premature abstraction, poor naming, magic values, dead code. Flag only: smells requiring risky large refactors. Report only — do not modify files. Your findings are collected by the parent agent which applies fixes and commits changes."},
       {"agent": "pwk-hazard-reviewer", "task": "<scope + diff here>\n\n## Hazard Review\nAudit changed code against these hazards: unbounded ops (KEYS/SCAN/full-table loads), missing indexes, unbounded concurrency (Promise.all without limits), long-running transactions, query/command interpolation (injection), unrestricted uploads/temp flooding, silent swallowing loops. Write [SAFE] (1-line reason) or [TRIGGERED] (mitigation). Report only — do not modify files. Your findings are collected by the parent agent which applies fixes and commits changes."}
     ],
     "agentScope": "both",
     "cwd": "<repo-root>"
   }
   ```

   **On success:** collect all findings. For smell-review findings: identify the smells, apply the fixes yourself (re-run integration tests after changes — must stay green, commit). For trace/spec/hazard findings: flag as follow-ups for human decision or later fix. Update the progress-file row to `✅ done`. Flag non-trivial issues as follow-ups.

   **Fallback** (subagent unavailable or returns error): revert to inline review — run `/skill:pwk-code-review` for this requirement as before.
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

When no `⬜ pending` or `❌ failed` requirements remain, run the **integration gate** before suggesting finalize. Per-requirement code-review only saw each requirement's diff in isolation — this is where you prove the requirements *compose* into the feature:

1. **Run the FULL test suite** (not just the last requirement's tests). Every test must pass. A failure here means one requirement regressed another — fix it now, in execute context, while the progress file and fix autonomy are at hand.
2. **Confirm the requirements compose** into the feature the design doc described. Each requirement passed alone; do they deliver the intended end-to-end behavior *together*? If integration exposes a gap, fix it here (with tests) before shipping.

Only when the full suite is green and the feature works end-to-end:

```
✅ All requirements complete — integration verified!

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
4. If still stuck:
   - Discard uncommitted changes (`git restore .`).
   - If the requirement has already been committed (step 7 completed), also revert its commit(s) so partial work leaves no trace on the shipped branch (`git revert HEAD --no-edit` if only the requirement commit; `git revert HEAD~N..HEAD --no-edit` if multiple commits including code-review smell fixes).

   **Never leave a failed requirement's partial work on the shipped branch.** Dead code from incomplete requirements must be cleaned up before moving on.
5. Mark `❌ failed` with the reason and move on.
6. Check `docs/lessons.md` — a prior lesson may apply.