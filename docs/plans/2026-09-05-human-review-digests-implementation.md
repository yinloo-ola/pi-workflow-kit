# Implementation Plan: human-review-digests

## Overview
Design: docs/plans/2026-09-05-human-review-digests-design.md

Add the human digest layer across the workflow: `## At a glance` atop design docs (R# table), `## Crosswalk` in plans outside the packet sed spans (one-line confirmation replaces full-plan reading), execution summary + merged ship checkpoint (review before the single final approval; diff on request), spec-reviewer coverage table, umbrella folders, and a finalize done-gate + docs consistency sweep. All changes are skill/agent/doc markdown + tests; no guard code change. `docs/adr/0003-ship-gate-review-before-approval.md` lands with Requirement 3.

Conventions (from `docs/lessons.md` — apply throughout):
- Test-first for skill/doc content: add the skill-lint / role-contracts / fixture assertion first (red), then edit the markdown (green).
- Wording assertions are behavior regexes, not exact sentences; one canonical marker per contract.
- Editing skill/agent markdown: anchor edit-tool oldText on apostrophe-free text (curly U+2019 lives in these files).
- Guard-state tests fire `session_start` in `beforeEach`.
- No new pipe-vocabulary on lines containing "Checkpoints"/"Review" in skills (skill-lint `vocabOf` rejects strays).
- Commit with explicit `--` paths; root files (README.md, CHANGELOG.md, AGENTS.md) added explicitly, never via dir-scoped adds.

## Crosswalk

| R# | Plan section | Tests |
|----|--------------|-------|
| R1 | Requirement 1: Design digest (`## At a glance`) | skill-lint at-a-glance markers + docs mirrors |
| R2 | Requirement 2: Plan crosswalk + one-line confirmation | review-packet fixture (crosswalk outside spans) + skill-lint placement markers |
| R3 | Requirement 3: Execution summary + merged ship gate | skill-lint execution-summary/`ship-paused` markers + docs mirrors + ADR 0003 |
| R4 | Requirement 4: Spec-reviewer coverage table | role-contracts assertions (incl. byte-identical conduct block unchanged) |
| R5 | Requirement 5: Umbrella folders | guard subfolder-writability test + skill-lint recursive-glob markers |
| R6 | Requirement 6: Finalize done-gate + docs consistency sweep | skill-lint finalizing done-gate markers + docs-consistency sweep |

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

## Feature acceptance
The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. New file `tests/human-review-digests.test.ts` (precedent: `tests/review-cost-optimization.test.ts`), with the guard and packet-fixture companions above:
- `should thread R# digests from design to coverage table` — Given the kit's skill/agent/doc files, When the five digest layers are checked, Then brainstorming mandates `## At a glance` with the R# table, writing-plans mandates `## Crosswalk` placed outside the packet sed spans, executing-tasks mandates the `## Execution summary` and the `ship-paused` checkpoint presenting summary + coverage table + diff-on-request, the spec-reviewer contract mandates the R# coverage table with a byte-identical shared conduct block, and umbrella discovery uses recursive globs — one R# scheme visible at every layer, so a missing row is visible anywhere.
- `should gate shipping on done and keep the docs consistent` — Given the kit's files after all six requirements land, When finalizing and the user docs are checked, Then the finalizing skill blocks any `Feature phase` other than `done`, disposes digest sections via the existing globs (umbrella folders whole), and none of the five user docs still defaults the human to reading the full plan or the whole diff.
### Feature review: parallel
One review over the whole feature diff (always). Default `parallel`; `inline` for small features.
