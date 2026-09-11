# Review packet: leaner-execution-gates — per-requirement review (R4)

## Commits (this requirement only)
e0ce069 feat(gates): drop the spec checkpoint value (R4)

## Changed files
 CHANGELOG.md                        | 15 ++++++++++
 docs/developer-usage-guide.md       |  2 +-
 docs/workflow-phases.md             |  2 +-
 package.json                        |  2 +-
 skills/pwk-brainstorming/SKILL.md   |  6 ++--
 skills/pwk-executing-tasks/SKILL.md |  6 ++--
 tests/lean-gates.e2e.test.ts        | 11 +++++--
 tests/single-doc.test.ts            |  5 ++--
 tests/skill-lint.mjs                | 59 +++++++++++++++++++------------------
 9 files changed, 66 insertions(+), 42 deletions(-)

## Acceptance criteria (verbatim from the design doc)
### R4: `spec` removed from the Checkpoints enum

Per-requirement checkpoints accept `none | full` only; the paired "`spec` requires at least `inline` review" rule goes with it.

**Acceptance criteria**

- Given `skills/pwk-brainstorming/SKILL.md`, `skills/pwk-executing-tasks/SKILL.md`, `docs/workflow-phases.md`, and `docs/developer-usage-guide.md`, When the lint suite runs, Then no `### Checkpoints` enumeration in any of them lists `spec`, and the lint vocabulary constant contains no `spec` value.
- Given the lint suite, When it runs, Then no file asserts the retired rule that `spec` requires at least `inline` review, and the two files that previously documented it no longer do.
- Given a design doc with no `### Checkpoints` tag, When executing-tasks parses it, Then the effective value is `none` and no per-requirement stop fires (default preserved).
- Given a design doc tagged `### Checkpoints: full`, When executing-tasks parses it, Then the tests stop and the complete stop both still fire (the surviving value is intact).
- Given an in-flight design doc whose requirement still carries the legacy `### Checkpoints: spec`, When executing-tasks parses it, Then it treats the unrecognized value as `none` and proceeds without a stop rather than failing (edge case: the migration path is defined, not accidental).
- Given the `CHANGELOG.md` entry for this change, Then it states the legacy `spec` → `none` mapping in its migration note.

### Checkpoints: none
### Review: inline


## Diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 929e8e6..81c5f00 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -4,6 +4,21 @@ All notable changes to this project will be documented in this file.
 
 The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
+## [2.2.0] - 2026-09-11
+
+### Changed
+
+- **Per-requirement review auto-tag removed** — `pwk-brainstorming` no longer tags a requirement `### Review: parallel` merely because it carries `### Production-risk notes`. `### Review` defaults to `skip` everywhere and **only the human tags** a slice; the feature review already covers the whole diff, including risk requirements. The removed rule was the source of reviewer-role multiplication: a part with four risk-tagged requirements paid four roles per requirement *plus* four at the ship checkpoint.
+- **One risk-scaled feature review** — the feature-level tag becomes `### Feature review: auto | parallel | inline` (default `auto`). `auto` resolves on the design's own production-risk content: `parallel` (four fresh-context roles) when the design has a non-empty `## Production-risk areas` section or any requirement has non-empty `### Production-risk notes`, `inline` (one `pwk-code-review` pass) otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`.
+- **Feature-spec checkpoint becomes a notice** — the feature-acceptance E2E is still written first (red) and is still the primary enforced gate at the ship checkpoint, but it is now *reported* with its failing output instead of pausing execution: its text was already approved as `## Feature acceptance` during brainstorm. Mandatory human stops per feature drop to one (ship). `pwk-status` renders `e2e-written` as `execute 0/N` and the `feature-spec` display state is retired.
+- **`spec` removed from the per-requirement Checkpoints enum** — `### Checkpoints` accepts `none | full` (default `none`). The retired value was a stop on acceptance criteria the human had already approved at design time; the paired "`spec` requires at least `inline` review" rule went with it.
+
+### Migration
+
+- In-flight design docs tagged with the retired `spec` checkpoint value resolve to `none` — no stop, no error.
+- Legacy progress files at `Feature phase: feature-spec-paused` resume into the implement phase and render as `execute 0/N` in `pwk-status`.
+- A missing `### Feature review` tag now means `auto` (risk-scaled), not unconditional `parallel`; a design that wants the previous always-four-roles behavior writes `### Feature review: parallel`.
+
 ## [2.1.2] - 2026-09-10
 
 ### Changed
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index 00af0a4..3574265 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -125,5 +125,5 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
 - Start with brainstorming for anything non-trivial.
 - The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
 - The feature-gate flow has **one** mandatory checkpoint (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
-- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
+- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`, default `none` — the acceptance criteria were approved at design time, so there is no per-requirement correctness stop) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The risk-scaled feature-level `### Feature review` covers the whole diff. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
 - Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index d4862e9..be38817 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -40,7 +40,7 @@ No write restrictions. All tools available.
 
 The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:
 
-- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
+- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. There is no per-requirement correctness stop, because those criteria were approved at design time.
 - **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
 - **Feature review** — `parallel` (four reviewers over the whole feature diff, **default**) | `inline` (one pass, small features). Always on. The review scope is a script-assembled review packet (diff + criteria verbatim), so reviewers never re-derive scope; smell/hazard reviewers run on the fast tier set via `/pwk-setup --fast-model` (advisory hint).
 
diff --git a/package.json b/package.json
index fe8cdea..9949ce0 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@tianhai/pi-workflow-kit",
-  "version": "2.1.2",
+  "version": "2.2.0",
   "description": "Enforce structured design→execute→finalize workflow with TDD discipline in AI coding agents",
   "keywords": [
     "pi-package",
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 48751e8..c477306 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -77,7 +77,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    - Given … When … Then …
    - Given … When … Then … (edge case)
 
-   ### Checkpoints: none | full | spec
+   ### Checkpoints: none | full
    ### Review: skip | parallel | inline
 
    ### Production-risk notes
@@ -90,9 +90,9 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    Block rules:
 
    - **No test-name lists.** The criteria are the test spec — the executor writes and names the actual tests red-green from them, so the doc contains no test-name lists and no R#-to-section mapping tables: the block structure is the map.
-   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops; `spec` = tests stop only) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` or `spec` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
+   - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
    - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area is flagged in the At-a-glance risk column and carries its `### Production-risk notes`, but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
-   - **`spec` requires at least `inline` review** — dropping the complete stop is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+   - **No per-requirement spec stop, by design** — the acceptance criteria are approved right here, at design time; re-checking them mid-execution asks a question the human already answered. A legacy `spec` tag in an in-flight design doc resolves to `none`.
    - **Production-risk notes** — a requirement touching a production-risk area carries its notes inside the block. Risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
    - **Ordering** — dependencies come earlier in the list; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 7939dc9..7b847fa 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -82,7 +82,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 
 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
 2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
-3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
+3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full`, stop and present after the tests and again after the slice is complete. With the default `none`, show the red→green inline and proceed.
 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
 6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
@@ -91,7 +91,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 
 If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
 
-`Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+With the default `none`, no per-requirement stop fires — the per-requirement test still runs red→green, and the feature review covers implementation quality. A legacy `spec` value in an in-flight design doc resolves to `none` — no stop, no error.
 
 ### Checkpoint gates are mandatory (when the tag says so)
 
@@ -167,7 +167,7 @@ On success, continue assembling the ship checkpoint; once the human approves it,
 
 The design doc tags each requirement and the feature level:
 
-- **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
+- **`### Checkpoints: none | full`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete.
 - **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. Nothing is tagged silently: **only the human tags** a slice, and the feature review below covers everything else.
 - **`### Feature review: auto | parallel | inline`** — the one whole-feature review (always present). Default `auto`: `parallel` when the design carries production-risk content, `inline` when it does not. An explicit `parallel` or `inline` is used as written and always wins over `auto`. Never once per requirement — the review covers the whole feature diff.
 
diff --git a/tests/lean-gates.e2e.test.ts b/tests/lean-gates.e2e.test.ts
index 764174e..9acd0c6 100644
--- a/tests/lean-gates.e2e.test.ts
+++ b/tests/lean-gates.e2e.test.ts
@@ -46,7 +46,8 @@ describe("leaner execution gates (feature E2E)", () => {
     expect(status).not.toMatch(/feature-spec-paused`\s*→\s*`feature-spec/);
     expect(status).not.toMatch(/→\s*`feature-spec`/);
 
-    // R4 — the checkpoint enum is none | full across every consumer site.
+    // R4 — the checkpoint enum is none | full across every consumer site, and the
+    // retired `spec` value is gone from the enumerations and the paired rule.
     expect(brainstorming).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
     expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
     for (const rel of [
@@ -54,9 +55,13 @@ describe("leaner execution gates (feature E2E)", () => {
       "skills/pwk-executing-tasks/SKILL.md",
       "docs/workflow-phases.md",
       "docs/developer-usage-guide.md",
+      "README.md",
     ]) {
-      expect(read(rel)).not.toMatch(/Checkpoints:.*\bspec\b/);
-      expect(read(rel)).not.toMatch(/requires at least `inline`/);
+      const specLines = read(rel)
+        .split("\n")
+        .filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
+      expect(specLines, `${rel} still enumerates \`spec\``).toEqual([]);
+      expect(read(rel), rel).not.toMatch(/requires at least `inline`/);
     }
 
     // R5 — the digest's Flow is a navigable map: spine + branches + was: clause +
diff --git a/tests/single-doc.test.ts b/tests/single-doc.test.ts
index 0629998..94ac38b 100644
--- a/tests/single-doc.test.ts
+++ b/tests/single-doc.test.ts
@@ -18,8 +18,9 @@ describe("single-doc: merged design doc (R1)", () => {
     // leaner-execution-gates R1: nothing is tagged silently — the human owns the tag.
     expect(bs).toMatch(/only the human tags/i);
     expect(bs).not.toMatch(/auto-tag/i);
-    // spec+skip incompatibility travels with the tags
-    expect(bs).toMatch(/`spec` requires at least `inline`/);
+    // leaner-execution-gates R4: the `spec` checkpoint value and its paired rule are gone.
+    expect(bs).toMatch(/### Checkpoints: none \| full/);
+    expect(bs).not.toMatch(/requires at least `inline`/);
   });
 
   it("should never emit a crosswalk or per-requirement test-name list", () => {
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index b286165..12d8d47 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -64,7 +64,7 @@ for (const skill of loadSkills()) {
 
 // --- Check 2: tag vocabulary consistency across the pipeline ---
 // The canonical vocabularies, defined in pwk-brainstorming and consumed by pwk-executing-tasks.
-const CHECKPOINT_VOCAB = ["full", "spec", "none"];
+const CHECKPOINT_VOCAB = ["none", "full"];
 const REVIEW_VOCAB = ["parallel", "inline", "skip"];
 // leaner-execution-gates R2: the feature-level review gained a risk-scaled `auto`.
 const FEATURE_REVIEW_VOCAB = ["auto", "parallel", "inline"];
@@ -143,33 +143,36 @@ if (bs && et) {
   }
 }
 
-// --- Check 4: spec+skip incompatibility documented wherever tags are enumerated ---
-console.log("spec+skip guard:");
-const docsToCheck = [join(root, "docs/workflow-phases.md"), join(root, "docs/developer-usage-guide.md")];
-for (const f of docsToCheck) {
-  let content;
-  try {
-    content = readFileSync(f, "utf8");
-  } catch {
-    fail(`${f}: not found`);
-    continue;
-  }
-  // Must mention spec and the inline-requirement constraint somewhere.
-  const hasSpec = /\bspec\b/.test(content);
-  const hasGuard = /spec.*inline|inline.*spec/i.test(content) || /requires at least `inline`/.test(content);
-  if (hasSpec && hasGuard) ok(`${f.split("/").pop()}: documents spec requires inline review`);
-  else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
-}
-// And in the skills themselves
-if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
-  ok("pwk-brainstorming: documents spec requires inline review");
-} else if (bs) {
-  fail("pwk-brainstorming: missing spec+inline guard note");
-}
-if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
-  ok("pwk-executing-tasks: documents spec requires inline review");
-} else if (et) {
-  fail("pwk-executing-tasks: missing spec+inline guard note");
+// --- Check 4: the `spec` checkpoint value is gone (leaner-execution-gates R4) ---
+// It was a stop on acceptance criteria the human already approved during brainstorm, so
+// the enum is `none | full` and the paired "spec requires inline review" rule went with it.
+// A legacy in-flight `spec` resolves to `none` rather than erroring.
+console.log("spec checkpoint removed:");
+const specSites = [
+  ["docs/workflow-phases.md", readFileSync(join(root, "docs/workflow-phases.md"), "utf8")],
+  ["docs/developer-usage-guide.md", readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8")],
+  ["pwk-brainstorming", bs?.content ?? ""],
+  ["pwk-executing-tasks", et?.content ?? ""],
+];
+let specFree = true;
+for (const [name, content] of specSites) {
+  const specLines = content.split("\n").filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
+  if (specLines.length > 0) {
+    fail(`${name}: Checkpoints enum still lists \`spec\`: "${specLines[0].trim()}"`);
+    specFree = false;
+  }
+  if (/requires at least `inline`/.test(content)) {
+    fail(`${name}: the retired \`spec\` ⇒ inline rule must be gone`);
+    specFree = false;
+  }
+}
+if (specFree) ok("`spec` checkpoint value removed from every site (enum + paired rule)");
+// The legacy value migrates instead of erroring.
+const legacySpecLine = (et?.content ?? "").split("\n").find((l) => /legacy/i.test(l) && /`spec`/.test(l)) ?? "";
+if (legacySpecLine && /`none`/.test(legacySpecLine)) {
+  ok("pwk-executing-tasks: legacy `spec` resolves to `none` (migration documented)");
+} else {
+  fail("pwk-executing-tasks: must document the legacy `spec` → `none` migration on one line");
 }
 
 // --- Check 5: Feature acceptance contract across the pipeline ---
