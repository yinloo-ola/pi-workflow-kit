# Progress: pwk-status-phase-driven

Design: docs/plans/2026-09-10-pwk-status-phase-driven-design.md
Branch: pwk-status-phase-driven
Started: 2026-09-10T15:30:00Z
Last updated: 2026-09-10T17:20:00Z
Feature phase: done

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Phase-driven state inference in pwk-status | — | ed223b2 |
| 2 | ✅ | Pinned find discovery recipe in all four sites | 🔎 deviated | 0880bef |
| 3 | ✅ | Repo-root check, step 0, in all four sites | cwd phrasing tool-agnostic | fa1ac5c |
| 4 | ✅ | Recreated fixture + state-model contract tests | — | a796881 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Phase-driven state inference in pwk-status | Steps 2–4 rewritten: state per topic/part from the progress file's `Feature phase:` line (done terminal with optional `N/N` tally, honest mid-flight states, design/not-started/fallback), header-only extraction (`head -n 10`, `grep -c` tallies, never the file body), umbrella roll-up with done counts and a ready-for-finalize hint; example table shows the new states. | No |
| 2 | Pinned find discovery recipe in all four sites | The abstract "Glob `docs/plans/**/…`" instruction became the exact `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'` recipe in status/brainstorming/executing-tasks/finalizing; `recursiveGlob` marker replaced by the find-recipe marker across skill-lint, human-review-digests, and code-digest anchors; finalizing's Process step 1 and disposal lines untouched (byte-identical guard). | Yes — see decision-record below |
| 3 | Repo-root check, step 0, in all four sites | Status gains step 0; brainstorming/executing-tasks prepend the check to their discovery step; finalizing gains pre-check 2 (old check renumbered); mismatch reports both paths and stops, never `cd`, worktree root counts. | No |
| 4 | Recreated fixture + state-model contract tests | Fixture tree rebuilt (overview + part-a design-only / part-b implementing (1/2) / part-c done / part-d roster-only + flat standalone ship-paused); expected-status-output.md rewritten to the R1 model with the old discrepancy note gone; E2E + markers already carry the contract assertions; no test reads docs/plans/**. | No |

## Deviation decision-records

- **R2 discovery recipe platform hedge (user feedback, post-approval)**: the design pinned `/usr/bin/find` as *the* recipe — the absolute path was chosen to dodge this machine's `find` alias wrapper (the aliased wrapper returned zero results on a directory full of matches), but it breaks on Windows: `/usr/bin/find` does not exist there and CMD's `find.exe` is an unrelated tool. Changed to a dual-platform clause in all four sites: POSIX `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'` plus Windows `Get-ChildItem -Recurse docs/plans -Filter '<suffix>'` minus any `completed` folder, with the load-bearing invariant stated in the design — a recursive walk, never glob wildcards. Rejected: dropping the pinned recipe for an abstract verb — that reopens the glob-degeneration failure class this feature exists to close.

- **R2 invariant-over-tool reframe (user feedback at ship)**: pinning exact commands over-specified tooling — the model knows its harness (ffind, ripgrep --files, Glob tools) better than the skill does, and per-platform mandates age badly. The four sites now state the invariant (recursive search under docs/plans reaching nested folders, skipping completed/, NEVER shell glob wildcards — the proven globstar degradation) and carry the POSIX/Windows commands as `e.g.` examples any reliable tool may replace. Status's extraction rules keep their contract (header-only, never the file body) with `head -n 10`/`grep -c '✅'` likewise demoted to examples — the contract is what saves the tokens, not the tool. Rejected: dropping the invariants entirely — both incident failure modes (silent flat-topic drops, ~20k-token full reads) came from unconstrained tool choice.

- **R2 lean positive wording (user feedback at ship, second pass)**: the dual-platform example enumeration became one example per site, and prohibitions rephrased positively — "never rely on shell glob wildcards" became "let the search tool do the recursing (glob patterns like `**` don't recurse in non-interactive shells)"; "never reads the file body" became "the body carries nothing status needs". The invariants are unchanged (recursive, reaches nested folders, skips `completed/`, header-only extraction); the `winRecipe` marker retired — platform coverage now travels with the invariant, not with enumerated commands.

## Code digest

<!-- Written once, after the feature review passes; never back-filled per requirement. -->

### Summary
pwk-status now infers each topic's state from the progress file's `Feature phase:` header line — the same vocabulary the executor writes and finalizing gates on — giving the model a real terminal `done` state (with an optional `N/N` tally) and honest mid-flight states (feature-spec, review, ship-paused, execute k/N), instead of rendering every progress-bearing topic as in-flight forever. Discovery across all four planning skills became a pinned dual-platform find recipe (POSIX `find` / Windows `Get-ChildItem -Recurse`), immune to the bash-globstar degeneration that silently dropped flat topics, and every discovery step verifies the session is rooted at the repo before globbing.

### Flow
Status run: verify root (`pwd` == `git rev-parse --show-toplevel`) -> pinned find over docs/plans (design/implementation/progress/overview suffixes, completed/ excluded) -> `head -n 10` per progress file -> `Feature phase:` line -> state per mapping (done terminal; implementing (k/N) -> execute k/N; reviewing/legacy -> review; ship-paused; e2e-written/feature-spec-paused -> feature-spec; design-only -> design; roster-only -> not started; unparseable -> execute fallback) -> umbrella roll-up `n done · n in-flight · n not-started` (+ ready-for-finalize hint when all done) -> compact grouped table.

### Gotchas
- During this topic's own execution, the committed fixture makes pwk-status report `status-fixture` as an in-flight umbrella and this topic itself as in-flight — expected; both disappear at finalize (fixture disposed).
- Parts shaped like the incident's city-ambassador (design doc written, progress never created) show `design`, not `done` — status speaks only from artifacts; executor compliance is a separate concern.
- The root check stops with a message rather than `cd`-ing — a mis-rooted session must be restarted at the repo root by the user (fixed-root-per-session model).
- `[ALERT]` The 400-char exclusion-window lint anchors (skill-lint EXCLUSION_SITES, code-digest) are position-sensitive: future edits to the four discovery steps must keep the `excluding docs/plans/completed/` phrase within 400 chars of each anchor line, or the suite reds (by design).

### Key files
- `skills/pwk-status/SKILL.md` — phase-line state model, done terminal, extraction rules, roll-up with hint.
- `skills/{pwk-brainstorming,pwk-executing-tasks,pwk-finalizing}/SKILL.md` — pinned dual-platform discovery recipe + root check at each site.
- `tests/markers.mjs` — STATUS_STATE_MARKERS block; `recursiveGlob` marker retired for findRecipe/winRecipe.
- `tests/pwk-status.test.ts` — the feature E2E: mapping, done terminal, roll-up, recipes, root checks, preserved claims.
- `docs/plans/2026-02-12-status-fixture/` — walked fixture; expected output matched line-for-line.
