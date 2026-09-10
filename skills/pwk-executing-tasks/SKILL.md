---
name: pwk-executing-tasks
description: "Implement a design doc via the feature-gate flow: write the feature-acceptance E2E first, implement the ### R<n> requirement blocks back-to-back, then one feature-level review. Run after pwk-brainstorming. Per-requirement checkpoints/reviews are opt-in (default off)."
---

# Executing Tasks

Implement the design doc from `docs/plans/*-design.md` via the **feature-gate flow**. The design doc is the single buildable artifact — its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*: structure, signatures, internals are yours.

The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the design doc tags (default off); the feature gate covers everything else.

**Legacy in-flight features** (created before 2.0): a stem-matched `*-implementation.md` routes the old plan flow — parse its `## Requirement N:` sections instead of ### R<n> blocks; everything else is identical. Discovery covers both suffixes.

## Before you start

1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then recursively list files under `docs/plans`, excluding docs/plans/completed/, for `*-design.md` and `*-implementation.md` (umbrella docs live in `docs/plans/<date>-<umbrella>/` folders — archived work is not pending), letting the search tool do the recursing (e.g. `find docs/plans -name '<suffix>' -not -path '*/completed/*'`) — glob patterns like `**` don't recurse in non-interactive shells. A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.

## First run

1. **Parse the design doc** — read every `### R<n>:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag in the `## Feature acceptance` section. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first. (Legacy plan doc: read `## Requirement N:` headings the same way.)
2. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the design doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):

   ```markdown
   # Progress: <topic>

   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
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

   ## Code digest

   <!-- Written once, after the feature review passes; never back-filled per requirement. -->

   ### Summary — 2–3 sentences: what the code now does differently, and why.
   ### Flow — execution/data movement through the changed code, as arrow chains.
   ### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
   ### Key files — 3–5 pivotal files, one line each: what shifted inside them.
   ```

   The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.

   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)

4. **Commit the design docs** — `git add docs/plans/ && git commit -m "docs: add design doc"`.
5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.

## Resume

Read the progress file's `Feature phase` (match the line — e.g. `grep -m1 '^Feature phase:' <file>`), the Requirements table (the first row whose Done cell is not `✅` routes the next requirement — `⬜`, `🔄`, and blank all mean not-done), and the Execution summary rows (how prior parts were built); read from the top through the end of `## Execution summary` and stop — the sections after it (deviation-records, review reports, code digest) carry nothing the resume needs:
- `e2e-written` → write the E2E if not yet present, then present the **feature-spec** checkpoint.
- `feature-spec-paused` → re-present the feature-spec checkpoint and wait.
- `implementing (k/N)` → continue the next not-yet-✅ requirement.
- `reviewing` → continue/finish the feature review, then assemble the **ship** checkpoint.
- `ship-paused` → re-present the ship checkpoint and wait.
- legacy `feature-complete-paused` (a progress file from before the ship gate) → treat as `reviewing`: finish the feature review, then present the ship checkpoint.

## Progress file

Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.

**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop. A departure that **reverses or alters a design decision** gets a **deviation decision-record**: a short paragraph (what changed, why, what was rejected) written into the progress file while the knowledge is fresh — mechanical deviations keep the one-liner. `pwk-finalizing`'s learning sweep harvests these records for ADRs before the docs are disposed.

## Implement phase (after feature-spec is approved)

Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:

1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.

### Per-requirement review (opt-in)

If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.

`Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).

### Checkpoint gates are mandatory (when the tag says so)

When a per-requirement checkpoint fires it is a **hard stop**:
- Stop immediately; never proceed without explicit human approval.
- **Never** `git add` or `git commit` before approval at a checkpoint.
- Set the progress phase/status **before** pausing.

## Ship checkpoint (feature-complete + review, merged)

When every requirement's Done column is ✅:

1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
   - a green-gates line: full suite green, feature E2E green;
   - the **execution summary** — what each requirement became, deviations included;
   - the **code digest** — the plain-language change explanation from the progress file (summary, flow, gotchas, key files);
   - the **coverage table** from the spec-reviewer report (one verdict row per R#);
   - findings status: fixed / open for the human;
   - "full diff on request" — the raw diff is one command away; show a hunk only where a verdict or finding makes the human ask.

   Wait for approval. **request changes** → fix, re-run the gates (and the review if the change is substantive), re-present.

A reviewer report without a per-requirement coverage table is invalid — retry the role or complete it inline before pausing; the ship checkpoint is never presented without coverage.

The old "integration gate" is gone — the feature E2E at the ship checkpoint *is* the gate; there is no separate end pass.

## Feature review

This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.

**Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:

```bash
PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # beside the design doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
{
  echo "# Review packet: <topic> — feature review"
  echo
  echo "## Commits"
  git log --oneline <merge-base>..HEAD
  echo
  echo "## Changed files"
  git diff --stat <merge-base>...HEAD
  echo
  echo "## Acceptance criteria (verbatim from the design doc)"
  sed -n '/^### R1/,/^## Feature acceptance/p' <design-doc path> | sed '/^## Feature acceptance/,$d'
  # legacy plan doc (stem-matched -implementation.md): sed -n '/^## Requirement 1/,/^## Feature acceptance/p' instead of the ### R1 span
  echo
  echo "## Feature acceptance (verbatim)"
  sed -n '/^## Feature acceptance/,/^### Feature review/p' <design-doc path> | sed '/^### Feature review/,$d'
  echo
  echo "## Production-risk notes (verbatim, if any)"
  sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p' <design-doc path> | sed -E '/^(## |### R[0-9])/d'
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

The design doc tags each requirement and the feature level:

- **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
- **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. The auto-tag default for requirements with non-empty `### Production-risk notes` is `parallel` (see `pwk-brainstorming` for the rule).
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

The feature is implemented, reviewed, and approved at the ship checkpoint. Determine the next step from the artifacts (the human drives every transition — this is a suggestion, not a gate; both overview checks below run excluding docs/plans/completed/ — an archived umbrella never routes):

- **Standalone design doc** (no `docs/plans/**/overview.md` exists) → suggest `/skill:pwk-finalizing`.
- **Umbrella part** (a `docs/plans/**/overview.md` exists) → read the overview roster and find this part's `<topic>`. If it is the **last** in build order, the umbrella is complete → suggest `/skill:pwk-finalizing` (one PR for the whole umbrella). If **more parts remain**, suggest `/skill:pwk-brainstorming` for the **next part** (the next `<topic>` in the roster).

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
