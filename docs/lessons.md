# Lessons Learned

<!--
Agent: read this during brainstorm (design), writing-plans (acceptance criteria + tests), executing-tasks (per requirement), and finalizing (curation).
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->

## Cross-Skill Consistency

- **skill-lint assertions for new behavior need a marker that distinguishes new from old.** A token present in both models gives a false green — e.g. `/umbrella/` matched the old `<umbrella>-overview.md` filename placeholder before the new behavior landed; switched to `/status-free/`, a property only the new model has.
- **Test-first for skill/doc content:** add the skill-lint assertion first (red — the skill doesn't yet claim the behavior), then edit the skill markdown to satisfy it (green). After edits run biome — it collapses short `if (cond) ok();` to one line and rejects array holes like `[, ""]` (restructure instead).

## Documentation