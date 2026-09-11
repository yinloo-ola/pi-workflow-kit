# Review packet: workflow-consistency — feature review

## Commits
d33311d docs: record R1-R9 commit hashes in progress
14be433 feat(R9): diagnose-execution recording hook both directions (F15)
4135831 style: biome format new test files (R5/R6/R7 additions)
9552525 feat(R8): packet base defined from the Commit column (F12)
0405342 feat(R7): doc-inventory parity lint kills drift in CI (F14)
360822d feat(R6): inventory doc parity sweep (F7-F11 + recon extras)
f6df5f9 feat(R5): FA template renders its review tag + lint pin (F6)
86f6803 feat(R4): derived At-a-glance Risk column is display-only (F5)
d488253 feat(R3): setup checkpoint made implementable (F2, F3)
a3a1bac fix(R2): apply slice-review findings + ADR 0007
9380ad3 feat(R2): terminal-state ship gate, reachable failure branches (F1, F13)
3f27184 feat(R1): canonical row-state and ceremony vocabulary, scoped writers (F4)

## Changed files
 README.md                                          |  16 +-
 docs/adr/0007-resolved-requirements-ship-gate.md   |  45 ++++
 docs/developer-usage-guide.md                      |  12 +-
 docs/oversight-model.md                            |  13 +-
 .../2026-09-11-workflow-consistency-progress.md    |  42 ++--
 ...-09-11-workflow-consistency-review-packet-r2.md | 199 ++++++++++++++++++
 docs/provider-delegation-contract.md               |   2 +-
 docs/workflow-phases.md                            |  12 +-
 skills/pwk-brainstorming/SKILL.md                  |   4 +-
 skills/pwk-code-review/SKILL.md                    |  10 +-
 skills/pwk-diagnose/SKILL.md                       |   1 +
 skills/pwk-executing-tasks/SKILL.md                |  43 ++--
 skills/pwk-status/SKILL.md                         |   4 +-
 tests/markers.mjs                                  |  55 +++++
 tests/review-cost-optimization.test.ts             |   2 +-
 tests/review-packet.test.ts                        |   5 +-
 tests/skill-lint.mjs                               |  82 ++++++++
 tests/workflow-consistency.e2e.test.ts             | 153 ++++++++++++++
 tests/workflow-consistency.test.ts                 | 226 +++++++++++++++++++++
 19 files changed, 863 insertions(+), 63 deletions(-)

## Acceptance criteria (verbatim from the design doc)
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


## Feature acceptance (verbatim)
## Feature acceptance

1. **Green gates after repair.** Given the repo with all 15 defects, when the batch lands, then `npm run check` is green — every moved pin passes, the new parity lint passes, and no stale vocabulary survives a grep for the phantom values (`🔎 review`, plan-phase terms, bare `<merge-base>`).
2. **Packet terminates on conformant docs.** Given a design doc rendered from the fixed template (tagged FA section, derived Risk column), when the packet recipe runs, then the FA span terminates at `### Feature review` and the packet bases come from the Commit column.
3. **Failure branches are reachable.** Given a progress file with `✅`/`❌(reason)`/`⏭(reason)` rows and `Feature phase: done`, when finalizing runs, then the `❌` block demands `--force-failed`, the `⏭`-only case warns, and both complete — no dead branch; pwk-status reports `done` with counts.
4. **Setup survives a crash.** Given a `## Setup` design and a fresh run that dies before checkpoint approval, when a resume starts, then it re-runs setup verification (the `Setup: pending` header is the signal), and pwk-status showed `awaiting setup` before the crash.


## Production-risk notes (verbatim, if any)

## Diff
diff --git a/README.md b/README.md
index 95fba91..b8986c6 100644
--- a/README.md
+++ b/README.md
@@ -1,8 +1,8 @@
 # pi-workflow-kit
 
-> Stop AI agents from rushing to code. Enforce a structured brainstorm→plan→execute→finalize workflow with test-first discipline and a feature-gate execution model.
+> Stop AI agents from rushing to code. Enforce a structured design → execute → finalize workflow with test-first discipline and a feature-gate execution model.
 
-AI coding agents tend to skip design and jump straight into implementation, producing over-engineered or misaligned code. **pi-workflow-kit** solves this by hard-blocking write operations during brainstorm and planning phases — the agent *literally cannot modify your source files* until you approve the design.
+AI coding agents tend to skip design and jump straight into implementation, producing over-engineered or misaligned code. **pi-workflow-kit** solves this by hard-blocking write operations during the design phase — the agent *literally cannot modify your source files* until you approve the design.
 
 [pi](https://github.com/badlogic/pi-mono) package. Skills are portable; the workflow guard and `/pwk-setup` command are Pi integrations.
 
@@ -18,7 +18,7 @@ For Pi delegation providers that discover project agents, install the canonical
 /pwk-setup
 ```
 
-This creates the five role definitions under `.agents/agents/`. It does not install or configure a provider. Existing customized files are preserved; use `/pwk-setup --force` only when you explicitly want to replace differing role files. Run setup before `/skill:pwk-brainstorming`; the command is refused during brainstorm and plan phases.
+This creates the five role definitions under `.agents/agents/`. It does not install or configure a provider. Existing customized files are preserved; use `/pwk-setup --force` only when you explicitly want to replace differing role files. Run setup before `/skill:pwk-brainstorming`; the command is refused during the design phase.
 
 Optionally set a fast-tier model for the smell/hazard reviewers (they carry `thinking: low` and a turn budget by default): `/pwk-setup --fast-model <model>` — or pick one interactively when setup offers — and `--all-roles` to apply it to all four reviewers. The hint is advisory; hosts that cannot honor it keep the default model. Bare re-runs keep the recorded choice; only `--force` replaces local edits beyond the model line.
 
@@ -51,11 +51,12 @@ Enforces phase-appropriate tool access — not just guidelines, but hard blocks:
 | Phase | `write` / `edit` | `bash` |
 |-------|:-:|:-:|
 | **Design** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
-| **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Status** | ✅ Full access | ✅ Full access |
+| **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Walkthrough** | ✅ Full access | ✅ Full access |
+| **Status** | ✅ Full access (read-only orientation) | ✅ Full access (read-only orientation) |
 
 The agent can read code and discuss design with you during the design phase, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.
 
-Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose` (all need source writes); `pwk-status` deliberately stays gated (read-only orientation). The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.
+Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → read-only; `/skill:pwk-executing-tasks` → unrestricted) — no message keyword unlocks the guard. Unlocking skills: `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, `pwk-walkthrough` (all write beyond `docs/plans/`, so all exit the gate); `pwk-status` stays read-only and runs inside the gate. The canonical list is the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts`, lint-asserted against the skills by `npm run check`. Need to override it? `/pwk-guard on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. The subcommands autocomplete after the command.
 
 ### 🧠 7 Workflow Skills
 
@@ -130,10 +131,11 @@ No configuration needed — the agent creates `docs/lessons.md` on first use and
 
 ### One Feature-Level Checkpoint
 
-The feature-gate flow has **one hard human-review gate** (not optional):
+The feature-gate flow's hard human-review gates (not optional) — **two hard stops when the design carries `## Setup`** (setup + ship), otherwise one (ship):
 
 | Checkpoint | What's done | What you review |
 |---|---|---|
+| **setup** *(only when the design has a `## Setup` section)* | Dependencies installed, migrations applied, existing suite run | Setup results — approve before implementation starts |
 | **ship** | All requirements implemented; full suite + E2E green; feature review collected | Execution summary + code digest + per-requirement coverage table — built as promised? (full diff on request) |
 
 The agent stops and waits there — approve, request changes, or send it back. The feature-acceptance E2E is still written first and still gated at the ship checkpoint; it is reported before implementation without pausing, because its text was approved as `## Feature acceptance` during brainstorm.
@@ -158,7 +160,7 @@ pi install npm:@tianhai/pi-workflow-kit
 
 > /skill:pwk-executing-tasks
 
-# (feature-gate: creates the branch, writes feature E2E → checkpoint → implements the blocks → checkpoint → feature review)
+# (feature-gate: creates the branch → setup stop when the design carries `## Setup` → writes feature E2E → notice → implements the blocks → feature review → ship checkpoint)
 
 > /skill:pwk-finalizing
 
diff --git a/docs/adr/0007-resolved-requirements-ship-gate.md b/docs/adr/0007-resolved-requirements-ship-gate.md
new file mode 100644
index 0000000..5a14d27
--- /dev/null
+++ b/docs/adr/0007-resolved-requirements-ship-gate.md
@@ -0,0 +1,45 @@
+# ADR 0007: `done` means resolved — finalizing is the failure authority
+
+Date: 2026-09-11
+
+## Context
+
+The ship gate required every requirement's Done cell to be `✅`, but the failure and
+skip paths mark rows `❌`/`⏭`. A feature with any failed or skipped requirement could
+therefore never reach `Feature phase: done`, which made pwk-finalizing's `❌`-block,
+`⏭`-warn, and `--force-failed` branches dead code (audit F1, the P0 of the
+workflow-consistency batch). The resume rule had the same blind spot: any non-`✅` row
+routed as "next", so a resume walked back into an already-failed requirement.
+
+## Decision
+
+`Feature phase: done` means **execution complete — every row terminal** (`✅` passed,
+`❌` failed with reason, `⏭` skipped with reason), not "all passed". The ship digest
+lists every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
+the phase is set only after that informed approval. **pwk-finalizing stays the failure
+authority**: its pre-existing block/warn/`--force-failed` branches — unchanged — become
+reachable exactly as designed. `pwk-status` renders `done` with verdict counts
+(`done (1 ❌ · 1 ⏭)`) and hints that finalizing will require `--force-failed` while
+`❌` rows stand. Marking a row terminal includes reconciling its E2E coverage (assertions
+removed or skipped with the reason in the same step), so the green-suite gates stay
+meaningful. An umbrella's gate is per-part; finalizing reads every part's file and a
+`❌` in any part blocks the whole umbrella.
+
+## Rejected alternative
+
+A new `partial` phase for completed-with-failures features. It would propagate a new
+vocabulary value through every consumer (pwk-status, pwk-finalizing, resume routing,
+guard, docs) to express what "done with recorded, surfaced failures" already says — and
+pwk-finalizing's branches were designed for exactly this case; they only needed to be
+reachable. Rejected as vocabulary churn with no new information.
+
+## Consequences
+
+- A design can ship with failed requirements, but only through an explicit human path:
+  informed approval at the ship checkpoint, then an explicit `--force-failed` (or
+  `⏭`-confirmation) at finalize. Nothing ships silently — the digest's verdict rows and
+  the status counts are the visible surface, pinned by tests.
+- Resume routing keys on "terminal", not "passed": `✅`/`❌`/`⏭` are skipped past; only
+  `⬜`/`🔄`/blank route the next requirement.
+- Legacy 1.x features (implementation-doc flow) are unaffected: they never had a
+  Feature-phase gate.
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index 83f9985..ae6eeb7 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -2,10 +2,12 @@
 
 How to install and use `pi-workflow-kit` with Pi, and how its workflow roles map to other agent hosts.
 
+The kit enforces a design → execute → finalize workflow: one buildable design doc per feature, executed through the feature gate, shipped once.
+
 ## What you get
 
 - **4 pipeline skills** — brainstorm → executing-tasks → finalizing, with code-review running at the feature level during execution.
-- **2 utility skills** — diagnose (debugging) and status (multi-topic overview), both on demand.
+- **3 utility skills** — diagnose (debugging), status (multi-topic overview), and walkthrough (on-demand explainer), all invoked on demand.
 - **1 extension** — hard-blocks source writes during the design phase, and blocks destructive bash via a simple common-blacklist.
 
 ## Installation
@@ -46,7 +48,7 @@ Before entering the gated phase in Pi, optionally install the canonical role def
 /pwk-setup
 ```
 
-The command creates `.agents/agents/` and installs the five PWK roles. It preserves differing files unless `--force` is supplied and is refused during brainstorm and plan phases. It does not install a delegation provider.
+The command creates `.agents/agents/` and installs the five PWK roles. It preserves differing files unless `--force` is supplied and is refused during the design phase. It does not install a delegation provider.
 
 ```
 /skill:pwk-brainstorming
@@ -62,7 +64,7 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with
 /skill:pwk-executing-tasks
 ```
 
-Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **report it (no stop)** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. One mandatory checkpoint (ship) at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
+Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **report it (no stop)** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. Two hard stops when the design carries `## Setup` (setup + ship); otherwise one (ship) at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
 
 ### 3. Code review (feature level)
 
@@ -110,7 +112,7 @@ The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit`
 
 - **During the design phase**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
 - **During executing-tasks, code-review, finalizing, diagnose**: no restrictions.
-- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`; `pwk-status` stays gated. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
+- **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, `pwk-walkthrough` (walkthrough writes explainer output under `docs/walkthroughs/`); `pwk-status` stays read-only and runs inside the gate. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
 
 The destructive blacklist covers common file-mutating vectors (redirects, `tee`, `cp`/`mv`/`touch`/`rm`, `git commit`/`apply`, `npm install`, in-place editors like `sed -i`/`perl -i`, `patch`, `find -delete`). Exotic vectors (interpreter escapes like `node -e`, `python -c`, `| bash`) rely on the phase reminder — the guard is advisory, not a security boundary.
 
@@ -124,6 +126,6 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
 
 - Start with brainstorming for anything non-trivial.
 - The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
-- The feature-gate flow has **one** mandatory checkpoint (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
+- The feature-gate flow has two hard stops when the design carries `## Setup` (setup + ship), otherwise one (ship): the E2E is written and reported before implementation without pausing (its content was approved as `## Feature acceptance` during brainstorm), and the ship checkpoint signs off the finished implementation (digest + coverage, diff on request).
 - **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`, default `none` — the acceptance criteria were approved at design time, so there is no per-requirement correctness stop) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The risk-scaled feature-level `### Feature review` covers the whole diff. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Nothing is tagged silently: **only the human tags** a requirement for a per-requirement review, and the always-on feature-level `### Feature review` covers what is left.
 - Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
diff --git a/docs/oversight-model.md b/docs/oversight-model.md
index f8e8454..391eeb2 100644
--- a/docs/oversight-model.md
+++ b/docs/oversight-model.md
@@ -2,19 +2,22 @@
 
 `pi-workflow-kit` combines **skills** and **one extension**.
 
+The kit enforces a design → execute → finalize workflow: one buildable design doc per feature, executed through the feature gate, shipped once.
+
 ## Skills
 
-Skills teach the agent the workflow. There are 5 pipeline skills:
+Skills teach the agent the workflow. There are 4 pipeline skills plus 3 utility skills:
 
 - **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
-- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, report it (no stop), implement the design doc's `### R<n>` requirement blocks, then one risk-scaled feature-level review before the **ship checkpoint** (execution summary + code digest + coverage table presented for approval; full diff on request); one mandatory checkpoint (ship), per-requirement ceremony opt-in
+- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, report it (no stop), implement the design doc's `### R<n>` requirement blocks, then one risk-scaled feature-level review before the **ship checkpoint** (execution summary + code digest + coverage table presented for approval; full diff on request); two hard stops when the design carries `## Setup` (setup + ship), otherwise one (ship), per-requirement ceremony opt-in
 - **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review resolves the design's `### Feature review` tag (`auto` by default): four logical fresh-context, read-only roles when the design carries production-risk content, otherwise one inline pass. successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
 - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
 
-Plus 2 on-demand skills:
+Plus 3 on-demand utility skills:
 
 - **pwk-status** — read-only overview of all active design topics (phase + progress), for resuming or juggling parallel designs
 - **pwk-diagnose** — 6-phase debugging loop, invoked anytime something is broken
+- **pwk-walkthrough** — on-demand explainer; renders a file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md`, regenerated wholesale, never disposed
 
 They explain *what* to do and *when* to do it. Phase control is manual — you invoke each skill with `/skill:`; the agent never advances on its own.
 
@@ -22,7 +25,7 @@ They explain *what* to do and *when* to do it. Phase control is manual — you i
 
 The `workflow-guard` extension registers the Pi-only `/pwk-setup` command and enforces one workflow rule:
 
-> During brainstorm and plan phases, `write` and `edit` are **hard-blocked** outside `docs/plans/`.
+> During the design phase, `write` and `edit` are **hard-blocked** outside `docs/plans/`.
 
 The agent can still use `read` and `bash` for investigation. During those gated phases, `bash` is governed by a simple destructive-command blacklist (`rm`, `>`, `git commit`, `npm install`, in-place editors, etc.) — a command is allowed unless it matches a destructive pattern. A short phase reminder is shown once when the gated phase begins so the model self-restricts.
 
@@ -30,7 +33,7 @@ During executing-tasks, code-review, finalizing, **and diagnose**, nothing is re
 
 Canonical role contracts live in `agents/pwk-*.md` (single source of truth) and can be installed into `.agents/agents/` with `/pwk-setup`. `pwk-executing-tasks` requests logical review roles through the host’s delegation capabilities and passes each role a one-liner pointer to a script-assembled review packet — the packet defines the scope per review level (feature review: the whole feature diff; per-requirement: just that slice).
 
-Phases follow the skill you invoke — there is no message-keyword unlock. Invoking `/skill:pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, or `pwk-diagnose` exits the gated phase (those skills write source); `pwk-status` deliberately does **not** (read-only orientation). `/pwk-guard on|off|auto` manually overrides the guard.
+Phases follow the skill you invoke — there is no message-keyword unlock. Invoking `/skill:pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`, or `pwk-walkthrough` exits the gated phase (those skills write — walkthrough writes its explainer output under `docs/walkthroughs/`); `pwk-status` deliberately does **not** (read-only orientation). `/pwk-guard on|off|auto` manually overrides the guard.
 
 ## Enforcement style
 
diff --git a/docs/plans/2026-09-11-workflow-consistency-progress.md b/docs/plans/2026-09-11-workflow-consistency-progress.md
index dcb71c0..67df9bb 100644
--- a/docs/plans/2026-09-11-workflow-consistency-progress.md
+++ b/docs/plans/2026-09-11-workflow-consistency-progress.md
@@ -4,34 +4,38 @@ Design: docs/plans/2026-09-11-workflow-consistency-design.md
 Branch: workflow-consistency
 Started: 2026-09-11T07:16:58Z
 Last updated: 2026-09-11T07:16:58Z
-Feature phase: e2e-written
+Feature phase: implementing (9/9)
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
-| 1 | ⬜ | One row-state and ceremony vocabulary | — | — |
-| 2 | ⬜ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | — |
-| 3 | ⬜ | Setup checkpoint made implementable | — | — |
-| 4 | ⬜ | Derived At-a-glance Risk column | — | — |
-| 5 | ⬜ | Feature-acceptance template renders its review tag | — | — |
-| 6 | ⬜ | Inventory doc parity sweep | — | — |
-| 7 | ⬜ | Doc-inventory parity lint | — | — |
-| 8 | ⬜ | Packet base defined from the Commit column | — | — |
-| 9 | ⬜ | Diagnose ↔ execution recording hook | — | — |
+| 1 | ✅ | One row-state and ceremony vocabulary | — | 3f27184 |
+| 2 | ✅ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | 9380ad3 |
+| 3 | ✅ | Setup checkpoint made implementable | — | d488253 |
+| 4 | ✅ | Derived At-a-glance Risk column | — | 86f6803 |
+| 5 | ✅ | Feature-acceptance template renders its review tag | — | f6df5f9 |
+| 6 | ✅ | Inventory doc parity sweep | — | 360822d |
+| 7 | ✅ | Doc-inventory parity lint | — | 0405342 |
+| 8 | ✅ | Packet base defined from the Commit column | — | 9552525 |
+| 9 | ✅ | Diagnose ↔ execution recording hook | — | 14be433 |
 
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? |
 |----|-------------|------------------|-----------|
-| 1 | One row-state and ceremony vocabulary | | |
-| 2 | Terminal-state ship gate and reachable failure branches | | |
-| 3 | Setup checkpoint made implementable | | |
-| 4 | Derived At-a-glance Risk column | | |
-| 5 | Feature-acceptance template renders its review tag | | |
-| 6 | Inventory doc parity sweep | | |
-| 7 | Doc-inventory parity lint | | |
-| 8 | Packet base defined from the Commit column | | |
-| 9 | Diagnose ↔ execution recording hook | | |
+| 1 | One row-state and ceremony vocabulary | Canonical vocabulary block in pwk-executing-tasks's Progress-file section (5 Done glyphs + ceremony echo values, terminal=resolved rule, reason suffix); code-review's phantom 🔎 review value replaced with the canonical ✅ flip. | |
+| 2 | Terminal-state ship gate and reachable failure branches | Ship gate + digest + resume + status re-keyed on terminal rows; failure/skip paths name glyphs and reason suffixes; pwk-finalizing untouched and now reachable; ADR 0007 written. | E2E-reconciliation added at slice review (tracing #5): marking a row terminal also reconciles its test coverage |
+| 3 | Setup checkpoint made implementable | Progress file created before the checkpoint with a Setup: slot (pending if ## Setup else n/a); approval flips to done; resume re-verifies on pending; status renders awaiting setup; five count-claim doc sites reworded conditionally. | |
+| 4 | Derived At-a-glance Risk column | At-a-glance Risk column declared derived display-only (⚠ iff non-empty risk notes, else —); auto still reads notes only, at all three consumer sites. | |
+| 5 | Feature-acceptance template renders its review tag | FA fenced block gains its ### Feature review line; skill-lint pins the tag inside the fence so the gap stays closed; packet fixtures cover tag-present docs. | |
+| 6 | Inventory doc parity sweep | pwk-walkthrough in all four inventory docs + three unlock sites; stale 1.x counts/terminology/split ordering repaired; code-review half-migration finished; README guard table corrected; -notes.md disposal glob learned. | |
+| 7 | Doc-inventory parity lint | skill-lint gains an inventory-parity section: skill roster vs tree, UNLOCK_SKILLS vs prose sites, stated counts vs computed counts — drift fails CI both ways. | |
+| 8 | Packet base defined from the Commit column | Step 6 records the commit hash; feature packet bases on parent-of-first-Commit-entry, per-req spans chain previous-last → this-last; code-review scope mirrors; bare <merge-base> gone from executing. | |
+| 9 | Diagnose ↔ execution recording hook | Executing mandates mid-execution fixes as summary content with Deviated? marks at fix time; diagnose's closing phase records the fix in the progress file (one sentence both sides). | |
 
 ## Code digest
 
 <!-- Written once, after the feature review passes; never back-filled per requirement. -->
+
+### Deviation decision-record — R2: terminal rows reconcile their E2E coverage
+
+**What changed:** the design's failure/skip paths only named the glyph + reason suffix. At the R2 slice review the tracing reviewer found the untouched ship step 2 ("E2E must be green") would deadlock a feature with a `❌` row whose assertions stay red — a residual F1 shape. **Decision:** marking a row terminal (`❌`/`⏭`) now includes reconciling its test coverage in the same step — assertions removed or skipped with the reason; the suite must stay green; the ship digest's verdict rows surface what was waived. **Rejected:** waiving the green-E2E gate at the ship checkpoint (weakens the gate for every feature to serve the failure case) and a per-requirement E2E carve-out list (new bookkeeping for a case the verdict rows already expose). Recorded in the vocabulary block, the skip override, the failure path, and ship step 2; pinned by `coverageReconciled`.
diff --git a/docs/plans/2026-09-11-workflow-consistency-review-packet-r2.md b/docs/plans/2026-09-11-workflow-consistency-review-packet-r2.md
new file mode 100644
index 0000000..06aa067
--- /dev/null
+++ b/docs/plans/2026-09-11-workflow-consistency-review-packet-r2.md
@@ -0,0 +1,199 @@
+# Review packet: workflow-consistency — per-requirement review (R2)
+
+## Commits
+9380ad3 feat(R2): terminal-state ship gate, reachable failure branches (F1, F13)
+
+## Changed files
+ .../2026-09-11-workflow-consistency-progress.md    |  6 ++---
+ skills/pwk-executing-tasks/SKILL.md                | 13 ++++++-----
+ skills/pwk-status/SKILL.md                         |  2 +-
+ tests/markers.mjs                                  |  4 ++--
+ tests/workflow-consistency.test.ts                 | 26 ++++++++++++++++++++++
+ 5 files changed, 39 insertions(+), 12 deletions(-)
+
+## Acceptance criteria (verbatim from the design doc)
+### R2: Terminal-state ship gate and reachable failure branches
+
+**Defect:** F1 (P0) + F13. The ship gate (`pwk-executing-tasks:120`) requires every Done cell `✅`, but the failure path (`:231`) and the skip override (`:195`) mark rows `❌`/`⏭` — so a feature with any failed/skipped requirement can never reach `Feature phase: done`, making pwk-finalizing's `--force-failed` and `⏭`-warn branches dead code. The resume rule (`:80`) treats every non-`✅` row as "next", so a resume routes back into an already-failed requirement. `pwk-status` has no rendering for a completed-but-failed feature.
+
+**Change** (all in `skills/pwk-executing-tasks/SKILL.md` unless noted):
+
+- Ship gate: *"every requirement's Done cell is terminal — `✅`, `❌` (with reason), or `⏭` (with reason)"*.
+- Failure path and skip override: name their glyphs explicitly and mandate appending a short reason to the row (suffix on the Requirement cell).
+- Ship digest: **must list every `❌`/`⏭` row with its reason** — the stop stays fully informed; the phase is set to `done` only after the human approves knowing what failed.
+- Resume rule: only `⬜`/`🔄`/blank route the next requirement; `✅`/`❌`/`⏭` are resolved and are skipped past.
+- `pwk-status` (`skills/pwk-status/SKILL.md`): the `done` mapping renders counts (e.g. `done (1 ❌ · 1 ⏭)`) via bounded `grep -c` reads; when `❌` is present its ready-for-finalize hint appends that finalizing will require `--force-failed`.
+- pwk-finalizing: **unchanged** — its branches become reachable as already written.
+- Legacy `*-implementation.md` flow: explicitly stated unaffected (no Feature-phase gate in that flow).
+- Umbrella: stated that finalizing reads every part's progress file and the `❌`-in-any-part block rule applies across parts unchanged.
+- `docs/adr/0007-resolved-requirements-ship-gate.md`: written during execution, recording "done means resolved; finalizing is the failure authority" with the rejected `partial`-phase alternative.
+
+#### Production-risk notes
+
+This relaxes the gate the kit's users ship their own features through. If the ship digest fails to surface a failed row, incomplete work ships silently — that is the one place this batch can do real damage. The digest mandate must be pinned by tests, not left as prose goodwill.
+
+#### Acceptance criteria
+
+- **Given** the rewritten ship gate, **when** a design doc's requirements end `✅`/`❌(reason)`/`⏭(reason)`, **then** the executing skill reaches the ship checkpoint and the digest lists each failed/skipped row with its reason.
+- **Given** human approval of that digest, **when** the phase is set, **then** it is `Feature phase: done` and pwk-finalizing's `❌` block (or `⏭` warn) fires without modification.
+- **Given** a progress file with a `❌` row and `Feature phase: done`, **when** pwk-status renders the topic, **then** it shows `done` with the `❌` count and the `--force-failed` hint.
+- **Given** a resume over rows `✅`/`❌`/`⬜`, **when** the resume rule picks the next requirement, **then** it picks the `⬜` row, not the `❌` row.
+- **Given** the suite, **when** `npm run check` runs, **then** the phase-value pins (`tests/pwk-status.test.ts`, `tests/human-review-digests.test.ts`) and markers move with the new wording and pass.
+
+### Checkpoints
+- none
+
+### Review
+- parallel
+
+
+## Diff
+diff --git a/docs/plans/2026-09-11-workflow-consistency-progress.md b/docs/plans/2026-09-11-workflow-consistency-progress.md
+index 18ab66e..570e938 100644
+--- a/docs/plans/2026-09-11-workflow-consistency-progress.md
++++ b/docs/plans/2026-09-11-workflow-consistency-progress.md
+@@ -4,12 +4,12 @@ Design: docs/plans/2026-09-11-workflow-consistency-design.md
+ Branch: workflow-consistency
+ Started: 2026-09-11T07:16:58Z
+ Last updated: 2026-09-11T07:16:58Z
+-Feature phase: implementing (0/9)
++Feature phase: implementing (1/9)
+ 
+ ## Requirements
+ | # | Done | Requirement | Per-req ceremony | Commit |
+ |---|------|-------------|-----------------|--------|
+-| 1 | 🔄 | One row-state and ceremony vocabulary | — | — |
++| 1 | ✅ | One row-state and ceremony vocabulary | — | 3f27184 |
+ | 2 | ⬜ | Terminal-state ship gate and reachable failure branches | 🔎 parallel | — |
+ | 3 | ⬜ | Setup checkpoint made implementable | — | — |
+ | 4 | ⬜ | Derived At-a-glance Risk column | — | — |
+@@ -22,7 +22,7 @@ Feature phase: implementing (0/9)
+ ## Execution summary
+ | R# | Requirement | How it was built | Deviated? |
+ |----|-------------|------------------|-----------|
+-| 1 | One row-state and ceremony vocabulary | | |
++| 1 | One row-state and ceremony vocabulary | Canonical vocabulary block in pwk-executing-tasks's Progress-file section (5 Done glyphs + ceremony echo values, terminal=resolved rule, reason suffix); code-review's phantom 🔎 review value replaced with the canonical ✅ flip. | |
+ | 2 | Terminal-state ship gate and reachable failure branches | | |
+ | 3 | Setup checkpoint made implementable | | |
+ | 4 | Derived At-a-glance Risk column | | |
+diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
+index bb99e2b..7f1f2bc 100644
+--- a/skills/pwk-executing-tasks/SKILL.md
++++ b/skills/pwk-executing-tasks/SKILL.md
+@@ -77,10 +77,10 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
+ 
+ ## Resume
+ 
+-Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not `✅` routes the next requirement — `⬜`, `🔄`, and blank all mean not-done), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
++Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not terminal routes the next requirement — `⬜`, `🔄`, and blank all mean not-done; `✅`/`❌`/`⏭` are resolved and are skipped past), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
+ - `e2e-written` → write the E2E if not yet present, post the notice, and continue into the implement phase (no stop).
+ - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → post the notice and continue into the implement phase.
+-- `implementing (k/N)` → continue the next not-yet-✅ requirement.
++- `implementing (k/N)` → continue the next not-yet-terminal requirement.
+ - `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
+ - `ship-paused` → re-present the ship checkpoint and wait.
+ - legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.
+@@ -122,7 +122,7 @@ When a per-requirement checkpoint fires it is a **hard stop**:
+ 
+ ## Ship checkpoint (feature-complete + review, merged)
+ 
+-When every requirement's Done column is ✅:
++When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):
+ 
+ 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
+ 2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
+@@ -133,6 +133,7 @@ When every requirement's Done column is ✅:
+ 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
+    - a green-gates line: full suite green, feature E2E green;
+    - the **execution summary** — what each requirement became, deviations included;
++   - the **verdict rows** — list every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
+    - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
+    - the **coverage table** from the spec-reviewer report (one verdict row per R#);
+    - findings status: fixed / open for the human;
+@@ -183,7 +184,7 @@ PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # besid
+ - **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
+ - **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
+ 
+-On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`.
++On success, continue assembling the ship checkpoint; once the human approves it — knowing what failed — set `Feature phase: done`. (An umbrella part's gate is its own progress file; `pwk-finalizing` reads every part's file, and a `❌` in any part blocks the umbrella until the human sends the work back or explicitly types `--force-failed`.)
+ 
+ ## Tags reference
+ 
+@@ -197,7 +198,7 @@ The design doc tags each requirement and the feature level:
+ 
+ | User says | Agent does |
+ |-----------|-----------|
+-| `skip` | Mark current requirement skipped, move to next |
++| `skip` | Set its Done cell `⏭` (with the reason), move to next |
+ | `status` | Show the progress file (feature phase + requirement table) |
+ | `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
+ | `retry` | Re-read the requirement, start over |
+@@ -233,4 +234,4 @@ Feature phase: done
+ 1. Re-read the requirement's acceptance criteria — you may have drifted.
+ 2. Check `git log` for context. Ask the user — clarify beats guessing.
+ 3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
+-4. Mark the requirement failed with the reason and move on. Check `docs/lessons.md` — a prior lesson may apply.
++4. Set its Done cell `❌` (with the reason as a suffix in the Requirement cell) and move on. Check `docs/lessons.md` — a prior lesson may apply. (A legacy `*-implementation.md` feature has no Feature-phase gate; its failure handling is unchanged.)
+diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
+index 87e4147..10395f3 100644
+--- a/skills/pwk-status/SKILL.md
++++ b/skills/pwk-status/SKILL.md
+@@ -12,7 +12,7 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
+ 0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; if they differ, report both paths and stop — tell the user to restart the session at the repo root; never `cd` (a worktree root counts).
+ 1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, one list per suffix: `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived topics are not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
+ 2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. Map the line to the displayed state:
+-   - `done` → **`done`** — terminal, never shown as in-flight; append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`); at `done` every row is complete
++   - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when `grep -c '❌'` or `grep -c '⏭'` finds any (one bounded read each), render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
+    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
+    - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state)
+    - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
+diff --git a/tests/markers.mjs b/tests/markers.mjs
+index e383f75..3d01a04 100644
+--- a/tests/markers.mjs
++++ b/tests/markers.mjs
+@@ -130,8 +130,8 @@ export const WORKFLOW_CONSISTENCY_MARKERS = {
+   // R2 — terminal-state ship gate; finalizing stays the failure authority.
+   shipGateTerminal: "every requirement's Done cell is terminal",
+   digestListsVerdicts: "list every `❌`/`⏭` row with its reason",
+-  failedGlyphNamed: "set its Done cell `❌`",
+-  skippedGlyphNamed: "set its Done cell `⏭`",
++  failedGlyphNamed: "Set its Done cell `❌`",
++  skippedGlyphNamed: "Set its Done cell `⏭`",
+   resumeSkipsTerminal: "`✅`/`❌`/`⏭` are resolved",
+   knowingWhatFailed: "knowing what failed",
+   statusDoneCounts: "done (1 ❌ · 1 ⏭)",
+diff --git a/tests/workflow-consistency.test.ts b/tests/workflow-consistency.test.ts
+index 1c51f62..6088e96 100644
+--- a/tests/workflow-consistency.test.ts
++++ b/tests/workflow-consistency.test.ts
+@@ -35,4 +35,30 @@ describe("workflow-consistency per-slice", () => {
+       expect(codeReview).toContain("set the requirement's Done cell `✅`");
+     });
+   });
++
++  describe("R2 — terminal-state ship gate and reachable failure branches", () => {
++    it("the ship gate, failure/skip paths, and resume all speak the terminal vocabulary", () => {
++      const executing = read("skills/pwk-executing-tasks/SKILL.md");
++      expect(executing).toContain(M.shipGateTerminal);
++      expect(executing).toContain(M.failedGlyphNamed);
++      expect(executing).toContain(M.skippedGlyphNamed);
++      expect(executing).toContain(M.digestListsVerdicts);
++      expect(executing).toContain(M.knowingWhatFailed);
++      expect(executing).toContain(M.resumeSkipsTerminal);
++      expect(executing).not.toMatch(/continue the next not-yet-✅ requirement/);
++    });
++
++    it("status renders done with verdict counts and hints the force-failed path", () => {
++      const status = read("skills/pwk-status/SKILL.md");
++      expect(status).toContain(M.statusDoneCounts);
++      expect(status).toContain(M.statusForceFailedHint);
++    });
++
++    it("finalizing's consuming branches are untouched — the reachability fix is on the writing side", () => {
++      const finalizing = read("skills/pwk-finalizing/SKILL.md");
++      expect(finalizing).toContain("`❌ failed`");
++      expect(finalizing).toContain("`⏭ skipped`");
++      expect(finalizing).toContain("--force-failed");
++    });
++  });
+ });
diff --git a/docs/provider-delegation-contract.md b/docs/provider-delegation-contract.md
index 730328d..aa6e812 100644
--- a/docs/provider-delegation-contract.md
+++ b/docs/provider-delegation-contract.md
@@ -115,6 +115,6 @@ Providers may cache role definitions. Hosts should tell the user when `/reload`
 
 ## Safety boundary
 
-The provider is responsible for enforcing any capability it advertises. The role prompt is defense in depth, not a security boundary. The Pi workflow guard protects the main Pi session’s brainstorm and plan phases; it does not automatically protect Claude Code or another host, and it does not replace delegated-worker tool restrictions.
+The provider is responsible for enforcing any capability it advertises. The role prompt is defense in depth, not a security boundary. The Pi workflow guard protects the main Pi session's design phase; it does not automatically protect Claude Code or another host, and it does not replace delegated-worker tool restrictions.
 
 The `/pwk-setup` installer itself is hardened in depth: it opens the target with `O_NOFOLLOW` and does every subsequent check, read, and write through that one descriptor (`fstat` regular-file check, content comparison, and post-write verification), so nothing swapped in on the path afterward can affect what is read or written. On platforms where `O_NOFOLLOW` is unavailable, a symlink swapped in before the initial open remains a narrow advisory window; setup is a user-invoked development command, not a security boundary.
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index c0d8486..b66251e 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -1,5 +1,7 @@
 # Workflow Phases
 
+The kit enforces a design → execute → finalize workflow. Each phase below names the skill that drives it:
+
 `pi-workflow-kit` has 4 pipeline skills plus 3 utility skills. You invoke each one explicitly with `/skill:`.
 
 ```
@@ -88,10 +90,18 @@ Not a pipeline phase. A utility skill invoked on demand when debugging is needed
 
 No write restrictions.
 
+## walkthrough
+
+```
+/skill:pwk-walkthrough
+```
+
+Not a pipeline phase. An on-demand utility skill that generates a detailed, file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md` — Summary / How it works / Key flows / Gotchas & invariants / Change map — stamped with the commit range, regenerated wholesale on re-run, never disposed. Invoking it **exits the gated phase** (it writes its explainer output under `docs/walkthroughs/`).
+
 ## Manual override
 
 `/pwk-guard on|off|auto` overrides the guard regardless of phase: `on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. Subcommands autocomplete. Use it as an escape hatch when the guard blocks something you genuinely need; phase transitions otherwise happen only via `/skill:` commands.
 
 ## Continuity across sessions
 
-A new session resumes by invoking the skill for the phase to continue. The skill globs `docs/plans/` for its artifact (progress file / plan doc), resumes the single match, or asks if several. Each resumption skill reports what it found on entry — no registry file needed; the `<topic>` slug in the filenames is the identity.
\ No newline at end of file
+A new session resumes by invoking the skill for the phase to continue. The skill globs `docs/plans/` for its artifact (progress file / design doc), resumes the single match, or asks if several. Each resumption skill reports what it found on entry — no registry file needed; the `<topic>` slug in the filenames is the identity.
\ No newline at end of file
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index c477306..d456085 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -91,7 +91,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
 
    - **No test-name lists.** The criteria are the test spec — the executor writes and names the actual tests red-green from them, so the doc contains no test-name lists and no R#-to-section mapping tables: the block structure is the map.
    - **Tag every requirement** — `### Checkpoints` (how many human stops: `none` = no per-requirement stop, the default — the feature gate covers it; `full` = tests + complete stops) and `### Review` (per-requirement review: `skip` = none, the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`. Flag `full` only where complex logic or the main part of the feature makes a human look at the slice worth the stop.
-   - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area is flagged in the At-a-glance risk column and carries its `### Production-risk notes`, but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
+   - **Nothing is tagged silently here; only the human tags a slice for review.** A requirement that touches a production-risk area carries its `### Production-risk notes` in the block and is flagged `⚠ production-risk` in the At-a-glance Risk column (the column is derived, **display-only**: `⚠ production-risk` if and only if the block carries non-empty `### Production-risk notes`, else `—` — never normative, never an input; `auto` reads the notes only), but its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose, leave the field at `skip`. An explicit human tag always wins, in both directions.
    - **No per-requirement spec stop, by design** — the acceptance criteria are approved right here, at design time; re-checking them mid-execution asks a question the human already answered. A legacy `spec` tag in an in-flight design doc resolves to `none`.
    - **Production-risk notes** — a requirement touching a production-risk area carries its notes inside the block. Risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
    - **Ordering** — dependencies come earlier in the list; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
@@ -106,6 +106,8 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    ## Feature acceptance
 
    - Given <starting state>, When <trigger>, Then <end-to-end outcome the feature promises>.
+
+   ### Feature review: auto | parallel | inline — the one whole-feature review; leave `auto` unless the human says otherwise.
    ```
 
    Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."
diff --git a/skills/pwk-code-review/SKILL.md b/skills/pwk-code-review/SKILL.md
index aa49699..bb8dffe 100644
--- a/skills/pwk-code-review/SKILL.md
+++ b/skills/pwk-code-review/SKILL.md
@@ -9,9 +9,9 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
 
 ## Process
 
-1. **Identify the scope** — in the feature-gate flow (the default), you review the **whole feature diff** at the feature-level review (`git diff <merge-base>...HEAD`); all acceptance criteria in the plan and the `## Feature acceptance` E2E are in scope. When invoked per-requirement (`Review: inline`/`parallel` on a tagged requirement), scope is just that requirement — read its acceptance criteria and integration tests from the plan doc, run `git log --oneline -5` and `git diff` to see what changed for it.
+1. **Identify the scope** — in the feature-gate flow (the default), you review the **whole feature diff** at the feature-level review (`git diff $FEATURE_BASE...HEAD` — the parent of the first Commit-column entry; see the executing skill's packet recipe); all acceptance criteria in the design doc and the `## Feature acceptance` E2E are in scope. When invoked per-requirement (`Review: inline`/`parallel` on a tagged requirement), scope is just that requirement — read its acceptance criteria from the design doc, run `git log --oneline -5` and `git diff` to see what changed for it.
 
-2. **🔍 Code tracing** — trace the new/changed code paths end-to-end against the integration tests. For each path: does data flow correctly from entry to the asserted outcome? Note any branch the tests don't exercise, any dead branch, any path where the trace breaks.
+2. **🔍 Code tracing** — trace the new/changed code paths end-to-end against the acceptance criteria and the feature E2E. For each path: does data flow correctly from entry to the asserted outcome? Note any branch the tests don't exercise, any dead branch, any path where the trace breaks.
 
 3. **📐 Spec alignment** — for each acceptance criterion, point to the code and the test that satisfy it. A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.
 
@@ -20,7 +20,7 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
    - Duplication
    - Missing seams / premature abstraction
    - Poor naming, magic values, dead code
-   Apply the fix, re-run the integration tests (must stay green), and commit. If a smell needs a refactor large enough to risk the requirement, **flag** it instead of applying.
+   Apply the fix, re-run the full suite (must stay green), and commit. If a smell needs a refactor large enough to risk the requirement, **flag** it instead of applying.
 
 5. **⚠️ Production hazard check** — audit the changed code against the high-risk hazards. For each, write `[SAFE]` (1-line justification) or `[TRIGGERED]` (concrete mitigation):
    1. **Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), or full-table loads filtered in memory.
@@ -33,7 +33,7 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
    Also check the design's `## Production-risk areas`, if any.
 
 6. **Report** — summarize: tracing findings, spec gaps, smells fixed (with commits), hazards `[TRIGGERED]`. Non-trivial findings become follow-up items — the user decides whether to address now or defer.
-7. **Mark done** — update the requirement's progress-file row from `🔎 review` to `✅ done`. Done means reviewed, not just committed.
+7. **Mark done** — set the requirement's Done cell `✅` (it was left `🔄` while under review; findings leave it `🔄`). Done means reviewed, not just committed.
 
 ## Principles
 
@@ -43,4 +43,4 @@ Review the code just implemented for a requirement. **Unlocked** — you may edi
 
 ## After the review
 
-Return to `/skill:pwk-executing-tasks` for the next requirement, or `/skill:pwk-finalizing` if all requirements are done.
\ No newline at end of file
+Return to `/skill:pwk-executing-tasks` for the next requirement, or `/skill:pwk-finalizing` if all requirements are done. (The human tagged this requirement at design approval when its `### Review` tag was set — keep the review focused on the tag's scope.)
\ No newline at end of file
diff --git a/skills/pwk-diagnose/SKILL.md b/skills/pwk-diagnose/SKILL.md
index bc5974d..b5e7ea4 100644
--- a/skills/pwk-diagnose/SKILL.md
+++ b/skills/pwk-diagnose/SKILL.md
@@ -54,6 +54,7 @@ Required before declaring done:
 - Original repro no longer triggers
 - Regression test passes (or absence of seam is documented)
 - All `[DEBUG-...]` instrumentation removed
+- If invoked mid-execution (an `implementing (k/N)` progress file exists), record the fix in the progress file's execution summary before returning to the executing skill.
 - Ask: what would have prevented this bug?
 - If the answer is a repeatable pattern, append a **generic** rule to `docs/lessons.md` (strip domain specifics) so future sessions catch it early.
 - If the bug was caused by an architectural problem (no good test seam, tangled callers, hidden coupling), suggest writing an ADR to `docs/adr/` capturing that insight
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index e785fa5..b77b2c0 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -20,14 +20,14 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 ## First run
 
 1. **Parse the design doc** — read every `### R<n>:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag in the `## Feature acceptance` section. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first. (Legacy plan doc: read `## Requirement N:` headings the same way.)
-2. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
-3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the design doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
+2. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the design doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
 
    ```markdown
    # Progress: <topic>
 
    Design: docs/plans/YYYY-MM-DD-<topic>-design.md
    Branch: <branch>
+   Setup: n/a
    Started: <ISO timestamp>
    Last updated: <ISO timestamp>
    Feature phase: e2e-written
@@ -71,28 +71,39 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 
    `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)
 
+   The `Setup:` header slot takes one of `Setup: pending | done | n/a` — the header starts `Setup: pending` when the design doc has a `## Setup` section, else `Setup: n/a`; the setup checkpoint below flips it to `done` on approval.
+
+3. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval, then set `Setup: done` in the progress-file header so a resume can confirm it rather than assume it.
+
 4. **Commit the design docs** — `git add docs/plans/ && git commit -m "docs: add design doc"`.
 5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, probe why before proceeding: the behavior may already exist, or the test may be asserting too little. If it still passes and the expected behavior looks wrong, **stop and present** rather than implementing against a wrong spec. Iterate it to green as you implement — fixing the implementation is the default, and you **stop and present only when you are genuinely blocked** (nothing you can do makes it pass, or the E2E itself is wrong). That stop is the reserved failure case; it is not the flow's default pause.
 6. **Notice, not a stop — report the E2E and continue.** Post 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), plus the E2E test and its failing output, then go straight into the implement phase **without waiting for approval** — the `## Feature acceptance` text was approved during brainstorm, so there is nothing new here for the human to sign off. The notice is the window to object *before* implementation starts: a human who sees the E2E asserting the wrong thing says so, and you revise, re-run, and re-notice. Keep `Feature phase: e2e-written`.
 
 ## Resume
 
-Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not `✅` routes the next requirement — `⬜`, `🔄`, and blank all mean not-done), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
+Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not terminal routes the next requirement — `⬜`, `🔄`, and blank all mean not-done; `✅`/`❌`/`⏭` are resolved and are skipped past), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs. Before routing: if the header reads `Setup: pending` and the design doc has a `## Setup` section, the setup checkpoint was never approved — re-run the setup verification and wait at it:
 - `e2e-written` → write the E2E if not yet present, post the notice, and continue into the implement phase (no stop).
 - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → post the notice and continue into the implement phase.
-- `implementing (k/N)` → continue the next not-yet-✅ requirement.
+- `implementing (k/N)` → continue the next not-yet-terminal requirement.
 - `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
 - `ship-paused` → re-present the ship checkpoint and wait.
 - legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.
 
 ## Progress file
 
-Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.
+Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change.
+
+**Row vocabulary (canonical — this file owns it):**
+
+- **Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. A `❌`/`⏭` row carries its reason as a suffix in the Requirement cell (finalizing's verdict greps read it), and its test coverage is reconciled in the same step — assertions removed or skipped with the reason; the suite must stay green. This skill sets all five values; the inline review path (`pwk-code-review`) only ever flips `🔄`→`✅` — findings leave the row `🔄`.
+- **Per-req ceremony cell** echoes the design doc's tag, not progress: `—` (default `none`/`skip`) · `⏸ tests` · `⏸ full` (fires two stops — after the slice's tests and after it is complete) · `🔎 inline` · `🔎 parallel`.
 
 **Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.
 
 ## Implement phase (after the E2E notice)
 
+Bugs found mid-execution (e.g. fixed via `pwk-diagnose`) are mandatory execution-summary content: record the fix in the requirement's `How it was built` cell and fill its Deviated? column at fix time — the summary must show what the feature actually cost to land.
+
 Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
 
 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
@@ -100,7 +111,7 @@ Set `Feature phase: implementing (0/N)` and work the requirements in listed orde
 3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full`, stop and present after the tests and again after the slice is complete. With the default `none`, show the red→green inline and proceed.
 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
-6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
+6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; record the requirement's commit hash in the Commit column; advance `Feature phase: implementing (k/N)`.
 
 ### Per-requirement review (opt-in)
 
@@ -117,10 +128,10 @@ When a per-requirement checkpoint fires it is a **hard stop**:
 
 ## Ship checkpoint (feature-complete + review, merged)
 
-When every requirement's Done column is ✅:
+When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):
 
 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
-2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
+2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. (A `❌`/`⏭` requirement's assertions were reconciled when its row went terminal, so a still-red E2E still means a requirement is missing or wrong.) If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
 3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
 4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
 
@@ -128,6 +139,7 @@ When every requirement's Done column is ✅:
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green;
    - the **execution summary** — what each requirement became, deviations included;
+   - the **verdict rows** — list every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
    - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
    - the **coverage table** from the spec-reviewer report (one verdict row per R#);
    - findings status: fixed / open for the human;
@@ -143,18 +155,19 @@ The old "integration gate" is gone — the feature E2E at the ship checkpoint *i
 
 This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag — exactly one per part, never once per requirement. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
 
-**Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
+**Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). The Commit column is the packet's source of truth for both spans: the feature packet base is `git rev-parse <first Commit-column entry>^` (the parent of the first recorded commit); a per-requirement packet spans from the previous requirement's last commit (exclusive) to this requirement's last commit (inclusive), with R1's exclusive bound being its own parent. No `merge-base` guessing, no default-branch knowledge. If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
 
 ```bash
 PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # beside the design doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
+FEATURE_BASE="$(git rev-parse $(grep -m1 -o '^| [0-9]* | [^|]* | [^|]* | [^|]* | [0-9a-f]\{7,\}' <progress file> | grep -o '[0-9a-f]\{7,\}' | head -1)^)"   # parent of the first recorded Commit-column entry
 {
   echo "# Review packet: <topic> — feature review"
   echo
   echo "## Commits"
-  git log --oneline <merge-base>..HEAD
+  git log --oneline $FEATURE_BASE..HEAD
   echo
   echo "## Changed files"
-  git diff --stat <merge-base>...HEAD
+  git diff --stat $FEATURE_BASE...HEAD
   echo
   echo "## Acceptance criteria (verbatim from the design doc)"
   sed -n '/^### R1/,/^## Feature acceptance/p' <design-doc path> | sed '/^## Feature acceptance/,$d'
@@ -167,7 +180,7 @@ PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # besid
   sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p' <design-doc path> | sed -E '/^(## |### R[0-9])/d'
   echo
   echo "## Diff"
-  git diff <merge-base>...HEAD
+  git diff $FEATURE_BASE...HEAD
 } > "$PACKET"
 ```
 
@@ -178,7 +191,7 @@ PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # besid
 - **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
 - **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
 
-On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`.
+On success, continue assembling the ship checkpoint; once the human approves it — knowing what failed — set `Feature phase: done`. (An umbrella part's gate is its own progress file; `pwk-finalizing` reads every part's file, and a `❌` in any part blocks the umbrella until the human sends the work back or explicitly types `--force-failed`.)
 
 ## Tags reference
 
@@ -192,7 +205,7 @@ The design doc tags each requirement and the feature level:
 
 | User says | Agent does |
 |-----------|-----------|
-| `skip` | Mark current requirement skipped, move to next |
+| `skip` | Set its Done cell `⏭` (with the reason), reconcile its test coverage, move to next |
 | `status` | Show the progress file (feature phase + requirement table) |
 | `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
 | `retry` | Re-read the requirement, start over |
@@ -228,4 +241,4 @@ Feature phase: done
 1. Re-read the requirement's acceptance criteria — you may have drifted.
 2. Check `git log` for context. Ask the user — clarify beats guessing.
 3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
-4. Mark the requirement failed with the reason and move on. Check `docs/lessons.md` — a prior lesson may apply.
+4. Set its Done cell `❌` (with the reason as a suffix in the Requirement cell), reconcile its test coverage, and move on. Check `docs/lessons.md` — a prior lesson may apply. (A legacy `*-implementation.md` feature has no Feature-phase gate; its failure handling is unchanged.)
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index 87e4147..fe01dcd 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -11,8 +11,8 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
 
 0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; if they differ, report both paths and stop — tell the user to restart the session at the repo root; never `cd` (a worktree root counts).
 1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, one list per suffix: `*-design.md`, `*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `*-progress.md`, `overview.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived topics are not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
-2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. Map the line to the displayed state:
-   - `done` → **`done`** — terminal, never shown as in-flight; append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`); at `done` every row is complete
+2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` (with `## Setup` in the design doc) renders the topic as **`awaiting setup`** — the setup checkpoint was never approved — ahead of any phase-derived state below. Map the line to the displayed state:
+   - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count (e.g. `grep -c '^| [0-9]' <file>`) — and when a scoped table-row count finds any — `grep -c '^| [0-9].*❌'` / `grep -c '^| [0-9].*⏭'` (one bounded read each; table rows only, so digest or summary mentions of the glyphs do not inflate the count) — render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
    - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state)
    - `feature-spec-paused` (legacy — a progress file from before the notice replaced the stop) → `execute 0/N`
diff --git a/tests/markers.mjs b/tests/markers.mjs
index 34791ac..49a8ef2 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -111,6 +111,61 @@ export const LEAN_GATES_MARKERS = {
   flowSurfaced: "surfaced",
 };
 
+/**
+ * Markers for the workflow-consistency feature (F1–F15 audit batch): the canonical
+ * row-state + ceremony vocabulary, the terminal-state ship gate (done = resolved,
+ * finalizing stays the failure authority), the implementable setup checkpoint, the
+ * derived display-only Risk column, the FA template's own tag, inventory doc parity
+ * + parity lint, the Commit-column packet base, and the diagnose recording hook.
+ * Same contract as DIGEST_MARKERS — one canonical string per behavior, shared by
+ * skill-lint and the vitest suites. Each marker distinguishes the new shape from the
+ * old (e.g. `terminal` vs the all-✅ gate, `Commit column` vs bare `<merge-base>`).
+ */
+export const WORKFLOW_CONSISTENCY_MARKERS = {
+  // R1 — one canonical row-state + ceremony vocabulary, scoped writers.
+  rowStates: "`⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped",
+  ceremonyEcho: "echoes the design doc's tag",
+  fullTwoStops: "fires two stops",
+  codeReviewScoped: "only ever flips `🔄`→`✅`",
+  // R2 — terminal-state ship gate; finalizing stays the failure authority.
+  shipGateTerminal: "every requirement's Done cell is terminal",
+  digestListsVerdicts: "list every `❌`/`⏭` row with its reason",
+  failedGlyphNamed: "Set its Done cell `❌`",
+  skippedGlyphNamed: "Set its Done cell `⏭`",
+  resumeSkipsTerminal: "`✅`/`❌`/`⏭` are resolved",
+  resumeTerminalRoute: "continue the next not-yet-terminal requirement",
+  umbrellaBlockRule: "reads every part's file",
+  legacyFailureNote: "failure handling is unchanged",
+  reasonInShipGate: "`❌` (failed, reason in row)",
+  reasonSuffix: "as a suffix in the Requirement cell",
+  coverageReconciled: "assertions removed or skipped with the reason",
+  knowingWhatFailed: "knowing what failed",
+  statusDoneCounts: "done (1 ❌ · 1 ⏭)",
+  statusForceFailedHint: "will require `--force-failed`",
+  statusVerdictGrep: "grep -c '^| [0-9].*❌'",
+  // R3 — the setup checkpoint becomes implementable.
+  setupEnum: "Setup: pending | done | n/a",
+  setupPendingInit: "header starts `Setup: pending`",
+  setupApprovalFlip: "set `Setup: done`",
+  setupResumeRecheck: "re-run the setup verification",
+  statusAwaitingSetup: "awaiting setup",
+  conditionalStops: "two hard stops when the design carries `## Setup`",
+  // R4 — the At-a-glance Risk column is derived, display-only.
+  riskDerived: "`⚠ production-risk` if and only if",
+  riskDisplayOnly: "display-only",
+  // R6 — inventory parity + notes disposal.
+  notesDisposal: "????-??-??-<topic>-notes.md",
+  // R7 — the doc-inventory parity lint.
+  parityLint: "inventory parity",
+  // R8 — packet base from the Commit column.
+  commitColumnFill: "commit hash in the Commit column",
+  featureBaseRule: "parent of the first recorded commit",
+  perReqSpanRule: "previous requirement's last commit",
+  // R9 — the diagnose ↔ execution recording hook.
+  midFixMandated: "mandatory execution-summary content",
+  diagnoseReminder: "record the fix in the progress file",
+};
+
 /**
  * Markers for the code-digest feature: the ship-time code digest, the
  * completed/ exclusion on recursive discovery globs, and frontier-round
diff --git a/tests/review-cost-optimization.test.ts b/tests/review-cost-optimization.test.ts
index 1fe17aa..e08d2f6 100644
--- a/tests/review-cost-optimization.test.ts
+++ b/tests/review-cost-optimization.test.ts
@@ -70,7 +70,7 @@ describe("review cost optimization feature (E2E)", () => {
     // and spawns reviewers with one-liner pointers; per-requirement reviews mirror it.
     const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
     expect((executing.match(/review-packet\.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
-    expect(executing).toMatch(/git diff <merge-base>\.\.\.HEAD/);
+    expect(executing).toMatch(/git diff \$FEATURE_BASE\.\.\.HEAD/);
     expect(executing).toMatch(/review-packet\.md[\s\S]{0,600}(your role|role framing|role tail)/i);
     expect(executing).toMatch(
       /per-requirement[\s\S]{0,600}review-packet\.md|review-packet\.md[\s\S]{0,600}per-requirement/i,
diff --git a/tests/review-packet.test.ts b/tests/review-packet.test.ts
index 2fdf5d3..062845f 100644
--- a/tests/review-packet.test.ts
+++ b/tests/review-packet.test.ts
@@ -13,6 +13,7 @@ const LEGACY_CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance
 const FA_CMD = "sed -n '/^## Feature acceptance/,/^### Feature review/p'";
 const NOTES_CMD = "sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p'";
 const NOTES_STRIP = "sed -E '/^(## |### R[0-9])/d'";
+const FEATURE_BASE_DEF = 'FEATURE_BASE="$(git rev-parse $(grep -m1 -o';
 
 /** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
 const DESIGN_FIXTURE = [
@@ -82,7 +83,9 @@ describe("review packet recipe", () => {
     expect(executing).toContain(LEGACY_CRITERIA_CMD);
     expect(executing).toContain(FA_CMD);
     expect(executing).toContain(NOTES_CMD);
-    expect(executing).toContain("git diff <merge-base>...HEAD");
+    expect(executing).toContain(FEATURE_BASE_DEF);
+    expect(executing).toContain("git diff $FEATURE_BASE...HEAD");
+    expect(executing).not.toMatch(/<merge-base>/);
     expect(executing).toMatch(/never appears in spawn arguments/i);
     expect(executing).toContain("verbatim from the design doc");
   });
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 759187a..c932b1f 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -175,6 +175,22 @@ if (legacySpecLine && /`none`/.test(legacySpecLine)) {
   fail("pwk-executing-tasks: must document the legacy `spec` → `none` migration on one line");
 }
 
+// F6 (workflow-consistency R5): the brainstorming template's fenced design block
+// must itself contain the `### Feature review` tag line — the packet FA_CMD sed
+// terminates on it, so a template-conformant doc with a tagless FA section silently
+// widened the FA span to EOF. Asserts the fence, not prose mentions.
+const FA_TEMPLATE_TAG = "### Feature review";
+console.log("feature-acceptance template tag (F6):");
+if (!bs) fail("pwk-brainstorming skill missing");
+else {
+  const mdFences = [...bs.content.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
+  const faFences = mdFences.filter((body) => /^ {0,3}## Feature acceptance\b/m.test(body));
+  if (faFences.length === 0) fail("pwk-brainstorming: no fenced template block contains `## Feature acceptance`");
+  else if (!faFences.every((body) => new RegExp(`^ {0,3}${FA_TEMPLATE_TAG}`, "m").test(body)))
+    fail("pwk-brainstorming template FA block missing `### Feature review` tag line");
+  else ok("pwk-brainstorming template FA block carries the `### Feature review` tag line");
+}
+
 // --- Check 5: Feature acceptance contract across the pipeline ---
 // brainstorm emits `## Feature acceptance` in the design doc; executing-tasks writes it
 // as the E2E and gates on it. Both must use the same section name so the contract is followable.
@@ -878,6 +894,72 @@ if (existsSync(wtPath)) {
 }
 
 // --- Summary ---
+// --- Inventory parity (workflow-consistency R7; kills doc drift in both directions) ---
+// The four inventory docs must name every skill directory under skills/, the unlock-prose
+// sites must list exactly the guard's UNLOCK_SKILLS, and the stated skill-count claims must
+// match the counts computed from the skills/ tree (pipeline vs utility). The skills/ tree
+// is the source of truth — a new skill dir without doc updates fails, and a doc claim
+// disagreeing with the computed count fails with both values shown.
+const INVENTORY_DOCS = [
+  "README.md",
+  "docs/oversight-model.md",
+  "docs/developer-usage-guide.md",
+  "docs/workflow-phases.md",
+];
+const UNLOCK_PROSE_SITES = ["README.md", "docs/oversight-model.md", "docs/developer-usage-guide.md"];
+const PIPELINE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-code-review", "pwk-finalizing"];
+const UTILITY_SKILLS = ["pwk-status", "pwk-diagnose", "pwk-walkthrough"];
+// The tree's complete roster — EXPECTED_SKILL_COUNT is these two lists merged; adding a
+// skill dir without extending the right list fails loudly (see roster check below).
+const EXPECTED_SKILL_COUNT = PIPELINE_SKILLS.length + UTILITY_SKILLS.length;
+console.log("inventory parity:");
+{
+  const skillDirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
+  const roster = [...PIPELINE_SKILLS, ...UTILITY_SKILLS].sort();
+  const treeNames = skillDirs.filter((d) => d.startsWith("pwk-")).sort();
+  if (treeNames.length !== EXPECTED_SKILL_COUNT)
+    fail(
+      `skills/ tree has ${treeNames.length} pwk-* dirs, EXPECTED_SKILL_COUNT is ${EXPECTED_SKILL_COUNT} (extend PIPELINE_SKILLS/UTILITY_SKILLS)`,
+    );
+  else if (JSON.stringify(treeNames) !== JSON.stringify(roster))
+    fail(`skills/ roster drift: tree [${treeNames.join(", ")}] vs lists [${roster.join(", ")}]`);
+  else ok(`skills/ roster {${roster.join(", ")}} matches EXPECTED_SKILL_COUNT (${EXPECTED_SKILL_COUNT})`);
+  const invDocs = INVENTORY_DOCS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")]);
+  for (const skill of roster) {
+    for (const [rel, content] of invDocs) {
+      if (!content.includes(skill)) fail(`inventory parity: ${rel} does not name ${skill}`);
+    }
+  }
+  if (failures === 0) ok(`inventory parity: every skill named in all ${INVENTORY_DOCS.length} inventory docs`);
+  for (const [rel, content] of UNLOCK_PROSE_SITES.map((r) => [r, readFileSync(join(root, r), "utf8")])) {
+    for (const skill of unlockSet) {
+      if (!content.includes(skill)) fail(`inventory parity: ${rel} unlock prose missing ${skill}`);
+    }
+  }
+  if (failures === 0)
+    ok(`inventory parity: unlock prose lists UNLOCK_SKILLS at all ${UNLOCK_PROSE_SITES.length} sites`);
+  const pipelineClaims = invDocs.flatMap(([rel, content]) =>
+    [...content.matchAll(/(\d+) pipeline skills?/gi)].map((m) => ({ rel, n: Number(m[1]) })),
+  );
+  const utilityClaims = invDocs.flatMap(([rel, content]) =>
+    [...content.matchAll(/(\d+) utility skills?/gi)].map((m) => ({ rel, n: Number(m[1]) })),
+  );
+  for (const { rel, n } of pipelineClaims) {
+    if (n !== PIPELINE_SKILLS.length)
+      fail(`inventory parity: ${rel} claims ${n} pipeline skills, tree has ${PIPELINE_SKILLS.length}`);
+  }
+  for (const { rel, n } of utilityClaims) {
+    if (n !== UTILITY_SKILLS.length)
+      fail(`inventory parity: ${rel} claims ${n} utility skills, tree has ${UTILITY_SKILLS.length}`);
+  }
+  if (pipelineClaims.length + utilityClaims.length === 0)
+    fail("inventory parity: no pipeline/utility count claims found in any inventory doc");
+  else if (failures === 0)
+    ok(
+      `inventory parity: count claims match the tree (${PIPELINE_SKILLS.length} pipeline + ${UTILITY_SKILLS.length} utility)`,
+    );
+}
+
 console.log("");
 if (failures === 0) {
   console.log("skill-lint: all checks passed");
diff --git a/tests/workflow-consistency.e2e.test.ts b/tests/workflow-consistency.e2e.test.ts
new file mode 100644
index 0000000..6561a8e
--- /dev/null
+++ b/tests/workflow-consistency.e2e.test.ts
@@ -0,0 +1,153 @@
+import { readFileSync } from "node:fs";
+import { readdirSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
+import { SINGLE_DOC_MARKERS, WORKFLOW_CONSISTENCY_MARKERS as WCM } from "./markers.mjs";
+
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const M = WCM;
+
+function read(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+/** Every skill directory under skills/ — the inventory docs must name them all. */
+function skillNames(): string[] {
+  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
+    .filter((entry) => entry.isDirectory())
+    .map((entry) => entry.name)
+    .filter((name) => name.startsWith("pwk-"))
+    .sort();
+}
+
+/** The design-doc template's fenced block containing the Feature acceptance section. */
+function brainstormTemplate(): string {
+  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
+  const fences = [...brainstorming.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
+  const withFa = fences.filter((body) => body.includes("## Feature acceptance"));
+  expect(withFa.length, "brainstorming template with ## Feature acceptance").toBeGreaterThan(0);
+  return withFa[0];
+}
+
+/**
+ * Feature acceptance for workflow-consistency (the F1–F15 audit batch).
+ *
+ * The deliverable is skill/document text, so the observable interface is the
+ * content the host loads (the kit's E2E idiom). Scenario 2 additionally executes
+ * the packet FA span against the template itself via the per-slice fixture in
+ * review-packet.test.ts (pinned FA_CMD) — both suites gate at the ship checkpoint.
+ */
+describe("workflow-consistency (feature E2E)", () => {
+  it("scenario 1 — green gates after repair: phantom vocabulary dies everywhere and the inventory docs match reality", () => {
+    const codeReview = read("skills/pwk-code-review/SKILL.md");
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+
+    // F4/F10 — the phantom row value and plan remnants are gone from code-review.
+    expect(codeReview).not.toMatch(/🔎 review/);
+    expect(codeReview).not.toMatch(/integration tests/);
+    expect(codeReview).toMatch(/acceptance criteria/);
+
+    // F12 — the packet recipe no longer uses a bare merge-base placeholder.
+    expect(executing).not.toMatch(/<merge-base>/);
+
+    // F9 — the public flow vocabulary is design → execute → finalize everywhere it is stated.
+    expect(read("README.md")).toContain(SINGLE_DOC_MARKERS.designFlow);
+    for (const rel of [
+      "README.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "docs/workflow-phases.md",
+      "docs/provider-delegation-contract.md",
+    ]) {
+      expect(read(rel), rel).not.toMatch(/plan phase/i);
+    }
+
+    // F7/F8 — every skill is present in every inventory doc, and each unlock-prose
+    // site lists the full UNLOCK_SKILLS set (source of truth: the guard export).
+    const names = skillNames();
+    expect(names.length).toBeGreaterThanOrEqual(7);
+    for (const rel of [
+      "README.md",
+      "docs/developer-usage-guide.md",
+      "docs/oversight-model.md",
+      "docs/workflow-phases.md",
+    ]) {
+      const doc = read(rel);
+      for (const name of names) {
+        expect(doc, `${rel} names ${name}`).toContain(name);
+      }
+    }
+    for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md"]) {
+      const doc = read(rel);
+      for (const skill of UNLOCK_SKILLS) {
+        expect(doc, `${rel} unlock prose includes ${skill}`).toContain(skill);
+      }
+    }
+
+    // F14 — the parity lint exists in skill-lint.
+    expect(read("tests/skill-lint.mjs")).toContain(WCM.parityLint);
+  });
+
+  it("scenario 2 — the packet terminates on template-conformant docs and bases come from the Commit column", () => {
+    // F6 — a design doc rendered verbatim from the brainstorming template carries
+    // its own ### Feature review tag, so the packet's FA sed terminates on it.
+    const template = brainstormTemplate();
+    expect(template).toMatch(/^\s*### Feature review/m);
+
+    // F12 — the recipe names the Commit column as the source of truth for both spans.
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+    expect(executing).toContain(WCM.commitColumnFill);
+    expect(executing).toContain(WCM.featureBaseRule);
+    expect(executing).toContain(WCM.perReqSpanRule);
+  });
+
+  it("scenario 3 — failure branches are reachable: done means resolved and finalizing stays the authority", () => {
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+    const finalizing = read("skills/pwk-finalizing/SKILL.md");
+    const status = read("skills/pwk-status/SKILL.md");
+
+    // F1 — the ship gate accepts terminal rows, and the paths that create them
+    // name their glyphs and surface them in the ship digest.
+    expect(executing).toContain(WCM.shipGateTerminal);
+    expect(executing).toContain(WCM.failedGlyphNamed);
+    expect(executing).toContain(WCM.skippedGlyphNamed);
+    expect(executing).toContain(WCM.digestListsVerdicts);
+    expect(executing).toContain(WCM.knowingWhatFailed);
+    expect(executing).toContain(WCM.resumeSkipsTerminal);
+
+    // The consuming side is already correct — finalizing blocks on ❌, warns on ⏭,
+    // and demands --force-failed; the gate stays `done`-keyed.
+    expect(finalizing).toContain("❌ failed");
+    expect(finalizing).toContain("⏭ skipped");
+    expect(finalizing).toContain("--force-failed");
+    expect(finalizing).toMatch(/must be `done`/);
+
+    // F13 — status renders done with counts and hints the force-failed path.
+    expect(status).toContain(WCM.statusDoneCounts);
+    expect(status).toContain(WCM.statusForceFailedHint);
+  });
+
+  it("scenario 4 — the setup checkpoint survives a crash: the header is the signal", () => {
+    const executing = read("skills/pwk-executing-tasks/SKILL.md");
+    const status = read("skills/pwk-status/SKILL.md");
+
+    // F2/F3 — the progress file exists before the checkpoint, carries a Setup slot,
+    // and the resume rule re-verifies on pending instead of assuming.
+    expect(executing).toContain(WCM.setupEnum);
+    expect(executing).toContain(WCM.setupPendingInit);
+    expect(executing).toContain(WCM.setupApprovalFlip);
+    expect(executing).toContain(WCM.setupResumeRecheck);
+
+    // Status renders the pre-approval state, and the inventory docs state the
+    // checkpoint count conditionally (two stops with ## Setup, one without).
+    expect(status).toContain(WCM.statusAwaitingSetup);
+    const claimedSomewhere = [
+      read("README.md"),
+      read("docs/developer-usage-guide.md"),
+      read("docs/oversight-model.md"),
+    ];
+    expect(claimedSomewhere.some((doc) => doc.includes(WCM.conditionalStops))).toBe(true);
+  });
+});
diff --git a/tests/workflow-consistency.test.ts b/tests/workflow-consistency.test.ts
new file mode 100644
index 0000000..0a33b6b
--- /dev/null
+++ b/tests/workflow-consistency.test.ts
@@ -0,0 +1,226 @@
+import { existsSync, readFileSync, readdirSync } from "node:fs";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
+import { WORKFLOW_CONSISTENCY_MARKERS as M } from "./markers.mjs";
+
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+
+function read(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+/** Every skill directory under skills/ — the inventory docs must name them all (R6 per-slice). */
+function skillNamesForR6(): string[] {
+  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
+    .filter((entry) => entry.isDirectory())
+    .map((entry) => entry.name)
+    .filter((name) => name.startsWith("pwk-"))
+    .sort();
+}
+
+/** The design-doc template's fenced block containing the Feature acceptance section (shared by R5 per-slice and the E2E). */
+function brainstormTemplateForR5(): string {
+  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
+  const fences = [...brainstorming.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
+  const withFa = fences.filter((body) => body.includes("## Feature acceptance"));
+  expect(withFa.length, "brainstorming template with ## Feature acceptance").toBeGreaterThan(0);
+  return withFa[0];
+}
+
+/**
+ * Per-slice tests for workflow-consistency (the F1–F15 audit batch). One describe
+ * per requirement; the feature E2E in workflow-consistency.e2e.test.ts covers the
+ * composed scenarios. Text-assertion is this kit's testing idiom: the skills are
+ * the deliverable, so their content is the public interface.
+ */
+describe("workflow-consistency per-slice", () => {
+  describe("R1 — one row-state and ceremony vocabulary", () => {
+    it("defines the five Done glyphs and the ceremony echo values in one canonical block", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.rowStates);
+      expect(executing).toContain(M.ceremonyEcho);
+      expect(executing).toContain(M.fullTwoStops);
+      expect(executing).toContain("`⏸ full`");
+      expect(executing).toContain("`🔎 parallel`");
+    });
+
+    it("scopes the writers: code-review only ever flips 🔄 to ✅", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      const codeReview = read("skills/pwk-code-review/SKILL.md");
+      expect(executing).toContain(M.codeReviewScoped);
+      expect(codeReview).not.toMatch(/🔎 review/);
+      expect(codeReview).toContain("set the requirement's Done cell `✅`");
+    });
+  }); // R1
+
+  describe("R2 — terminal-state ship gate and reachable failure branches", () => {
+    it("the ship gate, failure/skip paths, and resume all speak the terminal vocabulary", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.shipGateTerminal);
+      expect(executing).toContain(M.failedGlyphNamed);
+      expect(executing).toContain(M.skippedGlyphNamed);
+      expect(executing).toContain(M.digestListsVerdicts);
+      expect(executing).toContain(M.knowingWhatFailed);
+      expect(executing).toContain(M.resumeSkipsTerminal);
+      expect(executing).not.toMatch(/continue the next not-yet-✅ requirement/);
+    });
+
+    it("status renders done with verdict counts and hints the force-failed path", () => {
+      const status = read("skills/pwk-status/SKILL.md");
+      expect(status).toContain(M.statusDoneCounts);
+      expect(status).toContain(M.statusForceFailedHint);
+    });
+
+    it("finalizing's consuming branches are untouched — the reachability fix is on the writing side", () => {
+      const finalizing = read("skills/pwk-finalizing/SKILL.md");
+      expect(finalizing).toContain("`❌ failed`");
+      expect(finalizing).toContain("`⏭ skipped`");
+      expect(finalizing).toContain("--force-failed");
+    });
+
+    it("pins the resume route, umbrella, legacy, reason-suffix, and coverage-reconciliation contracts (tracing findings 1–3, 5)", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.resumeTerminalRoute);
+      expect(executing).toContain(M.umbrellaBlockRule);
+      expect(executing).toContain(M.legacyFailureNote);
+      expect(executing).toContain(M.reasonInShipGate);
+      expect(executing).toContain(M.reasonSuffix);
+      expect(executing).toContain(M.coverageReconciled);
+    });
+
+    it("scopes status verdict counts to Requirements-table rows; ADR 0007 exists (tracing findings 4, 6)", () => {
+      const status = read("skills/pwk-status/SKILL.md");
+      expect(status).toContain(M.statusVerdictGrep);
+      expect(existsSync(join(repoRoot, "docs/adr/0007-resolved-requirements-ship-gate.md"))).toBe(true);
+    });
+  });
+
+  describe("R3 — setup checkpoint made implementable", () => {
+    it("creates the progress file before the checkpoint and gives the header a Setup slot", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.setupEnum);
+      expect(executing).toContain(M.setupPendingInit);
+      expect(executing).toContain(M.setupApprovalFlip);
+      const createIdx = executing.indexOf("**Create the progress file**");
+      const setupIdx = executing.indexOf("**Setup pre-flight**");
+      expect(createIdx, "create-step must precede the setup checkpoint").toBeGreaterThan(-1);
+      expect(createIdx).toBeLessThan(setupIdx);
+    });
+
+    it("resume re-checks a pending setup and status renders the awaiting state", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      const status = read("skills/pwk-status/SKILL.md");
+      expect(executing).toContain(M.setupResumeRecheck);
+      expect(status).toContain(M.statusAwaitingSetup);
+    });
+
+    it("checkpoint-count claims are conditional across every doc site", () => {
+      for (const rel of ["README.md", "docs/oversight-model.md", "docs/developer-usage-guide.md"]) {
+        const doc = read(rel);
+        expect(doc, rel).toContain(M.conditionalStops);
+        expect(doc, rel).not.toMatch(/one mandatory checkpoint|one hard human-review gate/);
+      }
+    });
+  });
+
+  describe("R4 — derived At-a-glance Risk column", () => {
+    it("states the derivation rule and the display-only declaration exactly once", () => {
+      const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
+      expect(brainstorming).toContain(M.riskDerived);
+      expect(brainstorming).toContain(M.riskDisplayOnly);
+      const occurrences = brainstorming.split(M.riskDisplayOnly).length - 1;
+      expect(occurrences, "display-only declaration must be singular").toBe(1);
+    });
+  });
+
+  describe("R5 — feature-acceptance template renders its review tag", () => {
+    it("the brainstorming template's fenced FA block carries the Feature review tag line", () => {
+      const template = brainstormTemplateForR5();
+      expect(template).toMatch(/^\s*### Feature review/m);
+    });
+
+    it("skill-lint pins the tag in the template and the packet fixtures carry it", () => {
+      const lint = read("tests/skill-lint.mjs");
+      expect(lint).toContain("FA_TEMPLATE_TAG");
+      const reviewPacket = read("tests/review-packet.test.ts");
+      // the fixtures must exercise tag-present docs — the old tag-absent case is what let this defect survive.
+      expect(reviewPacket).toContain("### Feature review: parallel");
+    });
+  });
+
+  describe("R6 — inventory doc parity sweep", () => {
+    it("all seven skills appear in every inventory doc", () => {
+      const names = skillNamesForR6();
+      expect(names.length).toBe(7);
+      for (const rel of [
+        "README.md",
+        "docs/developer-usage-guide.md",
+        "docs/oversight-model.md",
+        "docs/workflow-phases.md",
+      ]) {
+        const doc = read(rel);
+        for (const name of names) {
+          expect(doc, `${rel} names ${name}`).toContain(name);
+        }
+        expect(doc, rel).not.toMatch(/5 pipeline skills|2 utility skills/);
+      }
+    });
+
+    it("each unlock-prose site lists exactly the UNLOCK_SKILLS members", () => {
+      for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md"]) {
+        const doc = read(rel);
+        for (const skill of UNLOCK_SKILLS) {
+          expect(doc, `${rel} unlock prose includes ${skill}`).toContain(skill);
+        }
+        expect(doc, rel).not.toMatch(/stays gated \(read-only orientation\)/);
+        expect(doc, rel).not.toMatch(/instruments the repo root/);
+      }
+    });
+
+    it("stale terminology is gone: plan-phase, plan remnants, guard-table Status row", () => {
+      const codeReview = read("skills/pwk-code-review/SKILL.md");
+      expect(codeReview).not.toMatch(/integration tests/);
+      expect(codeReview).toContain("acceptance criteria");
+      expect(codeReview).not.toMatch(/in the plan(?!ning)/);
+      expect(codeReview).not.toMatch(/the human tagged this requirement/);
+      for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/workflow-phases.md"]) {
+        expect(read(rel), rel).toMatch(/design → execute → finalize/);
+      }
+      const guide = read("docs/developer-usage-guide.md");
+      const diagnoseIdx = guide.indexOf("### Diagnose");
+      const walkthroughIdx = guide.indexOf("### Walkthrough");
+      expect(diagnoseIdx, "diagnose prose precedes the walkthrough block").toBeLessThan(walkthroughIdx);
+    });
+  });
+
+  describe("R7 — doc-inventory parity lint", () => {
+    it("skill-lint asserts inventory parity against the real skill tree", () => {
+      const lint = read("tests/skill-lint.mjs");
+      expect(lint).toContain(M.parityLint);
+      expect(lint).toContain("INVENTORY_DOCS");
+      expect(lint).toContain("EXPECTED_SKILL_COUNT");
+      expect(lint).toContain("UNLOCK_PROSE_SITES");
+    });
+  });
+
+  describe("R8 — packet base defined from the Commit column", () => {
+    it("step 6 mandates recording the commit and the recipe names the Commit column for both spans", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      expect(executing).toContain(M.commitColumnFill);
+      expect(executing).toContain(M.featureBaseRule);
+      expect(executing).toContain(M.perReqSpanRule);
+      expect(executing).not.toMatch(/<merge-base>/);
+    });
+  });
+
+  describe("R9 — diagnose ↔ execution recording hook", () => {
+    it("executing mandates fix recording; diagnose closes the loop from its side", () => {
+      const executing = read("skills/pwk-executing-tasks/SKILL.md");
+      const diagnose = read("skills/pwk-diagnose/SKILL.md");
+      expect(executing).toContain(M.midFixMandated);
+      expect(diagnose).toContain(M.diagnoseReminder);
+    });
+  });
+});
