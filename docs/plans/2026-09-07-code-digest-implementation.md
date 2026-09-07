# Implementation Plan: code-digest

## Overview
Design: docs/plans/2026-09-07-code-digest-design.md

Three concern groups in one PR: the ship-time **code digest** (R1–R4), the **`docs/plans/completed/` exclusion** for recursive discovery globs (R5), and **frontier-round brainstorm questioning** with the assumption gate and backstops (R6–R9). R10 mirrors the wording in user docs. Marker/lint/vitest work lands **with each requirement's slice** (each slice adds its own markers to `tests/markers.mjs` and its skill-lint/vitest assertions); R10 covers only the cross-cutting user-docs mirrors, so the crosswalk's Tests column stays honest per slice.

## Crosswalk

| R# | Plan section | Tests |
|----|--------------|-------|
| 1 | Requirement 1: Digest template | `should add the code-digest section to the progress template` |
| 2 | Requirement 2: Digest write point | `should write the digest after review success, derived from the packet` |
| 3 | Requirement 3: Checkpoint presentation | `should present the digest after the execution summary` |
| 4 | Requirement 4: Fill rules | `should state the digest fill rules` |
| 5 | Requirement 5: completed/ exclusion | `should exclude completed/ from every recursive discovery glob`, `should leave finalize disposal commands unchanged` |
| 6 | Requirement 6: Frontier rounds | `should replace one-question-at-a-time with frontier rounds`, `should walk every checklist dimension visibly` |
| 7 | Requirement 7: Facts vs decisions | `should look up facts instead of asking the human` |
| 8 | Requirement 8: Assumption gate | `should sweep assumptions before the design summary` |
| 9 | Requirement 9: Termination and backstops | `should stop the interview on an empty frontier`, `should bounce invented scenario behavior to the gate`, `should bounce un-derivable requirements to brainstorm` |
| 10 | Requirement 10: Docs mirrors | `should mirror digest, exclusion, and frontier wording in user docs` |

## Requirement 1: Digest template

### Acceptance criteria
- Given `skills/pwk-executing-tasks/SKILL.md`'s progress-file template, When the feature is implemented, Then a `## Code digest` section exists directly below `## Execution summary`, before the `Feature phase` tracking content.
- Given the new section, When read, Then it contains the four subsection headings — `### Summary`, `### Flow`, `### Gotchas`, `### Key files` — each with its one-line shape description (sentences / arrow chains / `[ALERT]` risks / 3–5 files).
- Given the section, When read, Then it carries the once-only placement note (written after the feature review passes; never back-filled per requirement).

### Integration tests
- `should add the code-digest section to the progress template` — asserts the template block in `skills/pwk-executing-tasks/SKILL.md` contains `## Code digest` positioned after `## Execution summary`, with all four subsection headings and the once-only note; marker added to `tests/markers.mjs` (must not match any pre-change content — the phrase `## Code digest` is new).

### Checkpoints: none
### Review: skip

## Requirement 2: Digest write point

### Acceptance criteria
- Given a feature whose review has just succeeded (findings fixed, packet current), When the executor continues toward the ship checkpoint, Then it writes the digest into the progress file **before** presenting the checkpoint, reading the packet's `## Commits`, `## Changed files`, and `## Diff` sections.
- Given a resumed session at `Feature phase: reviewing`, When the review completes on the resume path, Then the same post-success write point fires.
- Given a stale or missing packet at write time, When the digest step runs, Then the skill instructs re-running the packet recipe first (extends the existing re-run rule).
- Given an umbrella part, When the digest is written, Then packet and progress file both resolve inside `docs/plans/<date>-<umbrella>/` (flat standalone path otherwise) — no new path logic beyond what the packet recipe already derives.

### Integration tests
- `should write the digest after review success, derived from the packet` — asserts the skill's post-review flow places the write step between the review-success handoff and checkpoint assembly, names the three packet sections, includes the resume-path wording, and includes the re-run-recipe-first rule.

### Checkpoints: none
### Review: skip

## Requirement 3: Checkpoint presentation

### Acceptance criteria
- Given the ship-checkpoint presentation list in `skills/pwk-executing-tasks/SKILL.md`, When the feature is implemented, Then the code digest appears as a listed item immediately after the execution summary.
- Given the list, When read, Then "full diff on request" remains the final item (digest supplements, does not replace, the raw diff).

### Integration tests
- `should present the digest after the execution summary` — asserts the ordered presentation wording places the digest item after the execution-summary item and before the diff-on-request item.

### Checkpoints: none
### Review: skip

## Requirement 4: Fill rules

### Acceptance criteria
- Given the digest step in `skills/pwk-executing-tasks/SKILL.md`, When read, Then the fill rules state: plain language; R# anchors where natural; no test names; `A -> B -> C` arrow chains for Flow; Gotchas lifts real risks from the smell/hazard/tracing findings with `[ALERT]` only for reviewer-confirmed issues and "none beyond review findings" when empty; Key files capped at 5.
- Given any executed digest, When Gotchas is empty of reviewer findings, Then the honest empty line is required — invented risks fail the rule.

### Integration tests
- `should state the digest fill rules` — asserts each rule's marker appears in the digest step (`[ALERT]` reviewer-confirmed-only wording, arrow-chain wording, key-files cap, no-test-names wording, honest-empty wording).

### Checkpoints: none
### Review: skip

## Requirement 5: completed/ exclusion

### Acceptance criteria
- Given each recursive discovery glob in `pwk-status` (four artifact globs), `pwk-brainstorming` (discovery), `pwk-executing-tasks` (find-the-plan, post-review routing), and `pwk-finalizing` (umbrella detection), When the feature is implemented, Then each carries the same canonical exclusion wording for `docs/plans/completed/`.
- Given an archived umbrella at `docs/plans/completed/<date>-<umbrella>/overview.md` and flat archived docs at `docs/plans/completed/`, When any discovery glob runs, Then nothing under `completed/` matches — status lists only active work; brainstorm discovery reports no archived topics; routing treats a standalone feature as standalone; finalize's umbrella detection does not fire on archived overviews.
- Given `skills/pwk-finalizing/SKILL.md`'s disposal blocks, When the feature is implemented, Then the `rm -rf` / `mv` commands and their anchoring comments are byte-unchanged (wording-only change elsewhere in the skills).
- Given the user docs, When the exclusion is described, Then they link to one single-source statement rather than restating the rule per doc.

### Integration tests
- `should exclude completed/ from every recursive discovery glob` — asserts the canonical exclusion phrase appears adjacent to every `docs/plans/**` glob in all four skills (enumerate the glob sites; assert per site).
- `should leave finalize disposal commands unchanged` — regression guard: the `rm -rf docs/plans/<date>-<umbrella>/` line, the verbatim-path comment, the `mv … docs/plans/completed/` lines, and the `ls` verification line are byte-identical to pre-change HEAD.

### Checkpoints: none
### Review: parallel

### Production-risk notes
- R5 touches the finalize `rm -rf` path (the archive-destruction vector it fixes). The change is wording-only (discovery exclusion), but the hazard reviewer must verify no disposal command or anchoring rule regresses — covered by the byte-identical regression test above plus the parallel review.

## Requirement 6: Frontier rounds

### Acceptance criteria
- Given `skills/pwk-brainstorming/SKILL.md` step 3, When the feature is implemented, Then "Ask questions one at a time" is replaced by the frontier-round protocol: build a question tree seeded by the dimension checklist (*Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional*), walking every group and printing `— nothing to ask` for empty ones.
- Given a round, When presented, Then it contains every frontier question (prerequisites settled) as numbered items, each carrying the agent's recommended answer; a question depending on an open question is explicitly assigned to a later round.
- Given a round of answers, When processed, Then the skill instructs recomputing the frontier and asking the next round.
- Given the four major approvals (approach selection, umbrella split, design approval, ADR unlock), When they arise, Then each is asked as a single decision, not batched.
- Given the Principles list, When the feature is implemented, Then "One question at a time" is absent from its defining line and replaced by the frontier/rounds principle and the no-silent-assumptions principle.

### Integration tests
- `should replace one-question-at-a-time with frontier rounds` — asserts the frontier/round/recommended-answer markers in step 3, the single-decision carve-out naming all four approvals, and that the extracted Principles list no longer contains the old principle (defining-line scoping per lessons).
- `should walk every checklist dimension visibly` — asserts all six dimension names and the `— nothing to ask` marker appear in the checklist instruction.

### Checkpoints: none
### Review: skip

## Requirement 7: Facts vs decisions

### Acceptance criteria
- Given `skills/pwk-brainstorming/SKILL.md`, When the feature is implemented, Then the facts rule states: facts answerable from the codebase, docs, or tools are looked up (recon scout or inline), never asked of the human; only decisions are asked.
- Given a pending lookup, When a round is assembled, Then only questions downstream of the pending fact wait — the rest of the frontier is asked now (non-blocking wording).
- Given the scout is unavailable, When facts are needed, Then inline lookup substitutes (existing fallback wording preserved).

### Integration tests
- `should look up facts instead of asking the human` — asserts the facts-never-asked marker and the non-blocking pending-lookup wording in the questioning protocol.

### Checkpoints: none
### Review: skip

## Requirement 8: Assumption gate

### Acceptance criteria
- Given a drafted design in a non-trivial brainstorm, When the summary ("Should I proceed, or is there more?") is about to be presented, Then the agent first enumerates every assumption the draft would bake in unconfirmed — business rules, defaults, edge-case resolutions — as numbered questions each with a recommended answer, confirmed/struck/corrected by the human in one reply.
- Given the gate, When an assumption is confirmed, Then the fact is woven into the design doc's existing sections — no new template section is added.
- Given a draft with no unconfirmed assumptions, When the gate runs, Then it says so explicitly (an honest empty gate) rather than inventing items.
- Given the hard rule, When stated, Then it reads that no business behavior enters the design doc on the agent's assumption.

### Integration tests
- `should sweep assumptions before the design summary` — asserts the gate marker before the proceed-summary wording, the numbered-with-recommendation format, the woven-not-new-section rule, the honest-empty rule, and the hard-rule sentence.

### Checkpoints: none
### Review: skip

## Requirement 9: Termination and backstops

### Acceptance criteria
- Given `skills/pwk-brainstorming/SKILL.md`, When the feature is implemented, Then the stop rule reads as frontier-empty termination (every branch visited, nothing silently assumed), replacing "once you can articulate what/why/constraints" as the move-on condition.
- Given step 7's `## Feature acceptance` guidance, When a scenario step would require inventing behavior, Then the skill routes that invention back through the assumption gate — it may not be silently written into the scenario.
- Given `skills/pwk-writing-plans/SKILL.md`, When a requirement's testable acceptance criteria cannot be derived without inventing behavior, Then the planner bounces the requirement back to `/skill:pwk-brainstorming` naming the specific gap.

### Integration tests
- `should stop the interview on an empty frontier` — asserts the frontier-empty stop-rule marker and that the old articulate-when-ready phrasing no longer appears as the move-on condition on its defining line.
- `should bounce invented scenario behavior to the gate` — asserts the scenario-forcing sentence in the feature-acceptance guidance.
- `should bounce un-derivable requirements to brainstorm` — asserts the bounce rule in `skills/pwk-writing-plans/SKILL.md` names the gap and the return skill.

### Checkpoints: none
### Review: skip

## Requirement 10: Docs mirrors

### Acceptance criteria
- Given `README.md`, `docs/workflow-phases.md`, and `docs/developer-usage-guide.md`, When the feature is implemented, Then the ship-checkpoint description mentions the code digest; the discovery/disposal descriptions mention the `completed/` exclusion (linked to the single source); the brainstorm description mentions frontier rounds with recommended answers and the assumption gate.
- Given `CHANGELOG.md`, When the feature ships, Then a new unreleased-section entry summarizes all three behaviors (written at finalize, asserted here only as coverage of the three topics).

### Integration tests
- `should mirror digest, exclusion, and frontier wording in user docs` — docs-consistency assertions: each mirror phrase present in each of the three user docs (regex-tolerant per lessons: match behavior, not exact sentences).

### Checkpoints: none
### Review: skip

## Feature acceptance
- `should compose digest-at-completion, archive-blind discovery, and frontier questioning across the kit` — Given the kit at HEAD with a fixture repo state containing a progress-file template, an archived umbrella under `docs/plans/completed/`, and the brainstorm/planner skills, When the full suite runs, Then: the executing-tasks template carries `## Code digest` wired from the packet to the checkpoint presentation; every recursive discovery glob excludes `completed/` while finalize's disposal commands stay byte-identical; brainstorming's questioning protocol is frontier rounds with recommended answers, facts-looked-up, an assumption gate, and frontier-empty termination; the planner carries the bounce rule; and the user docs mirror all three. This is the primary enforced spec.

### Feature review: parallel
