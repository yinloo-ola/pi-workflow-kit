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
- **Editing skill markdown: anchor edit-tool oldText on apostrophe-free text.** These docs use curly apostrophes (U+2019) in contractions and possessives; an oldText written with a straight ASCII apostrophe fails to match silently and aborts the whole edit batch (zero blocks replaced). Pick anchors that avoid apostrophes, and rephrase newText to stay apostrophe-free for consistency.
- **skill-lint.mjs: use optional chaining.** Biome enforces `useOptionalChain` — write `x?.method()`, not `x && x.method()` (the `fgMark` helper treats undefined content as a fail).

## Testing

- **Meaningful tests, mirrored across writing-plans, executing-tasks, and here.** (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.

## Documentation