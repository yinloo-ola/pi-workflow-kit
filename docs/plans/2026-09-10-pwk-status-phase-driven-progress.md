# Progress: pwk-status-phase-driven

Design: docs/plans/2026-09-10-pwk-status-phase-driven-design.md
Branch: pwk-status-phase-driven
Started: 2026-09-10T15:30:00Z
Last updated: 2026-09-10T16:25:00Z
Feature phase: implementing (3/4)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Phase-driven state inference in pwk-status | — | ed223b2 |
| 2 | ✅ | Pinned find discovery recipe in all four sites | 🔎 deviated | 0880bef |
| 3 | ✅ | Repo-root check, step 0, in all four sites | — | fa1ac5c |
| 4 | ⬜ | Recreated fixture + state-model contract tests | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Phase-driven state inference in pwk-status | Steps 2–4 rewritten: state per topic/part from the progress file's `Feature phase:` line (done terminal with optional `N/N` tally, honest mid-flight states, design/not-started/fallback), header-only extraction (`head -n 10`, `grep -c` tallies, never the file body), umbrella roll-up with done counts and a ready-for-finalize hint; example table shows the new states. | No |
| 2 | Pinned find discovery recipe in all four sites | The abstract "Glob `docs/plans/**/…`" instruction became the exact `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'` recipe in status/brainstorming/executing-tasks/finalizing; `recursiveGlob` marker replaced by the find-recipe marker across skill-lint, human-review-digests, and code-digest anchors; finalizing's Process step 1 and disposal lines untouched (byte-identical guard). | Yes — see decision-record below |
| 3 | Repo-root check, step 0, in all four sites | Status gains step 0; brainstorming/executing-tasks prepend the check to their discovery step; finalizing gains pre-check 2 (old check renumbered); mismatch reports both paths and stops, never `cd`, worktree root counts. | No |
| 4 | Recreated fixture + state-model contract tests | | |

## Deviation decision-records

- **R2 discovery recipe platform hedge (user feedback, post-approval)**: the design pinned `/usr/bin/find` as *the* recipe — the absolute path was chosen to dodge this machine's `find` alias wrapper (the aliased wrapper returned zero results on a directory full of matches), but it breaks on Windows: `/usr/bin/find` does not exist there and CMD's `find.exe` is an unrelated tool. Changed to a dual-platform clause in all four sites: POSIX `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'` plus Windows `Get-ChildItem -Recurse docs/plans -Filter '<suffix>'` minus any `completed` folder, with the load-bearing invariant stated in the design — a recursive walk, never glob wildcards. Rejected: dropping the pinned recipe for an abstract verb — that reopens the glob-degeneration failure class this feature exists to close.

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary — 2–3 sentences: what the code now does differently, and why.
### Flow — execution/data movement through the changed code, as arrow chains.
### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
### Key files — 3–5 pivotal files, one line each: what shifted inside them.
