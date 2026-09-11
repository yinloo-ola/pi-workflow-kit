# Workflow Phases

The kit enforces a design → execute → finalize workflow. Each phase below names the skill that drives it:

`pi-workflow-kit` has 4 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.

```
brainstorm → executing-tasks → finalizing
                (feature-gate: write feature E2E → report it → implement requirements → feature review → ⏸ ship)
```

**One folder per topic.** Every topic — a single-part design doc or an umbrella — lives in its own folder `docs/plans/<date>-<topic>/`, and that folder is the unit of creation, discovery, and disposal. Its docs are leaves inside it: `<leaf>-design.md`, `<leaf>-progress.md`, `<leaf>-review-packet*.md`, where `<leaf>` is the part slug (`<topic>` for a single-part topic). A folder holding more than one leaf also carries an `overview.md`. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs (leaves) under one status-free overview, on one branch, finalized once (`(brainstorm → execute) × N → finalize`).

## brainstorm

```
/skill:pwk-brainstorming
```

- Explore requirements and shape the design. Interviews in **frontier rounds**: questions form a dependency tree seeded by a six-dimension checklist; each round asks the full frontier as numbered questions, each with a recommended answer; facts are looked up, only decisions asked; the interview ends when the frontier is empty — nothing left silently assumed — and an assumption gate sweeps the draft before the design is presented.
- Produce `docs/plans/<date>-<topic>/<leaf>-design.md` — descriptive, the **single buildable artifact**: a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks — one `### R<n>:` block per requirement carrying its one-line behavior, **acceptance criteria** (Given/When/Then incl. edge/error cases) and Checkpoints/Review tags (no test-name lists, no separate plan doc) — ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
- May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/<date>-<topic>/overview.md` (the same topic folder, now with more than one leaf; a `## Parts (build order)` roster of leaves + build order) and the **first** leaf's `<leaf>-design.md` beside it. Later leaves are brainstormed one by one against the overview + implemented predecessors.
- ADRs go to `docs/adr/` (permanent, never archived).

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## executing-tasks

```
/skill:pwk-executing-tasks
```

- **Feature-gate flow:** write the feature-acceptance E2E test (red) → **report it, no stop** (1–2 lines saying what the E2E proves, plus its failing output — the `## Feature acceptance` text was already approved in brainstorm, so the run continues straight into implementation; the report is the human's window to object before code is written) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (one review over the whole feature diff: the `parallel-review` capability for four logical read-only roles when the design carries production-risk content, otherwise one inline `/skill:pwk-code-review` pass — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + code digest + reviewer coverage table; full diff on request).
- After the review passes, the executor writes a **code digest** into the progress file — plain-language summary, execution flow, gotchas, key files — derived from the review packet; it rides the existing disposal globs.
- Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the design doc tags (default off); see [Proportionality](#proportionality).
- **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
- Progress tracked in `docs/plans/<date>-<topic>/<leaf>-progress.md` (feature phase + requirement checklist).

No write restrictions. All tools available.

## Proportionality

The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:

- **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. There is no per-requirement correctness stop, because those criteria were approved at design time.
- **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
- **Feature review** — `auto` (risk-scaled, **default**) | `parallel` (four reviewers over the whole feature diff) | `inline` (one pass). Always on, exactly one per part. `auto` resolves on the design's own production-risk content: `parallel` when the design has a non-empty `## Production-risk areas` section or a non-empty `### Production-risk notes` on any requirement, `inline` otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`. The review scope is a script-assembled review packet (diff + criteria verbatim), so reviewers never re-derive scope; smell/hazard reviewers run on the fast tier set via `/pwk-setup --fast-model` (advisory hint).

Flag a requirement for a checkpoint when it has complex logic or is the main part of the feature; for a review when it touches production-risk. A trivial fix can also skip the multi-turn brainstorm dialogue via the brainstorming trivial fast-path (compress to one turn, minimal design doc) — the guard still enforces read-only.

## code-review

```
/skill:pwk-code-review
```

The **inline reviewer**: code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check. Unlocked — may modify code to fix smells.

**Not a phase you drive manually.** During `pwk-executing-tasks`, the feature-level review resolves the design's `### Feature review` tag (`auto` by default) and either requests four logical roles (`pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`) through the host’s `parallel-review` capability — when the design carries production-risk content — or runs one inline pass when it does not. Roles are fresh-context, read-only reporters; successful reports are retained and failed roles are retried or completed inline. If no compatible provider is available, the whole review runs inline. In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents/`; [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents) is one compatible provider. See `docs/provider-delegation-contract.md` for the provider contract. You can also invoke `/skill:pwk-code-review` standalone for an ad-hoc review of any diff.

No write restrictions.

## finalizing

```
/skill:pwk-finalizing
```

- **Pre-check: run the full test suite** — don't ship a red suite (resume spans sessions; don't trust the last execute session).
- Dispose of consumed plan docs — the unit is the **topic folder** `docs/plans/<date>-<topic>/`, so a single-leaf topic and an umbrella dispose identically as one folder; a legacy flat topic keeps its per-file paths (the flat globs never run for a folder topic). The human picks **delete** (default — code + tests are the source of truth) or **archive** to `docs/plans/completed/` (keep planning history; every discovery glob runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording). ADRs stay at `docs/adr/`. Ships **one PR** per topic.
- Curate `docs/lessons.md`, update README/CHANGELOG, create PR or merge.

No write restrictions.

## status

```
/skill:pwk-status
```

Read-only overview of all active pipeline topics (phase + progress) when several designs are in flight; an umbrella rolls up under its overview (shipped / in-flight / not-started). Not a pipeline phase — and it **does not exit the gated phase** (`pwk-status` is read-only; it runs fine under the design-phase write block, so the boundary stays up).

## walkthrough

```
/skill:pwk-walkthrough
```

Not a pipeline phase. An on-demand utility skill that generates a detailed, file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md` — Summary / How it works / Key flows / Gotchas & invariants / Change map — stamped with the commit range, regenerated wholesale on re-run, never disposed. Invoking it **exits the gated phase** (it writes its explainer output under `docs/walkthroughs/`).

## Manual override

`/pwk-guard on|off|auto` overrides the guard regardless of phase: `on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. Subcommands autocomplete. Use it as an escape hatch when the guard blocks something you genuinely need; phase transitions otherwise happen only via `/skill:` commands.

## Continuity across sessions

A new session resumes by invoking the skill for the phase to continue. The skill globs `docs/plans/` for its artifact (progress file / design doc), resumes the single match, or asks if several. Each resumption skill reports what it found on entry — no registry file needed; the `<topic>` slug in the filenames is the identity.