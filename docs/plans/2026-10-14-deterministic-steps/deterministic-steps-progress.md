# Progress: deterministic-steps

Design: docs/plans/2026-10-14-deterministic-steps/deterministic-steps-design.md

Branch: 2026-10-14-deterministic-steps

Setup: n/a

Started: 2026-10-14T14:35:00Z

Last updated: 2026-10-14T15:38:36.215Z

Feature phase: implementing (5/6)

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Scripted progress-file writes | — | 49f7a23 |
| 2 | ✅ | Section-scoped reference reads and an anchor-resolving lint | — | 74be32d 6eac0cc |
| 3 | ✅ | The reviewed diff is the shipped diff | — | 8a95578 ef9f31d |
| 4 | ✅ | Enumerated capability checks | — | 5f4ed8d |
| 5 | ✅ | The pin checkers live in the repo | — | c86c1b0 |
| 6 | ⬜ | One runtime for the helpers | ⏸ full · 🔎 parallel | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | Scripted progress-file writes | One Node helper owns the progress file's structural slots — phase, setup slot, a requirement row's done cell and commit, and execution-summary content. It parses and validates the whole table before writing, appends commit ids in order, escapes pipes, refuses to overwrite a written summary, and writes atomically, so a refusal leaves the file byte-identical. The write-once rule has no amendment path, so correcting this row needed a direct edit — an open finding for the ship checkpoint. | yes — a bug the feature E2E caught during R2: the helper wrote the `Last updated` stamp into the line after the phase line, clobbering a load-bearing blank line and leaving the real stamp stale; fixed in R2 with a per-slice regression assertion; a second bug surfaced during R3 — the helper escaped a pipe when writing but its parser split on every pipe, so a summary containing one broke every later command; the parser now splits on unescaped pipes only, with a round-trip test | vitest run tests/progress-helper.test.ts -> 6 pass (malformed table untouched, missing row, commit append order, unknown glyph, setup slot, duplicate summary refused); the feature E2E's first scenario goes green when R3's staging helper lands. |
| 2 | Section-scoped reference reads and an anchor-resolving lint | A Node section extractor prints one anchored section — from the heading to the next heading of the same or higher level — and skill-lint gained a check that every reference pointer in the skill text resolves: the file exists and the anchor matches a heading under the same slug rule. The executing-tasks skill's five bare pointers now name the sections their steps need, and the skill says to load a section rather than a whole file. | yes — one pointer's target section did not exist, so progress-format.md gained a ## Code digest heading to anchor it | vitest run tests/ref-helper.test.ts -> 5 pass (section boundaries, nested stop, unknown anchor lists headings, missing file, no anchor); skill-lint: 'reference pointer: all 10 reference pointers resolve'; the feature E2E's dangling-anchor case fails a rewritten pointer naming both the file and the anchor. |
| 3 | The reviewed diff is the shipped diff | A Node helper fails when the tree holds uncommitted or untracked paths outside docs/plans/, listing them; the plan folder stays exempt because the design, progress file, and generated packet are legitimately dirty while a step is in flight. A root it cannot verify (not a git worktree) fails loudly rather than passing, and the packet-assembly step and the ship checkpoint both instruct running it. | yes — the feature E2E had to git-init its kit copy, since the check verifies a worktree and a plain directory cannot be verified | vitest run tests/stage-check.test.ts -> 5 pass (clean tree, untracked outside, modified tracked outside, plan-folder-only dirty, unverifiable root); the feature E2E's first scenario is fully green, and a stray file in the kit copy fails naming it. |
| 4 | Enumerated capability checks | The recon step now requires enumerating what the session actually grants before it says anything is missing — under a batch executor Array.from(ALL_TOOLS), otherwise the tools and roles the host listed — naming the result, and reporting Scout: unavailable only among the enumerated tools with that result attached. skill-lint gained a check that the step carries the instruction and both forms. | — | skill-lint: 'recon enumeration: the recon step enumerates before reporting a capability missing'; the feature E2E asserts the repo text matches /enumerat/i and names ALL_TOOLS, and that stripping the sentence from a kit copy fails the lint naming the check. |
| 5 | The pin checkers live in the repo | The relocated pin checker gained a named-revision argument (--against <rev>, default HEAD), repo-relative path resolution so a caller can pass an absolute path, and a non-zero exit that names every lost phrase — so a later pass can gate on it instead of only diffing HEAD. The pool harvest now tolerates a missing source file. | yes — R5 narrowed to those two refinements by human decision (Option 1); the relocation criteria were delivered by the skill-slimming-2 finalize, and the design records the amendment | vitest run tests/pins-lost.test.ts -> 4 pass (intact, a drop against a named revision, an absolute path, an unresolvable revision); the feature E2E's pin scenario is green and takes a real phrase from markers.mjs. |
| 6 | One runtime for the helpers | | | |

## Deviation records

## Code digest
