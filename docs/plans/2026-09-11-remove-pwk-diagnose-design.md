# Remove `pwk-diagnose`, align + simplify the remaining skills

## At a glance

| R# | Requirement | Risk |
|----|-------------|------|
| R1 | Delete `skills/pwk-diagnose/` and drop it from the guard unlock list | Low |
| R2 | Update tests/lint that enumerate or assert on `pwk-diagnose` | Low |
| R3 | Sweep docs + the one `pwk-executing-tasks` reference | Low |
| R4 | Align `pwk-code-review` checklists with the four role contracts | Low |
| R5 | Simplify remaining skills: clearer, less redundant, behavior-preserving | Medium |

**Key decisions:**

- **Delete `pwk-diagnose` outright, no stub, no deprecation** — the kit never used it; any open-source diagnose skill covers the need. A stub would keep the name alive in discovery and keep an unlock path in the guard for no benefit. Rejected alternative: deprecate-and-warn (keeps maintenance + guard surface for zero users).
- **`pwk-code-review` stays a separate skill, checklists aligned with the four roles** — it is the `inline` engine that `pwk-executing-tasks` dispatches to (feature-review `inline` path + per-requirement `Review: inline` tag) and that `pwk-brainstorming` names in its tagging guidance. `pwk-executing-tasks` never duplicates its checklist; folding it in would bloat the already-largest skill file. Rejected alternative: fold the checklist into executing-tasks.
- **Checklists verbatim, everything else untouched (Q7)** — R4 ports only the four `Your checklist` sections from `agents/pwk-{spec,tracing,smell,hazard}-reviewer.md` into `skills/pwk-code-review/SKILL.md`. Reporting stays as-is (no `file:line`-per-finding rule, no `No findings` requirement, no packet discipline), and the skill stays unlocked (smells are fixed directly; the smell-role's "flag large refactors for the main agent" sentence is inverted accordingly).
- **Keep the mid-execution recording rule, drop the example** (Q2) — the "bugs fixed mid-execution are mandatory execution-summary content" obligation stays in `pwk-executing-tasks`; only the `(e.g. fixed via pwk-diagnose)` parenthetical goes.

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
