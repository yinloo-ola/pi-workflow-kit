---
name: executing-tasks
description: Use when you have an approved implementation plan to execute task-by-task with human gates and bounded retries
---

# Executing Tasks

## Overview

Execute an implementation plan task-by-task using a per-task lifecycle with human gates and bounded retry loops. Each task goes through: **define → approve → execute → verify → review → fix**.

**Announce at start:** "I'm using the executing-tasks skill to implement the plan."

## Prerequisites

Before starting, verify:
- [ ] On the correct branch/worktree
- [ ] Plan file exists at `docs/plans/YYYY-MM-DD-<name>.md`
- [ ] Plan has been reviewed and approved

## Initialization

1. Read the plan file and extract all tasks
2. Initialize plan_tracker:
   ```
   plan_tracker({ action: "init", tasks: ["Task 1 name", "Task 2 name", ...] })
   ```
3. Mark the execute phase as active

## Per-Task Lifecycle

For each task in the plan:

### 1. Define

**Code task →** Write actual test file(s) with assertions:
- Create test files that exercise the new/modified behavior
- Tests must be specific, deterministic, and fail before implementation
- Include edge cases and error conditions

**Non-code task →** Write natural language acceptance criteria:
- List specific, measurable conditions
- Each criterion must be independently verifiable

Update plan_tracker:
```
plan_tracker({ action: "update", index: N, status: "in_progress" })
plan_tracker({ action: "update", index: N, phase: "define" })
```

### 2. Approve (Human Gate)

Present the test cases or acceptance criteria to the human:

**For code tasks:**
- Show the test files to be written
- Explain what each test verifies
- Ask: "Do these test cases cover the requirements? Approve, revise, or reject?"

**For non-code tasks:**
- Show the acceptance criteria list
- Ask: "Do these criteria capture the intent? Approve, revise, or reject?"

**No execution begins until approved.**

If revised → return to Define step.
If rejected → skip task and mark as blocked.

```
plan_tracker({ action: "update", index: N, phase: "approve" })
```

### 3. Execute (max 3 attempts)

Implement the task following the plan's steps.

For each attempt:
1. Write/modify code as specified in the plan
2. Run tests or verify against acceptance criteria
3. If all pass → move to Verify
4. If failures:
   - Analyze the failures
   - Fix the implementation
   - Increment executeAttempts
   - If executeAttempts reaches 3 → **escalate to human**

```
plan_tracker({ action: "update", index: N, phase: "execute" })
plan_tracker({ action: "update", index: N, executeAttempts: 1 })  // after each attempt
```

**Escalation on budget exhaustion:**
> "I've attempted this task 3 times without success. Options:
> 1. Revise the scope or approach
> 2. Adjust the test cases / acceptance criteria
> 3. Abandon this task and move on
> 
> What would you like to do?"

### 4. Verify

Re-run all tests or check all acceptance criteria.

Report results to the human:
- ✅ Condition 1: passed
- ✅ Condition 2: passed
- ❌ Condition 3: failed — [description of failure]

**Does not auto-fix.** Flags failures to human for decision.

```
plan_tracker({ action: "update", index: N, phase: "verify" })
```

If failures detected:
> "Verification found issues. Options:
> 1. Go back to Execute for another attempt
> 2. Revise the tests/criteria
> 3. Accept as-is (mark partial)
> 
> What would you like to do?"

### 5. Review (two layers)

**Layer 1 — Subagent review:**
- Dispatch a subagent to review the implementation against the task spec
- Subagent checks: correctness, edge cases, code quality, test coverage
- Subagent reports findings

**Layer 2 — Human sign-off:**
- Present the subagent review + test results to the human
- Summarize what was done, what passed, any concerns
- Ask: "Does this look good? Approve or request changes?"

```
plan_tracker({ action: "update", index: N, phase: "review" })
```

If issues found → move to Fix.

### 6. Fix (max 3 loops, re-enters Verify → Review)

1. Address the review feedback
2. Re-enter Verify → Review cycle
3. Increment fixAttempts after each fix round
4. If fixAttempts reaches 3 → **escalate to human**

```
plan_tracker({ action: "update", index: N, phase: "fix" })
plan_tracker({ action: "update", index: N, fixAttempts: 1 })
```

**Escalation on budget exhaustion:**
> "I've attempted fixes 3 times. Options:
> 1. Proceed as-is despite remaining issues
> 2. Keep fixing (at your own risk)
> 3. Abandon this task and move on
> 
> What would you like to do?"

### Task Complete

When both reviewers are satisfied and all conditions pass:

```
plan_tracker({ action: "update", index: N, status: "complete" })
```

Commit the task:
```bash
git add <relevant files>
git commit -m "feat(task N): <description>"
```

## Escalation Rules

| Event | Action |
|-------|--------|
| Execute 3 attempts exhausted | Escalate to human — never auto-skip |
| Fix loop 3 attempts exhausted | Escalate to human — never auto-skip |
| Verify fails | Flag to human — human decides next step |

**No silent skipping. Consistent escalation everywhere.**

## Finalize

After all tasks complete (or are explicitly accepted by human):

### 1. Final Review
- Dispatch subagent to review the entire implementation holistically
- Check for integration issues, consistency across tasks, documentation gaps

### 2. Create PR
```bash
git push origin <branch>
gh pr create --title "feat: <feature summary>" --body "<task summary>"
```

### 3. Archive Planning Docs
```bash
mkdir -p docs/plans/completed
mv docs/plans/<plan-file> docs/plans/completed/
```

### 4. Update Repo Docs
- Update CHANGELOG with feature summary
- Update README if API/surface changed
- Update inline documentation as needed

### 5. Update pi-superpowers-plus README
- Document new workflow phases
- Update skill list (8 skills instead of 12)
- Note architecture changes

### 6. Clean Up
- Remove worktree if one was used
- Mark finalize phase complete

## Boundaries
- Read code, docs, and tests: yes
- Write tests and implementation code: yes (within current task scope)
- Write to docs/plans/completed/: yes (during finalize)
- Edit files outside task scope: no (unless human explicitly approves)

## Remember
- Always present test cases/criteria for human approval before executing
- Track per-task phase and attempts in plan_tracker
- Escalate immediately on budget exhaustion — never silently skip or continue
- Verify does not auto-fix — always flag to human
- Review has two layers (subagent first, then human)
- Fix loops re-enter verify → review (max 3 fix loops)
- Execute has separate budget (max 3 attempts)
- Total max cycles per task: 3 execute + 3 fix = 6
