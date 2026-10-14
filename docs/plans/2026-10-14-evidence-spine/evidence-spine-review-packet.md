# Review packet: 2026-10-14-evidence-spine — feature review

Base: c2c203178227553c6f1e3904057ea436448f7441

Head: 65c40f1700d73cbfc873986f22362f294e0f7744

## Commits

65c40f1 feat(evidence): Evidence rows in the execution summary, docs mirrors, 2.9.0 (evidence-spine R4)
50d25b3 feat(brainstorming): probe test in the completion gate (evidence-spine R3)
0009211 feat(brainstorming): decide-by-experiment tier in facts-vs-decisions (evidence-spine R2)
56cee4c feat(brainstorming): PRD brief opens understand-the-idea (evidence-spine R1)

## Changed files

 CHANGELOG.md                                       | 13 +++
 README.md                                          |  4 +-
 docs/developer-usage-guide.md                      |  2 +-
 docs/workflow-phases.md                            |  5 +-
 package.json                                       |  2 +-
 skills/pwk-brainstorming/SKILL.md                  |  4 +-
 .../pwk-brainstorming/references/design-format.md  |  2 +-
 skills/pwk-executing-tasks/SKILL.md                |  6 +-
 .../references/progress-format.md                  |  8 +-
 skills/pwk-finalizing/SKILL.md                     |  2 +-
 tests/evidence-spine.e2e.test.ts                   | 66 +++++++++++++++
 tests/lean-gates.e2e.test.ts                       |  2 +-
 tests/markers.mjs                                  | 31 ++++++-
 tests/skill-lint.mjs                               | 94 ++++++++++++++++++++++
 14 files changed, 223 insertions(+), 18 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R1: PRD brief
When a non-trivial topic arrives with source material, brainstorming opens step 3 with a cited, zero-context brief the human corrects before any frontier question.

**Acceptance criteria**
- Given a non-trivial topic whose input includes source material (a PRD, ticket, or spec — pasted text, a file path, or a URL), When step 3 of pwk-brainstorming begins, Then a brief is presented before any frontier question with three parts: Background, Current situation, and The delta.
- Given the brief, When a product claim is stated, Then it cites its PRD section, and When a code claim is stated, Then it cites `file:line`.
- Given the brief, When a claim cannot be cited, Then it is marked `(interpretation: …)` rather than presented as fact.
- Given any line of Current situation, When it is written, Then plain meaning comes first and the pointer second — the line is readable by someone who has not read the code.
- Given The delta, When it is written, Then each must-change line names a requirement candidate and the untouched surface is named.
- Given a corrected or confirmed brief, When frontier rounds continue, Then confirmed facts are woven into the design doc's sections and no sidecar brief file is created.
- Given a topic with no source material, When step 3 begins, Then no brief is presented and the existing flow is unchanged.
- Given source material that cannot be read (a dead link, a missing file, undecodable content), When the brief is attempted, Then the blocker is reported, the brief proceeds on code-only grounding, and the gap is named in the brief.
- Given a PRD written in another language, When domain terms appear in the brief, Then they are quoted verbatim with a plain-English gloss.

### Checkpoints: none
### Review: skip

### R2: Decide-by-experiment tier
A frontier question whose answer is observable by running something is settled by a bounded sketch and recorded with proof — never asked of the human first, never guessed.

**Acceptance criteria**
- Given a frontier question whose answer is observable by running something (behavior, timing, output, layout), When it is classified, Then it is routed to a bounded sketch rather than asked of the human or guessed.
- Given a runnable unknown, When its sketch runs, Then it is bounded to an inline interpreter or a file under `docs/plans/<topic>/`, with no installs and no source writes.
- Given a sketch that settles its question, When the fact enters the design doc, Then it carries `(settled by sketch: <what ran> → <result>)` at the place it lands.
- Given an inconclusive sketch, When the outcome is recorded, Then `INCONCLUSIVE` plus one line of what ran is written and the question returns to the human with the result attached.
- Given a sketch that cannot run (an interpreter is missing, a command is blocked by the guard), When the failure is recorded, Then the question returns as a decision with the failure attached — blocked installs are by design.
- Given a fact settled by sketch, When the round summary is written, Then the settled fact is listed so the human can strike it.
- Given a sketch result that would determine business behavior rather than a technical fact, When the design is presented, Then the assumption gate still sweeps it.
- Given a question answerable both by reading the code and by running something, When the settlement is chosen, Then the cheaper one wins — read first, run only when reading cannot decide.

### Checkpoints: none
### Review: skip

### R3: Probe test
A criterion is ready only when its Then names an outcome a command can observe; the completion gate sends nameless-probe criteria back for splitting or rephrasing.

**Acceptance criteria**
- Given a draft requirement criterion, When the completion gate audits it, Then its Then clause names an outcome a command can observe — a run, a grep, or an assertion — and a criterion with no nameable probe sends the requirement back for splitting or rephrasing.
- Given design-doc criteria, When they are written, Then none of them name tests — the probe materializes at execution.
- Given a criterion whose observable outcome is the presence of text or structure (for example a marker sentence), When its probe is named, Then a grep counts as a probe.

### Checkpoints: none
### Review: skip

### R4: Evidence rows
The execution summary carries an Evidence column pairing plain words with a pointer; no requirement is marked done without it, and the ship digest quotes the cells.

**Acceptance criteria**
- Given the execution-summary template, When it is instantiated in a progress file, Then the table carries an Evidence column following Deviated?.
- Given a requirement being marked done, When its execution-summary row is written, Then its Evidence cell is non-empty and pairs plain words with a pointer — what it proves in plain words, then a commit, a `file:line`, a command with its observed output line, or the single probe test.
- Given a requirement whose Evidence cell would be empty, When the done mark is about to be written, Then the marking is refused — either the pointer exists or the requirement is not done.
- Given the execution-summary rule paragraph, When this change lands, Then it permits one probe test inside Evidence and forbids lists — the shipped no-test-names rule is amended, not deleted.
- Given the ship digest, When it quotes execution-summary rows, Then Evidence cells are quoted so the human reads evidence rather than claims.
- Given any Evidence cell, When it is written, Then it stays single-line so the table does not break.

### Checkpoints: none
### Review: skip

## Problem

Real usage is sound: phases flow, reviews fire, the guard holds. The failures cluster at requirement content. The pwk-status topic is the recorded case — its final design needed three ship-feedback corrections, and all three were facts a five-minute run would have settled at design time (glob recursion in non-interactive shells, where state lives in the progress header, how rtk find rejects compound predicates). No tier existed between looking something up in code and asking the human. And when the human has not read the code, questions built on assumed familiarity produce "I have no idea" — the requirement then gets written on a guess. These four rules close both gaps.

## Approaches considered

- **Evidence spine, four rules (chosen).** Brief, experiment tier, probe sentence, evidence column. Each maps to one stated target; the digest inherits evidence by quoting rows it already quotes.
- **Criteria quality bar (folded).** A per-block checklist was proposed for criteria form. Rejected as a requirement of its own: recovered design docs from git history show criteria form was fine — guessed unknowns were the failure. The probe test keeps the one load-bearing sentence.
- **Full pstack import (rejected).** Decision-log TSV, sketch sections, experiment playbooks. Real ceremony for capability the kit mostly has; usage was reported as ok.
- **Five-requirement shape (fold).** An earlier proposal carried ship-digest wiring as its own requirement. Dropped: R4's column flows into the digest that already quotes execution-summary rows, so wiring is not a separate behavior.
- **Two-topic split with the slim pass (chosen).** Slimming moves pinned markers across seven files; this topic adds new ones to three. One PR would mix marker moves with marker additions and double review risk. Slim lands once, after the spine, on text that will not grow again.

## Architecture and data flow

Four insertions, no structure changes. The touch map:

| Surface | Change |
|---|---|
| skills/pwk-brainstorming/SKILL.md | step 3 head gains the PRD brief rule; the facts-vs-decisions sentence gains the runnable-facts tier; step 7's completion gate gains the probe sentence |
| skills/pwk-brainstorming/references/design-format.md | criteria audit gains the probe rule; the settled-by-sketch clause shape is recorded |
| skills/pwk-executing-tasks/references/progress-format.md | template gains the Evidence column; the rule paragraph is amended for the pairing and the single-probe exception |
| skills/pwk-executing-tasks/SKILL.md | the fill step names the Evidence cell and the refusal rule |
| skills/pwk-finalizing/SKILL.md | one line: the ship digest quotes Evidence cells |
| tests/markers.mjs and tests/skill-lint.mjs | new pinned markers for each rule, added test-first |
| README.md, docs/workflow-phases.md, docs/developer-usage-guide.md, CHANGELOG.md | vocabulary mirrors and version 2.9.0 |

Flow after landing: the PRD arrives, the brief explains it with citations, the human corrects it, frontier rounds settle runnable unknowns by sketch, the design doc's criteria pass the probe test, execution fills Evidence as each requirement lands, and the ship checkpoint shows rows that pair plain meaning with pointers. The human drills in only where a pointer smells wrong.

## Error handling

Failure paths are criterion-level in R1 and R2: unreadable source material, blocked or failed sketches, inconclusive results. Each records what happened and returns the question to the human with context — nothing is silently dropped. An empty Evidence cell at done-time is a refusal, not a warning. Stale pointers found at ship are flagged by the review digest and corrected before the gate passes.

## Testing

Markers and skill-lint assertions land before the skill text, per the test-first lesson in docs/lessons.md. Vitest single-doc tests pin each new sentence. `npm run check` is the full gate. Word discipline on every touched file: each added line is trigger, action, and where useful an example — no preamble sentences. CHANGELOG gains the 2.9.0 entry; the three docs mirrors carry the new vocabulary their consistency tests expect.


## Feature acceptance (verbatim)

## Feature acceptance

- Given the changed surfaces and their pinned markers, When `npm run check` runs, Then the full gate is green and each new marker sentence is found exactly once in its owning file.
- Given the updated README and docs/workflow-phases.md, When a reader searches for the four rule names, Then the PRD brief, the experiment tier, the probe test, and evidence rows each appear where their phase is described.


## Production-risk notes (verbatim, if any)


## Diff

diff --git a/CHANGELOG.md b/CHANGELOG.md
index f0218cb..65d6f80 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -6,6 +6,19 @@ The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
 ## [Unreleased]
 
+## [2.9.0] - 2026-10-14
+
+### Added
+
+- **PRD brief**: brainstorming opens with a cited, zero-context brief (background / current situation / the delta) when source material exists; the human corrects it before any requirement is written.
+- **Decide-by-experiment tier**: frontier questions answerable by running something settle by bounded sketches (`(settled by sketch: …)` proof clause; `INCONCLUSIVE` returns the question with context).
+- **Probe test**: a criterion is ready only when its `Then` names an outcome a command can observe.
+- **Evidence rows**: the execution summary gains an `Evidence` column — plain words plus pointer (commit, `file:line`, command + observed line, or the single probe test); no requirement is ✅ without one; the ship digest quotes them.
+
+### Changed
+
+- The shipped "no test names" execution-summary rule is amended: one probe test may be named inside `Evidence`, never a list.
+
 ## [2.8.1] - 2026-10-02
 
 ### Added
diff --git a/README.md b/README.md
index 67b5496..a736536 100644
--- a/README.md
+++ b/README.md
@@ -101,6 +101,8 @@ You control each phase — the agent never advances on its own. Invoke a skill t
 
 The design doc specifies *what*, not *how*. Each `### R<n>:` requirement block gives **acceptance criteria** (Given/When/Then, edge and error cases included) — no implementation code, no file-by-file recipe, no test-name lists. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria survive implementation changes.
 
+Brainstorm opens with a **PRD brief** when source material exists — background, current situation, and the delta, cited and zero-context, corrected by you before any requirement is written. Unknowns settle by **decide-by-experiment**: a question a run can answer is answered by a bounded sketch, never guessed. A criterion passes the **probe test**: its `Then` names an outcome a command can observe.
+
 ### Feature-Gate Execution
 
 The feature is implemented via the feature-gate flow:
@@ -109,7 +111,7 @@ The feature is implemented via the feature-gate flow:
 2. **Report it — no stop** — one or two lines saying what the E2E proves, plus its failing output; the run continues straight into implementation (that text was already approved as `## Feature acceptance` during brainstorm, so this is the window to object before code is written, not a sign-off gate)
 3. Implement the requirements back-to-back (TDD: meaningful test → red → green per slice; full autonomy)
 4. Feature review — risk-scaled: four fresh-context roles over a script-assembled review packet when the design carries production-risk content, otherwise one inline pass
-5. ⏸ **ship checkpoint** — full suite + feature E2E green; you review the execution summary + coverage table (full diff on request)
+5. ⏸ **ship checkpoint** — full suite + feature E2E green; you review the execution summary **Evidence rows** (plain words + pointer per requirement) + coverage table (full diff on request)
 
 Per-requirement checkpoints/reviews are opt-in (default off); the feature-level review covers everything.
 
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index 6aab212..e891fd7 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -34,7 +34,7 @@ Or in `.pi/settings.json` / `~/.pi/agent/config.json`:
 
 ## The workflow
 
-You control each phase by invoking the skill. One folder per topic: `docs/plans/<date>-<topic>/` holds the topic's design doc, progress file, and review packet, and is the unit disposed at finalize. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — more than one leaf in that same folder, under one status-free overview, on one branch, finalized once:
+You control each phase by invoking the skill. Requirements are grounded in evidence: a **PRD brief** opens brainstorm when source material exists, unknowns settle by **decide-by-experiment** (bounded sketch, proof clause), criteria pass the **probe test** (their `Then` names an outcome a command can observe), and the execution summary's **Evidence rows** pair plain words with a pointer — nothing is ✅ without one. One folder per topic: `docs/plans/<date>-<topic>/` holds the topic's design doc, progress file, and review packet, and is the unit disposed at finalize. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — more than one leaf in that same folder, under one status-free overview, on one branch, finalized once:
 
 ```
 /skill:pwk-brainstorming  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index 03da6af..2977486 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -26,7 +26,8 @@ brainstorm → executing-tasks → finalizing
 /skill:pwk-brainstorming
 ```
 
-- Explore requirements and shape the design. Interviews in **frontier rounds**: questions form a dependency tree seeded by a six-dimension checklist; each round asks the full frontier as numbered questions, each with a recommended answer; facts are looked up, only decisions asked; the interview ends when the frontier is empty — nothing left silently assumed — and an assumption gate sweeps the draft before the design is presented.
+- Explore requirements and shape the design. Interviews in **frontier rounds**: questions form a dependency tree seeded by a six-dimension checklist; each round asks the full frontier as numbered questions, each with a recommended answer; facts are looked up, runnable unknowns settle by **decide-by-experiment** (a bounded sketch with a proof clause), only decisions asked; the interview ends when the frontier is empty — nothing left silently assumed — and an assumption gate sweeps the draft before the design is presented.
+- Open with a **PRD brief** when source material exists (background / current situation / the delta — cited, zero-context, corrected by the human before any requirement is written); every criterion passes the **probe test**: its `Then` names an outcome a command can observe.
 - Produce `docs/plans/<date>-<topic>/<leaf>-design.md` — descriptive, the **single buildable artifact**: a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks — one `### R<n>:` block per requirement carrying its one-line behavior, **acceptance criteria** (Given/When/Then incl. edge/error cases) and Checkpoints/Review tags (no test-name lists, no separate plan doc) — ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the feature — the feature's definition-of-done).
 - May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/<date>-<topic>/overview.md` (the same topic folder, now with more than one leaf; a `## Parts (build order)` roster of leaves + build order) and the **first** leaf's `<leaf>-design.md` beside it. Later leaves are brainstormed one by one against the overview + implemented predecessors.
 - ADRs go to `docs/adr/` (permanent, never archived).
@@ -43,7 +44,7 @@ Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
 - After the review passes, the executor writes a **code digest** into the progress file — plain-language summary, execution flow, gotchas, key files — derived from the review packet; it rides the existing disposal globs.
 - Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the design doc tags (default off); see [Proportionality](#proportionality).
 - **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
-- Progress tracked in `docs/plans/<date>-<topic>/<leaf>-progress.md` (feature phase + requirement checklist).
+- Progress tracked in `docs/plans/<date>-<topic>/<leaf>-progress.md` (feature phase + requirement checklist); the execution summary's **Evidence rows** pair plain words with a pointer — no requirement is ✅ without one.
 
 No write restrictions. All tools available.
 
diff --git a/package.json b/package.json
index 6530005..6c0b3eb 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "@tianhai/pi-workflow-kit",
-  "version": "2.8.1",
+  "version": "2.9.0",
   "description": "Enforce structured design→execute→finalize workflow with TDD discipline in AI coding agents",
   "keywords": [
     "pi-package",
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 7fddf79..769e963 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -43,7 +43,7 @@ Before drafting, assess whether a large request has distinct testable outcomes t
    ```
 
    If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` **beside the design doc** means the split is already decided — read it for the roster and design this part's `<leaf>-design.md` against it (read [references/umbrella.md](references/umbrella.md) before proceeding).
-3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
+3. **Understand the idea** — **PRD brief.** When the topic arrives with source material (a PRD, ticket, or spec — pasted text, a file path, or a URL), open with a brief before any question: **Background** (the problem, why now, who is affected — each product claim cites its PRD section), **Current situation** (what the code does today — each claim cites `file:line`), **The delta** (what must change, each line naming a requirement candidate, and what stays untouched). Zero-context rule: plain meaning first, the pointer second — the reader has not read the code; quote non-English domain terms verbatim with a plain-English gloss; mark anything uncited `(interpretation: …)`. Unreadable source material: report the blocker, ground on code only, name the gap in the brief. The human corrects the brief before frontier rounds begin — confirmed facts weave into the design doc, no sidecar file. No source material, no brief. Then read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. **Runnable facts**: an unknown observable by running something — behavior, timing, output, layout — is settled by a bounded sketch, never asked of the human and never guessed: an inline interpreter or a file under `docs/plans/<topic>/`, no installs, no source writes (the guard already enforces the boundary); record the settled fact where it lands as `(settled by sketch: <what ran> → <result>)` and list it in the round summary so the human can strike it; a sketch result that would set business behavior still passes the assumption gate; inconclusive or blocked → record `INCONCLUSIVE` plus one line of what ran, and the question returns to the human with the result attached; a cheaper read beats a run when reading can decide. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
 6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.
@@ -53,7 +53,7 @@ Before drafting, assess whether a large request has distinct testable outcomes t
    Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; the human writes the approved ADR themselves or briefly runs `/pwk-guard off` — the agent never writes it while the design phase is gated.)
 7. **Write the design doc** — validate its structure before handing off; before writing either a trivial or non-trivial doc, read [references/design-format.md](references/design-format.md) for the exact format, tag defaults, risk/Setup rules, and audit. Requirement blocks carry acceptance criteria plus `### Checkpoints` / `### Review` tags. Missing tags default to `none` / `skip`. Write `docs/plans/<date>-<topic>/<leaf>-design.md`, creating the topic folder when absent. It is descriptive, not a task list; the executor builds directly from it.
 
-   **Completion gate:** Test observable behavior through the public interface. Audit every requirement's criteria, tags, and risk notes; confirm each appears exactly once. For non-trivial work, finish with end-to-end `## Feature acceptance` as the primary enforced spec. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — an unwritable step means an unspecified requirement, not permission to guess. Risk notes never set the tag — the written `### Review` value stays `skip` unless the human sets it, and only the human tags a slice for review. Keep designing until the requirements compose into a coherent feature and the human approves the design, including feature acceptance. Trivial work retains the compressed one-turn path above, not another recurring approval stop.
+   **Completion gate:** Test observable behavior through the public interface. Audit every requirement's criteria, tags, and risk notes; confirm each appears exactly once. A criterion is ready only when its `Then` names an outcome a command can observe — a run, a grep, or an assertion; a criterion with no nameable probe sends the requirement back for splitting or rephrasing, and design-doc criteria never name tests — the probe materializes at execution. For non-trivial work, finish with end-to-end `## Feature acceptance` as the primary enforced spec. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — an unwritable step means an unspecified requirement, not permission to guess. Risk notes never set the tag — the written `### Review` value stays `skip` unless the human sets it, and only the human tags a slice for review. Keep designing until the requirements compose into a coherent feature and the human approves the design, including feature acceptance. Trivial work retains the compressed one-turn path above, not another recurring approval stop.
 
    **Python prerequisite:** structural validation requires Python 3.9+ where commands execute, using only its standard library (no pip or project Node configuration). Confirm a compatible `python3` exists before invoking the helper. If Python is missing, unavailable, or too old, report the blocker and request a suitable runtime; stop at this gate. Do not auto-install Python, use a fallback implementation, or claim validation succeeded.
 
diff --git a/skills/pwk-brainstorming/references/design-format.md b/skills/pwk-brainstorming/references/design-format.md
index 879449c..3ad58ee 100644
--- a/skills/pwk-brainstorming/references/design-format.md
+++ b/skills/pwk-brainstorming/references/design-format.md
@@ -72,7 +72,7 @@ Touches a production-risk area (DB schema/migrations, auth, external APIs, concu
 
 Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."
 
-**Audit before finishing:** every requirement block has acceptance criteria and both tags, and each requirement appears **exactly once** — none dropped, none duplicated. A `## Feature acceptance` section exists as the primary enforced spec — on every non-trivial doc; a trivial doc ends after its `### R1:` block and ships on the full suite instead. Production-risk areas are reflected in the requirement blocks that touch them.
+**Audit before finishing:** every requirement block has acceptance criteria and both tags, and each requirement appears **exactly once** — none dropped, none duplicated. A `## Feature acceptance` section exists as the primary enforced spec — on every non-trivial doc; a trivial doc ends after its `### R1:` block and ships on the full suite instead. Production-risk areas are reflected in the requirement blocks that touch them. The probe test: a criterion is ready only when its `Then` names an outcome a command can observe — a run, a grep, or an assertion; a criterion with no nameable probe sends the requirement back for splitting or rephrasing; criteria never name tests — the probe materializes at execution. A fact settled by a sketch carries its proof where it lands — `(settled by sketch: <what ran> → <result>)` — woven into the section it confirms, never a new template section.
 
 ## Structural validator contract
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 3e46396..103a323 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -64,7 +64,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
 6. **Commit** the requirement with a clear message; record the requirement's commit hash in the Commit column.
 7. **Per-requirement review** *(fires only when the requirement's `### Review` tag is `parallel` or `inline` — default `skip`)* — review the slice now (see [Per-requirement review](#per-requirement-review-opt-in)); the row stays 🔄 through the review.
-8. **Mark the requirement ✅** and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`. For a reviewed requirement this fires only after the review returns clean.
+8. **Mark the requirement ✅** and write its execution-summary row in the same step — Evidence cell non-empty, plain words plus pointer; advance `Feature phase: implementing (k/N)`. For a reviewed requirement this fires only after the review returns clean.
 
 ### Per-requirement review (opt-in)
 
@@ -91,7 +91,7 @@ When every requirement's Done cell is terminal — `✅` (done), `❌` (failed,
    **Reconcile the Flow against reviewed reality before writing it.** The Flow is written from what was reviewed, not from recollection: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names — no hop invented, no reported path dropped. In `inline` mode there is no separate tracing report — the inline pass itself performs code tracing — so check the Flow against that pass's tracing findings and spec-coverage result instead. A discrepancy you cannot resolve is **surfaced** to the human in the ship checkpoint's findings status, never smoothed over by writing a Flow that omits the path.
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green (trivial doc: the suite line alone — there is no E2E);
-   - the **execution summary** — what each requirement became, deviations included;
+   - the **execution summary** — what each requirement became, deviations included, Evidence cells quoted so the human reads evidence rather than claims;
    - the **verdict rows** — list every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
    - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
    - the **coverage table** (one verdict row per R#) — from the spec-reviewer report in `parallel` mode, from the inline pass's spec alignment in `inline` mode;
@@ -200,7 +200,7 @@ Feature phase: e2e-written
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 ## Execution summary
-| R# | Requirement | How it was built | Deviated? |
+| R# | Requirement | How it was built | Deviated? | Evidence |
 ## Code digest
 ### Summary
 ### Flow
diff --git a/skills/pwk-executing-tasks/references/progress-format.md b/skills/pwk-executing-tasks/references/progress-format.md
index 20d9048..14fd62d 100644
--- a/skills/pwk-executing-tasks/references/progress-format.md
+++ b/skills/pwk-executing-tasks/references/progress-format.md
@@ -27,9 +27,9 @@ Read before creating or changing progress rows, or writing/re-presenting the cod
    | 1 | ⬜ | <requirement name> | — | — |
 
    ## Execution summary
-   | R# | Requirement | How it was built | Deviated? |
-   |----|-------------|------------------|-----------|
-   | 1 | <requirement name> | | |
+   | R# | Requirement | How it was built | Deviated? | Evidence |
+   |----|-------------|------------------|-----------|----------|
+   | 1 | <requirement name> | | | |
 
    ## Deviation records
 
@@ -76,7 +76,7 @@ Update the matching requirement row directly (not via pattern matching that coul
 - **Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. A `❌`/`⏭` row carries its reason as a suffix in the Requirement cell (finalizing's verdict greps read it), and its test coverage is reconciled in the same step — assertions removed or skipped with the reason; the suite must stay green. This skill sets all five values. A requirement under review stays `🔄`: `pwk-code-review` reports findings and never edits the Done cell — the loop only ever flips `🔄`→`✅` when the review returns clean, and findings leave the row `🔄` for another pass.
 - **Per-req ceremony cell** echoes the design doc's tag, not progress: `—` (default `none`/`skip`) · `⏸ full` (fires two stops — after the slice's tests and after it is complete) · `🔎 inline` · `🔎 parallel`.
 
-**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.
+**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test-name lists, no code** (the human reads this at the ship checkpoint — big picture only; the `Evidence` cell may name **one probe test**, never a list). The `Evidence` cell pairs **what it proves in plain words** with a pointer — a commit, a `file:line`, a command with its observed output line, or the single probe test — single-line so the table never breaks. No requirement is marked ✅ with an empty `Evidence` cell: either the pointer exists or the requirement is not done. If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.
 
 
 ## Commit entries for packet assembly
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 051bdf3..52362fa 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -42,7 +42,7 @@ Any command or tool recipe in this skill is an example, not the requirement —
    - **Append generic rules** to `docs/lessons.md` (strip domain specifics).
    - Both outputs are **honest-empty**: most features qualify for nothing — say so and move on; never manufacture. When an item passes the gates but the recorded material is too thin to draft a credible ADR, **ask the human rather than fabricating** context — the human was there.
    - The sweep is file-based by necessity: executing and finalizing usually run in fresh sessions with no memory of the brainstorm conversation — everything the sweep needs must already be on disk.
-3. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its topic folder `docs/plans/<date>-<topic>/` **as one unit**: every leaf's `-design.md`, `-progress.md`, and `-review-packet*.md`, plus `overview.md` for an umbrella. The digest sections (`## At a glance`, `## Execution summary`) live inside their host docs and ride the folder — no separate disposal. The folder path is taken verbatim from discovery, and the `????-??-??-` dated shape is the topic's identity — a bare `*<topic>*` pattern would over-match unrelated topics. Present both options and let the human choose:
+3. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its topic folder `docs/plans/<date>-<topic>/` **as one unit**: every leaf's `-design.md`, `-progress.md`, and `-review-packet*.md`, plus `overview.md` for an umbrella. The digest sections (`## At a glance`, `## Execution summary`) live inside their host docs and ride the folder — no separate disposal; the Evidence cells ride with the summary rows, so the shipped record keeps its proof. The folder path is taken verbatim from discovery, and the `????-??-??-` dated shape is the topic's identity — a bare `*<topic>*` pattern would over-match unrelated topics. Present both options and let the human choose:
 
    - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:
 
diff --git a/tests/evidence-spine.e2e.test.ts b/tests/evidence-spine.e2e.test.ts
new file mode 100644
index 0000000..af7e3cf
--- /dev/null
+++ b/tests/evidence-spine.e2e.test.ts
@@ -0,0 +1,66 @@
+import { readFileSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { EVIDENCE_SPINE_MARKERS as ESM } from "./markers.mjs";
+
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+
+function read(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+/** Marker -> the files that must each contain it exactly once. */
+const OWNERS: Partial<Record<keyof typeof ESM, string[]>> = {
+  briefRule: ["skills/pwk-brainstorming/SKILL.md"],
+  zeroContextRule: ["skills/pwk-brainstorming/SKILL.md"],
+  interpretationMark: ["skills/pwk-brainstorming/SKILL.md"],
+  runnableFacts: ["skills/pwk-brainstorming/SKILL.md"],
+  sketchClause: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
+  inconclusiveMark: ["skills/pwk-brainstorming/SKILL.md"],
+  probeTest: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
+  probeKinds: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
+  evidenceColumn: ["skills/pwk-executing-tasks/references/progress-format.md", "skills/pwk-executing-tasks/SKILL.md"],
+  evidencePairing: ["skills/pwk-executing-tasks/references/progress-format.md"],
+  singleProbe: ["skills/pwk-executing-tasks/references/progress-format.md"],
+  evidenceRefusal: ["skills/pwk-executing-tasks/references/progress-format.md"],
+  evidenceFillStep: ["skills/pwk-executing-tasks/SKILL.md"],
+  digestQuotesEvidence: ["skills/pwk-finalizing/SKILL.md"],
+};
+
+/**
+ * Feature acceptance for evidence-spine.
+ *
+ * The deliverable is skill/document text, so the observable interface is the
+ * content the host loads (the kit's E2E idiom). Scenario 1 proves each rule's
+ * marker sentence greps exactly once in its owning file (and that the bare
+ * four-column execution summary is gone from the template); scenario 2 proves
+ * the README and workflow-phases name the four rules where their phases are
+ * described. The full gate (`npm run check`) runs at the ship checkpoint.
+ */
+describe("evidence-spine (feature E2E)", () => {
+  it("scenario 1 — each rule's marker sentence appears exactly once in its owning file", () => {
+    for (const [marker, files] of Object.entries(OWNERS)) {
+      for (const rel of files ?? []) {
+        const occurrences = read(rel).split(ESM[marker as keyof typeof ESM]).length - 1;
+        expect(occurrences, `${marker} in ${rel}`).toBe(1);
+      }
+    }
+  });
+
+  it("scenario 1 (continued) — the bare four-column execution summary is gone from the template", () => {
+    expect(read("skills/pwk-executing-tasks/references/progress-format.md")).not.toMatch(
+      /^\| R# \| Requirement \| How it was built \| Deviated\? \|$/m,
+    );
+  });
+
+  it("scenario 2 — the README and workflow-phases name the four rules where their phases are described", () => {
+    for (const rel of ["README.md", "docs/workflow-phases.md"]) {
+      const doc = read(rel);
+      expect(doc, `${rel} names the PRD brief`).toContain(ESM.briefName);
+      expect(doc, `${rel} names the decide-by-experiment tier`).toContain(ESM.tierName);
+      expect(doc, `${rel} names the probe test`).toContain(ESM.probeName);
+      expect(doc, `${rel} names Evidence rows`).toContain(ESM.evidenceName);
+    }
+  });
+});
diff --git a/tests/lean-gates.e2e.test.ts b/tests/lean-gates.e2e.test.ts
index 0ce917a..d77d287 100644
--- a/tests/lean-gates.e2e.test.ts
+++ b/tests/lean-gates.e2e.test.ts
@@ -108,7 +108,7 @@ describe("leaner execution gates (feature E2E)", () => {
     expect(executing).toContain(LEAN_GATES_MARKERS.flowCap);
     expect(executing).toContain(LEAN_GATES_MARKERS.flowWalkthroughOffer);
     // The Execution summary stays four columns — no location/commit column.
-    expect(DIGEST_MARKERS.execSummaryTable).toBe("| R# | Requirement | How it was built | Deviated? |");
+    expect(DIGEST_MARKERS.execSummaryTable).toBe("| R# | Requirement | How it was built | Deviated? | Evidence |");
     expect(executing).not.toMatch(/\|\s*Look at\s*\|/);
 
     // R6 — the Flow must agree with reviewed reality, and disagreements surface.
diff --git a/tests/markers.mjs b/tests/markers.mjs
index 1b28df4..9ef41d1 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -10,7 +10,7 @@ export const DIGEST_MARKERS = {
   atAGlance: "## At a glance",
   atAGlanceTable: "| R# | Requirement in one line | Risk |",
   execSummary: "## Execution summary",
-  execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
+  execSummaryTable: "| R# | Requirement | How it was built | Deviated? | Evidence |",
   fillAsYouLand: "same step as marking",
   deviationAtDeviation: "when the departure happens",
   shipPaused: "ship-paused",
@@ -219,6 +219,35 @@ export const TOOL_FREEDOM_MARKERS = {
     "The `tools:` frontmatter is the minimum grant requested of the delegation provider, not a prescription — use any tool your host actually grants.",
 };
 
+/**
+ * Markers for the evidence-spine feature: the PRD brief that opens brainstorming
+ * (zero-context, cited, human-corrected), the decide-by-experiment tier inside the
+ * facts-vs-decisions rule, the probe test in the completion gate, and the execution
+ * summary's Evidence column with its pairing and refusal rules. Same contract as
+ * DIGEST_MARKERS — one canonical string per behavior, shared by skill-lint and the
+ * vitest suites.
+ */
+export const EVIDENCE_SPINE_MARKERS = {
+  briefRule: "open with a brief before any question",
+  zeroContextRule: "plain meaning first, the pointer second",
+  interpretationMark: "(interpretation: …)",
+  runnableFacts: "settled by a bounded sketch",
+  sketchClause: "(settled by sketch:",
+  inconclusiveMark: "INCONCLUSIVE",
+  probeTest: "no nameable probe",
+  probeKinds: "a run, a grep, or an assertion",
+  evidenceColumn: "| R# | Requirement | How it was built | Deviated? | Evidence |",
+  evidencePairing: "what it proves in plain words",
+  singleProbe: "one probe test",
+  evidenceRefusal: "or the requirement is not done",
+  evidenceFillStep: "Evidence cell non-empty",
+  digestQuotesEvidence: "Evidence cells",
+  briefName: "PRD brief",
+  tierName: "decide-by-experiment",
+  probeName: "probe test",
+  evidenceName: "Evidence rows",
+};
+
 /**
  * Canonical executor-script sweep example (codemode preference): one sandboxed
  * batch-executor call lists in-flight designs and extracts each topic's phase
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 6c0f729..263868c 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -14,6 +14,7 @@ import {
   CODE_DIGEST_MARKERS,
   DIGEST_MARKERS,
   DIGEST_RENDERING_MARKERS,
+  EVIDENCE_SPINE_MARKERS,
   SINGLE_DOC_MARKERS,
   STATUS_STATE_MARKERS,
   TOOL_FREEDOM_MARKERS,
@@ -1492,6 +1493,99 @@ console.log("codemode sweep script:");
 // gates, the pinned disposal commands) or framed as one example. Stragglers the recon
 // inventory missed fail loudly here; the fix is framing the site or deliberately
 // sanctioning the recipe in tests/prescription-sweep.mjs — never a silent exemption.
+// evidence-spine R1 — the PRD brief opens understand-the-idea: cited,
+// zero-context, human-corrected before frontier rounds.
+if (bs) {
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.briefRule,
+    "PRD brief opens before any question",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.zeroContextRule,
+    "zero-context plain-meaning-first rule",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.interpretationMark,
+    "inference mark for uncited claims",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.runnableFacts,
+    "runnable facts settle by bounded sketch",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.sketchClause,
+    "settled-by-sketch clause in the interview rule",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.inconclusiveMark,
+    "INCONCLUSIVE returns the question with context",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.probeTest,
+    "probe test rejects nameless-probe criteria",
+  );
+  fgMark(
+    "pwk-brainstorming",
+    bs.contractContent,
+    EVIDENCE_SPINE_MARKERS.probeKinds,
+    "probe kinds: run, grep, assertion",
+  );
+}
+if (et) {
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    EVIDENCE_SPINE_MARKERS.evidenceColumn,
+    "execution summary carries the Evidence column",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    EVIDENCE_SPINE_MARKERS.evidenceFillStep,
+    "done mark only with a non-empty Evidence cell",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    EVIDENCE_SPINE_MARKERS.evidencePairing,
+    "evidence pairs plain words with a pointer",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    EVIDENCE_SPINE_MARKERS.singleProbe,
+    "one probe test allowed, never a list",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.contractContent,
+    EVIDENCE_SPINE_MARKERS.evidenceRefusal,
+    "empty Evidence cell refuses the done mark",
+  );
+}
+if (fin) {
+  fgMark(
+    "pwk-finalizing",
+    fin.contractContent,
+    EVIDENCE_SPINE_MARKERS.digestQuotesEvidence,
+    "disposed digests keep their Evidence cells",
+  );
+}
+
 console.log("prescription sweep:");
 {
   let violations = 0;

