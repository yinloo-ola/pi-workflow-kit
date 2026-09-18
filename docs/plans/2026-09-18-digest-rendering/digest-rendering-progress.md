# Progress: digest-rendering

Design: docs/plans/2026-09-18-digest-rendering/digest-rendering-design.md
Branch: 2026-09-18-digest-rendering
Setup: n/a
Started: 2026-09-18T00:00:00+08:00
Last updated: 2026-09-18T01:30:00+08:00
Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Flow template renders as structured markdown | — | 293cefc |
| 2 | ✅ | Gotchas and Key files prescribe bullets | — | 0f030ea c8a3dd7 |
| 3 | ✅ | Walkthrough Key flows gets the same line form | — | d71ef9c |
| 4 | ✅ | Claims pinned test-first with an independent property check | — | a50dea7 |
| 5 | ✅ | Sample progress doc for visual preview | — | ced1d8d |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Flow template renders as structured markdown | Rewrote the `### Flow` template block as bullets (`- **Spine** — <chain>`, `- **Branches**` with nested branch items, `- **Side effects** — reads · writes`); fill rule now states one spine or branch per bullet line, and the Flow-shape side-effects rule says bullet. All pinned claim words survive verbatim. | |
| 2 | Gotchas and Key files prescribe bullets | Template gained `- <one real risk per bullet>` and `- \`<file>\` — <what shifted inside it>`; fill rules say one bullet each (cap `at 5` unchanged). The longer paragraph pushed `at 5` past skill-lint's 700-char fill-rule window, so the window widened to 900 to match the vitest duplicate. | |
| 3 | Walkthrough Key flows gets the same line form | Extended the Key flows template line with `one flow per bullet line`; five-section roster marker untouched. | |
| 4 | Claims pinned test-first with an independent property check | All assertions (markers.mjs `DIGEST_RENDERING_MARKERS`, skill-lint fgMarks, code-digest vitest pins, feature E2E) committed red in e515525 BEFORE the template edits (293cefc/0f030ea/d71ef9c); the property check rejects any non-list content line in the Flow span. Release artifacts: CHANGELOG 2.6.0 entry + version bump in a50dea7. | |
| 5 | Sample progress doc for visual preview | Wrote `sample-progress.md` beside this progress file with the real up_adventure digest in the new bullet form — E2E scenario 2 green (all Flow lines are list items, symbols/was:/reads:/writes: present); disposed with the topic at finalize. | |

## Deviation records

## Code digest

### Summary

The code digest's structured sections now render as markdown lists in any CommonMark preview: the Flow template prescribes bold-label bullets with nested branch items instead of bare labels with 2-space indents (which lazy continuation merges into one run-on paragraph), Gotchas and Key files prescribe one bullet per item, and pwk-walkthrough's Key flows ask for one flow per bullet line. The claims are pinned test-first in markers/skill-lint/vitest plus a renderer-independent property check that fails on any non-list content line. Content rules are untouched — only the line form changed.

### Flow

- **Spine** — [R1] progress-format.md's Flow template block prescribes `- **Spine**` / `- **Branches**` / `- **Side effects**` bullets -> [R2] the Gotchas/Key files template lines and "one bullet each" fill rules land in the same block -> [R3] pwk-walkthrough's Key flows line gains `one flow per bullet line` -> [R4] `DIGEST_RENDERING_MARKERS` feeds skill-lint fgMarks and vitest pins, committed red in e515525 BEFORE the template edits, with the shared `bareContentLines` property helper failing on any non-list content line -> [R5] sample-progress.md demonstrates the rendering and rides the topic-folder disposal
- **Branches**
  - the fill-rule paragraph outgrew skill-lint's 700-char span window -> window widened to 900 to match the vitest duplicate — was: two checks used different spans
  - R4's red-pins commit predates R1's implementation commit (pins-before-edits) -> the packet helper's cross-row ancestry rule rejected it from R4's Commit cell -> cell holds the terminal commit, e515525 stays narrated in the execution summary
  - markers.mjs is plain ESM -> the shared helper exports untyped; the TS tests import it without annotations

### Gotchas

- The fill-rule span window (900) is a paired constant in skill-lint and vitest — future paragraph growth must update both
- The three label fgMarks (`- **Spine**` etc.) also match the Flow-shape prose bullets in contractContent — the template-scoped vitest pins are the load-bearing ones
- Installed skill copies (~/.pi/agent/skills, ~/.agents/skills) are hand-synced; 2.6.0 needs a manual re-sync

### Key files

- `skills/pwk-executing-tasks/references/progress-format.md` — the rewritten digest template + fill rules (the feature's core)
- `tests/markers.mjs` — DIGEST_RENDERING_MARKERS + the shared bareContentLines property helper
- `tests/skill-lint.mjs` — digest-rendering fgMarks, walkthrough pin, window 700→900
- `tests/code-digest.test.ts` — template-scoped bullet pins + adjacency pins
- `tests/digest-rendering.test.ts` — the feature E2E (template property + sample rendering)
