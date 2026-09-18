# Design: digest-rendering

## At a glance

The `### Flow` section of the progress file's code digest is written as bare label lines (`Spine`, `Branches`, `Side effects`) with 2-space indented arrow chains under them. In CommonMark a 2-space indent is a lazy continuation, so every markdown preview (GitHub, VS Code, Obsidian) collapses the whole section into one run-on paragraph — observed live in the up_adventure progress file. The same collapse waits in `### Key files` ("one line each" as bare lines) and unspecified `### Gotchas`, and the sibling `pwk-walkthrough` "Key flows" section prescribes no line form at all. This change rewrites the digest templates so every structured section renders as markdown lists, drops multi-space alignment (which renders as one space), pins the new claims test-first, and produces a sample progress doc for visual preview at the ship checkpoint.

**Key decisions**

- Flow renders as a bullet list — bold `Spine`/`Branches`/`Side effects` labels, one bullet per hop chain, nested bullets per branch (rejected: fenced `text` block — monochrome, no inline-code styling, long chains horizontal-scroll; rejected: bold-label paragraphs — blank lines double the line count against the ~15-line cap; rejected: tables — arrow chains don't fit cells).
- Gotchas and Key files get the same bullet-per-item form in the same pass — identical collapse defect in the same file, no real fork.
- `pwk-walkthrough`'s Key flows line gains a one-flow-per-bullet clause — initially deferred as YAGNI, pulled in by the human (Q3).
- Multi-space alignment is dropped: `[R<n>]` tags sit adjacent to their hop/branch, reads/writes are separated by ` · ` — alignment renders as a single space, so it can never survive preview.
- Template claims are pinned test-first, and the Flow pin is paired with an independent property check (no non-list content line in the Flow template span) — the verbatim-pin-is-a-transcription lesson.
- The sample progress doc is ephemeral, living in this topic folder and disposed with it (rejected: a permanent sample in `docs/` — a second artifact to keep fresh; the package ships no sample).

| R# | Requirement in one line | Risk |
|----|--------------------------|------|
| R1 | Digest `### Flow` template renders as labeled bullets with nested branches | — |
| R2 | Digest `### Gotchas` and `### Key files` prescribe bullet-per-item | — |
| R3 | `pwk-walkthrough` Key flows prescribes one flow per bullet line | — |
| R4 | New claims pinned test-first with an independent no-bare-line property check | — |
| R5 | Sample progress doc written for preview at ship, disposed with the topic | — |

## Requirements

### R1: Flow template renders as structured markdown

The `### Flow` template block and Flow-shape fill rules in `skills/pwk-executing-tasks/references/progress-format.md` prescribe list-form lines only, so any CommonMark renderer shows each label and hop chain on its own line.

**Acceptance criteria**

- Given the current template (bare `Spine`/`Branches`/`Side effects` lines with 2-space indented chains, which merge into one paragraph when rendered), When the template is rewritten per the Components section below, Then every content line it prescribes inside `### Flow` is a list item: `- **Spine** — <chain>`, `- **Branches**`, indented `  - <condition> -> <outcome>` branch items including the `was:` clause item, and `- **Side effects** — reads: <what> · writes: <what>`.
- Given a generated digest, When `[R<n>]` tags are written, Then each sits adjacent to the hop or branch it belongs to — no wide-gap alignment anywhere in the section, since alignment collapses to a single space in rendering.
- Given the existing pinned claims (`Spine`, `Branches`, `was:`, `Side effects`, `[R<n>]`, `15 lines`, `no line numbers`, `/skill:pwk-walkthrough`, `A -> B -> C`, symbol/module hop labels, honest-optional `was:`/side-effects rules), When the layout change lands, Then every claim still appears in the Flow shape span — the rewrite changes form, never content rules.

### Checkpoints: none
### Review: skip

### R2: Gotchas and Key files prescribe bullets

The `### Gotchas` and `### Key files` parts of the same template block, and their fill-rule sentences, prescribe one bullet per item so they render as lists rather than merged paragraphs.

**Acceptance criteria**

- Given the template currently shows both headings bare (and Key files' "one line each" written as bare lines collapses in preview), When rewritten, Then `### Gotchas` shows `- <one real risk per bullet>` and `### Key files` shows `- `<file>` — <what shifted inside it>`, and the Key files fill rule states the bullet form while keeping the `at 5` cap and "one line each" meaning.
- Given a digest with no findings, When Gotchas is filled, Then `none beyond review findings` is written as a single bullet — the honest-empty rule and its marker survive the form change.

### Checkpoints: none
### Review: skip

### R3: Walkthrough Key flows gets the same line form

The `## Key flows` line in `skills/pwk-walkthrough/SKILL.md`'s template prescribes one flow per bullet line, matching the digest Flow.

**Acceptance criteria**

- Given the current line reads "Execution/data movement as arrow chains (A -> B -> C), anchored per step" with no line form (bare-line flows merge in preview), When updated, Then it prescribes one flow per bullet line in addition to the existing arrow-chain and anchor rules.
- Given skill-lint pins the five-section template marker `Summary / How it works / Key flows / Gotchas & invariants / Change map`, When the line is edited, Then that marker string still passes — the edit touches the Key flows description, not the section roster.

### Checkpoints: none
### Review: skip

### R4: Claims pinned test-first with an independent property check

The new template claims are asserted by markers/skill-lint/vitest before the skill markdown edits (red), then satisfied (green); the Flow pin is paired with a renderer-independent property check so a future bare-line regression fails even if the verbatim pin is refreshed.

**Acceptance criteria**

- Given the repo's test-first lesson for skill/doc content, When the changes land, Then new markers (bullet-form Flow, Gotchas bullet, Key files bullet, walkthrough one-flow-per-bullet — exact strings chosen at execute time) are added to `tests/markers.mjs` and asserted from `tests/skill-lint.mjs` and `tests/code-digest.test.ts`, with the assertions committed or staged before the corresponding skill-markdown edits.
- Given the lesson that a verbatim pin is a transcription, not a contract, When the Flow template is pinned, Then an independent property check accompanies it: inside the Flow span of the `progress-format.md` template block, every content line is a list item, heading, or fence — a line that is bare prose fails the check.
- Given the release, When the work ships, Then `CHANGELOG.md` gains the version entry describing the rendering change and `package.json` bumps to 2.6.0; the human's installed copies (`~/.pi/agent/skills/pwk-*`, `~/.agents/skills/pwk-*`) are re-synced by hand — the kit changes nothing automatically.

### Checkpoints: none
### Review: skip

### R5: Sample progress doc for visual preview

A realistic, filled sample progress file in this topic folder lets the human confirm the rendering fix in their own markdown preview at the ship checkpoint.

**Acceptance criteria**

- Given the updated templates, When execution reaches the ship checkpoint, Then `docs/plans/2026-09-18-digest-rendering/sample-progress.md` exists, containing a filled `## Code digest` (Summary, Flow, Gotchas, Key files) written in the new bullet form using the real up_adventure milestone-gift content: Spine `CrossedMilestoneTiers` -> `claimAndSend` -> `UnlockOrExtendPrivilegeGift` -> `notifyMilestoneTier` chain, the fixed-gift and missing-city branches with the `was:` clause, and the reads/writes side effects.
- Given finalize runs for this topic, When the topic folder is disposed, Then the sample file is disposed with it — no sample ships in the repo or the npm package.

### Checkpoints: none
### Review: skip

## Approaches considered

**Rendering construct for the Flow** — four candidates. (1) Bullet list with bold labels and nested branch bullets: chosen — renders correctly in every CommonMark renderer, chains wrap with hanging indent, inline code keeps styling, all pinned claim words survive verbatim. (2) Fenced `text` block: preserves exact indentation but is monochrome (inline code unstyled), long arrow chains horizontal-scroll instead of wrapping, and `[R1]` tags lose all emphasis — rejected. (3) Bold-label paragraphs separated by blank lines: renders, but roughly doubles the source line count against the ~15-line Flow cap and loses the visual grouping of branches under their label — rejected. (4) Table per subsection: arrow chains don't fit cells and hand-editing tables is hostile — rejected.

**Scope — Flow only vs all structured digest sections** — Key files carries the identical collapse defect ("one line each" as bare lines) and Gotchas prescribes no form, both in the same template block in the same file: fixing Flow alone would leave the digest half-broken in preview. Walkthrough Key flows was initially deferred (no demonstrated defect — its template never prescribed bare labels), and the human pulled it into scope (Q3): one clause, same visual problem in the sibling doc the Flow links to when it outgrows its cap. Chose: all three, one pass.

**Pin strategy** — verbatim markers alone (the existing style) vs markers plus a structural property check. The lessons file records a shipped defect where verbatim pins held green over wrong text; the no-bare-line property is renderer-independent (lazy continuation is a CommonMark rule, not a renderer quirk) and survives marker rewording. Chose: both.

**Where the sample lives** — a permanent sample under `docs/` vs an ephemeral file in the topic folder. Permanent samples rot and become a second artifact to keep fresh; the package would ship it for no consumer. The topic folder is already the unit of disposal. Chose: ephemeral.

## Components

**`skills/pwk-executing-tasks/references/progress-format.md`** — the digest fragment of the template block becomes (indentation relative to the existing fence preserved):

```markdown
### Summary
### Flow
- **Spine** — `<entry point> -> [R1] <step> -> [R2] <step> -> <outcome>`
- **Branches**
  - `<condition> -> <outcome>` [R2]
  - `<changed behavior> — was: <previous behavior>`
- **Side effects** — reads: `<what>` · writes: `<what>`
### Gotchas
- <one real risk per bullet>
### Key files
- `<file>` — <what shifted inside it>
```

Fill-rule prose edits, each preserving its pinned phrases: `### Flow` "uses `A -> B -> C` arrow chains" gains "one spine or branch per bullet line, so every renderer shows each hop chain on its own line"; the Flow-shape `Side effects` bullet's "a line naming" becomes "a bullet naming"; Key files' "one line each" becomes "one bullet each" (cap `at 5` unchanged); Gotchas gains "one bullet each". The Flow-shape bullets' content rules (symbol/module labels, `[R<n>]` tagging, inline worked values, honest-optional `was:`/side effects, ~15-line cap, walkthrough offer) are untouched.

**`skills/pwk-walkthrough/SKILL.md`** — the Key flows template line becomes "Execution/data movement as arrow chains (A -> B -> C), anchored per step, one flow per bullet line."

**`tests/markers.mjs`** — additions near the existing LEAN_GATES/SINGLE_DOC markers; exact strings fixed by the template text above (e.g. `- **Spine**`, one-bullet-each phrases, one-flow-per-bullet).

**`tests/skill-lint.mjs`** — fgMark assertions for the new markers inside the existing pwk-executing-tasks and pwk-walkthrough check blocks.

**`tests/code-digest.test.ts`** — extend the Flow-shape test with the bullet-form markers, and add the independent property check over the Flow span of the template block: every content line is a `- ` item, a `###` heading, a fence line, or blank.

**`CHANGELOG.md` / `package.json`** — version 2.6.0 entry (Changed: digest Flow/Gotchas/Key files render as markdown lists; walkthrough Key flows one-per-bullet).

**`docs/plans/2026-09-18-digest-rendering/sample-progress.md`** — written at the ship checkpoint, disposed with the topic.

## Error handling

The failure mode this change guards against is regression to bare-line templates: the property check in R4 fails skill-lint/vitest on any non-list content line in the Flow span, even after marker rewording. What must not break: the pinned claim words listed in R1/R2/R3 (each appears verbatim in the rewritten span), the digest skeleton order regex `### Summary … ### Flow … ### Gotchas … ### Key files` (order unchanged), and the `pwk-status`/finalize parsers (they read the `Feature phase:` header and disposal globs — the digest body is never machine-parsed). Per the lessons file, after each prose edit to `progress-format.md`, re-read the full surrounding sentence and run the wording assertions before committing.

## Feature acceptance

- Given the shipped kit, When a later feature's executor writes a code digest per the updated `progress-format.md` and the human opens the progress file in any CommonMark preview, Then Spine, Branches, and Side effects render as labeled bullet groups with each arrow chain on its own wrapping line — never a merged run-on paragraph — and the full suite (vitest + skill-lint) is green, proving the template claims and the no-bare-line property hold.
- Given this feature's ship checkpoint, When `sample-progress.md` is opened in the same preview that showed the original run-on paragraph, Then the up_adventure flow renders as distinct labeled bullets with its branch chains and reads/writes each on their own line.

### Feature review: auto
