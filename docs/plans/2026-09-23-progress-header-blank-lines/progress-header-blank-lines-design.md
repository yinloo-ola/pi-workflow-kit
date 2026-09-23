# Design: progress-header-blank-lines

## At a glance

The progress file's six header fields (`Design:` … `Feature phase:`) and the review packet's `Base:`/`Head:` sit on consecutive plain lines, which every standard CommonMark preview (GitHub, VS Code) merges into one run-on paragraph — the header is hard to read at a glance. The fix is a blank line between each header field, inserted at the two places that write headers: the progress template and the packet builder's emitter. Extraction never changes — every consumer matches fields at line start (`grep -m1 '^Feature phase:'`, `startswith('Design: ')`), and a blank line does not move a line start, so old compact files and new blank-line files both parse with zero consumer edits.

**Key decisions**
- Blank-line paragraphs, not a bullet list — the line-start extraction contract stays byte-for-byte valid and old/new shapes both parse for free (rejected: bullet list — breaks every line-start consumer: the packet helper's fixed `[8:]` slice, six pinned `grep -m1 '^…'` recipes, and the `^Design:$` e2e anchor).
- No hard line breaks — trailing double-spaces are invisible and silently stripped by editors (preview regresses with no diff signal) and a trailing backslash lands inside the `[8:]` slice and before the `$` anchor (rejected: hard breaks — fragile and anchor-breaking).
- Consumers untouched, dual-shape tolerance by construction — no migration of existing progress files in other repos, no format sniffing.
- No ADR — a whitespace shape change is trivially reversible and not surprising in context (fails the hard-to-reverse bar).

| R# | Requirement in one line | Risk |
|----|-------------------------|------|
| R1 | Progress template and skill skeleton separate every header field with a blank line, with prose saying why, and a regression pin keeps it that way | — |
| R2 | Built review packets separate `Base:` and `Head:` with a blank line | — |
| R3 | Both old and new header shapes satisfy every extraction recipe | — |

## Requirements

### R1: Blank-line progress header
The progress-file template and the create-progress skeleton separate every adjacent header-field pair with a blank line, so each field renders as its own paragraph.

**Acceptance criteria**
- Given the progress-format template block, When it is read as CommonMark source, Then a blank line separates `# Progress:` from `Design:`, and separates each adjacent field pair (Design/Branch, Branch/Setup, Setup/Started, Started/Last updated, Last updated/Feature phase).
- Given the create-progress skeleton in the executing-tasks skill, When it is compared with the template, Then it carries the same blank-line separations between header fields.
- Given the template block, When an executor reads it for guidance, Then a prose sentence states that the blank lines are load-bearing because CommonMark merges consecutive plain lines into one paragraph.
- Given the updated template, When the test suite runs, Then a structural test fails if any adjacent header fields are re-compacted without a blank line.

### Checkpoints: none
### Review: skip

### R2: Blank-line packet header
The review-packet builder emits `Base:` and `Head:` separated by a blank line.

**Acceptance criteria**
- Given a freshly built review packet, When its header is read as CommonMark source, Then a blank line separates the `Base:` line from the `Head:` line.
- Given the same packet, When `grep -m1 '^Base:'` and `grep -m1 '^Head:'` run against it, Then each returns exactly one line.
- Given the packet-builder test suite, When it runs, Then the emitted header shape is asserted with the blank-line separation.

### Checkpoints: none
### Review: skip

### R3: Dual-shape extraction contract
Progress files with the old compact header and the new blank-line header both satisfy every extraction recipe, with no consumer edits.

**Acceptance criteria**
- Given a progress file with the old compact header, When the packet helper runs, Then it resolves exactly one `Design:` pointer and builds the packet.
- Given a progress file with the new blank-line header, When the packet helper runs, Then it resolves exactly one `Design:` pointer and builds the packet.
- Given a progress file of either shape, When `grep -m1 '^Feature phase:'` runs, Then exactly one header line is returned.
- Given a progress file of either shape whose header reads `Setup: pending`, When the `Setup:` line is matched header-only, Then exactly one line is returned — the body is never read to find state.
- Given a newly created progress file of either shape, When the multiline `^Design: …$` assertion runs, Then it matches the header line.

### Checkpoints: none
### Review: skip

## Problem

`skills/pwk-executing-tasks/references/progress-format.md` defines the progress header as six consecutive plain lines. In CommonMark, a single newline is a soft break, so any preview renders the whole header as one paragraph — the exact "appears in one line, hard to visualize" report. The generated review packet has the same defect on a smaller scale: `Base:` and `Head:` are emitted on consecutive lines.

## Approaches considered

- **Blank-line paragraphs (chosen)** — insert one blank line between header fields at the two write sites. Blank lines are CommonMark paragraph separators and do not change where a line starts, so every consumer keeps matching unchanged: the six pinned `grep -m1 '^…'` recipes, `startswith('Design: ')` + `strip()[8:]` in the packet helper, and the `^Design: …$` e2e anchor. Old files and new files both satisfy every consumer by construction.
- **Bullet list (`- Design: …`)** — renders tighter, but moves every line start: the packet helper's fixed 8-char slice becomes wrong, all six grep recipes and the `headerRead` marker (`tests/markers.mjs:71`) break, and the e2e `^Design:$` anchor fails. Would require a tolerant parser plus a ~10-file re-anchor — a large blast radius for a cosmetic gain.
- **Hard line breaks (trailing double-space or backslash)** — keeps raw lines adjacent and renders breaks, but trailing spaces are invisible, stripped silently by editors and formatters (preview regresses with no diff signal), and still break the `$` anchor; a backslash lands inside the `[8:]` slice and before the `$`. Fragile and anchor-breaking.

## Architecture

One principle: **shape changes at the two write sites; extraction never changes.** The progress template (hand-authored skill reference) and the packet emitter (f-string in `build-review-packet.py`) are the only producers of header lines. Adding a blank line between fields changes rendering in every CommonMark preview while leaving the line-start contract byte-for-byte intact, which is what makes dual-shape tolerance free instead of a parser project.

## Components

1. `skills/pwk-executing-tasks/references/progress-format.md` (template block ~lines 10–15) — blank line between each adjacent header field, plus a prose sentence that the blank lines are required so previews render one field per line.
2. `skills/pwk-executing-tasks/SKILL.md` (create-progress skeleton, ~lines 181–184) — same blank-line shape, so the skill's own example matches the template it points at.
3. `skills/pwk-executing-tasks/scripts/build-review-packet.py` (emitter ~line 269) — `\n` between `Base:` and `Head:` becomes `\n\n`.
4. Tests — the four exact-adjacency assertions (`tests/review-packet-cli.test.ts`) re-anchor to the blank-line shape; a new structural pin asserts the template keeps its blank lines; new-shape fixtures join the existing old-shape ones.
5. `CHANGELOG.md` — Keep-a-Changelog entry.

Explicitly untouched: `pwk-status`, `resume.md`, `pwk-finalizing`, `pwk-brainstorming`, `umbrella.md`, `tests/markers.mjs`, `tests/skill-lint.mjs` prose pins, and `docs/review.md`'s `Base:`/`Head:` semantics paragraph (it names semantics, not adjacency).

## Data flow

New progress file (template) → preview renders each field as its own paragraph; `grep -m1 '^Feature phase:'` and friends match exactly as before. Old compact files in other repos → unchanged bytes, unchanged behavior. Packet build → helper reads the `Design:` pointer from either shape, emits a header whose `Base:`/`Head:` render as two paragraphs.

## Error handling

No new failure modes. A writer who emits the old compact shape still produces a fully valid file — dual-shape tolerance is graceful degradation, not an error. The packet helper's fail-closed checks (exactly one `Design:` pointer before the first `##` heading, malformed-table rejection) are unaffected: blank lines do not start with `Design: ` and are ignored by the scan.

## Testing

- Re-anchor the four exact-adjacency packet assertions to `\n\n` (lesson: pins follow the shape, in the same change).
- New structural regression pin on the template block: fails if adjacent header fields lose their blank line.
- New-shape packet fixture (blank-line header) alongside the existing old-shape fixtures, which double as the old-shape proof.
- Dual-shape criteria in R3 exercised against both fixture shapes.
- Gate: `npm run check` green (biome + vitest).

## Feature acceptance

- Given a progress file created from the updated template, When the header block is read as CommonMark source, Then every pair of adjacent header fields is separated by a blank line, so each field renders as its own paragraph.
- Given the same file, When `grep -m1 '^Feature phase:'` runs, Then exactly one header line is returned; and when the header reads `Setup: pending`, a header-only `Setup:` match also returns exactly one line.
- Given a progress file with the old compact header, When the packet helper runs, Then it resolves the single `Design:` pointer and builds the packet — both shapes accepted.
- Given a freshly built packet, When its header is read, Then `Base:` and `Head:` are separated by a blank line while each remains single-line greppable.
- Given the full suite (`npm run check`), When it runs after the change, Then it is green, including the regression pin that keeps the template header uncompacted.

### Feature review: auto
