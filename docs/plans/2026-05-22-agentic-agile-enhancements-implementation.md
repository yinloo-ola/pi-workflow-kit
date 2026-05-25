# Implementation Plan: Agentic Agile & Architectural Rigor

Updates 4 skill files to introduce behavioral acceptance criteria, SRE hazard checks, cognitive persona shifts, architectural design reviews, and automated lessons curation.

---

## Task 1: Update `skills/brainstorming/SKILL.md` — 6 Pillars, 8 Hazards, 3 Socratic Heuristics

<!-- tdd: modifying-tested-code -->

Files:
- `skills/brainstorming/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A user runs `/skill:brainstorming` and a non-trivial design is proposed
  - When: The agent presents the design for approval
  - Then: The design includes a dedicated `🏛️ Architectural Pillars Review` section covering all 6 pillars (Robustness, Atomicity, Security, Scalability, Compatibility, Testability)
- **Edge Path (Trivial Feature)**:
  - Given: A user runs `/skill:brainstorming` for a trivial change (e.g., renaming a column)
  - When: The agent reaches the architectural review step
  - Then: The agent writes a brief statement like "Simple change — no architectural review needed" and skips the full audit
- **Edge Path (Hazard Detection)**:
  - Given: The proposed design involves Redis key deletion
  - When: The agent audits against the 8 High-Risk Hazards
  - Then: The design flags it as `[TRIGGERED]` under hazard #1 and includes a mitigation in a `⚠️ High-Risk Operations & Mitigations` section
- **Edge Path (Socratic Discovery)**:
  - Given: The proposed design has a novel batch-processing loop not covered by the 8 hazards
  - When: The agent applies the 3 Socratic Heuristics
  - Then: The design flags the discovered risk and proposes mitigation

Steps:
1. Read `skills/brainstorming/SKILL.md` in full
2. In step 4 ("Present the design"), add a new mandatory sub-step before writing the design doc: **Architectural Review & Risk Detection**. Insert the following inline guidelines:

```markdown
   #### 🏛️ Architectural Pillars Review

   For non-trivial designs, evaluate the proposed design against the **6 Pillars of Production-Grade Design**. Include a dedicated section in the design doc addressing each:

   1. **Robustness & Fault Tolerance**: How expected failures are handled, subsystem isolation, graceful degradation.
   2. **Atomicity & Consistency**: Database transactions, state rollback on error, endpoint idempotency.
   3. **Security & Access Control**: Input validation/sanitization, authorization checks at the boundary.
   4. **Scalability & Performance**: Connection pooling, closing resource leaks, preventing N+1 queries.
   5. **Backwards Compatibility**: Schema migration safety, zero-downtime deployment, API versioning.
   6. **Testability**: Injection seams for external dependencies (APIs, system clocks, randomizers) to keep tests 100% deterministic.

   For trivial changes (config, naming, simple field additions), a brief statement like "Simple change — no architectural review needed" suffices.

   #### ⚠️ High-Risk Hazard Audit

   For non-trivial designs, you MUST evaluate the design against the **8 High-Risk Production Hazards**. For each hazard, write either `[SAFE]` (with a 1-sentence justification of why it doesn't apply) or `[TRIGGERED]` (detailing the mitigation):

   - **1. Unbounded Redis Deletions / Operations**: Multi-key deletion or scans (e.g. `KEYS` or raw `SCAN` loops) that block single-threaded performance.
   - **2. In-Memory OOM Loops**: Fetching complete database datasets into server memory (e.g., raw `select *`) to filter, sort, or map in runtime heap.
   - **3. Unbounded Concurrency Spikes**: Running concurrent network requests (e.g. unthrottled `Promise.all`) without strict batch limits.
   - **4. Missing High-Frequency Indexes**: Running queries on unindexed columns, forcing expensive table-scans under load.
   - **5. Nested/Long-Running Transactions**: Holding database connections and locks open while awaiting slow external HTTP, disk, or cryptographic tasks.
   - **6. Unrestricted Uploads & Temp Flooding**: Writing uploaded data directly to local temporary paths without validation limits or explicit `finally` cleanup blocks.
   - **7. Raw Query String Interpolation**: Merging raw variables into SQL queries or shell command inputs (susceptible to injection).
   - **8. Silent Swallowing Loops**: Background workers or cron tasks silently catching and suppressing exceptions without logging, back-offs, or alerts.

   For trivial changes, skip this audit.

   #### 🔍 Socratic Risk Discovery

   For non-trivial designs, put on your **SRE Hat** and audit the proposed logic against the **3 Socratic Heuristics** to identify novel or domain-specific risks:

   - **The "Scale to 100x" Heuristic**: If this operation is run 100x/sec or on 100k items, what breaks? (Memory, CPU, Disk I/O, sockets, database connection limits).
   - **The "Hostile World" Heuristic**: If a malicious actor has complete control over these inputs (headers, payloads, IDs), how can they exploit, crash, or extract data?
   - **The "Silent Error" Heuristic**: If this downstream dependency or query hangs or fails silently, how does our server react? Is there a timeout, a back-off, or logging?

   For trivial changes, skip this audit.

   If any hazard is `[TRIGGERED]` or any Socratic risk is identified, the design document **must** include a dedicated `⚠️ High-Risk Operations & Mitigations` section detailing the exact safety protocols applied.
```

3. Verify the file reads cleanly — the new sections should slot naturally between the existing ADR guidance and step 5 ("Write the design doc").

---

## Task 2: Update `skills/writing-plans/SKILL.md` — QA Hat, Given/When/Then, Plan Acceptance Audit

<!-- tdd: modifying-tested-code -->

Files:
- `skills/writing-plans/SKILL.md`

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: A user runs `/skill:writing-plans`
  - When: The implementation plan is generated
  - Then: Every task has a structured `Acceptance Criteria` block with `Given/When/Then` happy-path and edge-case behaviors
- **Edge Path (Risk Enforcement)**:
  - Given: A task involves any of the 8 production hazards or Socratic risks flagged in the design
  - When: The plan audit runs
  - Then: That task is automatically gated with `checkpoint: done` and includes a `Hazard Mitigation Verification` section

Steps:
1. Read `skills/writing-plans/SKILL.md` in full
2. In the "Task format" section, add the QA Engineer Hat and Acceptance Criteria requirements. Replace:

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

3. In the "Task body structure" section, update each example task template to include an `Acceptance Criteria` block. Update the "No checkpoint" example to:

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

4. In step 3 ("Present the plan"), add the **Plan Acceptance Audit** sub-step after "show the complete plan to the human":

```markdown
   Before presenting, run the **Plan Acceptance Audit**:
   - **Vertical Slices**: Is every task a complete vertical slice (not horizontal)?
   - **Task Sizing**: Is any single task too large or covering multiple complex behaviors? If so, split it.
   - **QA Coverage**: Does every task have both a Happy Path and at least one Edge Case in its Acceptance Criteria?
   - **Checkpoint Alignment**: Are `checkpoint: test` and `checkpoint: done` gates placed on the most critical or risky tasks?
   - **Risk Enforcement**: If the design doc flagged any hazards as `[TRIGGERED]`, verify the corresponding tasks have `checkpoint: done` and a `Hazard Mitigation Verification` section.

   If any check fails, fix the plan before presenting.
```

5. Verify the file reads cleanly.

---

## Task 3: Update `skills/executing-tasks/SKILL.md` — Cognitive Persona Shifts & Defensive Sandboxing

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

## Task 4: Update `skills/finalizing/SKILL.md` — Lessons Curation with Scrum Master Hat

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
2. In step 2 ("Review lessons learned"), replace the existing instruction with the enhanced Scrum Master Hat curation:

Replace:

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

## Task 5: Update `docs/lessons.md` format template in `skills/executing-tasks/SKILL.md`

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
2. Update the format template comment to clarify the append convention:

Replace:

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

## Task 6: Run tests and verify existing suite passes

<!-- tdd: trivial -->

Files:
- None (verification only)

Steps:
1. Run `npm test` — confirm all existing tests pass without side-effects
2. Verify no `docs/lessons.md` was created or modified by the test run
