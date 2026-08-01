---
name: pwk-executing-tasks
description: "Implement a plan requirement-by-requirement with test-first discipline and full autonomy. Run after pwk-writing-plans. Each requirement: write integration tests (red) → checkpoint → implement to green → checkpoint → pwk-code-review."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` requirement by requirement, tracking progress in a file.

The plan is a **behavioral spec** (acceptance criteria + integration tests) — it deliberately contains no implementation steps. You choose structure, signatures, and internals; the criteria define *what*, you decide *how*.

## Before you start

1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
2. **Find the plan** — glob `docs/plans/*-implementation.md`; if several, ask which. Report one line, e.g. `Found: design "auth" — execute phase (1/3 done)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.

## First run

1. **Parse the plan** — read every `## Requirement N:` heading and its `### Checkpoints` / `### Review` tags (defaults `full` / `parallel`). Requirements run in **listed order** — the plan is already in build order; do not reorder.
2. **Setup pre-flight** *(only if the plan has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches):

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
5. Start requirement 1.

## Resume

Find the first row that is `⬜ pending`, `🔄 in-progress`, `⏸ tests-review`, or `⏸ complete-review`:
- `⏸ *-review` → re-present that checkpoint and wait.
- `🔄 in-progress` → continue the requirement.
- `⬜ pending` → start it.

## Progress file

Update the matching row directly (not via pattern matching that could corrupt the table). Update `Last updated` on every change.

| Status | Meaning |
|--------|---------|
| `⬜ pending` | Not started |
| `🔄 in-progress` | Writing tests or implementing |
| `⏸ tests-review` | Paused at tests checkpoint, awaiting approval |
| `⏸ complete-review` | Paused at complete checkpoint, awaiting approval |
| `🔎 review` | Committed; code review in progress |
| `✅ done` | Reviewed (smells fixed, hazards noted), all green |
| `❌ failed` | Abandoned; partial work discarded/reverted (append `Failed: <reason>`) |
| `⏭ skipped` | User chose to skip |

## Per-requirement execution

1. **Mark 🔄 in-progress** and read this requirement's `### Checkpoints` / `### Review` tags.
2. **Write the integration tests (red).** Encode the acceptance criteria + test cases from the plan as real test files; run them; confirm they **fail**. If they pass immediately, the behavior may already exist or the tests are wrong — investigate before proceeding.
3. **⏸ CHECKPOINT: tests** *(fires for `full` and `spec`)* — mark `⏸ tests-review`, present the tests + failing output, wait. **request changes** → revise, re-run, re-present. With `none`, show the red output inline and proceed.
4. **Implement (green)** with full autonomy. Run tests after each meaningful change; refactor for clarity (deep modules, no duplication, seam discipline) while tests stay green.
5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
6. **⏸ CHECKPOINT: complete** *(fires for `full` only)* — mark `⏸ complete-review`, show passing tests + `git diff`, wait. With `spec`/`none`, show them inline and proceed (**review** covers implementation quality; `spec` requires at least `inline` review).
7. **Commit** the relevant files with a clear message. Status stays `🔄 in-progress` — not done yet.
8. **Composition check** — if this diff touched code shared with other requirements in the plan, run the **full test suite** now and fix any cross-requirement regression while the context is fresh. Otherwise keep running just this requirement's tests.
9. **Code review** — mark `🔎 review`; drive review by the `### Review` tag (`parallel | inline | skip`):
   - **`parallel`** — four fresh-context reviewers via the `subagent` tool (see below).
   - **`inline`** — run `/skill:pwk-code-review` as a single pass.
   - **`skip`** — mark `✅ done` and move to the next requirement.

   **Parallel path** — gather scope (acceptance criteria, test cases, `git log --oneline -5 && git diff HEAD~N..HEAD`) and invoke:
   ```json
   {
     "tasks": [
       {"agent": "pwk-spec-reviewer", "task": "<scope + diff here>"},
       {"agent": "pwk-tracing-reviewer", "task": "<scope + diff here>"},
       {"agent": "pwk-smell-reviewer", "task": "<scope + diff here>"},
       {"agent": "pwk-hazard-reviewer", "task": "<scope + diff here>"}
     ],
     "agentScope": "both",
     "cwd": "<repo-root>"
   }
   ```
   The reviewer checklists live only in `agents/pwk-*-reviewer.md` — don't restate them in the task strings (duplication guarantees drift). Reviewers are read-only reporters; the executing agent applies fixes and commits.

   **On success** — apply smell fixes yourself (re-run integration tests, must stay green, commit), flag trace/spec/hazard findings as follow-ups for the human, mark `✅ done`.

   **Fallback** — subagent tool unavailable or errors → run `/skill:pwk-code-review` inline instead.
10. **Loop** to step 1 for the next `⬜ pending` requirement, or see [After all requirements](#after-all-requirements).

### Checkpoint gates are mandatory (when the tag says so)

`### Checkpoints` accepted values: `full | spec | none` → both stops / tests stop only / no stops. When a checkpoint fires it is a **hard stop**:
- Stop immediately; never proceed without explicit human approval.
- **Never** `git add` or `git commit` before approval at a checkpoint.
- Mark the progress file to the review status **before** pausing.

`Checkpoints: spec` with `Review: skip` is invalid (nothing would cover implementation quality) — stop and ask the human to fix the tags; use `Checkpoints: none` for truly trivial diffs.

## User override commands

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current requirement `⏭ skipped`, move to next |
| `status` | Show the progress table |
| `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
| `retry` | Re-read the requirement, start over |

## Receiving feedback (outside a checkpoint)

Verify the criticism against the code, evaluate the suggestion, then implement (with tests) or push back with evidence. Don't blindly apply.

## After all requirements

When no `⬜ pending` or `🔄 in-progress` requirements remain, run the **integration gate** before suggesting finalize — per-requirement review only saw each diff in isolation; this proves the requirements *compose* into the feature:

1. **Run the FULL test suite.** A failure here means one requirement regressed another — fix it now, in execute context.
2. **Run the feature-acceptance test.** The plan's `## Feature acceptance` section specifies one end-to-end test exercising the requirements *together* against the design's claim. Write it if missing; run it; it must pass. If the plan has no such section, stop and tell the human — the gate has nothing concrete to verify.
3. **Confirm composition.** Do the requirements together deliver the end-to-end behavior the design doc described? Fix gaps here, with tests, before shipping.

Then present:

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
2. Check `git log` for context. Ask the user — clarify beats guessing.
3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
4. Mark `❌ failed` with the reason and move on. Check `docs/lessons.md` — a prior lesson may apply.