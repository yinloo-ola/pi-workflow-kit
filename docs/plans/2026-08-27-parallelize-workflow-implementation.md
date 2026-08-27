# Implementation Plan: parallelize-workflow

## Overview
Design: docs/plans/2026-08-27-parallelize-workflow-design.md

Branch: parallelize-workflow

Workspace: this session is on the `parallelize-workflow` branch (created
during plan phase per `pwk-writing-plans` step 2). No worktree is
offered — the change is small (one new agent, one new skill step, one
new skill-lint assertion, three small doc/copy edits) and the session
already has the right context.

**Out of scope (deferred to follow-up PRs, per design R8):**
- B — Plan critique reviewers
- C — Finalize mechanics delegation (deferred indefinitely — see design)
- D — Diagnose parallel probes

## Requirement 1: pwk-recon-scout agent

The new read-only scout agent that `pwk-brainstorming` dispatches before
design.

### Acceptance criteria
- Given a non-trivial brainstorm on a topic with prior art in the repo,
  When `pwk-brainstorming` reaches its codebase-recon step, Then it
  dispatches the `pwk-recon-scout` agent with the topic + a one-line
  intent + the repo root, and the returned report is used as the
  grounding context for the next two steps (Explore approaches, Present
  the design).
- Given the scout is dispatched, When the executor runs `head -20
  agents/pwk-recon-scout.md`, Then the file begins with YAML
  frontmatter declaring `name: pwk-recon-scout`, a non-empty
  `description:`, `tools: read, grep, find, ls, bash` (the same
  read-only set as the four code-review agents), and
  `systemPromptMode: replace`.
- Given the scout is dispatched, When it runs, Then its output is a
  5-section codebase map with the section headers **Relevant files**,
  **Existing patterns**, **Call sites**, **Test layout**, and
  **Gotchas** (in that order, one short bulleted list per section, each
  claim citing a `path:line`).
- Given the scout is dispatched, When it runs, Then its output is
  observations only — no design recommendations, no code snippets
  beyond one-line excerpts, no opinions on which approach to take.
- Given `pi-subagents` is NOT installed, When `pwk-brainstorming`
  reaches the recon step, Then it skips the dispatch, performs inline
  recon using `read`/`grep`/`find` as today, and the design doc it
  eventually writes contains the literal line
  `Scout: unavailable (pi-subagents not installed) — inline recon used.`
- Given a trivial brainstorm (typo, version bump, single-function
  change per the proportionality rule), When `pwk-brainstorming` runs,
  Then it skips the recon step entirely and proceeds straight to
  step 4 (Explore approaches) — no scout dispatch, no inline recon.

### Integration tests
- `should dispatch scout on non-trivial brainstorm with prior art` —
  skill-lint asserts `pwk-brainstorming/SKILL.md` mentions
  `pwk-recon-scout` by name in its process steps.
- `should restrict scout tools to read-only set` — skill-lint parses
  the YAML frontmatter of `agents/pwk-recon-scout.md` and asserts
  `tools` is exactly `read, grep, find, ls, bash`.
- `should require the 5-section codebase map in scout output` —
  skill-lint asserts the agent file contains all five section headers
  in order: Relevant files, Existing patterns, Call sites, Test
  layout, Gotchas.
- `should require scout to cite file:line` — skill-lint asserts the
  agent file contains a directive to cite a `file:line` per claim.
- `should fall back to inline recon when pi-subagents unavailable` —
  skill-lint asserts `pwk-brainstorming/SKILL.md` contains the
  literal fallback note phrase `Scout: unavailable` somewhere in its
  process.
- `should skip recon on trivial brainstorm` — skill-lint asserts
  `pwk-brainstorming/SKILL.md` mentions skipping the scout when the
  topic is trivial (regression guard for the proportionality
  shortcut).

### Checkpoints: none
### Review: skip

### Production-risk notes
None from the design (R1–R4 are doc + agent-shape only). The new agent
inherits the gated read-only session, so the existing
`workflow-guard.test.ts` continues to cover the read-only enforcement;
no new guard surface.

## Requirement 2: auto-tag risky requirements with `### Review: parallel`

`pwk-writing-plans` automatically emits `### Review: parallel` for any
requirement that carries a `### Production-risk notes` section, instead
of the existing default `### Review: skip`.

### Acceptance criteria
- Given a plan generated from a design whose `## Production-risk areas`
  covers two of three requirements, When `pwk-writing-plans` emits the
  plan, Then those two requirements carry `### Review: parallel` and
  the third carries `### Review: skip`.
- Given the auto-tag is applied, When the plan is presented, Then the
  human is **not** prompted to confirm the tag — it is silently
  emitted alongside the other per-requirement tags.
- Given the auto-tag is applied, When the human reviews the plan
  before approval, Then the tag is **editable**: the human can
  downgrade it to `skip` or `inline` and `pwk-executing-tasks` honors
  the edited value (regression guard — preserves the existing
  human-in-the-loop plan approval).
- Given a requirement with an EMPTY `### Production-risk notes`
  section (the section exists but has no bullets), When the plan is
  emitted, Then the requirement carries `### Review: skip` — empty
  notes do not trigger the auto-tag.
- Given the auto-tag rule lives in `pwk-writing-plans`, When the
  other skills and docs are inspected, Then they reference the rule
  rather than restating it (single source of truth — guard against
  copy-paste drift in `pwk-executing-tasks` and the docs).

### Integration tests
- `should auto-tag parallel for requirements with non-empty
  Production-risk notes` — skill-lint asserts `pwk-writing-plans/SKILL.md`
  contains the phrase pairing `Production-risk notes` and
  `Review: parallel` within the same process step (single-section
  adjacency).
- `should keep skip default for requirements without risk notes` —
  skill-lint asserts `pwk-writing-plans/SKILL.md` still documents
  `skip` as the default (regression guard — the flip must not
  over-broaden).
- `should keep auto-tag editable` — manual test: human edits the
  tag in the plan before approval; `pwk-executing-tasks` reads the
  edited tag. (Not a skill-lint assertion; verified in feature-level
  review.)
- `should keep one source of truth in pwk-writing-plans` — skill-lint
  asserts the new rule's phrase is unique to `pwk-writing-plans/SKILL.md`
  in the skills directory (the other skills may link by name but
  must not restate the full rule).

### Checkpoints: none
### Review: skip

### Production-risk notes
None from the design. R5 is a planner-side rule change; the runtime
enforcement (`pwk-executing-tasks` honoring the tag) is unchanged.

## Requirement 3: cross-skill copy stays in sync (single source of truth)

The three sites that mention per-requirement review tags
(`pwk-executing-tasks`, `docs/workflow-phases.md`,
`docs/developer-usage-guide.md`) reference the `pwk-writing-plans`
auto-tag rule rather than restating it. Plus a README update for the
new scout + the auto-tag rule.

### Acceptance criteria
- Given the new rule lives in `pwk-writing-plans`, When
  `pwk-executing-tasks/SKILL.md` mentions per-requirement review tags,
  Then it links to the `pwk-writing-plans` rule by section name
  rather than re-stating the auto-tag logic.
- Given the new rule, When `docs/workflow-phases.md` and
  `docs/developer-usage-guide.md` are updated, Then they each
  contain **at most one sentence** about the auto-tag rule, and that
  sentence refers the reader to `pwk-writing-plans`.
- Given the new scout agent, When `README.md` is updated, Then it
  lists `pwk-recon-scout` in the parallel-review model-tiering JSON
  snippet (as a cheap-model role), adds the agent to the project
  layout block, and adds one sentence to the brainstorm section
  describing the recon step.
- Given any of the three sites is updated, When the skill-lint suite
  runs, Then all existing assertions still pass (no copy regressions
  in `pwk-executing-tasks`'s documented per-requirement ceremony).

### Integration tests
- `should link pwk-executing-tasks to pwk-writing-plans review rule` —
  skill-lint asserts `pwk-executing-tasks/SKILL.md` references
  `pwk-writing-plans` in the per-requirement review section.
- `should keep cross-skill copy to one sentence each` — manual test
  in feature-level review; the three sites must not restate the
  rule. (Documented as a code-review finding, not a skill-lint
  assertion — the assertion would be brittle against legitimate
  rewordings.)

### Checkpoints: none
### Review: skip

### Production-risk notes
None from the design. Pure copy edits, no runtime surface.

## Feature acceptance

The **primary enforced spec** — the definition of done for the feature.
The executor writes these checks first (before any code/agent/skill
edits) and runs them as `feature-complete` gates.

- `should dispatch scout and use its report as design grounding` —
  Given `pi-subagents` is installed, When a non-trivial brainstorm is
  run on a topic with prior art (e.g. "add a new field to the
  workflow-guard's UNLOCK_SKILLS list"), Then the design doc reflects
  observations **from the scout's report** (the report's `path:line`
  citations appear in the design doc's "Existing patterns" or
  "Call sites" sections) and the design doc does NOT contain raw
  file contents the main agent would have had to read inline (the
  citations are summaries, not pasted code blocks >5 lines).
- `should fall back gracefully when pi-subagents absent` — Given
  `pi-subagents` is NOT installed, When the same brainstorm runs,
  Then the design doc contains the literal line
  `Scout: unavailable (pi-subagents not installed) — inline recon
  used.`
- `should auto-tag parallel for risky requirements only` — Given a
  plan generated from a design with mixed risk coverage, When the
  plan is written, Then only the requirements with non-empty
  `### Production-risk notes` carry `### Review: parallel`; the
  others carry `### Review: skip` (one named test for each side of
  the rule, exercising both the tagged and not-tagged branches).

The executor's job to make these green:
1. Add the **test-first** skill-lint assertions listed under each
   requirement (red — the skills don't yet claim the new behavior).
2. Edit the skill / agent / doc markdown to satisfy them (green).
3. Compose the feature E2E by hand-walking through the three
   scenarios above with a real brainstorm in a fresh session (this
   is a doc-only change, so the "test" is a manual end-to-end check
   at `feature-complete` — the human runs it).
4. Apply the `### Feature review: parallel` four-reviewer pass over
   the whole diff (the existing parallel-review machinery).

### Feature review: parallel
One review over the whole feature diff (always). Default `parallel` —
this PR touches one new agent + three skills + one README, so the
thoroughness is worth the parallel cost (and the four reviewers are
agentOverride-pinnable to cheap models per the kit's documented
tiering).
