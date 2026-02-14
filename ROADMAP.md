# Roadmap

This roadmap is **directional** (not a promise). Priorities may shift based on real-world usage and feedback.

- Shipped changes: see [CHANGELOG.md](./CHANGELOG.md)
- Detailed plans/notes: see [docs/plans/](./docs/plans/)
- **Questions/support:** [GitHub Discussions](https://github.com/coctostan/pi-superpowers-plus/discussions)
- **Bugs & feature requests:** [GitHub Issues](https://github.com/coctostan/pi-superpowers-plus/issues/new/choose)

## Tracking links

- [Discussions (questions/support)](https://github.com/coctostan/pi-superpowers-plus/discussions)
- [New issue (bug/feature)](https://github.com/coctostan/pi-superpowers-plus/issues/new/choose)
- [Open bugs](https://github.com/coctostan/pi-superpowers-plus/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- [Confirmed bugs](https://github.com/coctostan/pi-superpowers-plus/issues?q=is%3Aissue+is%3Aopen+label%3Abug+label%3Aconfirmed)
- [Enhancements](https://github.com/coctostan/pi-superpowers-plus/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)

## Tags

- **[user]** user-visible behavior / UX
- **[maintainer]** refactors, internals, tests, CI
- **[docs]** documentation
- **[infra]** packaging / release / build plumbing

---

## v0.2.0 — Reliability & Diagnostics

The "stop losing users silently" release. Add observability so issues can be diagnosed after the fact, and a CI pipeline so regressions don't ship.

### Logging & Error Handling

**[maintainer]** Build a logger module (`extensions/logging.ts`) writing to `~/.pi/logs/superpowers-plus.log`. Always-on at info level — phase transitions, tool call decisions (allow/block/warn), state changes. Verbose behind `PI_SUPERPOWERS_DEBUG=1` — full event payloads, heuristic scoring, timing. Simple size cap to prevent unbounded growth.

Then sweep every `catch` block in the codebase. Classify each as ignore / log-and-continue / surface-to-user, fix the handling, and add the appropriate log call. Currently 12+ bare `catch {}` blocks silently swallow errors — some hide real failures like git status checks falling through to permissive defaults.

Single task: build the logger, then fix error handling in one pass through the code.

### CI Pipeline

**[infra]** GitHub Actions with three concerns:

- **Tests:** `vitest run` on push and PR
- **Lint & types:** `biome check` + `tsc --noEmit` on push and PR
- **Publish:** `npm publish` triggered by git tags, using personal npm account

Prerequisite: add Biome as a dev dependency with a minimal `biome.json` config. Do an initial formatting/lint pass to clean up the codebase before CI enforces it.

---

## v0.3.0 — Hardening

The "safe for strangers to rely on" release. Security fixes, resilient subagent lifecycle, and state that survives across sessions.

### Security Audit

**[maintainer]** Three targeted fixes:

1. **Subagent spawn sanitization** — validate and constrain args passed to `spawn("pi", ...)`. LLM-crafted task strings should not be able to inject flags or shell metacharacters.
2. **Environment filtering** — replace `{ ...process.env }` spread in subagent spawns with an explicit allowlist of env vars that subagents actually need. Currently leaks every env var the parent process has.
3. **Path check tightening** — the `docs/plans/` allowlist uses loose `indexOf` matching. Tighten to prevent path traversal if reachable from user input.

### Subagent Hardening

**[maintainer]** Lifecycle and resource management for spawned subagents:

- Configurable timeout per invocation (default ~10 minutes)
- Kill mechanism for stuck subagents
- Cancellation propagation — if the parent session is interrupted, child subagents get cleaned up
- Cap on concurrent subagents to prevent runaway parallelism

### Session Persistence

**[user]** File-based state keyed by git branch, stored at `~/.pi/superpowers-plus/<branch>.json`. Persisted state includes: workflow phase, TDD monitor state, debug cycle counts, warning strikes. Rehydrated on `session_start` by reading the current branch's state file.

State file is cleared when the workflow completes (finish phase) or on explicit reset. This enables cross-session continuity — close your laptop, come back the next day, and the workflow monitor knows where you left off on that branch. Also handles mid-session restarts for free.

### Error Surfacing Review

**[user]** Second pass (building on v0.2.0 logging) focused specifically on failures that silently change behavior. The key pattern: an operation fails, the `catch` falls through to a permissive default, and the user gets no warning that a safety check was skipped. Identify every such case and surface via `ctx.ui.notify()`.

---

## v0.4.0 — Quality & Completeness

The "mature package" release. Fill testing gaps, address known skill blindspots, and pay down structural debt.

### Integration / E2E Tests

**[maintainer]** Write tests that load extensions into a real (or near-real) pi instance. The 253 unit tests against FakePi are solid for logic but can't catch registration issues, event wiring bugs, or lifecycle problems. Start with smoke tests: extension loads, workflow monitor widget appears, subagent spawns and returns. Not aiming for full E2E coverage — just the critical paths that unit tests structurally can't reach.

### Documentation Workflow Skill

**[docs]** Address the blindspot analysis finding: no skill prompts "update the docs" after implementation. Add a skill or verification-monitor check that reminds the agent to update documentation when commits touch public-facing code. Could be a dedicated skill or a lightweight check in the existing verification phase.

### Workflow Monitor Refactor

**[maintainer]** The main `workflow-monitor.ts` (782 lines) handles event routing, widget rendering, workflow commands, escalation, git checks, and state management in one closure. Continue extracting into the `workflow-monitor/` subdirectory — the pattern already exists with 13 extracted modules. Not changing behavior, just improving maintainability. The logging from v0.2.0 makes this safer since refactored code can be verified against the same decision trail.

### Skill Blindspot Sweep

**[maintainer]** Work through the Tier 1 and Tier 2 items from `docs/plans/2026-02-10-skill-blindspot-analysis.md`. Gaps in skill coverage and enforcement — missing edge cases in phase transitions, incomplete heuristics in the TDD monitor, etc. Batch as a sweep after the refactor makes the code easier to change.

---

## Future

Ideas with no timeline. May become milestones, may not.

- **[user]** Decision log / session recap — human-readable summary of workflow decisions, usable as a "here's where you left off" on session rejoin
- **[user]** Higher-level activity audit trail — record of what the workflow monitor decided and why, reviewable as an end-of-process recap
- **[maintainer]** Skill consistency pass — normalize wording, boundaries, and stop conditions across all 12 skills

---

## Maintenance rules

- If a roadmap item becomes real work, link it to a GitHub Issue or a plan doc under `docs/plans/`
- When an item ships, move it to [CHANGELOG.md](./CHANGELOG.md) with the release version
