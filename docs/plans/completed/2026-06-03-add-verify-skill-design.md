# Add Verify Skill — Design Doc

## Context

Based on [Chris LeMa's "The Last Prompt"](https://chrislema.com/the-last-prompt-you-need-when-building-software-with-ai), we need a post-implementation code verification phase in pi-workflow-kit. The existing `design-review` skill validates architecture *intentions* at the design-doc level, but there's no review of the *actual implemented code*. This is where the most dangerous bugs hide: signature mismatches between layers, dead code, duplicated logic, and security holes that pass tests but break in production.

## Decision

### Add a `verify` skill (new)

A single skill triggered by `/skill:verify` that runs three sequential expert review passes over implemented code:

1. **Security** 🔴 — adversarial review as if a junior wrote it and the best security expert is auditing
2. **Optimization** 🟡 — dead code, duplication, over/under-engineering, performance
3. **Traceability** 🔵 — end-to-end call chain verification across every layer boundary

Output: structured markdown report at `docs/plans/*-verification-report.md` with findings and actionable task list.

### Keep `design-review` unchanged

`design-review` stays between brainstorm and plan — it validates architecture before task breakdown. Moving it would lose the cheap "catch it before you build it" value.

### Update README

Add `verify` to the workflow diagram, skill table, and quick start. The pipeline becomes:

```
brainstorm → design-review → plan → execute → verify → finalize
```

## Workflow Integration

```
brainstorm → design-review (optional) → plan → execute → verify → finalize
                                                 ↑         ↑
                                           existing         new
```

- `verify` runs after `executing-tasks` and before `finalizing`
- It's optional — trivial changes can skip it
- The report's remediation task list feeds directly into a follow-up `/skill:writing-plans` if fixes are needed
- Read-only: can write to `docs/plans/` only, cannot modify source code

## Files to Change

1. **`skills/verify/SKILL.md`** — new skill (full content in `docs/plans/2026-06-03-verify-skill-design.md`)
2. **`README.md`** — update workflow diagram, skill table, quick start, and project structure

## Production Risks

Simple change — no design review needed. We're adding a new SKILL.md and updating documentation. No code execution, no external integrations, no security surface.
