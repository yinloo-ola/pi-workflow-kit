# Design: pwk-status phase-driven state + pinned discovery

## At a glance

`pwk-status` reported an umbrella with two shipped parts as "all tasks in progress" (incident: Paseo worktree `~/.paseo/worktrees/30r8ciaj/greasy-monkey`, 2026-09-10): the skill's state model tops out at "progress file exists → execute / in-flight" and never reads the `Feature phase:` line the executor already writes — so there is no terminal `done` state and no honest mid-flight states (`reviewing`, `ship-paused`, `feature-spec-paused`). Separately, the abstract "Glob `docs/plans/**/…`" instruction is execution-fragile: under non-interactive bash (globstar off) `**` degenerates to one directory level, silently dropping flat topics — proven live in this repo (`ls docs/plans/**/*-design.md` missed `2026-02-12-standalone-design.md`). And no site verifies the session is actually rooted at the repo, so a subdirectory-rooted session globs the wrong tree and reports nothing.

The fix: status infers each part's state from the progress file's `Feature phase:` header line (the canonical vocabulary `pwk-executing-tasks` already defines and `pwk-finalizing` already gates on), discovery becomes a pinned `/usr/bin/find` recipe in all four discovery sites, and every site gains a repo-root check before globbing. Fixture and contract tests are recreated (commit `5a54266` was dropped pre-design: its test asserted wording only and its diagnosis docs misnamed the gap).

### Key decisions

- State is inferred from the progress file's `Feature phase:` line — the executor already writes it and finalizing already gates on it; status becomes the third reader of the same truth. `(rejected: parse the Requirements-table ✅ tally as the primary signal — formatting-fragile and it cannot name the paused states; the tally survives as display-only.)`
- Discovery is a pinned shell recipe — POSIX: `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'`; Windows: `Get-ChildItem -Recurse docs/plans -Filter '<suffix>'` minus any `completed` folder — replacing the abstract "Glob `docs/plans/**/…`" verb in all 4 sites. Harness-neutral (both shells named; the invariant is a recursive walk, never glob wildcards), and immune to the `**`-globstar trap I proved live. `(rejected: POSIX-only recipe — the absolute path dodges this machine's `find` alias wrapper but breaks on Windows, where `/usr/bin/find` does not exist and CMD's `find.exe` is an unrelated tool; rejected: keep the glob + add a bash-globstar warning — the trap is a property of whatever shell the harness runs, so warning about one shell doesn't fix the class.)`
- Root mismatch → stop and report, never `cd`. `(rejected: auto-`cd "$(git rev-parse --show-toplevel)"` — it masks a mis-rooted session and contradicts the fixed-root-per-session model; agents hallucinate cd paths.)`
- Status stays prose (harness-neutral skill), no `/pwk-status` extension command in this PR. `(rejected: add the command + a pure `buildStatusReport` helper now — a real follow-up if prose variance bites again, but it is scope beyond the incident and the kit deliberately separates Pi-only commands from neutral skills.)`
- Status extracts, never ingests: the phase line comes from each progress file's header and tallies from `grep -c` — status never reads a progress file's body. `(rejected: read each progress file in full — progress files carry execution summaries, review reports, and code digests the status view never needs; full reads burn thousands of tokens per part, e.g. the ~500-line tour-map progress in the incident worktree.)`
- Drop `5a54266` and recreate its useful 10% corrected, rather than build on it. `(rejected: extend the landed test — it asserts the grouping *wording*, not the state model, so it could not catch this incident class; its expected-output file even carried an unresolved discrepancy note.)`

| R# | Requirement in one line | Risk |
|----|--------------------------|------|
| R1 | pwk-status infers per-part/topic state from the progress file's `Feature phase:` line, with `done` as a terminal state | low |
| R2 | All four discovery sites pin the exact `/usr/bin/find` recipe; markers and lint anchors re-anchored | medium |
| R3 | All four sites verify cwd is the repo root (step 0) and stop on mismatch | low |
| R4 | Fixture tree + expected output recreated to the R1 model; contract tests assert the state model | low |

## Requirements

### R1: Phase-driven state inference in pwk-status

`pwk-status` derives each part's (and each standalone topic's) state from the progress file's `Feature phase:` header line — using the exact vocabulary `pwk-executing-tasks` defines (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`, legacy `feature-complete-paused`) — and shows `done` parts as done.

**Acceptance criteria**
- Given a part whose progress file says `Feature phase: done`, When status runs, Then the part renders `done` (suffixed `N/N` when the ✅ tally in its Requirements table is parseable, bare `done` otherwise) and is counted under `done` — never under in-flight.
- Given `Feature phase: implementing (1/2)`, When status runs, Then the part renders `execute 1/2` and counts as in-flight.
- Given `e2e-written` or `feature-spec-paused`, Then the part renders `feature-spec`; given `reviewing` or legacy `feature-complete-paused`, Then it renders `review`; given `ship-paused`, Then it renders `ship-paused` — all counted as in-flight.
- Given a part with a `*-design.md` but no progress file, Then it renders `design` (not "not started").
- Given a part named only in the overview roster (no artifacts), Then it renders `not started`.
- Given a progress file with no parseable `Feature phase:` line, Then the topic falls back to `execute` (with tally if parseable) — never silently empty.
- Given a legacy 1.x topic (`*-implementation.md` stem-matched), Then the same phase-line inference applies to its progress file.
- Given any progress file regardless of size, When status gathers state, Then it reads only the file's header (`head -n 10` — the `Feature phase:` line sits in the first 10 lines of the executor's template), takes the in-flight tally from the phase line itself (`implementing (k/N)`), counts done rows via `grep -c '✅'` when a done tally is wanted, and never reads the file body (execution summary, review reports, code digest) nor any design doc's content; if the line is missing from the header, `grep -m1 '^Feature phase:' <file>` finds it without a full read.
- The umbrella roll-up line reads `n done · n in-flight · n not-started` (in-flight = design + execute + feature-spec + review + ship-paused); when every part is `done`, the roll-up appends a ready-for-`/skill:pwk-finalizing` hint; a done standalone topic gets the same hint.

### Checkpoints: none
### Review: skip

### R2: Pinned discovery recipe in all four sites

Every skill that discovers in-flight planning artifacts names the exact recipe — POSIX: `/usr/bin/find docs/plans -name '<suffix>' -not -path '*/completed/*'`; Windows: `Get-ChildItem -Recurse docs/plans -Filter '<suffix>'`, minus any `completed` folder — a recursive walk, never glob wildcards, instead of instructing an abstract glob: `pwk-status` step 1 (`*-design.md`, `*-implementation.md`, `*-progress.md`, `overview.md`), `pwk-brainstorming` step 2 (`*-design.md`, `overview.md`), `pwk-executing-tasks` step 2 (`*-design.md`, `*-implementation.md`), `pwk-finalizing` pre-finalization check 2 + Process step 1 (`*-progress.md`, `overview.md`). Conditional mentions of "a `docs/plans/**/overview.md` exists" may stay as conditions; only discovery *recipes* are pinned. Recipe lines keep the phrase `excluding docs/plans/completed/` so the `completedExclusion` marker stays valid.

**Acceptance criteria**
- Given a flat topic at `docs/plans/<date>-<topic>-design.md`, When the pinned recipe runs under bash with globstar off, Then the topic is found (the `**`-degenerates-to-one-level trap cannot drop it — `find` is recursive by construction).
- Given the four sites, Then each discovery step contains the pinned recipe for exactly the suffixes it consumes, each with the completed/ exclusion.
- **R2 criterion (Windows parity)**: Given a Windows-native session, When a site's discovery step is followed, Then it names the PowerShell equivalent (`Get-ChildItem -Recurse docs/plans -Filter`) alongside the POSIX form in all four sites.
- `DIGEST_MARKERS.recursiveGlob` (`docs/plans/**/`) is replaced by a find-recipe marker (e.g. `find docs/plans -name`); the GLOB_SITES assertion (brainstorm, executing, status, finalizing) and the exact-line EXCLUSION_SITES anchors (`status` step-1 line, `fin` umbrella line) are re-anchored; a repo-wide sweep finds no remaining instructs-a-glob discovery line and no test still asserting the old marker.
- Edge: `pwk-finalizing`'s "`Feature phase` must be `done`" check (`mustBeDone` marker) survives the edit untouched.

### Checkpoints: none
### Review: skip

### R3: Repo-root check, step 0, in all four sites

Before discovering, each of the four skills runs `pwd` and `git rev-parse --show-toplevel`; on mismatch it stops and reports both paths with "restart the session at the repo root" — it never `cd`s.

**Acceptance criteria**
- Given a session whose cwd is a subdirectory of the repo, When any of the four skills runs, Then it prints the mismatch (both paths) and stops without printing a topic table — no silent empty report.
- Given a session rooted at a worktree, Then it proceeds normally (`git rev-parse --show-toplevel` returns the worktree root).
- Given a directory where `git rev-parse --show-toplevel` fails, Then the skill reports "not a git repository" and stops.

### Checkpoints: none
### Review: skip

### R4: Recreated fixture + state-model contract tests

Recreate `docs/plans/2026-02-12-status-fixture/` (overview with four parts — part-a design-only, part-b `implementing (1/2)`, part-c `done`, part-d roster-only — plus part design/progress stubs) and the flat standalone topic (design stub + progress stub with `Feature phase: ship-paused`), with `expected-status-output.md` rewritten to the R1 model. Recreate `tests/pwk-status.test.ts` asserting the state-model contract, and re-anchor `tests/markers.mjs` / `tests/skill-lint.mjs` per R2/R3.

**Acceptance criteria**
- Given the recreated fixture, Then `expected-status-output.md` shows: roll-up `1 done · 2 in-flight · 1 not-started`; `part-a design`, `part-b execute 1/2`, `part-c done 1/1`, `part-d not started`; standalone `ship-paused`. The old file's "Discrepancy to confirm" note is gone — the model it flagged is now defined.
- The contract test asserts: every phase value → state-name mapping appears in `pwk-status`'s SKILL.md; the `done` terminal state; the roll-up wording with done counts and the ready-for-finalize hint; the pinned find recipe; the step-0 root check; the completed/ exclusion; the read-only / does-not-unlock claims.
- No test reads `docs/plans/**` — the fixture is review-walkable only, so `pwk-finalizing` may dispose it without breaking CI.
- Edge: the fixture's committed presence makes `pwk-status` report `status-fixture` as an in-flight umbrella during this topic's own execution — accepted, disposable at finalize.

### Checkpoints: none
### Review: skip

## Problem

Two failures, one incident. On 2026-09-10 the user finished parts of the `up-adventure-2026` umbrella in a Paseo worktree (greasy-monkey) and ran `/pwk-status` in a new Claude Code session: mileage-ingestion and tour-map both carried `Feature phase: done` with all requirements ✅, yet status reported everything in progress. The skill's inference ("progress file → execute, show done/total"; "in-flight if it has an active progress file") predates the phase vocabulary and has no terminal state. The same session class can also find *nothing*: the discovery step says "Glob `docs/plans/**/*-design.md`", which under non-interactive bash (globstar off — the default for harness bash tools) matches only `docs/plans/*/*-design.md`, dropping every flat topic; a session started outside the repo root drops everything. An earlier attempt (`5a54266`, dropped) added a wording-contract test and fixture but never touched the state model — its own expected-output file recorded the part-a "design vs not-started" discrepancy it could not resolve.

## Approaches considered

- **Phase line as the state source (chosen) vs Requirements-table tally** — the phase line is written by the executor at defined checkpoints, names every paused state, and is already load-bearing in `pwk-finalizing`'s gate; the tally is display sugar.
- **Pinned `find` recipe (chosen) vs glob + shell warning** — the failure is a property of whichever shell the harness runs; only a recipe that is recursive *by construction* removes the class. `find` is also harness-neutral (POSIX, no provider tool names in skills).
- **Extension `/pwk-status` command + pure helper (rejected for now)** — code doesn't have prose variance, and the kit already splits Pi-only commands from neutral skills; but it's a second surface (command + helper + tests) beyond the incident. Recorded as the follow-up if skill-prose status drifts again.
- **Stop-and-report on root mismatch (chosen) vs auto-cd** — auto-cd hides why the session was mis-rooted and contradicts the fixed-root-per-session model; a loud stop turns a silent-wrong-answer into a one-line fix.
- **Drop `5a54266` (chosen) vs extend it** — its test asserted grouping wording, not state inference, so it could not catch this class; the fixture was worth keeping but is 7 stub files, recreated corrected.

## Architecture and components

All changes are skill prose + tests; no runtime code.

- `skills/pwk-status/SKILL.md` — step 0 root check; step 1 pinned recipes (four suffixes); steps 2–3 rewritten to the R1 state model (phase-line inference, done terminal state, roll-up with done counts, finalize hint); step 4 table gains the new state names.
- `skills/pwk-brainstorming/SKILL.md` (step 2), `skills/pwk-executing-tasks/SKILL.md` (step 2), `skills/pwk-finalizing/SKILL.md` (pre-check 2, Process step 1) — step-0 root check + pinned recipes; wording otherwise untouched (`mustBeDone` line preserved).
- `tests/markers.mjs` — `recursiveGlob` replaced by the find-recipe marker; new markers for the phase-line contract, done state, roll-up/finalize hint, and root check, shared by skill-lint and the vitest suites.
- `tests/skill-lint.mjs` — GLOB_SITES assertion re-targets the recipe marker; EXCLUSION_SITES exact-line anchors updated to the new step-1/umbrella lines.
- `tests/pwk-status.test.ts` — recreated per R4.
- `docs/plans/2026-02-12-status-fixture/**` + flat standalone stubs — recreated per R4 (committed; disposed at finalize).

## Data flow

`pwk-executing-tasks` remains the sole writer of `Feature phase:` (checkpoints, ship gate, done). Status reads that line read-only at display time; finalizing keeps gating on it. Discovery flows through `/usr/bin/find` (recursive, completed/-excluded) instead of harness-dependent globs; the root check gates both. No new writes anywhere — status stays read-only and guard-neutral.

## Error handling

Unparseable/missing `Feature phase:` line → `execute` fallback (never empty); unparseable ✅ tally → bare state name without `N/N`; `git rev-parse` failure → "not a git repository" + stop; cwd ≠ toplevel → both paths + stop; no artifacts at all → existing fallback (suggest `/skill:pwk-brainstorming`).

## Feature acceptance

- Given the recreated fixture tree (umbrella: part-a design-only, part-b `implementing (1/2)`, part-c `done`, part-d roster-only; flat standalone at `ship-paused`), When the pwk-status skill is followed literally from the repo root, Then the report matches `expected-status-output.md` state-for-state: `status-fixture (umbrella): 1 done · 2 in-flight · 1 not-started` with `part-a design`, `part-b execute 1/2`, `part-c done 1/1`, `part-d not started`, plus standalone `ship-paused` — and no finished part is labeled in-flight.
- Given the incident shape (two parts `Feature phase: done`, one design-only, three roster-only), When status runs, Then the two done parts render `done` with their tally and the roll-up counts them under done.
- Given a session whose cwd is a subdirectory of the repo, When pwk-status runs, Then it reports the root mismatch and stops instead of printing an empty report.

### Feature review: inline
