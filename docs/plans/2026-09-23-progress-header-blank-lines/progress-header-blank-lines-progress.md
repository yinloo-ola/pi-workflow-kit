# Progress: progress-header-blank-lines

Design: docs/plans/2026-09-23-progress-header-blank-lines/progress-header-blank-lines-design.md

Branch: 2026-09-23-progress-header-blank-lines

Setup: n/a

Started: 2026-09-23T02:07:12Z

Last updated: 2026-09-23T02:25:25Z

Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Blank-line progress header (template + skeleton + prose) | — | 2b3f40e |
| 2 | ✅ | Blank-line packet header (Base/Head) | — | 923c900 |
| 3 | ✅ | Dual-shape extraction contract (old + new headers) | — | 74e3dc3 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Blank-line progress header (template + skeleton + prose) | Blank line between each adjacent header field in the progress-format template and the skill skeleton; load-bearing prose sentence added before the template block | — |
| 2 | Blank-line packet header (Base/Head) | Emitter f-string emits `\n\n` between Base and Head with load-bearing comment; four exact-adjacency pins re-anchored in the same commit | — |
| 3 | Dual-shape extraction contract (old + new headers) | Packet-builder CLI gains a new-shape header test (blank lines, single Design pointer); existing old-shape fixtures double as the old-shape proof; E2E grep recipes cover both shapes | — |

## Deviation records

## Code digest

### Summary
Two write sites emit header lines — the progress template/skill skeleton and the packet builder's f-string. Both now separate every field with a blank line so CommonMark previews render one field per paragraph; every line-start extraction anchor is byte-unchanged, so old compact and new blank-line files both parse by construction.
### Flow
- **Spine** — `template + skeleton [R1] -> packet emitter [R2] -> consumers read either shape [R3]`
- **Branches**
  - `old compact header -> same line-start matches, no migration` [R3]
  - `new blank-line header -> same line-start matches (blank lines ignored)` [R3]
- **Side effects** — reads: progress header block, git span for packet · writes: `<leaf>-review-packet*.md`, skill reference docs
### Gotchas
- none beyond review findings
### Key files
- `skills/pwk-executing-tasks/references/progress-format.md`
- `skills/pwk-executing-tasks/SKILL.md`
- `skills/pwk-executing-tasks/scripts/build-review-packet.py`
- `tests/progress-header-blank-lines.e2e.test.ts`
- `tests/review-packet-cli.test.ts`
