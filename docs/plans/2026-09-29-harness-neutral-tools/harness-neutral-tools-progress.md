# Progress: harness-neutral-tools

Design: docs/plans/2026-09-29-harness-neutral-tools/harness-neutral-tools-design.md

Branch: 2026-09-29-harness-neutral-tools

Setup: n/a

Started: 2026-09-29T13:20:00+08:00

Last updated: 2026-09-29T13:46:00+08:00

Feature phase: ship-paused

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ✅ | Tool-freedom clause in all six skills | — | 3b7fdb2 |
| 2 | ✅ | Disposal blocks reframed as invariant + canonical example | — | 8efdd54 |
| 3 | ✅ | Floor-not-prescription line in five role contracts | — | c1ac59b |
| 4 | ✅ | Prescription sweep in skill-lint | — | 696b18e 1a38cd7 |

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | Tool-freedom clause in all six skills | `TOOL_FREEDOM_MARKERS` in tests/markers.mjs pins the full clause + canonical fragment; new skill-lint check 14 asserts the clause in all six SKILL.md and byte-identity of the clause paragraph; the one-sentence clause inserted as its own paragraph after each intro. | no |
| 2 | Disposal blocks reframed as invariant + canonical example | `disposalInvariant` marker added to TOOL_FREEDOM_MARKERS; skill-lint asserts every finalizing bash fence is immediately preceded by a sentence carrying the marker — two invariant sentences (delete/archive) inserted as their own paragraphs before the fences, naming the folder unit and verification step; fenced commands untouched, DISPOSAL_ANCHORS stay green. | no |
| 3 | Floor-not-prescription line in five role contracts | `floorLine` marker (exact design sentence) in TOOL_FREEDOM_MARKERS; skill-lint asserts it in all five agents/*.md; inserted as its own paragraph at the same conduct-block spot in the four reviewers (byte-identity tests stay green) and after the intro paragraph in the recon-scout contract. | no |
| 4 | Prescription sweep in skill-lint | New `tests/prescription-sweep.mjs` (SANCTIONED prefixes + recipes, FRAMED markers, `sweepSkillDir` over the same file set skill-lint concatenates) wired into skill-lint as a check; six unit tests plus the E2E kit-copy scenario. First run surfaced 7 straggler sites, reconciled per the design error-handling rule: `python3`/`python3 --version` interpreter probes, the `grep -m1 '^Feature phase:'` header recipe, and `ls docs/plans/` deliberately pinned in SANCTIONED_COMMANDS; finalizing one mention reworded (never-`cd` → never-cd). | no |

## Deviation records

<!-- One short paragraph per design-decision reversal (what changed, why, what was rejected), written at deviation time; leave this section empty when every Deviated? entry is mechanical. -->

## Code digest

### Summary
The kit's operational prose now licenses better host tools instead of prescribing shell: one byte-identical tool-freedom clause follows every skill's intro paragraph (the kit's `scripts/` helpers and plain `git` the exact exceptions), finalizing's two disposal blocks state their outcome invariant immediately before their untouched canonical bash examples, and all five role contracts read `tools:` as a minimum grant rather than a prescription. A prescription sweep in skill-lint makes the policy durable: every command in skill contract content must be sanctioned or framed as one example, and a regression — a reintroduced bare prescription or a deleted clause — fails the lint naming the file and the command.

### Flow
- **Spine** — `six SKILL.md intros -> [R1] TOOL_FREEDOM_MARKERS.clause -> skill-lint tool-freedom check (fgMark + paragraph identity) -> npm run check green`
- **Branches**
  - `finalizing disposal step -> [R2] invariant sentence -> fence kept as canonical example — was: the bash block itself was the instruction`
  - `role contract tools: frontmatter -> [R3] floorLine -> four reviewer conduct blocks stay byte-identical`
  - `skill-lint run -> [R4] sweepSkillDir -> sweepText -> looksLikeCommand? -> isSanctioned (git/gh | scripts/ token | pinned recipe) pass : framed paragraph pass : violation names file + command`
  - `kit copy + injected rm foo.txt -> [R4] skill-lint exit 1 naming skill and command` · `kit copy + clause removed -> [R1] skill-lint exit 1 naming skill`
- **Side effects** — reads: `skills content (SKILL.md + references/ + scripts/)` · writes: `none — violations are reported, content untouched`

### Gotchas
- Command detection is a first-token allowlist (`COMMAND_WORDS`) — an unlisted tool head passes unflagged until the word is added; documented in the module.
- Fence-range matching assumes no nested fences; the shipped corpus was verified fence-parity-clean, but a future nested-fence template would mis-span.
- The SANCTIONED_COMMANDS entries beyond the design's core list (`python3` probes, the `grep -m1 '^Feature phase:'` recipe, `ls docs/plans/`) are deliberate policy pins from first-run reconciliation — extending that list is a reviewed decision, never a convenience.

### Key files
- `tests/prescription-sweep.mjs` — the sweep rule: sanction/framing classification, per-file traversal over the contractContent set.
- `tests/skill-lint.mjs` — the tool-freedom check family: clause presence, paragraph byte-identity, disposal invariant, floor lines, and the sweep pass.
- `tests/markers.mjs` — `TOOL_FREEDOM_MARKERS`: the canonical clause, its fragment, the disposal invariant, the floor line.
- `tests/harness-neutral-tools.e2e.test.ts` — feature acceptance: shipped-surface invariants plus kit-copy injection and clause-removal scenarios.
- `skills/pwk-finalizing/SKILL.md` — the two disposal invariant sentences in front of unchanged canonical examples.
