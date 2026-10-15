# Review packet: 2026-10-14-deterministic-steps — requirement R6 review

Base: c86c1b03f457fe85d2855a14fd61322fbcb92e8f

Head: 0c0579489ad51b305fa07d45dc51f4a3df5aec31

## Commits

0c05794 fix(packet): refuse invalid UTF-8 as the Python helper did (R6 review)
f9bc008 fix(validator): anchor tag detection, Unicode criteria, splitlines parity (R6 review)
55f7211 feat(runtime): port both helpers to Node with golden-verified output (deterministic-steps R6)
1286cb0 docs: R5 row and evidence (deterministic-steps)

## Changed files

 AGENTS.md                                          |   2 +-
 .../deterministic-steps-progress.md                |  10 +-
 docs/workflow-phases.md                            |   4 +-
 skills/pwk-brainstorming/SKILL.md                  |   4 +-
 .../pwk-brainstorming/references/design-format.md  |   2 +-
 .../pwk-brainstorming/scripts/validate-design.mjs  | 239 ++++++++++++
 .../pwk-brainstorming/scripts/validate-design.py   | 194 ----------
 skills/pwk-executing-tasks/SKILL.md                |   2 +-
 skills/pwk-executing-tasks/references/review.md    |   4 +-
 .../scripts/build-review-packet.mjs                | 399 +++++++++++++++++++++
 .../scripts/build-review-packet.py                 | 320 -----------------
 tests/design-validator.test.ts                     |  16 +-
 tests/fixtures/design-validator/cjk-criteria.txt   |   4 +
 .../fixtures/design-validator/cr-line-endings.txt  |   4 +
 .../design-validator/duplicate-requirement.txt     |   2 +
 .../fixtures/design-validator/missing-criteria.txt |   2 +
 .../design-validator/name-contains-tag.txt         |   4 +
 .../design-validator/no-feature-acceptance.txt     |   2 +
 tests/fixtures/design-validator/non-sequential.txt |   2 +
 tests/fixtures/design-validator/valid-trivial.txt  |   3 +
 tests/fixtures/design-validator/valid.txt          |   4 +
 tests/fixtures/review-packet/fixture-design.md     |  26 ++
 tests/fixtures/review-packet/fixture-head.txt      |   1 +
 .../review-packet/fixture-progress-template.md     |  27 ++
 tests/fixtures/review-packet/packet-golden.md      | 115 ++++++
 tests/node-helpers.test.ts                         | 199 ++++++++++
 tests/prescription-sweep.mjs                       |  10 +-
 tests/prescription-sweep.test.ts                   |   4 +-
 tests/progress-header-blank-lines.e2e.test.ts      |   4 +-
 tests/resources-package.test.ts                    |  26 +-
 tests/review-cost-optimization.test.ts             |   2 +-
 tests/review-packet-cli.test.ts                    |  30 +-
 tests/review-packet.test.ts                        |   8 +-
 33 files changed, 1092 insertions(+), 583 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R6: One runtime for the helpers
Both Python helpers become dependency-free Node scripts with identical results, and the Python prerequisite retires from the kit.

**Acceptance criteria**
- Given the design-validator fixtures (a valid doc and one per structural fault), When the Node validator runs, Then its exit code and diagnostics match the Python validator's on the same inputs.
- Given a repository state, When the Node packet helper builds a packet, Then the result is byte-identical to the packet the Python helper builds for the same state.
- Given the skills, docs, and AGENTS.md after this requirement, When they are searched for a Python invocation or prerequisite, Then none remains — the frozen probe transcripts under `tests/evals/skill-slimming/runs/` are exempt as historical evidence.
- Given the scripts directory, When it is listed, Then the Python files are gone and no test invokes a Python interpreter.
- Given `npm run check`, When it runs after the conversion, Then it is green.

### Checkpoints: full
### Review: parallel


## Feature acceptance (verbatim)

## Feature acceptance

- Given a kit copy and a fresh topic, When the executing flow's deterministic steps run, Then the progress file's phase, row, commit, and summary are written by the helper with no hand edit, and the staging helper reports a clean tree at both the packet-assembly and ship steps.
- Given the kit corpus, When `npm run check` runs, Then every reference pointer resolves, the recon step carries its enumeration instruction, and no Python interpreter is invoked.
- Given a skill markdown file inflated past its budget, When the lint runs, Then it still fails naming the file and its count, so the ratchet survives this work.
- Given a skill file whose pinned phrases are intact and one whose pinned phrase was dropped, When the relocated pin checker runs, Then it passes the first and fails the second naming the phrase.


## Production-risk notes (verbatim, if any)


## Diff

diff --git a/AGENTS.md b/AGENTS.md
index 3e519dd..3f82e26 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -8,7 +8,7 @@ Instructions for AI coding agents working in this repository. If you also mainta
 
 Three components:
 - `extensions/workflow-guard.ts` — the enforcement engine plus the Pi-only `/pwk-setup` command that installs role definitions into `.agents/agents/`.
-- `skills/pwk-*/references/` and `skills/pwk-*/scripts/` — skill-local detailed contracts and deterministic helpers; helpers that require Python 3 declare that prerequisite in their owning skill.
+- `skills/pwk-*/references/` and `skills/pwk-*/scripts/` — skill-local detailed contracts and deterministic helpers; each helper is a dependency-free `.mjs` script run with `node`, and the calling skill states the invocation.
 - `skills/pwk-*/SKILL.md` — workflow-phase guidance, invoked as `/skill:pwk-*`. Harness-neutral: delegation is expressed as logical roles and capabilities, not a concrete agent tool.
 - `agents/pwk-*.md` — canonical, provider-neutral role contracts (recon scout + four reviewers). `/pwk-setup` copies them into the project's `.agents/agents/` so compatible delegation extensions (e.g. `@tintinweb/pi-subagents`) can discover them; the kit installs no delegation provider itself.
 
diff --git a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
index 8cf6967..db07a00 100644
--- a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
+++ b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
@@ -8,9 +8,9 @@ Setup: n/a
 
 Started: 2026-10-14T14:35:00Z
 
-Last updated: 2026-10-14T15:35:48.234Z
+Last updated: 2026-10-15T00:01:46.422Z
 
-Feature phase: implementing (4/6)
+Feature phase: implementing (5/6)
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
@@ -19,8 +19,8 @@ Feature phase: implementing (4/6)
 | 2 | ✅ | Section-scoped reference reads and an anchor-resolving lint | — | 74be32d 6eac0cc |
 | 3 | ✅ | The reviewed diff is the shipped diff | — | 8a95578 ef9f31d |
 | 4 | ✅ | Enumerated capability checks | — | 5f4ed8d |
-| 5 | 🔄 | The pin checkers live in the repo | — | — |
-| 6 | ⬜ | One runtime for the helpers | ⏸ full · 🔎 parallel | — |
+| 5 | ✅ | The pin checkers live in the repo | — | c86c1b0 |
+| 6 | 🔄 | One runtime for the helpers | ⏸ full · 🔎 parallel | 55f7211 |
 
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? | Evidence |
@@ -29,7 +29,7 @@ Feature phase: implementing (4/6)
 | 2 | Section-scoped reference reads and an anchor-resolving lint | A Node section extractor prints one anchored section — from the heading to the next heading of the same or higher level — and skill-lint gained a check that every reference pointer in the skill text resolves: the file exists and the anchor matches a heading under the same slug rule. The executing-tasks skill's five bare pointers now name the sections their steps need, and the skill says to load a section rather than a whole file. | yes — one pointer's target section did not exist, so progress-format.md gained a ## Code digest heading to anchor it | vitest run tests/ref-helper.test.ts -> 5 pass (section boundaries, nested stop, unknown anchor lists headings, missing file, no anchor); skill-lint: 'reference pointer: all 10 reference pointers resolve'; the feature E2E's dangling-anchor case fails a rewritten pointer naming both the file and the anchor. |
 | 3 | The reviewed diff is the shipped diff | A Node helper fails when the tree holds uncommitted or untracked paths outside docs/plans/, listing them; the plan folder stays exempt because the design, progress file, and generated packet are legitimately dirty while a step is in flight. A root it cannot verify (not a git worktree) fails loudly rather than passing, and the packet-assembly step and the ship checkpoint both instruct running it. | yes — the feature E2E had to git-init its kit copy, since the check verifies a worktree and a plain directory cannot be verified | vitest run tests/stage-check.test.ts -> 5 pass (clean tree, untracked outside, modified tracked outside, plan-folder-only dirty, unverifiable root); the feature E2E's first scenario is fully green, and a stray file in the kit copy fails naming it. |
 | 4 | Enumerated capability checks | The recon step now requires enumerating what the session actually grants before it says anything is missing — under a batch executor Array.from(ALL_TOOLS), otherwise the tools and roles the host listed — naming the result, and reporting Scout: unavailable only among the enumerated tools with that result attached. skill-lint gained a check that the step carries the instruction and both forms. | — | skill-lint: 'recon enumeration: the recon step enumerates before reporting a capability missing'; the feature E2E asserts the repo text matches /enumerat/i and names ALL_TOOLS, and that stripping the sentence from a kit copy fails the lint naming the check. |
-| 5 | The pin checkers live in the repo | | | |
+| 5 | The pin checkers live in the repo | The relocated pin checker gained a named-revision argument (--against <rev>, default HEAD), repo-relative path resolution so a caller can pass an absolute path, and a non-zero exit that names every lost phrase — so a later pass can gate on it instead of only diffing HEAD. The pool harvest now tolerates a missing source file. | yes — R5 narrowed to those two refinements by human decision (Option 1); the relocation criteria were delivered by the skill-slimming-2 finalize, and the design records the amendment | vitest run tests/pins-lost.test.ts -> 4 pass (intact, a drop against a named revision, an absolute path, an unresolvable revision); the feature E2E's pin scenario is green and takes a real phrase from markers.mjs. |
 | 6 | One runtime for the helpers | | | |
 
 ## Deviation records
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index 2977486..126a42d 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -3,11 +3,11 @@
 Phase skills keep detailed contracts local to their skill directories:
 `skills/pwk-brainstorming/references/umbrella.md`,
 `skills/pwk-brainstorming/references/design-format.md`, and
-`skills/pwk-brainstorming/scripts/validate-design.py`; plus
+`skills/pwk-brainstorming/scripts/validate-design.mjs`; plus
 `skills/pwk-executing-tasks/references/progress-format.md`,
 `skills/pwk-executing-tasks/references/resume.md`,
 `skills/pwk-executing-tasks/references/review.md`, and
-`skills/pwk-executing-tasks/scripts/build-review-packet.py`.
+`skills/pwk-executing-tasks/scripts/build-review-packet.mjs`.
 
 The kit enforces a design → execute → finalize workflow. Each phase below names the skill that drives it:
 
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 749d918..cbd948f 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -61,12 +61,12 @@ A large request with distinct testable outcomes that need separate design/execut
 
    **Completion gate:** Test observable behavior through the public interface. Audit every requirement’s criteria, tags, and risk notes — each appears exactly once. A criterion is ready only when its `Then` names an outcome a command can observe — a run, a grep, or an assertion; a criterion with no nameable probe sends the requirement back for splitting or rephrasing, and design-doc criteria never name tests — the probe materializes at execution. For non-trivial work, finish with an end-to-end `## Feature acceptance` as the primary enforced spec. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate: an unwritable step means an unspecified requirement, not permission to guess. Risk notes never set the tag — the written `### Review` value stays `skip` unless the human sets it, and only the human tags a slice for review. Keep designing until the requirements compose into a coherent feature and the human approves the design, including feature acceptance; trivial work keeps the compressed one-turn path above.
 
-   **Python prerequisite:** structural validation requires Python 3.9+ where commands execute, using only its standard library. Confirm a compatible `python3` exists before invoking the helper; if it is missing or too old, report the blocker and request a suitable runtime, then stop at this gate. Never auto-install Python, use a fallback implementation, or claim validation succeeded.
+   **Runtime prerequisite:** structural validation runs as a dependency-free Node script where commands execute, using only Node's standard library. Confirm `node --version` works before invoking the helper; if Node is missing, report the blocker and request a suitable runtime, then stop at this gate. Never auto-install a runtime, use a fallback implementation, or claim validation succeeded.
 
    Resolve the helper from this installed skill’s directory and pass explicit paths, quoting paths with spaces:
 
    ```sh
-   python3 "<brainstorming-skill-dir>/scripts/validate-design.py" "<design-path>"
+   node "<brainstorming-skill-dir>/scripts/validate-design.mjs" "<design-path>"
    ```
 
    Nonzero means validation did not succeed: report file-specific diagnostics, correct the structural errors, and rerun. A missing local reference or helper is a blocker before its dependent action; success verifies structure only — never semantic correctness, sound slicing, confirmed assumptions, or human approval.
diff --git a/skills/pwk-brainstorming/references/design-format.md b/skills/pwk-brainstorming/references/design-format.md
index 2be0529..82fcec3 100644
--- a/skills/pwk-brainstorming/references/design-format.md
+++ b/skills/pwk-brainstorming/references/design-format.md
@@ -76,7 +76,7 @@ Example (rate limiting): "Given a new API consumer with no prior usage, When the
 
 ## Structural validator contract
 
-Run `scripts/validate-design.py` as directed in the main skill. It reads UTF-8 Markdown without modifying it; headings, tags, and labels inside backtick or tilde fenced examples do not count, so close every fence. Real requirements use unique sequential `### R1: <name>`, `### R2: <name>`, … headings with nonempty names. Each block needs a standalone `**Acceptance criteria**` label in its main body, before any tag or risk-note heading (an explanatory suffix after an em dash, dash, or colon is allowed), with nonempty criteria before the next heading or bold label. A bare bullet or content borrowed from risk notes is not a criterion section.
+Run `scripts/validate-design.mjs` as directed in the main skill. It reads UTF-8 Markdown without modifying it; headings, tags, and labels inside backtick or tilde fenced examples do not count, so close every fence. Real requirements use unique sequential `### R1: <name>`, `### R2: <name>`, … headings with nonempty names. Each block needs a standalone `**Acceptance criteria**` label in its main body, before any tag or risk-note heading (an explanatory suffix after an em dash, dash, or colon is allowed), with nonempty criteria before the next heading or bold label. A bare bullet or content borrowed from risk notes is not a criterion section.
 
 Write each selected tag as one value, not the template's pipe-separated alternatives. Missing optional tags retain `Checkpoints: none`, `Review: skip`, and `Feature review: auto`. Non-trivial designs require nonempty `## Feature acceptance` scenarios before their feature-review tag. Only the minimal trivial shape above receives the no-Feature-acceptance exception.
 
diff --git a/skills/pwk-brainstorming/scripts/validate-design.mjs b/skills/pwk-brainstorming/scripts/validate-design.mjs
new file mode 100644
index 0000000..f322c8f
--- /dev/null
+++ b/skills/pwk-brainstorming/scripts/validate-design.mjs
@@ -0,0 +1,239 @@
+#!/usr/bin/env node
+/**
+ * Read-only structural validation of a workflow design document.
+ *
+ * Structure only: it does not judge whether a criterion is true, testable, or specific.
+ *
+ * Usage: node validate-design.mjs <design-path>
+ */
+import { readFileSync } from "node:fs";
+import { parseArgs } from "node:util";
+
+const TAG_VALUES = {
+  Checkpoints: ["none", "full"],
+  Review: ["skip", "parallel", "inline"],
+  "Feature review": ["auto", "parallel", "inline"],
+};
+const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/;
+const REQUIREMENT = /^R([1-9][0-9]*):\s*(.*)$/;
+const REQUIREMENT_LIKE = /^R(?:[0-9]|\s*:)/;
+const CRITERIA = /^\*\*Acceptance criteria\*\*(?:\s*(?:—|–|-|:).*)?$/;
+
+/** Blank fenced examples, keeping an unclosed-fence diagnostic. Not a Markdown renderer. */
+function visibleLines(text) {
+  const lines = [];
+  const errors = [];
+  let fence = "";
+  let fenceLine = 0;
+  // Python's splitlines: break on CRLF, CR, or LF, and never keep a trailing empty line.
+  const rawLines = text.split(/\r\n|\r|\n/);
+  if (/[\r\n]$/.test(text)) rawLines.pop();
+  for (const [offset, line] of rawLines.entries()) {
+    const number = offset + 1;
+    if (fence) {
+      const char = fence[0] === "`" ? "`" : "~";
+      if (new RegExp(`^ {0,3}${char}{${fence.length},}[ \\t]*$`).test(line)) fence = "";
+      lines.push("");
+      continue;
+    }
+    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
+    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
+      fence = opening[1];
+      fenceLine = number;
+      lines.push("");
+    } else {
+      lines.push(line);
+    }
+  }
+  if (fence) errors.push(`line ${fenceLine}: unclosed code fence; close it before validating`);
+  return { lines, errors };
+}
+
+/** Presence of content, not its quality. */
+function hasContent(lines) {
+  return lines.some((line) => {
+    const text = line.replace(/^\s*(?:[-+*]|[0-9]+[.)])\s*/, "").trim();
+    // Unicode word characters: a criteria section written in CJK is not empty.
+    return Boolean(text) && /[\p{L}\p{N}_]/u.test(text);
+  });
+}
+
+/** A heading or another bold label terminates a criteria section. */
+function criteriaBody(lines, start, end) {
+  const result = [];
+  for (const line of lines.slice(start, end)) {
+    if (HEADING.test(line) || /^\s*\*\*[^*]+\*\*/.test(line)) break;
+    result.push(line);
+  }
+  return result;
+}
+
+function validate(text) {
+  const { lines, errors } = visibleLines(text);
+  const headings = [];
+  for (const [index, line] of lines.entries()) {
+    const match = HEADING.exec(line);
+    if (match) headings.push({ level: match[1].length, title: match[2], index });
+  }
+  for (const heading of headings) {
+    if (REQUIREMENT_LIKE.test(heading.title) && heading.level !== 3) {
+      errors.push(`line ${heading.index + 1}: ${heading.title} must use a ### requirement heading`);
+    }
+  }
+  const requirements = headings.filter((h) => h.level === 3 && REQUIREMENT_LIKE.test(h.title));
+  const features = headings.filter((h) => h.level === 2 && h.title === "Feature acceptance");
+  const summaries = [];
+
+  if (requirements.length === 0) {
+    errors.push("required requirement block missing; add ### R1: <name> with Acceptance criteria");
+  }
+  const seen = new Set();
+  requirements.forEach((heading, position) => {
+    const expected = position + 1;
+    const match = REQUIREMENT.exec(heading.title);
+    if (!match) {
+      errors.push(`line ${heading.index + 1}: malformed requirement '${heading.title}'; use ### R${expected}: <name>`);
+      return;
+    }
+    const number = Number(match[1]);
+    if (seen.has(number)) errors.push(`line ${heading.index + 1}: duplicate requirement R${number}`);
+    else if (number !== expected) {
+      errors.push(
+        `line ${heading.index + 1}: expected R${expected}, found R${number}; IDs must be sequential in document order`,
+      );
+    }
+    seen.add(number);
+    if (!match[2].trim()) errors.push(`line ${heading.index + 1}: R${number} requires a nonempty name`);
+  });
+
+  const introEnd = requirements.length ? requirements[0].index : lines.length;
+  const short = lines.slice(0, introEnd).some((line) => /^In short:\s*\S.*$/.test(line));
+  const fullFormat = headings.some((h) => h.level === 2 && (h.title === "At a glance" || h.title === "Requirements"));
+  const trivial =
+    short &&
+    !fullFormat &&
+    requirements.length === 1 &&
+    requirements[0].title.startsWith("R1:") &&
+    features.length === 0;
+  if (!trivial && features.length === 0) {
+    errors.push(
+      "## Feature acceptance is required for non-trivial designs; the trivial exception needs an In short: one-liner and a single R1 block without full-format sections",
+    );
+  }
+  if (features.length > 1) errors.push("duplicate ## Feature acceptance section; keep exactly one");
+
+  const ownedTags = new Set();
+  const tags = (start, end, names, owner) => {
+    const values = Object.fromEntries(names.map((name) => [name, TAG_VALUES[name][0]]));
+    const found = new Set();
+    for (const heading of headings) {
+      if (heading.index < start || heading.index >= end) continue;
+      for (const name of names) {
+        if (
+          heading.level !== 3 ||
+          // Anchored, as Python's re.match is: a title that merely contains a tag word is not a tag.
+          !new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(heading.title)
+        ) {
+          continue;
+        }
+        ownedTags.add(heading.index);
+        if (found.has(name)) errors.push(`line ${heading.index + 1}: duplicate ${name} tag in ${owner}`);
+        found.add(name);
+        let value = heading.title.slice(name.length).trim();
+        value = value.startsWith(":") ? value.slice(1).trim() : "";
+        if (!TAG_VALUES[name].includes(value)) {
+          errors.push(
+            `line ${heading.index + 1}: invalid ${name} tag in ${owner}; expected ${TAG_VALUES[name].join(" | ")}`,
+          );
+        } else {
+          values[name] = value;
+        }
+      }
+    }
+    return values;
+  };
+
+  for (const heading of requirements) {
+    const end =
+      headings.find((h) => h.index > heading.index && (h.level <= 2 || requirements.includes(h)))?.index ??
+      lines.length;
+    const criteriaEnd = headings.find((h) => h.index > heading.index && h.index < end)?.index ?? end;
+    const labels = [];
+    for (let i = heading.index + 1; i < criteriaEnd; i += 1) if (CRITERIA.test(lines[i].trim())) labels.push(i);
+    const owner = heading.title.split(":")[0];
+    if (labels.length === 0) {
+      errors.push(`line ${heading.index + 1}: ${owner} needs a standalone **Acceptance criteria** section`);
+    } else if (labels.length > 1) {
+      errors.push(`line ${labels[1] + 1}: ${owner} has duplicate Acceptance criteria sections`);
+    } else if (!hasContent(criteriaBody(lines, labels[0] + 1, end))) {
+      errors.push(
+        `line ${labels[0] + 1}: ${owner} Acceptance criteria is empty; add a criterion before the next section`,
+      );
+    }
+    const values = tags(heading.index + 1, end, ["Checkpoints", "Review"], owner);
+    summaries.push(`${owner}: Checkpoints=${values.Checkpoints}, Review=${values.Review}`);
+  }
+
+  for (const heading of features) {
+    const end = headings.find((h) => h.index > heading.index && h.level <= 2)?.index ?? lines.length;
+    if (!hasContent(criteriaBody(lines, heading.index + 1, end))) {
+      errors.push(
+        `line ${heading.index + 1}: Feature acceptance is empty; add an end-to-end criterion before its review tag`,
+      );
+    }
+    const values = tags(heading.index + 1, end, ["Feature review"], "Feature acceptance");
+    summaries.push(`Feature review=${values["Feature review"]}`);
+  }
+
+  for (const heading of headings) {
+    for (const name of Object.keys(TAG_VALUES)) {
+      if (
+        new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(heading.title) &&
+        !ownedTags.has(heading.index)
+      ) {
+        const owner = name === "Feature review" ? "## Feature acceptance" : "a ### R<n>: requirement block";
+        errors.push(`line ${heading.index + 1}: ${name} must be a ### tag inside ${owner}`);
+      }
+    }
+  }
+  return { errors, summaries };
+}
+
+if (process.argv.includes("-h") || process.argv.includes("--help")) {
+  console.log(`usage: node validate-design.mjs <design-path>
+
+Read-only structural design validation with Node's standard library only. Semantic correctness is not verified.
+
+Pass an explicit design path. Absolute paths are used directly; relative paths resolve from the caller's current working directory (cwd), not the installed skill directory.`);
+  process.exit(0);
+}
+
+const { positionals } = (() => {
+  try {
+    return parseArgs({ args: process.argv.slice(2), allowPositionals: true });
+  } catch (error) {
+    console.error(`validate-design.mjs: ${error.message}`);
+    process.exit(2);
+  }
+})();
+const design = positionals[0];
+if (!design) {
+  console.error("usage: node validate-design.mjs <design-path>");
+  process.exit(2);
+}
+let text;
+try {
+  // A strict decode: reading as utf8 would replace invalid bytes instead of refusing them.
+  text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(design));
+} catch (error) {
+  console.error(`${design}: cannot read UTF-8 design: ${error.message}`);
+  process.exit(2);
+}
+const { errors, summaries } = validate(text);
+if (errors.length) {
+  for (const error of errors) console.error(`${design}: ${error}`);
+  process.exit(1);
+}
+console.log(`${design}: structural checks passed. Semantic correctness is not verified.`);
+for (const summary of summaries) console.log(`  ${summary}`);
+process.exit(0);
diff --git a/skills/pwk-brainstorming/scripts/validate-design.py b/skills/pwk-brainstorming/scripts/validate-design.py
deleted file mode 100644
index 1418d3d..0000000
--- a/skills/pwk-brainstorming/scripts/validate-design.py
+++ /dev/null
@@ -1,194 +0,0 @@
-#!/usr/bin/env python3
-"""Read-only validation of the workflow's Markdown design structure (Python 3.9+)."""
-
-import argparse
-from dataclasses import dataclass
-from pathlib import Path
-import re
-import sys
-from typing import List, Optional, Tuple
-
-
-TAG_VALUES = {
-    "Checkpoints": ("none", "full"),
-    "Review": ("skip", "parallel", "inline"),
-    "Feature review": ("auto", "parallel", "inline"),
-}
-HEADING = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$")
-REQUIREMENT = re.compile(r"^R([1-9][0-9]*):\s*(.*)$")
-REQUIREMENT_LIKE = re.compile(r"^R(?:[0-9]|\s*:)")
-CRITERIA = re.compile(r"^\*\*Acceptance criteria\*\*(?:\s*(?:—|–|-|:).*)?$")
-
-
-@dataclass
-class Heading:
-    level: int
-    title: str
-    index: int
-
-
-def visible_lines(text: str) -> Tuple[List[str], List[str]]:
-    """Blank fenced examples, retaining indexes for diagnostics. Not a Markdown renderer."""
-    lines = []
-    errors = []
-    fence = ""
-    fence_line = 0
-    for number, line in enumerate(text.splitlines(), 1):
-        if fence:
-            if re.fullmatch(r" {0,3}" + re.escape(fence[0]) + "{" + str(len(fence)) + r",}[ \t]*", line):
-                fence = ""
-            lines.append("")
-            continue
-        opening = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
-        if opening and not (opening[1][0] == "`" and "`" in opening[2]):
-            fence = opening[1]
-            fence_line = number
-            lines.append("")
-        else:
-            lines.append(line)
-    if fence:
-        errors.append(f"line {fence_line}: unclosed code fence; close it before validating")
-    return lines, errors
-
-
-def has_content(lines: List[str]) -> bool:
-    # Check presence, not whether the assertion is true, testable, or sufficiently specific.
-    for line in lines:
-        text = re.sub(r"^\s*(?:[-+*]|[0-9]+[.)])\s*", "", line).strip()
-        if text and re.search(r"\w", text):
-            return True
-    return False
-
-
-def criteria_body(lines: List[str], start: int, end: int) -> List[str]:
-    """A heading or another bold section label terminates criteria, not just the next R ID."""
-    result = []
-    for line in lines[start:end]:
-        if HEADING.match(line) or re.match(r"^\s*\*\*[^*]+\*\*", line):
-            break
-        result.append(line)
-    return result
-
-
-def validate(text: str) -> Tuple[List[str], List[str]]:
-    lines, errors = visible_lines(text)
-    headings = []
-    for index, line in enumerate(lines):
-        match = HEADING.match(line)
-        if match:
-            headings.append(Heading(len(match[1]), match[2], index))
-    for heading in headings:
-        if REQUIREMENT_LIKE.match(heading.title) and heading.level != 3:
-            errors.append(f"line {heading.index + 1}: {heading.title} must use a ### requirement heading")
-    requirements = [h for h in headings if h.level == 3 and REQUIREMENT_LIKE.match(h.title)]
-    features = [h for h in headings if h.level == 2 and h.title == "Feature acceptance"]
-    summaries = []
-
-    if not requirements:
-        errors.append("required requirement block missing; add ### R1: <name> with Acceptance criteria")
-    seen = set()
-    for expected, heading in enumerate(requirements, 1):
-        match = REQUIREMENT.fullmatch(heading.title)
-        if not match:
-            errors.append(f"line {heading.index + 1}: malformed requirement '{heading.title}'; use ### R{expected}: <name>")
-            continue
-        number = int(match[1])
-        if number in seen:
-            errors.append(f"line {heading.index + 1}: duplicate requirement R{number}")
-        elif number != expected:
-            errors.append(f"line {heading.index + 1}: expected R{expected}, found R{number}; IDs must be sequential in document order")
-        seen.add(number)
-        if not match[2].strip():
-            errors.append(f"line {heading.index + 1}: R{number} requires a nonempty name")
-
-    intro_end = requirements[0].index if requirements else len(lines)
-    short = any(re.match(r"^In short:\s*\S.*$", line) for line in lines[:intro_end])
-    full_format = any(h.level == 2 and h.title in ("At a glance", "Requirements") for h in headings)
-    trivial = short and not full_format and len(requirements) == 1 and requirements[0].title.startswith("R1:") and not features
-    if not trivial and not features:
-        errors.append("## Feature acceptance is required for non-trivial designs; the trivial exception needs an In short: one-liner and a single R1 block without full-format sections")
-    if len(features) > 1:
-        errors.append("duplicate ## Feature acceptance section; keep exactly one")
-
-    # Record ownership so a valid-looking tag cannot silently land outside its section.
-    owned_tags = set()
-
-    def tags(start: int, end: int, names: Tuple[str, ...], owner: str) -> dict:
-        values = {name: TAG_VALUES[name][0] for name in names}
-        found = set()
-        for heading in headings:
-            if not start <= heading.index < end:
-                continue
-            for name in names:
-                if heading.level != 3 or not re.match(re.escape(name) + r"\b", heading.title):
-                    continue
-                owned_tags.add(heading.index)
-                if name in found:
-                    errors.append(f"line {heading.index + 1}: duplicate {name} tag in {owner}")
-                found.add(name)
-                value = heading.title[len(name):].strip()
-                value = value[1:].strip() if value.startswith(":") else ""
-                if value not in TAG_VALUES[name]:
-                    allowed = " | ".join(TAG_VALUES[name])
-                    errors.append(f"line {heading.index + 1}: invalid {name} tag in {owner}; expected {allowed}")
-                else:
-                    values[name] = value
-        return values
-
-    for heading in requirements:
-        end = next((h.index for h in headings if h.index > heading.index and (h.level <= 2 or h in requirements)), len(lines))
-        criteria_end = next((h.index for h in headings if heading.index < h.index < end), end)
-        labels = [i for i in range(heading.index + 1, criteria_end) if CRITERIA.fullmatch(lines[i].strip())]
-        owner = heading.title.split(":", 1)[0]
-        if not labels:
-            errors.append(f"line {heading.index + 1}: {owner} needs a standalone **Acceptance criteria** section")
-        elif len(labels) > 1:
-            errors.append(f"line {labels[1] + 1}: {owner} has duplicate Acceptance criteria sections")
-        elif not has_content(criteria_body(lines, labels[0] + 1, end)):
-            errors.append(f"line {labels[0] + 1}: {owner} Acceptance criteria is empty; add a criterion before the next section")
-        values = tags(heading.index + 1, end, ("Checkpoints", "Review"), owner)
-        summaries.append(f"{owner}: Checkpoints={values['Checkpoints']}, Review={values['Review']}")
-
-    for heading in features:
-        end = next((h.index for h in headings if h.index > heading.index and h.level <= 2), len(lines))
-        if not has_content(criteria_body(lines, heading.index + 1, end)):
-            errors.append(f"line {heading.index + 1}: Feature acceptance is empty; add an end-to-end criterion before its review tag")
-        values = tags(heading.index + 1, end, ("Feature review",), "Feature acceptance")
-        summaries.append(f"Feature review={values['Feature review']}")
-
-    for heading in headings:
-        for name in TAG_VALUES:
-            if re.match(re.escape(name) + r"\b", heading.title) and heading.index not in owned_tags:
-                owner = "## Feature acceptance" if name == "Feature review" else "a ### R<n>: requirement block"
-                errors.append(f"line {heading.index + 1}: {name} must be a ### tag inside {owner}")
-    return errors, summaries
-
-
-def main(argv: Optional[List[str]] = None) -> int:
-    parser = argparse.ArgumentParser(
-        description="Read-only structural design validation. Requires Python 3.9+; standard library only. Semantic correctness is not verified.",
-        epilog="Pass an explicit design path. Absolute paths are used directly; relative paths resolve from the caller's working directory (cwd), not the installed skill directory.",
-    )
-    parser.add_argument("design", type=Path, help="UTF-8 Markdown design file (quote paths containing spaces)")
-    args = parser.parse_args(argv)
-    if sys.version_info < (3, 9):
-        print("Python 3.9+ is required; supply a compatible runtime before validation.", file=sys.stderr)
-        return 2
-    try:
-        text = args.design.read_text(encoding="utf-8")
-    except (OSError, UnicodeError, ValueError) as error:
-        print(f"{args.design}: cannot read UTF-8 design: {error}", file=sys.stderr)
-        return 2
-    errors, summaries = validate(text)
-    if errors:
-        for error in errors:
-            print(f"{args.design}: {error}", file=sys.stderr)
-        return 1
-    print(f"{args.design}: structural checks passed. Semantic correctness is not verified.")
-    for summary in summaries:
-        print(f"  {summary}")
-    return 0
-
-
-if __name__ == "__main__":
-    sys.exit(main())
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 22e8dbd..38629a8 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -102,7 +102,7 @@ A spec-reviewer report without a per-requirement coverage table is invalid — r
 
 Run **one** review over the **whole feature diff**, driven by the design doc’s `### Feature review` tag — exactly one per part, never once per requirement.
 
-**Assemble the review packet first** — run `scripts/stage-check.mjs` and stop on a non-zero exit, then read [Review mechanics](references/review.md#assemble-evidence) and invoke `scripts/build-review-packet.py` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `python3 --version` for Python 3.9+; if missing, report the blocker, request a suitable runtime, and stop — never auto-install, use a fallback, or claim the packet succeeded. No packet byte passes through model output; a failed helper is never evidence or approval. It writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.
+**Assemble the review packet first** — run `scripts/stage-check.mjs` and stop on a non-zero exit, then read [Review mechanics](references/review.md#assemble-evidence) and invoke `scripts/build-review-packet.mjs` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `node --version`; if missing, report the blocker, request a suitable runtime, and stop — never auto-install, use a fallback, or claim the packet succeeded. No packet byte passes through model output; a failed helper is never evidence or approval. It writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.
 
 - **Resolve the tag first.** `auto` (the default, and what a missing tag means) resolves on the design’s production-risk content: a non-empty `## Production-risk areas` section or any `### Production-risk notes` → `parallel`; otherwise `inline`. An explicit tag wins over `auto` in both directions.
 - **`parallel`** — use the host’s `parallel-review` capability for four independent, fresh-context, read-only roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`. Follow [Review mechanics](references/review.md#delegate-or-review-inline): a one-liner packet-file pointer with role framing last — the packet never appears in spawn arguments. Collect one outcome per role. Reviewers only report; you apply smell fixes, commit, and re-green. Surface trace/spec/hazard findings to the human.
diff --git a/skills/pwk-executing-tasks/references/review.md b/skills/pwk-executing-tasks/references/review.md
index c06474d..6eaddbb 100644
--- a/skills/pwk-executing-tasks/references/review.md
+++ b/skills/pwk-executing-tasks/references/review.md
@@ -6,10 +6,10 @@ Read before any review, packet refresh, or digest write.
 
 **Assemble the review packet first** — once, by script, so that no packet byte passes through model output. The Commit column fixes both spans: feature base = `git rev-parse <first Commit-column entry>^`, the parent of the first recorded commit; a requirement packet spans the previous requirement's last commit (exclusive) to this one's last commit (inclusive), R1's exclusive bound being its own parent. No `merge-base` guessing. Commits landing mid-review → re-run the recipe before spawning a replacement role, so the packet matches HEAD:
 
-Use the installed skill directory, not a repository checkout; a missing runtime or helper (`python3 --version` ≥ 3.9) → report it and stop, with no auto-install or fallback.
+Use the installed skill directory, not a repository checkout; a missing runtime or helper (`node --version`) → report it and stop, with no auto-install or fallback.
 
 ```sh
-python3 "<executing-skill-dir>/scripts/build-review-packet.py" \
+node "<executing-skill-dir>/scripts/build-review-packet.mjs" \
   --project "<repo-root>" \
   --design "docs/plans/<date>-<topic>/<leaf>-design.md" \
   --progress "docs/plans/<date>-<topic>/<leaf>-progress.md" \
diff --git a/skills/pwk-executing-tasks/scripts/build-review-packet.mjs b/skills/pwk-executing-tasks/scripts/build-review-packet.mjs
new file mode 100644
index 0000000..718df53
--- /dev/null
+++ b/skills/pwk-executing-tasks/scripts/build-review-packet.mjs
@@ -0,0 +1,399 @@
+#!/usr/bin/env node
+/**
+ * Build review evidence from explicit, immutable Git bounds.
+ *
+ * Usage: node build-review-packet.mjs --project <root> --design <path> --progress <path> --scope feature|requirement [--requirement N]
+ */
+import { spawnSync } from "node:child_process";
+import { constants, lstatSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
+import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
+import { parseArgs } from "node:util";
+
+class PacketError extends Error {}
+
+/** Keep original lines for evidence; inspect headings only outside fenced examples. */
+class Document {
+  constructor(path) {
+    // A strict decode, as Python's open(encoding="utf-8") is: reading as utf8 would replace
+    // invalid bytes and build a packet from damaged evidence.
+    this.lines = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)).split(/(?<=\n)/);
+    this.headings = [];
+    this.visible = new Set();
+    let fence = null;
+    this.lines.forEach((line, index) => {
+      const stripped = line.replace(/\r?\n$/, "");
+      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(stripped);
+      if (fence) {
+        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
+        return;
+      }
+      if (marker) {
+        fence = marker[1];
+        return;
+      }
+      this.visible.add(index);
+      const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(stripped);
+      if (heading) this.headings.push([index, heading[1].length, heading[2]]);
+    });
+    if (fence) throw new PacketError(`${basename(path)}: unclosed code fence`);
+  }
+
+  section(title, level = 2, required = false) {
+    const matches = this.headings.filter(([, depth, text]) => depth === level && text === title);
+    if (matches.length > 1 || (required && matches.length === 0)) {
+      throw new PacketError(`expected one ${title} section; found ${matches.length}`);
+    }
+    if (matches.length === 0) return null;
+    const start = matches[0][0];
+    const end = this.headings.find(([index, depth]) => index > start && depth <= level)?.[0] ?? this.lines.length;
+    return [start, end];
+  }
+
+  text(start, end) {
+    return this.lines.slice(start, end).join("");
+  }
+}
+
+function git(project, ...args) {
+  const result = spawnSync("git", ["-C", String(project), ...args], {
+    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
+    encoding: "utf8",
+  });
+  if (result.status !== 0) {
+    throw new PacketError(`git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
+  }
+  return result.stdout;
+}
+
+const isSymlink = (path) => {
+  try {
+    return lstatSync(path).isSymbolicLink();
+  } catch {
+    return false;
+  }
+};
+
+function resolveInput(project, value) {
+  const path = isAbsolute(value) ? value : join(project, value);
+  return realpathSync(path);
+}
+
+/** POSIX-style relative segments, or null when the child is outside the parent. */
+function relativeParts(child, parent) {
+  const rel = relative(parent, child);
+  if (!rel || rel === "" || rel.startsWith("..")) return null;
+  return rel.split(/[\\/]/);
+}
+
+function validateDestination(path) {
+  if (isSymlink(path)) throw new PacketError("packet destination must be a regular file, not a symlink or directory");
+  try {
+    if (!lstatSync(path).isFile()) {
+      throw new PacketError("packet destination must be a regular file, not a symlink or directory");
+    }
+  } catch (error) {
+    if (error instanceof PacketError) throw error;
+  }
+}
+
+function paths(args) {
+  const project = realpathSync(resolve(args.project));
+  if (resolve(git(project, "rev-parse", "--show-toplevel").trim()) !== project) {
+    throw new PacketError("--project must be the Git worktree root");
+  }
+  for (const value of [args.design, args.progress]) {
+    const supplied = resolve(isAbsolute(value) ? value : join(project, value));
+    const lexicalProject = resolve(args.project);
+    let rel = relativeParts(supplied, lexicalProject);
+    if (!rel) rel = relativeParts(supplied, project);
+    if (!rel) throw new PacketError(`${value} is outside the project`);
+    let current = project;
+    for (const part of rel) {
+      current = join(current, part);
+      if (isSymlink(current)) throw new PacketError("design/progress paths must not traverse symlinks");
+    }
+  }
+  const design = resolveInput(project, args.design);
+  const progress = resolveInput(project, args.progress);
+  const relativeTopic = relativeParts(design, join(project, "docs", "plans"));
+  if (
+    !relativeTopic ||
+    relativeTopic.length !== 2 ||
+    relativeTopic[0] === "completed" ||
+    !design.endsWith("-design.md")
+  ) {
+    throw new PacketError("design must be docs/plans/<topic>/<leaf>-design.md in an active topic");
+  }
+  const leaf = basename(design).slice(0, -"-design.md".length);
+  if (!leaf || progress !== join(dirname(design), `${leaf}-progress.md`)) {
+    throw new PacketError("progress must be the matching <leaf>-progress.md beside the design");
+  }
+  for (const directory of [
+    join(project, "docs"),
+    join(project, "docs", "plans"),
+    join(project, "docs", "plans", relativeTopic[0]),
+  ]) {
+    if (isSymlink(directory)) throw new PacketError("symlink topic directories are not writable packet destinations");
+  }
+  const suffix = args.scope === "feature" ? "" : `-r${args.requirement}`;
+  const destination = join(dirname(design), `${leaf}-review-packet${suffix}.md`);
+  validateDestination(destination);
+  return { project, design, progress, destination };
+}
+
+function requirements(document) {
+  const region = document.section("Requirements", 2, true);
+  const headings = [];
+  for (const [index, depth, title] of document.headings) {
+    const match = /^R([1-9][0-9]*):\s*\S/.exec(title);
+    if (depth === 3 && /^R[0-9]/.test(title) && !match) throw new PacketError("malformed requirement heading");
+    if (depth === 3 && match) {
+      if (!(region[0] < index && index < region[1])) {
+        throw new PacketError("requirement heading outside Requirements section");
+      }
+      headings.push([Number(match[1]), index]);
+    }
+  }
+  const numbers = headings.map(([number]) => number);
+  if (numbers.length === 0 || new Set(numbers).size !== numbers.length) {
+    throw new PacketError("missing or duplicate requirement headings");
+  }
+  return { headings, region };
+}
+
+function progressRows(document, project, design) {
+  const firstHeading = document.headings.find(([, depth]) => depth === 2)?.[0] ?? document.lines.length;
+  const pointers = [...document.visible]
+    .filter((index) => index < firstHeading && document.lines[index].startsWith("Design: "))
+    .map((index) => document.lines[index].trim().slice(8));
+  if (pointers.length !== 1 || resolveInput(project, pointers[0]) !== design) {
+    throw new PacketError("progress Design header must identify the selected design exactly once");
+  }
+  const [start, end] = document.section("Requirements", 2, true);
+  const lines = [];
+  for (let index = start + 1; index < end; index += 1) {
+    if (document.visible.has(index) && document.lines[index].trim()) lines.push(document.lines[index].trim());
+  }
+  if (lines.length < 3) throw new PacketError("missing Requirements table");
+
+  const cells = (line) => {
+    if (!line.startsWith("|") || !line.endsWith("|")) throw new PacketError("malformed Requirements table row");
+    return line
+      .split(/(?<!\\)\|/)
+      .slice(1, -1)
+      .map((cell) => cell.trim());
+  };
+
+  const header = cells(lines[0]);
+  if (header.join("|") !== ["#", "Done", "Requirement", "Per-req ceremony", "Commit"].join("|")) {
+    throw new PacketError("Requirements table must have #, Done, Requirement, Per-req ceremony, Commit columns");
+  }
+  const separator = cells(lines[1]);
+  if (separator.length !== 5 || !separator.every((cell) => /^:?-+:?$/.test(cell))) {
+    throw new PacketError("malformed Requirements table separator");
+  }
+  const rows = new Map();
+  for (const line of lines.slice(2)) {
+    const row = cells(line);
+    if (row.length !== 5 || !/^[1-9][0-9]*$/.test(row[0])) throw new PacketError("malformed Requirements table row");
+    const number = Number(row[0]);
+    if (rows.has(number)) throw new PacketError(`duplicate R${number} progress row`);
+    if (!["", "⬜", "🔄", "✅", "❌", "⏭"].includes(row[1])) throw new PacketError(`R${number}: invalid Done cell`);
+    rows.set(number, row);
+  }
+  return rows;
+}
+
+function bounds(project, rows, headings, args) {
+  const numbers = headings.map(([number]) => number);
+  const position = args.scope === "requirement" ? numbers.indexOf(args.requirement) : null;
+  const relevant = position === null ? numbers : numbers.slice(Math.max(0, position - 1), position + 1);
+  if ([...rows.keys()].some((number) => !numbers.includes(number))) {
+    throw new PacketError("progress contains requirements absent from the design");
+  }
+  const recorded = new Map();
+  let previous = null;
+  const currentHead = git(project, "rev-parse", "--verify", "HEAD^{commit}").trim();
+  for (const number of relevant) {
+    if (!rows.has(number)) throw new PacketError(`R${number}: missing progress row`);
+    const row = rows.get(number);
+    const value = row[4];
+    if (value === "" || value === "—" || value === "-") {
+      if (!["❌", "⏭"].includes(row[1])) throw new PacketError(`R${number}: missing Commit entry`);
+      recorded.set(number, []);
+      continue;
+    }
+    // An ordered whitespace-separated list supports review-fix commits without losing the
+    // first feature commit. Other formats are ambiguous, never mined for hashes.
+    const entries = value.split(/\s+/).filter(Boolean);
+    if (!entries.every((entry) => /^[0-9a-fA-F]{7,64}$/.test(entry))) {
+      throw new PacketError(`R${number}: Commit must contain only ordered hexadecimal commit IDs`);
+    }
+    const commits = [];
+    for (const entry of entries) {
+      const commit = git(project, "rev-parse", "--verify", `${entry}^{commit}`).trim();
+      if (previous) {
+        if (previous === commit) throw new PacketError("duplicate or overlapping recorded commits");
+        git(project, "merge-base", "--is-ancestor", previous, commit);
+      }
+      git(project, "merge-base", "--is-ancestor", commit, currentHead);
+      commits.push(commit);
+      previous = commit;
+    }
+    recorded.set(number, commits);
+  }
+  if (args.scope === "feature") {
+    const first = [...recorded.values()].find((commits) => commits.length > 0)?.[0] ?? null;
+    if (!first) throw new PacketError("no recorded commits; cannot infer a feature base");
+    return [git(project, "rev-parse", "--verify", `${first}^`).trim(), currentHead];
+  }
+  const selected = recorded.get(args.requirement);
+  if (!selected?.length) throw new PacketError("selected requirement has no recorded bound");
+  if (position === 0) return [git(project, "rev-parse", "--verify", `${selected[0]}^`).trim(), selected.at(-1)];
+  const prior = recorded.get(numbers[position - 1]);
+  if (!prior?.length) throw new PacketError("previous requirement has no recorded bound; cannot guess a range");
+  return [prior.at(-1), selected.at(-1)];
+}
+
+function evidence(document, headings, region, args) {
+  const feature = document.section("Feature acceptance");
+  if (feature && feature[0] < region[1]) throw new PacketError("Feature acceptance must follow Requirements");
+  let start;
+  let end;
+  if (args.scope === "feature") {
+    start = headings[0][1];
+    end = feature ? feature[0] : document.lines.length;
+  } else {
+    const position = headings.findIndex(([number]) => number === args.requirement);
+    start = headings[position][1];
+    end = position + 1 < headings.length ? headings[position + 1][1] : region[1];
+  }
+  const criteria = document.text(start, end);
+  let acceptance = "";
+  if (feature) {
+    const stop =
+      document.headings.find(
+        ([index, depth, title]) =>
+          feature[0] < index && index < feature[1] && depth === 3 && title.startsWith("Feature review:"),
+      )?.[0] ?? feature[1];
+    acceptance = document.text(feature[0], stop);
+  }
+  const notes = [];
+  for (const [index, depth, title] of document.headings) {
+    if (depth === 3 && title === "Production-risk notes" && start <= index && index < end) {
+      const stop =
+        document.headings.find(([i, d, t]) => i > index && (d <= 2 || (d === 3 && /^R[0-9]+:/.test(t))))?.[0] ??
+        document.lines.length;
+      notes.push(document.text(index, Math.min(stop, end)));
+    }
+  }
+  const risk = document.section("Production-risk areas");
+  if (risk) notes.push(document.text(risk[0], risk[1]));
+  return { criteria, acceptance, notes: notes.join("") };
+}
+
+function build(args) {
+  const { project, design: designPath, progress: progressPath, destination } = paths(args);
+  const design = new Document(designPath);
+  const { headings, region } = requirements(design);
+  if (args.scope === "requirement" && !headings.some(([number]) => number === args.requirement)) {
+    throw new PacketError("selected requirement is absent from the design");
+  }
+  const rows = progressRows(new Document(progressPath), project, designPath);
+  const [base, head] = bounds(project, rows, headings, args);
+  const { criteria, acceptance, notes } = evidence(design, headings, region, args);
+  const span = `${base}..${head}`;
+  const pathspec = ["--", ".", ":(glob,exclude)**/*-review-packet*.md"];
+  const sections = [
+    ["Commits", git(project, "log", "--oneline", "--no-decorate", span)],
+    ["Changed files", git(project, "diff", "--no-ext-diff", "--no-textconv", "--stat", span, ...pathspec)],
+    ["Acceptance criteria (verbatim from the design doc)", criteria],
+    ["Feature acceptance (verbatim)", acceptance],
+    ["Production-risk notes (verbatim, if any)", notes],
+    ["Diff", git(project, "diff", "--no-ext-diff", "--no-textconv", "--no-color", span, ...pathspec)],
+  ];
+  const label = args.scope === "feature" ? "feature review" : `requirement R${args.requirement} review`;
+  // The blank line between Base and Head is load-bearing: CommonMark merges consecutive
+  // plain lines into one paragraph in every preview.
+  let packet = `# Review packet: ${basename(dirname(designPath))} — ${label}\n\nBase: ${base}\n\nHead: ${head}\n\n`;
+  for (const [title, content] of sections) packet += `## ${title}\n\n${content}\n`;
+
+  // Every parse and Git read finishes before a temporary file exists, so a failure in
+  // assembly leaves an earlier complete packet intact. Replacement is same-directory.
+  let temporary = null;
+  try {
+    validateDestination(destination);
+    temporary = join(dirname(destination), `.${basename(destination)}.${process.pid}${Date.now()}`);
+    writeFileSync(temporary, packet, {
+      encoding: "utf8",
+      flag: constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
+    });
+    validateDestination(destination);
+    renameSync(temporary, destination);
+    temporary = null;
+  } finally {
+    if (temporary) {
+      try {
+        unlinkSync(temporary);
+      } catch {
+        // The temporary file is already gone.
+      }
+    }
+  }
+  console.log(`Wrote ${destination}\nRange: ${base}..${head}`);
+}
+
+if (process.argv.includes("-h") || process.argv.includes("--help")) {
+  console.log(`usage: node build-review-packet.mjs --project <root> --design <path> --progress <path> --scope feature|requirement [--requirement N]
+
+Build review evidence from explicit, immutable Git bounds, with Node's standard library only.
+
+--project resolves from the caller cwd and must be a Git worktree root. --design and --progress are absolute or relative to --project, not the skill or cwd. Output is <leaf>-review-packet[-rN].md beside the matched docs in docs/plans/<topic>/. Commit cells contain ordered whitespace-separated hexadecimal commit IDs, not revision expressions.`);
+  process.exit(0);
+}
+
+const { values } = (() => {
+  try {
+    return parseArgs({
+      args: process.argv.slice(2),
+      allowPositionals: false,
+      options: {
+        project: { type: "string" },
+        design: { type: "string" },
+        progress: { type: "string" },
+        scope: { type: "string" },
+        requirement: { type: "string" },
+      },
+    });
+  } catch (error) {
+    console.error(`error: ${error.message}`);
+    process.exit(2);
+  }
+})();
+for (const required of ["project", "design", "progress", "scope"]) {
+  if (!values[required]) {
+    console.error(`error: --${required} is required`);
+    process.exit(2);
+  }
+}
+if (!["feature", "requirement"].includes(values.scope)) {
+  console.error("error: --scope must be feature or requirement");
+  process.exit(2);
+}
+const requirement = values.requirement === undefined ? undefined : Number(values.requirement);
+if ((values.scope === "requirement") !== (requirement !== undefined)) {
+  console.error("error: --requirement N is required only for --scope requirement");
+  process.exit(2);
+}
+try {
+  build({
+    project: values.project,
+    design: values.design,
+    progress: values.progress,
+    scope: values.scope,
+    requirement,
+  });
+} catch (error) {
+  console.error(`error: ${error.message}`);
+  process.exit(1);
+}
diff --git a/skills/pwk-executing-tasks/scripts/build-review-packet.py b/skills/pwk-executing-tasks/scripts/build-review-packet.py
deleted file mode 100644
index 8a533f0..0000000
--- a/skills/pwk-executing-tasks/scripts/build-review-packet.py
+++ /dev/null
@@ -1,320 +0,0 @@
-#!/usr/bin/env python3
-"""Build review evidence from explicit, immutable Git bounds. Python 3.9+, stdlib only."""
-
-import argparse
-import os
-from pathlib import Path
-import re
-import subprocess
-import sys
-import tempfile
-
-
-class PacketError(Exception):
-    pass
-
-
-class Document:
-    """Keep original lines for evidence; inspect headings only outside fenced examples."""
-
-    def __init__(self, path):
-        with path.open(encoding='utf-8', newline='') as source:
-            self.lines = source.readlines()
-        self.headings = []
-        self.visible = set()
-        fence = None
-        for index, line in enumerate(self.lines):
-            marker = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', line.rstrip('\r\n'))
-            if fence:
-                if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence) and not marker[2].strip():
-                    fence = None
-                continue
-            if marker:
-                fence = marker[1]
-                continue
-            self.visible.add(index)
-            heading = re.match(r'^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$', line.rstrip('\r\n'))
-            if heading:
-                self.headings.append((index, len(heading[1]), heading[2]))
-        if fence:
-            raise PacketError(f'{path.name}: unclosed code fence')
-
-    def section(self, title, level=2, required=False):
-        matches = [h for h in self.headings if h[1:] == (level, title)]
-        if len(matches) > 1 or (required and not matches):
-            raise PacketError(f'expected one {title} section; found {len(matches)}')
-        if not matches:
-            return None
-        start = matches[0][0]
-        end = next((i for i, depth, _ in self.headings if i > start and depth <= level), len(self.lines))
-        return start, end
-
-    def text(self, start, end):
-        return ''.join(self.lines[start:end])
-
-
-def git(project, *args):
-    result = subprocess.run(
-        ['git', '-C', str(project), *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
-        env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0', 'GIT_TERMINAL_PROMPT': '0'},
-    )
-    if result.returncode:
-        invocation = ' '.join(['git', *args])
-        raise PacketError(f'{invocation} failed: {result.stderr.decode("utf-8", errors="replace").strip()}')
-    return result.stdout.decode('utf-8', errors='replace')
-
-
-def resolve_input(project, value):
-    path = Path(value)
-    return (path if path.is_absolute() else project / path).resolve(strict=True)
-
-
-def paths(args):
-    project = Path(args.project).resolve(strict=True)
-    if Path(git(project, 'rev-parse', '--show-toplevel').strip()).resolve() != project:
-        raise PacketError('--project must be the Git worktree root')
-    for value in (args.design, args.progress):
-        supplied = Path(value)
-        supplied = Path(os.path.abspath(supplied if supplied.is_absolute() else project / supplied))
-        lexical_project = Path(os.path.abspath(args.project))
-        try:
-            relative_input = supplied.relative_to(lexical_project)
-        except ValueError:
-            relative_input = supplied.relative_to(project)
-        current = project
-        for part in relative_input.parts:
-            current = current / part
-            if current.is_symlink():
-                raise PacketError('design/progress paths must not traverse symlinks')
-    design = resolve_input(project, args.design)
-    progress = resolve_input(project, args.progress)
-    relative = design.relative_to(project / 'docs' / 'plans')
-    if len(relative.parts) != 2 or relative.parts[0] == 'completed' or not design.name.endswith('-design.md'):
-        raise PacketError('design must be docs/plans/<topic>/<leaf>-design.md in an active topic')
-    leaf = design.name[:-len('-design.md')]
-    if not leaf or progress != design.with_name(f'{leaf}-progress.md'):
-        raise PacketError('progress must be the matching <leaf>-progress.md beside the design')
-    # Resolving inputs must not route a packet write through symlinked topic directories.
-    lexical_topic = project / 'docs' / 'plans' / relative.parts[0]
-    for directory in (project / 'docs', project / 'docs' / 'plans', lexical_topic):
-        if directory.is_symlink():
-            raise PacketError('symlink topic directories are not writable packet destinations')
-    suffix = '' if args.scope == 'feature' else f'-r{args.requirement}'
-    destination = design.with_name(f'{leaf}-review-packet{suffix}.md')
-    validate_destination(destination)
-    return project, design, progress, destination
-
-
-def validate_destination(path):
-    if path.is_symlink() or (path.exists() and not path.is_file()):
-        raise PacketError('packet destination must be a regular file, not a symlink or directory')
-
-
-def requirements(document):
-    region = document.section('Requirements', required=True)
-    headings = []
-    for index, depth, title in document.headings:
-        match = re.match(r'^R([1-9][0-9]*):\s*\S', title)
-        if depth == 3 and re.match(r'^R[0-9]', title) and not match:
-            raise PacketError('malformed requirement heading')
-        if depth == 3 and match:
-            if not region[0] < index < region[1]:
-                raise PacketError('requirement heading outside Requirements section')
-            headings.append((int(match[1]), index))
-    numbers = [number for number, _ in headings]
-    if not numbers or len(set(numbers)) != len(numbers):
-        raise PacketError('missing or duplicate requirement headings')
-    return headings, region
-
-
-def progress_rows(document, project, design):
-    first_heading = next((i for i, depth, _ in document.headings if depth == 2), len(document.lines))
-    pointers = [document.lines[i].strip()[8:] for i in document.visible
-                if i < first_heading and document.lines[i].startswith('Design: ')]
-    if len(pointers) != 1 or resolve_input(project, pointers[0]) != design:
-        raise PacketError('progress Design header must identify the selected design exactly once')
-    start, end = document.section('Requirements', required=True)
-    lines = [document.lines[i].strip() for i in range(start + 1, end)
-             if i in document.visible and document.lines[i].strip()]
-    if len(lines) < 3:
-        raise PacketError('missing Requirements table')
-
-    def cells(line):
-        if not line.startswith('|') or not line.endswith('|'):
-            raise PacketError('malformed Requirements table row')
-        return [cell.strip() for cell in re.split(r'(?<!\\)\|', line)[1:-1]]
-
-    header = cells(lines[0])
-    if header != ['#', 'Done', 'Requirement', 'Per-req ceremony', 'Commit']:
-        raise PacketError('Requirements table must have #, Done, Requirement, Per-req ceremony, Commit columns')
-    separator = cells(lines[1])
-    if len(separator) != 5 or not all(re.fullmatch(r':?-+:?', cell) for cell in separator):
-        raise PacketError('malformed Requirements table separator')
-    rows = {}
-    for line in lines[2:]:
-        row = cells(line)
-        if len(row) != 5 or not re.fullmatch(r'[1-9][0-9]*', row[0]):
-            raise PacketError('malformed Requirements table row')
-        number = int(row[0])
-        if number in rows:
-            raise PacketError(f'duplicate R{number} progress row')
-        if row[1] not in ('', '⬜', '🔄', '✅', '❌', '⏭'):
-            raise PacketError(f'R{number}: invalid Done cell')
-        rows[number] = row
-    return rows
-
-
-def bounds(project, rows, headings, args):
-    numbers = [number for number, _ in headings]
-    position = numbers.index(args.requirement) if args.scope == 'requirement' else None
-    relevant = numbers if position is None else numbers[max(0, position - 1):position + 1]
-    if set(rows) - set(numbers):
-        raise PacketError('progress contains requirements absent from the design')
-    recorded = {}
-    previous = None
-    current_head = git(project, 'rev-parse', '--verify', 'HEAD^{commit}').strip()
-    for number in relevant:
-        if number not in rows:
-            raise PacketError(f'R{number}: missing progress row')
-        row = rows[number]
-        value = row[4]
-        if value in ('', '—', '-'):
-            if row[1] not in ('❌', '⏭'):
-                raise PacketError(f'R{number}: missing Commit entry')
-            recorded[number] = []
-            continue
-        # An ordered whitespace-separated list supports review-fix commits without losing
-        # the first feature commit. Other formats are ambiguous, never mined for hashes.
-        entries = value.split()
-        if not all(re.fullmatch(r'[0-9a-fA-F]{7,64}', entry) for entry in entries):
-            raise PacketError(f'R{number}: Commit must contain only ordered hexadecimal commit IDs')
-        commits = []
-        for entry in entries:
-            commit = git(project, 'rev-parse', '--verify', f'{entry}^{{commit}}').strip()
-            if previous:
-                if previous == commit:
-                    raise PacketError('duplicate or overlapping recorded commits')
-                git(project, 'merge-base', '--is-ancestor', previous, commit)
-            git(project, 'merge-base', '--is-ancestor', commit, current_head)
-            commits.append(commit)
-            previous = commit
-        recorded[number] = commits
-    if args.scope == 'feature':
-        first = next((commits[0] for commits in recorded.values() if commits), None)
-        if not first:
-            raise PacketError('no recorded commits; cannot infer a feature base')
-        return git(project, 'rev-parse', '--verify', f'{first}^').strip(), current_head
-    selected = recorded[args.requirement]
-    if not selected:
-        raise PacketError('selected requirement has no recorded bound')
-    if position == 0:
-        base = git(project, 'rev-parse', '--verify', f'{selected[0]}^').strip()
-    else:
-        prior = recorded[numbers[position - 1]]
-        if not prior:
-            raise PacketError('previous requirement has no recorded bound; cannot guess a range')
-        base = prior[-1]
-    return base, selected[-1]
-
-
-def evidence(document, headings, region, args):
-    feature = document.section('Feature acceptance')
-    if feature and feature[0] < region[1]:
-        raise PacketError('Feature acceptance must follow Requirements')
-    if args.scope == 'feature':
-        start = headings[0][1]
-        end = feature[0] if feature else len(document.lines)
-    else:
-        position = next(i for i, (number, _) in enumerate(headings) if number == args.requirement)
-        start = headings[position][1]
-        end = headings[position + 1][1] if position + 1 < len(headings) else region[1]
-    criteria = document.text(start, end)
-    acceptance = ''
-    if feature:
-        stop = next((i for i, depth, title in document.headings
-                     if feature[0] < i < feature[1] and depth == 3 and title.startswith('Feature review:')), feature[1])
-        acceptance = document.text(feature[0], stop)
-    notes = []
-    for index, depth, title in document.headings:
-        if depth == 3 and title == 'Production-risk notes' and start <= index < end:
-            stop = next((i for i, d, t in document.headings if i > index and
-                         (d <= 2 or (d == 3 and re.match(r'^R[0-9]+:', t)))), len(document.lines))
-            notes.append(document.text(index, min(stop, end)))
-    risk = document.section('Production-risk areas')
-    if risk:
-        notes.append(document.text(*risk))
-    return criteria, acceptance, ''.join(notes)
-
-
-def build(args):
-    project, design_path, progress_path, destination = paths(args)
-    design = Document(design_path)
-    headings, region = requirements(design)
-    if args.scope == 'requirement' and args.requirement not in [n for n, _ in headings]:
-        raise PacketError('selected requirement is absent from the design')
-    rows = progress_rows(Document(progress_path), project, design_path)
-    base, head = bounds(project, rows, headings, args)
-    criteria, acceptance, notes = evidence(design, headings, region, args)
-    span = f'{base}..{head}'
-    pathspec = ['--', '.', ':(glob,exclude)**/*-review-packet*.md']
-    sections = [
-        ('Commits', git(project, 'log', '--oneline', '--no-decorate', span)),
-        ('Changed files', git(project, 'diff', '--no-ext-diff', '--no-textconv', '--stat', span, *pathspec)),
-        ('Acceptance criteria (verbatim from the design doc)', criteria),
-        ('Feature acceptance (verbatim)', acceptance),
-        ('Production-risk notes (verbatim, if any)', notes),
-        ('Diff', git(project, 'diff', '--no-ext-diff', '--no-textconv', '--no-color', span, *pathspec)),
-    ]
-    label = 'feature review' if args.scope == 'feature' else f'requirement R{args.requirement} review'
-    # The blank line between Base and Head is load-bearing: CommonMark merges
-    # consecutive plain lines into one paragraph in every preview.
-    packet = f'# Review packet: {design_path.parent.name} — {label}\n\nBase: {base}\n\nHead: {head}\n\n'
-    for title, content in sections:
-        packet += f'## {title}\n\n{content}\n'
-    # All parsing and Git reads finish before a temporary file exists. A failure in
-    # assembly leaves an earlier complete packet intact. Replacement is same-directory.
-    temporary = None
-    try:
-        validate_destination(destination)
-        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='', dir=destination.parent,
-                                         prefix=f'.{destination.name}.', delete=False) as output:
-            temporary = Path(output.name)
-            output.write(packet)
-            output.flush()
-            os.fsync(output.fileno())
-        validate_destination(destination)
-        os.replace(temporary, destination)
-        temporary = None
-    finally:
-        if temporary is not None:
-            temporary.unlink()
-    print(f'Wrote {destination}\nRange: {base}..{head}')
-
-
-def main():
-    parser = argparse.ArgumentParser(description=__doc__, epilog=(
-        '--project resolves from the caller cwd and must be a Git worktree root. '
-        '--design and --progress are absolute or relative to --project, not the skill or cwd. '
-        'Output is <leaf>-review-packet[-rN].md beside the matched docs in docs/plans/<topic>/. '
-        'Commit cells contain ordered whitespace-separated hexadecimal commit IDs, not revision expressions.'
-    ))
-    parser.add_argument('--project', required=True)
-    parser.add_argument('--design', required=True)
-    parser.add_argument('--progress', required=True)
-    parser.add_argument('--scope', choices=['feature', 'requirement'], required=True)
-    parser.add_argument('--requirement', type=int)
-    args = parser.parse_args()
-    if (args.scope == 'requirement') != (args.requirement is not None):
-        parser.error('--requirement N is required only for --scope requirement')
-    try:
-        if sys.version_info < (3, 9):
-            raise PacketError('Python 3.9 or newer is required; install it explicitly before retrying')
-        build(args)
-    except (PacketError, OSError, ValueError) as error:
-        print(f'error: {error}', file=sys.stderr)
-        return 1
-    return 0
-
-
-if __name__ == '__main__':
-    sys.exit(main())
diff --git a/tests/design-validator.test.ts b/tests/design-validator.test.ts
index fcc9bed..942a3c5 100644
--- a/tests/design-validator.test.ts
+++ b/tests/design-validator.test.ts
@@ -7,7 +7,7 @@ import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
 
 const root = dirname(dirname(fileURLToPath(import.meta.url)));
 const skill = join(root, "skills/pwk-brainstorming");
-const script = join(skill, "scripts/validate-design.py");
+const script = join(skill, "scripts/validate-design.mjs");
 const criterion = "- Given an input, When it is processed, Then the result is returned.";
 const requirement = (id = 1, tags = "") => `### R${id}: Observable outcome
 A caller receives a result.
@@ -33,14 +33,8 @@ let workspace: string;
 let cwd: string;
 let input: string;
 const run = (args: string[] = [input], helper = script) =>
-  spawnSync("python3", [helper, ...args], { cwd, encoding: "utf8", timeout: 10000 });
+  spawnSync("node", [helper, ...args], { cwd, encoding: "utf8", timeout: 10000 });
 
-beforeAll(() => {
-  const python = spawnSync("python3", ["-c", "import sys; sys.exit(sys.version_info < (3, 9))"]);
-  if (python.error || python.status !== 0) {
-    throw new Error("Python 3.9+ is required for design-validator tests; supply it before running (no auto-install).");
-  }
-});
 beforeEach(() => {
   workspace = mkdtempSync(join(tmpdir(), "pwk validator "));
   cwd = join(workspace, "unrelated cwd");
@@ -198,14 +192,14 @@ describe("design validator CLI", () => {
     cpSync(skill, copied, { recursive: true });
     writeFileSync(input, design());
     for (const path of [input, relative(cwd, input)]) {
-      const result = run([path], join(copied, "scripts/validate-design.py"));
+      const result = run([path], join(copied, "scripts/validate-design.mjs"));
       expect(result.status, result.stderr).toBe(0);
     }
   });
-  it("documents path interpretation and Python prerequisite in --help", () => {
+  it("documents path interpretation and its runtime in --help", () => {
     const result = run(["--help"]);
     expect(result.status).toBe(0);
-    expect(result.stdout).toMatch(/Python 3\.9/);
+    expect(result.stdout).toMatch(/Node/);
     expect(result.stdout).toMatch(/relative[\s\S]*(working directory|cwd)/i);
   });
   it("reports missing, non-file, and non-UTF-8 inputs without a traceback", () => {
diff --git a/tests/fixtures/design-validator/cjk-criteria.txt b/tests/fixtures/design-validator/cjk-criteria.txt
new file mode 100644
index 0000000..251a409
--- /dev/null
+++ b/tests/fixtures/design-validator/cjk-criteria.txt
@@ -0,0 +1,4 @@
+# exit: 0
+cjk-criteria.md: structural checks passed. Semantic correctness is not verified.
+  R1: Checkpoints=none, Review=skip
+  Feature review=auto
diff --git a/tests/fixtures/design-validator/cr-line-endings.txt b/tests/fixtures/design-validator/cr-line-endings.txt
new file mode 100644
index 0000000..b524084
--- /dev/null
+++ b/tests/fixtures/design-validator/cr-line-endings.txt
@@ -0,0 +1,4 @@
+# exit: 0
+cr-line-endings.md: structural checks passed. Semantic correctness is not verified.
+  R1: Checkpoints=none, Review=skip
+  Feature review=auto
diff --git a/tests/fixtures/design-validator/duplicate-requirement.txt b/tests/fixtures/design-validator/duplicate-requirement.txt
new file mode 100644
index 0000000..4846e83
--- /dev/null
+++ b/tests/fixtures/design-validator/duplicate-requirement.txt
@@ -0,0 +1,2 @@
+# exit: 1
+duplicate-requirement.md: line 15: duplicate requirement R1
diff --git a/tests/fixtures/design-validator/missing-criteria.txt b/tests/fixtures/design-validator/missing-criteria.txt
new file mode 100644
index 0000000..32b56fa
--- /dev/null
+++ b/tests/fixtures/design-validator/missing-criteria.txt
@@ -0,0 +1,2 @@
+# exit: 1
+missing-criteria.md: line 8: R1 needs a standalone **Acceptance criteria** section
diff --git a/tests/fixtures/design-validator/name-contains-tag.txt b/tests/fixtures/design-validator/name-contains-tag.txt
new file mode 100644
index 0000000..9e17898
--- /dev/null
+++ b/tests/fixtures/design-validator/name-contains-tag.txt
@@ -0,0 +1,4 @@
+# exit: 0
+name-contains-tag.md: structural checks passed. Semantic correctness is not verified.
+  R1: Checkpoints=none, Review=skip
+  Feature review=auto
diff --git a/tests/fixtures/design-validator/no-feature-acceptance.txt b/tests/fixtures/design-validator/no-feature-acceptance.txt
new file mode 100644
index 0000000..a576dce
--- /dev/null
+++ b/tests/fixtures/design-validator/no-feature-acceptance.txt
@@ -0,0 +1,2 @@
+# exit: 1
+no-feature-acceptance.md: ## Feature acceptance is required for non-trivial designs; the trivial exception needs an In short: one-liner and a single R1 block without full-format sections
diff --git a/tests/fixtures/design-validator/non-sequential.txt b/tests/fixtures/design-validator/non-sequential.txt
new file mode 100644
index 0000000..1ab941e
--- /dev/null
+++ b/tests/fixtures/design-validator/non-sequential.txt
@@ -0,0 +1,2 @@
+# exit: 1
+non-sequential.md: line 8: expected R1, found R2; IDs must be sequential in document order
diff --git a/tests/fixtures/design-validator/valid-trivial.txt b/tests/fixtures/design-validator/valid-trivial.txt
new file mode 100644
index 0000000..a6f8270
--- /dev/null
+++ b/tests/fixtures/design-validator/valid-trivial.txt
@@ -0,0 +1,3 @@
+# exit: 0
+valid-trivial.md: structural checks passed. Semantic correctness is not verified.
+  R1: Checkpoints=none, Review=skip
diff --git a/tests/fixtures/design-validator/valid.txt b/tests/fixtures/design-validator/valid.txt
new file mode 100644
index 0000000..7d10399
--- /dev/null
+++ b/tests/fixtures/design-validator/valid.txt
@@ -0,0 +1,4 @@
+# exit: 0
+valid.md: structural checks passed. Semantic correctness is not verified.
+  R1: Checkpoints=none, Review=skip
+  Feature review=auto
diff --git a/tests/fixtures/review-packet/fixture-design.md b/tests/fixtures/review-packet/fixture-design.md
new file mode 100644
index 0000000..51abeb2
--- /dev/null
+++ b/tests/fixtures/review-packet/fixture-design.md
@@ -0,0 +1,26 @@
+# Design: Fixture
+
+## At a glance
+
+A fixture design for the packet golden.
+
+| R# | Requirement in one line | Risk |
+|---|-------------------------|------|
+| 1 | A tiny behaviour | — |
+
+## Requirements
+
+### R1: A tiny behaviour
+A caller gets a value.
+
+**Acceptance criteria**
+- Given an input, When it is processed, Then the result is returned.
+
+### Checkpoints: none
+### Review: skip
+
+## Feature acceptance
+
+- Given an input, When it is processed, Then the result is returned.
+
+### Feature review: auto
diff --git a/tests/fixtures/review-packet/fixture-head.txt b/tests/fixtures/review-packet/fixture-head.txt
new file mode 100644
index 0000000..9a35ecc
--- /dev/null
+++ b/tests/fixtures/review-packet/fixture-head.txt
@@ -0,0 +1 @@
+85d1711de42fb64c6d4f5c03afb89b54c1d8416f
diff --git a/tests/fixtures/review-packet/fixture-progress-template.md b/tests/fixtures/review-packet/fixture-progress-template.md
new file mode 100644
index 0000000..205ac8c
--- /dev/null
+++ b/tests/fixtures/review-packet/fixture-progress-template.md
@@ -0,0 +1,27 @@
+# Progress: fixture
+
+Design: docs/plans/2026-01-01-fixture/fixture-design.md
+
+Branch: fixture
+
+Setup: n/a
+
+Started: 2026-01-01T00:00:00Z
+
+Last updated: 2026-01-01T00:00:00Z
+
+Feature phase: done
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | A tiny behaviour | — | HEADOFSECONDCOMMIT |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? | Evidence |
+|----|-------------|------------------|-----------|----------|
+| 1 | A tiny behaviour | It was built. | — | a test ran |
+
+## Deviation records
+
+## Code digest
diff --git a/tests/fixtures/review-packet/packet-golden.md b/tests/fixtures/review-packet/packet-golden.md
new file mode 100644
index 0000000..c6bc048
--- /dev/null
+++ b/tests/fixtures/review-packet/packet-golden.md
@@ -0,0 +1,115 @@
+# Review packet: 2026-01-01-fixture — feature review
+
+Base: 80dcf1e7848130c554f91e5976bc234b6146f1bd
+
+Head: 85d1711de42fb64c6d4f5c03afb89b54c1d8416f
+
+## Commits
+
+85d1711 feat: the tiny behaviour
+b6c2345 docs: add design doc
+
+## Changed files
+
+ docs/plans/2026-01-01-fixture/fixture-design.md   | 26 ++++++++++++++++++++++
+ docs/plans/2026-01-01-fixture/fixture-progress.md | 27 +++++++++++++++++++++++
+ src/index.mjs                                     |  2 +-
+ 3 files changed, 54 insertions(+), 1 deletion(-)
+
+## Acceptance criteria (verbatim from the design doc)
+
+### R1: A tiny behaviour
+A caller gets a value.
+
+**Acceptance criteria**
+- Given an input, When it is processed, Then the result is returned.
+
+### Checkpoints: none
+### Review: skip
+
+
+## Feature acceptance (verbatim)
+
+## Feature acceptance
+
+- Given an input, When it is processed, Then the result is returned.
+
+
+## Production-risk notes (verbatim, if any)
+
+
+## Diff
+
+diff --git a/docs/plans/2026-01-01-fixture/fixture-design.md b/docs/plans/2026-01-01-fixture/fixture-design.md
+new file mode 100644
+index 0000000..51abeb2
+--- /dev/null
++++ b/docs/plans/2026-01-01-fixture/fixture-design.md
+@@ -0,0 +1,26 @@
++# Design: Fixture
++
++## At a glance
++
++A fixture design for the packet golden.
++
++| R# | Requirement in one line | Risk |
++|---|-------------------------|------|
++| 1 | A tiny behaviour | — |
++
++## Requirements
++
++### R1: A tiny behaviour
++A caller gets a value.
++
++**Acceptance criteria**
++- Given an input, When it is processed, Then the result is returned.
++
++### Checkpoints: none
++### Review: skip
++
++## Feature acceptance
++
++- Given an input, When it is processed, Then the result is returned.
++
++### Feature review: auto
+diff --git a/docs/plans/2026-01-01-fixture/fixture-progress.md b/docs/plans/2026-01-01-fixture/fixture-progress.md
+new file mode 100644
+index 0000000..8cf4a8a
+--- /dev/null
++++ b/docs/plans/2026-01-01-fixture/fixture-progress.md
+@@ -0,0 +1,27 @@
++# Progress: fixture
++
++Design: docs/plans/2026-01-01-fixture/fixture-design.md
++
++Branch: fixture
++
++Setup: n/a
++
++Started: 2026-01-01T00:00:00Z
++
++Last updated: 2026-01-01T00:00:00Z
++
++Feature phase: done
++
++## Requirements
++| # | Done | Requirement | Per-req ceremony | Commit |
++|---|------|-------------|-----------------|--------|
++| 1 | ✅ | A tiny behaviour | — | b6c2345 |
++
++## Execution summary
++| R# | Requirement | How it was built | Deviated? | Evidence |
++|----|-------------|------------------|-----------|----------|
++| 1 | A tiny behaviour | It was built. | — | a test ran |
++
++## Deviation records
++
++## Code digest
+diff --git a/src/index.mjs b/src/index.mjs
+index efeee5d..44439d5 100644
+--- a/src/index.mjs
++++ b/src/index.mjs
+@@ -1 +1 @@
+-export const value = 1;
++export const value = 2;
+
diff --git a/tests/node-helpers.test.ts b/tests/node-helpers.test.ts
new file mode 100644
index 0000000..0fc6770
--- /dev/null
+++ b/tests/node-helpers.test.ts
@@ -0,0 +1,199 @@
+import { spawnSync } from "node:child_process";
+import {
+  existsSync,
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+  rmSync,
+  statSync,
+  writeFileSync,
+} from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+
+/**
+ * Per-slice tests for the runtime conversion (deterministic-steps R6).
+ *
+ * The conversion is proven against goldens recorded from the Python helpers while both
+ * existed: a rewrite that changes one byte of a packet, or one line of a diagnostic,
+ * fails here. The fixture repository is built with fixed author and dates, so its commit
+ * hashes are reproducible and the packet golden can hold them.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const FIXTURES = join(repoRoot, "tests/fixtures");
+
+const VALIDATOR = join(repoRoot, "skills/pwk-brainstorming/scripts/validate-design.mjs");
+const PACKET = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.mjs");
+
+const CRITERION = "- Given an input, When it is processed, Then the result is returned.";
+const requirement = (id = 1, tags = "", name = "Observable outcome", body = CRITERION) => `### R${id}: ${name}
+A caller receives a result.
+
+**Acceptance criteria**
+${body}
+
+${tags}`;
+const feature = `## Feature acceptance\n\n${CRITERION}\n`;
+const design = (blocks = requirement(), ending = feature) => `# Design: Example
+
+## At a glance
+Return a useful result.
+
+## Requirements
+
+${blocks}
+
+${ending}`;
+
+const CASES: Record<string, string> = {
+  valid: design(),
+  "valid-trivial": `# Design: Small fix\n\nIn short: Correct the result by fixing the comparison.\n\n${requirement()}`,
+  "missing-criteria": design(
+    `### R1: Observable outcome\nA caller receives a result.\n\n### Checkpoints: none\n### Review: skip\n`,
+  ),
+  "no-feature-acceptance": design(requirement(), ""),
+  "duplicate-requirement": design(`${requirement(1)}\n${requirement(2).replace("R2", "R1")}`),
+  "non-sequential": design(requirement(2)),
+  // A requirement name containing a tag word is not a tag: the detectors anchor at the start.
+  "name-contains-tag": design(requirement(1, "### Checkpoints: none\n### Review: skip", "Deferred Review notes")),
+  // Criteria written in CJK are not empty: word characters include non-ASCII letters.
+  "cjk-criteria": design(
+    requirement(
+      1,
+      "### Checkpoints: none\n### Review: skip",
+      "Observable outcome",
+      "\u7ed9\u5b9a \u8f93\u5165\uff0c\u5f53\u5904\u7406 \u65f6\uff0c\u5219\u8fd4\u56de \u7ed3\u679c\u3002",
+    ),
+  ),
+  // Lone CR line endings still separate headings, as Python's splitlines does.
+  "cr-line-endings": design().replace(/\n/g, "\r"),
+};
+
+/** A git repo whose content and metadata are fixed, so its hashes are reproducible. */
+const GIT_ENV = {
+  ...process.env,
+  GIT_AUTHOR_NAME: "fixture",
+  GIT_AUTHOR_EMAIL: "fixture@local",
+  GIT_COMMITTER_NAME: "fixture",
+  GIT_COMMITTER_EMAIL: "fixture@local",
+  GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
+  GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
+};
+
+function buildPacketFixture() {
+  const dir = mkdtempSync(join(tmpdir(), "pwk-node-helpers-"));
+  const git = (args: string[]) => spawnSync("git", args, { cwd: dir, env: GIT_ENV, encoding: "utf8" });
+  git(["init", "-q", "-b", "main"]);
+  const plan = join(dir, "docs/plans/2026-01-01-fixture");
+  mkdirSync(plan, { recursive: true });
+  mkdirSync(join(dir, "src"), { recursive: true });
+  writeFileSync(join(dir, "package.json"), '{\n  "name": "fixture",\n  "version": "1.0.0",\n  "private": true\n}\n');
+  writeFileSync(join(dir, "src/index.mjs"), "export const value = 1;\n");
+  git(["add", "-A"]);
+  git(["commit", "-q", "-m", "fixture: base"]);
+  writeFileSync(join(dir, "src/index.mjs"), "export const value = 2;\n");
+  // The design the golden packet was built from, byte for byte.
+  writeFileSync(
+    join(plan, "fixture-design.md"),
+    readFileSync(join(FIXTURES, "review-packet/fixture-design.md"), "utf8"),
+  );
+  git(["add", "-A"]);
+  git(["commit", "-q", "-m", "docs: add design doc"]);
+  const head = git(["rev-parse", "--short", "HEAD"]).stdout.trim();
+  const progress = readFileSync(join(FIXTURES, "review-packet/fixture-progress-template.md"), "utf8").replace(
+    "HEADOFSECONDCOMMIT",
+    head,
+  );
+  writeFileSync(join(plan, "fixture-progress.md"), progress);
+  git(["add", "-A"]);
+  git(["commit", "-q", "-m", "feat: the tiny behaviour"]);
+  return { dir, plan };
+}
+
+describe("node helpers (conversion)", () => {
+  it("matches the recorded validator diagnostics case by case", () => {
+    const dir = mkdtempSync(join(tmpdir(), "pwk-validator-golden-"));
+    try {
+      for (const [name, body] of Object.entries(CASES)) {
+        const file = join(dir, `${name}.md`);
+        writeFileSync(file, body);
+        const result = spawnSync("node", [VALIDATOR, file], { encoding: "utf8" });
+        const golden = readFileSync(join(FIXTURES, "design-validator", `${name}.txt`), "utf8").replaceAll(
+          dir + "/",
+          "",
+        );
+        const actual = `# exit: ${result.status}\n${result.stdout}${result.stderr}`.replaceAll(dir + "/", "");
+        expect(actual, `${name} must match the Python validator`).toBe(golden);
+      }
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("builds a packet byte-identical to the recorded Python packet", () => {
+    const { dir, plan } = buildPacketFixture();
+    try {
+      const result = spawnSync(
+        "node",
+        [
+          PACKET,
+          "--project",
+          dir,
+          "--design",
+          "docs/plans/2026-01-01-fixture/fixture-design.md",
+          "--progress",
+          "docs/plans/2026-01-01-fixture/fixture-progress.md",
+          "--scope",
+          "feature",
+        ],
+        { encoding: "utf8" },
+      );
+      expect(result.status, `packet helper failed: ${result.stdout}${result.stderr}`).toBe(0);
+      const produced = readFileSync(join(plan, "fixture-review-packet.md"), "utf8");
+      const golden = readFileSync(join(FIXTURES, "review-packet/packet-golden.md"), "utf8");
+      expect(produced, "the packet must match the Python helper byte for byte").toBe(golden);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("leaves no Python in the helpers, the skill text, or the test suite", () => {
+    expect(existsSync(join(repoRoot, "skills/pwk-brainstorming/scripts/validate-design.py")), "validator ported").toBe(
+      false,
+    );
+    expect(
+      existsSync(join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py")),
+      "packet helper ported",
+    ).toBe(false);
+
+    const offenders: string[] = [];
+    const walk = (dir: string) => {
+      for (const name of readdirSync(dir)) {
+        const path = join(dir, name);
+        if (statSync(path).isDirectory()) {
+          if (name === "runs") continue; // frozen probe evidence
+          walk(path);
+          continue;
+        }
+        // These two name Python only to assert its absence.
+        // These name Python only to assert its absence, or to detect it, and a generated
+        // packet quotes the diff it was built from.
+        if (["node-helpers.test.ts", "deterministic-steps.e2e.test.ts", "prescription-sweep.mjs"].includes(name)) {
+          continue;
+        }
+        if (/-review-packet.*\.md$/.test(name)) continue;
+        if (!/\.(md|ts|mjs)$/.test(name)) continue;
+        const text = readFileSync(path, "utf8");
+        if (/python3|Python 3/i.test(text)) offenders.push(`${path.replace(`${repoRoot}/`, "")}`);
+      }
+    };
+    walk(join(repoRoot, "skills"));
+    walk(join(repoRoot, "docs"));
+    walk(join(repoRoot, "tests"));
+    expect(offenders, "no Python invocation or prerequisite remains").toEqual([]);
+    expect(readFileSync(join(repoRoot, "AGENTS.md"), "utf8"), "AGENTS.md states the runtime").not.toMatch(/python3/i);
+  });
+});
diff --git a/tests/prescription-sweep.mjs b/tests/prescription-sweep.mjs
index 021ae45..8f6992a 100644
--- a/tests/prescription-sweep.mjs
+++ b/tests/prescription-sweep.mjs
@@ -43,8 +43,8 @@ export const SANCTIONED_COMMANDS = [
   "ls docs/plans/completed/<date>-<topic>/ >/dev/null",
   "mkdir -p docs/plans/completed",
   // deliberate pins (harness-neutral sweep first-run reconciliation)
-  "python3",
-  "python3 --version",
+  "node",
+  "node --version",
   "grep -m1 '^Feature phase:'",
   "ls docs/plans/",
 ];
@@ -147,9 +147,9 @@ const looksLikeCommand = (command) => {
 const isSanctioned = (command) => {
   const head = headOf(command);
   if (SANCTIONED_PREFIXES.some((prefix) => head === prefix || head.startsWith(prefix))) return true;
-  // A kit helper invocation in any form (e.g. `python3 scripts/x.py --flag`) is the
-  // scripts/ exception wearing an interpreter prefix.
-  if (command.split(/\s+/).some((token) => token.startsWith("scripts/"))) return true;
+  // A kit helper invocation in any form — `scripts/x.mjs`, or the same path behind an
+  // interpreter and a skill directory — is the scripts/ exception, not an unsanctioned tool.
+  if (command.split(/\s+/).some((token) => /(^|\/)scripts\/[^/\s]+$/.test(token))) return true;
   if (command.startsWith("npm run check") || command.startsWith("npm run test")) return true;
   return SANCTIONED_COMMANDS.some((recipe) => command.startsWith(recipe));
 };
diff --git a/tests/prescription-sweep.test.ts b/tests/prescription-sweep.test.ts
index 3a7820e..14ed839 100644
--- a/tests/prescription-sweep.test.ts
+++ b/tests/prescription-sweep.test.ts
@@ -29,8 +29,8 @@ describe("prescription sweep", () => {
           "# Demo",
           "",
           "Run `git status` now. Also `gh pr view 1`. Gate on `npm run check` and `npm run test`.",
-          "Helper: `python3 scripts/build-review-packet.py --scope feature` and bare `scripts/helper.py`.",
-          "Deliberate pins: check `python3 --version`, mention a compatible `python3`, match `grep -m1 '^Feature phase:' <file>`, verify with `ls docs/plans/`.",
+          "Helper: `node scripts/build-review-packet.mjs --scope feature` and bare `scripts/helper.mjs`.",
+          "Deliberate pins: check `node --version`, mention a compatible `node`, match `grep -m1 '^Feature phase:' <file>`, verify with `ls docs/plans/`.",
           "",
           "The canonical example:",
           "",
diff --git a/tests/progress-header-blank-lines.e2e.test.ts b/tests/progress-header-blank-lines.e2e.test.ts
index 6ac5428..a5e71ad 100644
--- a/tests/progress-header-blank-lines.e2e.test.ts
+++ b/tests/progress-header-blank-lines.e2e.test.ts
@@ -8,7 +8,7 @@ import { describe, expect, it } from "vitest";
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 const PROGRESS_FORMAT = join(repoRoot, "skills/pwk-executing-tasks/references/progress-format.md");
 const EXECUTING_SKILL = join(repoRoot, "skills/pwk-executing-tasks/SKILL.md");
-const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py");
+const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.mjs");
 
 /** The header fields whose CommonMark preview must show one line per field. */
 const HEADER_FIELDS = ["# Progress:", "Design:", "Branch:", "Setup:", "Started:", "Last updated:", "Feature phase:"];
@@ -137,7 +137,7 @@ function buildPacket(header: string[]): string {
   ].join("\n");
   writeFileSync(join(dir, "docs/plans/2026-09-17-demo/demo-progress.md"), progress);
   execSync("git add . && git commit -q -m progress", { cwd: dir });
-  execFileSync("python3", [
+  execFileSync("node", [
     PACKET_HELPER,
     "--project",
     dir,
diff --git a/tests/resources-package.test.ts b/tests/resources-package.test.ts
index 0bc43c9..5929de0 100644
--- a/tests/resources-package.test.ts
+++ b/tests/resources-package.test.ts
@@ -28,15 +28,15 @@ const SKILLS = [
 const REQUIRED_RESOURCES = [
   "pwk-brainstorming/references/umbrella.md",
   "pwk-brainstorming/references/design-format.md",
-  "pwk-brainstorming/scripts/validate-design.py",
+  "pwk-brainstorming/scripts/validate-design.mjs",
   "pwk-executing-tasks/references/progress-format.md",
   "pwk-executing-tasks/references/resume.md",
   "pwk-executing-tasks/references/review.md",
-  "pwk-executing-tasks/scripts/build-review-packet.py",
+  "pwk-executing-tasks/scripts/build-review-packet.mjs",
 ];
 const HELPERS = [
-  ["pwk-brainstorming", "scripts/validate-design.py"],
-  ["pwk-executing-tasks", "scripts/build-review-packet.py"],
+  ["pwk-brainstorming", "scripts/validate-design.mjs"],
+  ["pwk-executing-tasks", "scripts/build-review-packet.mjs"],
 ];
 const PUBLISHED_GUIDES = [
   "README.md",
@@ -46,7 +46,7 @@ const PUBLISHED_GUIDES = [
   "docs/provider-delegation-contract.md",
 ];
 const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
-const python = spawnSync("python3", ["--version"], { encoding: "utf8" });
+const python = spawnSync("node", ["--version"], { encoding: "utf8" });
 let fixture: string;
 let packed: Set<string>;
 
@@ -62,14 +62,14 @@ function filesUnder(directory: string): string[] {
  * Logical /skill:pwk-* handoffs and project docs/plans paths are not resources.
  */
 function resourcePaths(content: string): string[] {
-  return [...content.matchAll(/(?:\.{1,2}\/)*(?:references|scripts)\/[A-Za-z0-9_./-]+\.(?:md|py)\b/g)].map(
+  return [...content.matchAll(/(?:\.{1,2}\/)*(?:references|scripts)\/[A-Za-z0-9_./-]+\.(?:md|mjs)\b/g)].map(
     (match) => match[0],
   );
 }
 
 function assertLocalClosure(skillRoot: string): void {
   const files = filesUnder(skillRoot);
-  for (const file of files.filter((path) => /\.(?:md|py)$/.test(path))) {
+  for (const file of files.filter((path) => /\.(?:md|mjs)$/.test(path))) {
     const content = readFileSync(file, "utf8");
     const label = relative(skillRoot, file);
     // Reject concrete sibling filesystem access, not logical skill handoffs.
@@ -190,7 +190,7 @@ describe("R3 installed skill resource closure", () => {
       }
       const cwd = join(fixture, "unrelated project with spaces");
       mkdirSync(cwd, { recursive: true });
-      const result = spawnSync("python3", [join(skillRoot, script), "--help"], {
+      const result = spawnSync("node", [join(skillRoot, script), "--help"], {
         cwd,
         encoding: "utf8",
         timeout: 10_000,
@@ -260,23 +260,23 @@ describe("R3 installed-resource guidance", () => {
     const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
     expect(agents).toMatch(/references\//);
     expect(agents).toMatch(/scripts\//);
-    expect(agents).toMatch(/Python 3/);
+    expect(agents).toMatch(/node/i);
     expect(agents).not.toMatch(/the single code file/);
     const claude = join(ROOT, "CLAUDE.md");
     if (existsSync(claude)) expect(readFileSync(claude, "utf8")).toBe(agents);
   });
 
-  it.each(HELPERS)("keeps missing-Python blocker instructions visible in %s before %s", (skill, script) => {
+  it.each(HELPERS)("keeps missing-runtime blocker instructions visible in %s before %s", (skill, script) => {
     const content = readFileSync(join(ROOT, "skills", skill, "SKILL.md"), "utf8");
     // Guidance-only gate: never emulate a missing runtime by installing one.
     // Actual instruction-following remains the separately recorded R4 gate.
     const paragraphs = content.split(/\n\s*\n/);
-    const prerequisite = paragraphs.filter((paragraph) => /Python 3|python3/.test(paragraph)).join("\n");
-    expect(prerequisite, "Declare the supported Python version").toMatch(/Python 3(?:\.\d+)?/);
+    const prerequisite = paragraphs.filter((paragraph) => /node --version/i.test(paragraph)).join("\n");
+    expect(prerequisite, "Declare the runtime the helper needs").toMatch(/Node/i);
     expect(prerequisite).toMatch(/missing|unavailable|not (?:installed|available|found)/i);
     expect(prerequisite).toMatch(/blocker|blocked|block/);
     expect(prerequisite).toMatch(/stop|do not (?:continue|proceed)|must not (?:continue|proceed)/i);
-    expect(prerequisite).toMatch(/(?:request|ask)[\s\S]*(?:runtime|interpreter|Python)/i);
+    expect(prerequisite).toMatch(/(?:request|ask)[\s\S]*(?:runtime|interpreter|Node)/i);
     expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:auto.?install|install[^.\n]*automatic)/i);
     expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:fallback|alternate|second implementation)/i);
     expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:claim|report)[\s\S]*(?:success|succeed|passed)/i);
diff --git a/tests/review-cost-optimization.test.ts b/tests/review-cost-optimization.test.ts
index a8c0c59..57715f0 100644
--- a/tests/review-cost-optimization.test.ts
+++ b/tests/review-cost-optimization.test.ts
@@ -69,7 +69,7 @@ describe("review cost optimization feature (E2E)", () => {
     // R4+R5 — the executing skill builds scope as a packet file (never spawn-carried)
     // and spawns reviewers with one-liner pointers; per-requirement reviews mirror it.
     const review = readRepo("skills/pwk-executing-tasks/references/review.md");
-    expect(review).toContain("build-review-packet.py");
+    expect(review).toContain("build-review-packet.mjs");
     expect(review).toContain("--scope feature");
     expect(review).toContain("git rev-parse <first Commit-column entry>^");
     expect(review).toMatch(/review-packet\.md[\s\S]{0,600}(your role|role framing|role tail)/i);
diff --git a/tests/review-packet-cli.test.ts b/tests/review-packet-cli.test.ts
index b31c205..6817f1d 100644
--- a/tests/review-packet-cli.test.ts
+++ b/tests/review-packet-cli.test.ts
@@ -17,7 +17,7 @@ import { afterEach, describe, expect, it } from "vitest";
 
 const root = dirname(dirname(fileURLToPath(import.meta.url)));
 const skill = join(root, "skills/pwk-executing-tasks");
-const helper = join(skill, "scripts/build-review-packet.py");
+const helper = join(skill, "scripts/build-review-packet.mjs");
 const temporary: string[] = [];
 const alpha = `### R1: alpha deadbeef
 
@@ -139,7 +139,7 @@ ${rows.join("\n")}
   writeFileSync(progress, progressText);
   function run(args: string[] = [], script = helper) {
     return spawnSync(
-      "python3",
+      "node",
       [script, "--project", project, "--design", design, "--progress", progress, "--scope", "feature", ...args],
       { cwd: outside, encoding: "utf8" },
     );
@@ -151,21 +151,17 @@ afterEach(() => {
   for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
 });
 
-describe("review packet Python CLI", () => {
-  it("declares Python 3.9 and parses with its grammar without importing third-party modules", () => {
-    const result = spawnSync(
-      "python3",
-      [
-        "-c",
-        "import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(), feature_version=(3, 9))",
-        helper,
-      ],
-      { encoding: "utf8" },
-    );
-    expect(result.status).toBe(0);
-    const help = spawnSync("python3", [helper, "--help"], { encoding: "utf8" });
+describe("review packet CLI", () => {
+  it("imports only Node builtins and documents its path rules in --help", () => {
+    const source = readFileSync(helper, "utf8");
+    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
+    expect(specifiers.length, "the helper imports something").toBeGreaterThan(0);
+    for (const specifier of specifiers) {
+      expect(specifier.startsWith("node:"), `${specifier} must be a Node builtin`).toBe(true);
+    }
+    const help = spawnSync("node", [helper, "--help"], { encoding: "utf8" });
     expect(help.status).toBe(0);
-    expect(help.stdout).toContain("Python 3.9+");
+    expect(help.stdout).toMatch(/Node/);
     expect(help.stdout).toContain("relative to --project");
   });
 
@@ -286,7 +282,7 @@ describe("review packet Python CLI", () => {
     cpSync(skill, copy, { recursive: true });
     const result = f.run(
       ["--design", relative(f.project, f.design), "--progress", relative(f.project, f.progress)],
-      join(copy, "scripts/build-review-packet.py"),
+      join(copy, "scripts/build-review-packet.mjs"),
     );
     expect(result.stderr).toBe("");
     expect(result.status).toBe(0);
diff --git a/tests/review-packet.test.ts b/tests/review-packet.test.ts
index ac06841..76f751e 100644
--- a/tests/review-packet.test.ts
+++ b/tests/review-packet.test.ts
@@ -8,7 +8,7 @@ import { describe, expect, it } from "vitest";
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
 const REVIEW_REFERENCE = "skills/pwk-executing-tasks/references/review.md";
-const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py");
+const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.mjs");
 
 /** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
 const DESIGN_FIXTURE = [
@@ -76,7 +76,7 @@ function readReviewReference(): string {
 describe("review packet recipe", () => {
   it("should define the helper invocation contract in the review reference", () => {
     const review = readReviewReference();
-    expect(review).toContain("build-review-packet.py");
+    expect(review).toContain("build-review-packet.mjs");
     for (const argument of ["--project", "--design", "--progress", "--scope feature"]) {
       expect(review).toContain(argument);
     }
@@ -106,7 +106,7 @@ describe("review packet recipe", () => {
       progress,
       `# Progress: demo\n\nDesign: docs/plans/2026-09-17-demo/demo-design.md\n\n## Requirements\n| # | Done | Requirement | Per-req ceremony | Commit |\n|---|---|---|---|---|\n| 1 | ✅ | alpha | — | ${firstCommit} |\n| 2 | ✅ | beta | — | ${secondCommit} |\n`,
     );
-    execFileSync("python3", [
+    execFileSync("node", [
       PACKET_HELPER,
       "--project",
       dir,
@@ -187,7 +187,7 @@ describe("review packet recipe", () => {
     ].join("\n");
     const progressPath = join(topic, "demo-progress.md");
     writeFileSync(progressPath, progress);
-    execFileSync("python3", [
+    execFileSync("node", [
       PACKET_HELPER,
       "--project",
       dir,

