# Implementation Plan: Enforce Generic Lessons in `docs/lessons.md`

Design: docs/plans/2026-05-20-generic-lessons-design.md

Two skill files need four text edits total. No tests (markdown-only changes). Both
tasks are trivial — exact old/new text is specified so the executor can apply them
without guessing.

---

## Task 1: Add generalization test + update format comment in `executing-tasks`

<!-- tdd: trivial -->

File: `skills/executing-tasks/SKILL.md`

Two edits in one file:

### Edit A — Step 6 "Learn from mistakes"

Replace:
```
6. **Learn from mistakes** — if you caught yourself making a mistake during this task that you've made before or that would apply to future tasks, append a rule to `docs/lessons.md`. Only add rules that would change future behavior. If the file doesn't exist, create it with the standard format (see below).
```

With:
```
6. **Learn from mistakes** — if you caught yourself making a mistake during this task that you've made before or that would apply to future tasks, append a rule to `docs/lessons.md`. Only add rules that would change future behavior. If the file doesn't exist, create it with the standard format (see below).

   Before writing, apply the **generalization test**: would this rule apply equally to a completely different feature or domain in this repo? If not, rewrite it — strip out specific service names, entity types, and domain concepts, and express the underlying pattern instead. If you can't express a generic form, don't write the rule.

   ❌ **Domain-specific** (only survives this sprint):
   > "Always validate `userId` before calling `UserProfile.Get`"

   ✅ **Generic** (applies across the whole repo):
   > "Always validate required ID fields at the service boundary — missing IDs should return 400, not 500"
```

### Edit B — `docs/lessons.md` format template comment

Replace:
```
<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Retire rules that no longer apply during finalizing.
-->
```

With:
```
<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->
```

Steps:
1. Apply Edit A to `skills/executing-tasks/SKILL.md`
2. Apply Edit B to `skills/executing-tasks/SKILL.md`
3. Verify: open the file and confirm both edits are present and the surrounding text is intact

---

## Task 2: Add generalization audit bullet + update format comment in `finalizing`

<!-- tdd: trivial -->

File: `skills/finalizing/SKILL.md`

Two edits in one file:

### Edit A — Step 2 "Review lessons learned"

Replace:
```
   - Add any lessons from this session that were missed during execution
   - Retire rules that no longer apply (remove the bullet)
```

With:
```
   - Add any lessons from this session that were missed during execution
   - **Generalize domain-specific rules** — if a rule names a specific service, entity, or feature, either rewrite it as a generic pattern or remove it if no generic form exists
   - Retire rules that no longer apply (remove the bullet)
```

### Edit B — `docs/lessons.md` format template comment

Replace:
```
<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Retire rules that no longer apply during finalizing.
-->
```

With:
```
<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->
```

Steps:
1. Apply Edit A to `skills/finalizing/SKILL.md`
2. Apply Edit B to `skills/finalizing/SKILL.md`
3. Verify: open the file and confirm both edits are present and the surrounding text is intact
