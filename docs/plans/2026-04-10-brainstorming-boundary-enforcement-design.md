# Brainstorming Skill Boundary Enforcement

**Date:** 2026-04-10
**Status:** approved

## Problem

The brainstorming skill's boundaries are advisory only — a quiet `## Boundaries` bullet list mid-file that the model reads then ignores once a task "feels" straightforward. There is no structural enforcement (pi doesn't implement `allowed-tools`, no tool-blocking extension API).

In practice, `/skill:brainstorming` was invoked, the skill was loaded, and the agent immediately jumped to reading code, diagnosing the bug, and editing source files — violating every boundary.

## Design

Two changes to `skills/brainstorming/SKILL.md`:

### 1. Add `allowed-tools` frontmatter

```yaml
allowed-tools: read bash
```

Pi doesn't parse this field yet, but:
- It's part of the Agent Skills spec (experimental)
- Future pi versions may inject it into the system prompt
- Serves as machine-readable declaration of intent
- Zero cost today

### 2. Replace quiet Boundaries section with prominent top-of-file block

Move from a mid-file `## Boundaries` section to a visually distinct blockquote immediately after the `# Heading`, before the Overview:

```markdown
> ⚠️ **BOUNDARY — DO NOT VIOLATE**
>
> This skill is **read-only exploration**. You MUST NOT use `edit` or `write` tools.
> The only tools allowed are `read` and `bash` (for investigation only).
>
> - ✅ Read code and docs: yes
> - ✅ Write to `docs/plans/`: yes (design documents only)
> - ❌ Edit or create any other files: **absolutely no**
>
> If you find yourself reaching for `edit` or `write`, **stop**. Present what
> you found as a design section and ask the user to approve it first.
```

Key improvements over current form:
- **Blockquote + warning emoji** — visually distinct from normal content
- **"DO NOT VIOLATE"** — strong language models respond to
- **Names forbidden tools explicitly** (`edit`, `write`) — no ambiguity
- **Recovery instruction** — "stop, present what you found" — constructive next step
- **Positioned at the top** — seen before the Overview, not buried mid-file

## Out of scope

- Extension-level enforcement (requires pi core changes to support tool call interception)
- Changing other skills' boundaries (this is a pattern, but brainstorming is the most frequently violated)

## Testing

Manual verification: invoke `/skill:brainstorming`, confirm the model does not reach for `edit`/`write` during exploration.
