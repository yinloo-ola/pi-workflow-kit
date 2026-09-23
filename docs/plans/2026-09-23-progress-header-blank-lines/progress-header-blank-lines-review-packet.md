# Review packet: 2026-09-23-progress-header-blank-lines — feature review

Base: bf6b995a2a67e444f55049db9420fb33de687f39

Head: 326536d1cf76d76d546cff972a5684b97ad96688

## Commits

326536d docs: record R3 commit hash, move progress to reviewing
74e3dc3 test: packet builder accepts both old and new progress header shapes (R3)
923c900 feat: blank line between Base and Head in review packet header (R2)
2b3f40e feat: blank-line progress header in template and skill skeleton (R1)

## Changed files

 .../progress-header-blank-lines-progress.md        | 16 +++++++-------
 skills/pwk-executing-tasks/SKILL.md                |  3 +++
 .../references/progress-format.md                  |  7 +++++-
 .../scripts/build-review-packet.py                 |  4 +++-
 tests/review-packet-cli.test.ts                    | 25 ++++++++++++++++++----
 5 files changed, 41 insertions(+), 14 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R1: Blank-line progress header
The progress-file template and the create-progress skeleton separate every adjacent header-field pair with a blank line, so each field renders as its own paragraph.

**Acceptance criteria**
- Given the progress-format template block, When it is read as CommonMark source, Then a blank line separates `# Progress:` from `Design:`, and separates each adjacent field pair (Design/Branch, Branch/Setup, Setup/Started, Started/Last updated, Last updated/Feature phase).
- Given the create-progress skeleton in the executing-tasks skill, When it is compared with the template, Then it carries the same blank-line separations between header fields.
- Given the template block, When an executor reads it for guidance, Then a prose sentence states that the blank lines are load-bearing because CommonMark merges consecutive plain lines into one paragraph.
- Given the updated template, When the test suite runs, Then a structural test fails if any adjacent header fields are re-compacted without a blank line.

### Checkpoints: none
### Review: skip

### R2: Blank-line packet header
The review-packet builder emits `Base:` and `Head:` separated by a blank line.

**Acceptance criteria**
- Given a freshly built review packet, When its header is read as CommonMark source, Then a blank line separates the `Base:` line from the `Head:` line.
- Given the same packet, When `grep -m1 '^Base:'` and `grep -m1 '^Head:'` run against it, Then each returns exactly one line.
- Given the packet-builder test suite, When it runs, Then the emitted header shape is asserted with the blank-line separation.

### Checkpoints: none
### Review: skip

### R3: Dual-shape extraction contract
Progress files with the old compact header and the new blank-line header both satisfy every extraction recipe, with no consumer edits.

**Acceptance criteria**
- Given a progress file with the old compact header, When the packet helper runs, Then it resolves exactly one `Design:` pointer and builds the packet.
- Given a progress file with the new blank-line header, When the packet helper runs, Then it resolves exactly one `Design:` pointer and builds the packet.
- Given a progress file of either shape, When `grep -m1 '^Feature phase:'` runs, Then exactly one header line is returned.
- Given a progress file of either shape whose header reads `Setup: pending`, When the `Setup:` line is matched header-only, Then exactly one line is returned — the body is never read to find state.
- Given a newly created progress file of either shape, When the multiline `^Design: …$` assertion runs, Then it matches the header line.

### Checkpoints: none
### Review: skip

## Problem

`skills/pwk-executing-tasks/references/progress-format.md` defines the progress header as six consecutive plain lines. In CommonMark, a single newline is a soft break, so any preview renders the whole header as one paragraph — the exact "appears in one line, hard to visualize" report. The generated review packet has the same defect on a smaller scale: `Base:` and `Head:` are emitted on consecutive lines.

## Approaches considered

- **Blank-line paragraphs (chosen)** — insert one blank line between header fields at the two write sites. Blank lines are CommonMark paragraph separators and do not change where a line starts, so every consumer keeps matching unchanged: the six pinned `grep -m1 '^…'` recipes, `startswith('Design: ')` + `strip()[8:]` in the packet helper, and the `^Design: …$` e2e anchor. Old files and new files both satisfy every consumer by construction.
- **Bullet list (`- Design: …`)** — renders tighter, but moves every line start: the packet helper's fixed 8-char slice becomes wrong, all six grep recipes and the `headerRead` marker (`tests/markers.mjs:71`) break, and the e2e `^Design:$` anchor fails. Would require a tolerant parser plus a ~10-file re-anchor — a large blast radius for a cosmetic gain.
- **Hard line breaks (trailing double-space or backslash)** — keeps raw lines adjacent and renders breaks, but trailing spaces are invisible, stripped silently by editors and formatters (preview regresses with no diff signal), and still break the `$` anchor; a backslash lands inside the `[8:]` slice and before the `$`. Fragile and anchor-breaking.

## Architecture

One principle: **shape changes at the two write sites; extraction never changes.** The progress template (hand-authored skill reference) and the packet emitter (f-string in `build-review-packet.py`) are the only producers of header lines. Adding a blank line between fields changes rendering in every CommonMark preview while leaving the line-start contract byte-for-byte intact, which is what makes dual-shape tolerance free instead of a parser project.

## Components

1. `skills/pwk-executing-tasks/references/progress-format.md` (template block ~lines 10–15) — blank line between each adjacent header field, plus a prose sentence that the blank lines are required so previews render one field per line.
2. `skills/pwk-executing-tasks/SKILL.md` (create-progress skeleton, ~lines 181–184) — same blank-line shape, so the skill's own example matches the template it points at.
3. `skills/pwk-executing-tasks/scripts/build-review-packet.py` (emitter ~line 269) — `\n` between `Base:` and `Head:` becomes `\n\n`.
4. Tests — the four exact-adjacency assertions (`tests/review-packet-cli.test.ts`) re-anchor to the blank-line shape; a new structural pin asserts the template keeps its blank lines; new-shape fixtures join the existing old-shape ones.
5. `CHANGELOG.md` — Keep-a-Changelog entry.

Explicitly untouched: `pwk-status`, `resume.md`, `pwk-finalizing`, `pwk-brainstorming`, `umbrella.md`, `tests/markers.mjs`, `tests/skill-lint.mjs` prose pins, and `docs/review.md`'s `Base:`/`Head:` semantics paragraph (it names semantics, not adjacency).

## Data flow

New progress file (template) → preview renders each field as its own paragraph; `grep -m1 '^Feature phase:'` and friends match exactly as before. Old compact files in other repos → unchanged bytes, unchanged behavior. Packet build → helper reads the `Design:` pointer from either shape, emits a header whose `Base:`/`Head:` render as two paragraphs.

## Error handling

No new failure modes. A writer who emits the old compact shape still produces a fully valid file — dual-shape tolerance is graceful degradation, not an error. The packet helper's fail-closed checks (exactly one `Design:` pointer before the first `##` heading, malformed-table rejection) are unaffected: blank lines do not start with `Design: ` and are ignored by the scan.

## Testing

- Re-anchor the four exact-adjacency packet assertions to `\n\n` (lesson: pins follow the shape, in the same change).
- New structural regression pin on the template block: fails if adjacent header fields lose their blank line.
- New-shape packet fixture (blank-line header) alongside the existing old-shape fixtures, which double as the old-shape proof.
- Dual-shape criteria in R3 exercised against both fixture shapes.
- Gate: `npm run check` green (biome + vitest).


## Feature acceptance (verbatim)

## Feature acceptance

- Given a progress file created from the updated template, When the header block is read as CommonMark source, Then every pair of adjacent header fields is separated by a blank line, so each field renders as its own paragraph.
- Given the same file, When `grep -m1 '^Feature phase:'` runs, Then exactly one header line is returned; and when the header reads `Setup: pending`, a header-only `Setup:` match also returns exactly one line.
- Given a progress file with the old compact header, When the packet helper runs, Then it resolves the single `Design:` pointer and builds the packet — both shapes accepted.
- Given a freshly built packet, When its header is read, Then `Base:` and `Head:` are separated by a blank line while each remains single-line greppable.
- Given the full suite (`npm run check`), When it runs after the change, Then it is green, including the regression pin that keeps the template header uncompacted.


## Production-risk notes (verbatim, if any)


## Diff

diff --git a/docs/plans/2026-09-23-progress-header-blank-lines/progress-header-blank-lines-progress.md b/docs/plans/2026-09-23-progress-header-blank-lines/progress-header-blank-lines-progress.md
index a82071b..0c8a70f 100644
--- a/docs/plans/2026-09-23-progress-header-blank-lines/progress-header-blank-lines-progress.md
+++ b/docs/plans/2026-09-23-progress-header-blank-lines/progress-header-blank-lines-progress.md
@@ -8,23 +8,23 @@ Setup: n/a
 
 Started: 2026-09-23T02:07:12Z
 
-Last updated: 2026-09-23T02:07:12Z
+Last updated: 2026-09-23T02:21:43Z
 
-Feature phase: e2e-written
+Feature phase: reviewing
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
-| 1 | ⬜ | Blank-line progress header (template + skeleton + prose) | — | — |
-| 2 | ⬜ | Blank-line packet header (Base/Head) | — | — |
-| 3 | ⬜ | Dual-shape extraction contract (old + new headers) | — | — |
+| 1 | ✅ | Blank-line progress header (template + skeleton + prose) | — | 2b3f40e |
+| 2 | ✅ | Blank-line packet header (Base/Head) | — | 923c900 |
+| 3 | ✅ | Dual-shape extraction contract (old + new headers) | — | 74e3dc3 |
 
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? |
 |----|-------------|------------------|-----------|
-| 1 | Blank-line progress header (template + skeleton + prose) | | |
-| 2 | Blank-line packet header (Base/Head) | | |
-| 3 | Dual-shape extraction contract (old + new headers) | | |
+| 1 | Blank-line progress header (template + skeleton + prose) | Blank line between each adjacent header field in the progress-format template and the skill skeleton; load-bearing prose sentence added before the template block | — |
+| 2 | Blank-line packet header (Base/Head) | Emitter f-string emits `\n\n` between Base and Head with load-bearing comment; four exact-adjacency pins re-anchored in the same commit | — |
+| 3 | Dual-shape extraction contract (old + new headers) | Packet-builder CLI gains a new-shape header test (blank lines, single Design pointer); existing old-shape fixtures double as the old-shape proof; E2E grep recipes cover both shapes | — |
 
 ## Deviation records
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index dab58ff..c7a9de6 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -179,8 +179,11 @@ key files capped `at 5`.
 
 ```markdown
 # Progress: <topic>
+
 Design: docs/plans/<date>-<topic>/<leaf>-design.md
+
 Feature phase: e2e-written
+
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 ## Execution summary
diff --git a/skills/pwk-executing-tasks/references/progress-format.md b/skills/pwk-executing-tasks/references/progress-format.md
index d0519ab..20d9048 100644
--- a/skills/pwk-executing-tasks/references/progress-format.md
+++ b/skills/pwk-executing-tasks/references/progress-format.md
@@ -2,16 +2,21 @@
 
 Read before creating or changing progress rows, or writing/re-presenting the code digest. This reference owns the unchanged progress artifact schema.
 
-2. **Create the progress file** `docs/plans/<date>-<topic>/<leaf>-progress.md`, beside the design doc it belongs to (`<leaf>` is `<topic>` for a single-part topic; an umbrella part uses its roster slug), so `pwk-finalizing` finds it inside the topic folder:
+2. **Create the progress file** `docs/plans/<date>-<topic>/<leaf>-progress.md`, beside the design doc it belongs to (`<leaf>` is `<topic>` for a single-part topic; an umbrella part uses its roster slug), so `pwk-finalizing` finds it inside the topic folder. Keep the blank lines between the header fields: the blank lines are load-bearing, because CommonMark merges consecutive plain lines into one paragraph, so without them every preview renders the whole header as a single run-on line.
 
    ```markdown
    # Progress: <topic>
 
    Design: docs/plans/<date>-<topic>/<leaf>-design.md
+
    Branch: <branch>
+
    Setup: n/a
+
    Started: <ISO timestamp>
+
    Last updated: <ISO timestamp>
+
    Feature phase: e2e-written
 
    <!-- a trivial design doc (no `## Feature acceptance`) starts at `implementing (0/N)` instead — there is no E2E to write -->
diff --git a/skills/pwk-executing-tasks/scripts/build-review-packet.py b/skills/pwk-executing-tasks/scripts/build-review-packet.py
index cc26a08..8a533f0 100644
--- a/skills/pwk-executing-tasks/scripts/build-review-packet.py
+++ b/skills/pwk-executing-tasks/scripts/build-review-packet.py
@@ -266,7 +266,9 @@ def build(args):
         ('Diff', git(project, 'diff', '--no-ext-diff', '--no-textconv', '--no-color', span, *pathspec)),
     ]
     label = 'feature review' if args.scope == 'feature' else f'requirement R{args.requirement} review'
-    packet = f'# Review packet: {design_path.parent.name} — {label}\n\nBase: {base}\nHead: {head}\n\n'
+    # The blank line between Base and Head is load-bearing: CommonMark merges
+    # consecutive plain lines into one paragraph in every preview.
+    packet = f'# Review packet: {design_path.parent.name} — {label}\n\nBase: {base}\n\nHead: {head}\n\n'
     for title, content in sections:
         packet += f'## {title}\n\n{content}\n'
     # All parsing and Git reads finish before a temporary file exists. A failure in
diff --git a/tests/review-packet-cli.test.ts b/tests/review-packet-cli.test.ts
index 5c9403c..b31c205 100644
--- a/tests/review-packet-cli.test.ts
+++ b/tests/review-packet-cli.test.ts
@@ -177,10 +177,10 @@ describe("review packet Python CLI", () => {
     const fix = git(f.project, "rev-parse", "HEAD");
     writeFileSync(f.progress, f.progressText.replace(f.commits[2], `${f.commits[2]} ${fix}`));
     expect(f.run().status).toBe(0);
-    expect(readFileSync(f.packet, "utf8")).toContain(`Base: ${f.seed}\nHead: ${fix}`);
+    expect(readFileSync(f.packet, "utf8")).toContain(`Base: ${f.seed}\n\nHead: ${fix}`);
     expect(f.run(["--scope", "requirement", "--requirement", "3"]).status).toBe(0);
     expect(readFileSync(join(f.topic, "demo-review-packet-r3.md"), "utf8")).toContain(
-      `Base: ${f.commits[1]}\nHead: ${fix}`,
+      `Base: ${f.commits[1]}\n\nHead: ${fix}`,
     );
     // R3 depends only on its own and the immediately previous recorded bound.
     writeFileSync(f.progress, readFileSync(f.progress, "utf8").replace(`${f.rows[0]}\n`, ""));
@@ -195,7 +195,7 @@ describe("review packet Python CLI", () => {
     expect(result.stderr).toBe("");
     expect(result.status).toBe(0);
     const packet = readFileSync(f.packet, "utf8");
-    expect(packet).toContain(`Base: ${f.seed}\nHead: ${f.commits[2]}`);
+    expect(packet).toContain(`Base: ${f.seed}\n\nHead: ${f.commits[2]}`);
     const sections = [
       "## Commits",
       "## Changed files",
@@ -226,6 +226,23 @@ describe("review packet Python CLI", () => {
     expect(readFileSync(f.progress, "utf8")).toBe(f.progressText);
   });
 
+  it("resolves the single Design pointer from both old compact and new blank-line headers", () => {
+    const f = fixture();
+    // New shape: a blank line between each adjacent header field; extraction must not care.
+    const newShape = f.progressText.replace(
+      `Design: ${relative(f.project, f.design)}\nBranch: test\nFeature phase: reviewing`,
+      `Design: ${relative(f.project, f.design)}\n\nBranch: test\n\nFeature phase: reviewing`,
+    );
+    expect(newShape).not.toBe(f.progressText); // the replacement anchor itself is the old shape
+    writeFileSync(f.progress, newShape);
+    const result = f.run();
+    expect(result.stderr).toBe("");
+    expect(result.status).toBe(0);
+    const packet = readFileSync(f.packet, "utf8");
+    expect(packet).toContain(`Base: ${f.seed}\n\nHead: ${f.commits[2]}`);
+    expect((packet.match(/^Design: /gm) ?? []).length).toBeLessThanOrEqual(1); // one pointer, never a blank-line false match
+  });
+
   it("uses distinct requirement bounds and criteria, not HEAD or other requirements", () => {
     const f = fixture();
     expect(f.run().status).toBe(0);
@@ -233,7 +250,7 @@ describe("review packet Python CLI", () => {
     for (const index of [0, 1]) {
       expect(f.run(["--scope", "requirement", "--requirement", String(index + 1)]).status).toBe(0);
       const packet = readFileSync(join(f.topic, `demo-review-packet-r${index + 1}.md`), "utf8");
-      expect(packet).toContain(`Base: ${index === 0 ? f.seed : f.commits[index - 1]}\nHead: ${f.commits[index]}`);
+      expect(packet).toContain(`Base: ${index === 0 ? f.seed : f.commits[index - 1]}\n\nHead: ${f.commits[index]}`);
       expect(packet).toContain(index === 0 ? alpha : beta);
       expect(packet).not.toContain(index === 0 ? beta : alpha);
       expect(packet).not.toContain("+gamma content");

