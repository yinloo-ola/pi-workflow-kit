# Review packet: code-digest — requirement R5 review

## Commits
7638327 feat(plans): exclude completed/ from every recursive discovery glob (R5)

## Changed files
 docs/plans/2026-09-07-code-digest-progress.md |  6 ++--
 skills/pwk-brainstorming/SKILL.md             |  2 +-
 skills/pwk-executing-tasks/SKILL.md           |  4 +--
 skills/pwk-finalizing/SKILL.md                |  4 +--
 skills/pwk-status/SKILL.md                    |  2 +-
 tests/code-digest.test.ts                     | 28 +++++++++++++++++
 tests/skill-lint.mjs                          | 45 +++++++++++++++++++++++++++
 7 files changed, 82 insertions(+), 9 deletions(-)

## Acceptance criteria (verbatim from the plan)
## Requirement 5: completed/ exclusion

### Acceptance criteria
- Given each recursive discovery glob in `pwk-status` (four artifact globs), `pwk-brainstorming` (discovery), `pwk-executing-tasks` (find-the-plan, post-review routing), and `pwk-finalizing` (umbrella detection), When the feature is implemented, Then each carries the same canonical exclusion wording for `docs/plans/completed/`.
- Given an archived umbrella at `docs/plans/completed/<date>-<umbrella>/overview.md` and flat archived docs at `docs/plans/completed/`, When any discovery glob runs, Then nothing under `completed/` matches — status lists only active work; brainstorm discovery reports no archived topics; routing treats a standalone feature as standalone; finalize's umbrella detection does not fire on archived overviews.
- Given `skills/pwk-finalizing/SKILL.md`'s disposal blocks, When the feature is implemented, Then the `rm -rf` / `mv` commands and their anchoring comments are byte-unchanged (wording-only change elsewhere in the skills).
- Given the user docs, When the exclusion is described, Then they link to one single-source statement rather than restating the rule per doc.

### Integration tests
- `should exclude completed/ from every recursive discovery glob` — asserts the canonical exclusion phrase appears adjacent to every `docs/plans/**` glob in all four skills (enumerate the glob sites; assert per site).
- `should leave finalize disposal commands unchanged` — regression guard: the `rm -rf docs/plans/<date>-<umbrella>/` line, the verbatim-path comment, the `mv … docs/plans/completed/` lines, and the `ls` verification line are byte-identical to pre-change HEAD.

### Checkpoints: none
### Review: parallel

### Production-risk notes
- R5 touches the finalize `rm -rf` path (the archive-destruction vector it fixes). The change is wording-only (discovery exclusion), but the hazard reviewer must verify no disposal command or anchoring rule regresses — covered by the byte-identical regression test above plus the parallel review.


## Feature acceptance (verbatim)
## Feature acceptance
- `should compose digest-at-completion, archive-blind discovery, and frontier questioning across the kit` — Given the kit at HEAD with a fixture repo state containing a progress-file template, an archived umbrella under `docs/plans/completed/`, and the brainstorm/planner skills, When the full suite runs, Then: the executing-tasks template carries `## Code digest` wired from the packet to the checkpoint presentation; every recursive discovery glob excludes `completed/` while finalize's disposal commands stay byte-identical; brainstorming's questioning protocol is frontier rounds with recommended answers, facts-looked-up, an assumption gate, and frontier-empty termination; the planner carries the bounce rule; and the user docs mirror all three. This is the primary enforced spec.


## Production-risk notes (verbatim, if any)
### Production-risk notes
- R5 touches the finalize `rm -rf` path (the archive-destruction vector it fixes). The change is wording-only (discovery exclusion), but the hazard reviewer must verify no disposal command or anchoring rule regresses — covered by the byte-identical regression test above plus the parallel review.


## Diff
diff --git a/docs/plans/2026-09-07-code-digest-progress.md b/docs/plans/2026-09-07-code-digest-progress.md
index 05abb2c..342fda2 100644
--- a/docs/plans/2026-09-07-code-digest-progress.md
+++ b/docs/plans/2026-09-07-code-digest-progress.md
@@ -4,7 +4,7 @@ Plan: docs/plans/2026-09-07-code-digest-implementation.md
 Branch: code-digest
 Started: 2026-09-07T12:00:00+08:00
 Last updated: 2026-09-07T12:00:00+08:00
-Feature phase: implementing (4/10)
+Feature phase: implementing (5/10)
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
@@ -13,7 +13,7 @@ Feature phase: implementing (4/10)
 | 2 | ✅ | Digest write point | — | R2 |
 | 3 | ✅ | Checkpoint presentation | — | R3 |
 | 4 | ✅ | Fill rules | — | R4 |
-| 5 | ⬜ | completed/ exclusion | 🔎 parallel | — |
+| 5 | ✅ | completed/ exclusion | 🔎 parallel | R5 |
 | 6 | ⬜ | Frontier rounds | — | — |
 | 7 | ⬜ | Facts vs decisions | — | — |
 | 8 | ⬜ | Assumption gate | — | — |
@@ -27,7 +27,7 @@ Feature phase: implementing (4/10)
 | 2 | Digest write point | New step 4 in the ship-checkpoint flow: after review success, the agent fills ## Code digest from the packet (Commits/Changed files/Diff), re-running a stale packet first; same write point on resume. | |
 | 3 | Checkpoint presentation | Ship-checkpoint presentation list gains a code-digest bullet right after the execution summary; full-diff-on-request stays last. | |
 | 4 | Fill rules | Fill-rules paragraph beside the template: plain language, R# anchors, no test names, A -> B -> C flows, [ALERT] reviewer-confirmed only, honest empty, key files at 5. | |
-| 5 | completed/ exclusion | | |
+| 5 | completed/ exclusion | One canonical phrase (excluding docs/plans/completed/) appended at all six discovery sites across status/brainstorming/executing/finalize; finalize disposal commands untouched (byte-guarded by tests). | |
 | 6 | Frontier rounds | | |
 | 7 | Facts vs decisions | | |
 | 8 | Assumption gate | | |
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 6a3cb1e..a916355 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -52,7 +52,7 @@ The whole umbrella is one branch and one PR: `pwk-writing-plans` creates the bra
 ## Process
 
 1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
-2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/**/*-design.md` and `docs/plans/**/overview.md` (recursive — each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder); report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
+2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/**/*-design.md` and `docs/plans/**/overview.md` (recursive — each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder, excluding docs/plans/completed/ — archived work is not in flight); report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
 3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions one at a time, prefer multiple choice. Once you can articulate what/why/constraints, present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 9cd8e89..4470e6e 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -12,7 +12,7 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the plan** — glob `docs/plans/**/*-implementation.md` (recursive — umbrella parts live in `docs/plans/<date>-<umbrella>/` folders); if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
+2. **Find the plan** — glob `docs/plans/**/*-implementation.md` (recursive — umbrella parts live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived plans are not pending work); if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
 3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.
 
 ## First run
@@ -181,7 +181,7 @@ Verify the criticism against the code, evaluate the suggestion, then implement (
 
 ## After the feature review
 
-The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate):
+The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate; both overview checks below run excluding docs/plans/completed/ — an archived umbrella never routes):
 
 - **Standalone design doc** (no `docs/plans/**/overview.md` exists) → suggest `/skill:pwk-finalizing`.
 - **Umbrella part** (a `docs/plans/**/overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 94a3911..8b76e5a 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -10,7 +10,7 @@ Ship the completed work.
 ## Pre-finalization checks
 
 1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
-2. Read **every** relevant progress file — for an umbrella that's each part's `docs/plans/**/*-progress.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders); for a standalone design doc, the one:
+2. Read **every** relevant progress file — for an umbrella that's each part's `docs/plans/**/*-progress.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived parts are already shipped); for a standalone design doc, the one:
    - **Any `❌ failed`** (in any part) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
    - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
    - **`Feature phase` must be `done`** in every progress file — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or a legacy `feature-complete-paused` from before the ship gate) means the feature is still in flight: the ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
@@ -18,7 +18,7 @@ Ship the completed work.
 ## Process
 
 1. **Derive the topic set** —
-   - **Umbrella** (a `docs/plans/**/overview.md` exists): read its roster; the set is every part's `<topic>`. The umbrella folder is disposed too.
+   - **Umbrella** (a `docs/plans/**/overview.md` exists — excluding docs/plans/completed/, so an archived umbrella is never the one being finalized): read its roster; the set is every part's `<topic>`. The umbrella folder is disposed too.
    - **Standalone**: progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. One topic.
 
    Ambiguous with several designs in flight? Ask.
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index d7a7290..4132e46 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -9,7 +9,7 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 
 ## Process
 
-1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md`, `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders) — this working tree only.
+1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md`, `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
 2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
 3. **Group by umbrella** — for each umbrella `overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
 4. Print a compact table, grouped under any umbrellas, e.g.:
diff --git a/tests/code-digest.test.ts b/tests/code-digest.test.ts
index dd70252..882364f 100644
--- a/tests/code-digest.test.ts
+++ b/tests/code-digest.test.ts
@@ -94,6 +94,34 @@ describe("code-digest per-slice", () => {
     expect(rules).toContain(CODE_DIGEST_MARKERS.honestEmptyGotchas);
     expect(rules).toContain(CODE_DIGEST_MARKERS.keyFilesCap);
   });
+  it("should exclude completed/ from every recursive discovery glob", () => {
+    const sites: Array<[string, string]> = [
+      ["skills/pwk-status/SKILL.md", "1. Glob `docs/plans/**/*-design.md`"],
+      ["skills/pwk-brainstorming/SKILL.md", "**Discovery**"],
+      ["skills/pwk-executing-tasks/SKILL.md", "**Find the plan**"],
+      ["skills/pwk-finalizing/SKILL.md", "Read **every** relevant progress file"],
+      ["skills/pwk-finalizing/SKILL.md", "**Umbrella** (a `docs/plans/**/overview.md` exists"],
+    ];
+    for (const [file, anchor] of sites) {
+      const content = readRepo(file);
+      const at = content.indexOf(anchor);
+      expect(at, file).toBeGreaterThan(-1);
+      expect(content.slice(at, at + 400), file).toContain(CODE_DIGEST_MARKERS.completedExclusion);
+    }
+    // the post-review routing block states the exclusion too
+    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
+    const routingAt = executing.indexOf("## After the feature review");
+    expect(routingAt).toBeGreaterThan(-1);
+    const routing = executing.slice(routingAt, executing.indexOf("Present:", routingAt));
+    expect(routing).toContain(CODE_DIGEST_MARKERS.completedExclusion);
+  });
+
+  it("should leave finalize disposal commands unchanged", () => {
+    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
+    for (const line of FINALIZE_DISPOSAL_LINES) {
+      expect(finalize).toContain(line);
+    }
+  });
 });
 
 describe("code-digest feature (E2E)", () => {
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 5d45672..4abb193 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -627,6 +627,51 @@ if (et) {
   }
 }
 
+// R5 — every recursive discovery glob excludes completed/ (archived work is not
+// in flight), while the finalize disposal commands stay byte-identical.
+const EXCLUSION_SITES = [
+  [status, "1. Glob `docs/plans/**/*-design.md`"],
+  [bs, "**Discovery**"],
+  [et, "**Find the plan**"],
+  [fin, "Read **every** relevant progress file"],
+  [fin, "**Umbrella** (a `docs/plans/**/overview.md` exists"],
+];
+for (const pair of EXCLUSION_SITES) {
+  const s = pair[0];
+  if (!s) continue;
+  const at = s.content.indexOf(pair[1]);
+  if (at === -1) {
+    fail(`${s.name}: discovery anchor not found for the completed/ exclusion`);
+    continue;
+  }
+  fgMark(
+    s.name,
+    s.content.slice(at, at + 400),
+    CODE_DIGEST_MARKERS.completedExclusion,
+    "discovery excludes completed/",
+  );
+}
+if (et) {
+  const routingAt = et.content.indexOf("## After the feature review");
+  if (routingAt !== -1) {
+    const routing = et.content.slice(routingAt, et.content.indexOf("Present:", routingAt));
+    fgMark("pwk-executing-tasks", routing, CODE_DIGEST_MARKERS.completedExclusion, "routing excludes completed/");
+  } else {
+    fail("pwk-executing-tasks: routing block not found");
+  }
+}
+if (fin) {
+  const DISPOSAL_ANCHORS = [
+    "rm -rf docs/plans/<date>-<umbrella>/",
+    "mv docs/plans/<date>-<umbrella>/ docs/plans/completed/",
+    "ls docs/plans/completed/<date>-<umbrella>/ >/dev/null",
+    "verbatim from the discovered",
+  ];
+  for (const anchor of DISPOSAL_ANCHORS) {
+    fgMark("pwk-finalizing", fin.content, anchor, "disposal command unchanged");
+  }
+}
+
 // --- Summary ---
 console.log("");
 if (failures === 0) {
