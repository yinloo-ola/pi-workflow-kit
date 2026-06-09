# Workflow Phases

`pi-workflow-kit` has 4 phases and 1 utility skill. You invoke each one explicitly with `/skill:`.

```
brainstorm → plan → [design-review?] → execute → [verify?] → finalize
```

For complex features, each phase loops per feature:
```
brainstorm (name features) → plan next feature → [design-review?] → execute feature → [verify?] → loop...
```

## brainstorm

```
/skill:pwk-brainstorming
```

- Explore requirements and shape the design
- Ask questions one at a time, propose approaches
- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` with a `## Features` table listing all features and their status

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## plan

```
/skill:pwk-writing-plans
```

- Read the design doc's Features table, identify the next `⬜ pending` feature
- Mark it `🔄 planned` and create a per-feature implementation plan
- Produce `docs/plans/YYYY-MM-DD-<topic>-<feature-name>-implementation.md`
- Optionally trigger design review for non-trivial features

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## execute

```
/skill:pwk-executing-tasks
```

- Read the plan doc, resolve the design doc and feature row from metadata
- Implement tasks one at a time: implement → test → fix → commit
- Mark feature `✅ done` in the design doc's Features table when complete
- Suggest planning the next feature or verifying

No write restrictions. All tools available.

## finalize

```
/skill:pwk-finalizing
```

- Archive plan docs to `docs/plans/completed/`
- Update CHANGELOG, README if needed
- Create PR
- Clean up worktree if one was used

No write restrictions. All tools available.

## diagnose

```
/skill:pwk-diagnose
```

Not a pipeline phase. A utility skill invoked on demand when debugging is needed.

- Build a feedback loop (failing test, curl script, etc.)
- Reproduce, hypothesise, instrument, fix, cleanup
- No write restrictions (used during execute/finalize, or outside the pipeline)
