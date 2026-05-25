# Implementation Plan: Split Design Review into a Separate Skill

Extracts the architectural/security review from `brainstorming` into a dedicated `design-review` skill. Updates the workflow chain to: brainstorm → design-review → writing-plans → executing-tasks → finalizing.

---

## Task 1: Update `skills/brainstorming/SKILL.md` — Remove Security Review, Add Trivial Gate

<!-- tdd: modifying-tested-code -->

Files:
- `skills/brainstorming/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path (non-trivial)**:
  - Given: A user runs `/skill:brainstorming` and a non-trivial design is proposed
  - When: The agent finishes writing the design doc
  - Then: The "After the design" section suggests running `/skill:design-review` before planning
- **Happy Path (trivial)**:
  - Given: A user runs `/skill:brainstorming` for a trivial change (e.g., renaming a column)
  - When: The agent finishes writing the design doc
  - Then: The "After the design" section says to skip design review and go straight to planning
- **Edge Path (security content removed)**:
  - Given: The current brainstorming SKILL.md contains inline 6 Pillars / 8 Hazards / 3 Socratic Heuristics
  - When: This task is complete
  - Then: None of that security content remains in brainstorming — it lives in the new design-review skill

Steps:
1. Read `skills/brainstorming/SKILL.md` in full
2. In step 4 ("Present the design"), add a brief trivial/non-trivial gate. Insert after the ADR guidance block (after the closing ` ``` ` of the ADR format) and before step 5:

```markdown
   For non-trivial designs, note any areas that may need production-risk review (database changes, external services, auth, concurrency, large data flows). You don't need to audit them here — just flag them for the design-review stage.

   For trivial changes (config, naming, simple field additions), note "Simple change — no design review needed" in the design doc.
```

3. Update the `## After the design` section. Replace:

```markdown
## After the design

Ask: "Ready to plan? Run `/skill:writing-plans`"
```

With:

```markdown
## After the design

- **Non-trivial design**: Ask: "Design looks good. Run `/skill:design-review` to check for production risks before planning."
- **Trivial change**: Ask: "Simple change — skip design review. Ready to plan? Run `/skill:writing-plans`"
```

4. Verify the file reads cleanly — no security/hazard/Socratic content remains in brainstorming.

---

## Task 2: Create `skills/design-review/SKILL.md` — New Skill

<!-- tdd: new-feature -->

Files:
- `skills/design-review/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path (hazards found)**:
  - Given: A non-trivial design doc at `docs/plans/*-design.md` involving Redis key deletion and concurrent API calls
  - When: `/skill:design-review` is run
  - Then: The agent audits against 6 pillars, 8 hazards, and 3 Socratic heuristics, flags hazards #1 and #3 as `[TRIGGERED]`, and appends a `## ⚠️ High-Risk Operations & Mitigations` section to the design doc
- **Happy Path (all clear)**:
  - Given: A non-trivial design doc with no high-risk patterns
  - When: `/skill:design-review` is run
  - Then: The agent appends a `## Architectural Review` section with `✅ No high-risk hazards detected` and brief pillar summaries
- **Edge Path (no design doc)**:
  - Given: No `docs/plans/*-design.md` exists
  - When: `/skill:design-review` is run
  - Then: The agent says "No design doc found. Run `/skill:brainstorming` first." and stops
- **Edge Path (trivial design)**:
  - Given: A design doc that already notes "Simple change — no design review needed"
  - When: `/skill:design-review` is run
  - Then: The agent confirms triviality and skips the full audit, appending a brief `## Architectural Review: Skipped (trivial change)` note

Steps:
1. Create the directory:
   ```
   mkdir -p skills/design-review
   ```

2. Create `skills/design-review/SKILL.md` with the following content:

```markdown
---
name: design-review
description: "Audit a design doc for production risks — security, scalability, fault tolerance, and operational hazards. Run after brainstorming, before writing-plans. Use when the brainstorm flags a non-trivial design, or when you want to stress-test a design for production readiness."
---

# Design Review

Read-only exploration of the design doc. You **may** edit the design doc to append review findings. You may **not** edit source code or configuration.

## Process

1. **Find the design doc** — look for `docs/plans/*-design.md`. If none exists, say "No design doc found. Run `/skill:brainstorming` first." and stop.

2. **Check triviality** — if the design doc notes "Simple change — no design review needed", confirm with the user: "This looks like a trivial change. Skip the full audit?" If yes, append a brief section:

   ```markdown
   ## Architectural Review

   **Status**: Skipped — trivial change. No high-risk operations detected.
   ```

   Then say: "Ready to plan? Run `/skill:writing-plans`" and stop.

3. **Read the design doc in full** — understand the architecture, data flow, components, and error handling proposed.

4. **🏛️ Architectural Pillars Review** — evaluate the design against the 6 Pillars of Production-Grade Design:

   1. **Robustness & Fault Tolerance**: How expected failures are handled, subsystem isolation, graceful degradation.
   2. **Atomicity & Consistency**: Database transactions, state rollback on error, endpoint idempotency.
   3. **Security & Access Control**: Input validation/sanitization, authorization checks at the boundary.
   4. **Scalability & Performance**: Connection pooling, closing resource leaks, preventing N+1 queries.
   5. **Backwards Compatibility**: Schema migration safety, zero-downtime deployment, API versioning.
   6. **Testability**: Injection seams for external dependencies (APIs, system clocks, randomizers) to keep tests 100% deterministic.

   For each pillar, write a 1-2 sentence assessment. Flag any concerns.

5. **⚠️ High-Risk Hazard Audit** — evaluate the design against the 8 High-Risk Production Hazards. For each hazard, write either `[SAFE]` (with a 1-sentence justification) or `[TRIGGERED]` (detailing the mitigation):

   1. **Unbounded Redis Deletions / Operations**: Multi-key deletion or scans (e.g. `KEYS` or raw `SCAN` loops) that block single-threaded performance.
   2. **In-Memory OOM Loops**: Fetching complete database datasets into server memory (e.g., raw `select *`) to filter, sort, or map in runtime heap.
   3. **Unbounded Concurrency Spikes**: Running concurrent network requests (e.g. unthrottled `Promise.all`) without strict batch limits.
   4. **Missing High-Frequency Indexes**: Running queries on unindexed columns, forcing expensive table-scans under load.
   5. **Nested/Long-Running Transactions**: Holding database connections and locks open while awaiting slow external HTTP, disk, or cryptographic tasks.
   6. **Unrestricted Uploads & Temp Flooding**: Writing uploaded data directly to local temporary paths without validation limits or explicit `finally` cleanup blocks.
   7. **Raw Query String Interpolation**: Merging raw variables into SQL queries or shell command inputs (susceptible to injection).
   8. **Silent Swallowing Loops**: Background workers or cron tasks silently catching and suppressing exceptions without logging, back-offs, or alerts.

6. **🔍 Socratic Risk Discovery** — put on your **SRE Hat** and audit the proposed logic against 3 heuristics to identify novel or domain-specific risks:

   - **The "Scale to 100x" Heuristic**: If this operation is run 100x/sec or on 100k items, what breaks? (Memory, CPU, Disk I/O, sockets, database connection limits).
   - **The "Hostile World" Heuristic**: If a malicious actor has complete control over these inputs (headers, payloads, IDs), how can they exploit, crash, or extract data?
   - **The "Silent Error" Heuristic**: If this downstream dependency or query hangs or fails silently, how does our server react? Is there a timeout, a back-off, or logging?

   For each heuristic, note any risks discovered. If a risk overlaps with a triggered hazard, cross-reference it.

7. **Present findings** — show the full review to the user. For each triggered hazard or Socratic risk, propose a concrete mitigation. Wait for user feedback and incorporate changes.

8. **Append to design doc** — add a `## Architectural Review` section to the design doc. Two cases:

   **All clear** (no hazards triggered, no Socratic risks):
   ```markdown
   ## Architectural Review

   **Status**: ✅ No high-risk hazards detected.

   **Pillars reviewed**: All 6 — no concerns.
   **Hazards audited**: All 8 [SAFE].
   **Socratic risks**: None identified.
   ```

   **Hazards or risks found**:
   ```markdown
   ## Architectural Review

   **Status**: ⚠️ High-risk operations detected — see mitigations below.

   ### Pillar Assessments
   - **Robustness**: [assessment]
   - **Atomicity**: [assessment]
   - **Security**: [assessment]
   - **Scalability**: [assessment]
   - **Backwards Compatibility**: [assessment]
   - **Testability**: [assessment]

   ### Hazard Audit
   - 1. Unbounded Redis: [SAFE / TRIGGERED — mitigation]
   - 2. In-Memory OOM: [SAFE / TRIGGERED — mitigation]
   - 3. Unbounded Concurrency: [SAFE / TRIGGERED — mitigation]
   - 4. Missing Indexes: [SAFE / TRIGGERED — mitigation]
   - 5. Long-Running Transactions: [SAFE / TRIGGERED — mitigation]
   - 6. Unrestricted Uploads: [SAFE / TRIGGERED — mitigation]
   - 7. Query Interpolation: [SAFE / TRIGGERED — mitigation]
   - 8. Silent Swallowing: [SAFE / TRIGGERED — mitigation]

   ### ⚠️ High-Risk Operations & Mitigations
   [Detailed mitigation for each TRIGGERED hazard and Socratic risk]

   ### Socratic Risks
   - **Scale to 100x**: [finding or "none identified"]
   - **Hostile World**: [finding or "none identified"]
   - **Silent Error**: [finding or "none identified"]
   ```

## Principles

- Be specific — every `[TRIGGERED]` hazard must include a concrete mitigation, not just "be careful"
- Be honest — if the design is risky and the risk can't be mitigated easily, say so
- Be proportional — a simple CRUD endpoint doesn't need the same depth as a batch processing pipeline
- Don't redesign — flag risks and propose mitigations, but the design owner decides

## After the review

Ask: "Ready to plan? Run `/skill:writing-plans`"
```

3. Verify the file reads cleanly — the skill should be self-contained with no references to brainstorming's internals.

---

## Task 3: Update `skills/writing-plans/SKILL.md` — QA Hat, Acceptance Criteria, Plan Audit with Design-Review Awareness

<!-- tdd: modifying-tested-code -->

Files:
- `skills/writing-plans/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A user runs `/skill:writing-plans` with a design doc that has an `## Architectural Review` section with triggered hazards
  - When: The implementation plan is generated
  - Then: Every task has a structured `Acceptance Criteria` block with `Given/When/Then`, and tasks corresponding to triggered hazards have `checkpoint: done` and a `Hazard Mitigation Verification` section
- **Edge Path (design doc has no review, non-trivial)**:
  - Given: A design doc with no `## Architectural Review` section but clearly non-trivial (database, auth, external services)
  - When: Writing-plans starts
  - Then: The agent prompts: "This design involves [database/auth/...] but hasn't been reviewed for production risks. Run `/skill:design-review` first, or confirm you want to proceed without."
- **Edge Path (design doc has no review, trivial)**:
  - Given: A trivial design doc with "Simple change — no design review needed"
  - When: Writing-plans starts
  - Then: The agent proceeds without prompting for design-review

Steps:
1. Read `skills/writing-plans/SKILL.md` in full

2. In step 1 ("Check for a design doc"), add the design-review safety net after reading the design doc. Insert after "Read `docs/lessons.md` if it exists":

```markdown
   Then check whether the design doc has an `## Architectural Review` section. If it doesn't, and the design involves any of the following, prompt the user: "This design involves [list what you found: database changes, authentication, external services, concurrency, large data flows] but hasn't been reviewed for production risks. Run `/skill:design-review` first, or type 'proceed' to skip."

   - Database schema changes or migrations
   - Authentication or authorization logic
   - External API or service integrations
   - Concurrency or batch processing
   - File uploads or large data flows
   - Redis, caching, or message queues

   If the design doc explicitly notes "Simple change — no design review needed", skip this check.
```

3. In the "Task format" section, add the QA Engineer Hat and Acceptance Criteria requirements. Replace:

```markdown
Each task must include:
- Exact file paths to create/modify
- **Concrete code** — include the actual implementation, not a summary. Write out SQL schemas, type definitions, function signatures with bodies, route handler code, and test assertions. A developer should be able to copy-paste from the plan and have working code. For tasks that depend on types or utilities from earlier tasks, reference them explicitly (e.g., `import { User } from Task 2`) and include only the new code
- Exact commands with expected output (e.g., `npx vitest run src/user/model.test.ts` → shows 1 test passing)
- Each task's tests should cover the happy path and at least one edge case or error path, with concrete assertions
```

With:

```markdown
Each task must include:
- Exact file paths to create/modify
- **Acceptance Criteria (QA Engineer Hat)** — Put on your **QA Engineer Hat** to design exhaustive test coverage. Explicitly define:
  - **Happy Path**: Expected behavior under normal operations.
  - **Edge Cases & Error Paths**: What happens with empty inputs, limits exceeded, authentication failures, or error states.
  Ensure every criteria block specifies the expected state and returned results using `Given/When/Then` behavioral blocks.
- **Concrete code** — include the actual implementation, not a summary. Write out SQL schemas, type definitions, function signatures with bodies, route handler code, and test assertions. A developer should be able to copy-paste from the plan and have working code. For tasks that depend on types or utilities from earlier tasks, reference them explicitly (e.g., `import { User } from Task 2`) and include only the new code
- Exact commands with expected output (e.g., `npx vitest run src/user/model.test.ts` → shows 1 test passing)
- Each task's tests should cover the happy path and at least one edge case or error path, with concrete assertions
```

4. In the "Task body structure" section, update each example task template to include an `Acceptance Criteria` block. Update the "No checkpoint" example to:

```markdown
## Task 1: Create User model

<!-- tdd: new-feature -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: Valid user data with name and email
  - When: The User model is created
  - Then: The model contains the correct fields and a generated ID
- **Edge Case (duplicate email)**:
  - Given: A user with email "test@example.com" already exists
  - When: Another user is created with the same email
  - Then: Creation fails with a unique constraint error

Files:
- `src/user/model.ts`
- `src/user/model.test.ts`

Steps:
1. Write failing test for User model creation
2. Run test — confirm it fails
3. Implement User model
4. Run test — confirm it passes
```

Update the `checkpoint: test` example to include acceptance criteria:

```markdown
## Task 2: Write auth tests

<!-- tdd: new-feature -->
<!-- checkpoint: test -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A user with valid credentials exists
  - When: Login is attempted
  - Then: A valid session token is returned
- **Edge Case (wrong password)**:
  - Given: A user exists but password is incorrect
  - When: Login is attempted
  - Then: An authentication error is returned

Files:
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement login handler
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.
```

Update the `checkpoint: done` example to include acceptance criteria:

```markdown
## Task 3: Add login endpoint

<!-- tdd: new-feature -->
<!-- checkpoint: done -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A user with email "user@example.com" and password "secure123" exists
  - When: A POST request with those credentials is sent to `/api/login`
  - Then: Response returns `200 OK` with a signed JWT token
- **Edge Case (invalid password)**:
  - Given: A user exists but the password sent is "wrong-pass"
  - When: A POST request is sent to `/api/login`
  - Then: Response returns `401 Unauthorized`
- **Edge Case (rate limiting)**:
  - Given: 5 failed login attempts from the same IP
  - When: A 6th attempt is sent
  - Then: Response returns `429 Too Many Requests`

Files:
- `src/auth/login.ts`
- `src/auth/login.test.ts`

Steps:
1. Write failing test for login with valid credentials
2. Run test — confirm it fails
3. Implement login handler
4. Run test — confirm it passes
5. Add edge case tests (invalid password, missing email)
6. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
7. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```

Update the "Both checkpoints" example to include acceptance criteria:

```markdown
## Task 4: Complex auth flow

<!-- tdd: new-feature -->
<!-- checkpoint: test -->
<!-- checkpoint: done -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A valid OAuth2 authorization code
  - When: The auth callback is invoked
  - Then: A user session is created and the user is redirected to the dashboard
- **Edge Case (expired code)**:
  - Given: An expired or invalid authorization code
  - When: The auth callback is invoked
  - Then: The user is redirected to login with an error message

Steps:
1. Write failing test for auth flow
2. Run test — confirm it fails

⏸ **CHECKPOINT: test** — present test review. Wait for human approval before implementing.

3. Implement auth flow
4. Run test — confirm it passes
5. Refactor — check for shallow modules, duplication, seam discipline. Run tests after changes.
6. Lessons — caught a mistake that applies to future tasks? Add rule to `docs/lessons.md`.

⏸ **CHECKPOINT: done** — present implementation review. Wait for human approval before committing.
```

5. In step 3 ("Present the plan"), add the **Plan Acceptance Audit** sub-step after "show the complete plan to the human":

```markdown
   Before presenting, run the **Plan Acceptance Audit**:
   - **Vertical Slices**: Is every task a complete vertical slice (not horizontal)?
   - **Task Sizing**: Is any single task too large or covering multiple complex behaviors? If so, split it.
   - **QA Coverage**: Does every task have both a Happy Path and at least one Edge Case in its Acceptance Criteria?
   - **Checkpoint Alignment**: Are `checkpoint: test` and `checkpoint: done` gates placed on the most critical or risky tasks?
   - **Risk Enforcement**: If the design doc's Architectural Review section flagged any hazards as `[TRIGGERED]`, verify the corresponding tasks have `checkpoint: done` and a `Hazard Mitigation Verification` section.

   If any check fails, fix the plan before presenting.
```

6. Verify the file reads cleanly.

---

## Task 4: Update `skills/executing-tasks/SKILL.md` — Cognitive Persona Shifts & Defensive Sandboxing

<!-- tdd: modifying-tested-code -->

Files:
- `skills/executing-tasks/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: An implementation plan with tasks containing Given/When/Then acceptance criteria and numbered steps
  - When: `/skill:executing-tasks` runs through a task
  - Then: The agent follows the plan's numbered steps while applying three cognitive frames:
    1. **QA Test frame** (when writing/running tests): Focus on translating Given/When/Then specs, verify sandboxed environment
    2. **Pragmatic Developer frame** (when implementing): Focus on simplest code to green tests
    3. **Senior Refactoring frame** (when refactoring): Evaluate craftsmanship (shallow modules, deletion test, duplication, seam discipline)
- **Edge Path (Sandbox Verification)**:
  - Given: A test file that would connect to a real database
  - When: The agent is in the QA Test frame
  - Then: The agent verifies the test uses mocks/stubs and no live connections before running

Steps:
1. Read `skills/executing-tasks/SKILL.md` in full

2. In the "Per-task execution" section, replace step 3 with meta-framed persona shifts that preserve the plan-step-following behavior. Replace:

```markdown
3. **Execute the plan steps** — follow each numbered step in the task body, in order. Stop at any `⏸ CHECKPOINT` gate (see [Checkpoint gates](#checkpoint-gates--when-the-plan-says-stop)).
4. **Verify against task description** — re-read the task from the plan. Does the implementation satisfy every requirement listed? If not, fix before proceeding.
5. **Refactor** — after all tests pass, look for:
   - **Shallow modules** — is the interface nearly as complex as the implementation? Can complexity be hidden behind a simpler interface?
   - **Deletion test** — if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
   - **Duplication** — extract repeated patterns
   - **Seam discipline** — don't introduce abstraction unless something actually varies across it. One adapter = hypothetical seam. Two adapters = real seam

   Run tests after each refactor step. Never refactor while tests are failing.
```

With:

```markdown
3. **Execute the plan steps** — follow each numbered step in the task body, in order. As you work, shift your cognitive focus through three frames:

   **QA Test frame** (when writing/running tests): Focus entirely on translating the task's `Given/When/Then` Acceptance Criteria into precise failing tests. Before running tests, verify the test environment is sandboxed — no real database connections, API calls, or live services. External dependencies must be mocked or stubbed. `NODE_ENV` must be `test` (or equivalent).

   **Pragmatic Developer frame** (when implementing): Focus on the simplest possible code to make the tests green. Do not over-engineer or add code for future requirements. Keep complexity to a bare minimum.

   **Senior Refactoring frame** (when refactoring): Evaluate the craftsmanship of the code. Check for:
   - **Shallow modules** — is the interface nearly as complex as the implementation? Can complexity be hidden behind a simpler interface?
   - **Deletion test** — if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
   - **Duplication** — extract repeated patterns
   - **Seam discipline** — don't introduce abstraction unless something actually varies across it. One adapter = hypothetical seam. Two adapters = real seam

   Run tests after each refactor step. Never refactor while tests are failing.

   Stop at any `⏸ CHECKPOINT` gate (see [Checkpoint gates](#checkpoint-gates--when-the-plan-says-stop)).
4. **Verify against task description** — re-read the task from the plan. Does the implementation satisfy every requirement listed? If not, fix before proceeding.
```

Note: The old step 5 (Refactor) is folded into step 3's "Senior Refactoring frame" so step 4 remains "Verify against task description". The remaining steps (old 6→5, old 7→6, old 8→7, old 9→8, old 10→9) need to be renumbered.

3. Renumber the remaining steps after the new step 4:
   - Old step 6 ("Learn from mistakes") → new step 5
   - Old step 7 ("Commit") → new step 6
   - Old step 8 ("Update progress") → new step 7
   - Old step 9 ("Suggest session break") → new step 8
   - Old step 10 ("Loop") → new step 9

4. Verify the file reads cleanly — the cognitive frames are meta-guidance applied while following the plan's numbered steps, not a replacement for them.

---

## Task 5: Update `skills/finalizing/SKILL.md` — Lessons Curation with Scrum Master Hat

<!-- tdd: modifying-tested-code -->

Files:
- `skills/finalizing/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A sprint is completed with some rules in `docs/lessons.md`
  - When: `/skill:finalizing` is executed
  - Then: The agent puts on the **Agile Scrum Master Hat** to de-duplicate, generalize, and categorize all rules under structured markdown headers
- **Edge Path (No lessons exist)**:
  - Given: No `docs/lessons.md` exists and no lessons were learned
  - When: `/skill:finalizing` is executed
  - Then: The step is skipped gracefully (existing behavior preserved)
- **Edge Path (Lessons format after categorization)**:
  - Given: `docs/lessons.md` was categorized into headers like `## Tool Usage` and `## Testing Patterns` by a previous finalizing run
  - When: A new execution phase appends a rule under `## Rules`
  - Then: The rule lands in the correct location (the `## Rules` section still exists for new entries, and finalizing re-categorizes later)

Steps:
1. Read `skills/finalizing/SKILL.md` in full

2. In step 2 ("Review lessons learned"), replace the existing instruction with the enhanced Scrum Master Hat curation. Replace:

```markdown
2. **Review lessons learned** — if `docs/lessons.md` exists, review it:
   - Add any lessons from this session that were missed during execution
   - **Generalize domain-specific rules** — if a rule names a specific service, entity, or feature, either rewrite it as a generic pattern or remove it if no generic form exists
   - Retire rules that no longer apply (remove the bullet)
   - If no changes are needed, leave it as-is
```

With:

```markdown
2. **Review & Polish Lessons (Agile Scrum Master Hat)** — if `docs/lessons.md` exists, put on your **Agile Scrum Master Hat** to curate and optimize it for future sprints:
   - **Add missed lessons** — capture any lessons from this session that weren't written during execution
   - **Generalize domain-specific rules** — if a rule names a specific service, entity, or feature, either rewrite it as a generic pattern or remove it if no generic form exists
   - **De-duplicate** — combine overlapping or redundant rules into single, sharper entries
   - **Categorize** — group the rules under clear, structured markdown headers (e.g., `## Tool Usage`, `## Testing Patterns`, `## Architecture Rules`) to make the document highly scannable for future sessions. Keep the `## Rules` section as the append target for new entries during execution — categorization moves rules out of `## Rules` into the appropriate category headers.
   - **Retire stale rules** — remove bullets that no longer apply
   - If no changes are needed, leave it as-is
```

3. Verify the file reads cleanly.

---

## Task 6: Update `docs/lessons.md` format template in `skills/executing-tasks/SKILL.md`

<!-- tdd: modifying-tested-code -->

Files:
- `skills/executing-tasks/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: The agent catches a repeat mistake during task execution
  - When: It appends a new rule to `docs/lessons.md`
  - Then: The rule is appended under `## Rules` (the standard append target), regardless of whether category headers exist from a previous finalizing run
- **Edge Path (After categorization)**:
  - Given: `docs/lessons.md` has been reorganized by finalizing with category headers like `## Tool Usage`
  - When: The agent needs to append a new rule during execution
  - Then: The agent appends to `## Rules` (which finalizing ensures always exists as the catch-all section)

Steps:
1. Read the `docs/lessons.md` format template section in `skills/executing-tasks/SKILL.md`

2. Update the format template comment to clarify the append convention. Replace:

```markdown
### `docs/lessons.md` format

```markdown
# Lessons Learned

<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->

## Rules

- <new rule here>
```
```

With:

```markdown
### `docs/lessons.md` format

```markdown
# Lessons Learned

<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->

## Rules

- <new rule here>
```

When adding a new rule during execution, always append it under `## Rules`. The categorization into specific headers (e.g., `## Tool Usage`, `## Testing Patterns`) is done during finalizing — never during execution.
```

3. Verify the file reads cleanly.

---

## Task 7: Run tests and verify existing suite passes

<!-- tdd: trivial -->

Files:
- None (verification only)

Steps:
1. Run `npm test` — confirm all existing tests pass without side-effects
2. Verify no `docs/lessons.md` was created or modified by the test run
