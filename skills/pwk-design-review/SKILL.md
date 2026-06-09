---
name: pwk-design-review
description: "Audit a plan and design doc for production risks — security, scalability, fault tolerance, and operational hazards. Use after writing-plans for non-trivial features, when the plan has concrete code that makes hazard checks meaningful."
---

# Design Review

Read-only exploration of the design and plan docs. You **may** edit the plan doc to append review findings. You may **not** edit source code or configuration.

## Process

1. **Find the design and plan docs** — look for `docs/plans/*-design.md` and `docs/plans/*-implementation.md`. If neither exists, say "No design or plan doc found. Run `/skill:pwk-brainstorming` first." and stop. Read the plan doc for concrete code context alongside the design doc for architectural context.

2. **Check triviality** — if a plan doc was found in step 1 and the design doc notes "Simple change — no design review needed", append a brief section to the plan doc:

   ```markdown
   ## Architectural Review

   **Status**: Skipped — trivial change. No high-risk operations detected.
   ```

   Then say: "Review complete — no action needed. Ready to execute? Run `/skill:pwk-executing-tasks`" and stop.

   If no plan doc was found, skip this check and say: "No plan doc found to append to. Run `/skill:pwk-writing-plans` first." and stop.

3. **Read the design and plan docs in full** — understand the architecture from the design doc, and concrete code from the plan doc. The plan doc's implementation details (SQL queries, type definitions, function bodies) are what the hazard checks audit.

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

8. **Append to plan doc** — add a `## Architectural Review` section to the plan doc (not the design doc — review is per-feature, and the plan doc is the per-feature artifact). Two cases:

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

Ask: "Review complete. Ready to execute? Run `/skill:pwk-executing-tasks`"
