# Design format

Read before writing any design doc. Keep the design descriptive, not a task list. It is the single buildable artifact; no separate implementation plan.

## Trivial format

A trivial design has an `In short:` one-liner (what + why + approach), a single `### R1:` block with acceptance criteria and tags, and optional `## Production-risk areas`. It has no `## At a glance`, `## Requirements`, or `## Feature acceptance`; its ship gate is the full existing suite, not a manufactured E2E. The block rules below cover it.

```markdown
# Design: <topic>

In short: <what + why + approach>

### R1: <name>
<observable behavior>

**Acceptance criteria**
- Given <state>, When <action>, Then <observable outcome>.

### Checkpoints: none
### Review: skip
```

## Non-trivial format

**Open with `## At a glance`** — the human's two-minute digest, immediately before `## Requirements`: (1) a 2–4 sentence plain-language summary of what is wrong or needed, what will be built, and the key approach; (2) **Key decisions** — one line each: decision + why, with a `(rejected: <alternative> — <reason>)` clause only when the fork was real (never manufactured); (3) a table `| R# | Requirement in one line | Risk |`, exactly one row per requirement, where **R# = the requirement's block number in the `## Requirements` section below** — the ID every later digest keys on. Plain language only: no jargon, no Given/When/Then — those live in the requirement blocks. An umbrella overview gains no at-a-glance section; its roster serves that role.

Then **`## Requirements`** — one `### R<n>: <name>` block per requirement, each one testable behavior:

```markdown
## Requirements

### R1: <name>
<one-line testable behavior — what the feature produces or changes, through its public interface>

**Acceptance criteria** — Given/When/Then criteria defining "done". Test observable behavior — what the feature produces or changes through its public interface; not implementation steps. Cover edge and error cases.
- Given … When … Then …
- Given … When … Then … (edge case)

### Checkpoints: none | full
### Review: skip | parallel | inline

### Production-risk notes
- <only when the requirement touches a risk area>

### R2: <name>
…
```

Block rules:

- **No test-name lists.** The criteria are the test spec: the executor writes and names the tests red-green from them, so the doc holds no test-name lists and no R#-to-section map — the block structure is the map.
- **Tag every requirement** — `### Checkpoints` (`none` = no per-requirement stop, the default; `full` = tests + complete stops) and `### Review` (`skip` = the default; `parallel` = four delegated reviewers; `inline` = one `pwk-code-review` pass). Missing tags default to `none` / `skip`; flag `full` only where complex logic or the feature's main part makes a human look worth the stop.
- **Nothing is tagged silently here; only the human tags a slice for review.** A requirement touching a production-risk area carries its `### Production-risk notes` and is flagged `⚠ production-risk` in the At-a-glance Risk column — display-only, derived: `⚠ production-risk` if and only if the block carries non-empty notes, never an input; `auto` reads the underlying risk content, never the display column. Its written `### Review` value stays `skip` unless the human sets it — propose the tag in prose; an explicit human tag always wins, both ways.
- **No per-requirement spec stop, by design** — the criteria were approved at design time; re-checking mid-execution asks a question already answered.
- **Production-risk notes** — risks involving schema migrations, new dependencies, external APIs, or seed data also get a `## Setup` section (dependencies, migrations, seed data, and how to verify setup worked) between `## Requirements` and `## Feature acceptance`.
- **Ordering** — dependencies come earlier; the executor runs blocks in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.

Then the narrative sections the executor reads as context — problem, approaches considered, architecture, components, data flow, error handling. Head the fork record exactly `## Approaches considered` — finalizing's learning sweep reads it by that name — and **record every real fork and why each loser lost**; the executor needs the reasoning and finalize harvests it for ADRs.

Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` **immediately after the last requirement block** — inside the `### R1 → ## Feature acceptance` span, so the review packet carries it verbatim — and mirror the risks into each touched block's `### Production-risk notes`. `pwk-code-review` audits it (per reviewed slice, and always at the feature review); finalize's learning sweep reads it.

**End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. It is the feature's definition-of-done and the **primary enforced spec**: `pwk-executing-tasks` writes it as the E2E test first and gates on it. The section carries the feature-level `### Feature review: auto | parallel | inline` tag — the one whole-feature review; default `auto`, which resolves on the design's own production-risk content to `parallel` (all four reviewers) when the design has any — a non-empty `## Production-risk areas` section, or a non-empty `### Production-risk notes` on any requirement — and to `inline` (one pass) otherwise. An explicit `parallel` or `inline` is written as-is, never resolved. If a scenario step would require inventing behavior, the invention goes back through the assumption gate — never silently into the scenario; an unwritable step means an unspecified requirement.

```markdown
## Feature acceptance

- Given <starting state>, When <trigger>, Then <end-to-end outcome the feature promises>.

### Feature review: auto | parallel | inline — the one whole-feature review; leave `auto` unless the human says otherwise.
```

Example (rate limiting): "Given a new API consumer with no prior usage, When they exceed 100 requests/minute for 3 consecutive minutes, Then they're throttled, a `rate_limited` event is emitted, and further requests return 429."

**Audit before finishing:** every requirement block has acceptance criteria and both tags, and each requirement appears **exactly once** — none dropped, none duplicated. Non-trivial docs carry a `## Feature acceptance` section as the primary enforced spec; a trivial doc ends after its `### R1:` block and ships on the full suite. Production-risk areas appear in the blocks that touch them. The probe test: a criterion is ready only when its `Then` names an outcome a command can observe — a run, a grep, or an assertion; one with no nameable probe goes back for splitting or rephrasing, and criteria never name tests. A fact settled by a sketch carries its proof where it lands — `(settled by sketch: <what ran> → <result>)` — woven into the section it confirms, never a new template section.

## Structural validator contract

Run `scripts/validate-design.py` as directed in the main skill. It reads UTF-8 Markdown without modifying it; headings, tags, and labels inside backtick or tilde fenced examples do not count, so close every fence. Real requirements use unique sequential `### R1: <name>`, `### R2: <name>`, … headings with nonempty names. Each block needs a standalone `**Acceptance criteria**` label in its main body, before any tag or risk-note heading (an explanatory suffix after an em dash, dash, or colon is allowed), with nonempty criteria before the next heading or bold label. A bare bullet or content borrowed from risk notes is not a criterion section.

Write each selected tag as one value, not the template's pipe-separated alternatives. Missing optional tags retain `Checkpoints: none`, `Review: skip`, and `Feature review: auto`. Non-trivial designs require nonempty `## Feature acceptance` scenarios before their feature-review tag. Only the minimal trivial shape above receives the no-Feature-acceptance exception.

The helper checks structure, not meaning: it does not prove Given/When/Then quality, testability, edge/error coverage, good slicing, risk classification, confirmed assumptions, or human approval. Those remain the agent's audit and the human's judgment. Structural success does not complete the design gate by itself.
