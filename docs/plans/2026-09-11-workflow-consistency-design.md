# Workflow-consistency batch — fixing the F1–F15 audit defects

Seed: `docs/plans/2026-09-11-workflow-consistency-notes.md` (15 defects found at the end of `leaner-execution-gates` 2.2.0; all 15 verified open at HEAD `fb1f17a` by recon with file:line citations). This batch is pure consistency repair: one vocabulary, one failure model, honest docs, drift-killing lint. No behavior is invented — every change reconciles existing contracts that already disagree with each other.

## At a glance

| # | Requirement | Risk |
|---|-------------|------|
| 1 | One row-state and ceremony vocabulary | — |
| 2 | Terminal-state ship gate and reachable failure branches | ⚠ production-risk |
| 3 | Setup checkpoint made implementable | — |
| 4 | Derived At-a-glance Risk column | — |
| 5 | Feature-acceptance template renders its review tag | — |
| 6 | Inventory doc parity sweep | — |
| 7 | Doc-inventory parity lint | — |
| 8 | Packet base defined from the Commit column | — |
| 9 | Diagnose ↔ execution recording hook | — |

Key decisions:

- **Done now means resolved.** `Feature phase: done` = every requirement row terminal (`✅`/`❌`/`⏭`), not all-`✅`. pwk-finalizing stays the failure authority — its existing `❌`-block / `⏭`-warn / `--force-failed` branches become reachable exactly as written. An ADR records this (written during execution — the design phase cannot write `docs/adr/`).
- **One vocabulary, scoped writers.** `pwk-executing-tasks` canonically defines the row-state glyphs and owns the template; `pwk-code-review` only ever flips `🔄`→`✅`. The phantom `🔎 review` value dies.
- **The Commit column becomes the packet source of truth.** Feature packet base = parent of the first recorded commit; per-requirement spans chain between recorded commits. No `merge-base` guessing, no default-branch knowledge.
- **Count claims become lint-asserted against the real `skills/` tree** — doc drift fails CI in both directions from now on.
- **Out of scope:** the extract-never-ingest residual, the stale `feature-spec-paused` legacy enum listing in pwk-finalizing, and `~/.agents` copy re-sync (manual, post-ship).

## Requirements

### R1: One row-state and ceremony vocabulary

**Defect:** F4. `pwk-code-review` (`skills/pwk-code-review/SKILL.md:36`) mutates the Done column using a phantom `🔎 review → ✅ done` transition that exists in no vocabulary; the `Checkpoints: full` value's second stop has no marker anywhere; two skills write one cell with no contract.

**Change:** `pwk-executing-tasks` gains a canonical vocabulary block beside the progress-file template:

- **Done column:** `⬜` not started · `🔄` in progress · `✅` done (reviewed) · `❌` failed — reason in row · `⏭` skipped — reason in row
- **Per-req ceremony column** (echoes the design doc's tag, not progress): `—` none · `⏸ tests` · `⏸ full` (fires two stops — before and after the requirement) · `🔎 inline` · `🔎 parallel`

Writer scoping stated in the block: executing-tasks sets all five Done values; the inline review path (pwk-code-review) only flips `🔄`→`✅`; findings leave the row `🔄`. `pwk-code-review:36` is rewritten to "set the requirement's Done cell `✅`" against this vocabulary — the phantom `🔎 review` value is removed.

#### Acceptance criteria

- **Given** the rewritten `pwk-executing-tasks`, **when** the vocabulary block is read, **then** it defines exactly the five Done glyphs and five ceremony values above, and states the writer scoping rule in one sentence.
- **Given** `pwk-code-review` after the edit, **when** grepped for `🔎 review`, **then** no match exists; its row-marking instruction names the canonical `✅` glyph.
- **Given** a `Checkpoints: full` requirement, **when** the executing skill documents its ceremony marker, **then** the marker is `⏸ full` and the skill states it fires two stops.
- **Given** the full suite, **when** `npm run check` runs, **then** it is green (markers and pinned literals move in lockstep with the rewording).

### Checkpoints
- none

### Review
- skip

### R2: Terminal-state ship gate and reachable failure branches

**Defect:** F1 (P0) + F13. The ship gate (`pwk-executing-tasks:120`) requires every Done cell `✅`, but the failure path (`:231`) and the skip override (`:195`) mark rows `❌`/`⏭` — so a feature with any failed/skipped requirement can never reach `Feature phase: done`, making pwk-finalizing's `--force-failed` and `⏭`-warn branches dead code. The resume rule (`:80`) treats every non-`✅` row as "next", so a resume routes back into an already-failed requirement. `pwk-status` has no rendering for a completed-but-failed feature.

**Change** (all in `skills/pwk-executing-tasks/SKILL.md` unless noted):

- Ship gate: *"every requirement's Done cell is terminal — `✅`, `❌` (with reason), or `⏭` (with reason)"*.
- Failure path and skip override: name their glyphs explicitly and mandate appending a short reason to the row (suffix on the Requirement cell).
- Ship digest: **must list every `❌`/`⏭` row with its reason** — the stop stays fully informed; the phase is set to `done` only after the human approves knowing what failed.
- Resume rule: only `⬜`/`🔄`/blank route the next requirement; `✅`/`❌`/`⏭` are resolved and are skipped past.
- `pwk-status` (`skills/pwk-status/SKILL.md`): the `done` mapping renders counts (e.g. `done (1 ❌ · 1 ⏭)`) via bounded `grep -c` reads; when `❌` is present its ready-for-finalize hint appends that finalizing will require `--force-failed`.
- pwk-finalizing: **unchanged** — its branches become reachable as already written.
- Legacy `*-implementation.md` flow: explicitly stated unaffected (no Feature-phase gate in that flow).
- Umbrella: stated that finalizing reads every part's progress file and the `❌`-in-any-part block rule applies across parts unchanged.
- `docs/adr/0007-resolved-requirements-ship-gate.md`: written during execution, recording "done means resolved; finalizing is the failure authority" with the rejected `partial`-phase alternative.

#### Production-risk notes

This relaxes the gate the kit's users ship their own features through. If the ship digest fails to surface a failed row, incomplete work ships silently — that is the one place this batch can do real damage. The digest mandate must be pinned by tests, not left as prose goodwill.

#### Acceptance criteria

- **Given** the rewritten ship gate, **when** a design doc's requirements end `✅`/`❌(reason)`/`⏭(reason)`, **then** the executing skill reaches the ship checkpoint and the digest lists each failed/skipped row with its reason.
- **Given** human approval of that digest, **when** the phase is set, **then** it is `Feature phase: done` and pwk-finalizing's `❌` block (or `⏭` warn) fires without modification.
- **Given** a progress file with a `❌` row and `Feature phase: done`, **when** pwk-status renders the topic, **then** it shows `done` with the `❌` count and the `--force-failed` hint.
- **Given** a resume over rows `✅`/`❌`/`⬜`, **when** the resume rule picks the next requirement, **then** it picks the `⬜` row, not the `❌` row.
- **Given** the suite, **when** `npm run check` runs, **then** the phase-value pins (`tests/pwk-status.test.ts`, `tests/human-review-digests.test.ts`) and markers move with the new wording and pass.

### Checkpoints
- none

### Review
- parallel

### R3: Setup checkpoint made implementable

**Defect:** F2 + F3. The checkpoint instructs "record `setup: done` in the progress-file header" but fires **before** the progress file is created, and the header template has no `Setup:` slot — the instruction cannot be followed as written (the recording-order bug). Meanwhile four inventory docs (+ README quick-start `:161`) claim checkpoint counts that don't match the code's conditional reality (`## Setup`-only).

**Change** (`pwk-executing-tasks` "First run" section):

1. Reorder: **create the progress file first** — header starts `Setup: pending` when the design doc has `## Setup`, else `Setup: n/a`.
2. Then setup pre-flight, then **⏸ CHECKPOINT: setup** (unchanged: present results, wait for approval), then **on approval set `Setup: done`**.
3. Resume rule: `Setup: pending` in the header + `## Setup` in the design doc → re-run the setup verification before continuing.
4. Header template gains the `Setup:` slot (line after `Branch:`).
5. `pwk-status`: renders `awaiting setup` for `Setup: pending` topics.
6. Reword the checkpoint-count claims honestly at all five sites: `docs/oversight-model.md`, `docs/developer-usage-guide.md` (×2), `README.md` (:143 and quick-start :161) — "two hard stops when the design carries `## Setup` (setup + ship); otherwise one (ship)".

#### Acceptance criteria

- **Given** a fresh run of a design doc with `## Setup`, **when** the flow reaches the setup checkpoint, **then** the progress file already exists with `Setup: pending`, and approval flips the header to `Setup: done`.
- **Given** a crash between file creation and checkpoint approval, **when** a resume starts, **then** it re-runs the setup verification (detects `Setup: pending`), not assume it.
- **Given** a design doc without `## Setup`, **when** the progress file is created, **then** the header reads `Setup: n/a` and no setup checkpoint fires.
- **Given** `pwk-status` over a `Setup: pending` topic, **when** rendered, **then** the state `awaiting setup` appears.
- **Given** the five reworded doc sites, **when** grepped for checkpoint-count claims, **then** every claim matches the conditional reality and `tests/lean-gates.criteria.test.ts`-family pins pass.

### Checkpoints
- none

### Review
- skip

### R4: Derived At-a-glance Risk column

**Defect:** F5. `pwk-brainstorming:66` shows a `Risk` column and `:94` says it "flags" requirements, but no rule derives its value, and the `auto` resolution never reads it — risk information has two homes that can disagree.

**Change** (`pwk-brainstorming`): the Risk column is a **derived display value**: `⚠ production-risk` if and only if the requirement block carries a non-empty `### Production-risk notes` section, else `—`. The skill declares the column display-only — never normative; `auto` continues to read only the notes (unchanged at `pwk-brainstorming:103`, `pwk-executing-tasks:174`, `docs/workflow-phases.md`).

#### Acceptance criteria

- **Given** the rewritten `pwk-brainstorming`, **when** the At-a-glance table rules are read, **then** the derivation rule and the display-only declaration appear exactly once each.
- **Given** a requirement with `### Production-risk notes` content, **when** the At-a-glance table is built, **then** its Risk cell is `⚠ production-risk`; given a block without notes, **then** the cell is `—`.
- **Given** any consumer skill, **when** risk resolution runs, **then** it reads the notes section, never the table cell (no text anywhere claims the column is an input).

### Checkpoints
- none

### Review
- skip

### R5: Feature-acceptance template renders its review tag

**Defect:** F6. `pwk-brainstorming:103` prose says the `## Feature acceptance` section carries a `### Feature review` tag and `pwk-executing-tasks`' packet sed (`:164`) terminates its span on `### Feature review` — but the template block (`:105–109`) omits the tag line, so a doc rendered verbatim from the template produces an FA span that runs to EOF. Tests never caught it: `tests/review-packet.test.ts` fixtures all include the tag (tag-present case only).

**Change** (`pwk-brainstorming`): the template's `## Feature acceptance` fenced block gains the `### Feature review` line (default `parallel`). Add a skill-lint assertion that the template block contains `### Feature review` inside the fence — the gap that let this survive stays closed.

#### Acceptance criteria

- **Given** the rewritten template, **when** a design doc is rendered from it verbatim, **then** the `## Feature acceptance` section ends with a `### Feature review` tag line.
- **Given** `tests/skill-lint.mjs` after the change, **when** it runs against the brainstorming skill, **then** it fails if the template's fenced FA block lacks the tag line.
- **Given** a template-conformant design doc, **when** the packet FA_CMD sed runs, **then** the span terminates at the tag line, not EOF (covered by a tag-from-template fixture in `review-packet.test.ts`).

### Checkpoints
- none

### Review
- skip

### R6: Inventory doc parity sweep

**Defects:** F7, F8, F9, F10, F11 + two recon extras. All mechanical text repairs — no contract design:

- **F7:** add pwk-walkthrough to the three inventory docs that omit it (`docs/oversight-model.md` — fix the "5 pipeline skills" listing to 4 pipeline + 3 utility; `docs/workflow-phases.md` — add a Walkthrough section; `docs/developer-usage-guide.md` — "2 utility" → "3 utility").
- **F8:** the three unlock-prose sites (`README.md:58`, `docs/developer-usage-guide.md:113`, `docs/oversight-model.md:33`) gain `pwk-walkthrough`; README:54's guard-table row is corrected (Status is gated; Walkthrough is unrestricted).
- **F9:** plan-phase terminology sweep to design/execute/finalize at `README.md:3, :5, :21, :118`, `docs/developer-usage-guide.md:49, :119–121`, `docs/provider-delegation-contract.md:118`, `docs/workflow-phases.md:97`.
- **F10:** `pwk-code-review` plan remnants — "in the plan" → "in the design doc"; "integration tests" → "acceptance criteria + feature E2E"; `:42` re-worded to "the human tagged this requirement at design approval".
- **F11:** `docs/developer-usage-guide.md:83–97` — Walkthrough block moves after diagnose's prose.
- **Recon extra:** `pwk-finalizing` disposal globs (both delete and archive variants) gain `????-??-??-<topic>-notes.md` so audit-seed files are disposed with their topic — including this batch's own seed.

#### Acceptance criteria

- **Given** each of the four inventory docs, **when** scanned for skill names, **then** all seven `pwk-*` skills appear (verified by R7's lint, which lands after this requirement).
- **Given** the three unlock-prose sites, **when** read, **then** each lists exactly the `UNLOCK_SKILLS` set including `pwk-walkthrough`.
- **Given** the terminology sweep, **when** the nine F9 sites are grepped for `plan phase`/`plan→`, **then** no stale plan-phase vocabulary remains.
- **Given** finalizing's disposal command for a topic with a `-notes.md` file, **when** it runs, **then** the notes file is disposed with the topic's other docs (pinned in the disposal test).

### Checkpoints
- none

### Review
- skip

### R7: Doc-inventory parity lint

**Defect:** F14. Nothing asserts the four inventory docs describe the real skill set; README's "lint-asserted" claim about unlock coverage is itself unasserted.

**Change** (`tests/skill-lint.mjs`, new section; consumes R6's edits): 

- For each of `README.md`, `docs/oversight-model.md`, `docs/developer-usage-guide.md`, `docs/workflow-phases.md`: assert every skill directory under `skills/` (`pwk-*`) is named in the doc.
- Assert each unlock-prose site lists exactly the members of the exported `UNLOCK_SKILLS` (source of truth) — no more, no fewer.
- Pin the count-claim strings (e.g. "4 pipeline skills plus 3 utility skills") and assert them against counts **computed from the `skills/` tree** (pipeline = brainstorming/executing/code-review/finalizing; utility = status/diagnose/walkthrough) — drift fails CI in both directions.

#### Acceptance criteria

- **Given** the lint, **when** a new skill directory is added without inventory-doc updates, **then** skill-lint fails.
- **Given** the lint, **when** an unlock-prose site edits its list away from `UNLOCK_SKILLS`, **then** skill-lint fails.
- **Given** the lint, **when** a stated count claim disagrees with the computed count, **then** skill-lint fails with the computed vs stated values.
- **Given** the current tree (post-R6), **when** `node tests/skill-lint.mjs` runs, **then** it passes.

### Checkpoints
- none

### Review
- skip

### R8: Packet base defined from the Commit column

**Defect:** F12. The review-packet recipe uses a bare `<merge-base>` placeholder (`pwk-executing-tasks:154/:157/:170`) that nothing defines; the progress template's Commit column (`:36`) is never named as a fill target, so it is never filled.

**Change** (`pwk-executing-tasks`):

- Step 6 (per-requirement completion) gains: record the requirement's commit hash in the Commit column.
- Feature packet base: `git rev-parse <first Commit-column entry>^` — the parent of the first recorded commit.
- Per-requirement packet span: previous requirement's last commit (exclusive) → this requirement's last commit (inclusive); R1's exclusive bound is its own parent.
- The recipe text names the Commit column as the source of truth for both spans.

#### Acceptance criteria

- **Given** the rewritten step 6, **when** a requirement completes, **then** the skill instruction requires its commit hash in the Commit column.
- **Given** a progress file with Commit entries `c1..c3`, **when** the feature packet is built, **then** the base is `c1^`.
- **Given** rows R2 (last commit `c2`) and R3 (last commit `c3`), **when** R3's packet is built, **then** the span is `c2..c3`.
- **Given** `tests/review-packet.test.ts` after the change, **when** it runs, **then** fixtures exercise the commit-span rule and pass.

### Checkpoints
- none

### Review
- skip

### R9: Diagnose ↔ execution recording hook

**Defect:** F15. Bugs found and fixed mid-execution (via pwk-diagnose) are invisible to the execution summary and the Deviated? column — the record understates what actually happened.

**Change** (one sentence each side):

- `pwk-executing-tasks` (execution summary / Learn step): mid-execution fixes are mandatory execution-summary content with a Deviated?-column mark recorded at fix time.
- `pwk-diagnose` (closing phase): if invoked during execution, record the fix in the progress file's execution summary before returning to the executing skill.

#### Acceptance criteria

- **Given** the rewritten executing skill, **when** a bug is found and fixed mid-execution, **then** the skill mandates an execution-summary entry and a Deviated? mark at fix time.
- **Given** `pwk-diagnose` after the edit, **when** its closing phase runs during an execution session, **then** it instructs recording the fix in the progress file.
- **Given** the diff, **when** pwk-diagnose's change is measured, **then** it is exactly one sentence (scope guard).

### Checkpoints
- none

### Review
- skip

## Approach context

The audit found 15 defects but they reduce to four families: a **failure model** that deadlocks (F1), **skill contradictions** where two skills disagree about one contract (F2–F6), **doc parity** drift between inventory docs and reality (F7–F11), and **underspecified mechanics** (F12–F15). Every defect's fix direction was settled in the brainstorm's frontier rounds with the repo owner; the requirements above are those decisions rendered buildable. Order matters: R1's vocabulary is used by R2's gate; R6's rewordings must follow R2/R3's settled models; R7's lint asserts the post-R6 inventory (it would fail if run before R6).

## Approaches considered

- **New `partial` phase for completed-with-failures features** (Q2-B, rejected): propagates a new vocabulary value through every consumer (status, finalizing, resume, guard) to express what "done with recorded failures" already says; pwk-finalizing's branches were designed for exactly this case and only needed to be reachable.
- **Demote the setup checkpoint to a pre-flight step** (Q3-B, rejected): saves one stop but loses the informed approval ADR 0006 kept deliberately; the real bug was the recording order, not the stop.
- **Single-writer Done column** — code-review reports verdicts, executing-tasks applies all transitions (Q6-A, rejected): adds a hand-off step to every inline review for a human-invisible detail; the actual defect was vocabulary drift, fixed by scoping writers instead.
- **`git merge-base <default-branch> HEAD` for packet base** (Q7-B, rejected): cannot scope per-requirement packets, assumes a default-branch name, and leaves the Commit column forever unfilled.
- **One-directional diagnose hook** (Q8-A, rejected): executing-tasks mandate alone leaves pwk-diagnose sessions returning without recording; one sentence closes the loop from both directions.

## Testing strategy

The kit's idiom is text-assertion plus recipe execution, and several pinned literals are load-bearing: the phase-value lists (`tests/pwk-status.test.ts`, `tests/human-review-digests.test.ts`), the `FA_CMD` sed string (`tests/review-packet.test.ts`), the At-a-glance table header (`tests/markers.mjs`), and the checkpoint-count claims (lean-gates criteria sweep). Every rewording moves its pins in the same requirement, never after. New coverage: R5's tag-from-template fixture, R6's disposal-glob pin, R7's parity section, R8's commit-span fixtures. The feature acceptance below is the end-to-end definition of done; the executor turns each scenario into the nearest executable form this kit supports.

## Feature acceptance

1. **Green gates after repair.** Given the repo with all 15 defects, when the batch lands, then `npm run check` is green — every moved pin passes, the new parity lint passes, and no stale vocabulary survives a grep for the phantom values (`🔎 review`, plan-phase terms, bare `<merge-base>`).
2. **Packet terminates on conformant docs.** Given a design doc rendered from the fixed template (tagged FA section, derived Risk column), when the packet recipe runs, then the FA span terminates at `### Feature review` and the packet bases come from the Commit column.
3. **Failure branches are reachable.** Given a progress file with `✅`/`❌(reason)`/`⏭(reason)` rows and `Feature phase: done`, when finalizing runs, then the `❌` block demands `--force-failed`, the `⏭`-only case warns, and both complete — no dead branch; pwk-status reports `done` with counts.
4. **Setup survives a crash.** Given a `## Setup` design and a fresh run that dies before checkpoint approval, when a resume starts, then it re-runs setup verification (the `Setup: pending` header is the signal), and pwk-status showed `awaiting setup` before the crash.

### Feature review
- parallel

---

*Seed disposal: `docs/plans/2026-09-11-workflow-consistency-notes.md` is consumed by this doc and is disposed at finalize via the R6 glob addition.*
