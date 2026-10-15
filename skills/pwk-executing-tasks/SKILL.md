---
name: pwk-executing-tasks
description: "Implement a design doc via the feature-gate flow: write the feature-acceptance E2E first, implement the ### R<n> requirement blocks back-to-back, then one feature-level review. Run after pwk-brainstorming. Per-requirement checkpoints/reviews are opt-in (default off)."
---

# Executing Tasks

Implement the design doc under `docs/plans/` via the **feature-gate flow**; its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*.

Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

Reference pointers name the section a step needs: run the section helper `scripts/ref.mjs <reference-path>#<anchor>` instead of reading the whole reference file.

The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec. The flow is always on: E2E first (red), the requirements back-to-back, then the feature review and the **ship checkpoint**. Per-requirement checkpoints and reviews are **opt-in** — they fire only when the design doc tags them, and the feature gate covers the rest. A trivial design doc (no `## Feature acceptance`) skips the E2E and ships on the full suite.

## Before you start

Resolve local references and scripts from this skill directory; a missing required resource is a blocker to report, never to skip.

1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; take each topic’s `Feature phase:` line header-only (`grep -m1 '^Feature phase:' <file>`). With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every phase extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):

   ```javascript
   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
   const files = designs ? designs.split('\n') : [];
   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
   const heads = await Promise.all(files.map(d =>
     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
   ```

   No doc → ask for `/skill:pwk-brainstorming`; several → ask which. A matching `*-progress.md` means a **resume** ([Resume and progress](#resume-and-progress)); an umbrella part whose prior leaves are not all `done` shows their `Feature phase:` lines as advisory context.
3. **Workspace** — choose this topic’s branch or worktree: read [Workspace and resume details](references/resume.md#workspace) first; it owns the command order including worktree handoffs. Reuse this topic’s branch (one umbrella = one branch); a different topic’s branch never hosts these commits. Offer or adopt only after checking existing worktrees, then wait for the user.

## First run

1. **Parse the design doc** — read every `### R<n>:` heading with its `### Checkpoints` / `### Review` tags and the feature-level `### Feature review` tag. Requirements run in **listed order**. The `## Feature acceptance` section is the E2E you gate on first; a trivial doc skips steps 5–6.
2. **Create the progress file** beside the design at `docs/plans/<date>-<topic>/<leaf>-progress.md`, writing it with `scripts/progress.mjs` (read [Progress format](references/progress-format.md#progress-file) first for the template). Start at `Feature phase: e2e-written` (trivial doc: `implementing (0/N)`); `Setup: pending` when the design has `## Setup`, otherwise `Setup: n/a`.
3. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the suite. **⏸ CHECKPOINT: setup** — present results and wait for approval, then set `Setup: done`.
4. **Commit the design docs** — `git add docs/plans/<date>-<topic>/ && git commit -m "docs: add design doc"`, scoped to the topic folder so another topic’s drafts never ride it.
5. **Write the feature-acceptance E2E test (red)** — encode the `## Feature acceptance` section as a real test, run it, confirm it **fails**. If it passes immediately, probe why before proceeding — the behavior may already exist, or the test may be asserting too little — and if the expected behavior looks wrong, **stop and present** rather than implementing against a wrong spec. Iterate to green; fixing the implementation is the default, and you **stop and present only when you are genuinely blocked** (nothing makes it pass, or the E2E itself is wrong).
6. **Notice, not a stop — report the E2E and continue.** Post 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …") plus its failing output, then go straight into the implement phase **without waiting for approval** — the `## Feature acceptance` text was approved during brainstorm.

## Resume and progress

`Feature phase` is one of: `e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.

**Done cell:** `⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped. A row is **terminal** when its Done cell is `✅`, `❌`, or `⏭` — resolved, not necessarily passed. Only executing changes Done cells; a reviewed row stays `🔄` until a clean pass permits `✅`.

When a matching progress file exists, read [Resume](references/resume.md#resume), then the header, Requirements table, and Execution summary only (`ship-paused` also needs the Code digest). Resume the first nonterminal row (`⬜`, `🔄`, blank). Match `grep -m1 '^Feature phase:' <file>`; `reviewing` resumes review; `ship-paused` re-presents and waits, never approving itself. Missing reviewer reports require review again before coverage.

Read [Progress format](references/progress-format.md#progress-file) before any progress-row or code-digest write, and drive every structural edit through `scripts/progress.mjs` — it updates the row, `Last updated`, and `Feature phase` together, so write execution-summary content with the ✅ and deviations at deviation time. A failed/skipped row carries its reason and reconciles its test coverage.

## Implement phase

Bugs found mid-execution are mandatory execution-summary content: record the fix in the requirement’s `How it was built` cell and fill its Deviated? column then.

Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:

1. **Mark the requirement 🔄** (Done column), read its `### Checkpoints` / `### Review` tags, and check `docs/lessons.md` for an applicable rule.
2. **Write a meaningful test (red), then implement (green)** — encode the acceptance criteria as a real test through the public interface: red, then green; a slice with no independent observable behavior is covered by the feature E2E. **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted data, an emitted event, an HTTP response) through its public interface.
3. **⏸ per-requirement checkpoint** *(fires only when the tag says so)* — with `### Checkpoints: full`, stop and present after the tests and again after the slice is complete, both before its commit; with the default `none`, show the red→green inline and proceed.
4. **Regression check after each commit** — run the **full existing suite**, which catches a later requirement breaking an earlier one’s test. The **feature E2E stays red until the last requirement lands**; never expect it green per-commit.
5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md`.
6. **Commit** the requirement; record its commit hash in the Commit column.
7. **Per-requirement review** *(only when the `### Review` tag is `parallel` or `inline`)* — review the slice now (see [Per-requirement review](#per-requirement-review-opt-in)); the row stays 🔄.
8. **Mark the requirement ✅** and write its execution-summary row in the same step — Evidence cell non-empty, plain words plus pointer; advance `Feature phase: implementing (k/N)`. A reviewed requirement fires only after a clean review.

### Per-requirement review (opt-in)

If the requirement’s `### Review` tag is `parallel` or `inline` (default `skip`), review that slice at step 7: run the [Review mechanics](references/review.md#assemble-evidence) helper with `--scope requirement --requirement N` over that requirement’s commits and criteria, written to `<design doc's directory>/<leaf>-review-packet-r<N>.md`. The four delegated roles — or the one `pwk-code-review` pass on `inline` — only report; you apply the smell fixes and commit them, then a clean pass returns to step 8. With `skip`, no per-requirement review — step 8 fires directly, and the feature-level review covers it.

### Checkpoint gates are mandatory (when the tag says so)

When a per-requirement checkpoint fires it is a **hard stop**:
- Stop immediately; never proceed without explicit approval.
- **Never** `git add` or `git commit` before approval at a checkpoint.
- Set the progress phase/status **before** pausing.

## Ship checkpoint (all requirements terminal + review, merged)

When every requirement's Done cell is terminal — `✅` (done), `❌` (failed, reason in row), or `⏭` (skipped, reason in row):

1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it here. Then run `scripts/stage-check.mjs` and stop on a non-zero exit: the reviewed diff is a commit range, so anything uncommitted outside `docs/plans/` is missing from it.
2. **Run the feature-acceptance E2E** — it must be **green** now that all requirements have landed; still red means a requirement is wrong.
3. **Run the feature review** (below) per the design’s `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed; apply smell fixes and re-green first.
4. **Write the code digest** into the progress file — the review has succeeded and the code is final: read the packet’s `## Commits`, `## Changed files`, and `## Diff` sections and fill the file’s `## Code digest` per [Progress format](references/progress-format.md#code-digest); if the packet is stale, re-run the helper first. Never a gate — it explains the change, it does not block shipping. A resumed `Feature phase: reviewing` that completes lands on this same write point. **Reconcile the Flow against reviewed reality**: every hop must match a path the tracing report names — in `inline` mode the inline pass itself performs code tracing, so check the Flow against that pass’s tracing findings and spec-coverage result — no hop invented and none dropped; an unresolvable discrepancy is **surfaced** in the findings status.
5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
   - a green-gates line: full suite green, feature E2E green (trivial doc: the suite line alone);
   - the **execution summary** — what each requirement became, deviations included, Evidence cells quoted;
   - the **verdict rows** — list every `❌`/`⏭` row with its reason, so approval is given knowing what failed;
   - the **code digest** — the plain-language change explanation from the progress file;
   - the **coverage table** (one verdict row per R#) — from the spec-reviewer report in `parallel` mode, from the inline pass’s spec-coverage result otherwise;
   - findings status: fixed / open for the human;
   - "full diff on request" — show a hunk only where a finding makes the human ask.

   Wait for approval. **request changes** → fix, re-run the gates (and the review if substantive), re-present.

A spec-reviewer report without a per-requirement coverage table is invalid — retry the role or complete it inline before pausing.

## Feature review

Run **one** review over the **whole feature diff**, driven by the design doc’s `### Feature review` tag — exactly one per part, never once per requirement.

**Assemble the review packet first** — run `scripts/stage-check.mjs` and stop on a non-zero exit, then read [Review mechanics](references/review.md#assemble-evidence) and invoke `scripts/build-review-packet.mjs` with explicit `--project`, `--design`, `--progress`, and `--scope feature`. Check `node --version`; if missing, report the blocker, request a suitable runtime, and stop — never auto-install, use a fallback, or claim the packet succeeded. No packet byte passes through model output; a failed helper is never evidence or approval. It writes `<leaf>-review-packet.md` beside the design; opt-in packets use `<leaf>-review-packet-r<N>.md`.

- **Resolve the tag first.** `auto` (the default, and what a missing tag means) resolves on the design’s production-risk content: a non-empty `## Production-risk areas` section or any `### Production-risk notes` → `parallel`; otherwise `inline`. An explicit tag wins over `auto` in both directions.
- **`parallel`** — use the host’s `parallel-review` capability for four independent, fresh-context, read-only roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`. Follow [Review mechanics](references/review.md#delegate-or-review-inline): a one-liner packet-file pointer with role framing last — the packet never appears in spawn arguments. Collect one outcome per role. Reviewers only report; you apply smell fixes, commit, and re-green. Surface trace/spec/hazard findings to the human.
- **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
- **Fallback** — check by enumeration, not by your visible tool list (a tool-hiding executor hides the spawn tool without removing it — [Review mechanics](references/review.md#delegate-or-review-inline)): if compatible capability is absent, constraints cannot be proved, or delegation fails, do the missing work inline. Retain successful reports; a missing required role leaves the review incomplete.
- **Refresh** — if commits land during review, refresh the packet before any replacement role or digest write, appending requirement-fix IDs and keeping the initial ID. Packet creation never substitutes for review or approval.

On success, continue assembling the ship checkpoint; once the human approves it, set `Feature phase: done`. (An umbrella part’s gate is its own progress file; `pwk-finalizing` reads every part's file, and a `❌` in any part blocks the umbrella until the human types `--force-failed`.)

## Tags reference

The design doc tags each requirement and the feature level:

| Tag | Values | Default | Fires |
|-----|--------|---------|-------|
| `### Checkpoints` | `none \| full` | `none` | per-requirement human stops — `full` = tests + complete stops |
| `### Review` | `skip \| parallel \| inline` | `skip` | per-requirement review — `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass |
| `### Feature review` | `auto \| parallel \| inline` | `auto` | the one whole-feature review — always run, never per requirement (a trivial doc carries no tag; the missing tag resolves to `auto`) |

Nothing is tagged silently: **only the human tags** a slice; each tag resolves where its decision executes.

## User override commands

| User says | Agent does |
|-----------|-----------|
| `skip` | Set its Done cell `⏭` (with the reason), reconcile its test coverage, move to next |
| `status` | Show the progress file (feature phase + requirement table) |
| `stop` | Restore current requirement to its pre-in-progress state, suggest `/new` |
| `retry` | Re-read the requirement, start over |

## Receiving feedback (outside a checkpoint)

Verify the criticism against the code, then implement (with tests) or push back with evidence.

## After the feature review

Determine the next step from the artifacts — a suggestion, not a gate. The overview check is **folder-local** — the `overview.md` beside this leaf, inside the same `docs/plans/<date>-<topic>/` directory, never a repo-wide `docs/plans/**/overview.md`, and always excluding docs/plans/completed/:

- **Standalone topic** (no `overview.md` in the topic folder) → suggest `/skill:pwk-finalizing`.
- **Umbrella part** (an `overview.md` sits beside this leaf) → read its `## Parts (build order)` roster; complete when every roster leaf has a `done` progress file → `/skill:pwk-finalizing` (one PR for the whole umbrella). Otherwise the **next leaf** is the first roster part with no `done` progress file — not the next entry in build order: a leaf with no progress file and no `<leaf>-design.md` → `/skill:pwk-brainstorming`; one with a `<leaf>-design.md` but no progress file → `/skill:pwk-executing-tasks`; one whose progress file is not `done` → `/skill:pwk-executing-tasks` to resume it.

Present:

```
✅ Feature complete — feature gates green, feature review done!

Feature phase: done
| # | Done | Requirement |
|---|------|-------------|
| 1 | ✅ | <name> |

   - Next part: /skill:pwk-brainstorming (unstarted leaf) or /skill:pwk-executing-tasks (designed or mid-flight) — per the routing above   ← umbrella, more parts remain
   - Ship: /skill:pwk-finalizing                          ← standalone, or last umbrella part
```

## If you're stuck

1. Re-read the requirement’s acceptance criteria — you may have drifted.
2. Check `git log` for context; ask the user — clarify beats guessing.
3. Still stuck → discard uncommitted changes (`git restore .`); if already committed, also `git revert` the requirement’s commit(s). **Never leave a failed requirement’s partial work on the shipped branch.**
4. Set its Done cell `❌` (with the reason as a suffix in the Requirement cell), reconcile its test coverage, and move on; `docs/lessons.md` may hold an applicable rule.

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
| R# | Requirement | How it was built | Deviated? | Evidence |
## Code digest
### Summary
### Flow
### Gotchas
### Key files
```
