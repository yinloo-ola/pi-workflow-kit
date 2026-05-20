# Design: Enforce Generic Lessons in `docs/lessons.md`

## Problem

During `executing-tasks`, the agent writes lessons to `docs/lessons.md` scoped to the task at hand. In a monorepo, this produces domain-specific rules that are only useful within one feature or sprint — for example:

> "Always validate `userId` before calling `UserProfile.Get`"

The real lesson — applicable across any domain — would be:

> "Always validate required ID fields at the service boundary — missing IDs should return 400, not 500"

Domain-specific rules decay immediately after the feature is done and pollute the lessons file for future work.

## Goal

Rules in `docs/lessons.md` should be generic patterns applicable to any domain or feature in the repo, not instances of a pattern tied to one service or entity.

## Affected files

- `skills/executing-tasks/SKILL.md`
- `skills/finalizing/SKILL.md`

## Changes

### 1. `executing-tasks` — Step 6 "Learn from mistakes"

Add a **generalization test** after "Only add rules that would change future behavior."

```
Before writing, apply the **generalization test**: would this rule apply equally to a
completely different feature or domain in this repo? If not, rewrite it — strip out
specific service names, entity types, and domain concepts, and express the underlying
pattern instead. If you can't express a generic form, don't write the rule.

❌ Domain-specific (only survives this sprint):
   "Always validate `userId` before calling `UserProfile.Get`"

✅ Generic (applies across the whole repo):
   "Always validate required ID fields at the service boundary — missing IDs should
    return 400, not 500"
```

### 2. `executing-tasks` — `docs/lessons.md` format template comment

Add one line to the comment block so the constraint is visible every time the agent opens the file:

```
Rules must be generic patterns applicable to any domain or feature — not specific to
one service, entity, or use case.
```

### 3. `finalizing` — Step 2 "Review lessons learned"

Add a generalization audit bullet between "Add any lessons..." and "Retire rules...":

```
- Generalize domain-specific rules — if a rule names a specific service, entity, or
  feature, either rewrite it as a generic pattern or remove it if no generic form exists
```

### 4. `finalizing` — `docs/lessons.md` format template comment

Same addition as change 2 — keep both template definitions consistent.

## Slice summary

One end-to-end slice:

> **Lessons stay generic** — at write-time (executing-tasks step 6) the agent is required to generalize before writing; the file's own comment reinforces the constraint; at finalization the agent audits and cleans up anything that slipped through.
