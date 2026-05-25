# Implementation Plan: PR #5 Improvements

Fixes CI failures, tightens consistency across the workflow chain, and improves the design-review integration so every skill speaks with one voice.

---

## Task 1: Fix biome lint and format errors in workflow-guard

<!-- tdd: modifying-tested-code -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The biome linter runs on `extensions/workflow-guard.ts` and `tests/workflow-guard.test.ts`
  - When: `npx biome check` is executed
  - Then: Zero errors and zero warnings are emitted
- **Edge Case (no functional regression)**:
  - Given: The existing test suite for workflow-guard
  - When: `npx vitest run` is executed
  - Then: All 27 existing tests still pass

Files:
- `extensions/workflow-guard.ts`
- `tests/workflow-guard.test.ts`

Steps:
1. Fix `extensions/workflow-guard.ts` line 163 — replace string concatenation with template literal:
   ```ts
   // Before:
   return !absolute.startsWith(plansDir + "/");
   // After:
   return !absolute.startsWith(`${plansDir}/`);
   ```
2. Fix `tests/workflow-guard.test.ts` line 1 — remove unused `beforeEach` import:
   ```ts
   // Before:
   import { describe, it, expect, beforeEach } from "vitest";
   // After:
   import { describe, it, expect } from "vitest";
   ```
3. Fix `tests/workflow-guard.test.ts` line 19 — remove unused `getCurrentPhase` import:
   ```ts
   // Before:
   import { getCurrentPhase, isSafeCommand, shouldBlockFilePath } from "../extensions/workflow-guard";
   // After:
   import { isSafeCommand, shouldBlockFilePath } from "../extensions/workflow-guard";
   ```
4. Run `npx biome check extensions/ tests/` — confirm zero errors.
5. Run `npx vitest run` — confirm all tests pass.

---

## Task 2: Fix CHANGELOG `[Unreleased]` link

<!-- tdd: trivial -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The CHANGELOG.md file with version link references
  - When: A reader clicks the `[Unreleased]` link
  - Then: It shows changes between v0.16.0 and HEAD (not v0.14.0)

Files:
- `CHANGELOG.md`

Steps:
1. Update the `[Unreleased]` link at the bottom of CHANGELOG.md:
   ```markdown
   // Before:
   [Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.14.0...HEAD
   // After:
   [Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.16.0...HEAD
   ```

---

## Task 3: Align skill descriptions — trim design-review, match tone

<!-- tdd: trivial -->

All six skills should follow the same description pattern: a one-sentence summary of what the skill does, followed by trigger guidance. The `design-review` description currently front-loads usage instructions that belong in the skill body.

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The `description` frontmatter of `skills/design-review/SKILL.md`
  - When: Compared to the other five skill descriptions
  - Then: It follows the same pattern — concise purpose first, trigger guidance second
- **Edge Case (no information loss)**:
  - Given: The trimmed description
  - When: An agent reads it for skill matching
  - Then: It still contains enough signal to trigger correctly (keywords: audit, design, production risks, security, scalability)

Files:
- `skills/design-review/SKILL.md`

Steps:
1. Replace the description in `skills/design-review/SKILL.md` frontmatter:
   ```yaml
   // Before:
   description: "Audit a design doc for production risks — security, scalability, fault tolerance, and operational hazards. Run after brainstorming, before writing-plans. Use when the brainstorm flags a non-trivial design, or when you want to stress-test a design for production readiness."
   // After:
   description: "Audit a design doc for production risks — security, scalability, fault tolerance, and operational hazards. Use after brainstorming for non-trivial designs, or when you want to stress-test a design for production readiness."
   ```
   This trims the redundant "Run after brainstorming, before writing-plans" (the workflow order is documented in README) while keeping the trigger guidance.

---

## Task 4: Remove redundant user confirmation for trivial design-review

<!-- tdd: modifying-tested-code -->

The brainstorming skill already asked the user to classify trivial vs non-trivial. When the design doc says "Simple change — no design review needed", the user already made that decision. Asking again in design-review step 2 adds friction without value.

Acceptance Criteria (QA Engineer Hat):
- **Happy Path (trivial skip)**:
  - Given: A design doc with "Simple change — no design review needed"
  - When: `/skill:design-review` is run
  - Then: The agent automatically appends the "Skipped — trivial change" section and moves on, without asking the user to confirm
- **Edge Case (non-trivial proceeds normally)**:
  - Given: A design doc without the trivial marker
  - When: `/skill:design-review` is run
  - Then: The full audit proceeds as before (no behavior change)

Files:
- `skills/design-review/SKILL.md`

Steps:
1. In step 2 ("Check triviality"), replace the interactive confirmation with an automatic skip:
   ```markdown
   // Before:
   2. **Check triviality** — if the design doc notes "Simple change — no design review needed", confirm with the user: "This looks like a trivial change. Skip the full audit?" If yes, append a brief section:

   // After:
   2. **Check triviality** — if the design doc notes "Simple change — no design review needed", append a brief section:
   ```
2. Remove the "If yes," conditional — the append and stop is now unconditional for trivial docs.
3. Verify the file reads cleanly — the flow is now: find doc → check trivial → (if trivial: append + stop, else: continue to step 3).

---

## Task 5: Evaluate design for review need regardless of design doc presence

<!-- tdd: trivial -->

The brainstorming skill flags "database changes, external services, auth, concurrency, large data flows" for design-review. The writing-plans safety net checks for a slightly different list and only when a design doc exists. When writing-plans is used standalone (no design doc), the safety net never fires — so a non-trivial standalone design skips design-review entirely.

The fix: always evaluate whether the design involves high-risk patterns, regardless of source. A design doc with no `## Architectural Review` section and a standalone user description both deserve the same scrutiny.


Acceptance Criteria (QA Engineer Hat):
- **Happy Path (design doc, no review section)**:
  - Given: A design doc exists without an `## Architectural Review` section, and the design involves database schema changes
  - When: Writing-plans step 1 runs
  - Then: The agent prompts the user to run `/skill:design-review` or type 'proceed'
- **Happy Path (standalone, non-trivial)**:
  - Given: No design doc exists, and the user describes a feature involving authentication and external API integrations
  - When: Writing-plans gathers context
  - Then: The agent prompts: "This design involves [auth, external APIs] but hasn't been reviewed for production risks. Run `/skill:design-review` first, or type 'proceed' to skip."
- **Edge Case (design doc already reviewed)**:
  - Given: A design doc with an `## Architectural Review` section
  - When: Writing-plans step 1 runs
  - Then: No prompt — the review already happened
- **Edge Case (trivial)**:
  - Given: A trivial design (config rename, simple field addition) with or without a design doc
  - When: Writing-plans evaluates the design
  - Then: No prompt — no trigger categories matched

Files:
- `skills/brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md`

Steps:
1. Update `skills/brainstorming/SKILL.md` step 4 to match writing-plans' more specific list:
   ```markdown
   // Before:
   For non-trivial designs, note any areas that may need production-risk review (database changes, external services, auth, concurrency, large data flows). You don't need to audit them here — just flag them for the design-review stage.

   // After:
   For non-trivial designs, note any areas that may need production-risk review (database schema changes, authentication or authorization, external API integrations, concurrency or batch processing, file uploads or large data flows, Redis/caching/message queues). You don't need to audit them here — just flag them for the design-review stage.
   ```
2. Update `skills/writing-plans/SKILL.md` step 1 — consolidate the safety net into one check that applies regardless of whether a design doc exists. Replace the current conditional with:
   ```markdown
   // Before (current text — only checks design docs):
   Then check whether the design doc has an `## Architectural Review` section. If it doesn't, and the design involves any of the following, prompt the user...

   // After (unified check):
   Then evaluate whether the design — whether from the design doc or from the user's description and codebase exploration — involves any of the following:

   - Database schema changes or migrations
   - Authentication or authorization logic
   - External API or service integrations
   - Concurrency or batch processing
   - File uploads or large data flows
   - Redis, caching, or message queues

   If any apply AND the design doc does not already have an `## Architectural Review` section, prompt the user: "This design involves [list what you found] but hasn't been reviewed for production risks. Run `/skill:design-review` first, or type 'proceed' to skip."

   If the design doc explicitly notes "Simple change — no design review needed", skip this check.
   ```
3. Verify the safety net fires for both design-doc and standalone paths, and skips when the review already exists.

---

## Task 6: Generalize `NODE_ENV` reference in executing-tasks

<!-- tdd: trivial -->

The QA Test frame references `NODE_ENV` which is Node.js-specific. Since the workflow kit is used across languages (the examples reference SQL, Go, etc.), this should be generalized.

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The QA Test frame in `skills/executing-tasks/SKILL.md`
  - When: A developer working in Python or Go reads it
  - Then: The guidance makes sense without Node.js context
- **Edge Case (Node.js users still understand)**:
  - Given: A Node.js developer reading the same text
  - When: They see the generalized phrasing
  - Then: They understand it means `NODE_ENV=test` or equivalent

Files:
- `skills/executing-tasks/SKILL.md`

Steps:
1. In the QA Test frame, replace the `NODE_ENV` reference:
   ```markdown
   // Before:
   External dependencies must be mocked or stubbed. `NODE_ENV` must be `test` (or equivalent).

   // After:
   External dependencies must be mocked or stubbed. Ensure the test environment is isolated (e.g., `NODE_ENV=test`, `GO_ENV=test`, or equivalent for your stack).
   ```

---

## Task 7: Deduplicate test coverage requirement in writing-plans task format

<!-- tdd: trivial -->

The "Each task must include" section has two overlapping bullets about test coverage:
1. The new Acceptance Criteria block (Happy Path + Edge Cases)
2. The old "Each task's tests should cover the happy path and at least one edge case" bullet

The Acceptance Criteria block supersedes the old bullet. Keeping both is redundant and confusing.

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The task format section in `skills/writing-plans/SKILL.md`
  - When: Reading the "Each task must include" bullets
  - Then: Test coverage is specified exactly once (in the Acceptance Criteria block), not duplicated

Files:
- `skills/writing-plans/SKILL.md`

Steps:
1. Remove the redundant bullet from "Each task must include":
   ```markdown
   // Remove this line (now covered by Acceptance Criteria):
   - Each task's tests should cover the happy path and at least one edge case or error path, with concrete assertions
   ```
2. Verify the Acceptance Criteria bullet already covers this requirement with its "Happy Path" and "Edge Cases & Error Paths" sub-bullets.

---

## Task 8: Run tests and verify CI passes

<!-- tdd: trivial -->

Files:
- None (verification only)

Steps:
1. Run `npx biome check extensions/ tests/` — confirm zero errors.
2. Run `npx vitest run` — confirm all existing tests pass.
3. Verify the CHANGELOG link renders correctly.
