# Workflow Phases

`pi-workflow-kit` has 4 phases and 1 utility skill. You invoke each one explicitly with `/skill:`.

```
brainstorm → plan → execute → finalize
```

## brainstorm

```
/skill:brainstorming
```

- Explore requirements and shape the design
- Ask questions one at a time, propose approaches
- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md`

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## plan

```
/skill:writing-plans
```

- Read the design doc
- Break into bite-sized tasks with TDD scenarios
- Optionally set up a branch or worktree
- Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`

Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.

## execute

```
/skill:executing-tasks
```

- Read the implementation plan
- Implement tasks one at a time: implement → test → fix → commit
- Handle code review feedback by verifying criticism before implementing

No write restrictions. All tools available.

## finalize

```
/skill:finalizing
```

- Archive plan docs to `docs/plans/completed/`
- Update CHANGELOG, README if needed
- Create PR
- Clean up worktree if one was used

No write restrictions. All tools available.

## diagnose

```
/skill:diagnose
```

Not a pipeline phase. A utility skill invoked on demand when debugging is needed.

- Build a feedback loop (failing test, curl script, etc.)
- Reproduce, hypothesise, instrument, fix, cleanup
- No write restrictions (used during execute/finalize, or outside the pipeline)
