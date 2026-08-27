# Design: Parallelize the workflow — recon scout + auto-tag risky reqs for parallel review

## Requirements

- **R1 — A new read-only `pwk-recon-scout` package agent** fans out from
  `pwk-brainstorming` to map how the codebase handles a topic *before* the
  main agent commits to a design. Scout's report becomes the grounding
  context the main agent uses for steps 4 (Explore approaches) and 5
  (Present the design).
- **R2 — Scout runs in the gated (read-only) phase** — its tool set is
  `read, grep, find, ls, bash`, identical to the existing four reviewer
  agents. The workflow-guard already blocks `write`/`edit` on the main
  session; the scout inherits the same restriction.
- **R3 — Scout runs at most once per brainstorm session** (or once per
  design doc for an umbrella part), and only when the topic plausibly
  needs codebase grounding. Trivial changes skip it (the proportionality
  rule in `pwk-brainstorming` already compresses trivial work to one
  turn; the scout is gated on the same signal).
- **R4 — Scout degrades gracefully** when `pi-subagents` is not installed:
  fall back to the main agent's inline `find`/`grep`/`read` recon, with a
  one-line note in the design doc that scout was unavailable. No new
  required dependency; `pi-subagents` stays optional.
- **R5 — `pwk-writing-plans` auto-tags `### Review: parallel`** for every
  requirement that carries a `### Production-risk notes` section.
  Requirements without risk notes keep the existing default (`skip`).
- **R6 — The default flip is silent, not a new prompt.** The planner
  applies the tag during plan generation; the human does not get a
  confirmation dialog. The tag remains editable in the plan, so the
  human can still downgrade it to `skip` or `inline` before approving
  the plan.
- **R7 — The `pwk-executing-tasks` skill and `docs/workflow-phases.md`
  copy stay in sync** with the new default. Single source of truth is
  the `pwk-writing-plans` rule (R5); the other two sites link to it,
  not restate it.
- **R8 — Scope intentionally excludes B, C, D from this design doc.**
  See *Out of scope* below. They ship in their own design docs and their
  own PRs.

## Problem

Today the only `pi-subagents` use in the kit is the feature-level code
review in `pwk-executing-tasks`. Two consequences:

1. **Brainstorm is context-heavy on the main agent.** Mapping how a
   codebase does X today means the main agent reads dozens of files.
   Those contents stay in the context window for the whole design
   discussion, displacing the design conversation itself.
2. **The existing review safety net under-fires.** Per-requirement
   `Review: parallel` is opt-in via a plan tag the human has to remember
   to set. The four-reviewer parallel pass is one of the kit's biggest
   wins, and it rarely fires on the requirements that need it most
   (production-risk ones).

The fix is two small additions that share the same read-only, cheap-
model, subagent-fanout pattern already proven by the four code-review
agents.

## Approaches considered

### Recon scout (R1–R4)

| # | Approach | Verdict |
|---|---|---|
| A1 | Main agent does recon inline (today) | Rejected — the token cost of loading code into the main session is exactly what we're trying to avoid |
| A2 | Single dedicated `pwk-recon-scout` agent runs once before design | **Recommended** — bounded task, one report, fresh context, cheap model |
| A3 | Multi-agent fanout (N scouts per topic) | Rejected — over-engineered; one tight report beats N overlapping ones for a brainstorm grounding context |
| A4 | On-demand scout the main agent calls mid-discussion | Rejected — defeats the token-saving purpose; scout findings have to be re-inlined into main context each call |

### Default `Review: parallel` for risky reqs (R5–R7)

| # | Approach | Verdict |
|---|---|---|
| E1 | Default `parallel` for every requirement | Rejected — re-introduces the per-requirement ceremony churn that 1.3.0 explicitly opted out of |
| E2 | Default `parallel` for requirements with `### Production-risk notes` (carried from the design's `## Production-risk areas`) | **Recommended** — uses the human's existing risk judgment as the trigger; opt-in for the other 95% of reqs is preserved |
| E3 | Heuristic keyword scan of requirement text | Rejected — duplicates `## Production-risk areas` with a second, drifting source of truth |

## Architecture

### R1: the new `pwk-recon-scout` agent

File: `agents/pwk-recon-scout.md`. Same shape as the four reviewer
agents — YAML frontmatter (`name`, `description`, `tools`,
`systemPromptMode: replace`), then a "do this, report that" body. No
`model:` field — model is bound via the user's `subagents.agentOverrides`
in `~/.pi/agent/settings.json` (default cheap / low thinking).

**Task shape** (the agent's job):

> Given a `<topic>` and a one-line intent, produce a structured
> **codebase map** with five sections, each a short bulleted list:
>
> 1. **Relevant files** — paths + one-line role
> 2. **Existing patterns** — how similar work is done here today (the
>    pattern the new design must compose with)
> 3. **Call sites** — where the new behavior would plug in (or change
>    existing wiring)
> 4. **Test layout** — where similar tests live, what harness they use,
>    one or two example names to mimic
> 5. **Gotchas** — anything that bit a previous change (a migrations
>    folder that has to run in order; a feature flag; a known deadlock
>    with another subsystem; a custom test fixture that's painful to
>    build)
>
> The report is **observations only**. No recommendations, no design
> opinion, no code. Findings must cite a file:line for every claim so
> the main agent can drill in.

**Tools**: `read, grep, find, ls, bash` (same as the reviewers — scout
is read-only, the guard blocks `write`/`edit` anyway, and no other
write surface is needed).

### R2 + R3: where the scout runs in `pwk-brainstorming`

Insert between current step 3 ("Understand the idea") and step 4
("Explore approaches"):

```
3.5  (new) Codebase recon — dispatch `pwk-recon-scout` (read-only,
      fresh context, cheap model) with the topic + one-line intent.
      Read the returned codebase map. If the topic is trivial
      (typo/version bump/single-function change per the proportionality
      rule) OR `pi-subagents` is not installed, skip the dispatch and
      do the recon inline as today.

4.   Explore approaches — propose 2-3 against the codebase map.
```

The scout's report is the input to steps 4 and 5. The main agent
**never re-reads the files the scout covered** unless the design
specifically needs a deeper look at one — the scout's report + the
main agent's design conversation fit in the main context where the
code alone would not.

### R4: graceful degradation

`pwk-brainstorming` checks for the `subagent` tool at the start of step
3.5 (same way `pwk-executing-tasks` already does for the feature
review). Absent → skip the dispatch, do inline recon, append a one-line
note to the design doc: `Scout: unavailable (pi-subagents not installed)
— inline recon used.` This matches the existing fallback pattern in
`pwk-executing-tasks:114` and keeps `pi-subagents` optional.

### R5: the `pwk-writing-plans` default flip

`pwk-writing-plans` already iterates the design's `## Production-risk
areas` and emits `### Production-risk notes` per requirement. The
change is one rule in the writer's process (after the audit step):

> For each requirement that has a non-empty `### Production-risk notes`
> section, emit `### Review: parallel` as the default. Requirements
> without risk notes keep the existing default (`skip`). The human can
> still edit the tag in the plan before approving.

This piggybacks on a structure that already exists. The flip is in
`pwk-writing-plans` only; the two downstream consumers
(`pwk-executing-tasks`, `docs/workflow-phases.md`) link to the rule
instead of restating it (R7). The `docs/lessons.md` rule on single
sources of truth ("don't duplicate rules across skills") already
exists.

### R6: silent auto-tag, editable

No confirmation prompt. The tag is what `pwk-writing-plans` writes;
the human reviews the plan (the existing approval gate before
`pwk-executing-tasks`) and can downgrade any tag before approving.
This matches the existing behavior for every other auto-applied
default in the plan (the `none` checkpoint default, the `parallel`
feature-review default).

## Components

| Component | Change | Lines |
|---|---|---|
| `agents/pwk-recon-scout.md` | New file | ~50 |
| `skills/pwk-brainstorming/SKILL.md` | Insert step 3.5; add subagent availability check; add inline-recon fallback note | ~15 |
| `skills/pwk-writing-plans/SKILL.md` | Add the auto-tag rule (R5) under the existing "Production-risk notes" emission step; add a one-line cross-link in the audit step | ~10 |
| `skills/pwk-executing-tasks/SKILL.md` | No change — it already reads the per-requirement `### Review` tag verbatim |
| `docs/workflow-phases.md` | One paragraph noting that production-risk reqs auto-tag for parallel review (link, not restate) | ~5 |
| `docs/developer-usage-guide.md` | One paragraph under the existing "Parallel review" section: scout exists, auto-tag rule | ~10 |
| `README.md` | Add `pwk-recon-scout` to the "Model tiering" JSON snippet; add the new scout agent to the project layout; one line in `## What You Get` about brainstorm recon | ~20 |
| `tests/workflow-guard.test.ts` | Optional — only if a new bash/file path needs to be linted. The recon scout is read-only, so the existing `UNLOCK_SKILLS` assertion is unchanged. | 0 likely |
| `tests/skill-lint.mjs` | New assertion: the four pwk-* skills each mention the scout where appropriate, and `pwk-writing-plans` mentions the auto-tag rule. Mirrors the existing skill-lint discipline. | ~15 |

## Data flow

1. User runs `/skill:pwk-brainstorming` with an idea.
2. Main agent runs steps 1–3 (git state, discovery, understand the
   idea). Captures the topic + one-line intent.
3. Main agent checks for the `subagent` tool.
   - **Available**: dispatches `pwk-recon-scout` with topic + intent +
     repo root. Scout returns a 5-section codebase map (≤ 1 page).
   - **Unavailable**: does inline recon, appends a `Scout: unavailable`
     line to the eventual design doc.
4. Main agent reads the scout's report into context; runs steps 4–6
   (explore approaches, present design, write design doc) using the
   report as grounding instead of raw file contents.
5. User runs `/skill:pwk-writing-plans`. For each requirement with
   `### Production-risk notes`, `pwk-writing-plans` emits
   `### Review: parallel` automatically.
6. User approves the plan (existing gate). `/skill:pwk-executing-tasks`
   runs. Requirements with `### Review: parallel` trigger a per-req
   parallel-review pass; the rest get the default `skip` and the
   feature-level parallel review covers them at the end.

## Error handling

- **Scout fails / times out** → main agent falls back to inline recon;
  design doc gets the `Scout: unavailable` note. No abort.
- **Scout returns empty / off-topic** → main agent treats it as
  "codebase has no prior art for this topic" and proceeds with
  greenfield assumptions; the empty report itself is a useful signal.
- **`pwk-writing-plans` misclassifies a risk note** → the human
  reviews the plan and edits the tag before approval (existing gate).
  Auto-tag is silent, not enforced.
- **`pi-subagents` uninstalled mid-session** → next brainstorm
  detects the absent tool, falls back to inline recon; the design doc
  is unchanged in shape.

## Testing

The kit's discipline is **skill-lint as the test surface** for skill/
agent changes (the only TypeScript test is `workflow-guard.test.ts`).
Two new assertions in `tests/skill-lint.mjs`:

1. **R1 + R2 + R3 + R4** — `agents/pwk-recon-scout.md` exists, has
   the right YAML frontmatter (name, description, tools restricted to
   `read, grep, find, ls, bash`, `systemPromptMode: replace`), and
   `pwk-brainstorming` mentions the scout by name in its process.
2. **R5** — `pwk-writing-plans` contains the auto-tag rule phrase
   (e.g. "Production-risk notes" adjacent to "Review: parallel" within
   one section). Mirrors the existing `UNLOCK_SKILLS` assertion style.

The other skills and docs (R7) are reviewed in the feature-level
parallel review like any other cross-skill copy edit.

## Out of scope (deferred to later PRs)

- **B — Plan critique reviewers.** Different shape than code reviewers
  (input is a markdown plan, not a diff). Needs its own prompt design
  and its own design doc. Ship in a follow-up PR.
- **C — Finalize mechanics delegation.** Defer indefinitely. The
  finalize phase is the only UNLOCKED phase, and delegating any of
  its write actions to a subagent weakens the kit's security model
  (the main agent can no longer see every action the human sees) for
  a token win that doesn't move the needle. Revisit only if a real
  use case shows up (e.g. release-note generation for 20 PRs at once).
- **D — Diagnose parallel probes.** Ship in a follow-up PR. The probe
  agent's prompt shape is its own design question (it needs to know
  exactly what hypothesis to confirm, otherwise it re-does the main
  agent's diagnosis). Parked.

## Production-risk areas

None. This is a docs + agent-shape change. No runtime, no DB, no
auth, no concurrency surface. The existing `workflow-guard.test.ts`
suite still covers the guard's read-only enforcement; the recon scout
runs in a subagent that inherits the read-only session context, so no
new guard surface needs testing.

## Feature acceptance

- **FA1 — Scout fanout**: Given a non-trivial brainstorm on a topic
  that has prior art in the codebase, When `pwk-brainstorming` reaches
  its codebase-recon step, Then it dispatches the `pwk-recon-scout`
  agent (when `pi-subagents` is installed) and uses the returned
  5-section report as the grounding context for steps 4 and 5
  instead of reading those files inline.
- **FA2 — Graceful degradation**: Given the same brainstorm with
  `pi-subagents` NOT installed, When the recon step runs, Then the
  design doc includes the literal line `Scout: unavailable` and the
  rest of the brainstorm proceeds with inline recon exactly as before.
- **FA3 — Auto-tag for risky reqs**: Given a plan generated from a
  design whose `## Production-risk areas` covers two of three
  requirements, When `pwk-writing-plans` emits the plan, Then those
  two requirements carry `### Review: parallel` and the third carries
  `### Review: skip`.
- **FA4 — Editable, not enforced**: Given the auto-tagged plan from
  FA3, When the human downgrades one of the parallel tags to
  `inline` before approving, Then `pwk-executing-tasks` honors the
  `inline` choice and does not run the parallel pass for that
  requirement.
- **FA5 — Single source of truth**: Given the new rule, When any of
  the other skills or docs are inspected, Then they reference the
  `pwk-writing-plans` auto-tag rule rather than restating it, and the
  existing skill-lint assertions still pass.
