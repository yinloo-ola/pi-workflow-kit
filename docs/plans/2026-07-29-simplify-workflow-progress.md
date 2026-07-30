# Progress: simplify-workflow

Plan: docs/plans/2026-07-29-simplify-workflow-implementation.md
Branch: simplify-workflow
Started: 2026-07-29T01:20:00Z
Last updated: 2026-07-30T01:31:44Z

| # | Status | Task | Commit |
|---|--------|------|--------|
| 1 | ✅ done | Guard — blacklist + edit-via-bash vectors + phase reminder | 8d794b6, 8400543 |
| 2 | ⬜ pending | Rewrite pwk-brainstorming | — |
| 3 | ⬜ pending | Rewrite pwk-writing-plans | — |
| 4 | ⬜ pending | Rewrite pwk-executing-tasks | — |
| 5 | ⬜ pending | Rewrite pwk-finalizing | — |
| 6 | ⬜ pending | pwk-design-review (drop per-feature language) | — |
| 7 | ⬜ pending | pwk-verify (confirm no stale refs) | — |
| 8 | ⬜ pending | Rewrite README | — |
| 9 | ⬜ pending | Rewrite docs/developer-usage-guide | — |
| 10 | ⬜ pending | Rewrite docs/workflow-phases | — |

## Task 1 notes (guard)
- `isSafeCommand` now blacklist-only (`!DESTRUCTIVE`); `SAFE_PATTERNS` deleted.
- Added edit-via-bash vectors: `sed -i`, `perl -i`, `awk -i inplace`, `git apply`, `patch` (command-position scoped), `find -delete`.
- `before_agent_start` appends a short phase reminder after the user's message each turn (cache-safe: tail, not prefix).
- Block message "(not allowlisted)" → "(destructive)".
- Known accepted gaps (rely on the phase reminder, per decision option a): interpreter escapes (`node -e`, `python -c`, `bash -c`, `\| bash`), and `rm`/core-commands can FP on grep-args (`git log --grep=rm`) — kept word-anywhere to catch `xargs rm`/`find -exec rm`.