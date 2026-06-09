# Verification Report: Incremental workflow and skill rename

**Date:** 2026-06-09
**Scope:** 10 commits on `incremental-workflow-and-rename` — pwk- prefix rename, feature-based planning, design-review repositioning, verify phase in workflow-guard
**Reviewer:** AI verify skill (security + optimization + traceability)

## Summary

| Pass | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| Security | 0 | 0 | 0 | 0 |
| Optimization | — | 0 | 0 | 3 |
| Traceability | 0 | 0 | 2 | 1 |
| **Total** | **0** | **0** | **2** | **4** |

## 🔴 Security Findings

No findings. This is a documentation/configuration-only change — no HTTP endpoints, no SQL queries, no user inputs, no secrets, no auth logic. No external attack surface.

## 🟡 Optimization Findings

### [O-001] P2 — Stale `shouldBlockFilePath` docstring

**Location:** `extensions/workflow-guard.ts:150`

**Issue:** JSDoc says "Only writes under docs/plans/ are allowed during brainstorm and plan phases" — missing the verify phase added in this change.

**Fix:** Change to "...during brainstorm, plan, and verify phases."

### [O-002] P2 — Stale `DESTRUCTIVE_PATTERNS` comment

**Location:** `extensions/workflow-guard.ts:15`

**Issue:** Comment says "Destructive commands blocked in brainstorm/plan phases" — missing verify.

**Fix:** Change to "...in brainstorm/plan/verify phases."

### [O-003] P2 — Inconsistent backtick formatting

**Location:** `skills/pwk-executing-tasks/SKILL.md:158`

**Issue:** `**Read \`docs/lessons.md\` if it exists**` is missing the closing backtick. All other skills use backtick-enclosed format: `**Read \`docs/lessons.md\`**`.

**Fix:** Add closing backtick: `**Read \`docs/lessons.md\` if it exists**`

## 🔵 Traceability Findings

### [T-001] Medium — `writing-plans` hazard check runs before feature identification

**Location:** `skills/pwk-writing-plans/SKILL.md:11-27`

**Issue:** Step 1 evaluates the hazard checklist (database, auth, etc.) *before* reading the Features table to identify the next `⬜ pending` feature. The hazard prompt says "This feature involves..." but the feature isn't known yet. Flow is: read design doc → evaluate hazards → *then* read Features table → mark `🔄 planned`.

**Fix:** Move the Features table reading before the hazard check. Flow should be: read design doc → find next `⬜ pending` feature → mark `🔄 planned` → *then* evaluate hazards for that specific feature.

### [T-002] Medium — `executing-tasks` step 2 re-reads full Features table every task

**Location:** `skills/pwk-executing-tasks/SKILL.md:158`

**Issue:** Per-task step 2 says "Read the design doc's Features table for context on the overall feature set." This re-reads the entire table on every task execution — redundant and imprecise.

**Fix:** Change to "skim the Features table for current feature status" to avoid re-processing the whole table.

### [T-003] Low — `design-review` trivial case may target nonexistent plan doc

**Location:** `skills/pwk-design-review/SKILL.md:12-22`

**Issue:** Step 1 allows proceeding if either doc exists. Step 2 says to append to the plan doc. If only the design doc exists (no plan doc yet), the agent would try to append to a nonexistent file. Edge case since design-review runs after writing-plans, but the instructions don't enforce this.

**Fix:** In step 2, add: "If no plan doc exists, skip and say: 'No plan doc found. Run `/skill:pwk-writing-plans` first.'"

## Remediation Task List

| ID | Priority | Finding | Estimated Effort |
|----|----------|---------|-----------------|
| O-001 | P2 | Stale `shouldBlockFilePath` docstring missing verify | small |
| O-002 | P2 | Stale `DESTRUCTIVE_PATTERNS` comment missing verify | small |
| O-003 | P2 | Missing closing backtick in executing-tasks lessons reference | small |
| T-001 | Medium | Hazard check ordering in writing-plans (should run after feature identification) | small |
| T-002 | Medium | executing-tasks re-reads full Features table every task | small |
| T-003 | Low | design-review trivial case may target nonexistent plan doc | small |
