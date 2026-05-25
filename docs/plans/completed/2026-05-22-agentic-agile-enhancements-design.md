# Design: Agentic Agile & Architectural Rigor Enhancements

Enforcing rigorous Agile engineering discipline within `pi-workflow-kit` by introducing Behavioral Acceptance Criteria, Cognitive Persona Shifts, automated Lessons Curation, strict Multi-Pillar Architectural Reviews, and High-Risk Operation Safeguards.

## Context & Objectives
Based on industry standards and modern agentic development templates (such as Microsoft's Agentic Agile model), autonomous coding agents succeed most when operating under tight behavioral boundaries, specialized cognitive roles, and continuous retro/learning loops.

We are enhancing `pi-workflow-kit` by mapping out distinct engineering "Hats" and rigorous check-gates directly into our existing phase-based skills without adding repository clutter or introducing flaky external file lookups:
1. **The QA Engineer Hat** (in `writing-plans`): Defines rigid, testable `Given/When/Then` Acceptance Criteria for both happy and edge paths during planning.
2. **The Pragmatic Developer & Senior Refactorer Hats** (in `executing-tasks`): Guides the execution loop through clear cognitive phases (Green Light → Polish / Software Craftsmanship).
3. **The Agile Scrum Master Hat** (in `finalizing`): Cleans up, de-duplicates, and categorizes persistent lessons to prevent context-bloat and maximize the utility of future sprints.
4. **Architectural Review & Audit Gates**: Formally audits both the design (brainstorming) and the plan (writing-plans) against the 6 core pillars of production-grade software (Robustness, Atomicity, Security, Scalability, Compatibility, and Testability) before allowing the agent to move forward.
5. **High-Risk Operation Safeguards**: Auto-detects critical execution hazards (unbounded Redis scans, in-memory OOM loops, unthrottled concurrency, long-running transactions, etc.) and mandates strict mitigation steps and verification checkpoints.

---

## Architecture & Detailed Design

Because agent workspaces default tool execution and file-reading relative to the user's project directory, external files bundled in NPM global modules are not reliably reachable. Therefore, all guidelines are **inlined directly within the respective `SKILL.md` prompts**. This guarantees 100% reliability, zero repository pollution, and zero runtime performance overhead.

### Slice 1: Multi-Pillar Design Review & Risk Detection (`brainstorming`)
Before concluding a brainstorm and generating a design doc, the agent must put on its **Architect Hat** and evaluate the proposed system against the **6 Pillars of Production-Grade Design**:
1. **Robustness & Fault Tolerance**: How expected failures are handled, subsystem isolation, and graceful degradation.
2. **Atomicity & Consistency**: Database transactions, state rollback on error, and endpoint idempotency.
3. **Security & Access Control**: Input validation/sanitization and authorization checks at the boundary.
4. **Scalability & Performance**: Connection pooling, closing resource leaks, and preventing N+1 queries.
5. **Backwards Compatibility**: Schema migration safety, zero-downtime deployment, and API versioning.
6. **Testability**: Injection seams for external dependencies (APIs, system clocks, randomizers) to keep tests 100% deterministic.

#### ⚠️ High-Risk Hazard Auditing
The agent must proactively audit the design for the **8 High-Risk Production Hazards**:
1. **Unbounded Redis Deletions / Operations**: Multi-key deletion or scans (e.g. `KEYS` or raw `SCAN` loops) that block single-threaded performance.
2. **In-Memory OOM Loops**: Fetching complete database datasets into server memory (e.g., raw `select *`) to filter, sort, or map in runtime heap.
3. **Unbounded Concurrency Spikes**: Running concurrent network requests (e.g. unthrottled `Promise.all`) without strict batch limits (e.g., `p-limit`).
4. **Missing High-Frequency Indexes**: Running queries on unindexed columns, forcing expensive table-scans under load.
5. **Nested/Long-Running Transactions**: Holding database connections and locks open while awaiting slow external HTTP, disk, or cryptographic tasks.
6. **Unrestricted Uploads & Temp Flooding**: Writing uploaded data directly to local temporary paths without validation limits or explicit `finally` cleanup blocks.
7. **Raw Query String Interpolation**: Merging raw variables into SQL queries or shell command inputs (susceptible to injection).
8. **Silent Swallowing loops**: Background workers or cron tasks silently catching and suppressing exceptions without logging, back-offs, or alerts.

#### 🔍 Discovering Unknown & Contextual Risks (Socratic Heuristics)
To identify novel or domain-specific risks that fall outside the standard checklist, the agent must put on its **SRE Hat** and audit the proposed logic against the **3 Socratic Heuristics**:
* **The "Scale to 100x" Heuristic (Resource Exhaustion)**: If this operation is run 100x/sec or on 100k items, what breaks? (Memory, CPU, Disk I/O, sockets, database connection limits).
* **The "Hostile World" Heuristic (Security & Malice)**: If a malicious actor has complete control over these inputs (headers, payloads, IDs), how can they exploit, crash, or extract data?
* **The "Silent Error" Heuristic (Observability & Partitioning)**: If this downstream dependency or query hangs or fails silently, how does our server react? Is there a timeout, a back-off, or logging?

If any of the standard hazards or Socratic risks are identified, the design document **must** include a dedicated `⚠️ High-Risk Operations & Mitigations` section detailing the exact safety protocols applied.

### Slice 2: Behavioral Acceptance Criteria & Plan Audit (`writing-plans`)
The planning process is enhanced to mandate behavior-driven specifications and an automated plan verification step.

- **Role**: QA Engineer Hat.
- **Specification Format**: Mandatory `Given/When/Then` blocks covering the Happy Path and Edge/Error Paths.
- **Plan Acceptance Audit**: Before presenting the plan to the user, the agent must verify:
  - Every task is a complete vertical slice.
  - Sizing is correct (no monolithic tasks).
  - Checkpoint gates are placed on the most critical/risky tasks.
  - **Risk Enforcement**: Any task containing any of the **8 High-Risk Hazards** or **Socratic Heuristics risks** is strictly required to have a mandatory `checkpoint: done` gate and explicit verification guidelines.

### Slice 3: Cognitive Persona Shifts (`executing-tasks`)
The implementation execution loop is updated to divide the cognitive workload of a single task into three distinct phases.

- **Phase 1: QA Test Phase**: Translate the Given/When/Then specs into failing test cases.
- **Phase 2: Pragmatic Developer Phase**: Implement the simplest, raw code to green the tests.
- **Phase 3: Senior Refactoring Phase**: Refactor and polish using software craftsmanship principles (Shallow Modules, Deletion Test, Duplication, Seam Discipline).

### Slice 4: Lessons Curation & Caching (`finalizing`)
The finalizing phase is upgraded to run a structured retrospective on our persistent learning files.

- **Role**: Agile Scrum Master Hat.
- **Curating Rules**: De-duplicate, validate against the Generalization Test, and categorize rules under distinct headers (e.g., `# Tool Usage`, `# Testing Patterns`, `# Architecture Rules`).

---

## Verification & Testing Plan
- **Manual Verification**: Run a mock `/skill:writing-plans` and `/skill:executing-tasks` to verify the generated implementation plan matches our QA template and the task-running agent correctly segments its progress through the three cognitive hats.
- **Automated Tests**: Confirm existing Vitest suites run successfully without side-effects.
