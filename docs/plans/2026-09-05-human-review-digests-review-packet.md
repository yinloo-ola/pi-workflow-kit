# Review packet: human-review-digests — feature review

## Commits
be45b08 fix(plans): complete R5 sweep — routing glob, reviewing phase, templa...
c62774c refactor(tests): shared markers + role harness, strict conduct equali...
10d86fe docs: execution summary + lessons from implementation
2b23216 feat(finalize): done-gate + docs consistency sweep (R6)
2f1d6d2 feat(plans): umbrella docs in own folder, recursive discovery, unit d...
1d3c424 feat(review): spec-reviewer per-requirement coverage table (R4)
7e5a2c6 feat(execute): execution summary + merged ship checkpoint, ADR 0003 (R3)
2156419 feat(plan): crosswalk + one-line confirmation, packet spans preserved...
ffdc4a0 feat(brainstorm): at-a-glance design digest with R# table (R1)
e26bb8d docs: add implementation plan

## Changed files
AGENTS.md                                          |   4 +-
 README.md                                          |  20 +--
 agents/pwk-spec-reviewer.md                        |  10 +-
 docs/adr/0003-ship-gate-review-before-approval.md  |  41 +++++++
 docs/developer-usage-guide.md                      |  10 +-
 docs/lessons.md                                    |   1 +
 docs/oversight-model.md                            |   6 +-
 .../2026-09-05-human-review-digests-design.md      | 114 ++++++++++++++++++
 ...26-09-05-human-review-digests-implementation.md | 134 +++++++++++++++++++++
 .../2026-09-05-human-review-digests-progress.md    |  27 +++++
 docs/workflow-phases.md                            |  16 +--
 skills/pwk-brainstorming/SKILL.md                  |  14 ++-
 skills/pwk-executing-tasks/SKILL.md                |  60 +++++----
 skills/pwk-finalizing/SKILL.md                     |  15 +--
 skills/pwk-status/SKILL.md                         |   4 +-
 skills/pwk-writing-plans/SKILL.md                  |  16 ++-
 tests/docs-consistency.test.ts                     |  52 ++++++++
 tests/helpers.ts                                   |   9 ++
 tests/human-review-digests.test.ts                 | 117 ++++++++++++++++++
 tests/markers.mjs                                  |  29 +++++
 tests/review-packet.test.ts                        |  27 +++++
 tests/role-contracts.test.ts                       |  26 ++--
 tests/skill-lint.mjs                               |  92 +++++++++++++-
 tests/workflow-guard.test.ts                       |   3 +
 24 files changed, 768 insertions(+), 79 deletions(-)

## Acceptance criteria (verbatim from the plan)
## Requirement 1: Design digest (`## At a glance`)

### Acceptance criteria
- Given `skills/pwk-brainstorming/SKILL.md`, when the design-doc template rules are read, then every design doc is mandated to open with `## At a glance` immediately before `## Requirements`, containing a 2–4 sentence plain-language summary (what is needed, what will be built, key approach) and a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, R# matching the `## Requirements` list numbering.
- Given the trivial fast-path rule, when a trivial design doc is written, then it carries a single `In short:` line instead of the full table.
- Given the digest rules, when at-a-glance content is written, then it is plain language: short sentences, no jargon, no Given/When/Then — those stay in body sections for the executor.
- Given `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, when the design phase is described, then the at-a-glance opening is mentioned consistently.
- Edge: umbrella overviews gain no at-a-glance section — the roster already serves that role.

### Integration tests
- skill-lint `should mandate at-a-glance in brainstorming` — `/## At a glance/` present with before-Requirements placement wording; `In short:` trivial marker present.
- docs-consistency `should mirror at-a-glance in user docs` — regex in the four docs.

### Checkpoints: none
### Review: skip

## Requirement 2: Plan crosswalk + one-line confirmation

### Acceptance criteria
- Given `skills/pwk-writing-plans/SKILL.md`, when the plan template is read, then a `## Crosswalk` section is specified as a table `| R# | Plan section | Tests |` with one row per design requirement, placed between `## Overview` and `## Setup`/`## Requirement 1` — strictly before `## Requirement 1`, with the packet sed-span rationale stated.
- Given the pre-presentation audit, when the crosswalk is checked, then every design R# appears exactly once; a missing or duplicate R# fails the audit before any presentation.
- Given plan presentation, when the plan is complete, then the human is shown a one-line confirmation covering every R# plus the feature-acceptance test name, with the full plan available on request; approval still gates execution.
- Given the review-packet recipe, when a plan containing `## Crosswalk` is processed, then the three sed ranges are unchanged and the crosswalk is excluded from the extracted spans.
- Given the four docs, when plan presentation is described, then the confirmation-not-full-plan behavior is mirrored.

### Integration tests
- review-packet `should keep packet spans intact with a crosswalk present` — `PLAN_FIXTURE` gains `## Crosswalk` before `## Requirement 1`; the three sed commands stay byte-identical; extraction excludes the crosswalk.
- skill-lint `should mandate the crosswalk in writing-plans` — crosswalk table markers + the placement rule regex.

### Checkpoints: none
### Review: skip

## Requirement 3: Execution summary + merged ship gate

### Acceptance criteria
- Given the progress-file template in `skills/pwk-executing-tasks/SKILL.md`, when read, then it includes an `## Execution summary` section — table `| R# | Requirement | How it was built | Deviated? |` — with the fill-as-you-land rule (row written in the same step as marking a requirement ✅) and the deviation rule (recorded when the departure happens, with a one-line why).
- Given execution-summary content rules, when rows are written, then "How it was built" is one or two plain sentences (what it does now + the approach actually taken), file names allowed sparingly, and no test names or code.
- Given all requirements ✅, when the executor proceeds, then the flow is: full suite + feature E2E green → feature review per the plan's tag → smell fixes applied and suites re-greened → single ⏸ **ship** checkpoint — no separate feature-complete approval before review.
- Given the ship checkpoint fires, when it pauses, then it presents: a green-gates line, the execution summary, the coverage table from the spec-reviewer report, findings status (fixed / open for the human), and "full diff on request" — the raw diff is not the default presentation.
- Given a reviewer report lacking the coverage table (Requirement 4's contract), when the ship pause is assembled, then the report is invalid (retry the role, else inline completion); the pause is not presented without coverage.
- Given progress `Feature phase`, when phases transition, then the enum is `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`; a legacy progress file showing `feature-complete-paused` resumes as `reviewing`.
- Given the feature-spec checkpoint, when presented, then it is led by 1–2 plain-language lines stating what the E2E proves, before the test and failing output.
- Given `docs/adr/`, when this requirement lands, then `docs/adr/0003-ship-gate-review-before-approval.md` records the reorder: context (approval was blind — findings arrived after), decision (review runs before the single final approval), why (one fully-informed stop; review cost is low post-packet).
- Mirrors: README's review-the-whole-diff wording becomes the digest presentation; `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md` updated; skill-lint checkpoint marker group updated (`feature-complete` assertions replaced by `ship` semantics).

### Integration tests
- skill-lint `should mandate execution summary and ship checkpoint` — `## Execution summary`, fill-as-you-land, `ship-paused` markers in the executing skill; checkpoint marker group updated and green.
- docs-consistency `should describe the ship gate in user docs` — README + docs regexes.

### Checkpoints: none
### Review: skip

## Requirement 4: Spec-reviewer coverage table

### Acceptance criteria
- Given `agents/pwk-spec-reviewer.md`, when the checklist is read, then the report is mandated to open with a coverage table — one row per requirement keyed by the packet's `## Requirement N` headings: `| R# | Verdict | Evidence |`, verdict ∈ `covered | gap | scope-creep`, evidence as file:line.
- Given an all-covered review, when the report is written, then it still ends with the explicit `No findings` line.
- Given the four reviewer files, when compared, then the shared conduct block remains byte-identical across all four — the change touches only spec-reviewer's `## Your checklist` section.
- Given `docs/developer-usage-guide.md`, `docs/workflow-phases.md`, `docs/oversight-model.md`, when the feature review is described, then the coverage table is mentioned.
- Edge: `docs/provider-delegation-contract.md` unchanged — report content is role-level; the `DelegationResult` shape is unaffected.

### Integration tests
- role-contracts `should mandate a coverage table in the spec-reviewer checklist` — table markers + verdict vocabulary regex.
- role-contracts `should keep the conduct block byte-identical across reviewers` — existing strict-equality assertion still passes untouched.

### Checkpoints: none
### Review: skip

## Requirement 5: Umbrella folders

### Acceptance criteria
- Given `skills/pwk-brainstorming/SKILL.md`, when an umbrella is started, then its docs are created under `docs/plans/<date>-<umbrella>/` — `overview.md` plus per-part `<part>-design.md` and siblings; part discovery uses recursive globs.
- Given `skills/pwk-writing-plans/SKILL.md` and `skills/pwk-executing-tasks/SKILL.md`, when design/plan/progress docs are located, then discovery uses recursive globs (`docs/plans/**/*-design.md` and siblings); an umbrella part's review packet is written inside the folder.
- Given `skills/pwk-status/SKILL.md`, when topics roll up, then folder-resident docs are discovered via the recursive globs.
- Given `skills/pwk-finalizing/SKILL.md`, when an umbrella completes, then the whole `docs/plans/<date>-<umbrella>/` folder is disposed as one unit (archive to `docs/plans/completed/` or delete, per the existing choice); standalone flat-topic disposal globs unchanged.
- Given `AGENTS.md`, when archive conventions are described, then folder disposal is reflected.
- Given the workflow guard, when a write targets a `docs/plans/` subfolder path during brainstorm or plan phase, then `shouldBlockFilePath` returns false — subfolders inherit the writable root; no guard code change expected, the test proves it.
- Edge: flat standalone topics resolve through the same recursive globs (flat files match `docs/plans/**/*-design.md`).

### Integration tests
- workflow-guard `should allow writes in docs/plans subfolders during gated phases` — `shouldBlockFilePath('docs/plans/2026-09-05-x/overview.md', …)` false for both gated phases; `session_start` in `beforeEach`.
- skill-lint `should use recursive globs at every discovery site` — `docs/plans/**/` markers in the five skills + whole-folder disposal wording in finalizing.

### Checkpoints: none
### Review: skip

## Requirement 6: Finalize done-gate + docs consistency sweep

### Acceptance criteria
- Given `skills/pwk-finalizing/SKILL.md`, when pre-finalization checks run, then every progress file's `Feature phase` must be `done` — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or legacy `feature-complete-paused`) blocks with a pointer back to `/skill:pwk-executing-tasks`, alongside the existing `❌ failed`/`⏭ skipped` checks.
- Given the new digest sections (at-a-glance, crosswalk, execution summary), when disposal runs, then each rides the existing `????-??-??-<topic>-*` globs with its host doc — no new disposal rules; umbrella folders dispose whole per Requirement 5.
- Given `skills/pwk-status/SKILL.md`, when the enum lands, then no phase-related change is made (it reads the requirement table, not `Feature phase`) — only Requirement 5's recursive globs apply.
- Given the five user docs (`docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md`), when the feature lands, then the new flow (at-a-glance, crosswalk confirmation, ship gate, coverage table, umbrella folders) is described consistently and no doc keeps "read the full plan" or "review the whole diff" as the default human action.
- Edge: `CHANGELOG.md` gains a new entry at finalize per existing convention; historical entries are not edited.

### Integration tests
- skill-lint `should gate finalizing on Feature phase done` — read-contract markers in the finalizing skill.
- docs-consistency `should describe the new flow consistently across user docs` — regexes in the five docs, including absence of stale full-plan/whole-diff defaults.

### Checkpoints: none
### Review: skip


## Feature acceptance (verbatim)
## Feature acceptance
The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. New file `tests/human-review-digests.test.ts` (precedent: `tests/review-cost-optimization.test.ts`), with the guard and packet-fixture companions above:
- `should thread R# digests from design to coverage table` — Given the kit's skill/agent/doc files, When the five digest layers are checked, Then brainstorming mandates `## At a glance` with the R# table, writing-plans mandates `## Crosswalk` placed outside the packet sed spans, executing-tasks mandates the `## Execution summary` and the `ship-paused` checkpoint presenting summary + coverage table + diff-on-request, the spec-reviewer contract mandates the R# coverage table with a byte-identical shared conduct block, and umbrella discovery uses recursive globs — one R# scheme visible at every layer, so a missing row is visible anywhere.
- `should gate shipping on done and keep the docs consistent` — Given the kit's files after all six requirements land, When finalizing and the user docs are checked, Then the finalizing skill blocks any `Feature phase` other than `done`, disposes digest sections via the existing globs (umbrella folders whole), and none of the five user docs still defaults the human to reading the full plan or the whole diff.

## Production-risk notes (verbatim, if any)

## Diff
diff --git a/AGENTS.md b/AGENTS.md
index 65630dc..fb39002 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -45,10 +45,10 @@ docs/adr/     # permanent ADRs (never archived)
 
 ## Workflow conventions (content changes)
 
-- **One umbrella = one PR.** A design doc is one PR by default; a requirement too big for one design doc is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once. Each requirement is one testable slice with two human checkpoints (tests, complete).
+- **One umbrella = one PR.** A design doc is one PR by default; a requirement too big for one design doc is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once. Each requirement is one testable slice; the human stops at the feature level (feature-spec + ship checkpoint).
 - **Phase transitions only via `/skill:pwk-*`** — no message-keyword auto-detection (deliberately removed).
 - **`docs/lessons.md`** persists agent-learned imperative rules across sessions; read at brainstorm/plan/execute, curated at finalize. Survives `/new`.
-- **`docs/plans/` is ephemeral** — archive to `docs/plans/completed/`. ADRs in `docs/adr/` are permanent.
+- **`docs/plans/` is ephemeral** — archive to `docs/plans/completed/`; each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder, disposed as one unit. ADRs in `docs/adr/` are permanent.
 - **Reviewer agents** use YAML frontmatter (`name`/`description`/`tools`/`systemPromptMode: replace`) and are read-only (`tools: read, grep, find, ls, bash`).
 
 ## Editing workflow-guard.ts
diff --git a/README.md b/README.md
index bb5b0cc..d12aa48 100644
--- a/README.md
+++ b/README.md
@@ -63,7 +63,7 @@ Guide the agent through a disciplined development process:
 
 ```
 brainstorm → writing-plans → executing-tasks → finalizing
-                             (feature-gate: write feature E2E → feature-spec → implement → feature-complete → review)
+                             (feature-gate: write feature E2E → feature-spec → implement → review → ship checkpoint)
                                 ↕
                    diagnose (anytime)   ·   status (anytime)
 ```
@@ -72,9 +72,9 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
 
 | Phase | Trigger | What Happens |
 |-------|---------|--------------|
-| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc with a `## Requirements` list. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
-| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code) |
-| **Execute** | `/skill:pwk-executing-tasks` | Write the feature E2E (red) → **checkpoint: feature-spec** → implement requirements → **checkpoint: feature-complete** → feature review |
+| **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc opening with a `## At a glance` digest (plain summary + `| R# | Requirement in one line | Risk |` table) before the `## Requirements` list. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
+| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code), with a `## Crosswalk` proving every R# is covered; you review a one-line confirmation, not the full plan |
+| **Execute** | `/skill:pwk-executing-tasks` | Write the feature E2E (red) → **checkpoint: feature-spec** → implement requirements → feature review → **ship checkpoint** (execution summary + coverage table; full diff on request) |
 | **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
 | **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs, update README/CHANGELOG, create PR |
 | **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
@@ -89,7 +89,7 @@ You control each phase — the agent never advances on its own. Invoke a skill t
 ```
 /skill:pwk-brainstorming   →  discuss and design (lists Requirements)
 /skill:pwk-writing-plans   →  turn each Requirement into acceptance criteria + integration tests
-/skill:pwk-executing-tasks →  feature-gate flow: E2E-first, implement, feature review (two checkpoints)
+/skill:pwk-executing-tasks →  feature-gate flow: E2E-first, implement, review, ship checkpoint
 /skill:pwk-code-review     →  auto-runs at the feature level inside executing-tasks; also invocable manually for ad-hoc reviews
 /skill:pwk-finalizing       →  ship it
 ```
@@ -105,8 +105,8 @@ The feature is implemented via the feature-gate flow:
 1. Write the feature-acceptance E2E test (red)
 2. ⏸ **checkpoint: feature-spec** — you confirm the E2E proves the feature
 3. Implement the requirements back-to-back (TDD: meaningful test → red → green per slice; full autonomy)
-4. ⏸ **checkpoint: feature-complete** — full suite + feature E2E green, you review the whole diff
-5. Feature review → commit
+4. Feature review (four fresh-context roles over a script-assembled review packet)
+5. ⏸ **ship checkpoint** — full suite + feature E2E green; you review the execution summary + coverage table (full diff on request)
 
 Per-requirement checkpoints/reviews are opt-in (default off); the feature-level review covers everything.
 
@@ -136,13 +136,13 @@ The feature-gate flow has **two hard human-review gates** (not optional):
 | Checkpoint | What's done | What you review |
 |---|---|---|
 | **feature-spec** | Feature-acceptance E2E written, confirmed failing | Does the E2E actually prove the feature? |
-| **feature-complete** | All requirements implemented; full suite + E2E green | Is the whole feature correct before review? |
+| **ship** | All requirements implemented; full suite + E2E green; feature review collected | Execution summary + per-requirement coverage table — built as promised? (full diff on request) |
 
 The agent stops and waits at each — approve, request changes, or send it back.
 
-### Before You Ship: the Feature-Complete Gate
+### Before You Ship: the Ship Gate
 
-The feature-level review checks the whole diff composed. The **feature-complete** checkpoint already ran the full suite + the feature-acceptance E2E green — that *is* the integration check (there is no separate end pass). Finalize re-runs the full suite too — it never ships a red suite, even across resumed sessions.
+The feature-level review checks the whole diff composed and runs **before** the **ship checkpoint** — so your one final approval is fully informed (execution summary + coverage table; the raw diff stays one command away). The ship checkpoint already ran the full suite + the feature-acceptance E2E green — that *is* the integration check (there is no separate end pass). Finalize re-runs the full suite too — it never ships a red suite, even across resumed sessions.
 
 ## Quick Start
 
diff --git a/agents/pwk-spec-reviewer.md b/agents/pwk-spec-reviewer.md
index fbe2e11..b743662 100644
--- a/agents/pwk-spec-reviewer.md
+++ b/agents/pwk-spec-reviewer.md
@@ -26,4 +26,12 @@ The task provides a review packet: the diff under review plus the acceptance cri
 
 ### Spec alignment
 
-For each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.
\ No newline at end of file
+For each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.
+
+**Open the report with a coverage table** — one row per requirement, keyed by the packet's `## Requirement N` headings (R# = N):
+
+| R# | Verdict | Evidence |
+|----|---------|----------|
+| 1 | <verdict> | file:line (code), file:line (test) |
+
+Verdict per requirement: `covered | gap | scope-creep` — `covered` = every criterion has covering code and a test; `gap` = a criterion lacks code or a test; `scope-creep` = the code does more than the criteria specify. Findings elaborate on every non-`covered` row; an all-`covered` table still ends with the explicit `No findings` line.
\ No newline at end of file
diff --git a/docs/adr/0003-ship-gate-review-before-approval.md b/docs/adr/0003-ship-gate-review-before-approval.md
new file mode 100644
index 0000000..d3b414b
--- /dev/null
+++ b/docs/adr/0003-ship-gate-review-before-approval.md
@@ -0,0 +1,41 @@
+# ADR 0003: Ship gate — review runs before the final approval
+
+Date: 2026-09-05
+
+## Context
+
+ADR 0002's flow approves the feature at `feature-complete` (full suite + E2E green, the human
+reviews the whole diff) and only then runs the feature-level review — findings arrive after the
+blessing, as follow-ups. For a time-poor human this is the worst of both: the checkpoint's
+default artifact is the most expensive thing to read (the raw diff), and the approval it produces
+is blind to what the reviewers find. Since 1.6.0 the review itself is cheap (script-assembled
+packet, tiered roles), so the cost argument for approving first no longer holds.
+
+## Decision
+
+Merge `feature-complete` and the feature review into one **ship checkpoint**. When all
+requirements are ✅: run the full suite + feature E2E (green) → run the feature review per the
+plan's tag → apply smell fixes and re-green → then pause once. The pause presents the execution
+summary (what each requirement became, deviations), the spec-reviewer's per-requirement coverage
+table, findings status, and the full diff only on request. The phase enum gains `ship-paused`
+(replacing `feature-complete-paused`); legacy progress files resume as `reviewing`.
+
+## Why
+
+One fully-informed stop replaces one blind one plus a findings afterparty. The human's approval
+sees exactly what the reviewers saw, compressed into digests keyed by requirement ID — the raw
+diff remains one command away for spot-checks where a verdict smells wrong. Nothing is lost:
+the E2E still gates before the pause, and smell fixes still land before approval rather than
+after it.
+
+## Consequences
+
+- The human reads a digest (execution summary + coverage table), not the diff, by default —
+  the kit's contract changes from "you review the whole diff" to "you review the digests; the
+  diff is on request".
+- Review cost is now spent before an abort could have saved it; accepted because the E2E-green
+  prerequisite already filters the abort-worthy cases, and the review is post-1.6.0 cheap.
+- A reviewer report without a per-requirement coverage table is invalid (retry or inline
+  completion) — the ship checkpoint is never presented without coverage.
+- Minor version bump: checkpoint semantics change for executing-tasks sessions; in-flight
+  progress files carry a documented legacy resume mapping.
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index 598b9a9..63c698c 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -54,7 +54,7 @@ The command creates `.agents/agents/` and installs the five PWK roles. It preser
 
 Explore the idea through collaborative dialogue. The agent reads code, asks questions, proposes approaches, and presents the design for your review. On non-trivial topics with prior art, the skill requests the logical `codebase-recon` capability using the `pwk-recon-scout` role. A compatible host may dispatch that role in a fresh, bounded, read-only worker; otherwise the skill reports `Scout: unavailable` and performs the same five-section recon inline.
 
-Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## Requirements` list. For a too-big requirement, may start an **umbrella** (writes a status-free overview + the first part's design doc). ADRs go to `docs/adr/` (permanent).
+Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (plain-language summary + `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` list. For a too-big requirement, may start an **umbrella** (writes a status-free overview + the first part's design doc). ADRs go to `docs/adr/` (permanent).
 
 ### 2. Plan
 
@@ -62,7 +62,7 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with
 /skill:pwk-writing-plans
 ```
 
-Read the design doc's Requirements and turn each into **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code).
+Read the design doc's Requirements and turn each into **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code). The plan carries a `## Crosswalk` (one row per design requirement); you review a **one-line confirmation** ("Plan covers R1–R<N>; tags: …") — the full plan is available on request.
 
 Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
 
@@ -72,11 +72,11 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
 /skill:pwk-executing-tasks
 ```
 
-Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → **checkpoint: feature-complete** (full suite + E2E green) → feature review. Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
+Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + coverage table — full diff on request). Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
 
 ### 4. Code review (feature level)
 
-The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human.
+The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.
 
 In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`, where compatible providers such as `@tintinweb/pi-subagents` can discover them. `/pwk-setup --fast-model <model>` (or the interactive picker) sets the fast-tier model for the smell/hazard reviewers — an advisory hint hosts may honor. Tintinweb may run the roles through its native `Agent` mechanism or map recon to its built-in read-only `Explore` type. The core kit does not require Tintinweb or any other provider.
 
@@ -126,6 +126,6 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
 
 - Start with brainstorming for anything non-trivial.
 - The plan is a behavioral spec, not an implementation recipe — let the executor choose how.
-- The feature-gate flow has two checkpoints by default (feature-spec + feature-complete): use them to steer the E2E spec and the finished implementation.
+- The feature-gate flow has two checkpoints by default (feature-spec + ship): use them to steer the E2E spec and to sign off the finished implementation (digest + coverage, diff on request).
 - **Right-size each requirement at plan time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-writing-plans`; the human can override or downgrade before plan approval.
 - Put all plan artifacts under `docs/plans/`; ADRs under `docs/adr/`.
diff --git a/docs/lessons.md b/docs/lessons.md
index fee0d92..cb3dc79 100644
--- a/docs/lessons.md
+++ b/docs/lessons.md
@@ -17,6 +17,7 @@ Retire rules that no longer apply during finalizing.
 - **Test-first for skill/doc content:** add the skill-lint assertion first (red — the skill doesn't yet claim the behavior), then edit the skill markdown to satisfy it (green). After edits run biome — it collapses short `if (cond) ok();` to one line and rejects array holes like `[, ""]` (restructure instead).
 - **Editing skill markdown: anchor edit-tool oldText on apostrophe-free text.** These docs use curly apostrophes (U+2019) in contractions and possessives; an oldText written with a straight ASCII apostrophe fails to match silently and aborts the whole edit batch (zero blocks replaced). Pick anchors that avoid apostrophes, and rephrase newText to stay apostrophe-free for consistency.
 - **skill-lint.mjs: use optional chaining.** Biome enforces `useOptionalChain` — write `x?.method()`, not `x && x.method()` (the `fgMark` helper treats undefined content as a fail).
+- **skill-lint wording bans must scope to the defining line, not the whole file.** A blanket `/feature-complete-paused/` absence assertion broke on the resume map's legitimate legacy mention. When a doc both defines a thing and references its legacy predecessor, assert absence on the extracted definition line (e.g. the `Feature phase is one of:` line) and keep the blanket ban off the file.
 - **Keep one commit per topic in docs/plans/.** When more than one in-flight brainstorm has artifacts under docs/plans/, the plan-phase `git add docs/plans/` sweeps unrelated drafts into the topic PR. Reset --soft HEAD~1, then re-commit with explicit `-- <files>` per topic so each PR has only its own design + implementation + progress (and any parked `*draft`/`*revised` files land on their own commit). Mirrors the same hygiene as `pwk-finalizing` use of the `????-??-??-<topic>-*` glob instead of bare `*<topic>*`.
 
 ## Testing
diff --git a/docs/oversight-model.md b/docs/oversight-model.md
index 1136f37..5edbdd0 100644
--- a/docs/oversight-model.md
+++ b/docs/oversight-model.md
@@ -6,9 +6,9 @@
 
 Skills teach the agent the workflow. There are 5 pipeline skills:
 
-- **pwk-brainstorming** — explore ideas, produce a descriptive design doc that opens with a `## Requirements` list. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
-- **pwk-writing-plans** — turn each requirement into acceptance criteria + integration-test cases (a behavioral spec, no implementation code)
-- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the requirements, then one feature-level review; two mandatory checkpoints at the feature level, per-requirement ceremony opt-in
+- **pwk-brainstorming** — explore ideas, produce a descriptive design doc that opens with a `## At a glance` digest for the human (plain-language summary + a `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` list. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
+- **pwk-writing-plans** — turn each requirement into acceptance criteria + integration-test cases (a behavioral spec, no implementation code); carries a `## Crosswalk` (R# → section → tests) and presents a one-line coverage confirmation instead of the full plan
+- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the requirements, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
 - **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review requests the `parallel-review` capability for four logical fresh-context, read-only roles; successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
 - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
 
diff --git a/docs/plans/2026-09-05-human-review-digests-design.md b/docs/plans/2026-09-05-human-review-digests-design.md
new file mode 100644
index 0000000..4ea21f4
--- /dev/null
+++ b/docs/plans/2026-09-05-human-review-digests-design.md
@@ -0,0 +1,114 @@
+# Design: human review digests — at-a-glance, crosswalk, execution summary, ship gate, umbrella folders
+
+## At a glance
+
+The human's review time is the scarce resource in the workflow. Today every assurance point hands the human a full artifact: the whole design doc to approve a design, the whole implementation plan to check nothing was dropped, the whole diff to approve the build. The LLM-facing depth is fine — the wrong part is being read by the human.
+
+This change adds a thin **digest layer** to the artifacts the human already stops at, and keeps the LLM-facing docs LLM-only: a plain-language `## At a glance` atop design docs (with one-line restatements per requirement), a requirement crosswalk in plans (presented as a one-line confirmation, not a full-plan read), an **execution summary** accumulated in the progress file (what each requirement became, in plain words), and a merged **ship gate** where the feature review runs *before* the single final approval. Reviewer reports gain a per-requirement coverage table. Umbrellas move into their own folder.
+
+After this, the human reads ~10 digest lines per stop and touches the full plan or raw diff only when a digest smells wrong.
+
+| R# | Requirement in one line | Risk |
+|----|------------------------|------|
+| R1 | Design docs open with `## At a glance` — plain summary + one-line-per-requirement table with R# IDs | low |
+| R2 | Plans gain a `## Crosswalk` (R# → section → tests) after `## Overview`; the human is shown a one-line confirmation, not the plan | low |
+| R3 | Progress file gains an execution summary; feature-complete + feature review merge into one **ship checkpoint** presenting digest + coverage table, diff on request | medium — changes checkpoint semantics (ADR) |
+| R4 | Spec-reviewer's report mandates a per-requirement coverage table (verdict + evidence) | low |
+| R5 | Umbrella docs live in their own `docs/plans/<date>-<umbrella>/` folder, disposed as one unit | low |
+| R6 | Finalize gates on `Feature phase: done`; digest sections ride existing disposal globs; all user docs swept for consistency | low |
+
+## Requirements
+
+1. **Design digest (`## At a glance`).** `skills/pwk-brainstorming/SKILL.md` mandates that every design doc opens with `## At a glance`, immediately before `## Requirements`: (a) a 2–4 sentence plain-language summary — what is wrong or needed, what will be built, the key approach in plain words; (b) a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, where R# is the requirement's number in the `## Requirements` list (single ID scheme, used unchanged by crosswalk, progress rows, packets, and coverage tables). The trivial fast-path doc gains a single `In short:` line instead. Plain-language rule: short sentences, no jargon, no Given/When/Then — those stay in the body sections for the executor. Mirrors updated in `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`; skill-lint gains marker assertions.
+
+2. **Plan crosswalk + one-line confirmation.** `skills/pwk-writing-plans/SKILL.md` template gains a `## Crosswalk` section located **between `## Overview` and `## Setup`/`## Requirement 1`** — strictly before `## Requirement 1` so the review-packet sed spans (`## Requirement 1` → `## Feature acceptance` → `### Feature review`) are untouched. The crosswalk is a table `| R# | Plan section | Tests |` with exactly one row per design requirement. The audit step verifies every design R# appears exactly once. Plan presentation changes from "present the plan" to: present a **one-line confirmation** ("Plan covers R1–R5; tags: R3 parallel") plus the feature-acceptance test name; the full plan is available on request. Approval still gates execution.
+
+3. **Execution summary + merged ship gate.** `skills/pwk-executing-tasks/SKILL.md`: the progress-file template gains an `## Execution summary` section — table `| R# | Requirement | How it was built | Deviated? |` — filled **as each requirement lands** (same step as marking ✅), not retrofitted. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names allowed sparingly; **no test names, no code**. "Deviated?" records any departure from the plan with a one-line why, logged when the deviation happens. The feature-complete checkpoint and the post-approval feature review are replaced by one **⏸ ship checkpoint**: after all requirements ✅, run full suite + feature E2E (green), run the feature review per the plan's tag, apply smell fixes and re-green, then pause and present: a green-gates line, the execution summary, the coverage table from the spec-reviewer report, findings status (fixed / open for the human), and "full diff on request". `Feature phase` enum becomes: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`; the resume map is updated accordingly. The feature-spec checkpoint stays, now led by 1–2 plain lines: "what this test proves". Mirrors updated in the four docs; README's "you review the whole diff" wording changes to the digest presentation.
+
+4. **Spec-reviewer coverage table.** `agents/pwk-spec-reviewer.md`'s `## Your checklist` (role-specific section only — the four reviewers' shared byte-identical conduct block is untouched) mandates that the report opens with a coverage table: one row per requirement (keyed by the packet's `## Requirement N` headings / R#): `| R# | Verdict | Evidence |`, verdict ∈ `covered | gap | scope-creep`, evidence = file:line(s). Findings elaborate on non-`covered` rows. The all-covered case still ends with the explicit `No findings` line. The executor compiles this table into the ship-checkpoint presentation. Mirrors updated in `docs/developer-usage-guide.md`, `docs/workflow-phases.md`, `docs/oversight-model.md`; `docs/provider-delegation-contract.md` unchanged (report *content* is role-level, `DelegationResult` shape unaffected).
+
+5. **Umbrella folders.** Umbrella docs move from flat files into `docs/plans/<date>-<umbrella>/`: `overview.md`, plus per part `<part>-design.md`, `<part>-implementation.md`, `<part>-progress.md`, and `*-review-packet.md` — the folder name carries the date+umbrella, part files carry only the part topic. Standalone topics stay flat. Skills' discovery globs become recursive (`docs/plans/**/*-design.md` etc.) in `pwk-brainstorming` (overview + part discovery), `pwk-writing-plans` (design/overview lookup), `pwk-executing-tasks` (plan lookup, packet path inside the folder), `pwk-status` (roll-up), and `pwk-finalizing` (dispose the umbrella folder as one unit — move to `docs/plans/completed/` or delete per the existing archive/delete choice; the flat-topic glob is unchanged). `AGENTS.md` archive wording updated. The guard's writable root (`docs/plans/`) already covers subfolders; a guard test proves subfolder paths pass `shouldBlockFilePath` during gated phases.
+6. **Finalize + docs consistency.** `skills/pwk-finalizing/SKILL.md` gains a shippable-state pre-check: every progress file's `Feature phase` must be `done` — any other value (including legacy `feature-complete-paused`) blocks with a pointer back to `/skill:pwk-executing-tasks`, alongside the existing `❌ failed`/`⏭ skipped` checks. The new digest sections (at-a-glance, crosswalk, execution summary) require no new disposal rules — each rides the existing `????-??-??-<topic>-*` globs with its host doc; umbrella folders dispose whole per requirement 5. `pwk-status` needs no enum change (it reads the requirement table, not `Feature phase`) — only the recursive-glob change applies. The five user docs (`docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md`) are swept so the new flow is described consistently and no doc keeps "read the full plan" or "review the whole diff" as the default human action. `CHANGELOG.md` gains its entry at finalize per convention; historical entries are not edited.
+
+## Problem
+
+Three assurances the human still wants, with almost no time to spend: no requirement **misunderstood**, nothing **missed**, and the implementation's **direction** correct. Misunderstanding can enter at three points — design, design→plan translation, code — and each currently demands reading a full LLM-facing artifact at the moment it is cheapest to fix. The kit's documents serve the executor and reviewers well; they were never shaped for the human's 2-minute judgment pass. Meanwhile the feature-complete checkpoint presents the raw diff (README sells it as "you review the whole diff"), which is the most expensive possible review artifact, and the feature review runs *after* approval — findings arrive once the human has already blessed the work.
+
+## Approaches considered
+
+| Approach | Verdict | Reason |
+|---|---|---|
+| **Digest layer inside existing docs** (at-a-glance, crosswalk, execution summary) | **adopted** | one artifact per phase, no sync problem; detail stays where the executor needs it |
+| Build map in the plan (files + order + approach) | rejected | human is fine skipping the implementation doc; direction assurance lives in the design digest (approach line) and the execution summary (how it was built) — the plan stays LLM-only, preserving "plan stable when details shift" |
+| Separate digest/summary file per phase | rejected | another artifact to keep in sync and dispose; digests must live beside their detail |
+| Keep two stops (approve, then review), digest both | rejected | approval stays blind; running the (now cheap, post-1.6.0) review *before* the pause gives one fully-informed stop |
+| Human reads reviewer reports directly | rejected | findings-shaped prose, not assurance-shaped; the coverage table extracts the per-requirement verdict |
+| Requirement IDs tracked in a side file | rejected | inline tables in existing docs; an ID scheme is only useful if it is in the docs the roles already read |
+| Folders for all topics | rejected | asked-for scope is umbrellas; standalone flat files keep the common case unchanged |
+
+## Architecture
+
+One ID scheme (design `## Requirements` numbering → R#) threads through every digest: at-a-glance table → plan crosswalk → progress/execution-summary rows → packet's `## Requirement N` headings → spec-reviewer coverage table. A human can follow one requirement end-to-end across all digests by its R#, and any layer with a missing R# row is visibly incomplete.
+
+```
+design doc                plan                      progress file                ship checkpoint
+┌────────────────┐   ┌───────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
+│ ## At a glance │   │ ## Crosswalk      │   │ ## Execution summary│   │ green gates line     │
+│  R# one-liners │──▶│  R# → section     │──▶│  R# → how built,    │──▶│ execution summary    │
+│ ## Requirements│   │ ## Requirement N  │   │  deviations         │   │ coverage table (R#)  │
+│  (numbered)    │   │  (criteria/tests) │   │ (filled as rows ✅) │   │ findings status      │
+└────────────────┘   └───────────────────┘   └─────────────────────┘   │ diff on request      │
+                        packet copies            review: spec-         └──────────────────────┘
+                        Requirement N spans       reviewer emits
+                        (crosswalk outside)       coverage table
+```
+
+Human reading per stop: design = at-a-glance (~10 lines); plan = one confirmation line; ship = summary + coverage table. Plain-language rule binds everything the human is asked to read.
+
+## Components
+
+- `skills/pwk-brainstorming/SKILL.md` — at-a-glance template + trivial `In short:` variant; umbrella folder creation (`docs/plans/<date>-<umbrella>/overview.md`).
+- `skills/pwk-writing-plans/SKILL.md` — `## Crosswalk` template (placed after `## Overview`, before `## Setup`/`## Requirement 1`), audit step (every R# exactly once), one-line-confirmation presentation; recursive globs.
+- `skills/pwk-executing-tasks/SKILL.md` — execution-summary template + fill-as-you-land rule + deviation logging; merged ship checkpoint (review before pause, smell fixes pre-pause); phase enum + resume map; plain-language checkpoint intros; recursive plan glob; packet path inside umbrella folder.
+- `agents/pwk-spec-reviewer.md` — coverage-table mandate in the role checklist only.
+- `skills/pwk-status/SKILL.md`, `skills/pwk-finalizing/SKILL.md` — recursive globs; whole-folder disposal for umbrellas.
+- `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md` — mirror updates (at-a-glance, confirmation, ship gate, coverage table, folders).
+- `skills/pwk-finalizing/SKILL.md` — whole-folder disposal for umbrellas; `Feature phase: done` shippable-state pre-check.
+- `tests/skill-lint.mjs` — new markers: at-a-glance, crosswalk placement, execution summary, `ship-paused`, coverage table, umbrella-folder globs, finalizing done-gate.
+- `tests/review-packet.test.ts` — `PLAN_FIXTURE` gains a `## Crosswalk` before `## Requirement 1`; the three sed commands stay byte-identical, proving extraction is unaffected.
+- `tests/role-contracts.test.ts` — spec-reviewer coverage-table assertion; shared-prefix assertion untouched.
+- `tests/workflow-guard.test.ts` — subfolder-under-`docs/plans/` writable during gated phases.
+- `docs/adr/0003-*.md` — ship-gate reorder: review runs before the final approval.
+
+## Data flow
+
+1. Brainstorm ends → design doc written with `## At a glance` + numbered requirements (R#s assigned).
+2. Writing-plans → plan with `## Crosswalk` (one row per R#) → audit → human sees one confirmation line → approval.
+3. Execute → per requirement: mark ✅ + write execution-summary row (how built, deviations) → all ✅ → suite + E2E green → feature review runs → smell fixes → **ship pause**: green gates + execution summary + coverage table + findings status.
+4. Approve / request changes (fix loop, re-present) → `done`.
+5. Umbrella: overview + all parts' docs accumulate in `docs/plans/<date>-<umbrella>/`; finalize disposes the folder whole.
+
+## Error handling
+
+- **Digest drift** (summary says X, code does Y): execution summary is written at land-time by the implementer, not reconstructed at the end; the spec-reviewer's coverage table independently verifies against the packet, so a drifted row contradicts the reviewer's verdict at the ship pause.
+- **Reviewer report without a coverage table**: invalid report — same handling as an empty report (retry the role, else inline completion); coverage must exist before the ship pause is presented.
+- **Crosswalk incomplete** (missing R# row): audit step fails the plan phase before presentation; fix and re-audit.
+- **Deviation unrecorded**: the ship pause cross-checks execution-summary rows against the diff; a summary row whose content the diff contradicts is flagged for the human at the pause.
+- **Resume on the new enum**: old progress files predate the enum change — resume treats `feature-complete-paused` as `reviewing` (the nearest new state: continue into the feature review, then ship pause).
+- **Umbrella glob misses**: recursive globs match both flat and folder layouts everywhere discovery happens; flat-only patterns would strand folder docs — covered by skill-lint assertions on each discovery site.
+
+## Testing
+
+- Test-first per `docs/lessons.md`: add skill-lint/role-contract assertions red, then edit markdown green.
+- Marker assertions as behavior regexes, not exact sentences; one canonical marker per contract; new vocabulary lines kept clear of the `vocabOf` "Checkpoints"/"Review" parser sweep.
+- `tests/review-packet.test.ts` proves the crosswalk does not perturb the sed spans (fixture with crosswalk + unchanged commands).
+- Guard test for subfolder writability; shuffle-safe via `session_start` in `beforeEach`.
+- Curly-apostrophe rule respected in all markdown edits (apostrophe-free edit anchors).
+
+## Feature acceptance
+
+- Given a non-trivial feature brainstormed, When the design doc is written, Then it opens with `## At a glance` whose R# table has exactly one plain-language row per numbered requirement, and a human can approve intent from the digest alone.
+- Given the approved design, When `pwk-writing-plans` presents its result, Then the human sees a one-line crosswalk confirmation covering every R# — not the full plan — and the plan's `## Crosswalk` sits outside the packet sed spans.
+- Given all requirements implemented and the feature review collected, When the executor pauses at the ship checkpoint, Then the presentation shows the green gates, the execution summary (one "how it was built" line per R#, no test names), the spec-reviewer coverage table (verdict + evidence per R#), findings status, and the diff only on request.
+- Given a feature whose progress shows `reviewing` or `ship-paused`, When `pwk-finalizing` runs its pre-checks, Then it blocks and sends the work back to `/skill:pwk-executing-tasks`; given `done`, When finalizing proceeds, Then the design/plan/progress docs including their digest sections are disposed by the existing globs (umbrella folder as one unit) and every user doc describes the new flow consistently — none still defaults the human to reading the full plan or the whole diff.
+- Given an umbrella topic, When its overview is created, Then all umbrella docs live in `docs/plans/<date>-<umbrella>/` and `pwk-finalizing` disposes the folder as one unit while standalone topics still resolve via flat globs.
diff --git a/docs/plans/2026-09-05-human-review-digests-implementation.md b/docs/plans/2026-09-05-human-review-digests-implementation.md
new file mode 100644
index 0000000..0aea3b8
--- /dev/null
+++ b/docs/plans/2026-09-05-human-review-digests-implementation.md
@@ -0,0 +1,134 @@
+# Implementation Plan: human-review-digests
+
+## Overview
+Design: docs/plans/2026-09-05-human-review-digests-design.md
+
+Add the human digest layer across the workflow: `## At a glance` atop design docs (R# table), `## Crosswalk` in plans outside the packet sed spans (one-line confirmation replaces full-plan reading), execution summary + merged ship checkpoint (review before the single final approval; diff on request), spec-reviewer coverage table, umbrella folders, and a finalize done-gate + docs consistency sweep. All changes are skill/agent/doc markdown + tests; no guard code change. `docs/adr/0003-ship-gate-review-before-approval.md` lands with Requirement 3.
+
+Conventions (from `docs/lessons.md` — apply throughout):
+- Test-first for skill/doc content: add the skill-lint / role-contracts / fixture assertion first (red), then edit the markdown (green).
+- Wording assertions are behavior regexes, not exact sentences; one canonical marker per contract.
+- Editing skill/agent markdown: anchor edit-tool oldText on apostrophe-free text (curly U+2019 lives in these files).
+- Guard-state tests fire `session_start` in `beforeEach`.
+- No new pipe-vocabulary on lines containing "Checkpoints"/"Review" in skills (skill-lint `vocabOf` rejects strays).
+- Commit with explicit `--` paths; root files (README.md, CHANGELOG.md, AGENTS.md) added explicitly, never via dir-scoped adds.
+
+## Crosswalk
+
+| R# | Plan section | Tests |
+|----|--------------|-------|
+| R1 | Requirement 1: Design digest (`## At a glance`) | skill-lint at-a-glance markers + docs mirrors |
+| R2 | Requirement 2: Plan crosswalk + one-line confirmation | review-packet fixture (crosswalk outside spans) + skill-lint placement markers |
+| R3 | Requirement 3: Execution summary + merged ship gate | skill-lint execution-summary/`ship-paused` markers + docs mirrors + ADR 0003 |
+| R4 | Requirement 4: Spec-reviewer coverage table | role-contracts assertions (incl. byte-identical conduct block unchanged) |
+| R5 | Requirement 5: Umbrella folders | guard subfolder-writability test + skill-lint recursive-glob markers |
+| R6 | Requirement 6: Finalize done-gate + docs consistency sweep | skill-lint finalizing done-gate markers + docs-consistency sweep |
+
+## Requirement 1: Design digest (`## At a glance`)
+
+### Acceptance criteria
+- Given `skills/pwk-brainstorming/SKILL.md`, when the design-doc template rules are read, then every design doc is mandated to open with `## At a glance` immediately before `## Requirements`, containing a 2–4 sentence plain-language summary (what is needed, what will be built, key approach) and a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, R# matching the `## Requirements` list numbering.
+- Given the trivial fast-path rule, when a trivial design doc is written, then it carries a single `In short:` line instead of the full table.
+- Given the digest rules, when at-a-glance content is written, then it is plain language: short sentences, no jargon, no Given/When/Then — those stay in body sections for the executor.
+- Given `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, when the design phase is described, then the at-a-glance opening is mentioned consistently.
+- Edge: umbrella overviews gain no at-a-glance section — the roster already serves that role.
+
+### Integration tests
+- skill-lint `should mandate at-a-glance in brainstorming` — `/## At a glance/` present with before-Requirements placement wording; `In short:` trivial marker present.
+- docs-consistency `should mirror at-a-glance in user docs` — regex in the four docs.
+
+### Checkpoints: none
+### Review: skip
+
+## Requirement 2: Plan crosswalk + one-line confirmation
+
+### Acceptance criteria
+- Given `skills/pwk-writing-plans/SKILL.md`, when the plan template is read, then a `## Crosswalk` section is specified as a table `| R# | Plan section | Tests |` with one row per design requirement, placed between `## Overview` and `## Setup`/`## Requirement 1` — strictly before `## Requirement 1`, with the packet sed-span rationale stated.
+- Given the pre-presentation audit, when the crosswalk is checked, then every design R# appears exactly once; a missing or duplicate R# fails the audit before any presentation.
+- Given plan presentation, when the plan is complete, then the human is shown a one-line confirmation covering every R# plus the feature-acceptance test name, with the full plan available on request; approval still gates execution.
+- Given the review-packet recipe, when a plan containing `## Crosswalk` is processed, then the three sed ranges are unchanged and the crosswalk is excluded from the extracted spans.
+- Given the four docs, when plan presentation is described, then the confirmation-not-full-plan behavior is mirrored.
+
+### Integration tests
+- review-packet `should keep packet spans intact with a crosswalk present` — `PLAN_FIXTURE` gains `## Crosswalk` before `## Requirement 1`; the three sed commands stay byte-identical; extraction excludes the crosswalk.
+- skill-lint `should mandate the crosswalk in writing-plans` — crosswalk table markers + the placement rule regex.
+
+### Checkpoints: none
+### Review: skip
+
+## Requirement 3: Execution summary + merged ship gate
+
+### Acceptance criteria
+- Given the progress-file template in `skills/pwk-executing-tasks/SKILL.md`, when read, then it includes an `## Execution summary` section — table `| R# | Requirement | How it was built | Deviated? |` — with the fill-as-you-land rule (row written in the same step as marking a requirement ✅) and the deviation rule (recorded when the departure happens, with a one-line why).
+- Given execution-summary content rules, when rows are written, then "How it was built" is one or two plain sentences (what it does now + the approach actually taken), file names allowed sparingly, and no test names or code.
+- Given all requirements ✅, when the executor proceeds, then the flow is: full suite + feature E2E green → feature review per the plan's tag → smell fixes applied and suites re-greened → single ⏸ **ship** checkpoint — no separate feature-complete approval before review.
+- Given the ship checkpoint fires, when it pauses, then it presents: a green-gates line, the execution summary, the coverage table from the spec-reviewer report, findings status (fixed / open for the human), and "full diff on request" — the raw diff is not the default presentation.
+- Given a reviewer report lacking the coverage table (Requirement 4's contract), when the ship pause is assembled, then the report is invalid (retry the role, else inline completion); the pause is not presented without coverage.
+- Given progress `Feature phase`, when phases transition, then the enum is `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`; a legacy progress file showing `feature-complete-paused` resumes as `reviewing`.
+- Given the feature-spec checkpoint, when presented, then it is led by 1–2 plain-language lines stating what the E2E proves, before the test and failing output.
+- Given `docs/adr/`, when this requirement lands, then `docs/adr/0003-ship-gate-review-before-approval.md` records the reorder: context (approval was blind — findings arrived after), decision (review runs before the single final approval), why (one fully-informed stop; review cost is low post-packet).
+- Mirrors: README's review-the-whole-diff wording becomes the digest presentation; `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md` updated; skill-lint checkpoint marker group updated (`feature-complete` assertions replaced by `ship` semantics).
+
+### Integration tests
+- skill-lint `should mandate execution summary and ship checkpoint` — `## Execution summary`, fill-as-you-land, `ship-paused` markers in the executing skill; checkpoint marker group updated and green.
+- docs-consistency `should describe the ship gate in user docs` — README + docs regexes.
+
+### Checkpoints: none
+### Review: skip
+
+## Requirement 4: Spec-reviewer coverage table
+
+### Acceptance criteria
+- Given `agents/pwk-spec-reviewer.md`, when the checklist is read, then the report is mandated to open with a coverage table — one row per requirement keyed by the packet's `## Requirement N` headings: `| R# | Verdict | Evidence |`, verdict ∈ `covered | gap | scope-creep`, evidence as file:line.
+- Given an all-covered review, when the report is written, then it still ends with the explicit `No findings` line.
+- Given the four reviewer files, when compared, then the shared conduct block remains byte-identical across all four — the change touches only spec-reviewer's `## Your checklist` section.
+- Given `docs/developer-usage-guide.md`, `docs/workflow-phases.md`, `docs/oversight-model.md`, when the feature review is described, then the coverage table is mentioned.
+- Edge: `docs/provider-delegation-contract.md` unchanged — report content is role-level; the `DelegationResult` shape is unaffected.
+
+### Integration tests
+- role-contracts `should mandate a coverage table in the spec-reviewer checklist` — table markers + verdict vocabulary regex.
+- role-contracts `should keep the conduct block byte-identical across reviewers` — existing strict-equality assertion still passes untouched.
+
+### Checkpoints: none
+### Review: skip
+
+## Requirement 5: Umbrella folders
+
+### Acceptance criteria
+- Given `skills/pwk-brainstorming/SKILL.md`, when an umbrella is started, then its docs are created under `docs/plans/<date>-<umbrella>/` — `overview.md` plus per-part `<part>-design.md` and siblings; part discovery uses recursive globs.
+- Given `skills/pwk-writing-plans/SKILL.md` and `skills/pwk-executing-tasks/SKILL.md`, when design/plan/progress docs are located, then discovery uses recursive globs (`docs/plans/**/*-design.md` and siblings); an umbrella part's review packet is written inside the folder.
+- Given `skills/pwk-status/SKILL.md`, when topics roll up, then folder-resident docs are discovered via the recursive globs.
+- Given `skills/pwk-finalizing/SKILL.md`, when an umbrella completes, then the whole `docs/plans/<date>-<umbrella>/` folder is disposed as one unit (archive to `docs/plans/completed/` or delete, per the existing choice); standalone flat-topic disposal globs unchanged.
+- Given `AGENTS.md`, when archive conventions are described, then folder disposal is reflected.
+- Given the workflow guard, when a write targets a `docs/plans/` subfolder path during brainstorm or plan phase, then `shouldBlockFilePath` returns false — subfolders inherit the writable root; no guard code change expected, the test proves it.
+- Edge: flat standalone topics resolve through the same recursive globs (flat files match `docs/plans/**/*-design.md`).
+
+### Integration tests
+- workflow-guard `should allow writes in docs/plans subfolders during gated phases` — `shouldBlockFilePath('docs/plans/2026-09-05-x/overview.md', …)` false for both gated phases; `session_start` in `beforeEach`.
+- skill-lint `should use recursive globs at every discovery site` — `docs/plans/**/` markers in the five skills + whole-folder disposal wording in finalizing.
+
+### Checkpoints: none
+### Review: skip
+
+## Requirement 6: Finalize done-gate + docs consistency sweep
+
+### Acceptance criteria
+- Given `skills/pwk-finalizing/SKILL.md`, when pre-finalization checks run, then every progress file's `Feature phase` must be `done` — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or legacy `feature-complete-paused`) blocks with a pointer back to `/skill:pwk-executing-tasks`, alongside the existing `❌ failed`/`⏭ skipped` checks.
+- Given the new digest sections (at-a-glance, crosswalk, execution summary), when disposal runs, then each rides the existing `????-??-??-<topic>-*` globs with its host doc — no new disposal rules; umbrella folders dispose whole per Requirement 5.
+- Given `skills/pwk-status/SKILL.md`, when the enum lands, then no phase-related change is made (it reads the requirement table, not `Feature phase`) — only Requirement 5's recursive globs apply.
+- Given the five user docs (`docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md`), when the feature lands, then the new flow (at-a-glance, crosswalk confirmation, ship gate, coverage table, umbrella folders) is described consistently and no doc keeps "read the full plan" or "review the whole diff" as the default human action.
+- Edge: `CHANGELOG.md` gains a new entry at finalize per existing convention; historical entries are not edited.
+
+### Integration tests
+- skill-lint `should gate finalizing on Feature phase done` — read-contract markers in the finalizing skill.
+- docs-consistency `should describe the new flow consistently across user docs` — regexes in the five docs, including absence of stale full-plan/whole-diff defaults.
+
+### Checkpoints: none
+### Review: skip
+
+## Feature acceptance
+The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. New file `tests/human-review-digests.test.ts` (precedent: `tests/review-cost-optimization.test.ts`), with the guard and packet-fixture companions above:
+- `should thread R# digests from design to coverage table` — Given the kit's skill/agent/doc files, When the five digest layers are checked, Then brainstorming mandates `## At a glance` with the R# table, writing-plans mandates `## Crosswalk` placed outside the packet sed spans, executing-tasks mandates the `## Execution summary` and the `ship-paused` checkpoint presenting summary + coverage table + diff-on-request, the spec-reviewer contract mandates the R# coverage table with a byte-identical shared conduct block, and umbrella discovery uses recursive globs — one R# scheme visible at every layer, so a missing row is visible anywhere.
+- `should gate shipping on done and keep the docs consistent` — Given the kit's files after all six requirements land, When finalizing and the user docs are checked, Then the finalizing skill blocks any `Feature phase` other than `done`, disposes digest sections via the existing globs (umbrella folders whole), and none of the five user docs still defaults the human to reading the full plan or the whole diff.
+### Feature review: parallel
+One review over the whole feature diff (always). Default `parallel`; `inline` for small features.
diff --git a/docs/plans/2026-09-05-human-review-digests-progress.md b/docs/plans/2026-09-05-human-review-digests-progress.md
new file mode 100644
index 0000000..aa24ff4
--- /dev/null
+++ b/docs/plans/2026-09-05-human-review-digests-progress.md
@@ -0,0 +1,27 @@
+# Progress: human-review-digests
+
+Plan: docs/plans/2026-09-05-human-review-digests-implementation.md
+Branch: human-review-digests
+Started: 2026-09-05T09:34:37Z
+Last updated: 2026-09-05T10:45:00Z
+Feature phase: reviewing
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | Design digest (`## At a glance`) | — | ffdc4a0 |
+| 2 | ✅ | Plan crosswalk + one-line confirmation | — | 2156419 |
+| 3 | ✅ | Execution summary + merged ship gate | — | 7e5a2c6 |
+| 4 | ✅ | Spec-reviewer coverage table | — | 1d3c424 |
+| 5 | ✅ | Umbrella folders | — | 2f1d6d2 |
+| 6 | ✅ | Finalize done-gate + docs consistency sweep | — | 2b23216 |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? |
+|----|-------------|------------------|-----------|
+| 1 | Design digest | Brainstorming skill step 7 now mandates an at-a-glance digest (plain 2–4 sentence summary + R# one-line table) immediately before Requirements; trivial docs get an `In short:` line; four user docs mirror it; skill-lint pins the markers. | no |
+| 2 | Plan crosswalk | Writing-plans emits a `## Crosswalk` table (R# → section → tests) after Overview and strictly before Requirement 1, so the review-packet sed spans are untouched (fixture-proven); audit checks every R# exactly once; the human is shown a one-line confirmation instead of the full plan. | no |
+| 3 | Ship gate | Executing-tasks gained the execution-summary progress section (fill-as-you-land, plain how-built rows, deviations logged when they happen) and the merged ship checkpoint: review runs before the single final approval, presenting digest + coverage table, diff on request; phase enum swaps feature-complete-paused → ship-paused with a legacy resume mapping; ADR 0003 records the reorder; README + three docs re-worded. | yes — E2E/skill-lint assertions originally banned the token `feature-complete-paused` file-wide; the resume map legitimately names it, so the ban was scoped to the phase-enum line (lesson recorded). |
+| 4 | Coverage table | Spec-reviewer's own checklist section now mandates the report open with a per-requirement table (verdict + file:line evidence, keyed by packet Requirement headings); shared conduct block untouched — byte-identity test still passes; other three checklists deliberately unchanged. | no |
+| 5 | Umbrella folders | Umbrella docs move into `docs/plans/<date>-<umbrella>/` (overview.md + part docs beside it); all five skills' discovery globs went recursive; finalize disposes the folder as one unit (rm -rf / mv); packet lives beside the plan doc; guard already allows subfolders (test pins it); AGENTS.md updated. | no |
+| 6 | Finalize gate | Finalizing pre-checks now require every progress file at `Feature phase: done` (legacy states named, bounce back to executing-tasks); digest sections ride existing disposal globs (stated); docs-consistency test sweeps all five user docs for stale "review the whole diff"/"read the full plan" defaults. | no |
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index 742ca4c..2149040 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -4,7 +4,7 @@
 
 ```
 brainstorm → writing-plans → executing-tasks → finalizing
-                          (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → ⏸ feature-complete → feature review)
+                          (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
 ```
 
 A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → plan → execute) × N → finalize`).
@@ -16,8 +16,8 @@ A design doc is one PR; a requirement is one testable slice within it. A require
 ```
 
 - Explore requirements and shape the design.
-- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## Requirements` list, ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
-- May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/YYYY-MM-DD-<umbrella>-overview.md` (roster of parts + build order) and the **first** part's `-design.md`. Later parts are brainstormed one by one against the overview + implemented predecessors.
+- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (2–4 sentence plain-language summary + a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` list, ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
+- May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/<date>-<umbrella>/overview.md` (each umbrella in its own folder; roster of parts + build order) and the **first** part's `-design.md` beside it. Later parts are brainstormed one by one against the overview + implemented predecessors.
 - ADRs go to `docs/adr/` (permanent, never archived).
 
 Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
@@ -29,8 +29,8 @@ Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
 ```
 
 - Creates the feature branch first (`git checkout -b <topic>`), so design + plan docs live on the branch, not `main`.
-- Reads the design doc's `## Requirements`; for each, derives **acceptance criteria + integration-test cases** (a behavioral spec, no implementation code), lists requirements in build order (dependencies positioned earlier), and challenges the design when `## Production-risk areas` is present.
-- For an umbrella part, reads the `*-overview.md` to plan one slice (composing with earlier parts' code) and reuses the existing feature branch instead of creating a new one.
+- Reads the design doc's `## Requirements`; for each, derives **acceptance criteria + integration-test cases** (a behavioral spec, no implementation code), lists requirements in build order (dependencies positioned earlier), and challenges the design when `## Production-risk areas` is present. Emits a `## Crosswalk` (R# → plan section → tests) after `## Overview` — the audit checks every design R# appears exactly once, and the human is shown a **one-line confirmation** ("Plan covers R1–R<N>; tags: …"), not the full plan.
+- For an umbrella part, reads the umbrella folder's `overview.md` to plan one slice (composing with earlier parts' code) and reuses the existing feature branch instead of creating a new one.
 - Derives a **`## Feature acceptance` section** in the plan from the design's Feature acceptance — the **primary enforced spec**, an end-to-end test the executor gates on first. If the design has none, stops and asks the human to brainstorm one.
 - Tags the plan: per-requirement `### Checkpoints`/`### Review` default to `none`/`skip` (opt-in), plus an always-on feature-level `### Feature review`. Flags only requirements with complex logic, the main part of the feature, or production-risk. Requirements with `### Production-risk notes` are auto-tagged `### Review: parallel` (see `pwk-writing-plans` for the rule).
 - Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
@@ -43,9 +43,9 @@ Write boundary: only `docs/plans/` is writable.
 /skill:pwk-executing-tasks
 ```
 
-- **Feature-gate flow:** write the feature-acceptance E2E test (red) → **⏸ checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **⏸ checkpoint: feature-complete** (full suite + feature E2E green) → **feature review** (request the `parallel-review` capability for four logical read-only roles when the host supports it; otherwise run `/skill:pwk-code-review` inline — see [code-review](#code-review)).
+- **Feature-gate flow:** write the feature-acceptance E2E test (red) → **⏸ checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (request the `parallel-review` capability for four logical read-only roles when the host supports it; otherwise run `/skill:pwk-code-review` inline — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + reviewer coverage table; full diff on request).
 - Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the plan tags (default off); see [Proportionality](#proportionality).
-- **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at `feature-complete` (the old integration gate folds into it).
+- **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
 - Progress tracked in `docs/plans/*-progress.md` (feature phase + requirement checklist).
 
 No write restrictions. All tools available.
@@ -79,7 +79,7 @@ No write restrictions.
 ```
 
 - **Pre-check: run the full test suite** — don't ship a red suite (resume spans sessions; don't trust the last execute session).
-- Dispose of consumed plan docs (per-`<topic>`) — the human picks **delete** (default — code + tests are the source of truth) or **archive** to `docs/plans/completed/` (keep planning history). ADRs stay at `docs/adr/`. For an umbrella (an `*-overview.md` exists), disposes the overview **and every part's** docs in one pass and ships **one PR**.
+- Dispose of consumed plan docs (per-`<topic>`) — the human picks **delete** (default — code + tests are the source of truth) or **archive** to `docs/plans/completed/` (keep planning history). ADRs stay at `docs/adr/`. For an umbrella (a `docs/plans/**/overview.md` exists), disposes the whole `docs/plans/<date>-<umbrella>/` folder — overview **and every part's** docs — in one pass and ships **one PR**.
 - Curate `docs/lessons.md`, update README/CHANGELOG, create PR or merge.
 
 No write restrictions.
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index a1932d9..6a3cb1e 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -11,7 +11,7 @@ Read-only exploration of source code; every file you create or edit goes under `
 
 Classify the change at the start.
 
-- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–7; write a **minimal** design doc in one turn (one-line context, a `## Requirements` list with the single requirement, optional `## Production-risk areas` line), and hand off to `/skill:pwk-writing-plans`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
+- **Trivial** — typo or obvious bugfix with no open design questions, config/version bump, single-function change, or anything the human flags as trivial. Skip steps 3–7; write a **minimal** design doc in one turn (an `In short:` one-liner — what + why + approach in plain words, a `## Requirements` list with the single requirement, optional `## Production-risk areas` line), and hand off to `/skill:pwk-writing-plans`. The guard still enforces read-only — trivial compresses the phase to one turn, it doesn't skip it.
 - **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.
 
 When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.
@@ -30,7 +30,7 @@ An umbrella splits one large requirement into multiple design docs that ship tog
 **First brainstorm** (the requirement is too big for one design doc):
 
 1. **Propose the split** — the parts, a one-line scope each, and build order. Get human approval before writing anything beyond discovery.
-2. **Write the overview** — `docs/plans/YYYY-MM-DD-<umbrella>-overview.md`, a **status-free roster**:
+2. **Write the overview** — `docs/plans/<date>-<umbrella>/overview.md`, in the umbrella's own folder (every part doc lives beside it: `<part>-design.md`, `<part>-implementation.md`, `<part>-progress.md`, `*-review-packet.md`), a **status-free roster**:
 
    ```markdown
    # Overview: <umbrella>
@@ -43,7 +43,7 @@ An umbrella splits one large requirement into multiple design docs that ship tog
    ```
 
    Goal, parts with one-line scopes, build order — **no status column**. No skill mutates the overview between this write and `pwk-finalizing` (which disposes it); part-completion is inferred from each part's own `*-progress.md`.
-3. **Write the first part's** `YYYY-MM-DD-<part>-design.md`, then hand off to `/skill:pwk-writing-plans`.
+3. **Write the first part's** `<part>-design.md` in the same umbrella folder, then hand off to `/skill:pwk-writing-plans`.
 
 **Later parts** — re-run `/skill:pwk-brainstorming` for the next part. Read the overview for big-picture/roster context (which slice is yours, which siblings exist), then explore the codebase to design your slice **as brainstorm always does** — prior parts are just implemented code in the repo by then. There is no special "read your predecessors" step; cross-slice decisions that must persist go in an ADR, not the overview.
 
@@ -52,14 +52,16 @@ The whole umbrella is one branch and one PR: `pwk-writing-plans` creates the bra
 ## Process
 
 1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
-2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/*-design.md` and `*-overview.md`; report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `*-overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
+2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — glob `docs/plans/**/*-design.md` and `docs/plans/**/overview.md` (recursive — each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder); report in-flight topics and any active umbrella. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` means the split is already decided — read it for the roster and design this part's `-design.md` against it (see [Umbrella](#umbrella)).
 3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions one at a time, prefer multiple choice. Once you can articulate what/why/constraints, present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
 6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.
 
    Identified a significant architectural decision? Offer an ADR in `docs/adr/`. Only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — they stay out of archive/rotation forever. (Guard note: `docs/adr/` is outside the writable `docs/plans/`; write it only after the user approves and unlocks.)
-7. **Write the design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`, descriptive (not a task list). **Open with `## Requirements`** — one testable behavior each; `pwk-writing-plans` derives acceptance criteria and tests from these. Then: problem, approaches considered, architecture, components, data flow, error handling, testing.
+7. **Write the design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`, descriptive (not a task list). **Open with `## At a glance`** — the human's two-minute digest, immediately before `## Requirements`. It contains (1) a 2–4 sentence plain-language summary: what is wrong or needed, what will be built, the key approach in plain words; (2) a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, where **R# = the requirement's number in the `## Requirements` list below** — this ID is what every later digest keys on (plan crosswalk, progress rows, reviewer coverage table). Plain language only: short sentences, no jargon, no Given/When/Then — those live in the body sections for the executor. An umbrella overview gains no at-a-glance section; its roster already serves that role.
+
+   Then **`## Requirements`** — one testable behavior each; `pwk-writing-plans` derives acceptance criteria and tests from these. Then: problem, approaches considered, architecture, components, data flow, error handling, testing.
 
    Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` — `pwk-writing-plans` carries it into the plan and `pwk-code-review` audits it per requirement.
 
@@ -73,7 +75,7 @@ The whole umbrella is one branch and one PR: `pwk-writing-plans` creates the bra
 
    Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."
 
-   **Splitting large issues:** if the requirement needs more than one design doc, propose an umbrella split (one `<topic>` per part) and get human approval first — see [Umbrella](#umbrella). On approval, write the status-free `*-overview.md` and the **first part's** `-design.md`, then hand off to `/skill:pwk-writing-plans`. Later parts are brainstormed one by one (each re-reading the overview) — do not write every part's design doc up front.
+   **Splitting large issues:** if the requirement needs more than one design doc, propose an umbrella split (one `<topic>` per part) and get human approval first — see [Umbrella](#umbrella). On approval, write the status-free overview (`docs/plans/<date>-<umbrella>/overview.md`) and the **first part's** `-design.md` beside it, then hand off to `/skill:pwk-writing-plans`. Later parts are brainstormed one by one (each re-reading the overview) — do not write every part's design doc up front.
 
 The session stays read-only and uncommitted through brainstorm and plan: branch creation happens at the end of `/skill:pwk-writing-plans`; plan docs are committed at the start of `pwk-executing-tasks`.
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index b453c0e..8644b8c 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -7,19 +7,19 @@ description: "Implement a plan via the feature-gate flow: write the feature-acce
 
 Implement the plan from `docs/plans/*-implementation.md` via the **feature-gate flow**. The plan is a behavioral spec (acceptance criteria + integration tests) — you choose structure, signatures, internals; the criteria define *what*, you decide *how*.
 
-The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run one feature-level review over the whole diff. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the plan tags (default off); the feature gate covers everything else.
+The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the plan tags (default off); the feature gate covers everything else.
 
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the plan** — glob `docs/plans/*-implementation.md`; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
+2. **Find the plan** — glob `docs/plans/**/*-implementation.md` (recursive — umbrella parts live in `docs/plans/<date>-<umbrella>/` folders); if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
 3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.
 
 ## First run
 
 1. **Parse the plan** — read every `## Requirement N:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first.
 2. **Setup pre-flight** *(only if the plan has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
-3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches):
+3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
 
    ```markdown
    # Progress: <topic>
@@ -34,13 +34,18 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
    | # | Done | Requirement | Per-req ceremony | Commit |
    |---|------|-------------|-----------------|--------|
    | 1 | ⬜ | <requirement name> | — | — |
+
+   ## Execution summary
+   | R# | Requirement | How it was built | Deviated? |
+   |----|-------------|------------------|-----------|
+   | 1 | <requirement name> | | |
    ```
 
-   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `feature-complete-paused`, `reviewing`, `done`.
+   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.
 
 4. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
 5. **Write the feature-acceptance E2E test (red).** Read the plan's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
-6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.
+6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.
 
 ## Resume
 
@@ -48,13 +53,16 @@ Read the progress file's `Feature phase`:
 - `e2e-written` → write the E2E if not yet present, then present the **feature-spec** checkpoint.
 - `feature-spec-paused` → re-present the feature-spec checkpoint and wait.
 - `implementing (k/N)` → continue the next not-yet-✅ requirement.
-- `feature-complete-paused` → re-present the feature-complete checkpoint and wait.
-- `reviewing` → continue/finish the feature review.
+- `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
+- `ship-paused` → re-present the ship checkpoint and wait.
+- legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.
 
 ## Progress file
 
 Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.
 
+**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the plan, fill the Deviated? column when the departure happens, with a one-line why — it is a log, not a stop.
+
 ## Implement phase (after feature-spec is approved)
 
 Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
@@ -62,9 +70,9 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
 2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-writing-plans` and `docs/lessons.md`.)
 3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = after tests only). With the default `none`, show the red→green inline and proceed.
-4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at `feature-complete` — never expect it green per-commit.
+4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
-6. **Commit** the requirement with a clear message; mark its row ✅; advance `Feature phase: implementing (k/N)`.
+6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
 
 ### Per-requirement review (opt-in)
 
@@ -79,24 +87,34 @@ When a per-requirement checkpoint fires it is a **hard stop**:
 - **Never** `git add` or `git commit` before approval at a checkpoint.
 - Set the progress phase/status **before** pausing.
 
-## Feature-complete checkpoint
+## Ship checkpoint (feature-complete + review, merged)
 
 When every requirement's Done column is ✅:
 
 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
 2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the plan declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
-3. **Set `Feature phase: feature-complete-paused`** and **⏸ CHECKPOINT: feature-complete** — present the green full suite + green feature E2E + the whole diff (`git diff <merge-base>...HEAD`), and wait for approval.
+3. **Run the feature review** (below) per the plan's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
+4. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
+   - a green-gates line: full suite green, feature E2E green;
+   - the **execution summary** — what each requirement became, deviations included;
+   - the **coverage table** from the spec-reviewer report (one verdict row per R#);
+   - findings status: fixed / open for the human;
+   - "full diff on request" — the raw diff is one command away; show a hunk only where a verdict or finding makes the human ask.
+
+   Wait for approval. **request changes** → fix, re-run the gates (and the review if the change is substantive), re-present.
+
+A reviewer report without a per-requirement coverage table is invalid — retry the role or complete it inline before pausing; the ship checkpoint is never presented without coverage.
 
-The old "integration gate" is gone — the feature E2E at `feature-complete` *is* the gate; there is no separate end pass.
+The old "integration gate" is gone — the feature E2E at the ship checkpoint *is* the gate; there is no separate end pass.
 
 ## Feature review
 
-After `feature-complete` is approved, run **one** review over the **whole feature diff**, driven by the plan's feature-level `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
+This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the plan's feature-level `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
 
 **Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
 
 ```bash
-PACKET="docs/plans/<dated-stem>-review-packet.md"   # same dated stem as the plan docs
+PACKET="<plan doc's directory>/<plan doc's stem>-review-packet.md"   # beside the plan doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
 {
   echo "# Review packet: <topic> — feature review"
   echo
@@ -107,13 +125,13 @@ PACKET="docs/plans/<dated-stem>-review-packet.md"   # same dated stem as the pla
   git diff --stat <merge-base>...HEAD
   echo
   echo "## Acceptance criteria (verbatim from the plan)"
-  sed -n '/^## Requirement 1/,/^## Feature acceptance/p' docs/plans/<dated-stem>-implementation.md | sed '/^## Feature acceptance/,$d'
+  sed -n '/^## Requirement 1/,/^## Feature acceptance/p' <plan-doc path> | sed '/^## Feature acceptance/,$d'
   echo
   echo "## Feature acceptance (verbatim)"
-  sed -n '/^## Feature acceptance/,/^### Feature review/p' docs/plans/<dated-stem>-implementation.md | sed '/^### Feature review/,$d'
+  sed -n '/^## Feature acceptance/,/^### Feature review/p' <plan-doc path> | sed '/^### Feature review/,$d'
   echo
   echo "## Production-risk notes (verbatim, if any)"
-  sed -n '/^### Production-risk notes/,/^## /p' docs/plans/<dated-stem>-implementation.md | sed '/^## /d'
+  sed -n '/^### Production-risk notes/,/^## /p' <plan-doc path> | sed '/^## /d'
   echo
   echo "## Diff"
   git diff <merge-base>...HEAD
@@ -125,7 +143,7 @@ PACKET="docs/plans/<dated-stem>-review-packet.md"   # same dated stem as the pla
 - **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
 - **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
 
-On success, set `Feature phase: done`.
+On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`.
 
 ## Tags reference
 
@@ -150,10 +168,10 @@ Verify the criticism against the code, evaluate the suggestion, then implement (
 
 ## After the feature review
 
-The feature is implemented and reviewed. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate):
+The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate):
 
-- **Standalone design doc** (no `docs/plans/*-overview.md`) → suggest `/skill:pwk-finalizing`.
-- **Umbrella part** (an `*-overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).
+- **Standalone design doc** (no `docs/plans/**/overview.md` exists) → suggest `/skill:pwk-finalizing`.
+- **Umbrella part** (a `docs/plans/**/overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).
 
 Present:
 
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 24851c9..25b7959 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -10,26 +10,27 @@ Ship the completed work.
 ## Pre-finalization checks
 
 1. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
-2. Read **every** relevant progress file — for an umbrella that's each part's `docs/plans/*-progress.md`; for a standalone design doc, the one:
+2. Read **every** relevant progress file — for an umbrella that's each part's `docs/plans/**/*-progress.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders); for a standalone design doc, the one:
    - **Any `❌ failed`** (in any part) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
    - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
+   - **`Feature phase` must be `done`** in every progress file — any other value (`e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, or a legacy `feature-complete-paused` from before the ship gate) means the feature is still in flight: the ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
 
 ## Process
 
 1. **Derive the topic set** —
-   - **Umbrella** (a `docs/plans/*-overview.md` exists): read its roster; the set is every part's `<topic>`. The overview is disposed too.
+   - **Umbrella** (a `docs/plans/**/overview.md` exists): read its roster; the set is every part's `<topic>`. The umbrella folder is disposed too.
    - **Standalone**: progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. One topic.
 
    Ambiguous with several designs in flight? Ask.
-2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md`, `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, also dispose the `-overview.md`. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
+2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md`, `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Crosswalk`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
 
    - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:
 
      ```bash
      # for each <topic> in the set:
      rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md docs/plans/????-??-??-<topic>-review-packet*.md
-     # umbrella only:
-     rm -f docs/plans/????-??-??-<umbrella>-overview.md
+     # umbrella only — the whole folder goes as one unit (overview + every part):
+     rm -rf docs/plans/<date>-<umbrella>/
      git add -A docs/plans/ && git commit -m "chore: delete planning docs for <topic-or-umbrella>"
      ```
 
@@ -42,8 +43,8 @@ Ship the completed work.
      mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true
      mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true
      mv docs/plans/????-??-??-<topic>-review-packet*.md   docs/plans/completed/ 2>/dev/null || true
-     # umbrella only:
-     mv docs/plans/????-??-??-<umbrella>-overview.md     docs/plans/completed/ 2>/dev/null || true
+     # umbrella only — the whole folder goes as one unit (overview + every part):
+     mv docs/plans/<date>-<umbrella>/ docs/plans/completed/ 2>/dev/null || true
      git add docs/plans/ && git commit -m "chore: archive planning docs for <topic-or-umbrella>"
      ```
 
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index d67212d..d7a7290 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -9,9 +9,9 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 
 ## Process
 
-1. Glob `docs/plans/*-overview.md`, `*-design.md`, `*-implementation.md`, `*-progress.md` — this working tree only.
+1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md`, `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders) — this working tree only.
 2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
-3. **Group by umbrella** — for each `*-overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its docs — overview included — are disposed, so it no longer appears here. Topics not part of an overview print flat.
+3. **Group by umbrella** — for each umbrella `overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
 4. Print a compact table, grouped under any umbrellas, e.g.:
 
    ```
diff --git a/skills/pwk-writing-plans/SKILL.md b/skills/pwk-writing-plans/SKILL.md
index 1779d36..0224820 100644
--- a/skills/pwk-writing-plans/SKILL.md
+++ b/skills/pwk-writing-plans/SKILL.md
@@ -15,10 +15,11 @@ Your writes go into `docs/plans/` and nowhere else. Source code and configuratio
 
 ## Process
 
-1. **Find the design doc** — glob `docs/plans/*-design.md`. If none, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. **Read `docs/lessons.md`** if it exists — known patterns belong in the acceptance criteria. **Umbrella part?** If `docs/plans/*-overview.md` exists and this design is one of its roster parts, read the overview for the umbrella goal + roster — plan this part as one slice, composing with what earlier parts already established in the code. Note the umbrella in the plan's Overview so the executor inherits the context.
+1. **Find the design doc** — glob `docs/plans/**/*-design.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders). If none, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. **Read `docs/lessons.md`** if it exists — known patterns belong in the acceptance criteria. **Umbrella part?** If a `docs/plans/**/overview.md` exists and this design is one of its roster parts, read the overview for the umbrella goal + roster — plan this part as one slice, composing with what earlier parts already established in the code. Note the umbrella in the plan's Overview so the executor inherits the context.
 2. **Create or reuse the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. Otherwise `git checkout -b <topic>` — the umbrella's `<topic>` if this is part of an overview, else the design doc's `<topic>` (branch creation is allowed in the plan phase). Design + plan docs live on this branch, committed at the start of `pwk-executing-tasks`.
 3. **Read the `## Requirements` list** — the plan covers **all** of them. If the design has none, derive requirements from its described behaviors and confirm with the human before proceeding.
 4. **Write the plan** — for each requirement:
+   - **Crosswalk** — immediately after `## Overview`, emit `## Crosswalk`: a table `| R# | Plan section | Tests |` with one row per design requirement (R# = the design's numbering from its at-a-glance `## Requirements` list; Tests = that requirement's test names from the plan). Placement is load-bearing: the crosswalk sits strictly before `## Requirement 1` (between `## Overview` and `## Setup`, if present) so the review-packet sed spans (`## Requirement 1` → `## Feature acceptance` → `### Feature review`) stay untouched.
    - **Acceptance criteria** — `Given/When/Then` behavioral statements defining "done". Write observable behaviors, not implementation steps; cover edge and error cases.
    - **Integration tests** — test name + what each asserts. This is the spec the executor writes tests from.
    - **Meaningful tests** — write acceptance criteria and tests as observable behavior: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
@@ -31,14 +32,20 @@ Your writes go into `docs/plans/` and nowhere else. Source code and configuratio
    - **Challenge the design first** *(if production-risk areas exist)* — stress-test the design against the flagged risks before writing criteria. If a risk invalidates a design choice, stop and return to `/skill:pwk-brainstorming` rather than planning around a flawed design.
    - **Ordering** — dependencies come **earlier** in the list; the executor runs in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
 
-   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md`:
+   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md` (an umbrella part saves into its umbrella folder as `<part>-implementation.md`):
 
    ```markdown
    # Implementation Plan: <topic>
 
    ## Overview
    Design: docs/plans/YYYY-MM-DD-<topic>-design.md
-   Umbrella: docs/plans/YYYY-MM-DD-<umbrella>-overview.md   *(umbrella part only — else omit)*
+   Umbrella: docs/plans/<date>-<umbrella>/overview.md   *(umbrella part only — else omit)*
+
+   ## Crosswalk
+
+   | R# | Plan section | Tests |
+   |----|--------------|-------|
+   | 1 | Requirement 1: <name> | `<test name> …` |
 
    ## Requirement 1: <name>
 
@@ -72,13 +79,14 @@ Your writes go into `docs/plans/` and nowhere else. Source code and configuratio
 
 5. **Audit before presenting:**
    - Every requirement has criteria **and** matching tests, a checkpoint tag, a review tag.
+   - The `## Crosswalk` covers every design requirement R# exactly once — none dropped, none duplicated.
    - No `spec` + `skip` combination.
    - A `## Feature acceptance` section exists as the primary enforced spec (or the trivial-fold note).
    - A feature-level `### Feature review` tag is present.
    - Per-requirement tags default to `none` / `skip`; only requirements with complex logic, the main part of the feature, or production-risk are flagged heavier.
    - Production-risk areas from the design are reflected.
 6. **Workspace isolation** — you're on the `<topic>` branch. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
-7. **Present the plan** and wait for approval. On approval, hand off: "Ready to execute? Run `/skill:pwk-executing-tasks`" (running it is what exits the gated plan phase).
+7. **Present the plan** — the human reads a **one-line confirmation**, not the full plan: `Plan covers R1–R<N>; tags: <non-default tags>` plus the feature-acceptance test name. The full plan is available on request. Wait for approval. On approval, hand off: "Ready to execute? Run `/skill:pwk-executing-tasks`" (running it is what exits the gated plan phase).
 
 ## What belongs in the plan — and what stays out
 
diff --git a/tests/docs-consistency.test.ts b/tests/docs-consistency.test.ts
index 4d27d74..36c8cc1 100644
--- a/tests/docs-consistency.test.ts
+++ b/tests/docs-consistency.test.ts
@@ -5,6 +5,21 @@ function read(rel: string): string {
   return readFileSync(rel, "utf8");
 }
 
+describe("docs consistency: human review digests", () => {
+  it("mirrors the at-a-glance design opening across user docs", () => {
+    for (const rel of [
+      "docs/workflow-phases.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "README.md",
+    ]) {
+      const doc = read(rel);
+      expect(doc, rel).toMatch(/## At a glance/);
+      expect(doc, rel).toMatch(/\| R# \|/);
+    }
+  });
+});
+
 describe("docs consistency: review packet and resource hints", () => {
   it("fixes oversight-model scope wording to the packet model", () => {
     const oversight = read("docs/oversight-model.md");
@@ -20,6 +35,43 @@ describe("docs consistency: review packet and resource hints", () => {
     }
   });
 
+  it("describes the ship gate consistently across user docs", () => {
+    for (const rel of [
+      "docs/workflow-phases.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "README.md",
+    ]) {
+      const doc = read(rel);
+      expect(doc, rel).toMatch(/ship checkpoint|ship gate/i);
+      expect(doc, rel).toMatch(/diff on request/i);
+      expect(doc, rel).not.toMatch(/you review the whole diff/i);
+    }
+  });
+
+  it("sweeps user docs for the digest flow with no stale defaults", () => {
+    const rels = [
+      "docs/workflow-phases.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "README.md",
+      "AGENTS.md",
+    ];
+    for (const rel of rels) {
+      const doc = read(rel);
+      expect(doc, rel).not.toMatch(/review the whole diff/i);
+      expect(doc, rel).not.toMatch(/read the (?:full|whole) plan/i);
+    }
+    expect(read("AGENTS.md")).toMatch(/docs\/plans\/<date>-<umbrella>\//);
+  });
+
+  it("keeps the umbrella folder layout consistent in workflow-phases", () => {
+    const doc = read("docs/workflow-phases.md");
+    expect(doc).toContain("docs/plans/<date>-<umbrella>/");
+    expect(doc).not.toMatch(/YYYY-MM-DD-<umbrella>-overview\.md/);
+    expect(doc).not.toMatch(/\*-overview\.md/);
+  });
+
   it("disposes review packets in both finalize disposal paths", () => {
     const finalize = read("skills/pwk-finalizing/SKILL.md");
     const occurrences = finalize.match(/\?\?\?\?-\?\?-\?\?-<topic>-review-packet\*.md/g) ?? [];
diff --git a/tests/helpers.ts b/tests/helpers.ts
index b6ee13e..457a627 100644
--- a/tests/helpers.ts
+++ b/tests/helpers.ts
@@ -1,9 +1,18 @@
+import { readFileSync } from "node:fs";
 import workflowGuard, { ROLE_NAMES } from "../extensions/workflow-guard";
 
 export { ROLE_NAMES };
 
 export type PiHandler = (event: any, ctx: any) => unknown;
 
+/** Read an agent role file, split into frontmatter and body. */
+export function readRole(name: string): { frontmatter: string; body: string } {
+  const content = readFileSync(`agents/${name}.md`, "utf8");
+  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
+  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
+  return { frontmatter: match[1], body: match[2] };
+}
+
 /** Minimal ExtensionAPI harness: one handler per event + registered commands. */
 export function createExtensionHarness() {
   const handlers = new Map<string, PiHandler>();
diff --git a/tests/human-review-digests.test.ts b/tests/human-review-digests.test.ts
new file mode 100644
index 0000000..1cbd2f8
--- /dev/null
+++ b/tests/human-review-digests.test.ts
@@ -0,0 +1,117 @@
+import { readFileSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { readRole } from "./helpers";
+import { DIGEST_MARKERS } from "./markers.mjs";
+
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+
+const REVIEW_ROLES = [
+  "pwk-spec-reviewer",
+  "pwk-tracing-reviewer",
+  "pwk-smell-reviewer",
+  "pwk-hazard-reviewer",
+] as const;
+
+const USER_DOCS = [
+  "docs/workflow-phases.md",
+  "docs/developer-usage-guide.md",
+  "docs/oversight-model.md",
+  "README.md",
+] as const;
+
+const GLOB_SITES = [
+  "skills/pwk-brainstorming/SKILL.md",
+  "skills/pwk-writing-plans/SKILL.md",
+  "skills/pwk-executing-tasks/SKILL.md",
+  "skills/pwk-status/SKILL.md",
+  "skills/pwk-finalizing/SKILL.md",
+] as const;
+
+function readRepo(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+describe("human review digests feature (E2E)", () => {
+  it("should thread R# digests from design to coverage table", () => {
+    // R1 — design docs open with an at-a-glance digest: plain summary + one row per
+    // requirement; the trivial fast-path gets a single In-short line instead.
+    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
+    expect(brainstorming).toMatch(new RegExp(DIGEST_MARKERS.atAGlance));
+    expect(brainstorming).toMatch(/immediately before [`]## Requirements[`]/);
+    expect(brainstorming).toContain(DIGEST_MARKERS.atAGlanceTable);
+    expect(brainstorming).toContain("In short:");
+    expect(brainstorming).toMatch(/plain language/i);
+
+    // R2 — plans carry a crosswalk the human confirms in one line, placed strictly
+    // before Requirement 1 so the review-packet sed spans are untouched.
+    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
+    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalk);
+    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkTable);
+    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkPlacement);
+    expect(writingPlans).toContain(DIGEST_MARKERS.oneLineConfirmation);
+
+    // R3 — the progress file carries an execution summary filled as requirements
+    // land, and the ship checkpoint presents digest + coverage, diff on request.
+    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
+    expect(executing).toContain(DIGEST_MARKERS.execSummary);
+    expect(executing).toContain(DIGEST_MARKERS.execSummaryTable);
+    expect(executing).toContain(DIGEST_MARKERS.fillAsYouLand);
+    expect(executing).toContain(DIGEST_MARKERS.shipPaused);
+    expect(executing).toContain(DIGEST_MARKERS.diffOnRequest);
+    const enumLine = executing.match(/`Feature phase` is one of:[^\n]*/)?.[0];
+    if (!enumLine) throw new Error("executing skill: `Feature phase` enum line not found");
+    expect(enumLine).toContain(DIGEST_MARKERS.shipPaused);
+    expect(enumLine).not.toContain("feature-complete-paused");
+
+    // R4 — the spec-reviewer report opens with a per-requirement coverage table,
+    // keyed by the packet's requirement headings, while the four reviewers keep a
+    // byte-identical shared conduct block (same strict check as role-contracts).
+    const specReviewer = readRole("pwk-spec-reviewer").body;
+    expect(specReviewer).toContain(DIGEST_MARKERS.coverageTable);
+    expect(specReviewer).toContain(DIGEST_MARKERS.coverageVerdicts);
+    expect(specReviewer).toMatch(/## Requirement N/);
+    expect(specReviewer).toMatch(/No findings/);
+    const HEADING = "## Your checklist";
+    const blocks = REVIEW_ROLES.map((name) => {
+      const body = readRole(name).body;
+      const end = body.indexOf(HEADING);
+      expect(end, name).toBeGreaterThan(0);
+      return body.slice(0, end + HEADING.length);
+    });
+    expect(blocks[0]).toBe(blocks[1]);
+    expect(blocks[0]).toBe(blocks[2]);
+    expect(blocks[0]).toBe(blocks[3]);
+    for (const [i, name] of REVIEW_ROLES.entries()) {
+      expect(readRole(name).body.length, name).toBeGreaterThan(blocks[i].length);
+    }
+
+    // R5 — every discovery site resolves docs one level down (umbrella folders).
+    for (const site of GLOB_SITES) {
+      expect(readRepo(site), site).toContain(DIGEST_MARKERS.recursiveGlob);
+    }
+  });
+
+  it("should gate shipping on done and keep the docs consistent", () => {
+    // R6 — finalizing ships only Feature phase `done`; digest sections ride the
+    // existing disposal globs and umbrella folders dispose as one unit.
+    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
+    expect(finalize).toMatch(/Feature phase/);
+    expect(finalize).toContain(DIGEST_MARKERS.mustBeDone);
+    expect(finalize).toMatch(/feature-complete-paused/);
+    expect(finalize).toContain(DIGEST_MARKERS.umbrellaFolder);
+
+    // The user-facing docs describe the new flow and none of them defaults the
+    // human to reading the full plan or the whole diff.
+    for (const doc of USER_DOCS) {
+      expect(readRepo(doc), doc).toMatch(/At a glance/i);
+      expect(readRepo(doc), doc).toMatch(/ship gate|ship checkpoint/i);
+    }
+    const readme = readRepo("README.md");
+    expect(readme).toContain(DIGEST_MARKERS.diffOnRequest);
+    expect(readme).toContain(DIGEST_MARKERS.crosswalk);
+    const agents = readRepo("AGENTS.md");
+    expect(agents).toContain(DIGEST_MARKERS.umbrellaFolder);
+  });
+});
diff --git a/tests/markers.mjs b/tests/markers.mjs
new file mode 100644
index 0000000..d2f7283
--- /dev/null
+++ b/tests/markers.mjs
@@ -0,0 +1,29 @@
+/**
+ * Shared marker literals for the human-review-digests contracts.
+ *
+ * One canonical string per contract, asserted by skill-lint (Check 11) and the
+ * vitest suites (E2E + per-slice) — rewording a skill must not require hunting
+ * literals across four files. Plain .mjs so both the node linter and vitest
+ * (TS) can import it without a build step.
+ */
+export const DIGEST_MARKERS = {
+  atAGlance: "## At a glance",
+  atAGlanceTable: "| R# | Requirement in one line | Risk |",
+  crosswalk: "## Crosswalk",
+  crosswalkTable: "| R# | Plan section | Tests |",
+  crosswalkPlacement: "strictly before `## Requirement 1`",
+  oneLineConfirmation: "one-line confirmation",
+  execSummary: "## Execution summary",
+  execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
+  fillAsYouLand: "same step as marking",
+  deviationAtDeviation: "when the departure happens",
+  shipPaused: "ship-paused",
+  shipCheckpoint: "ship checkpoint",
+  diffOnRequest: "diff on request",
+  coverageTable: "| R# | Verdict | Evidence |",
+  coverageVerdicts: "covered | gap | scope-creep",
+  recursiveGlob: "docs/plans/**/",
+  umbrellaFolder: "docs/plans/<date>-<umbrella>/",
+  mustBeDone: "must be `done`",
+  legacyPaused: "legacy `feature-complete-paused`",
+};
diff --git a/tests/review-packet.test.ts b/tests/review-packet.test.ts
index bdf5a93..2e13575 100644
--- a/tests/review-packet.test.ts
+++ b/tests/review-packet.test.ts
@@ -19,6 +19,13 @@ const PLAN_FIXTURE = [
   "## Overview",
   "Design: docs/plans/demo-design.md",
   "",
+  "## Crosswalk",
+  "",
+  "| R# | Plan section | Tests |",
+  "|----|--------------|-------|",
+  "| 1 | Requirement 1: alpha | should-a |",
+  "| 2 | Requirement 2: beta | should-b |",
+  "",
   "## Setup",
   "",
   "n/a",
@@ -102,6 +109,26 @@ describe("review packet recipe", () => {
     expect(featureAcceptance).not.toContain("Feature review: parallel");
   });
 
+  it("should keep packet spans intact with a crosswalk present", () => {
+    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-xw-"));
+    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);
+
+    // The three sed commands are byte-identical to the pre-crosswalk recipe (see above);
+    // the crosswalk sits before `## Requirement 1`, so no span may reach it.
+    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
+      cwd: dir,
+    }).toString();
+    expect(criteria).toContain("## Requirement 1: alpha");
+    expect(criteria).not.toContain("## Crosswalk");
+    expect(criteria).not.toContain("| 1 | Requirement 1: alpha | should-a |");
+    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
+    expect(notes).not.toContain("Crosswalk");
+    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
+      cwd: dir,
+    }).toString();
+    expect(featureAcceptance).not.toContain("Crosswalk");
+  });
+
   it("should scope per-requirement reviews to the requirement", () => {
     const executing = readExecuting();
     expect(executing).toMatch(
diff --git a/tests/role-contracts.test.ts b/tests/role-contracts.test.ts
index f1a2c1a..3a17c19 100644
--- a/tests/role-contracts.test.ts
+++ b/tests/role-contracts.test.ts
@@ -1,16 +1,8 @@
-import { readFileSync } from "node:fs";
 import { describe, expect, it } from "vitest";
-import { ROLE_NAMES } from "./helpers";
+import { ROLE_NAMES, readRole } from "./helpers";
 
 const roleNames = [...ROLE_NAMES];
 
-function readRole(name: string): { frontmatter: string; body: string } {
-  const content = readFileSync(`agents/${name}.md`, "utf8");
-  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
-  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
-  return { frontmatter: match[1], body: match[2] };
-}
-
 describe("packet discipline", () => {
   const REVIEWERS = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];
 
@@ -53,6 +45,22 @@ describe("shared conduct block", () => {
   });
 });
 
+describe("spec-reviewer coverage table", () => {
+  it("should mandate a per-requirement coverage table in the spec-reviewer checklist", () => {
+    const { body } = readRole("pwk-spec-reviewer");
+    const checklist = body.slice(body.indexOf("## Your checklist"));
+    expect(checklist).toMatch(/\| R# \| Verdict \| Evidence \|/);
+    expect(checklist).toMatch(/covered \| gap \| scope-creep/);
+    expect(checklist).toMatch(/## Requirement N/);
+    expect(checklist).toMatch(/No findings/);
+    // The coverage mandate is role-specific: the other three checklists stay untouched.
+    for (const name of ["pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"]) {
+      const other = readRole(name).body.slice(readRole(name).body.indexOf("## Your checklist"));
+      expect(other, name).not.toMatch(/\| R# \| Verdict \| Evidence \|/);
+    }
+  });
+});
+
 describe("role resource hints", () => {
   it("should ship max_turns 40 on judgment roles", () => {
     for (const name of ["pwk-spec-reviewer", "pwk-tracing-reviewer"]) {
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 4da2a62..12d109a 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -10,6 +10,7 @@
 import { readdirSync, readFileSync, statSync } from "node:fs";
 import { dirname, join, resolve } from "node:path";
 import { fileURLToPath } from "node:url";
+import { DIGEST_MARKERS } from "./markers.mjs";
 
 const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
 const skillsDir = join(root, "skills");
@@ -287,7 +288,8 @@ if (wp) {
 // Requirement 2 — pwk-executing-tasks feature-gate flow
 if (et) {
   fgMark("pwk-executing-tasks", et.content, "feature-spec", "feature-spec checkpoint");
-  fgMark("pwk-executing-tasks", et.content, "feature-complete", "feature-complete checkpoint");
+  fgMark("pwk-executing-tasks", et.content, "ship checkpoint", "ship checkpoint (review before final approval)");
+  fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
   fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
 }
 // Requirement 3 — meaningful-test rules mirrored across writing-plans, executing-tasks, lessons
@@ -435,6 +437,94 @@ if (et) {
   }
 }
 
+// --- Check 11: human-review-digests (grown per-requirement) ---
+// R1 — design docs open with an at-a-glance digest for the human: a plain-language
+// summary + a one-line-per-requirement R# table; trivial docs get a single In-short line.
+console.log("human-review-digests:");
+if (bs) {
+  fgMark("pwk-brainstorming", bs.content, DIGEST_MARKERS.atAGlance, "at-a-glance digest mandated");
+  fgMark(
+    "pwk-brainstorming",
+    bs.content,
+    "immediately before `## Requirements`",
+    "at-a-glance sits before Requirements",
+  );
+  fgMark("pwk-brainstorming", bs.content, DIGEST_MARKERS.atAGlanceTable, "R# one-line table");
+  fgMark("pwk-brainstorming", bs.content, "R# = the requirement", "R# numbering linkage");
+  fgMark("pwk-brainstorming", bs.content, "In short:", "trivial fast-path In-short line");
+  if (/plain language/i.test(bs.content)) ok("pwk-brainstorming: at-a-glance plain-language rule");
+  else fail("pwk-brainstorming: at-a-glance must mandate plain language");
+}
+// R2 — plans carry a crosswalk (one row per design R#) placed strictly before
+// `## Requirement 1` so the packet sed spans stay intact; the human confirms in one line.
+if (wp) {
+  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalk, "crosswalk section mandated");
+  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkTable, "crosswalk table shape");
+  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkPlacement, "crosswalk placement outside sed spans");
+  fgMark("pwk-writing-plans", wp.content, "exactly once", "crosswalk audit: every R# exactly once");
+  fgMark(
+    "pwk-writing-plans",
+    wp.content,
+    DIGEST_MARKERS.oneLineConfirmation,
+    "plan presented as one-line confirmation",
+  );
+}
+// R3 — the progress file carries an execution summary filled as requirements land; the
+// ship checkpoint merges feature-complete + review: review runs before the one final
+// approval, presenting digest + coverage table, diff on request.
+if (et) {
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.execSummary, "execution summary section");
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.execSummaryTable, "execution summary table shape");
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.fillAsYouLand, "fill-as-you-land rule");
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.deviationAtDeviation, "deviation logged at deviation time");
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.shipPaused, "ship-paused phase");
+  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.diffOnRequest, "ship presentation: diff on request");
+  const enumLine = et.content.match(/`Feature phase` is one of:[^\n]*/)?.[0] ?? "";
+  if (enumLine.includes(DIGEST_MARKERS.shipPaused) && !enumLine.includes("feature-complete-paused")) {
+    ok("pwk-executing-tasks: phase enum uses ship-paused (legacy feature-complete-paused gone)");
+  } else {
+    fail("pwk-executing-tasks: phase enum must use ship-paused, not feature-complete-paused");
+  }
+}
+// R5 — umbrella docs live in their own docs/plans/<date>-<umbrella>/ folder; every
+// discovery site globs recursively; finalize disposes the folder as one unit.
+const GLOB_SITES = [bs, wp, et, status, fin].filter(Boolean);
+for (const s of GLOB_SITES) {
+  fgMark(s.name, s.content, DIGEST_MARKERS.recursiveGlob, "recursive discovery globs");
+}
+if (et) {
+  fgMark(
+    "pwk-executing-tasks",
+    et.content,
+    "docs/plans/**/overview.md",
+    "post-review umbrella routing uses the recursive overview glob",
+  );
+  fgMark(
+    "pwk-executing-tasks",
+    et.content,
+    "set `Feature phase: reviewing` first",
+    "review phase is set before the review runs (mid-review resume routes in)",
+  );
+}
+if (wp) {
+  fgMark(
+    "pwk-writing-plans",
+    wp.content,
+    "docs/plans/<date>-<umbrella>/overview.md",
+    "plan template umbrella path is folder-based",
+  );
+}
+if (fin) {
+  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.umbrellaFolder, "umbrella folder disposal as one unit");
+}
+// R6 — finalizing ships only Feature phase `done`; every other state (including the
+// legacy feature-complete-paused) bounces back to executing-tasks.
+if (fin) {
+  fgMark("pwk-finalizing", fin.content, "Feature phase", "finalizing reads Feature phase");
+  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.mustBeDone, "done is the only shippable phase");
+  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.legacyPaused, "legacy in-flight state named and gated");
+}
+
 // --- Summary ---
 console.log("");
 if (failures === 0) {
diff --git a/tests/workflow-guard.test.ts b/tests/workflow-guard.test.ts
index b7e3d1e..6a5e0f3 100644
--- a/tests/workflow-guard.test.ts
+++ b/tests/workflow-guard.test.ts
@@ -231,6 +231,9 @@ describe("shouldBlockFilePath", () => {
   it("allows writes under docs/plans/", () => {
     expect(shouldBlockFilePath("docs/plans/2026-04-21-feature-design.md", cwd)).toBe(false);
     expect(shouldBlockFilePath("docs/plans/sub/nested.md", cwd)).toBe(false);
+    // umbrella folders: dated dir under docs/plans/ with docs inside
+    expect(shouldBlockFilePath("docs/plans/2026-09-05-auth/overview.md", cwd)).toBe(false);
+    expect(shouldBlockFilePath("docs/plans/2026-09-05-auth/login-design.md", cwd)).toBe(false);
   });
 
   it("blocks writes outside docs/plans/", () => {
