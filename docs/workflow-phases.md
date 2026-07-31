# Workflow Phases

`pi-workflow-kit` has 5 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.

```
brainstorm → writing-plans → executing-tasks → finalizing
                          (per requirement: tests → ⏸ checkpoint → implement → ⏸ checkpoint → code-review)
```

A design doc is one PR; a requirement is one testable slice within it. For multi-design work (a large issue split into several design docs — each its own PR), run the pipeline once per design doc.

## brainstorm

```
/skill:pwk-brainstorming
```

- Explore requirements and shape the design.
- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## Requirements` list.
- May split a large issue into multiple design docs (human-approved).
- ADRs go to `docs/adr/` (permanent, never archived).

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## writing-plans

```
/skill:pwk-writing-plans
```

- Creates the feature branch first (`git checkout -b <topic>`), so design + plan docs live on the branch, not `main`.
- Reads the design doc's `## Requirements`; for each, derives **acceptance criteria + integration-test cases** (a behavioral spec, no implementation code), lists requirements in build order (dependencies positioned earlier), and challenges the design when `## Production-risk areas` is present.
- Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

Write boundary: only `docs/plans/` is writable.

## executing-tasks

```
/skill:pwk-executing-tasks
```

- Per requirement: write the integration tests (red) → **⏸ checkpoint: tests** → implement to green (full autonomy — the executor chooses structure/signatures/internals) → **⏸ checkpoint: complete** → commit → **per-requirement review** (four parallel reviewers via the `subagent` tool; falls back to inline `/skill:pwk-code-review` when `pi-subagents` is absent — see [code-review](#code-review)).
- Two **mandatory** human checkpoints per requirement — unless the plan tags a requirement lighter (see [Proportionality](#proportionality)).
- **Composition check after each commit** — if a requirement touched shared code, the executor runs the full suite now and fixes cross-requirement regressions immediately, rather than discovering them only at the integration gate.
- Progress tracked in `docs/plans/*-progress.md`.
- After all requirements: **integration gate** — run the full suite and confirm the requirements compose into the feature before `/skill:pwk-finalizing`.

No write restrictions. All tools available.

## Proportionality

The defaults preserve the 1.0.0 behavior (two checkpoints + parallel review per requirement). At plan time the human can tag each requirement lighter to right-size the workflow:

- **Checkpoints** — `full` (both stops, default) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review) | `none` (no stops, trivial only). Test-first is preserved either way: even `none` writes tests first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
- **Review** — `parallel` (four fresh-context reviewers, default) | `inline` (single `pwk-code-review` pass) | `skip` (trivial diffs with no behavioral surface only).

A trivial fix can also skip the multi-turn brainstorm dialogue via the brainstorming trivial fast-path (compress to one turn, minimal design doc) — the guard still enforces read-only. Tags default conservatively, so nothing changes unless the human opts in.

## code-review

```
/skill:pwk-code-review
```

The **inline reviewer**: code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check. Unlocked — may modify code to fix smells.

**Not a phase you drive manually.** During `pwk-executing-tasks`, per-requirement review runs **four specialized reviewers in parallel** via the `subagent` tool (spec, tracing, smell, hazard — each fresh-context, read-only reporters); this skill is the **fallback** when [`pi-subagents`](https://pi.dev/packages/pi-subagents) is not installed. You can also invoke `/skill:pwk-code-review` standalone for an ad-hoc review of any diff.

No write restrictions.

## finalizing

```
/skill:pwk-finalizing
```

- **Pre-check: run the full test suite** — don't ship a red suite (resume spans sessions; don't trust the last execute session).
- Delete consumed plan docs (per-`<topic>`) — code + tests are the source of truth; ADRs stay at `docs/adr/`.
- Curate `docs/lessons.md`, update README/CHANGELOG, create PR or merge.

No write restrictions.

## status

```
/skill:pwk-status
```

Read-only overview of all active pipeline topics (phase + progress) when several designs are in flight. Not a pipeline phase.

## diagnose

```
/skill:pwk-diagnose
```

Not a pipeline phase. A utility skill invoked on demand when debugging is needed.

No write restrictions.

## Manual override

`/pwk-guard on|off|auto` overrides the guard regardless of phase: `on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. Subcommands autocomplete. Use it as an escape hatch when the guard blocks something you genuinely need; phase transitions otherwise happen only via `/skill:` commands.

## Continuity across sessions

A new session resumes by invoking the skill for the phase to continue. The skill globs `docs/plans/` for its artifact (progress file / plan doc), resumes the single match, or asks if several. Each resumption skill reports what it found on entry — no registry file needed; the `<topic>` slug in the filenames is the identity.