# Workflow Phases

`pi-superpowers-plus` tracks four global phases:

```text
brainstorm → plan → execute → finalize
```

## brainstorm

Primary skill: `/skill:brainstorming`

Purpose:
- explore requirements
- shape the design
- produce a design artifact under `docs/plans/`

Write boundary:
- allowed: `docs/plans/`
- discouraged elsewhere; runtime warnings may be injected

## plan

Primary skill: `/skill:writing-plans`

Purpose:
- turn the design into a concrete implementation plan
- define task type (`code` or `non-code`)
- define code-task steps or non-code acceptance criteria

Write boundary:
- allowed: `docs/plans/`
- discouraged elsewhere; runtime warnings may be injected

## execute

Primary skill: `/skill:executing-tasks`

Purpose:
- initialize `plan_tracker`
- execute tasks one at a time
- track per-task phase and attempt counts

Per-task phases:
- `define`
- `approve`
- `execute`
- `verify`
- `review`
- `fix`
- terminal states: `complete`, `blocked`

## finalize

Primary skill: `/skill:executing-tasks`

Purpose:
- perform holistic review
- prepare PR / push / cleanup
- archive planning docs
- update README / CHANGELOG / other documentation when needed

## Detection signals

The workflow monitor uses a few practical signals:

- skill invocations such as `/skill:brainstorming` or `/skill:writing-plans`
- writes to `docs/plans/*-design.md` and `docs/plans/*-implementation.md`
- `plan_tracker` initialization to enter execute
- all tracked tasks reaching terminal state to mark execute complete
- boundary-prompt acceptance to enter finalize
