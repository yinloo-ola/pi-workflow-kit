---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

> **Related skills:** Before claiming done, use `/skill:verification-before-completion` to verify tests actually pass.

# Test-Driven Development (TDD)

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

**Active enforcement:** The workflow monitor extension tracks your TDD phase (RED→GREEN→REFACTOR) and will warn if you write production code without a failing test. Use `workflow_reference` to look up rationalizations, examples, and anti-patterns on demand.

## When to Use

**Always:** New features, bug fixes, refactoring, behavior changes.

**Exceptions (ask your human partner):** Throwaway prototypes, generated code, configuration files.

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete. Implement fresh from tests.

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen.

**Requirements:**
- One behavior per test
- Clear name describing behavior
- Real code (no mocks unless unavoidable)

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

Test passes? You're testing existing behavior. Fix test.

### GREEN — Minimal Code

Write simplest code to pass the test. Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN — Watch It Pass

**MANDATORY.**

Confirm: test passes, other tests still pass, output pristine.

Test fails? Fix code, not test. Other tests fail? Fix now.

### REFACTOR — Clean Up

After green only: remove duplication, improve names, extract helpers. Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Why Order Matters

Tests written after code pass immediately — proving nothing. You might test the wrong thing, test implementation not behavior, or miss edge cases.

Test-first forces you to see the test fail, proving it actually tests something.

"Deleting X hours of work is wasteful" is sunk cost fallacy. "TDD is dogmatic" is wrong — TDD IS pragmatic. "Tests after achieve the same goals" — no: tests-after answer "what does this do?" not "what should this do?"

For the full rationalization table and rebuttals, use `workflow_reference({ topic: "tdd-rationalizations" })`.

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Never fix bugs without a test.

## Reference

Use `workflow_reference` for detailed guidance:
- `tdd-rationalizations` — Full rationalization table with rebuttals
- `tdd-examples` — Good/bad code examples, bug fix walkthrough
- `tdd-when-stuck` — Solutions for common blockers, verification checklist
- `tdd-anti-patterns` — Mock pitfalls, test-only methods, incomplete mocks

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without your human partner's permission.
