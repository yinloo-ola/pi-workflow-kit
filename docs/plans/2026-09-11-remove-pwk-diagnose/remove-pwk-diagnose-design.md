# Remove `pwk-diagnose`, one folder per topic, align + simplify the remaining skills

## At a glance

| R# | Requirement | Risk |
|----|-------------|------|
| R1 | Delete `skills/pwk-diagnose/` and drop it from the guard unlock list | Low |
| R2 | Update tests/lint that enumerate or assert on `pwk-diagnose` | Low |
| R3 | Sweep docs + the one `pwk-executing-tasks` reference | Low |
| R4 | Align `pwk-code-review` checklists with the four role contracts | Low |
| R5 | Simplify remaining skills: clearer, less redundant, behavior-preserving | Medium |
| R6 | One folder per topic — a single-part topic and an umbrella share one shape | Medium |
| R7 | Both flows share one identity model (local umbrella detection, one slug, one disposal path) | Low |

**Key decisions:**

- **Delete `pwk-diagnose` outright, no stub, no deprecation** — the kit never used it; any open-source diagnose skill covers the need. A stub would keep the name alive in discovery and keep an unlock path in the guard for no benefit. Rejected alternative: deprecate-and-warn (keeps maintenance + guard surface for zero users).
- **`pwk-code-review` stays a separate skill, checklists aligned with the four roles** — it is the `inline` engine that `pwk-executing-tasks` dispatches to (feature-review `inline` path + per-requirement `Review: inline` tag) and that `pwk-brainstorming` names in its tagging guidance. `pwk-executing-tasks` never duplicates its checklist; folding it in would bloat the already-largest skill file. Rejected alternative: fold the checklist into executing-tasks.
- **Checklists verbatim, everything else untouched (Q7)** — R4 ports only the four `Your checklist` sections from `agents/pwk-{spec,tracing,smell,hazard}-reviewer.md` into `skills/pwk-code-review/SKILL.md`. Reporting stays as-is (no `file:line`-per-finding rule, no `No findings` requirement, no packet discipline), and the skill stays unlocked (smells are fixed directly; the smell-role's "flag large refactors for the main agent" sentence is inverted accordingly).
- **Keep the mid-execution recording rule, drop the example** (Q2) — the "bugs fixed mid-execution are mandatory execution-summary content" obligation stays in `pwk-executing-tasks`; only the `(e.g. fixed via pwk-diagnose)` parenthetical goes.
- **A single-part topic gets its own folder too (Q8)** — the kit currently runs two identity models: flat `docs/plans/????-??-??-<topic>-*.md` for a standalone topic, and a `docs/plans/<date>-<umbrella>/` folder for an umbrella. Each skill re-derives "which one am I in?" independently, which is the root cause of the coherence defects found while reviewing R1–R5 (a repo-wide overview search disagreeing with a folder-local one; one `<topic>` token meaning both the folder slug and the leaf slug in the same path template). Collapsing to one shape — `docs/plans/<date>-<topic>/<leaf>-design.md` — makes "umbrella" a **property** (leaf count) rather than a layout, and deletes the flat disposal glob, the repo-wide overview search, and the dual-meaning slug. Rejected alternative: leave the two models and patch the divergences (five separate fixes, each a fresh chance to drift).
- **Leaf file keeps the `<leaf>-` prefix rather than fixed names (Q8)** — a leaf is `<leaf>-design.md`, not `<leaf>/design.md` or a bare `design.md`. Fixed names would make depth vary (1 vs 2) and every disposal path formula depth-dependent, and would stop `docs/plans/` uniformly listing topics; a bare `design.md` would stop being self-describing if moved. One repetition inside a folder is cheaper than variable depth. For a single-part topic `<leaf>` equals `<topic>`.
- **Flat stays readable, never written (Q8)** — legacy 1.x topics and any pre-change in-flight 2.0 topic are flat on disk; discovery keeps the flat globs so they resume, review, and ship normally. New work is only ever written as a folder. The mitigation is a rule plus a lint pin, not a migration script.
- **This feature migrates its own docs into a folder (Q8)** — `docs/plans/<date>-remove-pwk-diagnose/` becomes the first live topic in the new layout, so the layout's first exercise is real rather than fixture-only. The topic slug stays `remove-pwk-diagnose` (and the branch with it) even though the feature now carries two themes; the title and key decisions carry the second one.

## Feature acceptance

Run from the repo root on a clean tree: `npm run check` is green, `skills/pwk-diagnose/` does not exist, and a repo-wide grep for `pwk-diagnose` returns zero hits outside `CHANGELOG.md` history entries and this design doc (history is immutable; the design doc is disposed at finalize).

One folder per topic (R6/R7) is accepted on these corpus invariants — the skills are prose, so the properties below are asserted over the shipped corpus and its fixtures, in the style the existing feature E2E already uses:

1. **This topic is a folder.** `docs/plans/<date>-remove-pwk-diagnose/` holds the design doc, the progress file, and the review packet; no flat `docs/plans/????-??-??-remove-pwk-diagnose-*.md` exists. The layout's first exercise is this feature.
2. **One shape for one and many.** No skill describes a standalone topic as a set of flat dated files; the folder is the unit of creation, discovery, and disposal in all four discovery skills, and `overview.md` is the only thing a multi-leaf folder adds.
3. **Umbrella detection is local.** No skill derives the umbrella from a repo-wide `docs/plans/**/overview.md` search — the overview is read beside the design doc — so an unrelated sibling umbrella can never route another topic's finalize.
4. **Legacy flat topics survive.** The flat `????-??-??-<topic>-*.md` globs remain in discovery and disposal, reachable by resume/ship, so an in-flight pre-change topic is neither lost nor half-disposed.
5. **Prose-drift pins exist.** The roster heading and item shape are pinned by lint, so a future edit that breaks the roster both consumers read fails loudly instead of silently disposing nothing.

## Production-risk areas

None — deletion of docs/config surface plus test updates, and a planning-doc layout change confined to `docs/plans/`; no runtime data paths, no migrations, no concurrency. The guard's design-phase write boundary is a recursive `docs/plans/` prefix check, so the layout change does not touch it.

### R1 — Delete the skill and close the guard unlock

Remove `skills/pwk-diagnose/SKILL.md` (the whole `skills/pwk-diagnose/` dir). Remove `"pwk-diagnose"` from the exported `UNLOCK_SKILLS` in `extensions/workflow-guard.ts` (anchor: `export const UNLOCK_SKILLS = [`); the input handler dereferences the export so no handler change is needed.

Given the skill dir is deleted and the unlock entry is dropped, When a session invokes `/skill:pwk-diagnose`, Then the skill is not found and the guard stays in the gated phase (no unlock path remains). Edge: in-flight topics that mention diagnose in prose are unaffected — prose is not an unlock.

### Checkpoints

`none`

### Review

`skip`

### R2 — Update tests and lint that enumerate `pwk-diagnose`

`tests/skill-lint.mjs` (anchors: `EXPECTED_UNLOCK`, the `pwk-diagnose must claim it exits the gated phase` block, `UTILITY_SKILLS`): drop `pwk-diagnose` from `EXPECTED_UNLOCK` and `UTILITY_SKILLS`, delete the diagnose-specific unlock-claim assertion. `tests/workflow-guard.test.ts` (anchor: the unlock-list array): drop the entry. `tests/workflow-consistency.test.ts` (anchor: `const diagnose = read("skills/pwk-diagnose/SKILL.md")`): remove the read plus any assertion built on it. `tests/human-review-digests.test.ts` (anchor: `"skills/pwk-diagnose/SKILL.md"` in the corpus list): remove the entry. `tests/skill-delegation-contract.test.ts`, `tests/integration-guidance.test.ts`, `tests/workflow-consistency.e2e.test.ts`: remove only if they reference diagnose (sweep, don't force).

Given the R1 deletion, When `npm run check` runs, Then the full gate (biome + vitest + skill-lint) is green with no diagnose-aware assertion failing or asserting on a missing file.

### Checkpoints

`none`

### Review

`skip`

### R3 — Sweep docs and the executing-tasks reference

Retain-then-reword (Q2) plus full cleanup (Q4):

- `skills/pwk-executing-tasks/SKILL.md` (anchor: `Bugs found mid-execution (e.g. fixed via \`pwk-diagnose\`)`): keep the sentence, delete only the parenthetical — `Bugs found mid-execution are mandatory execution-summary content: …`.
- `docs/workflow-phases.md`: delete the `## diagnose` section (anchor: `/skill:pwk-diagnose` code fence under it); fix the `During executing-tasks, code-review, finalizing, diagnose` phase line to drop `diagnose`.
- `docs/developer-usage-guide.md`: delete the `### Diagnose (on demand)` block and the debugging-loop paragraph; drop `pwk-diagnose` from the unlock-set prose (anchor: `The exact unlock set is`).
- `docs/oversight-model.md`: delete the `pwk-diagnose` bullet (anchor: `6-phase debugging loop`); drop it from the unlock prose (anchor: `or \`pwk-walkthrough\` exits the gated phase`).
- `README.md`: drop the `| **Diagnose** |` skill-table row, the `pwk-diagnose/SKILL.md` inventory-tree line, and `pwk-diagnose` from the unlocking-skills prose (anchor: `Unlocking skills:`).
- `package.json` keywords / `pi.skills` manifest: change only if they name diagnose (sweep).
- Out of scope: `CHANGELOG.md` history entries stay (immutable record); the removal itself gets one new entry under Unreleased.

Given the sweep, When grepping the repo for `pwk-diagnose` (excluding `CHANGELOG.md` history and this design doc), Then there are zero hits, and each edited doc still reads coherently (no orphaned "the four skills" counts, no dangling cross-references).

### Checkpoints

`none`

### Review

`skip`

### R4 — Align `pwk-code-review` checklists with the four role contracts

In `skills/pwk-code-review/SKILL.md`, replace the prose of steps 2–5 with the four `Your checklist` sections from the role contracts, verbatim where authority allows:

- Tracing ← `agents/pwk-tracing-reviewer.md` checklist verbatim.
- Spec alignment ← `agents/pwk-spec-reviewer.md` checklist verbatim, including the per-requirement coverage table.
- Smells ← `agents/pwk-smell-reviewer.md` item list verbatim, but keep the skill's unlocked behavior: apply fixes directly and re-run tests (the role's "flag large refactors for the main agent" direction is inverted — there is no main agent in the inline path).
- Hazards ← `agents/pwk-hazard-reviewer.md` 7-item audit verbatim.

Steps 1 (scope), 6 (report), 7 (mark done) and the `Unlocked` framing stay as-is. No reporting-contract port (no mandatory `file:line` evidence rule, no `No findings` requirement), no packet-discipline port.

Given the four role checklists, When reading the rewritten skill, Then each checklist reads identically to its role counterpart (modulo the three divergences the skill's own context forces), and the skill's process/reporting sections are unchanged from today. The three sanctioned divergences, named here so the criterion is honest about them rather than promising a verbatim port it cannot deliver: (1) the tracing object phrase reads "the acceptance criteria and the feature E2E" because "integration tests" is banned terminology in that file (asserted by the stale-terminology guards); (2) the spec coverage table is keyed to the design doc's `### R<n>:` headings, since the inline path has no packet; (3) the smell direction is inverted — the unlocked skill applies fixes where the read-only role flags them.

Edge: future role-checklist edits must be mirrored here — now mechanically enforced rather than left to a commit-message note. Check 13c in `tests/skill-lint.mjs` pins each role's checklist items **line-complete** in both the role contract and the skill, so an item edited, deleted, or appended-to in either file fails `npm run check`; it also pins the three divergences above and re-asserts the banned-phrase ban in the skill. Verified by mutation in both directions before landing.

### Checkpoints

`none`

### Review

`skip`

### R5 — Simplify remaining skills (clarity + redundancy pass)

Supersedes `docs/plans/2026-09-11-skill-slimming-notes.md` (delete it in this requirement — its content now lives here; the 2.3.0 timing gate is satisfied since F1–F15 have landed). Scope: all six surviving skills (`pwk-brainstorming`, `pwk-executing-tasks`, `pwk-code-review` as rewritten by R4, `pwk-finalizing`, `pwk-status`, `pwk-walkthrough`). Builds on R1–R4 results; run last.

Method (code-simplifier principles adapted to prose — preserve behavior, only change how it reads):

- **S1** — canonicalize the cross-skill boilerplate (root-check paragraph, discovery recipe) to verbatim-identical wording in the four skills that carry it, plus a skill-lint assertion pinning the shared sentences.
- **S2** — compress the code-digest double-explanation in `pwk-executing-tasks` to one canonical layer with pointers (the 15-line Flow cap, `[R<n>]` tagging, and `was:` semantics survive verbatim).
- **S3** — compress `## Tags reference` to a table; full resolution prose lives only at the point of use.
- General pass — remove duplicated explanations elsewhere (keep one canonical layer, point to it), sharpen vague wording. Prose-only: no gate, checklist, tag, or ceremony semantics change.

Settled non-goals (from the seed, do not reopen): no shared-file extraction (skills stay self-contained), no brevity pass on checkpoint/ship-gate prose (ADR decision records), no line-count target.

Given the six skills, When the pass is done, Then `npm run check` is green (including the new S1 lint assertion and the F14 inventory parity), the diff shows prose-only changes outside the S1–S3 mechanics, and every gate/checklist/tag still reads with identical normative meaning. Edge: where a simplification risks changing meaning, keep the longer wording — clarity over compactness.

### Checkpoints

`none`

### Review

`skip`

### R6 — One folder per topic (single-part included)

Collapse the kit's two identity models into one. Every topic — single-part or umbrella — lives in its own folder:

```
docs/plans/<date>-<topic>/
  <leaf>-design.md
  <leaf>-progress.md
  <leaf>-review-packet*.md      # plus -r<N> per-requirement packets
  overview.md                   # only when the folder has more than one leaf
```

`<leaf>` is the part slug from the overview roster; for a single-part topic it equals `<topic>`. A standalone topic is a folder with one leaf and no `overview.md`; an umbrella is that same folder plus `overview.md` and N leaves. "Umbrella" becomes a **property** (leaf count), not a layout.

Sites that change — each currently encodes the flat form:

- `pwk-brainstorming` — the design-doc write path (step 7) and the umbrella section's leaf paths.
- `pwk-executing-tasks` — the progress-file path and its `Design:` ref (step 2), the review-packet path (feature and per-requirement recipes), the pre-flight discovery globs, the branch/worktree slug, and the post-review routing.
- `pwk-finalizing` — the topic-set derivation and both disposal command blocks.
- `pwk-status` — the discovery step.
- Docs — `README.md`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `AGENTS.md` (the layout tree), `docs/lessons.md` (the commit-hygiene lesson's glob).
- Tests — `tests/skill-lint.mjs` (disposal-line pins, discovery-frame pin, Check 7 roster, inventory parity), `tests/code-digest.test.ts` (`FINALIZE_DISPOSAL_LINES`), `tests/docs-consistency.test.ts`, `tests/human-review-digests.test.ts`, `tests/markers.mjs`, `tests/pwk-status.test.ts`.

Given a topic being brainstormed, When the design doc is written, Then it lands at `docs/plans/<date>-<topic>/<leaf>-design.md` with the folder created when absent, and a multi-leaf topic's `overview.md` sits beside the leaves. Given executing-tasks resuming that topic, When it creates the progress file, Then it writes `<leaf>-progress.md` beside the design doc and its `Design:` ref names that path. Given finalizing that topic, When it disposes, Then exactly one folder — `docs/plans/<date>-<topic>/` — is deleted or archived as a unit, identically for a single-part topic and an umbrella. Edge: legacy flat topics (`docs/plans/????-??-??-<topic>-*.md`) stay readable and disposable through the flat globs — reachable by resume and ship, never newly written. Edge: the guard needs no change — its design-phase boundary is already a recursive `docs/plans/` prefix check.

Given this feature's own topic, When R6 lands, Then its design doc, progress file, and review packet live in `docs/plans/<date>-remove-pwk-diagnose/` — the layout's first live exercise, so the migration is real rather than fixture-only.

### Checkpoints

`none`

### Review

`skip`

### R7 — One identity model, so the two flows never disagree

R6 gives both flows one shape on disk; R7 makes the skills agree about it. Five defects surfaced by reading the four discovery skills against each other, all on the multi-part path:

1. **Umbrella detection is local.** `pwk-finalizing` (pre-check 4 and step 1) identifies an umbrella by a repo-wide "a `docs/plans/**/overview.md` exists", while `pwk-executing-tasks`' post-review routing says explicitly "never a repo-wide `docs/plans/**/overview.md` … so an archived **or sibling umbrella** never routes". Two rules for one concept. Replace finalizing's with executing-tasks': the topic set comes from the progress file's `Design:` ref → that design doc's own folder → the umbrella is the `overview.md` beside it. Reachable failure today: a finished-but-unfinalized sibling umbrella (all its parts `done`, so the phase gate passes) takes over a standalone topic's finalize — its roster becomes the topic set, its folder is disposed, and the topic's own docs are never disposed.
2. **One meaning for the slug.** The `../<repo>-<topic>` branch/worktree template means the folder slug in one skill and the part slug in another for an umbrella part, so finalizing probes the wrong worktree — and its "absent → silent no-op, never a failure" rule hides it, leaking the worktree. Define `<topic>` once, as the folder slug, in both skills.
3. **Next-part predicate.** executing-tasks says build order stays advisory, then routes to "the next `<topic>` in the roster"; a part built out of order is skipped by the suggestion. The next part is the **first roster part with no `done` progress file**.
4. **Roster shape is pinned.** The `## Parts (build order)` heading and the `N. <topic> — <scope>` item shape are consumed by `pwk-finalizing` ("read its parts roster") and `pwk-status` ("take its **parts** roster") but pinned by nothing — Check 7 only greps for the words "umbrella"/"status-free". A drifted heading makes both consumers read an empty roster and degrade silently (nothing to dispose; no roll-up) instead of failing. Pin the heading and the item shape.
5. **Stale prose.** `docs/developer-usage-guide.md` still says "Plans specify *what* (acceptance criteria + integration tests)" — both halves retired (plans merged into design docs in 2.0; "integration tests" is the stale term R4 had to route around) — and `tests/skill-lint.mjs` still prints an "at the integration gate" message for a gate that became the ship checkpoint.
6. **Disposal precedence is stated, not implied.** The per-topic loop runs `rm -f docs/plans/????-??-??-<topic>-*.md` "for each `<topic>` in the set" *and* the folder move. For a folder topic the loop matches nothing (leaf docs are undated and inside the folder) — except a top-level dated file whose slug happens to equal a **leaf** slug, i.e. an unrelated earlier flat topic, which the loop would then delete. The guard paragraph covers only the `*<topic>*` over-match, not this one. R6's shape makes the fix a one-line rule: for a folder topic the flat globs **do not run at all** — the folder move *is* the disposal; the flat globs run only for a legacy flat topic. State it in `pwk-finalizing` so precedence never depends on an implementer's reading of "for each topic in the set".

Given either flow, When a skill identifies the topic, finds the umbrella, names the branch, picks the next part, or disposes, Then it applies the same rule as every other skill, and no rule reaches outside the topic's own folder. Given a sibling umbrella in a different folder, When a standalone topic finalizes, Then its topic set is its own folder and the sibling's docs are untouched. Given a folder topic whose leaf slug equals an unrelated flat topic's slug, When it finalizes, Then the unrelated flat topic survives — only the folder is disposed. Given a drifted roster heading, When `npm run check` runs, Then it fails. Edge: these are prose and lint-pin changes — no gate, tag, checklist, or ceremony semantics move.
