# Review packet: remove-pwk-diagnose — feature review

## Commits
493c752 fix: address the feature review's findings
1187f03 docs: simplify the six surviving skills, prose-only (R5)
43bae93 docs: align pwk-code-review checklists with the four role contracts (R4)
7bbd11f docs: sweep pwk-diagnose out of every shipped artifact (R3)
f1eacd8 test: drop pwk-diagnose from lint + test corpora (R2)
0a3b475 test: add remove-pwk-diagnose feature E2E (red) + progress file
f291ec0 feat!: remove pwk-diagnose skill and its guard unlock (R1)

## Changed files
 CHANGELOG.md                                       |  15 +++
 README.md                                          |  10 +-
 docs/developer-usage-guide.md                      |  14 +--
 docs/oversight-model.md                            |   9 +-
 .../2026-09-11-remove-pwk-diagnose-progress.md     |  25 +++++
 docs/plans/2026-09-11-skill-slimming-notes.md      |  35 ------
 docs/workflow-phases.md                            |  12 +-
 extensions/workflow-guard.ts                       |  14 +--
 skills/pwk-brainstorming/SKILL.md                  |   2 +-
 skills/pwk-code-review/SKILL.md                    |  32 ++++--
 skills/pwk-diagnose/SKILL.md                       |  60 ----------
 skills/pwk-executing-tasks/SKILL.md                |  30 ++---
 skills/pwk-finalizing/SKILL.md                     |   2 +-
 skills/pwk-status/SKILL.md                         |   4 +-
 tests/human-review-digests.test.ts                 |  16 ++-
 tests/lean-gates.criteria.test.ts                  |   2 +-
 tests/lean-gates.e2e.test.ts                       |   2 +-
 tests/markers.mjs                                  |   8 +-
 tests/remove-pwk-diagnose.e2e.test.ts              | 121 +++++++++++++++++++++
 tests/skill-lint.mjs                               |  46 ++++++--
 tests/workflow-consistency.e2e.test.ts             |   4 +-
 tests/workflow-consistency.test.ts                 |  20 ++--
 tests/workflow-guard.test.ts                       |  18 +--
 23 files changed, 294 insertions(+), 207 deletions(-)

## Acceptance criteria (verbatim from the design doc)
### R1 — Delete the skill and close the guard unlock

Remove `skills/pwk-diagnose/SKILL.md` (the whole `skills/pwk-diagnose/` dir). Remove `"pwk-diagnose"` from the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts` (anchor: `export const UNLOCK_SKILLS = [`); the input handler dereferences the export so no handler change is needed.

Given the skill dir is deleted and the unlock entry is dropped, When a session invokes `/skill:pwk-diagnose`, Then the skill is not found and the guard stays in the gated phase (no unlock path remains). Edge: in-flight topics that mention diagnose in prose are unaffected — prose is not an unlock.

### Checkpoints

`none`

### Review

`skip`

### R2 — Update tests and lint that enumerate `pwk-diagnose`

`tests/skill-lint.mjs` (anchors: `EXPECTED_UNLOCK`, the `pwk-diagnose must claim it exits the gated phase` block, `UTILITY_SKILLS`): drop `pwk-diagnose` from `EXPECTED_UNLOCK` and `UTILITY_SKILLS`, delete the diagnose-specific unlock-claim assertion. `tests/workflow-guard.test.ts` (anchor: the unlock-list array): drop the entry. `tests/workflow-consistency.test.ts` (anchor: `const diagnose = read("skills/pwk-diagnose/SKILL.md")`): remove the read plus any assertion built on it. `tests/human-review-digests.test.ts` (anchor: `"skills/pwk-diagnose/SKILL.md"` in the corpus list): remove the entry. `tests/skill-delegation-contract.test.ts`, `tests/integration-guidance.test.ts`, `tests/workflow-consistency.e2e.test.ts`: remove only if they reference diagnose (sweep, don't force).

Given the R1 deletion, When `npm run check` runs, Then the full gate (biome + vitest + skill-lint) is green with no diagnose-aware assertion failing or asserting on a missing file.

### Checkpoints

`none`

### Review

`skip`

### R3 — Sweep docs and the executing-tasks reference

Retain-then-reword (Q2) plus full cleanup (Q4):

- `skills/pwk-executing-tasks/SKILL.md` (anchor: `Bugs found mid-execution (e.g. fixed via \`pwk-diagnose\`)`): keep the sentence, delete only the parenthetical — `Bugs found mid-execution are mandatory execution-summary content: …`.
- `docs/workflow-phases.md`: delete the `## diagnose` section (anchor: `/skill:pwk-diagnose` code fence under it); fix the `During executing-tasks, code-review, finalizing, diagnose` phase line to drop `diagnose`.
- `docs/developer-usage-guide.md`: delete the `### Diagnose (on demand)` block and the debugging-loop paragraph; drop `pwk-diagnose` from the unlock-set prose (anchor: `The exact unlock set is`).
- `docs/oversight-model.md`: delete the `pwk-diagnose` bullet (anchor: `6-phase debugging loop`); drop it from the unlock prose (anchor: `or \`pwk-walkthrough\` exits the gated phase`).
- `README.md`: drop the `| **Diagnose** |` skill-table row, the `pwk-diagnose/SKILL.md` inventory-tree line, and `pwk-diagnose` from the unlocking-skills prose (anchor: `Unlocking skills:`).
- `package.json` keywords / `pi.skills` manifest: change only if they name diagnose (sweep).
- Out of scope: `CHANGELOG.md` history entries stay (immutable record); the removal itself gets one new entry under Unreleased.

Given the sweep, When grepping the repo for `pwk-diagnose` (excluding `CHANGELOG.md` history and this design doc), Then there are zero hits, and each edited doc still reads coherently (no orphaned "the four skills" counts, no dangling cross-references).

### Checkpoints

`none`

### Review

`skip`

### R4 — Align `pwk-code-review` checklists with the four role contracts

In `skills/pwk-code-review/SKILL.md`, replace the prose of steps 2–5 with the four `Your checklist` sections from the role contracts, verbatim where authority allows:

- Tracing ← `agents/pwk-tracing-reviewer.md` checklist verbatim.
- Spec alignment ← `agents/pwk-spec-reviewer.md` checklist verbatim, including the per-requirement coverage table.
- Smells ← `agents/pwk-smell-reviewer.md` item list verbatim, but keep the skill's unlocked behavior: apply fixes directly and re-run tests (the role's "flag large refactors for the main agent" direction is inverted — there is no main agent in the inline path).
- Hazards ← `agents/pwk-hazard-reviewer.md` 7-item audit verbatim.

Steps 1 (scope), 6 (report), 7 (mark done) and the `Unlocked` framing stay as-is. No reporting-contract port (no mandatory `file:line` evidence rule, no `No findings` requirement), no packet-discipline port.

Given the four role checklists, When reading the rewritten skill, Then each checklist reads identically to its role counterpart (modulo the smell-fix inversion), and the skill's process/reporting sections are unchanged from today. Edge: future role-checklist edits must be mirrored here — note it in the R4 commit message; the S1 lint assertion in R5 covers shared-sentence drift, not checklist drift.

### Checkpoints

`none`

### Review

`skip`

### R5 — Simplify remaining skills (clarity + redundancy pass)

Supersedes `docs/plans/2026-09-11-skill-slimming-notes.md` (delete it in this requirement — its content now lives here; the 2.3.0 timing gate is satisfied since F1–F15 have landed). Scope: all six surviving skills (`pwk-brainstorming`, `pwk-executing-tasks`, `pwk-code-review` as rewritten by R4, `pwk-finalizing`, `pwk-status`, `pwk-walkthrough`). Builds on R1–R4 results; run last.

Method (code-simplifier principles adapted to prose — preserve behavior, only change how it reads):

- **S1** — canonicalize the cross-skill boilerplate (root-check paragraph, discovery recipe) to verbatim-identical wording in the four skills that carry it, plus a skill-lint assertion pinning the shared sentences.
- **S2** — compress the code-digest double-explanation in `pwk-executing-tasks` to one canonical layer with pointers (the 15-line Flow cap, `[R<n>]` tagging, and `was:` semantics survive verbatim).
- **S3** — compress `## Tags reference` to a table; full resolution prose lives only at the point of use.
- General pass — remove duplicated explanations elsewhere (keep one canonical layer, point to it), sharpen vague wording. Prose-only: no gate, checklist, tag, or ceremony semantics change.

Settled non-goals (from the seed, do not reopen): no shared-file extraction (skills stay self-contained), no brevity pass on checkpoint/ship-gate prose (ADR decision records), no line-count target.

Given the six skills, When the pass is done, Then `npm run check` is green (including the new S1 lint assertion and the F14 inventory parity), the diff shows prose-only changes outside the S1–S3 mechanics, and every gate/checklist/tag still reads with identical normative meaning. Edge: where a simplification risks changing meaning, keep the longer wording — clarity over compactness.

### Checkpoints

`none`

### Review

`skip`

## Feature acceptance (verbatim)
## Feature acceptance

Run from the repo root on a clean tree: `npm run check` is green, `skills/pwk-diagnose/` does not exist, and a repo-wide grep for `pwk-diagnose` returns zero hits outside `CHANGELOG.md` history entries and this design doc (history is immutable; the design doc is disposed at finalize).

## Production-risk areas

None — deletion of docs/config surface plus test updates; no runtime data paths, no migrations, no concurrency.

### R1 — Delete the skill and close the guard unlock

Remove `skills/pwk-diagnose/SKILL.md` (the whole `skills/pwk-diagnose/` dir). Remove `"pwk-diagnose"` from the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts` (anchor: `export const UNLOCK_SKILLS = [`); the input handler dereferences the export so no handler change is needed.

Given the skill dir is deleted and the unlock entry is dropped, When a session invokes `/skill:pwk-diagnose`, Then the skill is not found and the guard stays in the gated phase (no unlock path remains). Edge: in-flight topics that mention diagnose in prose are unaffected — prose is not an unlock.

### Checkpoints

`none`

### Review

`skip`

### R2 — Update tests and lint that enumerate `pwk-diagnose`

`tests/skill-lint.mjs` (anchors: `EXPECTED_UNLOCK`, the `pwk-diagnose must claim it exits the gated phase` block, `UTILITY_SKILLS`): drop `pwk-diagnose` from `EXPECTED_UNLOCK` and `UTILITY_SKILLS`, delete the diagnose-specific unlock-claim assertion. `tests/workflow-guard.test.ts` (anchor: the unlock-list array): drop the entry. `tests/workflow-consistency.test.ts` (anchor: `const diagnose = read("skills/pwk-diagnose/SKILL.md")`): remove the read plus any assertion built on it. `tests/human-review-digests.test.ts` (anchor: `"skills/pwk-diagnose/SKILL.md"` in the corpus list): remove the entry. `tests/skill-delegation-contract.test.ts`, `tests/integration-guidance.test.ts`, `tests/workflow-consistency.e2e.test.ts`: remove only if they reference diagnose (sweep, don't force).

Given the R1 deletion, When `npm run check` runs, Then the full gate (biome + vitest + skill-lint) is green with no diagnose-aware assertion failing or asserting on a missing file.

### Checkpoints

`none`

### Review

`skip`

### R3 — Sweep docs and the executing-tasks reference

Retain-then-reword (Q2) plus full cleanup (Q4):

- `skills/pwk-executing-tasks/SKILL.md` (anchor: `Bugs found mid-execution (e.g. fixed via \`pwk-diagnose\`)`): keep the sentence, delete only the parenthetical — `Bugs found mid-execution are mandatory execution-summary content: …`.
- `docs/workflow-phases.md`: delete the `## diagnose` section (anchor: `/skill:pwk-diagnose` code fence under it); fix the `During executing-tasks, code-review, finalizing, diagnose` phase line to drop `diagnose`.
- `docs/developer-usage-guide.md`: delete the `### Diagnose (on demand)` block and the debugging-loop paragraph; drop `pwk-diagnose` from the unlock-set prose (anchor: `The exact unlock set is`).
- `docs/oversight-model.md`: delete the `pwk-diagnose` bullet (anchor: `6-phase debugging loop`); drop it from the unlock prose (anchor: `or \`pwk-walkthrough\` exits the gated phase`).
- `README.md`: drop the `| **Diagnose** |` skill-table row, the `pwk-diagnose/SKILL.md` inventory-tree line, and `pwk-diagnose` from the unlocking-skills prose (anchor: `Unlocking skills:`).
- `package.json` keywords / `pi.skills` manifest: change only if they name diagnose (sweep).
- Out of scope: `CHANGELOG.md` history entries stay (immutable record); the removal itself gets one new entry under Unreleased.

Given the sweep, When grepping the repo for `pwk-diagnose` (excluding `CHANGELOG.md` history and this design doc), Then there are zero hits, and each edited doc still reads coherently (no orphaned "the four skills" counts, no dangling cross-references).

### Checkpoints

`none`

### Review

`skip`

### R4 — Align `pwk-code-review` checklists with the four role contracts

In `skills/pwk-code-review/SKILL.md`, replace the prose of steps 2–5 with the four `Your checklist` sections from the role contracts, verbatim where authority allows:

- Tracing ← `agents/pwk-tracing-reviewer.md` checklist verbatim.
- Spec alignment ← `agents/pwk-spec-reviewer.md` checklist verbatim, including the per-requirement coverage table.
- Smells ← `agents/pwk-smell-reviewer.md` item list verbatim, but keep the skill's unlocked behavior: apply fixes directly and re-run tests (the role's "flag large refactors for the main agent" direction is inverted — there is no main agent in the inline path).
- Hazards ← `agents/pwk-hazard-reviewer.md` 7-item audit verbatim.

Steps 1 (scope), 6 (report), 7 (mark done) and the `Unlocked` framing stay as-is. No reporting-contract port (no mandatory `file:line` evidence rule, no `No findings` requirement), no packet-discipline port.

Given the four role checklists, When reading the rewritten skill, Then each checklist reads identically to its role counterpart (modulo the smell-fix inversion), and the skill's process/reporting sections are unchanged from today. Edge: future role-checklist edits must be mirrored here — note it in the R4 commit message; the S1 lint assertion in R5 covers shared-sentence drift, not checklist drift.

### Checkpoints

`none`

### Review

`skip`

### R5 — Simplify remaining skills (clarity + redundancy pass)

Supersedes `docs/plans/2026-09-11-skill-slimming-notes.md` (delete it in this requirement — its content now lives here; the 2.3.0 timing gate is satisfied since F1–F15 have landed). Scope: all six surviving skills (`pwk-brainstorming`, `pwk-executing-tasks`, `pwk-code-review` as rewritten by R4, `pwk-finalizing`, `pwk-status`, `pwk-walkthrough`). Builds on R1–R4 results; run last.

Method (code-simplifier principles adapted to prose — preserve behavior, only change how it reads):

- **S1** — canonicalize the cross-skill boilerplate (root-check paragraph, discovery recipe) to verbatim-identical wording in the four skills that carry it, plus a skill-lint assertion pinning the shared sentences.
- **S2** — compress the code-digest double-explanation in `pwk-executing-tasks` to one canonical layer with pointers (the 15-line Flow cap, `[R<n>]` tagging, and `was:` semantics survive verbatim).
- **S3** — compress `## Tags reference` to a table; full resolution prose lives only at the point of use.
- General pass — remove duplicated explanations elsewhere (keep one canonical layer, point to it), sharpen vague wording. Prose-only: no gate, checklist, tag, or ceremony semantics change.

Settled non-goals (from the seed, do not reopen): no shared-file extraction (skills stay self-contained), no brevity pass on checkpoint/ship-gate prose (ADR decision records), no line-count target.

Given the six skills, When the pass is done, Then `npm run check` is green (including the new S1 lint assertion and the F14 inventory parity), the diff shows prose-only changes outside the S1–S3 mechanics, and every gate/checklist/tag still reads with identical normative meaning. Edge: where a simplification risks changing meaning, keep the longer wording — clarity over compactness.

### Checkpoints

`none`

### Review

`skip`

## Production-risk notes (verbatim, if any)

## Diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index a47d030..15e25b3 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -4,6 +4,21 @@ All notable changes to this project will be documented in this file.
 
 The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
+## [Unreleased]
+
+### Removed
+
+- **`pwk-diagnose` is gone (breaking)** — the skill directory and its guard unlock entry are deleted, so `/skill:pwk-diagnose` no longer resolves and no longer exits the gated phase. The kit never used it; any open-source debugging skill covers the need. `UNLOCK_SKILLS` is now `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-walkthrough`.
+
+### Fixed
+
+- **Inventory docs no longer advertise the removed skill** — the roster tables, skill trees, unlock prose, ASCII diagram, and count claims in `README.md`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, and `docs/oversight-model.md` were swept to the real roster (4 pipeline + 2 utility skills).
+
+### Changed
+
+- **`pwk-code-review` checklists aligned with the four role contracts** — steps 2–5 now carry the `Your checklist` sections from `agents/pwk-{tracing,spec,smell,hazard}-reviewer.md` (the smell list keeps its unlocked apply-fixes behavior). Three deliberate divergences, all forced by the skill's unlocked/design-doc context: the coverage table is keyed on the design doc's `### R<n>:` headings rather than packet headings, the reporting-contract lines (`file:line` evidence, the `No findings` requirement) are not ported, and the tracing line reads "the acceptance criteria and the feature E2E" because "integration tests" is stale terminology this repo bans in that file. Process and reporting sections are unchanged.
+- **Prose-only simplification pass across the six surviving skills** — the cross-skill root-check/discovery boilerplate is now verbatim-identical and lint-pinned, the code-digest explanation in `pwk-executing-tasks` collapses to one canonical layer with pointers, and `## Tags reference` is a table.
+
 ## [2.3.0] - 2026-09-11
 
 ### Fixed
diff --git a/README.md b/README.md
index b8986c6..14bf8de 100644
--- a/README.md
+++ b/README.md
@@ -51,14 +51,14 @@ Enforces phase-appropriate tool access — not just guidelines, but hard blocks:
 | Phase | `write` / `edit` | `bash` |
 |-------|:-:|:-:|
 | **Design** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
-| **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Walkthrough** | ✅ Full access | ✅ Full access |
+| **Execute** / **Code-review** / **Finalize** / **Walkthrough** | ✅ Full access | ✅ Full access |
 | **Status** | ✅ Full access (read-only orientation) | ✅ Full access (read-only orientation) |
 
 The agent can read code and discuss design with you during the design phase, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.
 
-Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, `pwk-walkthrough` (all write beyond `docs/plans/`, so all exit the gate); `pwk-status` stays read-only and runs inside the gate. The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.
+Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-walkthrough` (all write beyond `docs/plans/`, so all exit the gate); `pwk-status` stays read-only and runs inside the gate. The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.
 
-### 🧠 7 Workflow Skills
+### 🧠 6 Workflow Skills
 
 Guide the agent through a disciplined development process:
 
@@ -66,7 +66,7 @@ Guide the agent through a disciplined development process:
 brainstorm → executing-tasks → finalizing
                              (feature-gate: write feature E2E → report it → implement → review → ⏸ ship checkpoint)
                                 ↕
-                   diagnose (anytime)   ·   status (anytime)
+                             status (anytime)
 ```
 
 A **design doc is one PR**; a **requirement is one testable slice within it**. A requirement too big for one design doc but shipping as one PR is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once.
@@ -77,7 +77,6 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
 | **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **report it, no stop** → implement the design doc's `### R<n>` requirement blocks → feature review (risk-scaled: four roles or one inline pass) → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
 | **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
 | **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs or archive them under `docs/plans/completed/` (discovery always runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), update README/CHANGELOG, create PR |
-| **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
 | **Walkthrough** | `/skill:pwk-walkthrough` | On demand: generate a detailed, file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md` (Summary / How it works / Key flows / Gotchas & invariants / Change map); stamped with the commit range, regenerated wholesale, never disposed. **Exits the gated phase** |
 | **Status** | `/skill:pwk-status` | Read-only overview of all active design topics — phase + progress. Use when resuming or juggling several designs in parallel worktrees. Not a pipeline phase; **does not exit the gated phase**. |
 
@@ -186,7 +185,6 @@ pi-workflow-kit/
 │   ├── pwk-code-review/SKILL.md
 │   ├── pwk-finalizing/SKILL.md
 │   ├── pwk-status/SKILL.md
-│   ├── pwk-diagnose/SKILL.md
 │   └── pwk-walkthrough/SKILL.md      # on-demand explainer; docs/walkthroughs/ output
 ├── agents/                   # canonical role contracts; /pwk-setup copies them to .agents/agents/
 ├── docs/
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index ae6eeb7..f7916ef 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -7,7 +7,7 @@ The kit enforces a design → execute → finalize workflow: one buildable desig
 ## What you get
 
 - **4 pipeline skills** — brainstorm → executing-tasks → finalizing, with code-review running at the feature level during execution.
-- **3 utility skills** — diagnose (debugging), status (multi-topic overview), and walkthrough (on-demand explainer), all invoked on demand.
+- **2 utility skills** — status (multi-topic overview) and walkthrough (on-demand explainer), both invoked on demand.
 - **1 extension** — hard-blocks source writes during the design phase, and blocks destructive bash via a simple common-blacklist.
 
 ## Installation
@@ -82,12 +82,6 @@ In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents
 
 **Pre-check: run the full test suite** — never ship a red suite (resume spans sessions). Then archive or delete consumed plan docs (the human's choice; archived docs land in `docs/plans/completed/`, and every discovery glob runs excluding docs/plans/completed/ so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), curate lessons, update CHANGELOG/README, create PR or merge.
 
-### Diagnose (on demand)
-
-```
-/skill:pwk-diagnose
-```
-
 ### Walkthrough (on demand)
 
 ```
@@ -96,8 +90,6 @@ In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents
 
 Generate a detailed, file:line-anchored walkthrough of a shipped feature or branch into `docs/walkthroughs/<topic>.md` — Summary / How it works / Key flows / Gotchas & invariants / Change map — stamped with the commit range, regenerated wholesale on re-run, never disposed. Exits the gated design phase.
 
-A debugging loop you invoke when something is broken. Not a pipeline phase. **Invoking it exits the gated design phase** — diagnosis needs to write failing tests and debug instrumentation. If you only want read-only investigation mid-design, use `pwk-status` or re-lock with `/pwk-guard on`.
-
 ### Status (on demand)
 
 ```
@@ -111,8 +103,8 @@ A read-only overview of all active design topics — which phase each is in and
 The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit` and `bash` tool calls:
 
 - **During the design phase**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
-- **During executing-tasks, code-review, finalizing, diagnose**: no restrictions.
-- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, `pwk-walkthrough` (walkthrough writes explainer output under `docs/walkthroughs/`); `pwk-status` stays read-only and runs inside the gate. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
+- **During executing-tasks, code-review, finalizing**: no restrictions.
+- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-walkthrough` (walkthrough writes explainer output under `docs/walkthroughs/`); `pwk-status` stays read-only and runs inside the gate. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
 
 The destructive blacklist covers common file-mutating vectors (redirects, `tee`, `cp`/`mv`/`touch`/`rm`, `git commit`/`apply`, `npm install`, in-place editors like `sed -i`/`perl -i`, `patch`, `find -delete`). Exotic vectors (interpreter escapes like `node -e`, `python -c`, `| bash`) rely on the phase reminder — the guard is advisory, not a security boundary.
 
diff --git a/docs/oversight-model.md b/docs/oversight-model.md
index 391eeb2..e0a4a6c 100644
--- a/docs/oversight-model.md
+++ b/docs/oversight-model.md
@@ -6,17 +6,16 @@ The kit enforces a design → execute → finalize workflow: one buildable desig
 
 ## Skills
 
-Skills teach the agent the workflow. There are 4 pipeline skills plus 3 utility skills:
+Skills teach the agent the workflow. There are 4 pipeline skills plus 2 utility skills:
 
 - **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
 - **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, report it (no stop), implement the design doc's `### R<n>` requirement blocks, then one risk-scaled feature-level review before the **ship checkpoint** (execution summary + code digest + coverage table presented for approval; full diff on request); two hard stops when the design carries `## Setup` (setup + ship), otherwise one (ship), per-requirement ceremony opt-in
 - **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review resolves the design's `### Feature review` tag (`auto` by default): four logical fresh-context, read-only roles when the design carries production-risk content, otherwise one inline pass. successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
 - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
 
-Plus 3 on-demand utility skills:
+Plus 2 on-demand utility skills:
 
 - **pwk-status** — read-only overview of all active design topics (phase + progress), for resuming or juggling parallel designs
-- **pwk-diagnose** — 6-phase debugging loop, invoked anytime something is broken
 - **pwk-walkthrough** — on-demand explainer; renders a file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md`, regenerated wholesale, never disposed
 
 They explain *what* to do and *when* to do it. Phase control is manual — you invoke each skill with `/skill:`; the agent never advances on its own.
@@ -29,11 +28,11 @@ The `workflow-guard` extension registers the Pi-only `/pwk-setup` command and en
 
 The agent can still use `read` and `bash` for investigation. During those gated phases, `bash` is governed by a simple destructive-command blacklist (`rm`, `>`, `git commit`, `npm install`, in-place editors, etc.) — a command is allowed unless it matches a destructive pattern. A short phase reminder is shown once when the gated phase begins so the model self-restricts.
 
-During executing-tasks, code-review, finalizing, **and diagnose**, nothing is restricted (diagnosis needs to write failing tests and debug instrumentation, so it exits the gate). `pwk-status` stays inside the gate.
+During executing-tasks, code-review, and finalizing, nothing is restricted. `pwk-status` stays inside the gate.
 
 Canonical role contracts live in `agents/pwk-*.md` (single source of truth) and can be installed into `.agents/agents/` with `/pwk-setup`. `pwk-executing-tasks` requests logical review roles through the host’s delegation capabilities and passes each role a one-liner pointer to a script-assembled review packet — the packet defines the scope per review level (feature review: the whole feature diff; per-requirement: just that slice).
 
-Phases follow the skill you invoke — there is no message-keyword unlock. Invoking `/skill:pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, or `pwk-walkthrough` exits the gated phase (those skills write — walkthrough writes its explainer output under `docs/walkthroughs/`); `pwk-status` deliberately does **not** (read-only orientation). `/pwk-guard on|off|auto` manually overrides the guard.
+Phases follow the skill you invoke — there is no message-keyword unlock. Invoking `/skill:pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, or `pwk-walkthrough` exits the gated phase (those skills write — walkthrough writes its explainer output under `docs/walkthroughs/`); `pwk-status` deliberately does **not** (read-only orientation). `/pwk-guard on|off|auto` manually overrides the guard.
 
 ## Enforcement style
 
diff --git a/docs/plans/2026-09-11-remove-pwk-diagnose-progress.md b/docs/plans/2026-09-11-remove-pwk-diagnose-progress.md
new file mode 100644
index 0000000..7246312
--- /dev/null
+++ b/docs/plans/2026-09-11-remove-pwk-diagnose-progress.md
@@ -0,0 +1,25 @@
+# Progress: remove-pwk-diagnose
+
+Design: docs/plans/2026-09-11-remove-pwk-diagnose-design.md
+Branch: remove-pwk-diagnose
+Started: 2026-09-11T09:49:37Z
+Last updated: 2026-09-11T10:31:00Z
+Feature phase: reviewing
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | Delete the skill and close the guard unlock | — | f291ec0 |
+| 2 | ✅ | Update tests and lint that enumerate `pwk-diagnose` | — | f1eacd8 |
+| 3 | ✅ | Sweep docs and the executing-tasks reference | — | 7bbd11f |
+| 4 | ✅ | Align `pwk-code-review` checklists with the four role contracts | — | 43bae93 |
+| 5 | ✅ | Simplify remaining skills (clarity + redundancy pass) | — | (this commit) |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? |
+|----|-------------|------------------|-----------|
+| 1 | Delete the skill and close the guard unlock | Deleted `skills/pwk-diagnose/` outright and removed the name from the exported `UNLOCK_SKILLS`; the input handler already dereferences that export, so no handler change was needed. Added a guard test proving an invocation of a removed skill leaves the gated phase in place. | No |
+| 2 | Update tests and lint that enumerate `pwk-diagnose` | Dropped the name from the lint's expected unlock list and utility roster and deleted its unlock-claim assertion; retargeted the workflow-consistency hook test to its surviving half and fixed two hard-coded skill counts (7 → 6, and the stale-count guard inverted); made the human-review-digests corpus list derive from the skills tree instead of a literal list, so a future removal cannot leave it reading a missing file; removed the now-unused marker. | Yes — the design doc's checklist named three more test sites than actually referenced the token, and one listed site (`workflow-consistency.e2e.test.ts`) broke on a skill *count* rather than the token. Folded both in. |
+| 3 | Sweep docs and the executing-tasks reference | Removed the skill from README (table row, tree line, unlock prose, workflow diagram, heading count), workflow-phases, the usage guide (block + its debugging-loop paragraph + phase line + unlock set), and the oversight model (bullet + unlock prose + phase line); dropped only the parenthetical example from the executing skill's mid-execution recording rule; added an Unreleased CHANGELOG entry. | Yes — the design doc placed the phase line in `docs/workflow-phases.md`; it actually lived in the usage guide and oversight model. Verified `package.json` names no skill (the doc said sweep, not change). |
+| 4 | Align `pwk-code-review` checklists with the four role contracts | Ported the four role checklists into steps 2–5 of the review skill: tracing and the hazard audit verbatim, the spec checklist plus its coverage table, and the smell item list with the role's flag-for-the-main-agent direction inverted to match the unlocked inline path. Process, reporting, and framing sections untouched. | Yes — tracing could not be verbatim: the role says "integration tests", a phrase the stale-terminology guard bans in this file, so it reads "the acceptance criteria and the feature E2E". The spec coverage table keys to the design doc's headings instead of a packet, which the inline path never has. |
+| 5 | Simplify remaining skills (clarity + redundancy pass) | Canonicalized the four skills' shared pre-flight prose to one wording each for the root check, the discovery frame, the umbrella parenthetical, and the recursion example, and added a lint assertion pinning all four; collapsed the code digest's inline fence comments into the canonical rules block below it (keeping the 15-line Flow cap, `[R<n>]` tagging and `was:` semantics untouched) and dropped the third restatement of the write-once rule in the ship step; turned the tags reference into a four-column table pointing at each tag's point of use; deleted the superseded seed notes. | Yes — the tags-reference compression moved the checkpoint enum from a header line into table cells, so two tests that pinned the old prose shape were updated to pin the table cell (same enum, same absence of `spec`), and a marker was added for the new shape. |
diff --git a/docs/plans/2026-09-11-skill-slimming-notes.md b/docs/plans/2026-09-11-skill-slimming-notes.md
deleted file mode 100644
index a795d2a..0000000
--- a/docs/plans/2026-09-11-skill-slimming-notes.md
+++ /dev/null
@@ -1,35 +0,0 @@
-# Skill-file slimming — deferred topic seed
-
-Recorded 2026-09-11 at the end of the `workflow-consistency` brainstorm (which ships as the F1–F15 batch). This is the "skill-file slimming explicitly deferred" item from the 2.0 design, now scoped. **Timing gate: do not start until the consistency batch (2.3.0) ships** — its R1–R3 reword the same paragraphs, and slimming first means double-editing them.
-
-Anchors are grep-able phrases, not line numbers — the consistency batch shifts lines. Corpus at time of writing: 639 lines / 7 skills; `pwk-executing-tasks` is ~half (231).
-
-## S1 — Standardize the cross-skill boilerplate to verbatim-identical
-
-The root-check paragraph ("run `pwd` … never `cd` (a worktree root counts)") and the discovery recipe ("list `docs/plans` recursively … `find docs/plans -name '<suffix>' -not -path '*/completed/*'`") appear 4× each (pwk-brainstorming, pwk-executing-tasks, pwk-finalizing, pwk-status) as *near*-identical variants — different parentheticals, different suffix lists. That drift-shape is what F7–F11 were in the docs.
-
-**Fix:** pick one canonical wording per block, land it verbatim in all four skills (suffix lists legitimately differ; everything else byte-for-byte), and add a skill-lint assertion that the shared sentences match across files. Converts duplication into an enforced invariant.
-
-**Do NOT extract to a shared file.** Skills load independently in fresh sessions — each must be self-contained. DRY-extraction across independent entry points is the wrong abstraction for this medium. (This decision is settled; don't re-litigate it in the next brainstorm.)
-
-## S2 — Code-digest prose double-explains its template (pwk-executing-tasks)
-
-The `## Code digest` fenced template's inline comments and the fill-rules + "Flow shape" bullets below it restate each other; "no test names" appears three times in the file (execution-summary rules, digest fill rules, Flow-shape bullets). ~25–30 lines recoverable by keeping one canonical layer and pointing to it ("same rule as the execution summary"). The 15-line Flow cap, [R<n>] tagging rule, and `was:` clause semantics must survive verbatim — they are ship-checkpoint contracts.
-
-## S3 — Tags reference compresses to a table (pwk-executing-tasks)
-
-The `## Tags reference` section restates the `auto`-resolution rule already explained at its point of use (feature review section). Compress the reference to a table (tag | values | default | fires); keep the full resolution prose only where the decision executes. Note: after the consistency batch, R4 also changes the risk-column story — check the two rules still read as one source (notes-only) after both edits.
-
-## S4 — Legacy 1.x scaffolding removal (gated)
-
-`feature-spec-paused`, `feature-complete-paused`, `Plan:` ref chains, and the `*-implementation.md` parse rules exist so pre-2.0 in-flight topics stay resumable. ~25 lines across pwk-executing-tasks + pwk-finalizing. **Gate:** no legacy `*-implementation.md` or old-valued progress files exist anywhere the kit still serves. Best simplification is deletion; only time grants it. The consistency batch's R2 already restates "legacy path unaffected" — that sentence becomes deletable along with the scaffolding.
-
-## Non-goals (decided, do not reopen)
-
-- **No cross-skill extraction/shared includes** — self-containment beats DRY for independently-loaded skills.
-- **No brevity pass on checkpoint/ship-gate prose** — every clause there is a decision record from an ADR (0003, 0006); verbosity is informed-stop design, not waste.
-- **No line-count target** — clarity over compactness; the corpus is already lean. The real win is S1's canonicalization, not the ~55 lines S2–S4 recover.
-
-## Hand-off
-
-Route through `/skill:pwk-brainstorming` when picked up (this file is a seed, not a design doc — discovery globs won't surface it, same as the consistency notes). Delete at that topic's finalize.
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index b66251e..261c268 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -2,7 +2,7 @@
 
 The kit enforces a design → execute → finalize workflow. Each phase below names the skill that drives it:
 
-`pi-workflow-kit` has 4 pipeline skills plus 3 utility skills. You invoke each one explicitly with `/skill:`.
+`pi-workflow-kit` has 4 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.
 
 ```
 brainstorm → executing-tasks → finalizing
@@ -80,16 +80,6 @@ No write restrictions.
 
 Read-only overview of all active pipeline topics (phase + progress) when several designs are in flight; an umbrella rolls up under its overview (shipped / in-flight / not-started). Not a pipeline phase — and it **does not exit the gated phase** (`pwk-status` is read-only; it runs fine under the design-phase write block, so the boundary stays up).
 
-## diagnose
-
-```
-/skill:pwk-diagnose
-```
-
-Not a pipeline phase. A utility skill invoked on demand when debugging is needed. Invoking it **exits the gated phase** — diagnosis needs to write failing tests and `[DEBUG-…]` instrumentation. To stay read-only mid-brainstorm, use `/skill:pwk-status` instead, or re-lock with `/pwk-guard on`.
-
-No write restrictions.
-
 ## walkthrough
 
 ```
diff --git a/extensions/workflow-guard.ts b/extensions/workflow-guard.ts
index b1d3f4b..3370e54 100644
--- a/extensions/workflow-guard.ts
+++ b/extensions/workflow-guard.ts
@@ -477,13 +477,7 @@ const SKILL_TO_PHASE: Record<string, Phase> = {
 
 /** Skills whose invocation exits a gated phase (used by the input handler; exported for tests/
  *  skill-lint). Deliberately excludes pwk-status (read-only by design; stays gated). */
-export const UNLOCK_SKILLS = [
-  "pwk-executing-tasks",
-  "pwk-finalizing",
-  "pwk-code-review",
-  "pwk-diagnose",
-  "pwk-walkthrough",
-] as const;
+export const UNLOCK_SKILLS = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-walkthrough"] as const;
 
 /** Phase-aware reminder appended after the user's message each turn while a gated phase is active.
  *  Returned as a message (not a system-prompt change) so it sits at the tail of the request and
@@ -660,9 +654,9 @@ export default function (pi: ExtensionAPI) {
     // Phase transitions happen only via skills — no message keyword unlocks the design phase.
     // Run /skill:pwk-executing-tasks (or another write-needing skill) to leave a gated phase.
     //
-    // Unlock list rationale: execute/finalize/code-review/diagnose/walkthrough all need to write
-    // source or docs outside docs/plans/ (implement, edit review fixes, add [DEBUG-] instrumentation,
-    // generate docs/walkthroughs/), so they exit the gate.
+    // Unlock list rationale: execute/finalize/code-review/walkthrough all need to write
+    // source or docs outside docs/plans/ (implement, edit review fixes, generate
+    // docs/walkthroughs/), so they exit the gate.
     // pwk-status is NOT here on purpose: it is read-only orientation, so it stays inside the
     // gated phase and never drops the write boundary the user is relying on.
     // (Orientation never needs write access; see skills/pwk-status.)
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index a4ff935..6c5d7bf 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -52,7 +52,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
 ## Process
 
 1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
-2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics still report `design` exactly as today. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
+2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics still report `design` exactly as today. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
 3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR unlock. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
diff --git a/skills/pwk-code-review/SKILL.md b/skills/pwk-code-review/SKILL.md
index 62104cf..075ec84 100644
--- a/skills/pwk-code-review/SKILL.md
+++ b/skills/pwk-code-review/SKILL.md
@@ -11,25 +11,33 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
 
 1. **Identify the scope** — in the feature-gate flow (the default), you review the **whole feature diff** at the feature-level review (`git diff $FEATURE_BASE...HEAD` — the parent of the first Commit-column entry; see the executing skill's packet recipe); all acceptance criteria in the design doc and the `## Feature acceptance` E2E are in scope. When invoked per-requirement (`Review: inline`/`parallel` on a tagged requirement), scope is just that requirement — read its acceptance criteria from the design doc, run `git log --oneline -5` and `git diff` to see what changed for it.
 
-2. **🔍 Code tracing** — trace the new/changed code paths end-to-end against the acceptance criteria and the feature E2E. For each path: does data flow correctly from entry to the asserted outcome? Note any branch the tests don't exercise, any dead branch, any path where the trace breaks.
+2. **🔍 Code tracing** — trace the new or changed code paths end-to-end against the acceptance criteria and the feature E2E. For each path, determine whether data flows correctly from entry to the asserted outcome. Note any branch the tests do not exercise, any dead branch, or any path where the trace breaks.
 
 3. **📐 Spec alignment** — for each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.
 
-4. **🧹 Code smells — fix these directly:**
-   - Shallow modules (interface nearly as complex as the implementation)
+   **Open the report with a coverage table** — one row per requirement in scope, keyed by the design doc's `### R<n>:` headings (R# = n; the whole design doc at the feature-level review, just the tagged requirement when invoked per-requirement):
+
+   | R# | Verdict | Evidence |
+   |----|---------|----------|
+   | 1 | <verdict> | file:line (code), file:line (test) |
+
+   Verdict per requirement: `covered | gap | scope-creep` — `covered` = every criterion has covering code and a test; `gap` = a criterion lacks code or a test; `scope-creep` = the code does more than the criteria specify. Findings elaborate on every non-`covered` row; an all-`covered` table needs no elaboration.
+
+4. **🧹 Code smells — fix these directly:** review the changed code and affected files against the requirement and feature scope, then fix what you find.
+   - Shallow modules (interface nearly as complex as implementation)
    - Duplication
-   - Missing seams / premature abstraction
+   - Missing seams or premature abstraction
    - Poor naming, magic values, dead code
-   Apply the fix, re-run the full suite (must stay green), and commit. If a smell needs a refactor large enough to risk the requirement, **flag** it instead of applying.
+   Apply the fix, re-run the full suite (must stay green), and commit. Only a smell that requires a refactor large enough to risk the requirement is **flagged** instead of applied.
 
 5. **⚠️ Production hazard check** — audit the changed code against the high-risk hazards. For each, write `[SAFE]` (1-line justification) or `[TRIGGERED]` (concrete mitigation):
-   1. **Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), or full-table loads filtered in memory.
-   2. **Missing indexes** — hot queries on unindexed columns (table scans under load).
-   3. **Unbounded concurrency** — unthrottled fan-out (`Promise.all` without batch limits).
-   4. **Long-running transactions** — holding DB connections/locks across slow external calls.
-   5. **Query/command interpolation** — raw variables merged into SQL or shell (injection).
-   6. **Unrestricted uploads / temp flooding** — uploads to local temp without limits or `finally` cleanup.
-   7. **Silent swallowing loops** — background workers catching and suppressing exceptions without logging/back-off.
+   1. **Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), full-table loads filtered in memory
+   2. **Missing indexes** — hot queries on unindexed columns (table scans under load)
+   3. **Unbounded concurrency** — unthrottled fan-out (`Promise.all` without batch limits)
+   4. **Long-running transactions** — holding DB connections/locks across slow external calls
+   5. **Query/command interpolation** — raw variables merged into SQL or shell (injection)
+   6. **Unrestricted uploads / temp flooding** — uploads to local temp without limits or `finally` cleanup
+   7. **Silent swallowing loops** — background workers catching/suppressing exceptions without logging/back-off
    Also check the design's `## Production-risk areas`, if any.
 
 6. **Report** — summarize: tracing findings, spec gaps, smells fixed (with commits), hazards `[TRIGGERED]`. Non-trivial findings become follow-up items — the user decides whether to address now or defer.
diff --git a/skills/pwk-diagnose/SKILL.md b/skills/pwk-diagnose/SKILL.md
deleted file mode 100644
index b5e7ea4..0000000
--- a/skills/pwk-diagnose/SKILL.md
+++ /dev/null
@@ -1,60 +0,0 @@
----
-name: pwk-diagnose
-description: "Disciplined debugging loop for hard bugs and performance regressions. Use when a test fails unexpectedly, a bug is found during execution, or something is broken. Use this skill whenever the user reports a bug, says 'this doesn't work', 'something's wrong', 'help me debug', or when tests fail for unclear reasons. Works at any point in the workflow — brainstorm, execute, or standalone."
----
-
-# Diagnose
-
-A 6-phase debugging discipline. Phase 1 is the skill — spend disproportionate effort here.
-
-Invoking `/skill:pwk-diagnose` **exits the gated design phase** (the workflow guard unlocks) — diagnosis needs to write failing tests and `[DEBUG-…]` instrumentation. If you only wanted read-only investigation, use `/skill:pwk-status` (stays gated) or reinstate the lock with `/pwk-guard on`.
-
-## Phase 1 — Build a feedback loop
-
-Create a fast, deterministic, agent-runnable pass/fail signal for the bug before doing anything else. Try in this order: failing test, curl script, CLI invocation, headless browser script.
-
-Other strategies when the basics don't work:
-- **Bisection** — bug appeared between two known states? Automate "boot at state X, check, repeat" to bisect
-- **Replay** — save a real network request or event log to disk, replay it through the code path in isolation
-
-The loop must produce the failure mode the **user** described — not a nearby but different failure. Iterate on the loop itself: can you make it faster? Sharper? More deterministic?
-
-If you genuinely cannot build a loop, stop and say so. List what you tried. Ask for access to a reproducing environment or a captured artifact.
-
-Hold at Phase 1 until you have a loop you believe in. Everything downstream — hypotheses, instrumentation, the fix — depends on that loop actually reproducing the user's symptom.
-
-## Phase 2 — Reproduce
-
-Run the loop. Confirm:
-- The failure matches the user's reported symptom
-- The failure is reproducible across multiple runs
-- You've captured the exact symptom (error message, wrong output, slow timing)
-
-Then **minimize the repro** — strip it down to the smallest input, shortest path, or fewest steps that still triggers the bug. A minimized repro dramatically narrows the hypothesis space.
-
-## Phase 3 — Hypothesise
-
-Generate 3-5 ranked hypotheses. Each must be falsifiable:
-
-> "If `<X>` is the cause, then `<changing Y>` will make the bug disappear / `<changing Z>` will make it worse."
-
-Show the ranked list to the user before testing. They often have domain knowledge that re-ranks instantly.
-
-## Phase 4 — Instrument
-
-Each probe must map to a specific hypothesis. Change one variable at a time. Tag every debug log with a unique prefix (e.g. `[DEBUG-a4f2]`) for easy cleanup later. Prefer a debugger breakpoint over logs when available.
-
-## Phase 5 — Fix + regression test
-
-Write the regression test **before** the fix — but only if there's a correct seam (one that exercises the real bug pattern at the call site). If no correct seam exists, note it — the codebase architecture is preventing the bug from being locked down.
-
-## Phase 6 — Cleanup
-
-Required before declaring done:
-- Original repro no longer triggers
-- Regression test passes (or absence of seam is documented)
-- All `[DEBUG-...]` instrumentation removed
-- If invoked mid-execution (an `implementing (k/N)` progress file exists), record the fix in the progress file's execution summary before returning to the executing skill.
-- Ask: what would have prevented this bug?
-- If the answer is a repeatable pattern, append a **generic** rule to `docs/lessons.md` (strip domain specifics) so future sessions catch it early.
-- If the bug was caused by an architectural problem (no good test seam, tangled callers, hidden coupling), suggest writing an ADR to `docs/adr/` capturing that insight
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 153d2c2..084f980 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -14,7 +14,7 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)). An umbrella part whose prior parts are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<part>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
+2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)). An umbrella part whose prior parts are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<part>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
 3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, first check `git worktree list`: if a worktree already checks out this branch (the same `../<repo>-<topic>` convention), adopt it — resume the session there instead of offering a new `git worktree add`. One worktree per branch, created once: git refuses two checkouts of one branch, so a later umbrella part reuses part 1's worktree and a standalone resume reuses its own. Otherwise offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
 
 ## First run
@@ -46,20 +46,20 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 
    <!-- Written once, after the feature review passes; never back-filled per requirement. -->
 
-   ### Summary — 2–3 sentences: what the code now does differently, and why.
+   ### Summary
    ### Flow
    Spine
-     <entry point> -> [R1] <step, named by symbol or module> -> [R2] <step> -> <outcome>
+     <entry point> -> [R1] <step> -> [R2] <step> -> <outcome>
    Branches
-     <condition> -> <outcome>   [R2]        <!-- every alternative and error path -->
+     <condition> -> <outcome>   [R2]
      <changed behavior>   was: <previous behavior>
    Side effects
-     reads: <what>   writes: <what>          <!-- only when the feature does I/O -->
-   ### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
-   ### Key files — 3–5 pivotal files, one line each: what shifted inside them.
+     reads: <what>   writes: <what>
+   ### Gotchas
+   ### Key files
    ```
 
-   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
+   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Summary` is 2–3 sentences: what the code now does differently, and why. `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
 
    **Flow shape** — this is the ship stop's navigable map, so it is the one digest section that carries structure, not just prose:
 
@@ -102,7 +102,7 @@ Update the matching requirement row directly (not via pattern matching that coul
 
 ## Implement phase (after the E2E notice)
 
-Bugs found mid-execution (e.g. fixed via `pwk-diagnose`) are mandatory execution-summary content: record the fix in the requirement's `How it was built` cell and fill its Deviated? column at fix time — the summary must show what the feature actually cost to land.
+Bugs found mid-execution are mandatory execution-summary content: record the fix in the requirement's `How it was built` cell and fill its Deviated? column at fix time — the summary must show what the feature actually cost to land.
 
 Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
 
@@ -133,7 +133,7 @@ When every requirement's Done cell is terminal — `✅` (done), `❌` (failed,
 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
 2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. (A `❌`/`⏭` requirement's assertions were reconciled when its row went terminal, so a still-red E2E still means a requirement is missing or wrong.) If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
 3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
-4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
+4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Never a gate: it explains the change, it does not block shipping.
 
    **Reconcile the Flow against reviewed reality before writing it.** The Flow is written from what was reviewed, not from recollection: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names — no hop invented, no reported path dropped. In `inline` mode there is no tracing report, so check the Flow against that pass's spec-coverage result instead. A discrepancy you cannot resolve is **surfaced** to the human in the ship checkpoint's findings status, never smoothed over by writing a Flow that omits the path.
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
@@ -197,9 +197,13 @@ On success, continue assembling the ship checkpoint; once the human approves it
 
 The design doc tags each requirement and the feature level:
 
-- **`### Checkpoints: none | full`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete.
-- **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. Nothing is tagged silently: **only the human tags** a slice, and the feature review below covers everything else.
-- **`### Feature review: auto | parallel | inline`** — the one whole-feature review (always present). Default `auto`: `parallel` when the design carries production-risk content, `inline` when it does not. An explicit `parallel` or `inline` is used as written and always wins over `auto`. Never once per requirement — the review covers the whole feature diff.
+| Tag | Values | Default | Fires |
+|-----|--------|---------|-------|
+| `### Checkpoints` | `none | full` | `none` | per-requirement human stops — `full` = tests + complete stops |
+| `### Review` | `skip | parallel | inline` | `skip` | per-requirement review — `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass |
+| `### Feature review` | `auto | parallel | inline` | `auto` | the one whole-feature review — always present, never per requirement |
+
+Nothing is tagged silently: **only the human tags** a slice, and the feature review covers everything else. How each tag resolves lives where its decision executes — the [per-requirement review](#per-requirement-review-opt-in) and the [feature review](#feature-review).
 
 ## User override commands
 
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index ccc3af4..e316ae4 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -11,7 +11,7 @@ Ship the completed work.
 
 1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
 2. **Verify the repo root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then:
-3. Read **every** relevant progress file — for an umbrella that's each part's progress file — discovered by listing `docs/plans` recursively for `*-progress.md`, excluding docs/plans/completed/ (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived parts are already shipped). Use whatever recurses in your harness; one example: `find docs/plans -name '*-progress.md' -not -path '*/completed/*'`. Match the `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only the matching ❌/⏭ verdict rows in the Requirements table (e.g. `grep '❌' <file>` / `grep '⏭' <file>` — rows with reasons); the sections after the tables carry nothing the gate needs. For a standalone design doc, the one:
+3. Read **every** relevant progress file — for an umbrella that's each part's progress file — discovered by listing `docs/plans` recursively, excluding docs/plans/completed/, for `*-progress.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. Match the `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only the matching ❌/⏭ verdict rows in the Requirements table (e.g. `grep '❌' <file>` / `grep '⏭' <file>` — rows with reasons); the sections after the tables carry nothing the gate needs. For a standalone design doc, the one:
    - **Any `❌ failed`** (in any part) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
    - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
    - **`Feature phase` must be `done`** in every progress file — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or a legacy `feature-complete-paused` from before the ship gate) means the feature is still in flight: the ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index 23e64e1..32d59ef 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -9,8 +9,8 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 
 ## Process
 
-0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; if they differ, report both paths and stop — tell the user to restart the session at the repo root; never `cd` (a worktree root counts).
-1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, one list per suffix: `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived topics are not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
+0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).
+1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, and `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
 2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` (with `## Setup` in the design doc) renders the topic as **`awaiting setup`** — the setup checkpoint was never approved — ahead of any phase-derived state below. Map the line to the displayed state:
    - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when a scoped table-row count finds any — `grep -c '^| [0-9].*❌'` / `grep -c '^| [0-9].*⏭'` (one bounded read each; table rows only, so digest or summary mentions of the glyphs do not inflate the count) — render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
diff --git a/tests/human-review-digests.test.ts b/tests/human-review-digests.test.ts
index dace687..24875b6 100644
--- a/tests/human-review-digests.test.ts
+++ b/tests/human-review-digests.test.ts
@@ -1,4 +1,4 @@
-import { existsSync, readFileSync } from "node:fs";
+import { existsSync, readdirSync, readFileSync } from "node:fs";
 import { dirname, join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, it } from "vitest";
@@ -32,6 +32,11 @@ function readRepo(rel: string): string {
   return readFileSync(join(repoRoot, rel), "utf8");
 }
 
+/** Every shipped skill, derived from the tree so a removal or addition cannot go stale here. */
+const SKILL_SITES = readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
+  .filter((entry) => entry.isDirectory() && entry.name.startsWith("pwk-"))
+  .map((entry) => `skills/${entry.name}/SKILL.md`);
+
 describe("human review digests feature (E2E)", () => {
   it("should thread R# digests from design to coverage table", () => {
     // R1 — design docs open with an at-a-glance digest: plain summary + one row per
@@ -46,14 +51,7 @@ describe("human review digests feature (E2E)", () => {
     // R2 — the crosswalk and its plan phase are gone entirely (pwk 2.0): the
     // design doc's ### R<n> blocks are the map; no skill restates one.
     expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);
-    for (const site of [
-      "skills/pwk-brainstorming/SKILL.md",
-      "skills/pwk-executing-tasks/SKILL.md",
-      "skills/pwk-status/SKILL.md",
-      "skills/pwk-finalizing/SKILL.md",
-      "skills/pwk-code-review/SKILL.md",
-      "skills/pwk-diagnose/SKILL.md",
-    ]) {
+    for (const site of SKILL_SITES) {
       expect(readRepo(site), site).not.toMatch(/crosswalk/i);
     }
 
diff --git a/tests/lean-gates.criteria.test.ts b/tests/lean-gates.criteria.test.ts
index 19646c4..9020f78 100644
--- a/tests/lean-gates.criteria.test.ts
+++ b/tests/lean-gates.criteria.test.ts
@@ -51,7 +51,7 @@ describe("lean gates R2: feature-review resolution edges", () => {
 
   it("should run exactly once per part — not once per requirement", () => {
     expect(executing).toContain("exactly one per part, never once per requirement");
-    expect(executing).toContain("Never once per requirement");
+    expect(executing).toContain("always present, never per requirement");
   });
 });
 
diff --git a/tests/lean-gates.e2e.test.ts b/tests/lean-gates.e2e.test.ts
index 1496efa..2c1a2a1 100644
--- a/tests/lean-gates.e2e.test.ts
+++ b/tests/lean-gates.e2e.test.ts
@@ -75,7 +75,7 @@ describe("leaner execution gates (feature E2E)", () => {
     // R4 — the checkpoint enum is none | full across every consumer site, and the
     // retired `spec` value is gone from the enumerations and the paired rule.
     expect(brainstorming).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
-    expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
+    expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnumRow);
     for (const rel of [
       "skills/pwk-brainstorming/SKILL.md",
       "skills/pwk-executing-tasks/SKILL.md",
diff --git a/tests/markers.mjs b/tests/markers.mjs
index 49a8ef2..134138e 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -98,6 +98,9 @@ export const LEAN_GATES_MARKERS = {
   statusExecuteZero: "execute 0/N",
   // R4 — the `spec` checkpoint value is gone.
   checkpointsEnum: "### Checkpoints: none | full",
+  // The executing skill's tags reference is a table (skill-slimming S3), so its enum shows as
+  // tag + values cells instead of a single header line. Same behavior, different shape.
+  checkpointsEnumRow: "`### Checkpoints` | `none | full`",
   // R5 — the enriched Flow shape.
   flowSpine: "Spine",
   flowBranches: "Branches",
@@ -116,7 +119,7 @@ export const LEAN_GATES_MARKERS = {
  * row-state + ceremony vocabulary, the terminal-state ship gate (done = resolved,
  * finalizing stays the failure authority), the implementable setup checkpoint, the
  * derived display-only Risk column, the FA template's own tag, inventory doc parity
- * + parity lint, the Commit-column packet base, and the diagnose recording hook.
+ * + parity lint, the Commit-column packet base, and the mid-execution fix-recording hook.
  * Same contract as DIGEST_MARKERS — one canonical string per behavior, shared by
  * skill-lint and the vitest suites. Each marker distinguishes the new shape from the
  * old (e.g. `terminal` vs the all-✅ gate, `Commit column` vs bare `<merge-base>`).
@@ -161,9 +164,8 @@ export const WORKFLOW_CONSISTENCY_MARKERS = {
   commitColumnFill: "commit hash in the Commit column",
   featureBaseRule: "parent of the first recorded commit",
   perReqSpanRule: "previous requirement's last commit",
-  // R9 — the diagnose ↔ execution recording hook.
+  // R9 — the mid-execution fix-recording hook (the diagnose half was removed with the skill).
   midFixMandated: "mandatory execution-summary content",
-  diagnoseReminder: "record the fix in the progress file",
 };
 
 /**
diff --git a/tests/remove-pwk-diagnose.e2e.test.ts b/tests/remove-pwk-diagnose.e2e.test.ts
new file mode 100644
index 0000000..1606c3c
--- /dev/null
+++ b/tests/remove-pwk-diagnose.e2e.test.ts
@@ -0,0 +1,121 @@
+import { execFileSync } from "node:child_process";
+import { readdirSync, readFileSync, statSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
+
+/**
+ * Feature acceptance for `remove-pwk-diagnose`: the skill and every reference to it
+ * are gone, the guard keeps no unlock path for it, and the shipped corpus stays
+ * consistent (no orphaned skill counts, no doc pointing at a missing file).
+ *
+ * The design doc's stated acceptance is "`npm run check` is green, `skills/pwk-diagnose/`
+ * does not exist, and a repo-wide grep for `pwk-diagnose` returns zero hits outside
+ * `CHANGELOG.md` history entries and the design doc". `npm run check` is the outer gate
+ * (this file runs inside it); the scenarios below assert the other two, plus the count
+ * claims the gate's lint would otherwise fail on.
+ *
+ * Files allowed to name the removed token in their content:
+ * - this test and `tests/workflow-guard.test.ts` — they assert the removal, so they must
+ *   name what they assert is gone (the guard test proves invoking it leaves the gate closed);
+ * - `CHANGELOG.md` — immutable history record;
+ * - anything under `docs/plans/` — ephemeral planning artifacts, disposed at finalize.
+ * Everything else is the shipped corpus and must be clean. Content is scanned; file names
+ * are not exempted (`skills/pwk-diagnose/` must not reappear as a path either).
+ *
+ * The scan covers **git-tracked** files, which matches the design's "clean tree"
+ * precondition; a stray untracked copy under `skills/` is still caught, because scenario 1
+ * reads that directory from the filesystem rather than from git.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const REMOVED = "pwk-diagnose";
+const SELF = "tests/remove-pwk-diagnose.e2e.test.ts";
+const GUARD_TEST = "tests/workflow-guard.test.ts";
+const PLANNING_PREFIX = "docs/plans/";
+const MENTION_ALLOWLIST = new Set([SELF, GUARD_TEST, "CHANGELOG.md"]);
+
+/** The shipped corpus as git sees it — ignored installs (`node_modules`, `.agents/`) are out. */
+function trackedFiles(): string[] {
+  return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" }).split("\0").filter(Boolean);
+}
+
+/** Skill dirs under `skills/`, ignoring any that are not `pwk-*`. */
+function skillDirs(): string[] {
+  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
+    .filter((entry) => entry.isDirectory() && entry.name.startsWith("pwk-"))
+    .map((entry) => entry.name)
+    .sort();
+}
+
+/** The roster skill-lint declares, parsed from its own source so drift is visible here. */
+function declaredRoster(): string[] {
+  const lint = readFileSync(join(repoRoot, "tests/skill-lint.mjs"), "utf8");
+  const lists = [...lint.matchAll(/const (?:PIPELINE_SKILLS|UTILITY_SKILLS) = \[([^\]]+)\]/g)]
+    .flatMap((match) => [...match[1].matchAll(/"(pwk-[\w-]+)"/g)].map((m) => m[1]))
+    .sort();
+  expect(lists.length, "skill-lint declares a pipeline + utility roster").toBeGreaterThan(0);
+  return lists;
+}
+
+const INVENTORY_DOCS = [
+  "README.md",
+  "docs/oversight-model.md",
+  "docs/developer-usage-guide.md",
+  "docs/workflow-phases.md",
+];
+const PIPELINE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-code-review", "pwk-finalizing"];
+const UTILITY_SKILLS = ["pwk-status", "pwk-walkthrough"];
+
+describe("remove-pwk-diagnose (feature E2E)", () => {
+  it("scenario 1 — the skill dir is gone and no unlock path remains in the guard", () => {
+    expect(skillDirs()).not.toContain(REMOVED);
+    expect(() => statSync(join(repoRoot, "skills", REMOVED))).toThrow();
+    expect(UNLOCK_SKILLS).not.toContain(REMOVED);
+    expect([...UNLOCK_SKILLS].sort()).toEqual([
+      "pwk-code-review",
+      "pwk-executing-tasks",
+      "pwk-finalizing",
+      "pwk-walkthrough",
+    ]);
+
+    // No shipped path (outside planning artifacts + this test) is named after it either.
+    for (const rel of trackedFiles()) {
+      if (MENTION_ALLOWLIST.has(rel) || rel.startsWith(PLANNING_PREFIX)) continue;
+      expect(rel, `path still names the removed skill`).not.toContain(REMOVED);
+    }
+    // The plan for deleting the seed note lives in the design doc; nothing dangles.
+    expect(trackedFiles()).not.toContain("docs/plans/2026-09-11-skill-slimming-notes.md");
+  });
+
+  it("scenario 2 — a repo-wide grep for the token returns zero hits outside history and planning artifacts", () => {
+    const hits: string[] = [];
+    for (const rel of trackedFiles()) {
+      if (MENTION_ALLOWLIST.has(rel) || rel.startsWith(PLANNING_PREFIX)) continue;
+      const body = readFileSync(join(repoRoot, rel), "utf8");
+      if (body.includes("\0")) continue;
+      body.split("\n").forEach((line, i) => {
+        if (line.includes(REMOVED)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
+      });
+    }
+    expect(hits, `references to the removed skill survived:\n${hits.join("\n")}`).toEqual([]);
+  });
+
+  it("scenario 3 — the shipped corpus still reads coherently: one roster, matching counts", () => {
+    // The guard export, the tree, and skill-lint's declared roster agree on one set.
+    expect(declaredRoster()).toEqual(skillDirs());
+    expect(skillDirs()).toEqual([...PIPELINE_SKILLS, ...UTILITY_SKILLS].sort());
+
+    // No inventory doc claims a skill count that disagrees with the tree — an orphaned
+    // "3 utility skills" would send a reader looking for a skill that is not there.
+    for (const doc of INVENTORY_DOCS) {
+      const body = readFileSync(join(repoRoot, doc), "utf8");
+      for (const [, n] of body.matchAll(/(\d+) pipeline skills?/gi)) {
+        expect(Number(n), `${doc} pipeline-skill count`).toBe(PIPELINE_SKILLS.length);
+      }
+      for (const [, n] of body.matchAll(/(\d+) utility skills?/gi)) {
+        expect(Number(n), `${doc} utility-skill count`).toBe(UTILITY_SKILLS.length);
+      }
+    }
+  });
+});
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index c932b1f..2518883 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -223,7 +223,7 @@ if (!exportMatch) {
 if (!/UNLOCK_SKILLS\.some\(/.test(guardSrc)) {
   fail("workflow-guard.ts: input handler does not dereference UNLOCK_SKILLS");
 }
-const EXPECTED_UNLOCK = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-diagnose", "pwk-walkthrough"];
+const EXPECTED_UNLOCK = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-walkthrough"];
 let unlockOk = true;
 for (const s of EXPECTED_UNLOCK) {
   if (!unlockSet.has(s)) {
@@ -245,13 +245,6 @@ if (status && /does not unlock/i.test(status.content)) {
 } else if (status) {
   fail("pwk-status: must state it does not unlock the guard");
 }
-// pwk-diagnose must claim it exits the gated phase.
-const diag = loadSkills().find((s) => s.name === "pwk-diagnose");
-if (diag && /exits the gated/i.test(diag.content)) {
-  ok("pwk-diagnose: documents it exits the gated phase");
-} else if (diag) {
-  fail("pwk-diagnose: must state invoking it exits the gated phase");
-}
 // pwk-code-review must claim it is unlocked.
 const crSkill = loadSkills().find((s) => s.name === "pwk-code-review");
 if (crSkill && /unlocked/i.test(crSkill.content)) {
@@ -893,6 +886,41 @@ if (existsSync(wtPath)) {
   fail("pwk-walkthrough: skill missing");
 }
 
+// --- Check 13b: cross-skill boilerplate canonicalization (skill-slimming R5 S1) ---
+// Four skills open with the same pre-flight prose: the repo-root check and the docs/plans
+// discovery recipe. They were near-identical variants — the same drift shape that produced
+// the doc-inventory defects (F7–F11) — so the shared sentences are pinned verbatim here.
+// Each skill stays self-contained by design: this asserts wording, it does not share text.
+// The suffix lists legitimately differ per skill and are deliberately not pinned.
+console.log("cross-skill boilerplate:");
+const BOILERPLATE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
+const SHARED_SENTENCES = [
+  [
+    "root check",
+    "run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).",
+  ],
+  ["discovery frame", "`docs/plans` recursively, excluding docs/plans/completed/, for "],
+  [
+    "umbrella parenthetical",
+    "(umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not in flight)",
+  ],
+  [
+    "discovery recipe tail",
+    "Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`",
+  ],
+];
+for (const name of BOILERPLATE_SKILLS) {
+  const skill = loadSkills().find((s) => s.name === name);
+  if (!skill) {
+    fail(`cross-skill boilerplate: ${name} skill missing`);
+    continue;
+  }
+  for (const [label, sentence] of SHARED_SENTENCES) {
+    if (skill.content.includes(sentence)) ok(`${name}: ${label} matches the canonical wording`);
+    else fail(`${name}: ${label} drifted from the canonical wording — see pwk-executing-tasks`);
+  }
+}
+
 // --- Summary ---
 // --- Inventory parity (workflow-consistency R7; kills doc drift in both directions) ---
 // The four inventory docs must name every skill directory under skills/, the unlock-prose
@@ -908,7 +936,7 @@ const INVENTORY_DOCS = [
 ];
 const UNLOCK_PROSE_SITES = ["README.md", "docs/oversight-model.md", "docs/developer-usage-guide.md"];
 const PIPELINE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-code-review", "pwk-finalizing"];
-const UTILITY_SKILLS = ["pwk-status", "pwk-diagnose", "pwk-walkthrough"];
+const UTILITY_SKILLS = ["pwk-status", "pwk-walkthrough"];
 // The tree's complete roster — EXPECTED_SKILL_COUNT is these two lists merged; adding a
 // skill dir without extending the right list fails loudly (see roster check below).
 const EXPECTED_SKILL_COUNT = PIPELINE_SKILLS.length + UTILITY_SKILLS.length;
diff --git a/tests/workflow-consistency.e2e.test.ts b/tests/workflow-consistency.e2e.test.ts
index 2c8bb58..6b35a54 100644
--- a/tests/workflow-consistency.e2e.test.ts
+++ b/tests/workflow-consistency.e2e.test.ts
@@ -66,7 +66,9 @@ describe("workflow-consistency (feature E2E)", () => {
     // F7/F8 — every skill is present in every inventory doc, and each unlock-prose
     // site lists the full UNLOCK_SKILLS set (source of truth: the guard export).
     const names = skillNames();
-    expect(names.length).toBeGreaterThanOrEqual(7);
+    // Six shipped skills: 4 pipeline + 2 utility. The lower bound is a floor, not the
+    // count itself — skill-lint's inventory parity pins the exact roster.
+    expect(names.length).toBeGreaterThanOrEqual(6);
     for (const rel of [
       "README.md",
       "docs/developer-usage-guide.md",
diff --git a/tests/workflow-consistency.test.ts b/tests/workflow-consistency.test.ts
index d9e8cae..d71ea53 100644
--- a/tests/workflow-consistency.test.ts
+++ b/tests/workflow-consistency.test.ts
@@ -151,9 +151,11 @@ describe("workflow-consistency per-slice", () => {
   });
 
   describe("R6 — inventory doc parity sweep", () => {
-    it("all seven skills appear in every inventory doc", () => {
+    it("all six skills appear in every inventory doc", () => {
       const names = skillNamesForR6();
-      expect(names.length).toBe(7);
+      // 4 pipeline + 2 utility. skill-lint's inventory parity pins the exact roster;
+      // this pins that every doc names all of it.
+      expect(names.length).toBe(6);
       for (const rel of [
         "README.md",
         "docs/developer-usage-guide.md",
@@ -164,7 +166,7 @@ describe("workflow-consistency per-slice", () => {
         for (const name of names) {
           expect(doc, `${rel} names ${name}`).toContain(name);
         }
-        expect(doc, rel).not.toMatch(/5 pipeline skills|2 utility skills/);
+        expect(doc, rel).not.toMatch(/5 pipeline skills|3 utility skills/);
       }
     });
 
@@ -189,9 +191,8 @@ describe("workflow-consistency per-slice", () => {
         expect(read(rel), rel).toMatch(/design → execute → finalize/);
       }
       const guide = read("docs/developer-usage-guide.md");
-      const diagnoseIdx = guide.indexOf("### Diagnose");
       const walkthroughIdx = guide.indexOf("### Walkthrough");
-      expect(diagnoseIdx, "diagnose prose precedes the walkthrough block").toBeLessThan(walkthroughIdx);
+      expect(walkthroughIdx, "the walkthrough block is present").toBeGreaterThan(-1);
     });
 
     it("the -notes.md seed files dispose with their topic (spec-reviewer R6 gap)", () => {
@@ -220,12 +221,13 @@ describe("workflow-consistency per-slice", () => {
     });
   });
 
-  describe("R9 — diagnose ↔ execution recording hook", () => {
-    it("executing mandates fix recording; diagnose closes the loop from its side", () => {
+  describe("R9 — mid-execution fix recording hook", () => {
+    it("executing still mandates recording mid-execution fixes", () => {
+      // The diagnose half of this hook went with the skill: no diagnosis skill closes
+      // the loop from its side, so the obligation is asserted where it now lives —
+      // the requirement's execution-summary row.
       const executing = read("skills/pwk-executing-tasks/SKILL.md");
-      const diagnose = read("skills/pwk-diagnose/SKILL.md");
       expect(executing).toContain(M.midFixMandated);
-      expect(diagnose).toContain(M.diagnoseReminder);
     });
   });
 });
diff --git a/tests/workflow-guard.test.ts b/tests/workflow-guard.test.ts
index 6efef6e..ae0e001 100644
--- a/tests/workflow-guard.test.ts
+++ b/tests/workflow-guard.test.ts
@@ -21,13 +21,17 @@ import { createExtensionHarness } from "./helpers";
 
 describe("guard phase transitions", () => {
   it("unlocks on write-needing skills only", () => {
-    expect([...UNLOCK_SKILLS]).toEqual([
-      "pwk-executing-tasks",
-      "pwk-finalizing",
-      "pwk-code-review",
-      "pwk-diagnose",
-      "pwk-walkthrough",
-    ]);
+    expect([...UNLOCK_SKILLS]).toEqual(["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-walkthrough"]);
+  });
+
+  it("a removed skill cannot unlock a gated phase", () => {
+    const harness = createExtensionHarness();
+    harness.handlers.get("session_start")?.({}, {});
+    harness.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    expect(getCurrentPhase()).toBe("brainstorm");
+    // pwk-diagnose was removed from the kit: invoking it leaves the gate in place.
+    harness.handlers.get("input")?.({ text: "/skill:pwk-diagnose" }, {});
+    expect(getCurrentPhase()).toBe("brainstorm");
   });
 
   it("gates only brainstorming; a removed skill no longer enters a phase", () => {
