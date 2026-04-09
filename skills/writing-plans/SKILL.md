---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

> **Related skills:** Did you `/skill:brainstorming` first? Ready to implement? Use `/skill:executing-tasks`.

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>-implementation.md`

## Boundaries
- Read code and docs: yes
- Write to docs/plans/: yes
- Edit or create any other files: no

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-tasks skill to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

Every task must declare its type explicitly so `executing-tasks` can initialize `plan_tracker` with the correct metadata.

### Code task template

```markdown
### Task N: [Component Name]

**Type:** code
**TDD scenario:** [New feature — full TDD cycle | Modifying tested code — run existing tests first | Trivial change — use judgment]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

### Non-code task template

```markdown
### Task N: [Documentation / rollout / analysis task]

**Type:** non-code

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

**Acceptance criteria:**
- Criterion 1: [Specific, observable outcome]
- Criterion 2: [Specific, observable outcome]
- Criterion 3: [Specific, observable outcome]

**Implementation notes:**
- Update the listed files only.
- Keep terminology consistent with the rest of the repo.
- Reference the relevant code paths or docs where useful.

**Verification:**
- Review each acceptance criterion one-by-one.
- Confirm the updated docs match the implemented behavior.
```

## Remember
- Exact file paths always
- Every task must include `**Type:** code` or `**Type:** non-code`
- Non-code tasks must include explicit `**Acceptance criteria:**`
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills
- DRY, YAGNI, TDD, frequent commits
- Order tasks so each task's dependencies are completed by earlier tasks
- If plan exceeds ~8 tasks, consider splitting into phases with a checkpoint between them

## Execution Handoff

After saving the plan, the workflow monitor automatically tracks phase transitions when you invoke skills.

Then offer execution:

**"Plan complete and saved to `docs/plans/<filename>.md`. Ready to execute with `/skill:executing-tasks`."**

The executing-tasks skill handles the full per-task lifecycle (define → approve → execute → verify → review → fix) with human gates and bounded retry loops.
