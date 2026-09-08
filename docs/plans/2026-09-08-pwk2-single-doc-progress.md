# Progress: pwk2-single-doc

Plan: docs/plans/2026-09-08-pwk2-single-doc-implementation.md
Branch: pwk2-single-doc
Started: 2026-09-08T11:19:03+08:00
Last updated: 2026-09-08T15:35:00+08:00
Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Merged design doc | 🔎 parallel | 474ac6c |
| 2 | ✅ | Decisions-first At a glance | — | c6430da |
| 3 | ✅ | Plan phase removed, execution rewired | ⏸ spec 🔎 parallel | 9a5c272 |
| 4 | ✅ | Finalize learning sweep | — | 1d6ba56 |
| 5 | ✅ | pwk-walkthrough skill | 🔎 parallel | 0ba0bf8 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Merged design doc | Brainstorming skill rewritten: `### R<n>: <name>` blocks carry one-liner + Given/When/Then criteria (incl. edges) + both tags; no test-name lists/mapping tables; auto-tag single-source moved in (writing-plans left a pointer); audit rule kept; hand-off re-pointed to executing. | |
| 2 | Decisions-first At a glance | At a glance now summary → Key decisions (honest-empty rejected clauses) → R#/risk table; mirrored in README + 3 user docs. | |
| 3 | Plan phase removed, execution rewired | pwk-writing-plans deleted (23 files, net −144 lines); guard Phase = brainstorm\|null; executing: pre-flight branch creation, ### R<n> parsing, stem-matched legacy routing, packet sed re-anchored on the design doc; status+finalize cover both suffixes; README/dev-guide/workflow-phases/oversight/AGENTS rethreaded; ADR 0004 written. | Kept the branch base with the unmerged setup fix (user decision, not a plan departure) — the commit rides in the PR diff. |
| 4 | Finalize learning sweep | New finalize step 2 runs before any disposal: reads At-a-glance decisions + Approaches considered + Deviated? entries + [ALERT]s → offers ADRs (3-gate, informed by execution outcome) + lessons rules; honest-empty; ask-don't-fabricate when material is thin. Executing gains deviation decision-records (what changed, why, what was rejected) written at deviation time. | |
| 5 | pwk-walkthrough skill | New standalone skill: on demand, exits the gate (UNLOCK_SKILLS +1), derives from branch diff + code, writes docs/walkthroughs/<topic>.md stamped with the commit range; five sections, every claim anchored to file:line; regenerated wholesale, never disposed; refuses when no diff. Docs rows added (README/dev-guide/workflow-phases). | |

## Code digest

### Summary — The kit collapsed from four phases to three: `pwk-writing-plans` and its `-implementation.md` are gone; `pwk-brainstorming` now ends with one buildable design doc (`### R<n>` blocks carrying criteria + review tags), executing parses it and creates the branch itself, and finalize harvests durable knowledge (decisions, deviations, alerts) into ADRs/lessons before disposing the planning docs. A new on-demand `pwk-walkthrough` skill generates file-anchored implementation explainers into `docs/walkthroughs/`.

### Flow — /skill:pwk-brainstorming -> design doc (At a glance: summary -> Key decisions -> R#/risk table; ### R<n> blocks with criteria + tags; Feature acceptance + review tag) -> /skill:pwk-executing-tasks (pre-flight branch -> E2E red -> blocks back-to-back -> feature review over a packet sed-extracted from the design doc -> ship checkpoint) -> /skill:pwk-finalizing (learning sweep -> ADR offers + lessons -> disposal -> merge). Guard: skill invocation sets/clears the single brainstorm phase; UNLOCK_SKILLS (execute/finalize/code-review/diagnose/walkthrough) exits it.

### Gotchas — Reviewers assessed a packet snapshot; the tracing and spec findings landed as post-packet fix commits, verified by the gates plus targeted assertions rather than a re-review. The branch base carries the unrelated setup-fix commit (user decision) — it rides in the PR diff. In-flight 1.x features route via stem-matched `-implementation.md` (old flow) — the only legacy path, covered by both-suffixes discovery. [ALERT] none beyond review findings — no open reviewer-confirmed risks.

### Key files — skills/pwk-brainstorming/SKILL.md: single buildable doc (blocks, tags, decisions-first At a glance); skills/pwk-executing-tasks/SKILL.md: branch pre-flight, ### R<n> parsing, design-doc packet; skills/pwk-finalizing/SKILL.md: learning sweep before disposal; skills/pwk-walkthrough/SKILL.md: new on-demand explainer; extensions/workflow-guard.ts: Phase = brainstorm|null, UNLOCK_SKILLS gains walkthrough.
