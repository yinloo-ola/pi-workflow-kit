# Workflow Phases

`pi-workflow-kit` has 5 pipeline skills plus 1 utility skill. You invoke each one explicitly with `/skill:`.

```
brainstorm → writing-plans → executing-tasks → finalizing
                          (per requirement: tests → ⏸ checkpoint → implement → ⏸ checkpoint → code-review)
```

For multi-design work (a large issue split into several design docs), run the pipeline once per design doc.

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

- Read the design doc's `## Requirements`; for each, derive **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code).
- Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.

Write boundary: only `docs/plans/` is writable.

## executing-tasks

```
/skill:pwk-executing-tasks
```

- Per requirement: write the integration tests (red) → **⏸ checkpoint: tests** → implement to green (full autonomy — the executor chooses structure/signatures/internals) → **⏸ checkpoint: complete** → commit → `/skill:pwk-code-review`.
- Two **mandatory** human checkpoints per requirement.
- Progress tracked in `docs/plans/*-progress.md`.

No write restrictions. All tools available.

## code-review

```
/skill:pwk-code-review
```

- Runs after each requirement completes: code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check.
- Unlocked — may modify code to fix smells.

No write restrictions.

## finalizing

```
/skill:pwk-finalizing
```

- Archive the design's planning docs (per-`<topic>`) to `docs/plans/completed/`; ADRs stay at `docs/adr/`.
- Curate `docs/lessons.md`, update README/CHANGELOG, create PR or merge.

No write restrictions.

## diagnose

```
/skill:pwk-diagnose
```

Not a pipeline phase. A utility skill invoked on demand when debugging is needed.

No write restrictions.

## Continuity across sessions

A new session resumes by invoking the skill for the phase to continue. The skill globs `docs/plans/` for its artifact (progress file / plan doc), resumes the single match, or asks if several. Each resumption skill reports what it found on entry — no registry file needed; the `<topic>` slug in the filenames is the identity.