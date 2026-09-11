# Review packet: workflow-consistency — per-requirement review (R2)

## Commits
9380ad3 feat(R2): terminal-state ship gate, reachable failure branches (F1, F13)

## Changed files
 .../2026-09-11-workflow-consistency-progress.md    |  6 ++---
 skills/pwk-executing-tasks/SKILL.md                | 13 ++++++-----
 skills/pwk-status/SKILL.md                         |  2 +-
 tests/markers.mjs                                  |  4 ++--
 tests/workflow-consistency.test.ts                 | 26 ++++++++++++++++++++++
 5 files changed, 39 insertions(+), 12 deletions(-)

## Acceptance criteria (verbatim from the design doc)
### R2: Terminal-state ship gate and reachable failure branches

**Defect:** F1 (P0) + F13. The ship gate (`pwk-executing-tasks:120`) requires every Done cell `✅`, but the failure path (`:231`) and the skip override (`:195`) mark rows `❌`/`⏭` — so a feature with any failed/skipped requirement can never reach `Feature phase: done`, making pwk-finalizing's `--force-failed` and `⏭`-warn branches dead code. The resume rule (`:80`) treats every non-`✅` row as "next", so a resume routes back into an already-failed requirement. `pwk-status` has no rendering for a completed-but-failed feature.

**Change** (all in `skills/pwk-executing-tasks/SKILL.md` unless noted):

- Ship gate: *"every requirement's Done cell is terminal — `✅`, `❌` (with reason), or `⏭` (with reason)"*.
- Failure path and skip override: name their glyphs explicitly and mandate appending a short reason to the row (suffix on the Requirement cell).
- Ship digest: **must list every `❌`/`⏭` row with its reason** — the stop stays fully informed; the phase is set to `done` only after the human approves knowing what failed.
- Resume rule: only `⬜`/`🔄`/blank route the next requirement; `✅`/`❌`/`⏭` are resolved and are skipped past.
- `pwk-status` (`skills/pwk-status/SKILL.md`): the `done` mapping renders counts (e.g. `done (1 ❌ · 1 ⏭)`) via bounded `grep -c` reads; when `❌` is present its ready-for-finalize hint appends that finalizing will require `--force-failed`.
- pwk-finalizing: **unchanged** — its branches become reachable as already written.
- Legacy `*-implementation.md` flow: explicitly stated unaffected (no Feature-phase gate in that flow).
- Umbrella: stated that finalizing reads every part's progress file and the `❌`-in-any-part block rule applies across parts unchanged.
- `docs/adr/0007-resolved-requirements-ship-gate.md`: written during execution, recording "done means resolved; finalizing is the failure authority" with the rejected `partial`-phase alternative.

#### Production-risk notes

This relaxes the gate the kit's users ship their own features through. If the ship digest fails to surface a failed row, incomplete work ships silently — that is the one place this batch can do real damage. The digest mandate must be pinned by tests, not left as prose goodwill.

#### Acceptance criteria

- **Given** the rewritten ship gate, **when** a design doc's requirements end `✅`/`❌(reason)`/`⏭(reason)`, **then** the executing skill reaches the ship checkpoint and the digest lists each failed/skipped row with its reason.
- **Given** human approval of that digest, **when** the phase is set, **then** it is `Feature phase: done` and pwk-finalizing's `❌` block (or `⏭` warn) fires without modification.
- **Given** a progress file with a `❌` row and `Feature phase: done`, **when** pwk-status renders the topic, **then** it shows `done` with the `❌` count and the `--force-failed` hint.
- **Given** a resume over rows `✅`/`❌`/`⬜`, **when** the resume rule picks the next requirement, **then** it picks the `⬜` row, not the `❌` row.
- **Given** the suite, **when** `npm run check` runs, **then** the phase-value pins (`tests/pwk-status.test.ts`, `tests/human-review-digests.test.ts`) and markers move with the new wording and pass.

### Checkpoints
- none

### Review
- parallel


## Diff
diff --git a/docs/plans/2026-09-11-workflow-consistency-progress.md b/docs/plans/2026-09-11-workflow-consistency-progress.md
index 18ab66e..570e938 100644
--- a/docs/plans/2026-09-11-workflow-consistency-progress.md
+++ b/docs/plans/2026-09-11-workflow-consistency-progress.md
@@ -4,12 +4,12 @@ Design: docs/plans/2026-09-11-workflow-consistency-design.md
 Branch: workflow-consistency
 Started: 2026-09-11T07:16:58Z
 Last updated: 2026-09-11T07:16:58Z
-Feature phase: implementing (0/9)
+Feature phase: implementing (1/9)
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
-| 1 | 🔄 | One row-state and ceremony vocabulary | — | — |
+| 1 | ✅ | One row-state and ceremony vocabulary | — | 3f27184 |
 | 2 | ⬜ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | — |
 | 3 | ⬜ | Setup checkpoint made implementable | — | — |
 | 4 | ⬜ | Derived At-a-glance Risk column | — | — |
@@ -22,7 +22,7 @@ Feature phase: implementing (0/9)
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? |
 |----|-------------|------------------|-----------|
-| 1 | One row-state and ceremony vocabulary | | |
+| 1 | One row-state and ceremony vocabulary | Canonical vocabulary block in pwk-executing-tasks's Progress-file section (5 Done glyphs + ceremony echo values, terminal=resolved rule, reason suffix); code-review's phantom 🔎 review value replaced with the canonical ✅ flip. | |
 | 2 | Terminal-state ship gate and reachable failure branches | | |
 | 3 | Setup checkpoint made implementable | | |
 | 4 | Derived At-a-glance Risk column | | |
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index bb99e2b..7f1f2bc 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -77,10 +77,10 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 
 ## Resume
 
-Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not `✅` routes the next requirement — `⬜`, `🔄`, and blank all mean not-done), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
+Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not terminal routes the next requirement — `⬜`, `🔄`, and blank all mean not-done; `✅`/`❌`/`⏭` are resolved and are skipped past), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
 - `e2e-written` → write the E2E if not yet present, post the notice, and continue into the implement phase (no stop).
 - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → post the notice and continue into the implement phase.
-- `implementing (k/N)` → continue the next not-yet-✅ requirement.
+- `implementing (k/N)` → continue the next not-yet-terminal requirement.
 - `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
 - `ship-paused` → re-present the ship checkpoint and wait.
 - legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.
@@ -122,7 +122,7 @@ When a per-requirement checkpoint fires it is a **hard stop**:
 
 ## Ship checkpoint (feature-complete + review, merged)
 
-When every requirement's Done column is ✅:
+When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):
 
 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
 2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
@@ -133,6 +133,7 @@ When every requirement's Done column is ✅:
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green;
    - the **execution summary** — what each requirement became, deviations included;
+   - the **verdict rows** — list every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
    - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
    - the **coverage table** from the spec-reviewer report (one verdict row per R#);
    - findings status: fixed / open for the human;
@@ -183,7 +184,7 @@ PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # besid
 - **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
 - **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
 
-On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`.
+On success, continue assembling the ship checkpoint; once the human approves it — knowing what failed — set `Feature phase: done`. (An umbrella part's gate is its own progress file; `pwk-finalizing` reads every part's file, and a `❌` in any part blocks the umbrella until the human sends the work back or explicitly types `--force-failed`.)
 
 ## Tags reference
 
@@ -197,7 +198,7 @@ The design doc tags each requirement and the feature level:
 
 | User says | Agent does |
 |-----------|-----------|
-| `skip` | Mark current requirement skipped, move to next |
+| `skip` | Set its Done cell `⏭` (with the reason), move to next |
 | `status` | Show the progress file (feature phase + requirement table) |
 | `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
 | `retry` | Re-read the requirement, start over |
@@ -233,4 +234,4 @@ Feature phase: done
 1. Re-read the requirement's acceptance criteria — you may have drifted.
 2. Check `git log` for context. Ask the user — clarify beats guessing.
 3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
-4. Mark the requirement failed with the reason and move on. Check `docs/lessons.md` — a prior lesson may apply.
+4. Set its Done cell `❌` (with the reason as a suffix in the Requirement cell) and move on. Check `docs/lessons.md` — a prior lesson may apply. (A legacy `*-implementation.md` feature has no Feature-phase gate; its failure handling is unchanged.)
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index 87e4147..10395f3 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -12,7 +12,7 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; if they differ, report both paths and stop — tell the user to restart the session at the repo root; never `cd` (a worktree root counts).
 1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, one list per suffix: `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived topics are not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
 2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. Map the line to the displayed state:
-   - `done` → **`done`** — terminal, never shown as in-flight; append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`); at `done` every row is complete
+   - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when `grep -c '❌'` or `grep -c '⏭'` finds any (one bounded read each), render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
    - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state)
    - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
diff --git a/tests/markers.mjs b/tests/markers.mjs
index e383f75..3d01a04 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -130,8 +130,8 @@ export const WORKFLOW_CONSISTENCY_MARKERS = {
   // R2 — terminal-state ship gate; finalizing stays the failure authority.
   shipGateTerminal: "every requirement's Done cell is terminal",
   digestListsVerdicts: "list every `❌`/`⏭` row with its reason",
-  failedGlyphNamed: "set its Done cell `❌`",
-  skippedGlyphNamed: "set its Done cell `⏭`",
+  failedGlyphNamed: "Set its Done cell `❌`",
+  skippedGlyphNamed: "Set its Done cell `⏭`",
   resumeSkipsTerminal: "`✅`/`❌`/`⏭` are resolved",
   knowingWhatFailed: "knowing what failed",
   statusDoneCounts: "done (1 ❌ · 1 ⏭)",
diff --git a/tests/workflow-consistency.test.ts b/tests/workflow-consistency.test.ts
index 1c51f62..6088e96 100644
--- a/tests/workflow-consistency.test.ts
+++ b/tests/workflow-consistency.test.ts
@@ -35,4 +35,30 @@ describe("workflow-consistency per-slice", () => {
       expect(codeReview).toContain("set the requirement's Done cell `✅`");
     });
   });
+
+  describe("R2 — terminal-state ship gate and reachable failure branches", () => {
+    it("the ship gate, failure/skip paths, and resume all speak the terminal vocabulary", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.shipGateTerminal);
+      expect(executing).toContain(M.failedGlyphNamed);
+      expect(executing).toContain(M.skippedGlyphNamed);
+      expect(executing).toContain(M.digestListsVerdicts);
+      expect(executing).toContain(M.knowingWhatFailed);
+      expect(executing).toContain(M.resumeSkipsTerminal);
+      expect(executing).not.toMatch(/continue the next not-yet-✅ requirement/);
+    });
+
+    it("status renders done with verdict counts and hints the force-failed path", () => {
+      const status = read("skills/pwk-status/SKILL.md");
+      expect(status).toContain(M.statusDoneCounts);
+      expect(status).toContain(M.statusForceFailedHint);
+    });
+
+    it("finalizing's consuming branches are untouched — the reachability fix is on the writing side", () => {
+      const finalizing = read("skills/pwk-finalizing/SKILL.md");
+      expect(finalizing).toContain("`❌ failed`");
+      expect(finalizing).toContain("`⏭ skipped`");
+      expect(finalizing).toContain("--force-failed");
+    });
+  });
 });
