# Workflow consistency audit — findings seed

Not a design doc. This is a **seed for the next brainstorm**: a full-workflow review run at
the end of `leaner-execution-gates` (2.2.0), recording defects in *other* topics that were
found while auditing skill/doc consistency. It has no requirements and no `## Feature
acceptance` section — do not route it through `pwk-executing-tasks`.

**Next action:** run `/skill:pwk-brainstorming` and point the agent at this file explicitly.
The discovery globs only surface `*-design.md` and `overview.md`, so this file will not be
reported as in-flight on its own.

Audited at commit range `befb7bf...HEAD` (2.1.2 → 2.2.0). Findings marked **(still open)**
were verified against the working tree after 2.2.0 landed; none were introduced by 2.2.0
except F2, which 2.2.0's own wording change propagated.

---

## P0 — the workflow can deadlock

### F1 · A failed or skipped requirement is a one-way trap **(still open)**
- `skills/pwk-executing-tasks/SKILL.md` — the ship checkpoint is gated on *"When every
  requirement's Done column is ✅"*.
- A requirement marked **❌** ("Mark the requirement failed with the reason and move on") or
  **⏭** (the `skip` user override) can never satisfy that, so `Feature phase` never reaches
  `done`.
- `skills/pwk-finalizing/SKILL.md` then *requires* `Feature phase: done` in every progress
  file, and separately offers `❌ failed → --force-failed` and `⏭ skipped → warn and confirm`.
  **Those branches are unreachable** — the `done` gate must be passed to arrive at them, and
  it cannot be passed with a ❌ row present.
- `pwk-status` also has no mapping for a partially-failed topic.

**Fix direction:** decide which skill owns failure. Either the ship gate accepts ❌/⏭ rows
(making finalizing the authority for shipping incomplete work, as its own text already
assumes), or executing-tasks gains a terminal `partial`/`failed` phase that finalizing and
status both recognize.

---

## P1 — skill-level contradictions

### F2 · "One mandatory checkpoint" is false whenever the design has `## Setup` **(still open)**
`skills/pwk-executing-tasks/SKILL.md` declares **`⏸ CHECKPOINT: setup`** — a second hard stop.
But "one mandatory checkpoint (ship)" now reads in `docs/oversight-model.md`,
`docs/developer-usage-guide.md` (twice), and `README.md` ("one hard human-review gate").
The pre-2.2.0 text said "two mandatory checkpoints (feature-spec + ship)" and *also* never
counted Setup, so 2.2.0 inherited rather than created the omission — but it propagated the
count claim to one more site. Setup also has no `Feature phase` value, so `pwk-status` cannot
render it and a resume cannot detect it.

### F3 · The Setup checkpoint is unimplementable as written **(still open)**
It says *"Record `setup: done` in the progress-file header"* — but the progress file is
created in the very next step, **after** the checkpoint, and the header template has no
`Setup:` slot. Three-way mismatch between instruction, ordering, and template.

### F4 · Per-requirement ceremony vocabulary is three-way inconsistent **(still open)**
- executing-tasks documents the ceremony column values as `⏸ tests` / `🔎 inline`.
- `Checkpoints: full` fires **two** stops; the second ("after the slice is complete") has no
  marker.
- `skills/pwk-code-review/SKILL.md` says to update a row "from `🔎 review` to `✅ done`" —
  `🔎 review` appears in no template, and code-review mutates the **Done** column that
  executing-tasks owns (two writers, one cell).

### F5 · Two competing risk representations; only one drives behaviour **(still open)**
The At-a-glance table's `| R# | Requirement in one line | Risk |` column is never given a
vocabulary, while `auto` resolution reads **only** `## Production-risk areas` /
`### Production-risk notes`. A design can put `Risk: High` in that table with no notes, and
`auto` silently downgrades the feature to a single inline pass. Either `auto` must read the
column, or the column must be declared explicitly non-normative.

### F6 · The `## Feature acceptance` template omits its own tag **(still open)**
`pwk-brainstorming` mandates that the section carry `### Feature review: …`, but the template
block shows only the Given/When/Then line — asymmetric with the Requirements template, which
does render `### Checkpoints` / `### Review`. This is mechanically significant: the review
packet recipe uses `### Feature review` as its `sed` terminator, so a design doc that follows
the template makes the "Feature acceptance (verbatim)" span run to EOF.

---

## P2 — documentation drift

### F7 · `pwk-walkthrough` is missing from two of the four inventory docs **(still open)**
`docs/oversight-model.md` never mentions it and claims "There are 5 pipeline skills" while
listing 4 + 2 = 6. `docs/workflow-phases.md` has no `## walkthrough` section despite a
preamble correctly saying "3 utility skills". `docs/developer-usage-guide.md` says
"2 utility skills" while its own body documents three.

### F8 · The unlock list is stale in three prose sites **(still open)**
`README.md`, `docs/developer-usage-guide.md`, and `docs/oversight-model.md` all omit
`pwk-walkthrough` from the unlock list, though `UNLOCK_SKILLS` exports it and the lint's
`EXPECTED_UNLOCK` asserts it. README further claims the list is "lint-asserted against the
skills' claims", but the lint only checks the extension export plus `pwk-status`'s denial —
**never the docs**.

### F9 · Stale 1.x "plan phase" terminology in five places **(still open)**
`README.md` tagline ("brainstorm→plan→execute→finalize"), README twice more,
`docs/developer-usage-guide.md` ("refused during brainstorm and plan phases"),
`docs/provider-delegation-contract.md` ("brainstorm and plan phases"),
`docs/workflow-phases.md` ("progress file / plan doc"), and a "Test-first discipline"
sentence about invalidating "the plan".

### F10 · `pwk-code-review` is half-migrated off the removed plan phase **(still open)**
"acceptance criteria in the plan", "from the plan doc", "integration tests" (2.0 renamed
this to acceptance criteria + feature E2E), and "because the plan tagged the requirement … at
plan time" (since 2.2.0 only the human tags).

### F11 · Structural bug: the diagnose section is split by the walkthrough block **(still open)**
In `docs/developer-usage-guide.md`, `### Walkthrough (on demand)` and its description were
inserted between the `### Diagnose (on demand)` heading and diagnose's own prose, so "A
debugging loop you invoke when something is broken…" now dangles under the Walkthrough
heading. Introduced by the walkthrough feature commit, not by 2.2.0.

---

## P3 — under-specified mechanics

### F12 · The packet recipe's `<merge-base>` is never defined **(still open)**
The feature packet uses `<merge-base>` as a bare placeholder with no instruction for
computing it; the per-requirement packet says only "the same recipe limited to the commits
and criteria of that requirement" with no scoping rule. During 2.2.0 the per-requirement
packet had to be regenerated because the first base guess was wrong. The progress file's
`Commit` column is the obvious source and is not named.

### F13 · `pwk-status` contradicts the failure model **(still open)**
It claims `done` means "every row is complete" — which conflicts with finalizing's ❌/⏭
handling (F1) and with `done` being set at the ship checkpoint.

### F14 · No test guards the doc inventory **(still open)**
The suites read these docs for specific phrases, but nothing asserts that every skill appears
in every inventory doc, or that the stated counts agree — which is exactly why F7/F8 drifted.
Same failure class as the existing lesson "A glob-scope change must enumerate every consumer
in the same change." A parity assertion over the four inventory docs is the structural fix.

### F15 · `pwk-diagnose` has no hook back into the workflow **(still open)**
A bug fixed mid-execution leaves no trace: executing-tasks' "Learn" step mentions only
`docs/lessons.md`, so the execution summary, the deviation column, and the ship digest all
miss it.

---

## Suggested decomposition (for the brainstorm, not binding)

- **Full design doc:** F1–F6 — real workflow-logic changes (a terminal requirement status, a
  checkpoint model, one normative risk representation, the Setup phase and its header slot,
  the Feature-acceptance template).
- **Trivial fast-path:** F7–F11 — mechanical doc parity.
- **Coverage work that prevents recurrence:** F8/F14 — a doc-inventory parity assertion in
  `tests/skill-lint.mjs`, so the next drift fails CI instead of needing another manual audit.
- **Mechanics:** F12, F13, F15.
