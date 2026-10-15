# Review packet: 2026-10-14-deterministic-steps — feature review

Base: a7c018b27c07861ad5624d9a6a9683935edf29a4

Head: 19fae7f0a605e7d185f240c9de01ad6b50b6ec3f

## Commits

19fae7f docs: R6 row and review fixes (deterministic-steps)
0c05794 fix(packet): refuse invalid UTF-8 as the Python helper did (R6 review)
f9bc008 fix(validator): anchor tag detection, Unicode criteria, splitlines parity (R6 review)
55f7211 feat(runtime): port both helpers to Node with golden-verified output (deterministic-steps R6)
1286cb0 docs: R5 row and evidence (deterministic-steps)
c86c1b0 feat(pins): named-revision argument and a gateable exit status (deterministic-steps R5)
514b3c2 docs: R4 row and evidence (deterministic-steps)
5f4ed8d feat(recon): enumerate capabilities before declaring one missing (deterministic-steps R4)
8d5e79e docs: R3 row and R1 bug note (deterministic-steps)
ef9f31d fix(stage-check): name the file, not the collapsed untracked directory
8a95578 feat(stage-check): the reviewed diff is the shipped diff (deterministic-steps R3)
23f8464 docs: R2 row, R1 correction (deterministic-steps)
6eac0cc fix(progress): name the phase field and the accepted vocabulary in the k>N diagnostic
74be32d feat(ref): section extractor, anchor-resolving lint, re-aimed pointers (deterministic-steps R2)
7454582 docs: R1 row and evidence (deterministic-steps)
49f7a23 feat(progress): the progress-file helper with per-slice tests (deterministic-steps R1)

## Changed files

 AGENTS.md                                          |   2 +-
 .../deterministic-steps-design.md                  |   6 +-
 .../deterministic-steps-progress.md                |  30 +-
 docs/workflow-phases.md                            |   4 +-
 skills/pwk-brainstorming/SKILL.md                  |   6 +-
 .../pwk-brainstorming/references/design-format.md  |   2 +-
 .../pwk-brainstorming/scripts/validate-design.mjs  | 239 ++++++++++++
 .../pwk-brainstorming/scripts/validate-design.py   | 194 ----------
 skills/pwk-executing-tasks/SKILL.md                |  14 +-
 .../references/progress-format.md                  |   2 +
 skills/pwk-executing-tasks/references/review.md    |   4 +-
 .../scripts/build-review-packet.mjs                | 399 +++++++++++++++++++++
 .../scripts/build-review-packet.py                 | 320 -----------------
 skills/pwk-executing-tasks/scripts/progress.mjs    | 180 ++++++++++
 skills/pwk-executing-tasks/scripts/ref.mjs         |  71 ++++
 skills/pwk-executing-tasks/scripts/stage-check.mjs |  48 +++
 tests/design-validator.test.ts                     |  16 +-
 tests/deterministic-steps.e2e.test.ts              |  61 +++-
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
 tests/pins-lost.test.ts                            | 100 ++++++
 tests/prescription-sweep.mjs                       |  10 +-
 tests/prescription-sweep.test.ts                   |   4 +-
 tests/progress-header-blank-lines.e2e.test.ts      |   4 +-
 tests/progress-helper.test.ts                      | 175 +++++++++
 tests/ref-helper.test.ts                           | 107 ++++++
 tests/resources-package.test.ts                    |  26 +-
 tests/review-cost-optimization.test.ts             |   2 +-
 tests/review-packet-cli.test.ts                    |  30 +-
 tests/review-packet.test.ts                        |   8 +-
 tests/skill-lint.mjs                               |  60 ++++
 tests/stage-check.test.ts                          |  95 +++++
 tests/tools/pins-lost.mjs                          | 133 +++++--
 45 files changed, 2109 insertions(+), 638 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R1: Scripted progress-file writes
A single Node helper performs every structural edit to a progress file — the phase line, the setup slot, a requirement row's done cell and commit, and execution-summary content — so no agent rewrites the table by hand.

**Acceptance criteria**
- Given a conforming progress file, When the helper sets the phase to a vocabulary value, Then the `Feature phase:` line reads that value, `Last updated` is refreshed, and no other byte of the file changes.
- Given the same file, When the helper sets row 2's done cell and commit, Then only row 2's Done and Commit cells change.
- Given a row already holding two commit IDs, When a third is set, Then the existing IDs stay in order and the new ID is appended last.
- Given a table with a missing requirement row or a row with a missing cell, When any write runs, Then it exits non-zero naming the file and the fault, and the file is unchanged.
- Given an unknown phase value, or an `implementing (k/N)` whose k exceeds N, When the phase is set, Then it exits non-zero naming the accepted vocabulary.
- Given a requirement with no execution-summary row yet, When the helper appends one with prose arguments, Then the row holds that text verbatim and any `|` inside it is escaped so the table does not break.
- Given a requirement whose execution-summary row already exists, When it is appended again, Then it exits non-zero rather than overwriting.

### Checkpoints: none
### Review: skip

### R2: Section-scoped reference reads and an anchor-resolving lint
A helper prints exactly the anchored section of a reference file so a step loads that section instead of the whole file, and `skill-lint` fails any reference pointer whose file or anchor does not resolve.

**Acceptance criteria**
- Given a reference file and an anchor naming a heading, When the helper runs, Then it prints from that heading to the next heading of the same or higher level, verbatim, and exits 0.
- Given an anchor matching no heading, When the helper runs, Then it exits non-zero naming the anchor and listing the headings the file does offer.
- Given a path that does not exist, When the helper runs, Then it exits non-zero naming the path.
- Given the skill corpus, When `skill-lint` runs, Then every `[text](references/<file>.md[#anchor])` in a SKILL.md resolves — the file exists and the anchor matches a heading under the slug rule (lowercase, spaces to dashes, punctuation dropped) — and any miss fails naming the pointer, the file, and the anchor.
- Given the executing-tasks SKILL.md after this requirement, When its reference pointers are read, Then each names the section its step needs rather than the whole file.

### Checkpoints: none
### Review: skip

### R3: The reviewed diff is the shipped diff
A helper fails when the working tree holds untracked or modified files outside `docs/plans/`, and both the review and the ship step run it before proceeding.

**Acceptance criteria**
- Given a tree with no changes, When the helper runs, Then it exits 0.
- Given an untracked file outside `docs/plans/`, When it runs, Then it exits non-zero and prints that path.
- Given a modified tracked file outside `docs/plans/`, When it runs, Then it exits non-zero and prints that path.
- Given untracked or modified files only under `docs/plans/`, When it runs, Then it exits 0 — the topic folder is legitimately dirty while a step is in flight.
- Given the executing-tasks SKILL.md after this requirement, When the packet-assembly step and the ship checkpoint are read, Then each instructs running the helper and stopping on a non-zero exit.

### Checkpoints: none
### Review: skip

### R4: Enumerated capability checks
The recon step must enumerate what the session actually grants before any unavailability report, so a missing capability is a recorded result rather than a guess.

**Acceptance criteria**
- Given the brainstorming SKILL.md after this requirement, When its recon step is read, Then it requires enumerating the session's available tools and roles before any `Scout: unavailable` line, names what was found, and gives both a batch-executor form and a plain fallback.
- Given that text, When `skill-lint` runs, Then the unavailability phrase is accompanied by the enumeration instruction in the same step, and a version lacking it fails.
- Given a session whose enumerated tools include no delegation capability, When the step is followed, Then the recorded recon line states the enumeration result and reports the capability missing — as the six recorded probe sessions did.

### Checkpoints: none
### Review: skip

### R5: The pin checkers live in the repo
The pin-loss and corpus-census checkers move out of the disposable topic folder into `tests/`, so the next slimming pass reuses them instead of rebuilding them.

**Acceptance criteria**
- Given a skill markdown file and a named revision, When the pin checker runs, Then it reports the pinned phrases present and lost for that file.
- Given a file that lost a pinned phrase against that revision, When it runs, Then it exits non-zero naming the phrase.
- Given a revision that does not resolve, When it runs, Then it exits non-zero naming the revision.

(amended 2026-10-14, human decision Option 1: the relocation criteria — checkers under `tests/`, no measurement script in `docs/plans/`, absent from the packed tarball — were delivered by the skill-slimming-2 finalize, which moved them to `tests/tools/` byte-identically. R5 narrows to the two refinements above.)

### Checkpoints: none
### Review: skip

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

## Architecture

Four new Node scripts, no dependencies, each invoked by name from skill text exactly as the Python helpers are today (`node "<skill-dir>/scripts/<helper>.mjs" <args>`):

| Helper | Owner | Purpose |
|---|---|---|
| `progress.mjs` | pwk-executing-tasks | the only writer of structural progress-file slots |
| `ref.mjs` | pwk-executing-tasks | prints one anchored section of a reference file |
| `stage-check.mjs` | pwk-executing-tasks | fails when the tree has changes outside `docs/plans/` |
| `validate-design.mjs` | pwk-brainstorming | the Python validator, ported |
| `build-review-packet.mjs` | pwk-executing-tasks | the Python packet helper, ported |

`ref.mjs` lives with the skill whose references it serves. That is pwk-executing-tasks, whose three reference files carry the measured weight; pwk-brainstorming keeps whole-file reads because its two references are small.

## Data flow

- **Progress**: skill step -> `progress.mjs <subcommand>` -> parse the table -> rewrite the one affected slot plus `Last updated` -> atomic replace -> exit code. On any parse fault the file is untouched.
- **Reference read**: skill step -> `ref.mjs <file>#<anchor>` -> locate the heading -> print to the next same-or-higher heading -> the agent reads the section, not the file.
- **Staging**: review assembly and the ship checkpoint -> `stage-check.mjs` -> `git status --porcelain` -> paths outside `docs/plans/` fail.
- **Review packet**: unchanged in shape; only its runtime changes in R6.

## Error handling

Every helper exits non-zero with a one-line diagnostic naming the file, value, or path at fault, and none writes partially. There is no bypass flag: a guard created because a step was repeatedly skipped does not carry an escape hatch, and the human's `git` remains the visible override. A helper that cannot run its prerequisite (an absent `git`, an unparseable table) reports that and stops rather than degrading to a guess.

## Testing

Each helper gets a per-slice test over its own edge cases — malformed tables, dangling anchors, the `docs/plans/` allowlist boundary, byte-identical packet output. The anchor check and the recon-text check become `skill-lint` checks, so they run in the kit copy the feature E2E already builds. The feature E2E gains three scenarios: a progress round-trip on a kit copy, a dangling-anchor lint failure, and a staging failure on a dirty tree. The R6 conversion is proven by golden comparison, not by a green suite alone.

## Approaches considered

**R1 — script writes the table versus printing a patch versus lint-only detection.** Script-writes won: the recorded failures were hand edits (three of six sessions hit an edit-mismatch or a malformed write), and both alternatives leave the edit in the agent's hands. Lint-only detects the damage after the fact.

**R2 — anchor lint alone versus an extraction helper versus splitting the files.** The measured cost is context volume, and a pointer with an anchor still permits a whole-file read, so the helper (which makes the small read the easy read) won, with the lint keeping pointers honest. Splitting the reference files physically was rejected: it multiplies files, budget rows, and pointer maintenance for the same bytes.

**R3 — standalone helper versus folding it into the packet helper versus a lint check.** Standalone won because the rule has two call sites (packet assembly and the ship checkpoint) and folding it into the packet helper would leave the ship step unguarded; a lint check cannot see the working tree.

**R4 — an enumeration instruction versus a capability manifest versus nothing.** The instruction won: the six probe sessions showed the unavailability report was *accurate* (their isolated environments had no delegation tool), but it was reached without a check, so the same wording would report wrongly in a session that does have one. A manifest file was rejected as a second source of truth that drifts from the host's actual tool set.

**R5 — `tests/` versus shipped scripts versus leaving them in the plan folder.** `tests/` won: they are repo-authoring tools for this corpus, so shipping them would add package weight for no host benefit, and leaving them in the plan folder deletes them at finalize — the failure mode that produced this requirement.

**R6 — port both helpers versus keep Python versus port only the validator.** Porting both won because the goal is one runtime and one invocation pattern; porting only the validator would leave the kit split for no benefit. The risk is real (the packet helper runs at every feature review) and is met with byte-identical output as the acceptance evidence rather than a green suite alone.


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
 
diff --git a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-design.md b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-design.md
index 1add928..400fdf9 100644
--- a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-design.md
+++ b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-design.md
@@ -80,9 +80,9 @@ The pin-loss and corpus-census checkers move out of the disposable topic folder
 **Acceptance criteria**
 - Given a skill markdown file and a named revision, When the pin checker runs, Then it reports the pinned phrases present and lost for that file.
 - Given a file that lost a pinned phrase against that revision, When it runs, Then it exits non-zero naming the phrase.
-- Given the corpus, When the census checker runs, Then it reports per-file pinned and free word counts.
-- Given the repository after this requirement, When `tests/` is listed, Then the relocated checkers are there and no measurement script remains under `docs/plans/`.
-- Given the packed tarball, When its file list is read, Then the relocated checkers are absent — `tests/` is not shipped.
+- Given a revision that does not resolve, When it runs, Then it exits non-zero naming the revision.
+
+(amended 2026-10-14, human decision Option 1: the relocation criteria — checkers under `tests/`, no measurement script in `docs/plans/`, absent from the packed tarball — were delivered by the skill-slimming-2 finalize, which moved them to `tests/tools/` byte-identically. R5 narrows to the two refinements above.)
 
 ### Checkpoints: none
 ### Review: skip
diff --git a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
index 972f584..08cd6ed 100644
--- a/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
+++ b/docs/plans/2026-10-14-deterministic-steps/deterministic-steps-progress.md
@@ -6,31 +6,31 @@ Branch: 2026-10-14-deterministic-steps
 
 Setup: n/a
 
-Started: 2026-10-14T15:05:00Z
+Started: 2026-10-14T14:35:00Z
 
-Last updated: 2026-10-14T15:05:00Z
+Last updated: 2026-10-15T00:15:56.473Z
 
-Feature phase: e2e-written
+Feature phase: reviewing
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
-| 1 | ⬜ | Scripted progress-file writes | — | — |
-| 2 | ⬜ | Section-scoped reference reads and an anchor-resolving lint | — | — |
-| 3 | ⬜ | The reviewed diff is the shipped diff | — | — |
-| 4 | ⬜ | Enumerated capability checks | — | — |
-| 5 | ⬜ | The pin checkers live in the repo | — | — |
-| 6 | ⬜ | One runtime for the helpers | ⏸ full · 🔎 parallel | — |
+| 1 | ✅ | Scripted progress-file writes | — | 49f7a23 |
+| 2 | ✅ | Section-scoped reference reads and an anchor-resolving lint | — | 74be32d 6eac0cc |
+| 3 | ✅ | The reviewed diff is the shipped diff | — | 8a95578 ef9f31d |
+| 4 | ✅ | Enumerated capability checks | — | 5f4ed8d |
+| 5 | ✅ | The pin checkers live in the repo | — | c86c1b0 |
+| 6 | ✅ | One runtime for the helpers | ⏸ full · 🔎 parallel | 55f7211 f9bc008 0c05794 |
 
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? | Evidence |
 |----|-------------|------------------|-----------|----------|
-| 1 | Scripted progress-file writes | | | |
-| 2 | Section-scoped reference reads and an anchor-resolving lint | | | |
-| 3 | The reviewed diff is the shipped diff | | | |
-| 4 | Enumerated capability checks | | | |
-| 5 | The pin checkers live in the repo | | | |
-| 6 | One runtime for the helpers | | | |
+| 1 | Scripted progress-file writes | One Node helper owns the progress file's structural slots — phase, setup slot, a requirement row's done cell and commit, and execution-summary content. It parses and validates the whole table before writing, appends commit ids in order, escapes pipes, refuses to overwrite a written summary, and writes atomically, so a refusal leaves the file byte-identical. The write-once rule has no amendment path, so correcting this row needed a direct edit — an open finding for the ship checkpoint. | yes — a bug the feature E2E caught during R2: the helper wrote the `Last updated` stamp into the line after the phase line, clobbering a load-bearing blank line and leaving the real stamp stale; fixed in R2 with a per-slice regression assertion; a second bug surfaced during R3 — the helper escaped a pipe when writing but its parser split on every pipe, so a summary containing one broke every later command; the parser now splits on unescaped pipes only, with a round-trip test | vitest run tests/progress-helper.test.ts -> 6 pass (malformed table untouched, missing row, commit append order, unknown glyph, setup slot, duplicate summary refused); the feature E2E's first scenario goes green when R3's staging helper lands. |
+| 2 | Section-scoped reference reads and an anchor-resolving lint | A Node section extractor prints one anchored section — from the heading to the next heading of the same or higher level — and skill-lint gained a check that every reference pointer in the skill text resolves: the file exists and the anchor matches a heading under the same slug rule. The executing-tasks skill's five bare pointers now name the sections their steps need, and the skill says to load a section rather than a whole file. | yes — one pointer's target section did not exist, so progress-format.md gained a ## Code digest heading to anchor it | vitest run tests/ref-helper.test.ts -> 5 pass (section boundaries, nested stop, unknown anchor lists headings, missing file, no anchor); skill-lint: 'reference pointer: all 10 reference pointers resolve'; the feature E2E's dangling-anchor case fails a rewritten pointer naming both the file and the anchor. |
+| 3 | The reviewed diff is the shipped diff | A Node helper fails when the tree holds uncommitted or untracked paths outside docs/plans/, listing them; the plan folder stays exempt because the design, progress file, and generated packet are legitimately dirty while a step is in flight. A root it cannot verify (not a git worktree) fails loudly rather than passing, and the packet-assembly step and the ship checkpoint both instruct running it. | yes — the feature E2E had to git-init its kit copy, since the check verifies a worktree and a plain directory cannot be verified | vitest run tests/stage-check.test.ts -> 5 pass (clean tree, untracked outside, modified tracked outside, plan-folder-only dirty, unverifiable root); the feature E2E's first scenario is fully green, and a stray file in the kit copy fails naming it. |
+| 4 | Enumerated capability checks | The recon step now requires enumerating what the session actually grants before it says anything is missing — under a batch executor Array.from(ALL_TOOLS), otherwise the tools and roles the host listed — naming the result, and reporting Scout: unavailable only among the enumerated tools with that result attached. skill-lint gained a check that the step carries the instruction and both forms. | — | skill-lint: 'recon enumeration: the recon step enumerates before reporting a capability missing'; the feature E2E asserts the repo text matches /enumerat/i and names ALL_TOOLS, and that stripping the sentence from a kit copy fails the lint naming the check. |
+| 5 | The pin checkers live in the repo | The relocated pin checker gained a named-revision argument (--against <rev>, default HEAD), repo-relative path resolution so a caller can pass an absolute path, and a non-zero exit that names every lost phrase — so a later pass can gate on it instead of only diffing HEAD. The pool harvest now tolerates a missing source file. | yes — R5 narrowed to those two refinements by human decision (Option 1); the relocation criteria were delivered by the skill-slimming-2 finalize, and the design records the amendment | vitest run tests/pins-lost.test.ts -> 4 pass (intact, a drop against a named revision, an absolute path, an unresolvable revision); the feature E2E's pin scenario is green and takes a real phrase from markers.mjs. |
+| 6 | One runtime for the helpers | Both helpers are dependency-free Node scripts (validate-design.mjs, build-review-packet.mjs), proven against goldens recorded from the Python originals while both existed: the validator matches exit codes and diagnostics case by case across nine fixtures, and the packet is byte-identical at 2,759 bytes. The Python prerequisite retires from the skill text, docs, and AGENTS.md; seven suites were converted; both .py files are deleted. | yes — the parallel review found three real divergences from the Python original (unanchored tag detection, ASCII-only word characters, invalid UTF-8 accepted) plus a test-scope bug (the absence scan flagged generated packets); all four were fixed and pinned with new goldens generated from the Python source recovered from Git | vitest run tests/node-helpers.test.ts -> 3 pass (validator goldens over nine fixtures, byte-identical packet, no Python remains); full suite 340 pass / 0 fail; reviewer reports retained — spec: gap then fixed; tracing: HIGH anchored tag, MEDIUM Unicode, LOW line-splitting, all fixed; smell: none; hazard: none triggered. |
 
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
index 1de0d53..cbd948f 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -50,7 +50,7 @@ A large request with distinct testable outcomes that need separate design/execut
    **Facts vs. decisions:** anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup holds only its downstream questions while the rest of the frontier is asked now. **Runnable facts:** an unknown observable by running something — behavior, timing, output, layout — is settled by a bounded sketch, never asked of the human and never guessed: an inline interpreter or a file under `docs/plans/<topic>/`, no installs, no source writes. Record it where it lands as `(settled by sketch: <what ran> → <result>)` and list it in the round summary so the human can strike it; a sketch result that would set business behavior still passes the assumption gate; inconclusive or blocked → record `INCONCLUSIVE` plus one line of what ran, and the question returns to the human with the result attached. A cheaper read beats a run when reading can decide, and only decisions are asked.
 
    Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
-4. **(skipped on trivial changes)** **Codebase recon** — for a non-trivial topic with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role: a fresh-context, read-only, bounded worker given the topic, one-line intent, and repo root. Use its 5-section map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as grounding for steps 5–6 instead of reading those files inline; the scout reports observations only, never design recommendations. No compatible capability, or constraints it cannot enforce → report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; never omit recon silently.
+4. **(skipped on trivial changes)** **Codebase recon** — first **enumerate what this session actually grants** and name what you found: under a batch executor `Array.from(ALL_TOOLS)`, otherwise the tools and roles your host listed. Then request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role: a fresh-context, read-only, bounded worker given the topic, one-line intent, and repo root. Use its 5-section map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as grounding for steps 5–6 instead of reading those files inline; the scout reports observations only, never design recommendations. No delegation capability among the tools you enumerated, or constraints it cannot enforce → report `Scout: unavailable` **with the enumeration result** and do the same recon inline, preserving the five-section map and `file:line` citations; never omit recon silently.
 5. **Explore approaches** — propose 2–3, leading with your recommendation, and sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code rather than abstractions.
 6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.
 
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
index 91401a0..38629a8 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -9,6 +9,8 @@ Implement the design doc under `docs/plans/` via the **feature-gate flow**; its
 
 Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
+Reference pointers name the section a step needs: run the section helper `scripts/ref.mjs <reference-path>#<anchor>` instead of reading the whole reference file.
+
 The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec. The flow is always on: E2E first (red), the requirements back-to-back, then the feature review and the **ship checkpoint**. Per-requirement checkpoints and reviews are **opt-in** — they fire only when the design doc tags them, and the feature gate covers the rest. A trivial design doc (no `## Feature acceptance`) skips the E2E and ships on the full suite.
 
 ## Before you start
@@ -33,7 +35,7 @@ Resolve local references and scripts from this skill directory; a missing requir
 ## First run
 
 1. **Parse the design doc** — read every `### R<n>:` heading with its `### Checkpoints` / `### Review` tags and the feature-level `### Feature review` tag. Requirements run in **listed order**. The `## Feature acceptance` section is the E2E you gate on first; a trivial doc skips steps 5–6.
-2. **Create the progress file** beside the design at `docs/plans/<date>-<topic>/<leaf>-progress.md`, reading [Progress format](references/progress-format.md) first. Start at `Feature phase: e2e-written` (trivial doc: `implementing (0/N)`); `Setup: pending` when the design has `## Setup`, otherwise `Setup: n/a`.
+2. **Create the progress file** beside the design at `docs/plans/<date>-<topic>/<leaf>-progress.md`, writing it with `scripts/progress.mjs` (read [Progress format](references/progress-format.md#progress-file) first for the template). Start at `Feature phase: e2e-written` (trivial doc: `implementing (0/N)`); `Setup: pending` when the design has `## Setup`, otherwise `Setup: n/a`.
 3. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the suite. **⏸ CHECKPOINT: setup** — present results and wait for approval, then set `Setup: done`.
 4. **Commit the design docs** — `git add docs/plans/<date>-<topic>/ && git commit -m "docs: add design doc"`, scoped to the topic folder so another topic’s drafts never ride it.
 5. **Write the feature-acceptance E2E test (red)** — encode the `## Feature acceptance` section as a real test, run it, confirm it **fails**. If it passes immediately, probe why before proceeding — the behavior may already exist, or the test may be asserting too little — and if the expected behavior looks wrong, **stop and present** rather than implementing against a wrong spec. Iterate to green; fixing the implementation is the default, and you **stop and present only when you are genuinely blocked** (nothing makes it pass, or the E2E itself is wrong).
@@ -47,7 +49,7 @@ Resolve local references and scripts from this skill directory; a missing requir
 
 When a matching progress file exists, read [Resume](references/resume.md#resume), then the header, Requirements table, and Execution summary only (`ship-paused` also needs the Code digest). Resume the first nonterminal row (`⬜`, `🔄`, blank). Match `grep -m1 '^Feature phase:' <file>`; `reviewing` resumes review; `ship-paused` re-presents and waits, never approving itself. Missing reviewer reports require review again before coverage.
 
-Read [Progress format](references/progress-format.md) before any progress-row or code-digest write; update the row, `Last updated`, and `Feature phase` together, write execution-summary content with the ✅, and deviations at deviation time. A failed/skipped row carries its reason and reconciles its test coverage.
+Read [Progress format](references/progress-format.md#progress-file) before any progress-row or code-digest write, and drive every structural edit through `scripts/progress.mjs` — it updates the row, `Last updated`, and `Feature phase` together, so write execution-summary content with the ✅ and deviations at deviation time. A failed/skipped row carries its reason and reconciles its test coverage.
 
 ## Implement phase
 
@@ -66,7 +68,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 
 ### Per-requirement review (opt-in)
 
-If the requirement’s `### Review` tag is `parallel` or `inline` (default `skip`), review that slice at step 7: run the [Review mechanics](references/review.md) helper with `--scope requirement --requirement N` over that requirement’s commits and criteria, written to `<design doc's directory>/<leaf>-review-packet-r<N>.md`. The four delegated roles — or the one `pwk-code-review` pass on `inline` — only report; you apply the smell fixes and commit them, then a clean pass returns to step 8. With `skip`, no per-requirement review — step 8 fires directly, and the feature-level review covers it.
+If the requirement’s `### Review` tag is `parallel` or `inline` (default `skip`), review that slice at step 7: run the [Review mechanics](references/review.md#assemble-evidence) helper with `--scope requirement --requirement N` over that requirement’s commits and criteria, written to `<design doc's directory>/<leaf>-review-packet-r<N>.md`. The four delegated roles — or the one `pwk-code-review` pass on `inline` — only report; you apply the smell fixes and commit them, then a clean pass returns to step 8. With `skip`, no per-requirement review — step 8 fires directly, and the feature-level review covers it.
 
 ### Checkpoint gates are mandatory (when the tag says so)
 
@@ -79,10 +81,10 @@ When a per-requirement checkpoint fires it is a **hard stop**:
 
 When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):
 
-1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it here.
+1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it here. Then run `scripts/stage-check.mjs` and stop on a non-zero exit: the reviewed diff is a commit range, so anything uncommitted outside `docs/plans/` is missing from it.
 2. **Run the feature-acceptance E2E** — it must be **green** now that all requirements have landed; still red means a requirement is wrong.
 3. **Run the feature review** (below) per the design’s `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed; apply smell fixes and re-green first.
-4. **Write the code digest** into the progress file — the review has succeeded and the code is final: read the packet’s `## Commits`, `## Changed files`, and `## Diff` sections and fill the file’s `## Code digest` per [Progress format](references/progress-format.md); if the packet is stale, re-run the helper first. Never a gate — it explains the change, it does not block shipping. A resumed `Feature phase: reviewing` that completes lands on this same write point. **Reconcile the Flow against reviewed reality**: every hop must match a path the tracing report names — in `inline` mode the inline pass itself performs code tracing, so check the Flow against that pass’s tracing findings and spec-coverage result — no hop invented and none dropped; an unresolvable discrepancy is **surfaced** in the findings status.
+4. **Write the code digest** into the progress file — the review has succeeded and the code is final: read the packet’s `## Commits`, `## Changed files`, and `## Diff` sections and fill the file’s `## Code digest` per [Progress format](references/progress-format.md#code-digest); if the packet is stale, re-run the helper first. Never a gate — it explains the change, it does not block shipping. A resumed `Feature phase: reviewing` that completes lands on this same write point. **Reconcile the Flow against reviewed reality**: every hop must match a path the tracing report names — in `inline` mode the inline pass itself performs code tracing, so check the Flow against that pass’s tracing findings and spec-coverage result — no hop invented and none dropped; an unresolvable discrepancy is **surfaced** in the findings status.
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green (trivial doc: the suite line alone);
    - the **execution summary** — what each requirement became, deviations included, Evidence cells quoted;
@@ -100,7 +102,7 @@ A spec-reviewer report without a per-requirement coverage table is invalid — r
 
 Run **one** review over the **whole feature diff**, driven by the design doc’s `### Feature review` tag — exactly one per part, never once per requirement.
 
-**Assemble the review packet first** — read [Review mechanics](references/review.md), then invoke `scripts/build-review-packet.py` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `python3 --version` for Python 3.9+; if missing, report the blocker, request a suitable runtime, and stop — never auto-install, use a fallback, or claim the packet succeeded. No packet byte passes through model output; a failed helper is never evidence or approval. It writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.
+**Assemble the review packet first** — run `scripts/stage-check.mjs` and stop on a non-zero exit, then read [Review mechanics](references/review.md#assemble-evidence) and invoke `scripts/build-review-packet.mjs` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `node --version`; if missing, report the blocker, request a suitable runtime, and stop — never auto-install, use a fallback, or claim the packet succeeded. No packet byte passes through model output; a failed helper is never evidence or approval. It writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.
 
 - **Resolve the tag first.** `auto` (the default, and what a missing tag means) resolves on the design’s production-risk content: a non-empty `## Production-risk areas` section or any `### Production-risk notes` → `parallel`; otherwise `inline`. An explicit tag wins over `auto` in both directions.
 - **`parallel`** — use the host’s `parallel-review` capability for four independent, fresh-context, read-only roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`. Follow [Review mechanics](references/review.md#delegate-or-review-inline): a one-liner packet-file pointer with role framing last — the packet never appears in spawn arguments. Collect one outcome per role. Reviewers only report; you apply smell fixes, commit, and re-green. Surface trace/spec/hazard findings to the human.
diff --git a/skills/pwk-executing-tasks/references/progress-format.md b/skills/pwk-executing-tasks/references/progress-format.md
index 9ddc407..d041e95 100644
--- a/skills/pwk-executing-tasks/references/progress-format.md
+++ b/skills/pwk-executing-tasks/references/progress-format.md
@@ -52,6 +52,8 @@ Read before creating or changing progress rows, or writing/re-presenting the cod
    - `<file>` — <what shifted inside it>
    ```
 
+## Code digest
+
    The `## Code digest` is filled once, at the write point in the ship checkpoint — never back-filled per requirement. Fill rules: plain language, R# anchors where natural, no test names. `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains, one spine or branch per bullet line. `### Gotchas` lifts real risks from the review findings, one real risk per bullet — `[ALERT]` only for reviewer-confirmed issues, never invented; with none, write `none beyond review findings`. `### Key files` is capped at 5 pivotal files, one bullet each.
 
    **Flow shape** — the ship stop's navigable map, the one digest section carrying structure:
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
diff --git a/skills/pwk-executing-tasks/scripts/progress.mjs b/skills/pwk-executing-tasks/scripts/progress.mjs
new file mode 100644
index 0000000..7c1e581
--- /dev/null
+++ b/skills/pwk-executing-tasks/scripts/progress.mjs
@@ -0,0 +1,180 @@
+#!/usr/bin/env node
+/**
+ * The progress file's structural slots, written in one place.
+ *
+ * Every command validates the whole table before touching the file and writes atomically
+ * (a temp file plus a rename), so a refusal leaves the file byte-identical. There is no
+ * bypass flag: the point of the helper is that a hand edit is no longer needed.
+ *
+ * Usage:
+ *   node progress.mjs set --file <progress.md> --phase <value>
+ *   node progress.mjs set-setup --file <progress.md> --value <pending|done|n/a>
+ *   node progress.mjs set-row --file <progress.md> --requirement <n> [--done <glyph>] [--commit <hash>]
+ *   node progress.mjs append-summary --file <progress.md> --requirement <n> --built <text> [--deviated <text>] [--evidence <text>]
+ */
+import { readFileSync, renameSync, writeFileSync } from "node:fs";
+import { parseArgs } from "node:util";
+
+const DONE_GLYPHS = ["⬜", "🔄", "✅", "❌", "⏭"];
+const SETUP_VALUES = ["pending", "done", "n/a"];
+const PHASE = /^(e2e-written|reviewing|ship-paused|done|implementing \((\d+)\/(\d+)\))$/;
+
+const REQUIREMENT_HEADER = "| # | Done | Requirement | Per-req ceremony | Commit |";
+const SUMMARY_HEADER = "| R# | Requirement | How it was built | Deviated? | Evidence |";
+
+/** Every row of a markdown table, with its line index and its trimmed cells. */
+function tableRows(lines, header) {
+  const start = lines.indexOf(header);
+  if (start === -1) return null;
+  const rows = [];
+  for (let i = start + 2; i < lines.length; i += 1) {
+    const line = lines[i];
+    if (!line.startsWith("|")) break;
+    rows.push({
+      index: i,
+      // Split on unescaped pipes only, so prose the helper escaped as \| survives a reparse.
+      cells: line
+        .split(/(?<!\\)\|/)
+        .slice(1, -1)
+        .map((cell) => cell.trim()),
+    });
+  }
+  return rows;
+}
+
+function fail(message) {
+  console.error(`progress.mjs: ${message}`);
+  process.exit(1);
+}
+
+/** Parse and validate the whole file before any command runs. */
+function load(filePath) {
+  let text;
+  try {
+    text = readFileSync(filePath, "utf8");
+  } catch (error) {
+    fail(`cannot read ${filePath}: ${error.message}`);
+  }
+  const lines = text.split("\n");
+  const phaseIndex = lines.findIndex((line) => line.startsWith("Feature phase:"));
+  if (phaseIndex === -1) fail(`${filePath}: no Feature phase line`);
+  const setupIndex = lines.findIndex((line) => line.startsWith("Setup:"));
+  if (setupIndex === -1) fail(`${filePath}: no Setup line`);
+  const lastUpdatedIndex = lines.findIndex((line) => line.startsWith("Last updated:"));
+  if (lastUpdatedIndex === -1) fail(`${filePath}: no Last updated line`);
+  const requirements = tableRows(lines, REQUIREMENT_HEADER);
+  if (!requirements) fail(`${filePath}: no Requirements table with its header row`);
+  const summary = tableRows(lines, SUMMARY_HEADER);
+  if (!summary) fail(`${filePath}: no Execution summary table with its header row`);
+  for (const row of requirements) {
+    if (row.cells.length !== 5) {
+      fail(`${filePath}: line ${row.index + 1} is not a five-cell requirement row`);
+    }
+  }
+  for (const row of summary) {
+    if (row.cells.length !== 5) {
+      fail(`${filePath}: line ${row.index + 1} is not a five-cell summary row`);
+    }
+  }
+  return { filePath, lines, phaseIndex, setupIndex, lastUpdatedIndex, requirements, summary };
+}
+
+const findRow = (rows, requirement, filePath, label) => {
+  const row = rows.find((candidate) => candidate.cells[0] === String(requirement));
+  if (!row) fail(`${filePath}: no ${label} row for requirement ${requirement}`);
+  return row;
+};
+
+const requirementRow = (cells) => `| ${cells.join(" | ")} |`;
+const stamp = () => new Date().toISOString();
+
+function save(state) {
+  state.lines[state.lastUpdatedIndex] = `Last updated: ${stamp()}`;
+  const temporary = `${state.filePath}.tmp`;
+  writeFileSync(temporary, state.lines.join("\n"));
+  renameSync(temporary, state.filePath);
+}
+
+const { values, positionals } = (() => {
+  try {
+    return parseArgs({
+      args: process.argv.slice(2),
+      allowPositionals: true,
+      options: {
+        file: { type: "string" },
+        phase: { type: "string" },
+        value: { type: "string" },
+        requirement: { type: "string" },
+        done: { type: "string" },
+        commit: { type: "string" },
+        built: { type: "string" },
+        deviated: { type: "string" },
+        evidence: { type: "string" },
+      },
+    });
+  } catch (error) {
+    fail(error.message);
+  }
+})();
+
+const command = positionals[0];
+if (!command || !values.file) {
+  fail("usage: progress.mjs <set|set-setup|set-row|append-summary> --file <progress.md> …");
+}
+const state = load(values.file);
+
+if (command === "set") {
+  const phase = values.phase ?? "";
+  const match = PHASE.exec(phase);
+  if (!match) {
+    fail(
+      `${values.file}: phase "${phase}" is not one of e2e-written, implementing (k/N), reviewing, ship-paused, done`,
+    );
+  }
+  if (match[2] !== undefined && Number(match[2]) > Number(match[3])) {
+    fail(
+      `${values.file}: phase "implementing (${match[2]}/${match[3]})" requires k <= N — accepted: e2e-written, implementing (k/N), reviewing, ship-paused, done`,
+    );
+  }
+  state.lines[state.phaseIndex] = `Feature phase: ${phase}`;
+} else if (command === "set-setup") {
+  const value = values.value ?? "";
+  if (!SETUP_VALUES.includes(value)) {
+    fail(`${values.file}: setup "${value}" is not one of ${SETUP_VALUES.join(", ")}`);
+  }
+  state.lines[state.setupIndex] = `Setup: ${value}`;
+} else if (command === "set-row") {
+  const row = findRow(state.requirements, values.requirement, values.file, "requirement");
+  const cells = [...row.cells];
+  if (values.done !== undefined) {
+    if (!DONE_GLYPHS.includes(values.done)) {
+      fail(`${values.file}: done "${values.done}" is not one of ${DONE_GLYPHS.join(" ")}`);
+    }
+    cells[1] = values.done;
+  }
+  if (values.commit !== undefined) {
+    const existing = cells[4] === "—" ? "" : cells[4];
+    const recorded = existing.split(/\s+/).filter(Boolean);
+    if (recorded.includes(values.commit)) fail(`${values.file}: commit ${values.commit} is already recorded`);
+    cells[4] = [...recorded, values.commit].join(" ");
+  }
+  state.lines[row.index] = requirementRow(cells);
+} else if (command === "append-summary") {
+  const row = findRow(state.summary, values.requirement, values.file, "execution summary");
+  const [, , built, deviated, evidence] = row.cells;
+  if (built || deviated || evidence) {
+    fail(`${values.file}: requirement ${values.requirement} already has an execution summary`);
+  }
+  const cellText = (text) => String(text ?? "—").replace(/\|/g, "\\|");
+  state.lines[row.index] = requirementRow([
+    row.cells[0],
+    row.cells[1],
+    cellText(values.built),
+    cellText(values.deviated),
+    cellText(values.evidence),
+  ]);
+} else {
+  fail(`unknown command "${command}"`);
+}
+
+save(state);
diff --git a/skills/pwk-executing-tasks/scripts/ref.mjs b/skills/pwk-executing-tasks/scripts/ref.mjs
new file mode 100644
index 0000000..18caa11
--- /dev/null
+++ b/skills/pwk-executing-tasks/scripts/ref.mjs
@@ -0,0 +1,71 @@
+#!/usr/bin/env node
+/**
+ * Print one anchored section of a reference file, so a step loads the section it needs
+ * instead of the whole document.
+ *
+ * The anchor is the heading slug: lowercased, spaces to dashes, punctuation dropped.
+ * The section runs from its heading to the next heading of the same or higher level.
+ *
+ * Usage: node ref.mjs <reference-path>#<anchor>
+ */
+import { readFileSync } from "node:fs";
+
+const HEADING = /^(#{1,6})\s+(.+?)\s*$/;
+
+/** The heading slug a markdown link anchor is written against. */
+export function slug(heading) {
+  return heading
+    .toLowerCase()
+    .replace(/[^\p{L}\p{N}\s-]/gu, "")
+    .trim()
+    .replace(/\s+/g, "-");
+}
+
+/** Every heading in a document, with its level, slug, and line index. */
+export function headings(lines) {
+  const found = [];
+  for (const [index, line] of lines.entries()) {
+    const match = HEADING.exec(line);
+    if (match) found.push({ index, level: match[1].length, slug: slug(match[2]), text: match[2] });
+  }
+  return found;
+}
+
+export function section(lines, anchor) {
+  const all = headings(lines);
+  const start = all.find((heading) => heading.slug === anchor);
+  if (!start) return null;
+  const next = all.find((heading) => heading.index > start.index && heading.level <= start.level);
+  const body = lines.slice(start.index, next ? next.index : lines.length);
+  while (body.length && body[body.length - 1].trim() === "") body.pop();
+  return { text: body.join("\n"), available: all.map((heading) => heading.slug) };
+}
+
+function fail(message) {
+  console.error(`ref.mjs: ${message}`);
+  process.exit(1);
+}
+
+if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
+  const target = process.argv[2];
+  if (!target) fail("usage: ref.mjs <reference-path>#<anchor>");
+  const hash = target.lastIndexOf("#");
+  if (hash === -1 || hash === target.length - 1) fail(`${target}: pass an anchor, as <reference-path>#<anchor>`);
+  const path = target.slice(0, hash);
+  const anchor = target.slice(hash + 1);
+  let text;
+  try {
+    text = readFileSync(path, "utf8");
+  } catch (error) {
+    fail(`cannot read ${path}: ${error.message}`);
+  }
+  const found = section(text.split("\n"), anchor);
+  if (!found) {
+    const available =
+      headings(text.split("\n"))
+        .map((heading) => heading.slug)
+        .join(", ") || "(none)";
+    fail(`${path}: no heading matches "#${anchor}" — available: ${available}`);
+  }
+  console.log(found.text);
+}
diff --git a/skills/pwk-executing-tasks/scripts/stage-check.mjs b/skills/pwk-executing-tasks/scripts/stage-check.mjs
new file mode 100644
index 0000000..8f8eace
--- /dev/null
+++ b/skills/pwk-executing-tasks/scripts/stage-check.mjs
@@ -0,0 +1,48 @@
+#!/usr/bin/env node
+/**
+ * Fail when the working tree holds changes outside the plan folder.
+ *
+ * The reviewed diff is a commit range, so anything uncommitted outside docs/plans/ is
+ * invisible to the review and can ship unreviewed. The plan folder is exempt: the design,
+ * the progress file, and the generated packet are legitimately dirty while a step is in
+ * flight. A root that cannot be verified is a failure, never a silent pass.
+ *
+ * Usage: node stage-check.mjs [root]
+ */
+import { spawnSync } from "node:child_process";
+import { resolve } from "node:path";
+
+const ALLOWED = "docs/plans/";
+const root = resolve(process.argv[2] ?? process.cwd());
+
+const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" });
+if (probe.status !== 0 || probe.stdout.trim() !== "true") {
+  console.error(`stage-check.mjs: ${root} is not a git worktree — nothing can be verified`);
+  process.exit(1);
+}
+
+// -uall: git otherwise collapses an untracked directory to "dir/", and the point of the
+// failure is to name the file that would miss the reviewed diff.
+const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
+if (status.status !== 0) {
+  console.error(`stage-check.mjs: git status failed in ${root}: ${status.stderr.trim()}`);
+  process.exit(1);
+}
+
+const unquote = (path) => path.replace(/^"(.*)"$/, "$1");
+const offenders = [];
+for (const line of status.stdout.split("\n")) {
+  if (!line.trim()) continue;
+  const entry = unquote(line.slice(3).trim());
+  const path = entry.includes(" -> ") ? entry.split(" -> ").at(-1).trim() : entry;
+  if (!path.startsWith(ALLOWED)) offenders.push(path);
+}
+
+if (offenders.length) {
+  for (const path of offenders) console.error(`stage-check.mjs: uncommitted outside ${ALLOWED} — ${path}`);
+  console.error(
+    `stage-check.mjs: ${offenders.length} path(s) would be missing from the reviewed diff; commit or remove them first`,
+  );
+  process.exit(1);
+}
+console.log(`stage-check.mjs: nothing uncommitted outside ${ALLOWED}`);
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
diff --git a/tests/deterministic-steps.e2e.test.ts b/tests/deterministic-steps.e2e.test.ts
index 06af461..3722fdc 100644
--- a/tests/deterministic-steps.e2e.test.ts
+++ b/tests/deterministic-steps.e2e.test.ts
@@ -100,6 +100,13 @@ describe("deterministic steps (feature E2E)", () => {
   it("writes the progress slots through the helper and gates on a clean tree", () => {
     const kit = copyKit("pwk-det-progress-");
     try {
+      // The staging check verifies a git worktree, so the copy is one.
+      spawnSync("git", ["init", "-q"], { cwd: kit, encoding: "utf8" });
+      spawnSync("git", ["add", "-A"], { cwd: kit, encoding: "utf8" });
+      spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "kit"], {
+        cwd: kit,
+        encoding: "utf8",
+      });
       const file = progressFile(kit);
       const helper = skill(kit, "pwk-executing-tasks", "progress.mjs");
 
@@ -169,11 +176,53 @@ describe("deterministic steps (feature E2E)", () => {
       expect(recon, "the recon step enumerates before declaring a capability missing").toMatch(/enumerat/i);
       expect(recon, "the batch-executor form is named").toContain("ALL_TOOLS");
 
+      const executingSkill = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(
+        executingSkill.match(/stage-check\.mjs/g)?.length ?? 0,
+        "the packet step and the ship checkpoint both call the staging check",
+      ).toBeGreaterThanOrEqual(2);
+
       const python = spawnSync("sh", ["-c", "grep -rn -i 'python3\\|Python 3' skills AGENTS.md || true"], {
         cwd: kit,
         encoding: "utf8",
       });
       expect(python.stdout.trim(), "no Python invocation or prerequisite remains").toBe("");
+
+      // A recon step that lost its enumeration instruction must fail, not pass quietly.
+      const reconFile = join(kit, "skills/pwk-brainstorming/SKILL.md");
+      const reconText = readFileSync(reconFile, "utf8");
+      const from = reconText.indexOf("first **enumerate what this session actually grants**");
+      const to = reconText.indexOf("Then request the host");
+      expect(from, "the enumeration sentence is where the assertion expects it").toBeGreaterThan(-1);
+      expect(to, "and so is the sentence that follows it").toBeGreaterThan(from);
+      writeFileSync(reconFile, reconText.slice(0, from) + reconText.slice(to));
+
+      const stripped = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { cwd: kit, encoding: "utf8" });
+      expect(stripped.status, "a recon step without the enumeration instruction must fail").not.toBe(0);
+      expect(`${stripped.stdout}${stripped.stderr}`, "the failure names the missing instruction").toMatch(
+        /recon enumeration/,
+      );
+    } finally {
+      rmSync(kit, { recursive: true, force: true });
+    }
+  });
+
+  it("fails a reference pointer whose anchor matches no heading", () => {
+    const kit = copyKit("pwk-det-anchor-");
+    try {
+      const file = join(kit, "skills/pwk-executing-tasks/SKILL.md");
+      writeFileSync(
+        file,
+        readFileSync(file, "utf8").replace(
+          "references/review.md#assemble-evidence",
+          "references/review.md#no-such-section",
+        ),
+      );
+      const lint = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { cwd: kit, encoding: "utf8" });
+      const out = `${lint.stdout}${lint.stderr}`;
+      expect(lint.status, "a dangling anchor must fail the lint").not.toBe(0);
+      expect(out, "the failure names the pointer and the anchor").toContain("references/review.md#no-such-section");
+      expect(out, "the failure names the reference file").toContain("review.md");
     } finally {
       rmSync(kit, { recursive: true, force: true });
     }
@@ -208,10 +257,14 @@ describe("deterministic steps (feature E2E)", () => {
       const intact = run(checker, [target, "--against", "HEAD"], kit);
       expect(intact.status, `an intact file must pass: ${intact.stdout}${intact.stderr}`).toBe(0);
 
-      const pinned = read("skills/pwk-status/SKILL.md");
-      const phrase = pinned.split("\n").find((line) => line.trim().length > 60) ?? "";
-      expect(phrase.length, "the sample file must carry a long pinned-ish line").toBeGreaterThan(60);
-      writeFileSync(target, pinned.replace(phrase, ""));
+      // Take the phrase from the pool itself, so the test drops a real pin rather than a
+      // long line that may carry none.
+      const markers = readFileSync(join(kit, "tests", "markers.mjs"), "utf8");
+      const candidates = [...markers.matchAll(/"([^"\\\n]{20,})"/g)].map((match) => match[1]);
+      const statusSkill = read("skills/pwk-status/SKILL.md");
+      const phrase = candidates.find((candidate) => statusSkill.includes(candidate));
+      expect(phrase, "a marker literal from markers.mjs appears in the status skill").toBeTruthy();
+      writeFileSync(target, statusSkill.replace(phrase as string, ""));
       const dropped = run(checker, [target, "--against", "HEAD"], kit);
       expect(dropped.status, "a dropped pinned phrase must fail").not.toBe(0);
       expect(`${dropped.stdout}${dropped.stderr}`, "the failure names the lost phrase").toContain(
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
diff --git a/tests/pins-lost.test.ts b/tests/pins-lost.test.ts
new file mode 100644
index 0000000..8f18bbd
--- /dev/null
+++ b/tests/pins-lost.test.ts
@@ -0,0 +1,100 @@
+import { spawnSync } from "node:child_process";
+import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+
+/**
+ * Per-slice tests for the pin checker's refinements (deterministic-steps R5).
+ *
+ * The feature E2E covers the straightforward drop against HEAD. These pin the revision
+ * argument, the exit status a caller can gate on, and the refusal to guess at a revision
+ * that does not resolve.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const CHECKER = join(repoRoot, "tests/tools/pins-lost.mjs");
+
+const PINNED = "a pinned phrase that must survive the pass";
+const TARGET = "skills/x/SKILL.md";
+
+function git(dir: string, args: string[]) {
+  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
+}
+
+/** A repo whose pin pool names one phrase, with that phrase in a skill file. */
+function workspace(prefix: string) {
+  const dir = mkdtempSync(join(tmpdir(), prefix));
+  mkdirSync(join(dir, "tests"), { recursive: true });
+  mkdirSync(join(dir, "skills/x"), { recursive: true });
+  writeFileSync(join(dir, "tests/markers.mjs"), `export const M = { pinned: "${PINNED}" };\n`);
+  writeFileSync(join(dir, "tests/skill-lint.mjs"), 'console.log("another pool entry that is long enough");\n');
+  writeFileSync(join(dir, "skills/x/SKILL.md"), `# X\n\n${PINNED}\n\nfiller line\n`);
+  git(dir, ["init", "-q"]);
+  git(dir, ["add", "-A"]);
+  git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "with the pin"]);
+  return dir;
+}
+
+const check = (dir: string, args: string[] = []) =>
+  spawnSync("node", [CHECKER, TARGET, ...args], { cwd: dir, encoding: "utf8" });
+
+describe("pin checker", () => {
+  it("passes a file whose pinned phrases are intact", () => {
+    const dir = workspace("pwk-pins-intact-");
+    try {
+      const result = check(dir);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+      expect(result.stdout, "reports how many pins it found").toMatch(/present/i);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("fails naming the phrase a file dropped against a named revision", () => {
+    const dir = workspace("pwk-pins-drop-");
+    try {
+      const first = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
+      const file = join(dir, TARGET);
+      writeFileSync(file, readFileSync(file, "utf8").replace(PINNED, ""));
+      git(dir, ["add", "-A"]);
+      git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "drop the pin"]);
+
+      const againstHead = check(dir, ["--against", "HEAD"]);
+      expect(againstHead.status, "the current revision no longer carries the pin").toBe(0);
+
+      const againstFirst = check(dir, ["--against", first]);
+      expect(againstFirst.status, "a pin present in that revision and absent now fails").not.toBe(0);
+      expect(`${againstFirst.stdout}${againstFirst.stderr}`, "the failure names the phrase").toContain(PINNED);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("accepts an absolute path, as a caller outside the repo root would pass", () => {
+    const dir = workspace("pwk-pins-absolute-");
+    try {
+      const absolute = join(dir, TARGET);
+      const intact = spawnSync("node", [CHECKER, absolute], { cwd: dir, encoding: "utf8" });
+      expect(intact.status, `${intact.stdout}${intact.stderr}`).toBe(0);
+
+      writeFileSync(absolute, readFileSync(absolute, "utf8").replace(PINNED, ""));
+      const dropped = spawnSync("node", [CHECKER, absolute], { cwd: dir, encoding: "utf8" });
+      expect(dropped.status, "an absolute path must still find the pin").not.toBe(0);
+      expect(`${dropped.stdout}${dropped.stderr}`).toContain(PINNED);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refuses a revision that does not resolve", () => {
+    const dir = workspace("pwk-pins-badrev-");
+    try {
+      const result = check(dir, ["--against", "no-such-revision"]);
+      expect(result.status).not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`, "the failure names the revision").toContain("no-such-revision");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
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
diff --git a/tests/progress-helper.test.ts b/tests/progress-helper.test.ts
new file mode 100644
index 0000000..7d7cd9c
--- /dev/null
+++ b/tests/progress-helper.test.ts
@@ -0,0 +1,175 @@
+import { spawnSync } from "node:child_process";
+import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+
+/**
+ * Per-slice tests for the progress helper (deterministic-steps R1).
+ *
+ * The feature E2E covers the happy path through the helper. These cover the criteria it
+ * does not: what the helper refuses, and that a refusal leaves the file byte-identical.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/progress.mjs");
+
+const TEMPLATE = `# Progress: sample
+
+Design: docs/plans/2026-10-14-sample/sample-design.md
+
+Branch: sample
+
+Setup: n/a
+
+Started: 2026-10-14T00:00:00Z
+
+Last updated: 2026-10-14T00:00:00Z
+
+Feature phase: e2e-written
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ⬜ | First thing | — | — |
+| 2 | ⬜ | Second thing | — | — |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? | Evidence |
+|----|-------------|------------------|-----------|----------|
+| 1 | First thing | | | |
+
+## Deviation records
+
+## Code digest
+`;
+
+function workspace(prefix: string, body = TEMPLATE) {
+  const dir = mkdtempSync(join(tmpdir(), prefix));
+  const file = join(dir, "sample-progress.md");
+  writeFileSync(file, body);
+  return { dir, file };
+}
+
+const runHelper = (file: string, args: string[], cwd?: string) =>
+  spawnSync("node", [HELPER, ...args, "--file", file], { cwd, encoding: "utf8" });
+
+describe("progress helper", () => {
+  it("refuses a malformed table and leaves the file byte-identical", () => {
+    const { dir, file } = workspace(
+      "pwk-progress-bad-",
+      TEMPLATE.replace("| 2 | ⬜ | Second thing | — | — |", "| 2 | ⬜ | Second thing |"),
+    );
+    try {
+      const before = readFileSync(file, "utf8");
+      const result = runHelper(file, ["set-row", "--requirement", "2", "--done", "✅"]);
+      expect(result.status, "a malformed table is a named failure").not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`, "the failure names the file").toContain("sample-progress.md");
+      expect(readFileSync(file, "utf8"), "a refusal writes nothing").toBe(before);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refuses a requirement row that does not exist", () => {
+    const { dir, file } = workspace("pwk-progress-missing-");
+    try {
+      const result = runHelper(file, ["set-row", "--requirement", "9", "--done", "✅"]);
+      expect(result.status).not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`).toMatch(/row|requirement/i);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("appends a commit id after the ones already recorded", () => {
+    const { dir, file } = workspace(
+      "pwk-progress-commits-",
+      TEMPLATE.replace("| 1 | ⬜ | First thing | — | — |", "| 1 | 🔄 | First thing | — | a1b2c3 |"),
+    );
+    try {
+      const result = runHelper(file, ["set-row", "--requirement", "1", "--done", "✅", "--commit", "d4e5f6"]);
+      expect(result.status).toBe(0);
+      expect(readFileSync(file, "utf8")).toContain("| 1 | ✅ | First thing | — | a1b2c3 d4e5f6 |");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refreshes Last updated in place, leaving the header blank lines intact", () => {
+    const { dir, file } = workspace("pwk-progress-stamp-");
+    try {
+      const result = runHelper(file, ["set", "--phase", "reviewing"]);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+      const text = readFileSync(file, "utf8");
+      expect(text, "the stamp stays in its header slot, before the phase line").toMatch(
+        /Last updated: [^\n]*\n\nFeature phase: reviewing/,
+      );
+      expect(text.match(/Last updated:/g)?.length, "exactly one Last updated line").toBe(1);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refuses an unknown done glyph", () => {
+    const { dir, file } = workspace("pwk-progress-glyph-");
+    try {
+      const before = readFileSync(file, "utf8");
+      const result = runHelper(file, ["set-row", "--requirement", "1", "--done", "DONE"]);
+      expect(result.status).not.toBe(0);
+      expect(readFileSync(file, "utf8")).toBe(before);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("writes the setup slot", () => {
+    const { dir, file } = workspace("pwk-progress-setup-");
+    try {
+      const result = runHelper(file, ["set-setup", "--value", "done"]);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+      expect(readFileSync(file, "utf8")).toContain("Setup: done");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("parses back the prose it escaped, so later commands still work", () => {
+    const { dir, file } = workspace("pwk-progress-roundtrip-");
+    try {
+      const written = runHelper(file, [
+        "append-summary",
+        "--requirement",
+        "1",
+        "--built",
+        "a | b",
+        "--deviated",
+        "c",
+        "--evidence",
+        "d",
+      ]);
+      expect(written.status, `${written.stdout}${written.stderr}`).toBe(0);
+      const again = runHelper(file, ["set-row", "--requirement", "2", "--done", "✅"]);
+      expect(again.status, "a table the helper wrote must still parse").toBe(0);
+      expect(readFileSync(file, "utf8"), "the escaped pipe is preserved").toContain("a \\| b");
+      expect(readFileSync(file, "utf8"), "and the new row landed").toContain("| 2 | ✅ | Second thing | — | — |");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refuses to overwrite an execution summary already written", () => {
+    const { dir, file } = workspace(
+      "pwk-progress-summary-",
+      TEMPLATE.replace("| 1 | First thing | | | |", "| 1 | First thing | it was built | — | probe ran |"),
+    );
+    try {
+      const before = readFileSync(file, "utf8");
+      const result = runHelper(file, ["append-summary", "--requirement", "1", "--built", "again"]);
+      expect(result.status, "a second summary for one requirement is refused").not.toBe(0);
+      expect(readFileSync(file, "utf8")).toBe(before);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+});
diff --git a/tests/ref-helper.test.ts b/tests/ref-helper.test.ts
new file mode 100644
index 0000000..c1f9a99
--- /dev/null
+++ b/tests/ref-helper.test.ts
@@ -0,0 +1,107 @@
+import { spawnSync } from "node:child_process";
+import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+
+/**
+ * Per-slice tests for the section extractor (deterministic-steps R2).
+ *
+ * The point of the helper is that a step loads one section instead of a whole file, so the
+ * tests pin the exact boundaries: from the anchor heading to the next heading of the same
+ * or higher level, verbatim, and a named refusal otherwise.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/ref.mjs");
+
+const DOC = `# Title
+
+Intro prose.
+
+## First section
+
+first body line
+second body line
+
+### Nested detail
+
+nested body
+
+## Second section
+
+second body
+`;
+
+function workspace(prefix: string) {
+  const dir = mkdtempSync(join(tmpdir(), prefix));
+  const file = join(dir, "doc.md");
+  writeFileSync(file, DOC);
+  return { dir, file };
+}
+
+const runHelper = (target: string) => spawnSync("node", [HELPER, target], { encoding: "utf8" });
+
+describe("section extractor", () => {
+  it("prints a section from its heading to the next heading of the same level", () => {
+    const { dir, file } = workspace("pwk-ref-");
+    try {
+      const result = runHelper(`${file}#first-section`);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+      expect(result.stdout).toContain("## First section");
+      expect(result.stdout, "includes its own nested subsection").toContain("nested body");
+      expect(result.stdout, "stops before the next same-level heading").not.toContain("## Second section");
+      expect(result.stdout, "does not include the intro").not.toContain("Intro prose.");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("stops a nested section at the next heading of the same or higher level", () => {
+    const { dir, file } = workspace("pwk-ref-nested-");
+    try {
+      const result = runHelper(`${file}#nested-detail`);
+      expect(result.status).toBe(0);
+      expect(result.stdout).toContain("nested body");
+      expect(result.stdout, "a sibling section is excluded").not.toContain("second body");
+      expect(result.stdout, "the parent heading is excluded").not.toContain("## First section");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("names the anchor and lists the available headings when it matches nothing", () => {
+    const { dir, file } = workspace("pwk-ref-missing-");
+    try {
+      const result = runHelper(`${file}#nope`);
+      expect(result.status).not.toBe(0);
+      const text = `${result.stdout}${result.stderr}`;
+      expect(text, "names the anchor").toContain("nope");
+      expect(text, "lists a heading the file does offer").toContain("first-section");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("names the path when the file does not exist", () => {
+    const { dir, file } = workspace("pwk-ref-absent-");
+    try {
+      const result = runHelper(`${file}.absent#anything`);
+      expect(result.status).not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`).toContain("doc.md.absent");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("refuses a target with no anchor", () => {
+    const { dir, file } = workspace("pwk-ref-noanchor-");
+    try {
+      const result = runHelper(file);
+      expect(result.status).not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`).toMatch(/anchor|#/);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+});
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
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 7d988df..b7a3bbe 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -1663,6 +1663,66 @@ console.log("prescription sweep:");
   if (violations === 0) ok("prescription sweep: every command in skill content is sanctioned or framed");
 }
 
+// --- Check 16: reference pointers resolve (deterministic-steps R2) ---
+console.log("reference pointers:");
+{
+  // A pointer that names a section is only useful if the section is there: the file must
+  // exist, and an anchor must match a heading under the same slug rule the extractor uses.
+  const pointerSlug = (heading) =>
+    heading
+      .toLowerCase()
+      .replace(/[^\p{L}\p{N}\s-]/gu, "")
+      .trim()
+      .replace(/\s+/g, "-");
+  const headingSlugs = (text) => [...text.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)].map((match) => pointerSlug(match[2]));
+
+  let broken = 0;
+  let checked = 0;
+  for (const skill of loadSkills()) {
+    const dir = dirname(skill.path);
+    for (const match of skill.content.matchAll(/\]\((references\/[^)#]+)\.md(?:#([^)]+))?\)/g)) {
+      checked++;
+      const rel = `${match[1]}.md`;
+      const target = join(dir, rel);
+      if (!existsSync(target)) {
+        fail(`reference pointer: ${skill.name}: ${rel} does not exist`);
+        broken++;
+        continue;
+      }
+      const anchor = match[2];
+      if (anchor && !headingSlugs(readFileSync(target, "utf8")).includes(anchor)) {
+        fail(`reference pointer: ${skill.name}: ${rel}#${anchor} matches no heading in ${rel}`);
+        broken++;
+      }
+    }
+  }
+  if (broken === 0) ok(`reference pointer: all ${checked} reference pointers resolve`);
+}
+
+// --- Check 17: the recon step enumerates before declaring a capability missing (deterministic-steps R4) ---
+console.log("recon enumeration:");
+{
+  // A capability check that is never made is a guess: the step must say what was found
+  // before it reports anything missing, in both the batch-executor and the plain form.
+  const brainstorming = loadSkills().find((skill) => skill.name === "pwk-brainstorming");
+  const lines = brainstorming.content.split("\n");
+  const start = lines.findIndex((line) => line.includes("Codebase recon"));
+  const end = start === -1 ? -1 : lines.findIndex((line, index) => index > start && /^\d+\. \*\*/.test(line));
+  const block = start === -1 ? "" : lines.slice(start, end === -1 ? lines.length : end).join("\n");
+  if (!block) {
+    fail("recon enumeration: pwk-brainstorming has no recon step to check");
+  } else {
+    const problems = [];
+    if (!/enumerat/i.test(block)) problems.push("no instruction to enumerate the session's capabilities");
+    if (!block.includes("ALL_TOOLS")) problems.push("no batch-executor form (Array.from(ALL_TOOLS))");
+    if (block.includes("Scout: unavailable") && !/enumeration result/i.test(block)) {
+      problems.push("the unavailability report does not require the enumeration result");
+    }
+    if (problems.length) for (const problem of problems) fail(`recon enumeration: ${problem}`);
+    else ok("recon enumeration: the recon step enumerates before reporting a capability missing");
+  }
+}
+
 console.log("");
 if (failures === 0) {
   console.log("skill-lint: all checks passed");
diff --git a/tests/stage-check.test.ts b/tests/stage-check.test.ts
new file mode 100644
index 0000000..dbbe183
--- /dev/null
+++ b/tests/stage-check.test.ts
@@ -0,0 +1,95 @@
+import { spawnSync } from "node:child_process";
+import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+
+/**
+ * Per-slice tests for the staging check (deterministic-steps R3).
+ *
+ * The helper answers one question before a review: is everything that belongs in the
+ * reviewed diff actually in the tree? These pin both sides of the boundary — the plan
+ * folder is legitimately dirty, anything else is not — and that a root it cannot verify
+ * fails loudly rather than passing.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/stage-check.mjs");
+
+function git(dir: string, args: string[]) {
+  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
+}
+
+/** A git repo with one commit and a committed file outside the plan folder. */
+function repo(prefix: string) {
+  const dir = mkdtempSync(join(tmpdir(), prefix));
+  git(dir, ["init", "-q"]);
+  writeFileSync(join(dir, "committed.txt"), "baseline\n");
+  mkdirSync(join(dir, "docs/plans/2026-10-14-sample"), { recursive: true });
+  writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-progress.md"), "in flight\n");
+  git(dir, ["add", "-A"]);
+  git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "baseline"]);
+  return dir;
+}
+
+const check = (dir: string) => spawnSync("node", [HELPER], { cwd: dir, encoding: "utf8" });
+
+describe("stage check", () => {
+  it("passes a tree with no changes", () => {
+    const dir = repo("pwk-stage-clean-");
+    try {
+      const result = check(dir);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("fails an untracked file outside the plan folder and prints its path", () => {
+    const dir = repo("pwk-stage-untracked-");
+    try {
+      mkdirSync(join(dir, "tests"), { recursive: true });
+      writeFileSync(join(dir, "tests/stray.test.ts"), "x\n");
+      const result = check(dir);
+      expect(result.status, "an untracked file outside docs/plans is a failure").not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`, "the failure names the path").toContain("tests/stray.test.ts");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("fails a modified tracked file outside the plan folder", () => {
+    const dir = repo("pwk-stage-modified-");
+    try {
+      writeFileSync(join(dir, "committed.txt"), "changed\n");
+      const result = check(dir);
+      expect(result.status).not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`).toContain("committed.txt");
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("passes when only the plan folder is dirty", () => {
+    const dir = repo("pwk-stage-plans-");
+    try {
+      writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-progress.md"), "updated in flight\n");
+      writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-review-packet.md"), "generated\n");
+      const result = check(dir);
+      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+
+  it("fails when the root is not a git worktree, naming the path", () => {
+    const dir = mkdtempSync(join(tmpdir(), "pwk-stage-norepo-"));
+    try {
+      const result = check(dir);
+      expect(result.status, "an unverifiable root must not pass silently").not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`, "the failure names the root").toContain(dir);
+    } finally {
+      rmSync(dir, { recursive: true, force: true });
+    }
+  });
+});
diff --git a/tests/tools/pins-lost.mjs b/tests/tools/pins-lost.mjs
index 576eebf..bf265af 100644
--- a/tests/tools/pins-lost.mjs
+++ b/tests/tools/pins-lost.mjs
@@ -1,46 +1,115 @@
-// Pins present in the committed version of a file but missing from the working copy.
-// Harvests BOTH quoted string literals and regex-pinned phrases (a test that asserts an
-// exact sentence with toMatch(/.../) pins that sentence just as hard as toContain("...").
-import { readFileSync, readdirSync } from "node:fs";
+#!/usr/bin/env node
+/**
+ * Authoring tool: the pinned phrases a revision carried that the working tree no longer does.
+ *
+ * A pin is a string the suite asserts verbatim, harvested from the same sources skill-lint
+ * reads. The checker reports the pins present and lost, and exits non-zero when a pin is
+ * gone, so a caller can gate on it.
+ *
+ * Usage: node tests/tools/pins-lost.mjs <skill-file> [--against <revision>]
+ */
 import { spawnSync } from "node:child_process";
-import { join } from "node:path";
-const target = process.argv[2];
-const pins = new Set();
-const add = (s) => {
-  if (s && s.length >= 20) pins.add(s);
+import { readFileSync, readdirSync, realpathSync } from "node:fs";
+import { join, relative, resolve } from "node:path";
+import { parseArgs } from "node:util";
+
+const pool = new Set();
+const add = (phrase) => {
+  if (phrase && phrase.length >= 20) pool.add(phrase);
 };
 const unquote = (raw) => {
   try {
-    return JSON.parse('"' + raw.replace(/"/g, '\\"') + '"');
+    return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
   } catch {
     return null;
   }
 };
 const harvest = (src) => {
-  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(m[1].replace(/\\\\/g, "\\")));
-  for (const m of src.matchAll(/`([^`]{20,})`/g)) add(m[1]);
-  // regex literals: strip escapes, then keep each literal alternative long enough to be prose
-  for (const m of src.matchAll(/\/((?:[^/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
-    const body = m[1].replace(/\\([().[\]{}*+?^$|/])/g, "$1");
+  for (const match of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(match[1].replace(/\\\\/g, "\\")));
+  for (const match of src.matchAll(/`([^`]{20,})`/g)) add(match[1]);
+  for (const match of src.matchAll(/\/((?:[^/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
+    const body = match[1].replace(/\\([().[\]{}*+?^$|/])/g, "$1");
     for (const part of body.split("|")) {
-      const phrase = part
-        .replace(/[[\](){}*+?^$]/g, "")
-        .replace(/\\s\+|\\s\*/g, " ")
-        .trim();
-      add(phrase);
+      add(
+        part
+          .replace(/[[\](){}*+?^$]/g, "")
+          .replace(/\\s\+|\\s\*/g, " ")
+          .trim(),
+      );
     }
   }
 };
-harvest(readFileSync("tests/markers.mjs", "utf8"));
-harvest(readFileSync("tests/skill-lint.mjs", "utf8"));
-for (const f of readdirSync("tests")) {
-  if (!/\.(mjs|ts)$/.test(f) || ["markers.mjs", "skill-lint.mjs", "prescription-sweep.mjs"].includes(f)) continue;
-  const src = readFileSync(join("tests", f), "utf8");
-  if (src.includes("skills/")) harvest(src);
+const readIfPresent = (path) => {
+  try {
+    return readFileSync(path, "utf8");
+  } catch {
+    return null;
+  }
+};
+
+// The pool mirrors skill-lint: the two canonical marker files, then every top-level test
+// file that names skills/. A missing file is skipped, never fatal.
+const SKIPPED = ["markers.mjs", "skill-lint.mjs", "prescription-sweep.mjs"];
+for (const name of ["tests/markers.mjs", "tests/skill-lint.mjs"]) {
+  const src = readIfPresent(name);
+  if (src) harvest(src);
+}
+for (const name of readdirSync("tests")) {
+  if (!/\.(mjs|ts)$/.test(name) || SKIPPED.includes(name)) continue;
+  const src = readIfPresent(join("tests", name));
+  if (src?.includes("skills/")) harvest(src);
+}
+
+const { values, positionals } = (() => {
+  try {
+    return parseArgs({
+      args: process.argv.slice(2),
+      allowPositionals: true,
+      options: { against: { type: "string" } },
+    });
+  } catch (error) {
+    console.error(`pins-lost.mjs: ${error.message}`);
+    process.exit(1);
+  }
+})();
+const target = positionals[0];
+if (!target) {
+  console.error("usage: node tests/tools/pins-lost.mjs <skill-file> [--against <revision>]");
+  process.exit(1);
+}
+const revision = values.against ?? "HEAD";
+
+const resolved = spawnSync("git", ["rev-parse", "--verify", `${revision}^{commit}`], { encoding: "utf8" });
+if (resolved.status !== 0) {
+  console.error(`pins-lost.mjs: revision "${revision}" does not resolve`);
+  process.exit(1);
+}
+
+// git needs a repo-relative path, while callers pass whatever path they hold.
+const real = (path) => {
+  try {
+    return realpathSync(path);
+  } catch {
+    return path;
+  }
+};
+// Real paths on both sides: /var is an alias of /private/var on macOS, so a textual
+// comparison of two correct paths would report the file as outside the repository.
+const toplevel = real(spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout?.trim() ?? "");
+const inRepo = relative(toplevel, real(resolve(target)));
+if (!toplevel || inRepo.startsWith("..")) {
+  console.error(`pins-lost.mjs: ${target} is outside the repository at ${toplevel || "(unknown)"}`);
+  process.exit(1);
+}
+const fromRevision = spawnSync("git", ["show", `${revision}:${inRepo}`], { encoding: "utf8" }).stdout ?? "";
+const current = readIfPresent(target) ?? "";
+const present = [...pool].filter((phrase) => current.includes(phrase));
+const lost = [...pool].filter((phrase) => fromRevision.includes(phrase) && !current.includes(phrase));
+
+console.log(
+  `pins-lost.mjs: ${target} against ${revision} — present ${present.length}, lost ${lost.length} (pin pool ${pool.size})`,
+);
+for (const phrase of lost) {
+  console.error(`  [${phrase.split(/\s+/).filter(Boolean).length}w] ${JSON.stringify(phrase.slice(0, 150))}`);
 }
-const old = spawnSync("git", ["show", "HEAD:" + target], { encoding: "utf8" }).stdout;
-const now = readFileSync(target, "utf8");
-const lost = [...pins].filter((p) => old.includes(p) && !now.includes(p));
-console.log("LOST from " + target + ": " + lost.length + "  (pin pool " + pins.size + ")");
-for (const p of lost)
-  console.log("  [" + p.split(/\s+/).filter(Boolean).length + "w] " + JSON.stringify(p.slice(0, 150)));
+process.exit(lost.length ? 1 : 0);

