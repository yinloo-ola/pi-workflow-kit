---
name: verify
description: "Post-implementation code verification with three expert review passes — security, optimization, and traceability. Use after executing-tasks and before finalizing to catch issues that pass tests but break in production. Runs the 'last prompt' pattern: adversarial security review, dead code and duplication audit, and end-to-end contract verification across every layer. Use this skill whenever the user says 'verify', 'review the code', 'check for issues', 'security review', 'the last prompt', 'audit', or when code has been implemented and needs a quality gate before shipping."
---

# Verify

Three expert review passes over the implemented codebase. Read-only — you **may** write the verification report to `docs/plans/`, but you **may not** modify source code.

The core insight: code that passes tests is not code that's ready. Working code can have security holes, dead branches, duplicated logic, and broken contracts between layers — especially when AI generates across many files without maintaining a single mental model of the whole system. This skill catches what tests miss.

## Process

1. **Check what's been done** — run `git log --oneline` and `git diff --stat` to understand the scope of recent changes. If nothing has been implemented, say "No code changes found. Run `/skill:executing-tasks` first." and stop.

2. **Identify the project's layers** — before reviewing, map the codebase's architecture. Look for layer boundaries: UI/handlers/routes → services/business logic → repositories/data access → database/models. Note the patterns: does the project use controllers, handlers, or routes? Services or use cases? Repositories or DAOs? This map drives the traceability pass.

3. **Run three expert review passes** — each pass adopts a distinct adversarial framing. Do them sequentially. For each pass, read the relevant code deeply — don't skim. Then write findings.

4. **Compile the report** — write all findings to `docs/plans/*-verification-report.md`. Present the report to the user and wait for feedback.

5. **Offer to create a remediation plan** — after the report, ask: "Want me to create a fix plan from these findings? Run `/skill:writing-plans` to turn the task list into executable tasks."

## Pass 1 — Security Review 🔴

**Framing:** A junior developer wrote this code. Now the best security expert on the team is reviewing it — adversarial, suspicious of everything. Trust nothing.

**What to look for:**

- **Input validation** — every external input (HTTP params, form data, headers, query strings, environment variables) must be validated and sanitized. Unvalidated input is a critical finding.
- **Authentication & authorization** — every endpoint that handles user data must have auth checks. Are there endpoints that skip auth? Can one user access another user's data by changing an ID?
- **Injection** — SQL queries built by string concatenation, unsanitized shell commands, template injection, XSS in HTML output. Any raw variable interpolated into a query or command is critical.
- **Secrets** — API keys, passwords, tokens hardcoded in source files. Check environment variable loading — are defaults set to empty or to actual secrets?
- **Data exposure** — are sensitive fields (passwords, tokens, PII) logged, returned in API responses, or stored unencrypted?
- **Dependency risks** — known-vulnerable packages (if `package.json`/`go.mod`/`requirements.txt` is present).

**Severity classification:**

| Severity | Definition |
|----------|-----------|
| Critical | Exploitable right now — auth bypass, injection, data leak |
| High | Likely exploitable — missing validation on sensitive endpoint, weak auth |
| Medium | Harder to exploit but real risk — verbose error messages leaking internals, missing rate limits |
| Low | Best practice violations — missing CSP headers, no HSTS, long session timeouts |

## Pass 2 — Optimization Review 🟡

**Framing:** A code quality expert looking for waste — things that make the codebase harder to maintain, slower to run, or more confusing than necessary.

**What to look for:**

- **Dead code** — functions, methods, types, or exports that are never called anywhere in the codebase. Search for definitions and verify they have callers.
- **Duplication** — the same logic implemented in slightly different ways across multiple files. AI-generated code is especially prone to this — if context was lost between sessions, the AI solved the same sub-problem differently in two places. Flag each pair with file paths and line numbers.
- **Over-engineering** — abstractions, interfaces, or layers that add complexity without earning their keep (only one implementation, no real variation across the seam).
- **Under-engineering** — god functions, 200-line blocks, deeply nested conditionals that should be extracted.
- **Performance concerns** — N+1 queries, unbounded loops, unnecessary copies of large data structures, missing pagination on list endpoints.

**Priority classification:**

| Priority | Definition |
|----------|-----------|
| P0 | Dead code in a critical path or duplicated logic that will diverge |
| P1 | Significant duplication or over-engineering that increases maintenance cost |
| P2 | Minor cleanups — long functions, missing pagination, style inconsistencies |

## Pass 3 — Traceability Review 🔵

**Framing:** An integration expert tracing every user-facing action end-to-end — from UI to database and back. The AI generates code file-by-file, and the seams between files are where bugs hide.

**What to look for:**

1. **Map every entry point** — list all handlers, routes, controllers, or event listeners that receive external input.
2. **Trace each call chain** — for each entry point, follow the call: handler → service → repository → database. At each boundary, verify:
   - **Function name** — does the caller use the exact function name the callee exposes?
   - **Argument names** — does the caller pass `userId` when the function expects `user_id`? Does `id` mean the same thing in both layers?
   - **Argument types** — is a string passed where an integer is expected? Is an object shape different from what the next layer destructures?
   - **Return shape** — does the caller expect fields that the callee actually returns? Are response DTOs consistent across layers?
3. **Check error propagation** — when a database query returns no results, does the service layer handle it? Does the handler return 404 or 500? Do errors propagate cleanly or get swallowed silently?
4. **Verify the round-trip** — if the UI calls `getUser(id)` and displays `user.name`, trace that `name` actually exists in the DB schema, gets selected by the query, mapped by the repository, passed through the service, included in the response, and rendered by the UI.

**This is the pass that catches the most bugs.** AI-generated code will often have a frontend calling `getUserProfile(userId)` and a backend exposing `get_user_profile(user_id)` — both work in isolation, neither works together.

**Severity classification:**

| Severity | Definition |
|----------|-----------|
| Critical | Call chain is completely broken — function doesn't exist or signature is fundamentally wrong |
| High | Signature mismatch — wrong arg names, wrong types, missing required fields |
| Medium | Silent error handling — errors swallowed without logging or user feedback |
| Low | Inconsistent naming conventions that could confuse future developers |

## Report Format

Write findings to `docs/plans/*-verification-report.md` using this structure:

```markdown
# Verification Report: <feature/topic>

**Date:** <ISO date>
**Scope:** <summary of what was reviewed>
**Reviewer:** AI verify skill (security + optimization + traceability)

## Summary

| Pass | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| Security | X | X | X | X |
| Optimization | — | X | X | X |
| Traceability | X | X | X | X |
| **Total** | **X** | **X** | **X** | **X** |

## 🔴 Security Findings

### [S-001] Critical — <short title>

**Location:** `path/to/file.ts:line`

**Issue:** <what's wrong and why it matters>

**Fix:** <concrete remediation step>

### [S-002] High — <short title>
...

## 🟡 Optimization Findings

### [O-001] P0 — <short title>

**Location:** `path/to/file.ts:line` and `path/to/other.ts:line`

**Issue:** <what's wrong>

**Fix:** <concrete remediation step>

### [O-002] P1 — <short title>
...

## 🔵 Traceability Findings

### [T-001] Critical — <short title>

**Entry point:** `path/to/handler.ts:line`
**Call chain:** handler → service → repository → DB
**Broken at:** <which boundary>
**Issue:** <what's wrong — e.g., handler passes `userId` but service expects `user_id`>

**Fix:** <concrete remediation step>

### [T-002] High — <short title>
...

## Remediation Task List

Convert findings into actionable tasks:

| ID | Priority | Finding | Estimated Effort |
|----|----------|---------|-----------------|
| S-001 | Critical | <one-liner> | <small/medium/large> |
| T-001 | Critical | <one-liner> | <small/medium/large> |
| O-001 | P0 | <one-liner> | <small/medium/large> |
| ...
```

## Principles

- **Be specific** — every finding must include a file path and line reference. "There might be security issues" is useless.
- **Be adversarial** — actively look for problems. If you don't find any, say so — but don't phone it in.
- **Be proportional** — a small config change doesn't need the same depth as a new API endpoint. Adjust your review depth to the scope of changes.
- **Don't fix anything** — this is read-only. Find and report. The user decides what to fix and when.
- **Focus on seams** — the traceability pass is where the most value lives. Code within a single file is usually coherent; the bugs hide between files.
