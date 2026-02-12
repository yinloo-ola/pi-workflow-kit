---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

> **Related skills:** Need an isolated workspace? `/skill:using-git-worktrees`. Verify each task with `/skill:verification-before-completion`. Done? `/skill:finishing-a-development-branch`.

# Executing Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for architect review.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Initialize the `plan_tracker` tool and proceed

### Step 2: Execute Batch
**Default: First 3 tasks**

For each task:
1. Update task status via `plan_tracker` tool
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Update task status via `plan_tracker` tool

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use `/skill:finishing-a-development-branch`
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When the Plan Is Wrong

**Different from being blocked** — you're not stuck, but you've learned something that makes the remaining plan unworkable.

- Stop executing immediately
- Report what you've learned and why remaining tasks won't work
- Propose a revised approach, or ask your human partner to revisit the design
- Don't continue executing tasks you know are heading somewhere bad

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- TDD is the default for production code: failing test first, verify fail, implement, verify pass
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Between batches: just report and wait
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **`/skill:using-git-worktrees`** - Recommended: Set up isolated workspace before starting. For small changes, branching in the current directory is acceptable with human approval.
- **`/skill:writing-plans`** - Creates the plan this skill executes
- **`/skill:finishing-a-development-branch`** - Complete development after all tasks
