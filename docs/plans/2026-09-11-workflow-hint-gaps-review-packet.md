# Review packet: workflow-hint-gaps — feature review

## Commits
4634962 docs: adopt and clean up one worktree per branch (R5)
0eca7a9 docs: fail the finalize gate closed and trim the phase vocabulary (R4)
f957c59 docs: surface predecessor phases instead of assuming them (R3)
b5e6c94 docs: give every rendered state a source and a bucket (R2)
c995e31 docs: route next-step hints without bouncing (R1)
8059c0f docs: add design doc

## Changed files
docs/plans/2026-09-11-workflow-hint-gaps-design.md | 107 +++++++++++++++++++++
 docs/plans/2026-09-11-workflow-hint-gaps-e2e.sh    |  63 ++++++++++++
 .../2026-09-11-workflow-hint-gaps-progress.md      |  34 +++++++
 skills/pwk-brainstorming/SKILL.md                  |   4 +-
 skills/pwk-code-review/SKILL.md                    |   4 +-
 skills/pwk-executing-tasks/SKILL.md                |  12 +--
 skills/pwk-finalizing/SKILL.md                     |   3 +-
 skills/pwk-status/SKILL.md                         |   8 +-
 8 files changed, 220 insertions(+), 15 deletions(-)

## Acceptance criteria (verbatim from the design doc)
### R1: Next-step routing never bounces

Every "what next" hint must land on a skill whose gate accepts the current state.

**Acceptance criteria**
- Given a topic at `ship-paused`, When a fresh session runs status, Then it renders next step `/skill:pwk-executing-tasks` (approve the ship checkpoint) and no state other than `done` ever carries a finalizing hint.
- Given any code-review completion (per-requirement or whole-feature, clean or with findings), When the review ends, Then the next step is `/skill:pwk-executing-tasks`, and no already-terminal requirement row regresses (step 7 states which row `🔄` applies to: the requirement under review).
- Given two umbrellas in flight plus a standalone design, When a feature review completes, Then a standalone feature takes the standalone branch and a part reads the roster from the overview in its own folder (finalizing text unchanged — its ambiguous-case ask already covers this).

### Checkpoints: none
### Review: skip

### R2: Every rendered state is complete

No tally without a defined source, no state without a bucket.

**Acceptance criteria**
- Given a progress file at `e2e-written` with K requirement rows, When status renders it, Then it shows `execute 0/K` where K comes from one bounded Requirements-table row count, with the source stated next to the mapping. (Legacy mappings out of scope — untouched.)
- Given parts at `feature-spec` and `awaiting setup`, When status groups by umbrella, Then each lands in a named bucket, and the bucket enumeration matches the state vocabulary one-to-one.

### Checkpoints: none
### Review: skip

### R3: Sessions see the state they route on

Extend-vs-fresh and slice-vs-sibling decisions need predecessor phases on disk, not assumed.

**Acceptance criteria**
- Given an in-flight topic (design + progress at any phase), When a fresh brainstorm session runs discovery, Then its report includes the topic's `Feature phase:` line (matched, header-only — no body ingest); design-only topics still report `design` exactly as today.
- Given an umbrella with part 1 at any phase, When a fresh session brainstorms part 2, Then it reports part 1's phase line before designing the slice.
- Given a later part's execute pre-flight with a prior part not at `done`, When it reports, Then it surfaces the prior parts' phases as advisory context (no refusal, no reorder).

### Checkpoints: none
### Review: skip

### R4: Gates and vocabulary match reality

The finalize gate must fail closed on unstarted work; the phase vocabulary must not list values nothing writes.

**Acceptance criteria**
- Given an umbrella roster of 3 parts where 2 progress files read `done` and the third has no progress file, When finalizing pre-checks run, Then the run blocks naming the unstarted part and routes back to `/skill:pwk-executing-tasks`; all-`done` umbrellas and standalone topics behave exactly as today (existing `❌`/`⏭` rules untouched).
- Given the executing-tasks text, When read, Then its live phase enumeration contains only phases the flow writes. (Pre-notice files are legacy — out of scope, untouched.)

### Checkpoints: none
### Review: skip

### R5: One worktree per branch, created once, removed once

Umbrella parts share one branch, so at most one worktree can ever back it; resume sessions must adopt, not duplicate.

**Acceptance criteria**
- Given a part-1 worktree already checking out the umbrella branch, When a later part's pre-flight runs, Then it adopts the existing worktree (same `../<repo>-<topic>` convention, branch topic) instead of offering a new `git worktree add`; a standalone resume with an existing worktree likewise adopts rather than re-offers.
- Given finalizing cleanup, When the topic's worktree exists, Then it is removed after verifying presence (`git worktree list`); when absent, cleanup is a silent no-op — never a failure.

### Checkpoints: none
### Review: skip

## Problem

Fresh-session simulation of the whole workflow (new session per phase, disk state only) closes the happy path but the seams leak: routing hints bounce (status→finalizing→executing-tasks, code-review skipping the ship gate, unscoped overview checks), renders go undefined (sourceless tallies, bucketless states), sessions assume predecessor state they never read, the umbrella gate passes unstarted parts vacuously, the phase list names a value nothing writes, and worktree offer/cleanup disagree on reuse. The file handoffs themselves (progress file, packet, overview, disposal globs) are sound — every defect is prose. Five grouped slices, independently reviewable, one PR.

## Approaches considered

- **Grouped vs per-gap slices:** nine per-gap slices mirror the bug list but fragment review and hide interactions (the status hint and the finalize gate are one loop, not two fixes). Grouped-by-concern wins — five slices, each verifiable end to end by its own simulation.
- **U4 block vs warn-and-confirm:** warn mirrors the existing `⏭ skipped` treatment, but a skipped requirement was built and judged while an unstarted part was never built — confirming still disposes its design unread. Block wins; the user returns via executing-tasks, the normal path.
- **Order visibility vs enforcement:** enforcement (refuse out-of-order work) would need resume-time predecessor checks plus guard support, and it forbids legitimate parallel-part execution. Visibility (report phases, proceed) closes the blind assumption at prose cost only. Visibility wins.
- **Discovery glob vs status pointer (G4):** a pointer preserves brainstorm's discovery shape but forces a skill switch to answer one question. One extra suffix glob keeps the session self-sufficient within the existing header-only economy. Glob wins.
- **Worktree adopt vs per-part:** per-part worktrees collide by construction — git refuses two checkouts of the shared umbrella branch, and the stale path breaks resume. Adopt-if-exists keyed on the branch topic wins; creation stays a one-time offer.


## Feature acceptance (verbatim)
## Feature acceptance

- Given a topic at `ship-paused`, When a fresh session runs status then finalizing, Then status routes to executing-tasks and finalizing is never wrongly invoked (R1).
- Given a completed inline feature review, When the reviewer finishes, Then the session continues in executing-tasks through the ship checkpoint to `done` (R1).
- Given an umbrella with an unstarted roster part, When finalizing pre-checks run, Then the run blocks naming the part (R4).
- Given two umbrellas plus a standalone design in flight, When each feature review completes, Then every routing decision uses only the current design's folder (R1).
- Given any single state in the phase vocabulary, When status renders it standalone and inside an umbrella, Then the output names a bucket, a next step, and no undefined tally (R2).
- Given an umbrella worktree from part 1, When part 2 pre-flights and the umbrella finalizes, Then part 2 adopts the worktree and finalize removes exactly it (R5).


## Production-risk notes (verbatim, if any)
(none — design carries no production-risk content)

## Diff
diff --git a/docs/plans/2026-09-11-workflow-hint-gaps-design.md b/docs/plans/2026-09-11-workflow-hint-gaps-design.md
new file mode 100644
index 0000000..465d1ed
--- /dev/null
+++ b/docs/plans/2026-09-11-workflow-hint-gaps-design.md
@@ -0,0 +1,107 @@
+# Design: workflow-hint-gaps
+
+Fix the workflow's routing, rendering, gate, visibility, and worktree defects found by fresh-session simulation (gaps G1–G5, U1–U4, plus the worktree lifecycle). Text edits only — no guard or test changes.
+
+## At a glance
+
+Fresh sessions bounce between skills (status hints finalizing, finalizing refuses; code review skips the ship gate), render states with undefined parts, route blind to predecessor state, gate umbrellas vacuously, and re-offer worktrees that already exist. Five grouped fixes — one per workflow concern, not per skill — each verified by re-running the simulation that found it.
+
+**Key decisions**
+- Scope is repo `skills/` prose only; guard and `tests/skill-lint.mjs` untouched (rejected: bundling lint/guard updates — separate topic, separate PR).
+- KISS first: each criterion states the observable invariant, never the edit; the executor picks the smallest wording that satisfies it.
+- Legacy v1.x paths (`*-implementation.md`, `feature-complete-paused`, `Checkpoints: spec`, `Plan:` refs) are out of scope — left verbatim, untested (rejected: stripping them here — behavior change for any in-flight 1.x docs, separate topic if ever).
+- Requirements are grouped by concern so each slice is independently shippable; file order inside a slice is free (rejected: nine per-gap slices — fragments the review, hides interactions like status-hint vs finalize-gate).
+- A roster part with no progress file **blocks** finalizing (rejected: warn-and-confirm — risks disposing an unstarted design unread).
+- Build order stays advisory; later parts only gain predecessor visibility (rejected: hard enforcement — breaks legitimate parallel-part work and would need guard support).
+- One worktree per branch, adopted on reuse (rejected: one worktree per part — git forbids two checkouts of one branch, so per-part creation always collides).
+- Installed-copy drift (`.pi` copies still document live `spec` and default-`parallel` review) is out of scope (rejected: editing user-local copies — hand-synced, not shipped).
+
+| R# | Requirement in one line | Risk |
+|----|-------------------------|------|
+| 1 | Next-step routing never bounces | low |
+| 2 | Every rendered state is complete | low |
+| 3 | Sessions see the state they route on | low |
+| 4 | Gates and vocabulary match reality | medium |
+| 5 | One worktree per branch, created once, removed once | low |
+
+## Requirements
+
+### R1: Next-step routing never bounces
+
+Every "what next" hint must land on a skill whose gate accepts the current state.
+
+**Acceptance criteria**
+- Given a topic at `ship-paused`, When a fresh session runs status, Then it renders next step `/skill:pwk-executing-tasks` (approve the ship checkpoint) and no state other than `done` ever carries a finalizing hint.
+- Given any code-review completion (per-requirement or whole-feature, clean or with findings), When the review ends, Then the next step is `/skill:pwk-executing-tasks`, and no already-terminal requirement row regresses (step 7 states which row `🔄` applies to: the requirement under review).
+- Given two umbrellas in flight plus a standalone design, When a feature review completes, Then a standalone feature takes the standalone branch and a part reads the roster from the overview in its own folder (finalizing text unchanged — its ambiguous-case ask already covers this).
+
+### Checkpoints: none
+### Review: skip
+
+### R2: Every rendered state is complete
+
+No tally without a defined source, no state without a bucket.
+
+**Acceptance criteria**
+- Given a progress file at `e2e-written` with K requirement rows, When status renders it, Then it shows `execute 0/K` where K comes from one bounded Requirements-table row count, with the source stated next to the mapping. (Legacy mappings out of scope — untouched.)
+- Given parts at `feature-spec` and `awaiting setup`, When status groups by umbrella, Then each lands in a named bucket, and the bucket enumeration matches the state vocabulary one-to-one.
+
+### Checkpoints: none
+### Review: skip
+
+### R3: Sessions see the state they route on
+
+Extend-vs-fresh and slice-vs-sibling decisions need predecessor phases on disk, not assumed.
+
+**Acceptance criteria**
+- Given an in-flight topic (design + progress at any phase), When a fresh brainstorm session runs discovery, Then its report includes the topic's `Feature phase:` line (matched, header-only — no body ingest); design-only topics still report `design` exactly as today.
+- Given an umbrella with part 1 at any phase, When a fresh session brainstorms part 2, Then it reports part 1's phase line before designing the slice.
+- Given a later part's execute pre-flight with a prior part not at `done`, When it reports, Then it surfaces the prior parts' phases as advisory context (no refusal, no reorder).
+
+### Checkpoints: none
+### Review: skip
+
+### R4: Gates and vocabulary match reality
+
+The finalize gate must fail closed on unstarted work; the phase vocabulary must not list values nothing writes.
+
+**Acceptance criteria**
+- Given an umbrella roster of 3 parts where 2 progress files read `done` and the third has no progress file, When finalizing pre-checks run, Then the run blocks naming the unstarted part and routes back to `/skill:pwk-executing-tasks`; all-`done` umbrellas and standalone topics behave exactly as today (existing `❌`/`⏭` rules untouched).
+- Given the executing-tasks text, When read, Then its live phase enumeration contains only phases the flow writes. (Pre-notice files are legacy — out of scope, untouched.)
+
+### Checkpoints: none
+### Review: skip
+
+### R5: One worktree per branch, created once, removed once
+
+Umbrella parts share one branch, so at most one worktree can ever back it; resume sessions must adopt, not duplicate.
+
+**Acceptance criteria**
+- Given a part-1 worktree already checking out the umbrella branch, When a later part's pre-flight runs, Then it adopts the existing worktree (same `../<repo>-<topic>` convention, branch topic) instead of offering a new `git worktree add`; a standalone resume with an existing worktree likewise adopts rather than re-offers.
+- Given finalizing cleanup, When the topic's worktree exists, Then it is removed after verifying presence (`git worktree list`); when absent, cleanup is a silent no-op — never a failure.
+
+### Checkpoints: none
+### Review: skip
+
+## Problem
+
+Fresh-session simulation of the whole workflow (new session per phase, disk state only) closes the happy path but the seams leak: routing hints bounce (status→finalizing→executing-tasks, code-review skipping the ship gate, unscoped overview checks), renders go undefined (sourceless tallies, bucketless states), sessions assume predecessor state they never read, the umbrella gate passes unstarted parts vacuously, the phase list names a value nothing writes, and worktree offer/cleanup disagree on reuse. The file handoffs themselves (progress file, packet, overview, disposal globs) are sound — every defect is prose. Five grouped slices, independently reviewable, one PR.
+
+## Approaches considered
+
+- **Grouped vs per-gap slices:** nine per-gap slices mirror the bug list but fragment review and hide interactions (the status hint and the finalize gate are one loop, not two fixes). Grouped-by-concern wins — five slices, each verifiable end to end by its own simulation.
+- **U4 block vs warn-and-confirm:** warn mirrors the existing `⏭ skipped` treatment, but a skipped requirement was built and judged while an unstarted part was never built — confirming still disposes its design unread. Block wins; the user returns via executing-tasks, the normal path.
+- **Order visibility vs enforcement:** enforcement (refuse out-of-order work) would need resume-time predecessor checks plus guard support, and it forbids legitimate parallel-part execution. Visibility (report phases, proceed) closes the blind assumption at prose cost only. Visibility wins.
+- **Discovery glob vs status pointer (G4):** a pointer preserves brainstorm's discovery shape but forces a skill switch to answer one question. One extra suffix glob keeps the session self-sufficient within the existing header-only economy. Glob wins.
+- **Worktree adopt vs per-part:** per-part worktrees collide by construction — git refuses two checkouts of the shared umbrella branch, and the stale path breaks resume. Adopt-if-exists keyed on the branch topic wins; creation stays a one-time offer.
+
+## Feature acceptance
+
+- Given a topic at `ship-paused`, When a fresh session runs status then finalizing, Then status routes to executing-tasks and finalizing is never wrongly invoked (R1).
+- Given a completed inline feature review, When the reviewer finishes, Then the session continues in executing-tasks through the ship checkpoint to `done` (R1).
+- Given an umbrella with an unstarted roster part, When finalizing pre-checks run, Then the run blocks naming the part (R4).
+- Given two umbrellas plus a standalone design in flight, When each feature review completes, Then every routing decision uses only the current design's folder (R1).
+- Given any single state in the phase vocabulary, When status renders it standalone and inside an umbrella, Then the output names a bucket, a next step, and no undefined tally (R2).
+- Given an umbrella worktree from part 1, When part 2 pre-flights and the umbrella finalizes, Then part 2 adopts the worktree and finalize removes exactly it (R5).
+
+### Feature review: auto
diff --git a/docs/plans/2026-09-11-workflow-hint-gaps-e2e.sh b/docs/plans/2026-09-11-workflow-hint-gaps-e2e.sh
new file mode 100644
index 0000000..a89424a
--- /dev/null
+++ b/docs/plans/2026-09-11-workflow-hint-gaps-e2e.sh
@@ -0,0 +1,63 @@
+#!/bin/bash
+# Feature-acceptance E2E for workflow-hint-gaps (ephemeral — disposed at finalize).
+# Encodes docs/plans/2026-09-11-workflow-hint-gaps-design.md ## Feature acceptance
+# as executable prose-invariant checks over skills/*/. Exits non-zero on any failure.
+# Scope note: text edits only — this script lives in docs/plans/, never tests/.
+cd "$(git rev-parse --show-toplevel)" || exit 1
+PASS=0; FAIL=0
+check() { # $1=name $2=command... (passes when command exits 0)
+  local name="$1"; shift
+  if "$@" >/dev/null 2>&1; then echo "  PASS $name"; PASS=$((PASS+1));
+  else echo "  FAIL $name"; FAIL=$((FAIL+1)); fi
+}
+ST=skills/pwk-status/SKILL.md
+FN=skills/pwk-finalizing/SKILL.md
+EX=skills/pwk-executing-tasks/SKILL.md
+BR=skills/pwk-brainstorming/SKILL.md
+CR=skills/pwk-code-review/SKILL.md
+
+echo "== R1: routing never bounces =="
+# FA1: ship-paused status routes to executing-tasks
+check "status ship-paused -> executing-tasks" grep -q "ship-paused.*pwk-executing-tasks" "$ST"
+# FA1: no non-done state carries a finalizing hint (every finalizing mention on a done line)
+NOTDONE_FINALIZING=$(grep -n "pwk-finalizing" "$ST" | grep -v -i "done" || true)
+check "no non-done finalizing hint" test -z "$NOTDONE_FINALIZING"
+# FA2: inline review completion continues in executing-tasks (no finalizing branch)
+check "code-review routes to executing-tasks only" bash -c "! grep -A5 'After the review' '$CR' | grep -q 'pwk-finalizing'"
+# FA2b: step 7 names the row under review (no terminal-row regression)
+check "code-review step7 names row under review" grep -q "requirement under review" "$CR"
+# FA4: after-review routing scoped to the current design's folder
+check "after-review uses current design folder" grep -q "its own folder" "$EX"
+
+echo "== R2: every rendered state is complete =="
+# FA5: e2e-written tally states its source (Requirements-table row count)
+check "e2e-written tally states source" bash -c "grep -n 'e2e-written' '$ST' | grep -q 'row count'"
+# FA5: umbrella buckets name awaiting-setup, and notice-phase parts land in execute
+# (no bare "feature-spec" bucket: tests/lean-gates.e2e.test.ts pins the state
+# vocabulary without it — the feature-E2E notice rolls up as execute instead)
+check "buckets cover awaiting setup" bash -c "grep -q 'in-flight parts (.*awaiting setup' '$ST'"
+check "notice parts roll up as execute" bash -c "grep -q 'rolls up as execute' '$ST'"
+
+echo "== R3: sessions see the state they route on =="
+# fresh brainstorm discovery reports in-flight Feature phase lines
+check "brainstorm discovery reads progress phases" bash -c "grep -q '\*-progress.md' '$BR' && grep -q 'Feature phase:' '$BR'"
+# umbrella part-2 brainstorm reports part 1's phase before designing
+check "brainstorm reports prior part phase" bash -c "grep -q 'prior part' '$BR' && grep -q 'Feature phase' '$BR'"
+# later-part execute pre-flight surfaces prior phases as advisory context
+check "execute pre-flight advisory prior phases" grep -q "advisory" "$EX"
+
+echo "== R4: gates and vocabulary match reality =="
+# FA3: finalize blocks on unstarted roster part, naming it, routing to executing-tasks
+check "finalize blocks unstarted part" bash -c "grep -q 'unstarted' '$FN' && grep -q 'pwk-executing-tasks' '$FN'"
+# live phase enumeration contains only phases the flow writes (no legacy feature-spec-paused;
+# the legacy note lives in the parenthetical after the first period — cut to the enum span)
+check "phase enumeration is live-only" bash -c "grep 'Feature phase. is one of' '$EX' | cut -d. -f1 | grep -qv 'feature-spec-paused'"
+
+echo "== R5: one worktree per branch =="
+# FA6: later-part pre-flight adopts existing worktree via `git worktree list`
+check "pre-flight adopts worktree" bash -c "grep -q 'worktree list' '$EX'"
+# FA6: finalize cleanup verifies presence, silent no-op when absent
+check "finalize cleanup verifies presence" bash -c "grep -q 'worktree list' '$FN'"
+
+echo "== $PASS passed, $FAIL failed =="
+test "$FAIL" -eq 0
diff --git a/docs/plans/2026-09-11-workflow-hint-gaps-progress.md b/docs/plans/2026-09-11-workflow-hint-gaps-progress.md
new file mode 100644
index 0000000..1b82485
--- /dev/null
+++ b/docs/plans/2026-09-11-workflow-hint-gaps-progress.md
@@ -0,0 +1,34 @@
+# Progress: workflow-hint-gaps
+
+Design: docs/plans/2026-09-11-workflow-hint-gaps-design.md
+Branch: workflow-hint-gaps
+Started: 2026-09-11T09:17:18Z
+Last updated: 2026-09-11T09:17:18Z
+Feature phase: e2e-written
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ⬜ | Next-step routing never bounces | — | — |
+| 2 | ⬜ | Every rendered state is complete | — | — |
+| 3 | ⬜ | Sessions see the state they route on | — | — |
+| 4 | ⬜ | Gates and vocabulary match reality | — | — |
+| 5 | ⬜ | One worktree per branch, created once, removed once | — | — |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? |
+|----|-------------|------------------|-----------|
+| 1 | Next-step routing never bounces | | |
+| 2 | Every rendered state is complete | | |
+| 3 | Sessions see the state they route on | | |
+| 4 | Gates and vocabulary match reality | | |
+| 5 | One worktree per branch, created once, removed once | | |
+
+## Code digest
+
+<!-- Written once, after the feature review passes; never back-filled per requirement. -->
+
+### Summary — 2–3 sentences: what the code now does differently, and why.
+### Flow — execution/data movement through the changed code, as arrow chains.
+### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
+### Key files — 3–5 pivotal files, one line each: what shifted inside them.
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index d456085..a4ff935 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -45,14 +45,14 @@ An umbrella splits one large requirement into multiple design docs that ship tog
    Goal, parts with one-line scopes, build order — **no status column**. No skill mutates the overview between this write and `pwk-finalizing` (which disposes it); part-completion is inferred from each part's own `*-progress.md`.
 3. **Write the first part's** `<part>-design.md` in the same umbrella folder, then hand off to `/skill:pwk-executing-tasks`.
 
-**Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. There is no special "read your predecessors" step; cross-slice decisions that must persist go in an ADR, not the overview.
+**Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then report each prior part's `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <part>-progress.md` beside the overview — no body ingest) before designing the slice, then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. Predecessor phases are visibility, not enforcement: design the slice regardless; cross-slice decisions that must persist go in an ADR, not the overview.
 
 The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the branch in its pre-flight and reuses it for later parts, and suggests the next part (or finalize after the last); `pwk-finalizing` disposes the overview + every part's docs and ships one PR.
 
 ## Process
 
 1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
-2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `overview.md` (each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
+2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics still report `design` exactly as today. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
 3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR unlock. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
diff --git a/skills/pwk-code-review/SKILL.md b/skills/pwk-code-review/SKILL.md
index bb8dffe..62104cf 100644
--- a/skills/pwk-code-review/SKILL.md
+++ b/skills/pwk-code-review/SKILL.md
@@ -33,7 +33,7 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
    Also check the design's `## Production-risk areas`, if any.
 
 6. **Report** — summarize: tracing findings, spec gaps, smells fixed (with commits), hazards `[TRIGGERED]`. Non-trivial findings become follow-up items — the user decides whether to address now or defer.
-7. **Mark done** — set the requirement's Done cell `✅` (it was left `🔄` while under review; findings leave it `🔄`). Done means reviewed, not just committed.
+7. **Mark done** — set the requirement's Done cell `✅` for the requirement under review (it was left `🔄` while under review; findings leave it `🔄`). Already-terminal rows of other requirements never regress. Done means reviewed, not just committed.
 
 ## Principles
 
@@ -43,4 +43,4 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
 
 ## After the review
 
-Return to `/skill:pwk-executing-tasks` for the next requirement, or `/skill:pwk-finalizing` if all requirements are done. (The human tagged this requirement at design approval when its `### Review` tag was set — keep the review focused on the tag's scope.)
\ No newline at end of file
+Return to `/skill:pwk-executing-tasks` — the next requirement, or the ship checkpoint when every requirement is done. Finalizing is proposed from the ship checkpoint, never from here. (The human tagged this requirement at design approval when its `### Review` tag was set — keep the review focused on the tag's scope.)
\ No newline at end of file
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index b77b2c0..153d2c2 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -14,8 +14,8 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
-3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
+2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)). An umbrella part whose prior parts are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<part>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
+3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, first check `git worktree list`: if a worktree already checks out this branch (the same `../<repo>-<topic>` convention), adopt it — resume the session there instead of offering a new `git worktree add`. One worktree per branch, created once: git refuses two checkouts of one branch, so a later umbrella part reuses part 1's worktree and a standalone resume reuses its own. Otherwise offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
 
 ## First run
 
@@ -69,7 +69,7 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
    - **Side effects** — a line naming what is read and written, only when the feature performs I/O, network, or migrations; omit it entirely otherwise rather than filling a placeholder.
    - **Cap: roughly 15 lines.** If the change genuinely needs more, the ship checkpoint **offers `/skill:pwk-walkthrough`** as the deep read (it regenerates a `file:line`-anchored walkthrough on demand) instead of growing the digest — the digest is what the human reads at the one remaining stop, and an unbounded Flow recreates the digging it exists to prevent.
 
-   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)
+   `Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead. A pre-notice `feature-spec-paused` value still on disk keeps its value — Resume routes it; never write that value.)
 
    The `Setup:` header slot takes one of `Setup: pending | done | n/a` — the header starts `Setup: pending` when the design doc has a `## Setup` section, else `Setup: n/a`; the setup checkpoint below flips it to `done` on approval.
 
@@ -216,10 +216,10 @@ Verify the criticism against the code, evaluate the suggestion, then implement (
 
 ## After the feature review
 
-The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate; both overview checks below run excluding docs/plans/completed/ — an archived umbrella never routes):
+The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate; both overview checks below read the overview in the current design doc's own folder — flat: no overview beside the design doc in `docs/plans/`; part: the `overview.md` next to the part doc inside its `docs/plans/<date>-<umbrella>/` folder — never a repo-wide `docs/plans/**/overview.md`, and always excluding docs/plans/completed/, so an archived or sibling umbrella never routes):
 
-- **Standalone design doc** (no `docs/plans/**/overview.md` exists) → suggest `/skill:pwk-finalizing`.
-- **Umbrella part** (a `docs/plans/**/overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).
+- **Standalone design doc** (no `overview.md` in its own folder) → suggest `/skill:pwk-finalizing`.
+- **Umbrella part** (an `overview.md` sits beside the part doc) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).
 
 Present:
 
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 93ad95b..ccc3af4 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -15,6 +15,7 @@ Ship the completed work.
    - **Any `❌ failed`** (in any part) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
    - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
    - **`Feature phase` must be `done`** in every progress file — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or a legacy `feature-complete-paused` from before the ship gate) means the feature is still in flight: the ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
+4. **Cross-check the umbrella roster — fail closed on unstarted work.** For an umbrella (a `docs/plans/**/overview.md` exists, excluding docs/plans/completed/), read its parts roster and require one `*-progress.md` per part. A roster part with no progress file is **unstarted** — **block**, naming the part, and send the user back to `/skill:pwk-executing-tasks` to build it; never dispose an unstarted design unread. (A part with a progress file that is not `done` is already stopped by the gate above.)
 
 ## Process
 
@@ -72,7 +73,7 @@ Ship the completed work.
    4. **Merge commit** — `--no-ff` merge, push parent, delete branch.
 
    For 2–4, confirm the detected parent branch before proceeding.
-7. **Clean up** — remove the worktree if one was used: `git worktree remove ../<repo>-<topic>`.
+7. **Clean up** — if a worktree was used, verify presence first (`git worktree list`): when the topic's worktree exists, remove it (`git worktree remove ../<repo>-<topic>`); when absent, cleanup is a silent no-op — never a failure.
 
 ## Principles
 
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index fe01dcd..23e64e1 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -14,16 +14,16 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` (with `## Setup` in the design doc) renders the topic as **`awaiting setup`** — the setup checkpoint was never approved — ahead of any phase-derived state below. Map the line to the displayed state:
    - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when a scoped table-row count finds any — `grep -c '^| [0-9].*❌'` / `grep -c '^| [0-9].*⏭'` (one bounded read each; table rows only, so digest or summary mentions of the glyphs do not inflate the count) — render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
-   - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state)
+   - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state; N comes from the Requirements-table row count — `grep -c '^| [0-9]' <file>` — so no tally renders without a defined source)
    - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
    - `reviewing`, legacy `feature-complete-paused` → `review`
-   - `ship-paused` → `ship-paused`
+   - `ship-paused` → `ship-paused` — next: `/skill:pwk-executing-tasks` (approve the ship checkpoint). Never hint finalizing: only `done` routes there.
    - no progress file, only `*-design.md` → `design` — next: `/skill:pwk-executing-tasks`
    - roster-only (named in the overview, no artifacts) → `not started`
    - no parseable `Feature phase` line → `execute` (with tally if parseable).
 
    A legacy 1.x topic (`*-implementation.md` stem-matched) uses the same phase-line inference on its progress file.
-3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, review, ship-paused), not-started parts. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
+3. **Group by umbrella** — for each umbrella `overview.md` (read it — it is status-free and tiny), take its **parts** roster and roll the parts up by state (the overview carries no status): done parts, in-flight parts (design, execute, review, ship-paused, awaiting setup), not-started parts. A part sitting at the feature-E2E notice (`e2e-written`) rolls up as execute — the notice is a routing moment, not a bucket of its own. Print one roll-up line — `<umbrella> (umbrella): n done · n in-flight · n not-started` — and when every part is `done` append `— all parts done, ready for /skill:pwk-finalizing`. A `done` standalone topic gets the same hint. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
 4. Print a compact table, grouped under any umbrellas, e.g.:
 
    ```text
@@ -32,7 +32,7 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
      payments-ui        execute   1/2
      payments-review    review    —
      payments-webhooks  not started
-   auth                ship-paused   — ready for /skill:pwk-finalizing
+   auth                ship-paused   — ready for /skill:pwk-executing-tasks
    ```
 
    If nothing, suggest `/skill:pwk-brainstorming`.
