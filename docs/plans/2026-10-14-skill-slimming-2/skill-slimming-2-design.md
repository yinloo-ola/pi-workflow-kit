# Skill-slimming pass — design

The kit's six skills are 817 lines / 15,360 words of prose — up 28% since a slimming pass was scoped and judged the corpus "already lean". Nothing but that prose enforces workflow behavior: the extension guards writes and phases, it does not check whether a skill told the agent to stop, to wait, or to show evidence. This topic cuts every skill markdown file to at most 70% of its current word count (corpus ≤10,745 words, a 30% cut) under five editorial rules, protects the clauses that record decisions or that tests pin verbatim, and installs per-file word budgets in `skill-lint` so the corpus cannot creep back. Size is enforced deterministically; behavior is re-verified by a recorded six-run probe.

## At a glance

What is wrong: the skills have accumulated explanation that no test watches, and the last "already lean" verdict was made at 639 lines — before the corpus grew by 28%. What will be built: a 30% prose cut across all eleven skill markdown files, applied by rule rather than by taste, with the decision-record clauses kept byte-identical and a per-file word budget that fails the check gate when either a file grows or a rule gets restated. The key approach in plain words: cut only what the tests do not pin, keep what records a decision, and make the achieved size a permanent floor.

**Key decisions**

- Cut the unpinned prose and leave the pin surface alone — 27 test files read these skills and pin ~2,059 words (13.4%) verbatim; the other 86.6% is free. (rejected: re-anchoring the pins to markers — it buys little when most words are already free, and it weakens guarantees the tests already provide)
- Keep the 509 words that repeat across skill files — skills load independently in fresh sessions, the boilerplate is deliberate, and `skill-lint` check 13b asserts it verbatim. (rejected: de-duplicating across skills — 3% of the corpus, and it reverses a settled decision)
- Make the reduction a ratchet: a budget per markdown file in `skill-lint`, set to the achieved count plus 10% headroom. (rejected: measuring once and moving on — this corpus grew 28% since the last "already lean" verdict)
- Verify size deterministically and behavior with a six-run probe: two conditions, three trials each, one fixture task, no large/control matrix. (rejected: the 16-run R4 matrix — more cost without answering this question better; rejected: one run per condition — a single run cannot separate skill-text savings from task variance; rejected: suite-only — keyword checks do not prove behavior)
- Land the editorial rules in `AGENTS.md`, where the next skill edit already looks. (rejected: keeping them in this design doc — the doc is disposed at finalize; rejected: a new authoring guide — one more file the next session must find)

| R# | Requirement in one line | Risk |
|---|---|---|
| R1 | `skill-lint` gains per-file word budgets and a no-restatement rule | — |
| R2 | The three heaviest SKILL.md files cut to at most 70% of their counts | — |
| R3 | The three light SKILL.md files cut to at most 70% of their counts | — |
| R4 | The five reference markdown files cut to at most 70% of their counts | — |
| R5 | A six-run probe records behavior parity and net token usage per condition | — |
| R6 | Rules recorded in AGENTS.md, budgets tightened, release 2.10.0 | — |

## Requirements

### R1: Word-budget ratchet for skill text
`skill-lint` fails when any markdown file under `skills/` exceeds its recorded budget or repeats a long sentence within itself, so the cut is enforced from the first commit rather than promised at the end.

The budgets live in one table inside `tests/skill-lint.mjs`, one row per file, starting at the 2.9.0 counts so the gate is green before any cut lands; R6 tightens them to the achieved counts. The restatement rule flags a sentence of 12 words or more appearing twice inside one file — measured green today, so it is a pure regression guard for the editorial rule that a rule is stated once per file and pointed to afterwards.

**Acceptance criteria**
- Given the repository before any cut, When `npm run check` runs, Then it passes and the budget table names all eleven markdown files under `skills/` with their 2.9.0 word counts.
- Given a skill markdown file edited to hold one more word than its budget, When `npm run check` runs, Then it exits non-zero and the failure names the file, its budget, and its actual count.
- Given a markdown file added under `skills/` that the budget table does not list, When `npm run check` runs, Then it exits non-zero naming the unbudgeted file.
- Given a copy of the kit in a scratch directory whose skill file repeats a 12-word sentence, When `skill-lint` runs against that copy, Then it exits non-zero naming the file and the repeated sentence.

### Checkpoints: none
### Review: skip

### R2: Heaviest three SKILL.md cut
The three skills a session spends the most context on — `pwk-executing-tasks` (3,937 words), `pwk-brainstorming` (2,395), `pwk-finalizing` (1,827) — each end at most 70% of their 2.9.0 counts, cut by the five editorial rules and with every keep-list clause intact.

**Acceptance criteria**
- Given the three files after this requirement, When the budget check runs, Then each holds at most `floor(0.7 × its 2.9.0 count)` words: 2,755, 1,676, and 1,278.
- Given the slimmed files, When `npm run check` runs, Then biome, the vitest suite, and `skill-lint` all pass — every pinned string is still present verbatim.
- Given the diff against the 2.9.0 baseline, When the removed lines are read at the human diff stop, Then each removed line is explanation, motivation, or restatement, and no keep-list clause (K1–K6) is among them.

### Checkpoints: none
### Review: skip

### R3: Light three SKILL.md cut
`pwk-code-review` (1,045 words), `pwk-status` (924), and `pwk-walkthrough` (584) each end at most 70% of their 2.9.0 counts, under the same rules and the same keep-list.

**Acceptance criteria**
- Given the three files after this requirement, When the budget check runs, Then each holds at most 731, 646, and 408 words.
- Given the slimmed files, When `npm run check` runs, Then biome, the vitest suite, and `skill-lint` all pass.
- Given the diff against the 2.9.0 baseline, When the removed lines are read at the human diff stop, Then no keep-list clause (K1–K6) is among them.

### Checkpoints: none
### Review: skip

### R4: Reference markdown cut
The five files a phase loads on demand — `design-format.md` (1,498 words), `progress-format.md` (1,298), `review.md` (804), `resume.md` (646), `umbrella.md` (402) — each end at most 70% of their 2.9.0 counts.

These files carry format contracts and command recipes, so their cut is mostly explanation around contract lines; the contract lines themselves are keep-list K5.

**Acceptance criteria**
- Given the five files after this requirement, When the budget check runs, Then each holds at most 1,048, 908, 562, 452, and 281 words.
- Given the slimmed files, When `npm run check` runs, Then biome, the vitest suite, and `skill-lint` all pass, including the prescription sweep over the recipe lines.
- Given the diff against the 2.9.0 baseline, When the removed lines are read at the human diff stop, Then no keep-list clause (K1–K6) is among them.

### Checkpoints: none
### Review: skip

### R5: Fidelity and cost probe recorded
Six recorded runs — the baseline kit (commit `dfe0dd0`, version 2.9.0) and the slimmed kit, three trials each on one fixture task — show that no workflow behavior regressed and that the candidate sessions spent fewer tokens overall.

The runs are real agent sessions, so the human authorizes provider, model, network, and spend before each one; the kit prepares the protocol, fixture, and validator but never invents a provider command. This is the topic's one human-run step, which is why the requirement carries a full checkpoint. If the runs cannot happen, this requirement is `⏭` and the ship gate stops there — a fabricated or fixture-derived report is never acceptable evidence.

**Acceptance criteria**
- Given two recorded conditions of three trials each, When the probe validator runs, Then it exits zero only if both commits are present and distinct, all six trials have a transcript and a usage file, every trial carries a verdict and an evidence pointer for each of the five assessments, the recorded token totals recompute from the raw usage lines, no candidate trial regresses an assessment against baseline, and the candidate median total tokens are below the baseline median.
- Given a candidate trial missing one assessment verdict, When the validator runs, Then it exits non-zero and names the trial and the missing assessment.
- Given a trial whose usage lines do not sum to its recorded total, When the validator runs, Then it exits non-zero and names both the recorded and the recomputed value.
- Given the two conditions, When the probe report is read, Then it shows both medians and the spread of each condition, so a reader can see the noise beside the comparison.

### Checkpoints: full
### Review: skip

### R6: Rules recorded, budgets tightened, release
The five editorial rules land in `AGENTS.md` under the code conventions, the budgets tighten to the achieved counts plus 10% headroom, and the release ships as 2.10.0.

**Acceptance criteria**
- Given `AGENTS.md`, When its code-conventions section is grepped for the labels `E1:` through `E5:`, Then all five rules are present, one line each.
- Given the achieved word counts, When `npm run check` runs, Then the budget table equals the achieved count plus 10% headroom per file, rounded up, and the check passes.
- Given the release, When `npm run check` runs, Then it passes with `package.json` at version 2.10.0 and a `CHANGELOG.md` entry naming this topic.

### Checkpoints: none
### Review: skip

## Keep-list (protected clauses)

These classes are never cut. K1, K2, K4, K5, and K6 are already machine-checked, which is why the cut is safe to attempt at all; K3 is the one class that rests on the human read.

| Class | What it covers | What enforces it |
|---|---|---|
| K1 | Every string the test suite pins verbatim — 1,278 harvested literals, ~2,059 words | the vitest suite inside `npm run check` |
| K2 | Tag vocabularies and their resolution rules (`### Checkpoints`, `### Review`, `### Feature review`, and the auto-resolution) | pinned markers in the vitest suite |
| K3 | Decision-record clauses: the informed-stop and ship-gate wording recorded by ADR 0003 and ADR 0006 | the human read of the diff at each slice's stop |
| K4 | The cross-file boilerplate — root check, discovery recipe, tool-freedom clause, canonical codemode sweep script | `skill-lint` check 13b (verbatim identity across files) |
| K5 | Command and format contracts in `references/` — progress-file template, packet sections, digest shape, design-format contract | pinned markers and the prescription sweep |
| K6 | The tool-freedom wording the prescription sweep classifies as sanctioned | `prescription-sweep.mjs` inside `npm run check` |

## The five editorial rules

These are the cut rules; R6 copies them into `AGENTS.md` unchanged.

- **E1 — Cut preamble, not instruction.** Every sentence states a trigger, an action, or a concrete example. Motivation and summary sentences go, unless removing the reason invites a wrong action (keep "never `cd`", drop "this matters because").
- **E2 — Delete what a competent agent already does.** No reminders to read the file it must read, to be careful, or to keep things consistent in the abstract. Non-obvious house rules stay.
- **E3 — One home per rule, per file.** The first mention is complete; later mentions are a pointer. Cross-file duplication stays, because each skill loads on its own.
- **E4 — Shortest carrier wins.** If a table row, a command, or a list item says it in fewer words than the prose, use the carrier. Prose is for judgment that cannot be tabulated; rare-path detail moves into `references/` rather than being deleted.
- **E5 — Never cut a contract or a decision record.** The keep-list above survives verbatim; only the explanation around it is slimmed.

## Probe mechanics

The kit lives in `tests/evals/skill-slimming/`: a protocol file, a fixture task description, a validator, and a README. It mirrors the R4 harness's safety rules — no credentials in the repo, no guessed provider command, human authorization before every run — while dropping its large/control matrix.

- **Conditions.** Baseline is commit `dfe0dd0` (the pre-slim main head, version 2.9.0); the candidate is this topic's slimmed commit. Each condition runs the same fixture task three times in fresh sessions: six runs, no more.
- **Fixture.** One small but real slice that exercises the full pipeline — design, then execute with a feature gate, then finalize — so the probe observes the phase stops and the approval behavior, not just prose.
- **Assessments.** The five the R4 protocol established: vertical-slices, approval, current-only-design, predecessor-grounding, premature-finalize-blocking. Each trial records a verdict and an evidence pointer into its own transcript.
- **Accounting.** `usage.mjs` recomputes totals from the provider-exported usage lines; the validator rejects a recorded total that disagrees with the recomputation, so the numbers cannot be hand-typed.
- **Verdict.** No candidate trial may regress an assessment, and the candidate median total tokens must be below the baseline median. The report shows both medians and both spreads, so the reader sees the noise rather than a bare claim.
- **Honesty.** The deterministic size claim (words) and the observed cost claim (tokens, six runs) are reported as two separate facts; a smaller corpus that costs more tokens per session is a finding, not a failure to hide.

## Approaches considered

**Cut the unpinned prose versus re-anchor the pin surface.** Re-anchoring would move the ~2,059 pinned words onto a smaller marker vocabulary, freeing more text to rewrite. It lost on measurement: 86.6% of the corpus is already unpinned, so the pins bound almost nothing, while re-anchoring would touch the suites that currently guarantee behavior for no additional cut.

**One de-duplicated boilerplate versus keeping it inline.** De-duplication would recover 509 words by pointing each skill at a shared statement. It lost because the skills load independently, the boilerplate sits at gates where a pointer is fragile, a settled decision already rejected it, and `skill-lint` check 13b asserts the verbatim identity — the gain is 3% for a real regression risk.

**Six-run probe versus the 16-run matrix versus two runs versus the suite alone.** The 16-run matrix costs roughly three times as much for the same question; two runs cannot separate skill-text savings from task variance; the suite alone proves pins, not behavior. Six runs give a median and a spread at a cost the human can authorize in one sitting. The task-level savings claim is deliberately kept separate from the deterministic word claim, because a terse skill that makes an agent loop costs more tokens than it saved.

**Ratchet versus one-off measurement.** A one-off cut has no way to stay cut: the corpus already grew 28% after a pass that judged it lean. Budgets in `skill-lint` cost one table and fail loudly.

**A new keep-list checker versus the existing gates plus a human read.** A dedicated checker would duplicate what the suite and `skill-lint` already assert (K1, K2, K4, K5, K6) and still could not judge K3, which is prose about decisions. The human read of the diff remains the only honest test for K3.

**Words versus lines as the unit.** Lines depend on wrapping and on how an editor reflows a paragraph, so a line-count target would reward re-wrapping rather than editing. Words are stable, comparable across files, and trivially checked.

**One design doc, one PR versus an umbrella of per-file docs.** The work is one cohesive change to one class of files with one verification story; splitting it by file would multiply the ceremony around a single mechanical pass.

## Feature acceptance

- Given the repository after this topic, When `npm run check` runs, Then it passes with the eleven skill markdown files totalling at most 10,745 words and each file inside its budget.
- Given a slimmed skill file inflated past its budget, When `npm run check` runs, Then it fails and the failure names that file with its count.
- Given the six recorded probe runs, When the probe validator runs, Then no behavior assessment regressed against baseline and the candidate median total tokens are lower, with both spreads reported.
- Given `AGENTS.md`, When the code-conventions section is grepped for the five rule labels, Then `E1:` through `E5:` are all present.

### Feature review: auto

## Baseline measurements

Every number this design relies on, with the command that produced it.

- The corpus is 6 skills, 11 markdown files, 817 lines, 15,360 words; the heaviest single section is `pwk-brainstorming`'s Process at 1,584 words, 66% of that file. (settled by sketch: `node docs/plans/2026-10-14-skill-slimming-2/evidence.mjs` → totals and per-file word counts above)
- The test suite pins ~2,059 words verbatim (13.4% of the corpus), per file between 5.4% and 24.8%. (settled by sketch: the same script → 1,278 literals harvested, per-file pinned share)
- Cross-file duplication is 509 words and entirely deliberate. (settled by sketch: the same script → 6 shared sentences, all boilerplate or the discovery recipe)
- No file repeats a 12-word sentence within itself today, so the no-restatement rule starts green. (settled by sketch: `node docs/plans/2026-10-14-skill-slimming-2/intra-file-repeat.mjs` → zero occurrences across all 11 files)
- The "already lean" verdict was recorded at 639 lines / 7 skills. (settled by read: `git show 8d506f5:docs/plans/2026-09-11-skill-slimming-notes.md` → census at time of writing, plus the non-goal this topic supersedes)
