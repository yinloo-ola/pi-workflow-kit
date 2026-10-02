---
name: pwk-executing-tasks
description: "Implement a design doc via the feature-gate flow: write the feature-acceptance E2E first, implement the ### R<n> requirement blocks back-to-back, then one feature-level review. Run after pwk-brainstorming. Per-requirement checkpoints/reviews are opt-in (default off)."
---

# Executing Tasks

Implement the design doc found under `docs/plans/` via the **feature-gate flow**. The design doc is the single buildable artifact — its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*: structure, signatures, internals are yours.

Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the design doc tags (default off); the feature gate covers everything else. A trivial design doc (no `## Feature acceptance`, per brainstorming's proportionality rule) skips the E2E steps and ships on the full suite; the one whole-feature review still runs at its ship checkpoint, its missing `### Feature review` tag defaulting to `auto`.

## Before you start

Resolve local references and scripts from this installed skill directory. If a required resource is missing, report the blocker and stop before the affected action; do not silently skip its instructions.

1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume and progress](#resume-and-progress)). An umbrella part whose prior leaves are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<leaf>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
3. **Workspace — choose this topic’s branch/worktree.** Before creating, switching, or adopting one, read [Workspace and resume details](references/resume.md#workspace). Reuse this topic’s branch (one umbrella = one branch); a different topic’s branch never hosts these commits. Uncommitted planning docs do not cross a worktree boundary: commit this topic folder on its branch before a new worktree handoff; when adopting an existing checkout with uncommitted docs here, copy the topic folder there, verify it, then remove the source copy. Read the reference's command order before acting. Offer/adopt only after checking existing worktrees; wait for the user's choice.

## First run

1. **Parse the design doc** — read every `### R<n>:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag in the `## Feature acceptance` section. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first. A trivial design doc (no `## Feature acceptance`) skips steps 5–6 below and goes straight into the implement phase.
2. **Create the progress file** beside the design at `docs/plans/<date>-<topic>/<leaf>-progress.md`. Before creating it, read [Progress format](references/progress-format.md) for the exact template, header slots, and row vocabulary. Start at `Feature phase: e2e-written` (trivial doc: `implementing (0/N)`); `Setup: pending` when the design has `## Setup`, otherwise `Setup: n/a`.

3. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval, then set `Setup: done` in the progress-file header so a resume can confirm it rather than assume it.

4. **Commit the design docs** — `git add docs/plans/<date>-<topic>/ && git commit -m "docs: add design doc"`. The add is scoped to the topic folder so another in-flight topic's uncommitted drafts never ride this commit (docs/lessons.md hygiene: one commit per topic).
5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, probe why before proceeding: the behavior may already exist, or the test may be asserting too little. If it still passes and the expected behavior looks wrong, **stop and present** rather than implementing against a wrong spec. Iterate it to green as you implement — fixing the implementation is the default, and you **stop and present only when you are genuinely blocked** (nothing you can do makes it pass, or the E2E itself is wrong). That stop is the reserved failure case; it is not the flow's default pause.
6. **Notice, not a stop — report the E2E and continue.** Post 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), plus the E2E test and its failing output, then go straight into the implement phase **without waiting for approval** — the `## Feature acceptance` text was approved during brainstorm, so there is nothing new here for the human to sign off. The notice is the window to object *before* implementation starts: a human who sees the E2E asserting the wrong thing says so, and you revise, re-run, and re-notice. Keep `Feature phase: e2e-written`.

## Resume and progress

`Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.

**Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. Only executing changes Done cells; a requirement under review stays `🔄` until a clean pass permits `✅`.

When a matching progress file exists, read [Resume](references/resume.md#resume) before routing. Read the header, Requirements table, and Execution summary only; `ship-paused` also needs Code digest. A pending setup checkpoint must be re-verified and approved before proceeding. Resume the first nonterminal row (`⬜`, `🔄`, blank); `✅`/`❌`/`⏭` are terminal, resolved rather than necessarily passed. Match `grep -m1 '^Feature phase:' <file>` for the phase header; `reviewing` resumes review; `ship-paused` re-presents and waits, never approves itself. Missing reviewer reports require review again before showing coverage.

Before any progress-row update or code-digest write, read [Progress format](references/progress-format.md). Update the matching row directly, `Last updated`, and `Feature phase`; write execution-summary content at the same time as ✅, and deviations at deviation time. A failed/skipped row carries its reason in the Requirement cell and reconciles its test coverage so the suite stays green.

## Implement phase

Bugs found mid-execution are mandatory execution-summary content: record the fix in the requirement's `How it was built` cell and fill its Deviated? column at fix time — the summary must show what the feature actually cost to land.

Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:

1. **Mark the requirement 🔄** (Done column), read its `### Checkpoints` / `### Review` tags, and check `docs/lessons.md` for a rule that applies to this slice.
2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full`, stop and present after the tests and again after the slice is complete — both before its commit (the checkpoint rule below forbids committing before approval). With the default `none`, show the red→green inline and proceed.
4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
6. **Commit** the requirement with a clear message; record the requirement's commit hash in the Commit column.
7. **Per-requirement review** *(fires only when the requirement's `### Review` tag is `parallel` or `inline` — default `skip`)* — review the slice now (see [Per-requirement review](#per-requirement-review-opt-in)); the row stays 🔄 through the review.
8. **Mark the requirement ✅** and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`. For a reviewed requirement this fires only after the review returns clean.

### Per-requirement review (opt-in)

If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice at step 7 — read [Review mechanics](references/review.md) first and use its helper with `--scope requirement --requirement N`, limited to the commits and criteria of that requirement, written to `<design doc's directory>/<leaf>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). The row stays 🔄 through the review: the four delegated roles — or the one `pwk-code-review` pass on `inline` — report findings, you apply the smell fixes yourself and commit them (the roles are read-only reporters), and a clean pass returns to step 8, which marks the row ✅. With `skip`, no per-requirement review — step 8 fires directly, and the feature-level review covers it.

With the default `none`, no per-requirement stop fires — the per-requirement test still runs red→green, and the feature review covers implementation quality.

### Checkpoint gates are mandatory (when the tag says so)

When a per-requirement checkpoint fires it is a **hard stop**:
- Stop immediately; never proceed without explicit human approval.
- **Never** `git add` or `git commit` before approval at a checkpoint.
- Set the progress phase/status **before** pausing.

## Ship checkpoint (all requirements terminal + review, merged)

When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):

1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. (A `❌`/`⏭` requirement's assertions were reconciled when its row went terminal, so a still-red E2E still means a requirement is missing or wrong.) If it is still red, a requirement is missing or wrong — fix it before proceeding. (A trivial design doc has no `## Feature acceptance` — the full suite staying green is its gate instead.)
3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. (A trivial design doc carries no `### Feature review` tag — the missing tag defaults to `auto`, which resolves on its risk content; a trivial diff is typically `inline`, one pass, and there is no E2E to re-green — the full suite is the gate.) The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` using [Progress format](references/progress-format.md) and its fill rules. If the packet is stale or missing, read [Review mechanics](references/review.md) and re-run the helper before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Never a gate: it explains the change, it does not block shipping.

   **Reconcile the Flow against reviewed reality before writing it.** The Flow is written from what was reviewed, not from recollection: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names — no hop invented, no reported path dropped. In `inline` mode there is no separate tracing report — the inline pass itself performs code tracing — so check the Flow against that pass's tracing findings and spec-coverage result instead. A discrepancy you cannot resolve is **surfaced** to the human in the ship checkpoint's findings status, never smoothed over by writing a Flow that omits the path.
5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
   - a green-gates line: full suite green, feature E2E green (trivial doc: the suite line alone — there is no E2E);
   - the **execution summary** — what each requirement became, deviations included;
   - the **verdict rows** — list every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
   - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
   - the **coverage table** (one verdict row per R#) — from the spec-reviewer report in `parallel` mode, from the inline pass's spec alignment in `inline` mode;
   - findings status: fixed / open for the human;
   - "full diff on request" — the raw diff is one command away; show a hunk only where a verdict or finding makes the human ask.

   Wait for approval. **request changes** → fix, re-run the gates (and the review if the change is substantive), re-present.

A spec-reviewer report without a per-requirement coverage table is invalid — retry the role or complete it inline before pausing; the ship checkpoint is never presented without coverage. (Only the spec role owes the table; the tracing/smell/hazard reports keep their own report shapes.)

The old "integration gate" is gone — the feature E2E at the ship checkpoint *is* the gate; there is no separate end pass.

## Feature review

This is step 3 of the [ship checkpoint](#ship-checkpoint-all-requirements-terminal--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag — exactly one per part, never once per requirement. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.

**Assemble the review packet first** — read [Review mechanics](references/review.md), then invoke the installed skill’s `scripts/build-review-packet.py` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `python3 --version` for Python 3.9+ and helper availability before this step; if Python is missing or unavailable, report the blocker, request a suitable runtime, and stop. Do not auto-install a runtime, use a fallback implementation, or claim packet generation succeeded. No packet byte passes through model output. A failed helper is not usable evidence or approval; correct the inputs, never guess ranges. The helper writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.

- **Resolve the tag first.** `auto` (the default, and what a missing tag means) resolves on the design's own production-risk content: if the design carries a non-empty `## Production-risk areas` section, or any requirement carries a non-empty `### Production-risk notes`, resolve to `parallel`; otherwise resolve to `inline`. An explicit `parallel` or `inline` is used as written and always wins over `auto` — explicit tag wins in both directions, so a human who wants one pass on a risky design gets one pass.

- **`parallel`** — use the host’s `parallel-review` capability for four independent, fresh-context, read-only roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`. Follow [Review mechanics](references/review.md#delegate-or-review-inline): a one-liner packet-file pointer with role framing last; the packet never appears in spawn arguments. Collect one outcome per role. Reviewers only report; you apply smell fixes, commit, and re-green full suite + E2E. Surface trace/spec/hazard findings to the human.
- **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
- **Fallback** — if compatible capability is absent, required read-only/fresh-context/bounded constraints cannot be proved, or delegation fails, do the missing work inline. Retain successful reports; required missing roles mean review is incomplete.
- **Refresh** — if commits land during review, use [Review mechanics](references/review.md) to refresh the packet before any replacement role or digest write. Append requirement-fix IDs before a requirement refresh; keep the initial ID. Packet creation never substitutes for review or approval.

On success, continue assembling the ship checkpoint; once the human approves it — knowing what failed — set `Feature phase: done`. (An umbrella part's gate is its own progress file; `pwk-finalizing` reads every part's file, and a `❌` in any part blocks the umbrella until the human sends the work back or explicitly types `--force-failed`.)

## Tags reference

The design doc tags each requirement and the feature level:

| Tag | Values | Default | Fires |
|-----|--------|---------|-------|
| `### Checkpoints` | `none \| full` | `none` | per-requirement human stops — `full` = tests + complete stops |
| `### Review` | `skip \| parallel \| inline` | `skip` | per-requirement review — `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass |
| `### Feature review` | `auto \| parallel \| inline` | `auto` | the one whole-feature review — always run, never per requirement (a trivial doc carries no tag; the missing tag resolves to `auto`) |

Nothing is tagged silently: **only the human tags** a slice, and the feature review covers everything else. How each tag resolves lives where its decision executes — the [per-requirement review](#per-requirement-review-opt-in) and the [feature review](#feature-review).

## User override commands

| User says | Agent does |
|-----------|-----------|
| `skip` | Set its Done cell `⏭` (with the reason), reconcile its test coverage, move to next |
| `status` | Show the progress file (feature phase + requirement table) |
| `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
| `retry` | Re-read the requirement, start over |

## Receiving feedback (outside a checkpoint)

Verify the criticism against the code, evaluate the suggestion, then implement (with tests) or push back with evidence. Don't blindly apply.

## After the feature review

The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate; the overview check below is **folder-local** — read the `overview.md` beside this leaf, inside the same `docs/plans/<date>-<topic>/` directory, never a repo-wide `docs/plans/**/overview.md`, and always excluding docs/plans/completed/, so an archived or sibling umbrella never routes):

- **Standalone topic** (no `overview.md` in the topic folder) → suggest `/skill:pwk-finalizing`.
- **Umbrella part** (an `overview.md` sits beside this leaf) → read the overview's `## Parts (build order)` roster. The umbrella is complete when every roster leaf has a `done` progress file → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). Otherwise look at the **next leaf** — the **first roster part with no `done` progress file**, not the next entry in build order: build order is advisory, so a part built out of order must not be skipped by the suggestion. That leaf with no progress file and no `<leaf>-design.md` is unstarted → suggest `/skill:pwk-brainstorming` for it; with a `<leaf>-design.md` but no progress file it is designed but never executed → suggest `/skill:pwk-executing-tasks` (its pre-flight picks the design doc up — the same state pwk-status renders as `design`); with a progress file that is not `done` it is mid-flight → suggest `/skill:pwk-executing-tasks` to resume that leaf instead.

Present:

```
✅ Feature complete — feature gates green, feature review done!

Feature phase: done
| # | Done | Requirement |
|---|------|-------------|
| 1 | ✅ | <name> |
| … | … | … |

   - Next part: /skill:pwk-brainstorming (unstarted leaf) or /skill:pwk-executing-tasks (designed or mid-flight) — per the routing above   ← umbrella, more parts remain
   - Ship: /skill:pwk-finalizing                          ← standalone, or last umbrella part
```

## If you're stuck

1. Re-read the requirement's acceptance criteria — you may have drifted.
2. Check `git log` for context. Ask the user — clarify beats guessing.
3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement's commit(s). **Never leave a failed requirement's partial work on the shipped branch.**
4. Set its Done cell `❌` (with the reason as a suffix in the Requirement cell), reconcile its test coverage, and move on. Check `docs/lessons.md` — a prior lesson may apply.

## Contract index

Detailed progress, resume, and review contracts live in `references/`. The following
entrypoint markers remain canonical: `Feature phase` is one of
`e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`; Done cells use
`⬜`, `🔄`, `✅`, `❌`, `⏭`, where `✅`/`❌`/`⏭` are resolved. Only executing changes
Done cells; a reviewed row flips only `🔄`→`✅`. `Setup: pending | done | n/a` is the
header slot, and the ceremony cell echoes the design doc's tag. Execution summary rows
are written in the same step as marking a requirement ✅, with deviations recorded when
the departure happens. Resume uses `re-run the setup verification`; packet bounds use
the `Commit column`, the `parent of the first recorded commit`, and the `previous
requirement's last commit`. Successful delegated reports are retained. The Flow has
`Spine`, `Branches`, `Side effects`, `was:`, and no line numbers; it is checked against
the tracing report and unresolved differences are surfaced. The digest is
`never back-filled per requirement`, with gotchas `none beyond review findings` and
key files capped `at 5`.

```markdown
# Progress: <topic>

Design: docs/plans/<date>-<topic>/<leaf>-design.md

Feature phase: e2e-written

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
## Execution summary
| R# | Requirement | How it was built | Deviated? |
## Code digest
### Summary
### Flow
### Gotchas
### Key files
```
