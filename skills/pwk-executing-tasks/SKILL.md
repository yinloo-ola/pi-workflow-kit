---
name: pwk-executing-tasks
description: "Implement a plan via the feature-gate flow: write the feature-acceptance E2E first, implement requirements back-to-back, then one feature-level review. Run after pwk-writing-plans. Per-requirement checkpoints/reviews are opt-in (default off)."
---

# Executing Tasks

Implement the plan from `docs/plans/*-implementation.md` via the **feature-gate flow**. The plan is a behavioral spec (acceptance criteria + integration tests) — you choose structure, signatures, internals; the criteria define *what*, you decide *how*.

The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the plan tags (default off); the feature gate covers everything else.

## Before you start

1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
2. **Find the plan** — glob `docs/plans/*-implementation.md`; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.

## First run

1. **Parse the plan** — read every `## Requirement N:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first.
2. **Setup pre-flight** *(only if the plan has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches):

   ```markdown
   # Progress: <topic>

   Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
   Branch: <branch>
   Started: <ISO timestamp>
   Last updated: <ISO timestamp>
   Feature phase: e2e-written

   ## Requirements
   | # | Done | Requirement | Per-req ceremony | Commit |
   |---|------|-------------|-----------------|--------|
   | 1 | ⬜ | <requirement name> | — | — |

   ## Execution summary
   | R# | Requirement | How it was built | Deviated? |
   |----|-------------|------------------|-----------|
   | 1 | <requirement name> | | |
   ```

   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.

4. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
5. **Write the feature-acceptance E2E test (red).** Read the plan's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.

## Resume

Read the progress file's `Feature phase`:
- `e2e-written` → write the E2E if not yet present, then present the **feature-spec** checkpoint.
- `feature-spec-paused` → re-present the feature-spec checkpoint and wait.
- `implementing (k/N)` → continue the next not-yet-✅ requirement.
- `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
- `ship-paused` → re-present the ship checkpoint and wait.
- legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.

## Progress file

Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.

**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the plan, fill the Deviated? column when the departure happens, with a one-line why — it is a log, not a stop.

## Implement phase (after feature-spec is approved)

Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:

1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-writing-plans` and `docs/lessons.md`.)
3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = after tests only). With the default `none`, show the red→green inline and proceed.
4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.

### Per-requirement review (opt-in)

If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria sections of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.

`Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).

### Checkpoint gates are mandatory (when the tag says so)

When a per-requirement checkpoint fires it is a **hard stop**:
- Stop immediately; never proceed without explicit human approval.
- **Never** `git add` or `git commit` before approval at a checkpoint.
- Set the progress phase/status **before** pausing.

## Ship checkpoint (feature-complete + review, merged)

When every requirement's Done column is ✅:

1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the plan declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
3. **Run the feature review** (below) per the plan's `### Feature review` tag — the review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
4. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
   - a green-gates line: full suite green, feature E2E green;
   - the **execution summary** — what each requirement became, deviations included;
   - the **coverage table** from the spec-reviewer report (one verdict row per R#);
   - findings status: fixed / open for the human;
   - "full diff on request" — the raw diff is one command away; show a hunk only where a verdict or finding makes the human ask.

   Wait for approval. **request changes** → fix, re-run the gates (and the review if the change is substantive), re-present.

A reviewer report without a per-requirement coverage table is invalid — retry the role or complete it inline before pausing; the ship checkpoint is never presented without coverage.

The old "integration gate" is gone — the feature E2E at the ship checkpoint *is* the gate; there is no separate end pass.

## Feature review

This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the plan's feature-level `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.

**Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:

```bash
PACKET="docs/plans/<dated-stem>-review-packet.md"   # same dated stem as the plan docs
{
  echo "# Review packet: <topic> — feature review"
  echo
  echo "## Commits"
  git log --oneline <merge-base>..HEAD
  echo
  echo "## Changed files"
  git diff --stat <merge-base>...HEAD
  echo
  echo "## Acceptance criteria (verbatim from the plan)"
  sed -n '/^## Requirement 1/,/^## Feature acceptance/p' docs/plans/<dated-stem>-implementation.md | sed '/^## Feature acceptance/,$d'
  echo
  echo "## Feature acceptance (verbatim)"
  sed -n '/^## Feature acceptance/,/^### Feature review/p' docs/plans/<dated-stem>-implementation.md | sed '/^### Feature review/,$d'
  echo
  echo "## Production-risk notes (verbatim, if any)"
  sed -n '/^### Production-risk notes/,/^## /p' docs/plans/<dated-stem>-implementation.md | sed '/^## /d'
  echo
  echo "## Diff"
  git diff <merge-base>...HEAD
} > "$PACKET"
```

- **`parallel`** (default) — request the host’s `parallel-review` capability for four fresh-context, read-only logical roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, and `pwk-hazard-reviewer`. Spawn each role with a **one-liner** — a pointer to the packet file with the role framing appended last: the checklist name of the role (`spec alignment`, `code tracing`, `code smells`, or `production hazards`). For example: `Read docs/plans/<dated-stem>-review-packet.md. Your role: spec alignment.` The packet never appears in spawn arguments. Require independent execution and one collected outcome per role. The reviewer role contracts live in `agents/pwk-*-reviewer.md`; do not duplicate their checklists in the workflow instructions. Reviewers are read-only reporters; you apply smell fixes yourself (full suite + E2E must stay green, commit) and flag trace/spec/hazard findings as follow-ups for the human.

- **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
- **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.

On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`.

## Tags reference

The plan tags each requirement and the feature level:

- **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
- **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. The auto-tag default for requirements with non-empty `### Production-risk notes` is `parallel` (see `pwk-writing-plans` for the rule).
- **`### Feature review: parallel | inline`** — the one whole-feature review (always present). Default `parallel`; `inline` for small features.

## User override commands

| User says | Agent does |
|-----------|-----------|
| `skip` | Mark current requirement skipped, move to next |
| `status` | Show the progress file (feature phase + requirement table) |
| `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
| `retry` | Re-read the requirement, start over |

## Receiving feedback (outside a checkpoint)

Verify the criticism against the code, evaluate the suggestion, then implement (with tests) or push back with evidence. Don't blindly apply.

## After the feature review

The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate):

- **Standalone design doc** (no `docs/plans/*-overview.md`) → suggest `/skill:pwk-finalizing`.
- **Umbrella part** (an `*-overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).

Present:

```
✅ Feature complete — feature E2E green, feature review done!

Feature phase: done
| # | Done | Requirement |
|---|------|-------------|
| 1 | ✅ | <name> |
| … | … | … |

   - Next part: /skill:pwk-brainstorming (<next topic>)   ← umbrella, more parts remain
   - Ship: /skill:pwk-finalizing                          ← standalone, or last umbrella part
```

## If you're stuck

1. Re-read the requirement's acceptance criteria — you may have drifted.
2. Check `git log` for context. Ask the user — clarify beats guessing.
3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
4. Mark the requirement failed with the reason and move on. Check `docs/lessons.md` — a prior lesson may apply.
