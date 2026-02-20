---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

> **Related skills:** Follow up with `/skill:requesting-code-review` before merging. Done? `/skill:finishing-a-development-branch`.

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

If a tool result contains a ⚠️ workflow warning, stop immediately and address it before continuing.

## Boundaries
- Run verification commands: yes
- Read code and output: yes
- Edit source code: no

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports without checking outputs
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without fresh evidence**

## Key Patterns

**Tests:**
```
✅ Run tests + confirm 0 failures before saying "tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Verify red → green sequence before claiming fix durability
❌ "I added a regression test" (without proving red-green)
```

**Build:**
```
✅ Run build command + confirm exit 0
❌ "Linter passed" (linter ≠ build)
```

**Requirements:**
```
✅ Check requirements one-by-one, report verified status
❌ "Tests pass, so everything is complete"
```

**Agent delegation:**
```
✅ Verify agent output + diffs + commands yourself
❌ Trust "agent says success"
```

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases and paraphrases
- Implications of success
- ANY communication suggesting completion/correctness

## Enforcement

The workflow-monitor extension monitors `git commit`, `git push`, and `gh pr create`. If you haven't run a passing test suite since your last source file edit, a warning is injected into the tool result. The warning clears automatically after a fresh passing test run.

When all verification passes, mark the verify phase complete: call `plan_tracker` with `{action: "update", status: "complete"}` for the current phase.
