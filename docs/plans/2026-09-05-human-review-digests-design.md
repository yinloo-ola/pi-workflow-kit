# Design: human review digests — at-a-glance, crosswalk, execution summary, ship gate, umbrella folders

## At a glance

The human's review time is the scarce resource in the workflow. Today every assurance point hands the human a full artifact: the whole design doc to approve a design, the whole implementation plan to check nothing was dropped, the whole diff to approve the build. The LLM-facing depth is fine — the wrong part is being read by the human.

This change adds a thin **digest layer** to the artifacts the human already stops at, and keeps the LLM-facing docs LLM-only: a plain-language `## At a glance` atop design docs (with one-line restatements per requirement), a requirement crosswalk in plans (presented as a one-line confirmation, not a full-plan read), an **execution summary** accumulated in the progress file (what each requirement became, in plain words), and a merged **ship gate** where the feature review runs *before* the single final approval. Reviewer reports gain a per-requirement coverage table. Umbrellas move into their own folder.

After this, the human reads ~10 digest lines per stop and touches the full plan or raw diff only when a digest smells wrong.

| R# | Requirement in one line | Risk |
|----|------------------------|------|
| R1 | Design docs open with `## At a glance` — plain summary + one-line-per-requirement table with R# IDs | low |
| R2 | Plans gain a `## Crosswalk` (R# → section → tests) after `## Overview`; the human is shown a one-line confirmation, not the plan | low |
| R3 | Progress file gains an execution summary; feature-complete + feature review merge into one **ship checkpoint** presenting digest + coverage table, diff on request | medium — changes checkpoint semantics (ADR) |
| R4 | Spec-reviewer's report mandates a per-requirement coverage table (verdict + evidence) | low |
| R5 | Umbrella docs live in their own `docs/plans/<date>-<umbrella>/` folder, disposed as one unit | low |
| R6 | Finalize gates on `Feature phase: done`; digest sections ride existing disposal globs; all user docs swept for consistency | low |

## Requirements

1. **Design digest (`## At a glance`).** `skills/pwk-brainstorming/SKILL.md` mandates that every design doc opens with `## At a glance`, immediately before `## Requirements`: (a) a 2–4 sentence plain-language summary — what is wrong or needed, what will be built, the key approach in plain words; (b) a table `| R# | Requirement in one line | Risk |` with exactly one row per requirement, where R# is the requirement's number in the `## Requirements` list (single ID scheme, used unchanged by crosswalk, progress rows, packets, and coverage tables). The trivial fast-path doc gains a single `In short:` line instead. Plain-language rule: short sentences, no jargon, no Given/When/Then — those stay in the body sections for the executor. Mirrors updated in `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`; skill-lint gains marker assertions.

2. **Plan crosswalk + one-line confirmation.** `skills/pwk-writing-plans/SKILL.md` template gains a `## Crosswalk` section located **between `## Overview` and `## Setup`/`## Requirement 1`** — strictly before `## Requirement 1` so the review-packet sed spans (`## Requirement 1` → `## Feature acceptance` → `### Feature review`) are untouched. The crosswalk is a table `| R# | Plan section | Tests |` with exactly one row per design requirement. The audit step verifies every design R# appears exactly once. Plan presentation changes from "present the plan" to: present a **one-line confirmation** ("Plan covers R1–R5; tags: R3 parallel") plus the feature-acceptance test name; the full plan is available on request. Approval still gates execution.

3. **Execution summary + merged ship gate.** `skills/pwk-executing-tasks/SKILL.md`: the progress-file template gains an `## Execution summary` section — table `| R# | Requirement | How it was built | Deviated? |` — filled **as each requirement lands** (same step as marking ✅), not retrofitted. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names allowed sparingly; **no test names, no code**. "Deviated?" records any departure from the plan with a one-line why, logged when the deviation happens. The feature-complete checkpoint and the post-approval feature review are replaced by one **⏸ ship checkpoint**: after all requirements ✅, run full suite + feature E2E (green), run the feature review per the plan's tag, apply smell fixes and re-green, then pause and present: a green-gates line, the execution summary, the coverage table from the spec-reviewer report, findings status (fixed / open for the human), and "full diff on request". `Feature phase` enum becomes: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`; the resume map is updated accordingly. The feature-spec checkpoint stays, now led by 1–2 plain lines: "what this test proves". Mirrors updated in the four docs; README's "you review the whole diff" wording changes to the digest presentation.

4. **Spec-reviewer coverage table.** `agents/pwk-spec-reviewer.md`'s `## Your checklist` (role-specific section only — the four reviewers' shared byte-identical conduct block is untouched) mandates that the report opens with a coverage table: one row per requirement (keyed by the packet's `## Requirement N` headings / R#): `| R# | Verdict | Evidence |`, verdict ∈ `covered | gap | scope-creep`, evidence = file:line(s). Findings elaborate on non-`covered` rows. The all-covered case still ends with the explicit `No findings` line. The executor compiles this table into the ship-checkpoint presentation. Mirrors updated in `docs/developer-usage-guide.md`, `docs/workflow-phases.md`, `docs/oversight-model.md`; `docs/provider-delegation-contract.md` unchanged (report *content* is role-level, `DelegationResult` shape unaffected).

5. **Umbrella folders.** Umbrella docs move from flat files into `docs/plans/<date>-<umbrella>/`: `overview.md`, plus per part `<part>-design.md`, `<part>-implementation.md`, `<part>-progress.md`, and `*-review-packet.md` — the folder name carries the date+umbrella, part files carry only the part topic. Standalone topics stay flat. Skills' discovery globs become recursive (`docs/plans/**/*-design.md` etc.) in `pwk-brainstorming` (overview + part discovery), `pwk-writing-plans` (design/overview lookup), `pwk-executing-tasks` (plan lookup, packet path inside the folder), `pwk-status` (roll-up), and `pwk-finalizing` (dispose the umbrella folder as one unit — move to `docs/plans/completed/` or delete per the existing archive/delete choice; the flat-topic glob is unchanged). `AGENTS.md` archive wording updated. The guard's writable root (`docs/plans/`) already covers subfolders; a guard test proves subfolder paths pass `shouldBlockFilePath` during gated phases.
6. **Finalize + docs consistency.** `skills/pwk-finalizing/SKILL.md` gains a shippable-state pre-check: every progress file's `Feature phase` must be `done` — any other value (including legacy `feature-complete-paused`) blocks with a pointer back to `/skill:pwk-executing-tasks`, alongside the existing `❌ failed`/`⏭ skipped` checks. The new digest sections (at-a-glance, crosswalk, execution summary) require no new disposal rules — each rides the existing `????-??-??-<topic>-*` globs with its host doc; umbrella folders dispose whole per requirement 5. `pwk-status` needs no enum change (it reads the requirement table, not `Feature phase`) — only the recursive-glob change applies. The five user docs (`docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md`) are swept so the new flow is described consistently and no doc keeps "read the full plan" or "review the whole diff" as the default human action. `CHANGELOG.md` gains its entry at finalize per convention; historical entries are not edited.

## Problem

Three assurances the human still wants, with almost no time to spend: no requirement **misunderstood**, nothing **missed**, and the implementation's **direction** correct. Misunderstanding can enter at three points — design, design→plan translation, code — and each currently demands reading a full LLM-facing artifact at the moment it is cheapest to fix. The kit's documents serve the executor and reviewers well; they were never shaped for the human's 2-minute judgment pass. Meanwhile the feature-complete checkpoint presents the raw diff (README sells it as "you review the whole diff"), which is the most expensive possible review artifact, and the feature review runs *after* approval — findings arrive once the human has already blessed the work.

## Approaches considered

| Approach | Verdict | Reason |
|---|---|---|
| **Digest layer inside existing docs** (at-a-glance, crosswalk, execution summary) | **adopted** | one artifact per phase, no sync problem; detail stays where the executor needs it |
| Build map in the plan (files + order + approach) | rejected | human is fine skipping the implementation doc; direction assurance lives in the design digest (approach line) and the execution summary (how it was built) — the plan stays LLM-only, preserving "plan stable when details shift" |
| Separate digest/summary file per phase | rejected | another artifact to keep in sync and dispose; digests must live beside their detail |
| Keep two stops (approve, then review), digest both | rejected | approval stays blind; running the (now cheap, post-1.6.0) review *before* the pause gives one fully-informed stop |
| Human reads reviewer reports directly | rejected | findings-shaped prose, not assurance-shaped; the coverage table extracts the per-requirement verdict |
| Requirement IDs tracked in a side file | rejected | inline tables in existing docs; an ID scheme is only useful if it is in the docs the roles already read |
| Folders for all topics | rejected | asked-for scope is umbrellas; standalone flat files keep the common case unchanged |

## Architecture

One ID scheme (design `## Requirements` numbering → R#) threads through every digest: at-a-glance table → plan crosswalk → progress/execution-summary rows → packet's `## Requirement N` headings → spec-reviewer coverage table. A human can follow one requirement end-to-end across all digests by its R#, and any layer with a missing R# row is visibly incomplete.

```
design doc                plan                      progress file                ship checkpoint
┌────────────────┐   ┌───────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
│ ## At a glance │   │ ## Crosswalk      │   │ ## Execution summary│   │ green gates line     │
│  R# one-liners │──▶│  R# → section     │──▶│  R# → how built,    │──▶│ execution summary    │
│ ## Requirements│   │ ## Requirement N  │   │  deviations         │   │ coverage table (R#)  │
│  (numbered)    │   │  (criteria/tests) │   │ (filled as rows ✅) │   │ findings status      │
└────────────────┘   └───────────────────┘   └─────────────────────┘   │ diff on request      │
                        packet copies            review: spec-         └──────────────────────┘
                        Requirement N spans       reviewer emits
                        (crosswalk outside)       coverage table
```

Human reading per stop: design = at-a-glance (~10 lines); plan = one confirmation line; ship = summary + coverage table. Plain-language rule binds everything the human is asked to read.

## Components

- `skills/pwk-brainstorming/SKILL.md` — at-a-glance template + trivial `In short:` variant; umbrella folder creation (`docs/plans/<date>-<umbrella>/overview.md`).
- `skills/pwk-writing-plans/SKILL.md` — `## Crosswalk` template (placed after `## Overview`, before `## Setup`/`## Requirement 1`), audit step (every R# exactly once), one-line-confirmation presentation; recursive globs.
- `skills/pwk-executing-tasks/SKILL.md` — execution-summary template + fill-as-you-land rule + deviation logging; merged ship checkpoint (review before pause, smell fixes pre-pause); phase enum + resume map; plain-language checkpoint intros; recursive plan glob; packet path inside umbrella folder.
- `agents/pwk-spec-reviewer.md` — coverage-table mandate in the role checklist only.
- `skills/pwk-status/SKILL.md`, `skills/pwk-finalizing/SKILL.md` — recursive globs; whole-folder disposal for umbrellas.
- `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`, `README.md`, `AGENTS.md` — mirror updates (at-a-glance, confirmation, ship gate, coverage table, folders).
- `skills/pwk-finalizing/SKILL.md` — whole-folder disposal for umbrellas; `Feature phase: done` shippable-state pre-check.
- `tests/skill-lint.mjs` — new markers: at-a-glance, crosswalk placement, execution summary, `ship-paused`, coverage table, umbrella-folder globs, finalizing done-gate.
- `tests/review-packet.test.ts` — `PLAN_FIXTURE` gains a `## Crosswalk` before `## Requirement 1`; the three sed commands stay byte-identical, proving extraction is unaffected.
- `tests/role-contracts.test.ts` — spec-reviewer coverage-table assertion; shared-prefix assertion untouched.
- `tests/workflow-guard.test.ts` — subfolder-under-`docs/plans/` writable during gated phases.
- `docs/adr/0003-*.md` — ship-gate reorder: review runs before the final approval.

## Data flow

1. Brainstorm ends → design doc written with `## At a glance` + numbered requirements (R#s assigned).
2. Writing-plans → plan with `## Crosswalk` (one row per R#) → audit → human sees one confirmation line → approval.
3. Execute → per requirement: mark ✅ + write execution-summary row (how built, deviations) → all ✅ → suite + E2E green → feature review runs → smell fixes → **ship pause**: green gates + execution summary + coverage table + findings status.
4. Approve / request changes (fix loop, re-present) → `done`.
5. Umbrella: overview + all parts' docs accumulate in `docs/plans/<date>-<umbrella>/`; finalize disposes the folder whole.

## Error handling

- **Digest drift** (summary says X, code does Y): execution summary is written at land-time by the implementer, not reconstructed at the end; the spec-reviewer's coverage table independently verifies against the packet, so a drifted row contradicts the reviewer's verdict at the ship pause.
- **Reviewer report without a coverage table**: invalid report — same handling as an empty report (retry the role, else inline completion); coverage must exist before the ship pause is presented.
- **Crosswalk incomplete** (missing R# row): audit step fails the plan phase before presentation; fix and re-audit.
- **Deviation unrecorded**: the ship pause cross-checks execution-summary rows against the diff; a summary row whose content the diff contradicts is flagged for the human at the pause.
- **Resume on the new enum**: old progress files predate the enum change — resume treats `feature-complete-paused` as `reviewing` (the nearest new state: continue into the feature review, then ship pause).
- **Umbrella glob misses**: recursive globs match both flat and folder layouts everywhere discovery happens; flat-only patterns would strand folder docs — covered by skill-lint assertions on each discovery site.

## Testing

- Test-first per `docs/lessons.md`: add skill-lint/role-contract assertions red, then edit markdown green.
- Marker assertions as behavior regexes, not exact sentences; one canonical marker per contract; new vocabulary lines kept clear of the `vocabOf` "Checkpoints"/"Review" parser sweep.
- `tests/review-packet.test.ts` proves the crosswalk does not perturb the sed spans (fixture with crosswalk + unchanged commands).
- Guard test for subfolder writability; shuffle-safe via `session_start` in `beforeEach`.
- Curly-apostrophe rule respected in all markdown edits (apostrophe-free edit anchors).

## Feature acceptance

- Given a non-trivial feature brainstormed, When the design doc is written, Then it opens with `## At a glance` whose R# table has exactly one plain-language row per numbered requirement, and a human can approve intent from the digest alone.
- Given the approved design, When `pwk-writing-plans` presents its result, Then the human sees a one-line crosswalk confirmation covering every R# — not the full plan — and the plan's `## Crosswalk` sits outside the packet sed spans.
- Given all requirements implemented and the feature review collected, When the executor pauses at the ship checkpoint, Then the presentation shows the green gates, the execution summary (one "how it was built" line per R#, no test names), the spec-reviewer coverage table (verdict + evidence per R#), findings status, and the diff only on request.
- Given a feature whose progress shows `reviewing` or `ship-paused`, When `pwk-finalizing` runs its pre-checks, Then it blocks and sends the work back to `/skill:pwk-executing-tasks`; given `done`, When finalizing proceeds, Then the design/plan/progress docs including their digest sections are disposed by the existing globs (umbrella folder as one unit) and every user doc describes the new flow consistently — none still defaults the human to reading the full plan or the whole diff.
- Given an umbrella topic, When its overview is created, Then all umbrella docs live in `docs/plans/<date>-<umbrella>/` and `pwk-finalizing` disposes the folder as one unit while standalone topics still resolve via flat globs.
