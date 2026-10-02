# Progress: codemode-preference

Design: docs/plans/2026-09-29-codemode-preference/codemode-preference-design.md

Branch: 2026-09-29-codemode-preference

Setup: n/a

Started: 2026-10-02T04:34:44Z

Last updated: 2026-10-02T06:10:00Z

Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Clause names codemode as the framed executor instance | — | 5c8c4b2 |
| 2 | ✅ | Prescription sweep classifies commands inside javascript fences | — | 3d2acb9 |
| 3 | ✅ | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | — | 303ffe2 |
| 4 | ✅ | Developer-guide known-instances table and README enablement note | — | 321d177 |
| 5 | ✅ | Guard session-start codemode detection and one-line tail reminder | — | cc1aadf c36b8c1 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Clause names codemode as the framed executor instance | One-line canonical-string swap in markers.mjs applied atomically to all six SKILL.md; the existing byte-identity check and sweep stayed green with no new pins (the `e.g.` framing covers the new inline span). | |
| 2 | Prescription sweep classifies commands inside javascript fences | New exported `extractExecutorCommands` pulls keyed `command:` literals (quoted or template) and first-positional strings of `tools.*()` calls out of javascript/js fences; each segment then flows through the existing sanctioned/framed machinery with the fence's introducing line as context. Six unit fixtures plus the E2E injection scenario; extraction stays deliberately shape-conservative so plain string variables never count. | |
| 3 | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | `CODEMODE_SWEEP_SCRIPT` pinned in markers.mjs (fence indentation included, so the byte-match holds against list-indented embeds) with a new skill-lint presence check; each site keeps the pinned discovery sentences and gains an e.g.-framed lead-in + fence, with the per-topic extraction prose collapsed into it. The design draft's illustrative script grepped the design file itself; the pinned script derives each topic's sibling progress file so phases actually surface (design anticipated finalizing exact bytes). Review fix: the derived path is now POSIX-shell-quoted inside the script (hazard finding, landed with the review-fix commit in R5’s cell). | |
| 4 | Developer-guide known-instances table and README enablement note | New "Sandboxed batch executors — known instances" section: translate-the-shape note, verbatim-batching rule, six dated rows (pi codemode / opencode execute / Claude API PTC / Claude Code CLI REPL mode experimental / zcode + commandcode absent); README gains one paragraph with the Enable-codemode pointer, no table; CHANGELOG Unreleased entry drafted. All six rows dated after the E2E count check caught three undated rows. | |
| 5 | Guard session-start codemode detection and one-line tail reminder | Exported `detectCodeme` pure helper (active set authoritative over full registry; absent/throwing registries fail closed), snapshot at session_start, and a once-per-session emission window in before_agent_start: the line rides the first tail message (appended to a phase reminder or emitted alone), suppressed while the guard is pinned off, never retro-added — the design's "session-start snapshot of both conditions" reads as detection snapshotted, suppression checked at the single emission window. Guard unit tests pin the helper shapes; the feature E2E pins the wiring matrix. | |

## Deviation records

## Code digest

### Summary
The kit now prefers sandboxed batch executors wherever the host grants one: the canonical tool-freedom clause names pi `codemode` as the framed instance, the four discovery-sweep sites demonstrate the batched shape with one byte-pinned script, and the guard shows a single informational tail line when the executor is active. The prescription sweep reads `javascript` fences so prescriptions cannot hide inside codeme-shaped blocks, and the shipped docs carry a dated cross-harness instances table. Everything stays advisory — invariants remain archetype-generic, bash recipes remain the fallback, and no enforcement semantics changed.
### Flow
- **Spine** — `TOOL_FREEDOM_MARKERS.clause` -> six SKILL.md clause paragraphs [R1] -> `CODEMODE_SWEEP_SCRIPT` -> four sweep-site fences [R3] -> `extractExecutorCommands` through `JS_FENCE_RE` -> `sweepText` sanctioned/framed cascade [R2] -> skill-lint Check 14 + Check 15 -> feature-E2E kit-copy scenarios
- **Branches**
  - `host grants the executor -> find once -> N parallel pinned grep -m1 -> joined summary lines only` [R3]
  - `session_start -> detectCodeme -> before_agent_start single emission window -> hint rides the phase reminder or stands alone` [R5]
  - `registry absent, throwing, or non-array -> false -> no line` — was: no runtime visibility existed [R5]
  - `guard pinned off at the first fire -> window consumed silently -> /pwk-guard auto re-arms the phase reminder but never the hint` [R5]
  - `prescription hidden in a javascript fence -> keyed/positional extraction -> violation names file and command` [R2]
  - `host without an executor -> bash fallback recipes unchanged` [R1]
- **Side effects** — reads: docs/plans listing + header-only phase lines, host tool registry at session start · writes: none — the runtime surface is one `display: false` tail message
### Gotchas
- derived paths inside canonical scripts must be POSIX-shell-quoted — the kit's one demonstrated example now is (hazard finding, fixed)
- a registry that exists decides alone — container-shape surprises fail closed with no fall-through to the broader registry (tracing finding, fixed)
- `/reload` re-fires session_start and re-arms the hint — one line per session-start, desired after a context reload (tracing observation)
- pipe tails after `|` are not separately classified by the sweep — the head command decides (documented limitation)
### Key files
- `tests/markers.mjs` — the two canonical pins (clause text, sweep script)
- `skills/pwk-status/SKILL.md` (+3 sibling sweep sites) — slimmed steps with the embedded script
- `tests/prescription-sweep.mjs` — executor-fence extraction through the existing cascade
- `extensions/workflow-guard.ts` — `detectCodeme` plus the one-line visibility window
- `tests/codemode-preference.e2e.test.ts` — the primary enforced spec
