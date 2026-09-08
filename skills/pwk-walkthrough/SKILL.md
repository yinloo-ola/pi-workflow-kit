---
name: pwk-walkthrough
description: "Generate a detailed, file-referenced walkthrough of a shipped feature or branch — Summary / How it works / Key flows / Gotchas & invariants / Change map — written to docs/walkthroughs/<topic>.md. Use when the user asks to 'explain this feature', 'walk me through the code', 'how does X work', wants an implementation deep-dive beyond the code digest, or needs an onboarding doc for existing code. On demand only; regeneration overwrites wholesale."
---

# Walkthrough

Explain a shipped feature in code-level detail, for a human reading with the files open.

**Not a pipeline phase** — never auto-run, never blocks anything. The skill is generated on demand and invoking it exits any gated design phase (it writes outside `docs/plans/`).

Five sections, always: Summary / How it works / Key flows / Gotchas & invariants / Change map.

## Contract

- **On demand only.** Someone asks (or finalize suggests it as an optional follow-up); it never runs unprompted.
- **Generated from code, not memory**: the branch diff (`<merge-base>...HEAD` — an unshipped branch is allowed, stamped at HEAD) plus the code as it exists now. Surviving artifacts (ADRs in `docs/adr/`, `docs/lessons.md`, an archived plan under `docs/plans/completed/`) are optional inputs — planning docs are usually gone by the time anyone asks, by design.
- **Output**: `docs/walkthroughs/<topic>.md`, **stamped with the commit range** it describes.
- **Regeneration overwrites wholesale.** The file is a generated cache of an explanation, never hand-edited; a re-run replaces it end to end. It is **never disposed** — finalize's globs do not touch `docs/walkthroughs/`.
- **No diff found?** Refuse with a clear reason ("no commits on this branch", "no feature matches <topic>") rather than inventing content.

## Process

1. **Identify the range** — topic or branch from the user; merge-base against the parent branch. Report the range and commit list in one line.
2. **Read the code** — changed files first (`git diff --stat`), then each file's current state around the changed regions. Follow the call graph outward until every entry point in the diff is explained.
3. **Write `docs/walkthroughs/<topic>.md`**:

   ```markdown
   # Walkthrough: <topic>

   Generated from <merge-base>..<HEAD> — file references are valid at that range.

   ## Summary
   2–4 sentences: what this feature does and what changed.

   ## How it works
   One subsection per component: responsibility + mechanism.

   ## Key flows
   Execution/data movement as arrow chains (A -> B -> C), anchored per step.

   ## Gotchas & invariants
   Edge cases, implicit assumptions, ordering constraints.

   ## Change map
   Where to touch the code for common edits, one line each.
   ```

4. **Anchor everything** — every claim in every section cites a concrete `file:line` reference (valid at the stamped range). The doc must be detailed enough to follow with the files open: no file reference, no claim.
5. **Present** — the walkthrough path plus a one-paragraph plain summary; offer regeneration when the code changes.

## Principles

- A cache of an explanation, not a curated document — regenerate, never edit.
- Depth over brevity inside the five sections; nothing outside them.
