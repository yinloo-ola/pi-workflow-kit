# Review packet: 2026-09-18-digest-rendering — feature review

Base: e5155257bc1ded11db72ef880cfd7d1187e41f43
Head: c4b7b283be6ca7d62946802f3edd61490fa6def9

## Commits

c4b7b28 review: centralize bareContentLines helper, pin branch-item adjacency template
62bd0f9 style: biome formatting for new fgMark lines
ced1d8d docs: sample progress doc rendered in bullet-form digest (visual verification)
a50dea7 chore: release 2.6.0 — digest sections render as markdown lists
d71ef9c feat(walkthrough): Key flows render one flow per bullet line
c8a3dd7 test: align fill-rule span window with vitest (700->900) after paragraph grew
0f030ea feat(digest): Gotchas and Key files prescribe one bullet per item
293cefc feat(digest): Flow template renders as labeled markdown bullets

## Changed files

 CHANGELOG.md                                       |  6 +++
 .../2026-09-18-digest-rendering/sample-progress.md | 53 ++++++++++++++++++++++
 package.json                                       |  2 +-
 .../references/progress-format.md                  | 18 ++++----
 skills/pwk-walkthrough/SKILL.md                    |  2 +-
 tests/code-digest.test.ts                          | 15 +++---
 tests/digest-rendering.test.ts                     | 13 +-----
 tests/markers.mjs                                  | 13 ++++++
 tests/skill-lint.mjs                               | 37 ++++++++++++---
 9 files changed, 122 insertions(+), 37 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R1: Flow template renders as structured markdown

The `### Flow` template block and Flow-shape fill rules in `skills/pwk-executing-tasks/references/progress-format.md` prescribe list-form lines only, so any CommonMark renderer shows each label and hop chain on its own line.

**Acceptance criteria**

- Given the current template (bare `Spine`/`Branches`/`Side effects` lines with 2-space indented chains, which merge into one paragraph when rendered), When the template is rewritten per the Components section below, Then every content line it prescribes inside `### Flow` is a list item: `- **Spine** — <chain>`, `- **Branches**`, indented `  - <condition> -> <outcome>` branch items including the `was:` clause item, and `- **Side effects** — reads: <what> · writes: <what>`.
- Given a generated digest, When `[R<n>]` tags are written, Then each sits adjacent to the hop or branch it belongs to — no wide-gap alignment anywhere in the section, since alignment collapses to a single space in rendering.
- Given the existing pinned claims (`Spine`, `Branches`, `was:`, `Side effects`, `[R<n>]`, `15 lines`, `no line numbers`, `/skill:pwk-walkthrough`, `A -> B -> C`, symbol/module hop labels, honest-optional `was:`/side-effects rules), When the layout change lands, Then every claim still appears in the Flow shape span — the rewrite changes form, never content rules.

### Checkpoints: none
### Review: skip

### R2: Gotchas and Key files prescribe bullets

The `### Gotchas` and `### Key files` parts of the same template block, and their fill-rule sentences, prescribe one bullet per item so they render as lists rather than merged paragraphs.

**Acceptance criteria**

- Given the template currently shows both headings bare (and Key files' "one line each" written as bare lines collapses in preview), When rewritten, Then `### Gotchas` shows `- <one real risk per bullet>` and `### Key files` shows `- `<file>` — <what shifted inside it>`, and the Key files fill rule states the bullet form while keeping the `at 5` cap and "one line each" meaning.
- Given a digest with no findings, When Gotchas is filled, Then `none beyond review findings` is written as a single bullet — the honest-empty rule and its marker survive the form change.

### Checkpoints: none
### Review: skip

### R3: Walkthrough Key flows gets the same line form

The `## Key flows` line in `skills/pwk-walkthrough/SKILL.md`'s template prescribes one flow per bullet line, matching the digest Flow.

**Acceptance criteria**

- Given the current line reads "Execution/data movement as arrow chains (A -> B -> C), anchored per step" with no line form (bare-line flows merge in preview), When updated, Then it prescribes one flow per bullet line in addition to the existing arrow-chain and anchor rules.
- Given skill-lint pins the five-section template marker `Summary / How it works / Key flows / Gotchas & invariants / Change map`, When the line is edited, Then that marker string still passes — the edit touches the Key flows description, not the section roster.

### Checkpoints: none
### Review: skip

### R4: Claims pinned test-first with an independent property check

The new template claims are asserted by markers/skill-lint/vitest before the skill markdown edits (red), then satisfied (green); the Flow pin is paired with a renderer-independent property check so a future bare-line regression fails even if the verbatim pin is refreshed.

**Acceptance criteria**

- Given the repo's test-first lesson for skill/doc content, When the changes land, Then new markers (bullet-form Flow, Gotchas bullet, Key files bullet, walkthrough one-flow-per-bullet — exact strings chosen at execute time) are added to `tests/markers.mjs` and asserted from `tests/skill-lint.mjs` and `tests/code-digest.test.ts`, with the assertions committed or staged before the corresponding skill-markdown edits.
- Given the lesson that a verbatim pin is a transcription, not a contract, When the Flow template is pinned, Then an independent property check accompanies it: inside the Flow span of the `progress-format.md` template block, every content line is a list item, heading, or fence — a line that is bare prose fails the check.
- Given the release, When the work ships, Then `CHANGELOG.md` gains the version entry describing the rendering change and `package.json` bumps to 2.6.0; the human's installed copies (`~/.pi/agent/skills/pwk-*`, `~/.agents/skills/pwk-*`) are re-synced by hand — the kit changes nothing automatically.

### Checkpoints: none
### Review: skip

### R5: Sample progress doc for visual preview

A realistic, filled sample progress file in this topic folder lets the human confirm the rendering fix in their own markdown preview at the ship checkpoint.

**Acceptance criteria**

- Given the updated templates, When execution reaches the ship checkpoint, Then `docs/plans/2026-09-18-digest-rendering/sample-progress.md` exists, containing a filled `## Code digest` (Summary, Flow, Gotchas, Key files) written in the new bullet form using the real up_adventure milestone-gift content: Spine `CrossedMilestoneTiers` -> `claimAndSend` -> `UnlockOrExtendPrivilegeGift` -> `notifyMilestoneTier` chain, the fixed-gift and missing-city branches with the `was:` clause, and the reads/writes side effects.
- Given finalize runs for this topic, When the topic folder is disposed, Then the sample file is disposed with it — no sample ships in the repo or the npm package.

### Checkpoints: none
### Review: skip

## Approaches considered

**Rendering construct for the Flow** — four candidates. (1) Bullet list with bold labels and nested branch bullets: chosen — renders correctly in every CommonMark renderer, chains wrap with hanging indent, inline code keeps styling, all pinned claim words survive verbatim. (2) Fenced `text` block: preserves exact indentation but is monochrome (inline code unstyled), long arrow chains horizontal-scroll instead of wrapping, and `[R1]` tags lose all emphasis — rejected. (3) Bold-label paragraphs separated by blank lines: renders, but roughly doubles the source line count against the ~15-line Flow cap and loses the visual grouping of branches under their label — rejected. (4) Table per subsection: arrow chains don't fit cells and hand-editing tables is hostile — rejected.

**Scope — Flow only vs all structured digest sections** — Key files carries the identical collapse defect ("one line each" as bare lines) and Gotchas prescribes no form, both in the same template block in the same file: fixing Flow alone would leave the digest half-broken in preview. Walkthrough Key flows was initially deferred (no demonstrated defect — its template never prescribed bare labels), and the human pulled it into scope (Q3): one clause, same visual problem in the sibling doc the Flow links to when it outgrows its cap. Chose: all three, one pass.

**Pin strategy** — verbatim markers alone (the existing style) vs markers plus a structural property check. The lessons file records a shipped defect where verbatim pins held green over wrong text; the no-bare-line property is renderer-independent (lazy continuation is a CommonMark rule, not a renderer quirk) and survives marker rewording. Chose: both.

**Where the sample lives** — a permanent sample under `docs/` vs an ephemeral file in the topic folder. Permanent samples rot and become a second artifact to keep fresh; the package would ship it for no consumer. The topic folder is already the unit of disposal. Chose: ephemeral.

## Components

**`skills/pwk-executing-tasks/references/progress-format.md`** — the digest fragment of the template block becomes (indentation relative to the existing fence preserved):

```markdown
### Summary
### Flow
- **Spine** — `<entry point> -> [R1] <step> -> [R2] <step> -> <outcome>`
- **Branches**
  - `<condition> -> <outcome>` [R2]
  - `<changed behavior> — was: <previous behavior>`
- **Side effects** — reads: `<what>` · writes: `<what>`
### Gotchas
- <one real risk per bullet>
### Key files
- `<file>` — <what shifted inside it>
```

Fill-rule prose edits, each preserving its pinned phrases: `### Flow` "uses `A -> B -> C` arrow chains" gains "one spine or branch per bullet line, so every renderer shows each hop chain on its own line"; the Flow-shape `Side effects` bullet's "a line naming" becomes "a bullet naming"; Key files' "one line each" becomes "one bullet each" (cap `at 5` unchanged); Gotchas gains "one bullet each". The Flow-shape bullets' content rules (symbol/module labels, `[R<n>]` tagging, inline worked values, honest-optional `was:`/side effects, ~15-line cap, walkthrough offer) are untouched.

**`skills/pwk-walkthrough/SKILL.md`** — the Key flows template line becomes "Execution/data movement as arrow chains (A -> B -> C), anchored per step, one flow per bullet line."

**`tests/markers.mjs`** — additions near the existing LEAN_GATES/SINGLE_DOC markers; exact strings fixed by the template text above (e.g. `- **Spine**`, one-bullet-each phrases, one-flow-per-bullet).

**`tests/skill-lint.mjs`** — fgMark assertions for the new markers inside the existing pwk-executing-tasks and pwk-walkthrough check blocks.

**`tests/code-digest.test.ts`** — extend the Flow-shape test with the bullet-form markers, and add the independent property check over the Flow span of the template block: every content line is a `- ` item, a `###` heading, a fence line, or blank.

**`CHANGELOG.md` / `package.json`** — version 2.6.0 entry (Changed: digest Flow/Gotchas/Key files render as markdown lists; walkthrough Key flows one-per-bullet).

**`docs/plans/2026-09-18-digest-rendering/sample-progress.md`** — written at the ship checkpoint, disposed with the topic.

## Error handling

The failure mode this change guards against is regression to bare-line templates: the property check in R4 fails skill-lint/vitest on any non-list content line in the Flow span, even after marker rewording. What must not break: the pinned claim words listed in R1/R2/R3 (each appears verbatim in the rewritten span), the digest skeleton order regex `### Summary … ### Flow … ### Gotchas … ### Key files` (order unchanged), and the `pwk-status`/finalize parsers (they read the `Feature phase:` header and disposal globs — the digest body is never machine-parsed). Per the lessons file, after each prose edit to `progress-format.md`, re-read the full surrounding sentence and run the wording assertions before committing.


## Feature acceptance (verbatim)

## Feature acceptance

- Given the shipped kit, When a later feature's executor writes a code digest per the updated `progress-format.md` and the human opens the progress file in any CommonMark preview, Then Spine, Branches, and Side effects render as labeled bullet groups with each arrow chain on its own wrapping line — never a merged run-on paragraph — and the full suite (vitest + skill-lint) is green, proving the template claims and the no-bare-line property hold.
- Given this feature's ship checkpoint, When `sample-progress.md` is opened in the same preview that showed the original run-on paragraph, Then the up_adventure flow renders as distinct labeled bullets with its branch chains and reads/writes each on their own line.


## Production-risk notes (verbatim, if any)


## Diff

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 43425df..cd08c1f 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -6,6 +6,12 @@ The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
 ## [Unreleased]
 
+## [2.6.0] - 2026-09-18
+
+### Changed
+
+- **Structured digest sections render as markdown lists.** The code digest's `### Flow` is now a bullet list — bold `Spine`/`Branches`/`Side effects` labels, one bullet per arrow-chain hop line, nested bullets per branch, `· `-separated reads/writes — instead of bare label lines with 2-space indents, which every CommonMark renderer collapses into one run-on paragraph (lazy continuation). `### Gotchas` and `### Key files` prescribe one bullet per item, and `pwk-walkthrough`'s Key flows prescribe one flow per bullet line. All Flow content rules (symbol-labelled hops, `[R#]` tags, `was:` clauses, honest-optional sections, ~15-line cap) are unchanged. The new template claims are pinned test-first, and an independent property check fails on any non-list content line in the Flow template span.
+
 ## [2.5.0] - 2026-09-17
 
 ### Changed
diff --git a/docs/plans/2026-09-18-digest-rendering/sample-progress.md b/docs/plans/2026-09-18-digest-rendering/sample-progress.md
new file mode 100644
index 0000000..5464a48
--- /dev/null
+++ b/docs/plans/2026-09-18-digest-rendering/sample-progress.md
@@ -0,0 +1,53 @@
+# Progress: up-adventure-milestone-gifts (sample)
+
+<!-- Ephemeral visual-verification artifact for the digest-rendering feature:
+     open this file in a markdown preview — the Flow below must render as
+     labeled bullets, not the run-on paragraph of the original. Disposed with
+     the topic folder at finalize. Content is the real up_adventure digest. -->
+
+Design: docs/plans/<date>-<topic>/up-adventure-design.md
+Branch: <branch>
+Setup: n/a
+Started: 2026-09-18T00:00:00+08:00
+Last updated: 2026-09-18T00:00:00+08:00
+Feature phase: done
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | Per-city milestone gift resolution | — | abc1234 |
+| 2 | ✅ | city_gift_ids config wiring | — | abc1234 |
+| 3 | ✅ | Displayed reward matches granted reward | — | abc1234 |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? |
+|----|-------------|------------------|-----------|
+| 1 | Per-city milestone gift resolution | `CrossedMilestoneTiers` now resolves the gift via `tier.RewardForCity(city.ID())`, so each city grants its own gift. | |
+| 2 | city_gift_ids config wiring | The resolved gift id comes from yaml's `city_gift_ids`; a gift_unlock tier with gift_id 0 missing a configured city fails config load at startup. | |
+| 3 | Displayed reward matches granted reward | `buildMilestoneProgress` resolves through the same `RewardForCity`, so the card shows what is actually granted. | |
+
+## Deviation records
+
+## Code digest
+
+### Summary
+
+Milestone tier rewards are now per-city: crossing a tier grants that city's own gift from `city_gift_ids` instead of the tier's fixed gift, and the milestone progress card resolves through the same path so display and grant can't drift. Config is validated at startup — a per-city tier missing its city entry fails load, not a later grant.
+
+### Flow
+
+- **Spine** — gift-send crosses tier 1's threshold -> [R1] `CrossedMilestoneTiers` resolves `tier.RewardForCity(city.ID())` -> `claimAndSend` grants that city's own gift via `UnlockOrExtendPrivilegeGift` -> `notifyMilestoneTier` resolves the same per-city reward for the crossing IM's text -> [R2]/[R3] the resolved gift id comes from yaml's `city_gift_ids` (prod: 7 real gifts; dev: one verified gift reused for every city)
+- **Branches**
+  - tier has a fixed non-zero gift_id (any tier 2-4, or a non-per-city gift_unlock tier like test.yaml's) -> `RewardForCity` returns `Reward()` unchanged — was: every tier already worked this way before R1
+  - gift_unlock tier with gift_id 0 and `city_gift_ids` missing an entry for a configured city -> config load fails at startup, not silently at grant time
+  - `TourMapInfo`'s milestone progress card -> `buildMilestoneProgress` also resolves via `RewardForCity(cityID)` [R1], so the displayed reward matches what gets granted
+- **Side effects** — reads: `config/up_adventure_2026*.yaml`'s `city_gift_ids` · writes: the shared privilege-gift Redis key (`UnlockOrExtendPrivilegeGift`), the reward-log claim rows
+
+### Gotchas
+
+- The dev config reuses one verified gift for every city — a cross-city drift in dev is config, not code
+- The privilege-gift Redis key is shared with the existing gift flow; claims are idempotent through the reward-log rows
+
+### Key files
+
+- `config/up_adventure_2026*.yaml` — `city_gift_ids` now carries the per-city gift mapping (7 real gifts in prod)
diff --git a/package.json b/package.json
index 7e0dd90..74fcc39 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@tianhai/pi-workflow-kit",
-  "version": "2.5.0",
+  "version": "2.6.0",
   "description": "Enforce structured design→execute→finalize workflow with TDD discipline in AI coding agents",
   "keywords": [
     "pi-package",
diff --git a/skills/pwk-executing-tasks/references/progress-format.md b/skills/pwk-executing-tasks/references/progress-format.md
index 65cf5b6..d0519ab 100644
--- a/skills/pwk-executing-tasks/references/progress-format.md
+++ b/skills/pwk-executing-tasks/references/progress-format.md
@@ -36,25 +36,25 @@ Read before creating or changing progress rows, or writing/re-presenting the cod
 
    ### Summary
    ### Flow
-   Spine
-     <entry point> -> [R1] <step> -> [R2] <step> -> <outcome>
-   Branches
-     <condition> -> <outcome>   [R2]
-     <changed behavior>   was: <previous behavior>
-   Side effects
-     reads: <what>   writes: <what>
+   - **Spine** — `<entry point> -> [R1] <step> -> [R2] <step> -> <outcome>`
+   - **Branches**
+     - `<condition> -> <outcome>` [R2]
+     - `<changed behavior> — was: <previous behavior>`
+   - **Side effects** — reads: `<what>` · writes: `<what>`
    ### Gotchas
+   - <one real risk per bullet>
    ### Key files
+   - `<file>` — <what shifted inside it>
    ```
 
-   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
+   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains, one spine or branch per bullet line, so every renderer shows each hop chain on its own line — bare label lines would merge into one run-on paragraph. `### Gotchas` lifts real risks from the review findings, one bullet each — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one bullet each: what shifted inside them.
 
    **Flow shape** — this is the ship stop's navigable map, so it is the one digest section that carries structure, not just prose:
 
    - **Spine** — the happy path as `A -> B -> C` hops, each hop named by symbol or module, with no line numbers anywhere and no file paths: symbol names survive edits and stay greppable, so a stale anchor can never mislead. Tag each hop `[R<n>]` with the requirement it comes from — that is what lets the coverage table's verdict rows be traced into the code without opening the diff.
    - **Branches** — every alternative and error path as `condition -> outcome` (a linear spine with no branches reads as "there are no edge cases", which is rarely true). Put ⚠️ on the genuinely surprising ones. Add a `was: <previous behavior>` clause for each requirement whose behavior changed; skip it for purely additive requirements — honest-empty, never invented.
    - **Inline worked values** — where a mapping is non-obvious, show it concretely (`` `implementing (2/5)` -> `execute 2/5` ``), so a reader can falsify it without running anything.
-   - **Side effects** — a line naming what is read and written, only when the feature performs I/O, network, or migrations; omit it entirely otherwise rather than filling a placeholder.
+   - **Side effects** — a bullet naming what is read and written, only when the feature performs I/O, network, or migrations; omit it entirely otherwise rather than filling a placeholder.
    - **Cap: roughly 15 lines.** If the change genuinely needs more, the ship checkpoint **offers `/skill:pwk-walkthrough`** as the deep read (it regenerates a `file:line`-anchored walkthrough on demand) instead of growing the digest — the digest is what the human reads at the one remaining stop, and an unbounded Flow recreates the digging it exists to prevent.
 
    `Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.
diff --git a/skills/pwk-walkthrough/SKILL.md b/skills/pwk-walkthrough/SKILL.md
index 2cd3954..f0a393e 100644
--- a/skills/pwk-walkthrough/SKILL.md
+++ b/skills/pwk-walkthrough/SKILL.md
@@ -37,7 +37,7 @@ Five sections, always: Summary / How it works / Key flows / Gotchas & invariants
    One subsection per component: responsibility + mechanism.
 
    ## Key flows
-   Execution/data movement as arrow chains (A -> B -> C), anchored per step.
+   Execution/data movement as arrow chains (A -> B -> C), anchored per step, one flow per bullet line.
 
    ## Gotchas & invariants
    Edge cases, implicit assumptions, ordering constraints.
diff --git a/tests/code-digest.test.ts b/tests/code-digest.test.ts
index 7d12192..fe5d905 100644
--- a/tests/code-digest.test.ts
+++ b/tests/code-digest.test.ts
@@ -2,7 +2,7 @@ import { readFileSync } from "node:fs";
 import { dirname, join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, it } from "vitest";
-import { CODE_DIGEST_MARKERS, DIGEST_RENDERING_MARKERS, LEAN_GATES_MARKERS } from "./markers.mjs";
+import { CODE_DIGEST_MARKERS, DIGEST_RENDERING_MARKERS, LEAN_GATES_MARKERS, bareContentLines } from "./markers.mjs";
 
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
@@ -315,13 +315,8 @@ describe("code-digest feature (E2E)", () => {
 
 // digest-rendering — a bare label line followed by 2-space-indented text is a lazy
 // continuation in CommonMark: the section collapses into one run-on paragraph in
-// every renderer. The structured digest sections must therefore be all list items.
-const bareContentLines = (span: string): string[] =>
-  span
-    .split("\n")
-    .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("```"))
-    .filter((line) => !/^\s*#{2,6}\s/.test(line))
-    .filter((line) => !/^\s*-\s/.test(line));
+// every renderer. The structured digest sections must therefore be all list items
+// (property helper shared from markers.mjs).
 
 describe("digest rendering (bullet-form templates)", () => {
   const progressFormat = readRepo("skills/pwk-executing-tasks/references/progress-format.md");
@@ -335,6 +330,10 @@ describe("digest rendering (bullet-form templates)", () => {
     expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletSpine);
     expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletBranches);
     expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletSideEffects);
+    // adjacency (design R1 criterion 2): [R#] sits on its hop/branch bullet, `was:` is its
+    // own bullet — no wide-gap alignment, which renders as a single space
+    expect(flow).toContain("- `<condition> -> <outcome>` [R2]");
+    expect(flow).toContain("- `<changed behavior> — was: <previous behavior>`");
     // Independent property, not a verbatim pin: every content line in the Flow span
     // is a list item — a bare line would merge into the previous paragraph.
     expect(bareContentLines(flow), "non-list content lines in the Flow template").toEqual([]);
diff --git a/tests/digest-rendering.test.ts b/tests/digest-rendering.test.ts
index 898d066..bc72aaf 100644
--- a/tests/digest-rendering.test.ts
+++ b/tests/digest-rendering.test.ts
@@ -2,7 +2,7 @@ import { existsSync, readFileSync } from "node:fs";
 import { dirname, join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, it } from "vitest";
-import { DIGEST_RENDERING_MARKERS } from "./markers.mjs";
+import { DIGEST_RENDERING_MARKERS, bareContentLines } from "./markers.mjs";
 
 // Feature acceptance (digest-rendering design doc):
 // 1. A digest written per the updated progress-format.md renders as labeled bullet
@@ -12,17 +12,6 @@ import { DIGEST_RENDERING_MARKERS } from "./markers.mjs";
 
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
-// CommonMark lazy continuation: a content line that is not a list item, heading,
-// or fence merges into the previous paragraph line. A structured digest section
-// made of such lines renders as one run-on blob — the defect this feature fixes.
-// This property is renderer-independent: no markdown parser needed.
-const bareContentLines = (span: string): string[] =>
-  span
-    .split("\n")
-    .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("```"))
-    .filter((line) => !/^\s*#{2,6}\s/.test(line))
-    .filter((line) => !/^\s*-\s/.test(line));
-
 describe("feature acceptance: digest rendering", () => {
   it("digest Flow template renders as labeled bullets in any CommonMark preview", () => {
     const progressFormat = readFileSync(
diff --git a/tests/markers.mjs b/tests/markers.mjs
index 4d68895..90db93f 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -201,3 +201,16 @@ export const DIGEST_RENDERING_MARKERS = {
   keyFilesBulletEach: "one bullet each",
   walkthroughFlowBullet: "one flow per bullet line",
 };
+
+/**
+ * Shared property helper (digest-rendering): a content line that is not a list item,
+ * heading, or fence is a lazy continuation in CommonMark — it merges into the previous
+ * paragraph, so a structured digest section made of such lines renders as one run-on
+ * blob. Renderer-independent: no markdown parser needed.
+ */
+export const bareContentLines = (span) =>
+  span
+    .split("\n")
+    .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("```"))
+    .filter((line) => !/^\s*#{2,6}\s/.test(line))
+    .filter((line) => !/^\s*-\s/.test(line));
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 6ef6458..2b23e57 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -380,8 +380,18 @@ if (et) {
 // lines with 2-space indents are lazy continuations and merge into one paragraph).
 console.log("digest rendering:");
 if (et) {
-  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_RENDERING_MARKERS.flowBulletSpine, "Flow Spine label is a bullet");
-  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_RENDERING_MARKERS.flowBulletBranches, "Flow Branches label is a bullet");
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    DIGEST_RENDERING_MARKERS.flowBulletSpine,
+    "Flow Spine label is a bullet",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    DIGEST_RENDERING_MARKERS.flowBulletBranches,
+    "Flow Branches label is a bullet",
+  );
   fgMark(
     "pwk-executing-tasks",
     et.contractContent,
@@ -394,8 +404,18 @@ if (et) {
     DIGEST_RENDERING_MARKERS.flowBulletLineRule,
     "fill rule states the bullet line form",
   );
-  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_RENDERING_MARKERS.gotchasBulletItem, "Gotchas: one real risk per bullet");
-  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_RENDERING_MARKERS.keyFilesBulletEach, "Key files: one bullet each");
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    DIGEST_RENDERING_MARKERS.gotchasBulletItem,
+    "Gotchas: one real risk per bullet",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    DIGEST_RENDERING_MARKERS.keyFilesBulletEach,
+    "Key files: one bullet each",
+  );
 }
 
 // --- Check 10: parallelize-workflow (R1 scout + R2 auto-tag + R3 cross-skill) ---
@@ -751,7 +771,7 @@ if (et) {
   if (rulesAt === -1) {
     fail("pwk-executing-tasks: digest fill-rules paragraph not found");
   } else {
-    const rules = et.contractContent.slice(rulesAt, rulesAt + 700);
+    const rules = et.contractContent.slice(rulesAt, rulesAt + 900);
     const ruleChecks = [
       [/plain language/i, "plain language"],
       [/R# anchors/, "R# anchors"],
@@ -934,7 +954,12 @@ if (existsSync(wtPath)) {
   if (wtFm?.name === "pwk-walkthrough") ok("walkthrough: frontmatter name matches");
   else fail("walkthrough: frontmatter name must be `pwk-walkthrough`");
   fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.walkthroughTemplate, "five-section template");
-  fgMark("pwk-walkthrough", wtContent, DIGEST_RENDERING_MARKERS.walkthroughFlowBullet, "Key flows: one flow per bullet line");
+  fgMark(
+    "pwk-walkthrough",
+    wtContent,
+    DIGEST_RENDERING_MARKERS.walkthroughFlowBullet,
+    "Key flows: one flow per bullet line",
+  );
   fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.fileLineAnchors, "file:line anchors mandated");
   fgMark("pwk-walkthrough", wtContent, "follow with the files open", "detailed enough to follow along");
   fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.shaStamp, "commit-range stamp");

