# Evidence spine: requirements grounded in evidence

## At a glance

Requirements have gone wrong two ways: unknowns were guessed into criteria (the pwk-status topic shipped three fixes for facts a short run would have settled), and nothing explained current behavior to the human in plain words before requirements were written. This topic adds four small rules to the kit's skills: a PRD brief that opens brainstorming, an experiment tier that settles runnable unknowns, a probe test that rejects unverifiable criteria, and evidence rows that make every completed requirement carry proof. All changes are skill text, references, markers, and tests — one PR, version 2.9.0. The deferred skill-slimming pass is Topic 2 and lands separately after this one.

**Key decisions**
- The brief is conversational; confirmed facts weave into the design doc's sections (rejected: a `-brief.md` sidecar — disposal-contract churn for no reader).
- The experiment tier is a third classification inside the facts-vs-decisions rule (rejected: a separate sketch skill — new file and ceremony for one rule).
- The probe test is one sentence in the completion gate (rejected: a per-block criteria checklist — criteria form was never the observed failure).
- Evidence is one column, inherited by the ship digest (rejected: a decision-log TSV — a second artifact repeating what the summary row already says).
- No extension or validator change (rejected: a guard sketch-runner command — the guard already permits exactly the needed boundary).

| R# | Requirement in one line | Risk |
|----|-------------------------|------|
| R1 | PRD brief — a cited, zero-context explanation the human corrects before any requirement is written | — |
| R2 | Decide-by-experiment tier — runnable unknowns settle by bounded sketch, never asked first, never guessed | — |
| R3 | Probe test — a criterion is ready only when a command can observe its Then | — |
| R4 | Evidence rows — no requirement is marked done without a plain-words-plus-pointer cell | — |

## Requirements

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

## Feature acceptance

- Given the changed surfaces and their pinned markers, When `npm run check` runs, Then the full gate is green and each new marker sentence is found exactly once in its owning file.
- Given the updated README and docs/workflow-phases.md, When a reader searches for the four rule names, Then the PRD brief, the experiment tier, the probe test, and evidence rows each appear where their phase is described.

### Feature review: auto
