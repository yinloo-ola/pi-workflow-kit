# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.2.0] - 2026-09-11

### Changed

- **Per-requirement review auto-tag removed** — `pwk-brainstorming` no longer tags a requirement `### Review: parallel` merely because it carries `### Production-risk notes`. `### Review` defaults to `skip` everywhere and **only the human tags** a slice; the feature review already covers the whole diff, including risk requirements. The removed rule was the source of reviewer-role multiplication: a part with four risk-tagged requirements paid four roles per requirement *plus* four at the ship checkpoint.
- **One risk-scaled feature review** — the feature-level tag becomes `### Feature review: auto | parallel | inline` (default `auto`). `auto` resolves on the design's own production-risk content: `parallel` (four fresh-context roles) when the design has a non-empty `## Production-risk areas` section or any requirement has non-empty `### Production-risk notes`, `inline` (one `pwk-code-review` pass) otherwise. An explicit `parallel`/`inline` is used as written and always wins over `auto`.
- **Feature-spec checkpoint becomes a notice** — the feature-acceptance E2E is still written first (red) and is still the primary enforced gate at the ship checkpoint, but it is now *reported* with its failing output instead of pausing execution: its text was already approved as `## Feature acceptance` during brainstorm. Mandatory human stops per feature drop to one (ship). `pwk-status` renders `e2e-written` as `execute 0/N` and the `feature-spec` display state is retired.
- **`spec` removed from the per-requirement Checkpoints enum** — `### Checkpoints` accepts `none | full` (default `none`). The retired value was a stop on acceptance criteria the human had already approved at design time; the paired "`spec` requires at least `inline` review" rule went with it.
- **Enriched Code digest `### Flow`** — the ship digest's flow section becomes a navigable map: a `Spine` of `[R<n>]`-tagged hops named by symbol or module (no line numbers, no file paths), a `Branches` list giving every alternative and error path as `condition -> outcome`, `was: …` clauses where behavior changed, worked values inline, and a `Side effects` line when the feature performs I/O. Capped at roughly 15 lines; beyond that the ship checkpoint offers `/skill:pwk-walkthrough` as the deep read instead of growing the digest. Symbol labels rather than `file:line` anchors are deliberate: a line number rots the moment anything above it is edited, and a commit SHA is one `git log` away — symbol names survive both and stay greppable, while `pwk-walkthrough` is the artifact that carries exact `file:line` references when depth is wanted.

### Added

- **Flow-truth rule** — the digest's `### Flow` is written from reviewed reality: in `parallel` mode every hop must correspond to a path the tracing reviewer's report names, and in `inline` mode it is checked against that pass's spec-coverage result. A discrepancy that cannot be resolved is surfaced to the human at the ship checkpoint rather than smoothed over.

### Migration

- In-flight design docs tagged with the retired `spec` checkpoint value resolve to `none` — no stop, no error.
- Legacy progress files at `Feature phase: feature-spec-paused` resume into the implement phase and render as `execute 0/N` in `pwk-status`.
- A missing `### Feature review` tag now means `auto` (risk-scaled), not unconditional `parallel`; a design that wants the previous always-four-roles behavior writes `### Feature review: parallel`.

## [2.1.2] - 2026-09-10

### Changed

- **Discovery wording trimmed** — the harness tool enumeration (`find`, `fffind`, file search) is dropped from all four planning skills; the invariant ("use whatever recurses in your harness") plus the single `find` example carries the contract with less surface to age.

## [2.1.1] - 2026-09-10

### Changed

- **Extract-never-ingest for the finalizing gate and the executing resume** — `pwk-finalizing` pre-check 2 matches the `Feature phase:` line and reads only the matching ❌/⏭ verdict rows in the Requirements table; the `pwk-executing-tasks` resume reads the phase line, the Requirements table (first Done cell ≠ `✅` routes), and the Execution summary rows, stopping before the optional sections. The design doc stays a full read everywhere — it is the executor's input, not history.
- **Invariant-not-tool wording for discovery and extraction** — example commands are one way to meet each invariant; any harness-native equivalent (`fffind`, ripgrep, Grep tools) is equally compliant. The invariant is the contract, the command is the fallback.

## [2.1.0] - 2026-09-10

### Changed

- **Phase-driven `pwk-status`** — per-topic state now comes from the progress file's `Feature phase:` header line: `done` is a terminal state (with `N/N` tally), `implementing (k/N)` renders `execute k/N`, and `reviewing` / `ship-paused` / `feature-spec` render honestly; design-only parts show `design`. Umbrella roll-ups count done separately (`n done · n in-flight · n not-started`) and hint `/skill:pwk-finalizing` when every part is done. Status extracts, never ingests — header-only reads and counts, not content; a finished umbrella costs ~300 tokens instead of ~20k.
- **Invariant-based discovery in all four planning skills** (status, brainstorming, executing-tasks, finalizing): recursively list `docs/plans` reaching the nested umbrella folders and skipping `completed/`, letting the search tool do the recursing — glob patterns like `**` don't recurse in non-interactive shells (globstar off). One example command per site; platform-neutral by construction.
- **Repo-root check, step 0, in all four sites** — a session started outside the repo root reports both paths and stops instead of silently finding nothing.

### Added

- `STATUS_STATE_MARKERS` in `tests/markers.mjs` and the `tests/pwk-status.test.ts` contract E2E (phase→state mapping, done terminal, roll-up, discovery invariant, root checks); the `recursiveGlob` marker is retired.

## [2.0.0] - 2026-09-08

### Breaking / migration

**The plan phase is gone — the design doc is the single buildable artifact.** The kit's flow is now **design → execute → finalize**; `/skill:pwk-writing-plans` no longer ships. **Migration for in-flight features**: a stem-matched legacy `*-implementation.md` still routes the old flow (executing/status/finalize glob both suffixes), so 1.x work in progress can finish; new features brainstorm straight into the buildable doc. The guard's phase map reduces to `brainstorm | null` — the two phases were already behaviorally identical (`docs/plans/`-only writes).

### Added

- **Merged design doc (ADR 0004)** — `pwk-brainstorming` now ends with one buildable doc: each requirement is an `### R<n>:` block carrying its one-line behavior, Given/When/Then acceptance criteria (edge/error cases included), and `### Checkpoints` / `### Review` tags; the Feature-acceptance E2E carries the feature-level `### Feature review` tag. **No test-name lists and no crosswalk** — the block structure is the map; the executor writes and names tests red-green from the criteria. The auto-tag rule's single source of truth moves here from the removed skill.
- **Decisions-first At a glance** — the human digest is now summary → **Key decisions** (decision + why; a `(rejected: …)` clause only when the fork was real — never manufactured) → R#/risk table. `## Production-risk areas` sits immediately after the last requirement block, inside the packet span, so reviewers see it verbatim.
- **Finalize learning sweep** — before any disposal command, finalize harvests the design doc's decision bullets + `Approaches considered`, the progress file's `Deviated?` entries (including new deviation decision-records: architectural departures get a what/why/rejected paragraph written at deviation time), and the Code digest's `[ALERT]`s into ADR offers (3-gate test, informed by how decisions played out) and generic `docs/lessons.md` rules; honest-empty when nothing qualifies; asks the human rather than fabricating thin context.
- **`pwk-walkthrough` skill** — standalone, on demand, exits the gate: given a topic or branch, derives from the diff + code and writes `docs/walkthroughs/<topic>.md` — Summary / How it works / Key flows / Gotchas & invariants / Change map — every claim anchored to `file:line`, stamped with the commit range, regenerated wholesale, never hand-edited, never disposed.

### Changed

- Executing's pre-flight creates the feature branch (moved from the removed skill); it parses `### R<n>` blocks, routes legacy stem-matched `-implementation.md` docs through the old flow, and seds the review packet's criteria from the design doc (`### R1` → `## Feature acceptance`); the packet's notes span stops at the next `### R<n>` block (no cross-block duplication).
- Guard reminder wording: **DESIGN phase**; `UNLOCK_SKILLS` gains `pwk-walkthrough`.
- README + user docs + AGENTS rethreaded to the three-skill pipeline.

## [1.8.0] - 2026-09-07

### Added

- **Code digest at part completion** — after the feature review passes, `pwk-executing-tasks` writes a plain-language `## Code digest` (Summary / Flow / Gotchas / Key files) into the progress file, derived from the review packet (Commits / Changed files / Diff), and presents it at the ship checkpoint between the execution summary and the coverage table. Fill rules: plain language, arrow-chain flows, `[ALERT]` only for reviewer-confirmed risks (honest empty when none), key files capped at 5, no test names. Rides the existing disposal globs; written once per feature, never a shipping gate.
- **Frontier-round brainstorming** — `pwk-brainstorming` replaces one-question-at-a-time with dependency-ordered **frontier rounds**: numbered questions each carrying a recommended answer, a six-dimension seed checklist (*Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional*) with a visible `— nothing to ask` for empty groups, a facts rule (codebase/docs/tool facts are looked up — recon scout or inline — never asked of the human; pending lookups hold only downstream questions), an **assumption gate** (`Assumptions to confirm`) sweeping the drafted design before it is presented, and a frontier-empty stop rule (nothing left silently assumed). Unwritable feature-acceptance scenario steps bounce back through the gate; `pwk-writing-plans` bounces requirements whose testable acceptance criteria cannot be derived without inventing behavior back to brainstorm, naming the gap.

### Fixed

- **`/pwk-setup` fast-model picker rendered `[object Object]`** — `promptFastModelChoice` violated pi's extension API contract twice: it passed `{ value, label, description }` objects to `ctx.ui.select`, which only accepts plain strings (every option rendered as `[object Object]` and a selection would write garbage into role frontmatter), and it read `ctx.scopedModels[].model` as a string although pi supplies `Model` objects (`{ id, name, provider, … }`), so the model list was always empty. The picker now offers bare model ids (deduped) plus `skip`, extracts ids from `Model` objects, and silently skips the dialog when no scoped models exist (consistent with headless behavior). Tests updated to the real contract.
- **Archived plan docs no longer resurface as active** — every recursive `docs/plans/**` discovery glob (`pwk-status` artifact globs, `pwk-brainstorming` discovery, `pwk-writing-plans` find-the-design + umbrella check, `pwk-executing-tasks` find-the-plan + post-review routing, `pwk-finalizing` umbrella detection + progress reads) now excludes `docs/plans/completed/`. Closes a 1.7.0 regression in which an archived umbrella's `overview.md` could invert finalize's umbrella branch (the anchored `rm -rf` targeting the archive) and misroute standalone post-review routing. Finalize disposal commands are byte-unchanged and regression-guarded by tests.

## [1.7.0] - 2026-09-05

### Added

- **Human review digests** — the human reads digests, not full artifacts, with one R# scheme threaded from design to review:
  - Design docs open with `## At a glance` (plain-language summary + `| R# | Requirement in one line | Risk |` table); trivial docs get an `In short:` line.
  - Plans carry a `## Crosswalk` (R# → section → tests) placed strictly before `## Requirement 1` (review-packet sed spans unaffected); the plan presentation is a one-line confirmation instead of the full plan.
  - Progress files gain an `## Execution summary` (how each requirement was built, deviations logged as they happen; plain words, no test names).
  - Spec-reviewer reports open with a per-requirement coverage table (`covered | gap | scope-creep` + file:line evidence).
  - Umbrella docs live in their own `docs/plans/<date>-<umbrella>/` folder, discovered via recursive globs and disposed as one unit; standalone topics stay flat.
  - Finalizing gates on `Feature phase: done` — in-flight features bounce back to executing-tasks.

### Changed

- **Ship gate (ADR 0003):** the feature-complete checkpoint and the post-approval feature review merge into one **ship checkpoint** — the review runs *before* the single final approval, which now presents green gates + execution summary + coverage table + findings status, with the raw diff on request (previously "you review the whole diff"). Phase enum: `ship-paused` replaces `feature-complete-paused` (legacy progress files resume as `reviewing`).

### Fixed

- Umbrella disposal: the `rm -rf` folder path is anchored verbatim to the discovery glob, and the archive move is verified (`ls docs/plans/completed/<date>-<umbrella>/`) before committing.
- Post-review umbrella routing uses the recursive `docs/plans/**/overview.md` glob (an umbrella part can no longer be misrouted to finalize as its own PR); `Feature phase: reviewing` is set before the feature review runs so mid-review resumes route correctly.

## [1.6.1] - 2026-09-05

### Fixed

- Per-requirement review packets write to a requirement-suffixed stem (`<dated-stem>-review-packet-r<N>.md`) instead of overwriting the feature packet at the shared `review-packet.md` path; `pwk-finalizing` disposal glob loosened to `-review-packet*.md` so both forms are disposed.

## [1.6.0] - 2026-09-05

### Added

- **Review packet**: the feature review assembles `docs/plans/<dated-stem>-review-packet.md` by fixed shell commands (commits, changed files, acceptance criteria verbatim, feature acceptance, risk notes, raw diff); reviewers spawn with one-liner pointers — packet bytes never pass through spawn arguments. Per-requirement reviews use the same recipe scoped to the requirement.
- **Tiered reviewers**: smell/hazard roles ship `thinking: low`, `max_turns: 20`, and a commented `# model:` placeholder; spec/tracing ship `max_turns: 40`. Bodies share a byte-identical conduct block (read-only reporter, authority boundary, reporting contract, packet discipline with cited excursions and early-wrap disclosure) with role checklists last.
- **`/pwk-setup --fast-model <model> [--all-roles]`**: interactive picker (`ctx.scopedModels`, UI-gated, asks only while no hint is installed) or arg form personalizes the fast tier; `applyFastModelHint` is an exported pure helper; installs are substitution-aware (bare runs re-apply the recorded choice, hint-only deltas auto-update, other edits keep conflict/`--force` rules).
- **Advisory resource hints** in the provider delegation contract: `model`/`thinking`/`max_turns` are advisory per-role; unresolvable models fall back to the host default and must not fail the review.
- `pwk-finalizing` disposes `-review-packet.md` with the plan docs in both delete and archive paths.

## [1.5.0] - 2026-09-02

### Added

- **Harness-neutral delegation.** The workflow skills now express recon and review as logical roles and capabilities (`codebase-recon`, `parallel-review`) instead of a literal `subagent` tool payload, so they can run on Claude Code or any host with a compatible agent mechanism. Role instructions gained explicit authority boundaries, evidence/no-findings reporting rules, and host-neutral wording. Unavailable or unsafe delegation falls back inline (`Scout: unavailable` for recon; retained-successful + retry/inline-completion for review) and never silently omits a required role.
- **`/pwk-setup` slash command** (Pi-only, registered by the workflow-guard extension). Installs the five canonical role definitions (`pwk-recon-scout` + four reviewers) into the project's `.agents/agents/` so compatible delegation extensions — `@tintinweb/pi-subagents` is one — discover them without pre-creating running subagents. Idempotent; differing files are conflicts preserved unless `/pwk-setup --force`; symlink destinations rejected; refused during brainstorm/plan phases even with `/pwk-guard off` **and under the `/pwk-guard on` read-only lock**; never installs a provider or reloads the session.
- **`docs/provider-delegation-contract.md`** — the provider-neutral capability/outcome contract (request shape, capability list, normalized `completed|failed|timed-out|skipped` results, deterministic selection, inline fallback protocol) for future host adapters. Shipped in the tarball.
- **Delegation contract test suite** — role-contract, skill-wording, provider-contract, fallback-behavior, integration-guidance, package-integrity, and a feature E2E; plus a pure `assessDelegationCoverage` helper exported from the guard.

### Changed

- **Docs rewritten for cross-host use** (README, developer-usage-guide, workflow-phases, oversight-model): portable semantics vs. Pi-specific enforcement are now separated; `@tintinweb/pi-subagents` is documented as one compatible Pi mapping (roles via `.agents/agents/`, recon optionally via its read-only `Explore`); other Pi extensions need the documented capabilities or a separate adapter — arbitrary extensions are not automatically compatible.
- **Legacy `pi-subagents` manifest retained as compatibility-only** (optional peer + `pi-subagents.agents` key); it is no longer presented as the portable delegation contract.

## [1.4.0] - 2026-09-01

### Added

- **pwk-recon-scout package agent** — a new read-only worker that maps how a repo handles a topic before design, dispatched from a new step 4 in `pwk-brainstorming` (between Understand-the-idea and Explore-approaches). Produces a 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) with `file:line` citations per claim; observations only, no design recommendations. Trivial changes skip the dispatch. Falls back gracefully when `pi-subagents` is not installed — the design doc gets a literal `Scout: unavailable (pi-subagents not installed) — inline recon used.` line. The main agent reads the report into its context instead of loading the files inline, keeping the brainstorm discussion lean.
- **skill-lint Check 10 (parallelize-workflow)** — 20 assertions covering the scout (frontmatter, read-only tools, 5-section shape, file:line citations, observations-only), the auto-tag rule (production-risk notes ⇒ `### Review: parallel`, `skip` default preserved, editable, single-source-of-truth), and the cross-skill links. A negative-case assertion guards the `non-empty` qualifier so a future edit cannot silently broaden the auto-tag.

### Changed

- **`pwk-writing-plans` auto-tags `### Review: parallel`** for any requirement that carries a non-empty `### Production-risk notes` section. The default `### Review: skip` is preserved for requirements without risk notes. The tag is silently applied; the human can override or downgrade it to `inline` or `skip` during plan review before approval, and `pwk-executing-tasks` honors the edited value. The rule is the single source of truth — `pwk-executing-tasks` and the docs (`README.md`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md`) link to it rather than restate it.
- **`pwk-brainstorming` step numbering** — step 4 (Codebase recon) inserted between Understand-the-idea and Explore-approaches; the subsequent steps renumber to 5, 6, 7. The trivial-skip clause now correctly says `Skip steps 3–7`.
- **New lesson in `docs/lessons.md`**: "Keep one commit per topic in `docs/plans/`." When more than one in-flight brainstorm has artifacts under `docs/plans/`, the plan-phase `git add docs/plans/` would otherwise sweep unrelated drafts into the topic PR. The discipline mirrors `pwk-finalizing`'s `????-??-??-<topic>-*` glob.

## [1.3.0] - 2026-08-12

### Added

- **Feature-gate execution model (default).** The feature-acceptance E2E test is now the primary enforced gate. `pwk-executing-tasks` runs one always-on flow: write the feature E2E (red) → **checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back → **checkpoint: feature-complete** (full suite + feature E2E green) → one **feature-level review** over the whole diff. The old per-requirement loop and separate integration gate fold into `feature-complete`. See ADR-0002.
- **Meaningful-test rules** mirrored across `pwk-writing-plans`, `pwk-executing-tasks`, and `docs/lessons.md`: test observable behavior (assert on what the feature produces or changes through its public interface); write a per-slice test only when the slice has its own observable behavior.
- **skill-lint Check 9 (feature-gate model)** — asserts the new tag defaults, the feature-spec/feature-complete checkpoints, opt-in per-requirement ceremony, and the meaningful-test rules.

### Changed

- **Per-requirement tag defaults flipped**: `### Checkpoints: none` (was `full`), `### Review: skip` (was `parallel`); a feature-level `### Feature review: parallel | inline` (always on, default `parallel`) is added. Per-requirement ceremony is now opt-in — the plan tags only requirements with complex logic / the main part of the feature (checkpoint) or production-risk (review). Existing in-flight plans are unaffected (they carry explicit tags). `spec` still requires at least `inline` review.
- **`## Feature acceptance` is the primary enforced spec** in `pwk-writing-plans` and `pwk-brainstorming` — the test the executor gates on first.
- Docs (`workflow-phases.md`, `developer-usage-guide.md`, `oversight-model.md`, `README.md`) updated to describe the feature-gate flow.

### Fixed

- **`docs/lessons.md` no longer ships in the npm tarball.** It held kit-development lessons (skill-lint, skill-markdown editing) irrelevant to users; the skills read the user's project `docs/lessons.md` (creating it on first use), never the package copy. Removed from `package.json` `files`; corrected the README claim that it "ships with starter rules".

## [1.2.0] - 2026-08-01

### Added

- **Umbrella: multi-design-doc requirements ship as one PR.** A requirement too big for one design doc is an *umbrella*: `pwk-brainstorming` proposes the split and writes a **status-free** `docs/plans/YYYY-MM-DD-<umbrella>-overview.md` (roster of parts + build order) plus the **first** part's design doc; later parts are brainstormed one by one against the overview + implemented predecessors (no special "read predecessors" step). The umbrella lives on one branch — `pwk-writing-plans` creates it on the first part and reuses it for later parts; `pwk-executing-tasks` suggests the next part (or finalize after the last); `pwk-finalizing` disposes the overview + every part's docs and ships **one PR**. `pwk-status` rolls an umbrella's parts up under its overview. Replaces the earlier 'one brainstorm writes every sub-design, each its own PR' model.

### Changed

- **`pwk-finalizing` offers archive-or-delete for consumed plan docs** — instead of always deleting, it now asks the human: **delete** (default — code + tests are the source of truth; avoids stale plan docs misleading future sessions) or **archive** to `docs/plans/completed/` (keep planning history). Re-introduces the archive path removed in `de8ee16`, now as a human-chosen option alongside delete. ADRs, `docs/lessons.md`, `CHANGELOG.md`, and `README.md` are never touched either way.
- **`pwk-status` is scoped to the current working tree** (a worktree has its own `docs/plans/`) and no longer overclaims cross-worktree visibility; it now groups an umbrella's parts under their overview.
- **`pwk-executing-tasks` progress file** is now named `YYYY-MM-DD-<topic>-progress.md` explicitly (was the undefined `<plan-name>` token), matching `pwk-finalizing`'s dated glob.

## [1.1.0] - 2026-07-31

### Added

- **`/pwk-guard` command** — manual override of the workflow guard: `on` forces a read-only lock, `off` disables the guard entirely, `auto` (default) returns to skill-driven phases. Subcommands autocomplete. Mirrors the `/fog` escape hatch in pi-wayfinder.
- **skill-lint check 6 `phase unlock list`** — verifies the guard's unlock list (which `/skill:` commands exit a gated phase) against every skill's own claims, both directions: unlocking skills must document it, `pwk-status` must assert it does *not* unlock, and the exported `UNLOCK_SKILLS` const must match the input handler. Prevents a "read-only" skill from silently dropping the write boundary.

### Changed

- **`pwk-status` no longer exits the gated phase** — it is read-only orientation and previously unlocked the write boundary as a hidden side effect. `pwk-diagnose` and `pwk-code-review` still exit (they legitimately write source) and now say so in their SKILL.md and in `docs/workflow-phases.md` / `docs/oversight-model.md` / `README.md` / `docs/developer-usage-guide.md`.
- **`pwk-executing-tasks` no longer inlines the four reviewer checklists** in its `subagent` task template (~450 tokens saved per execute). The checklists live only in `agents/pwk-*-reviewer.md`, now the single source of truth.
- **Skills de-verbosified** (`pwk-brainstorming`, `pwk-writing-plans`, `pwk-executing-tasks`, `pwk-finalizing`) — ~100 lines trimmed across the four, with zero behavior change: every gate rule (proportionality tags, spec+inline constraint, integration gate, finalizing's failed/skipped blocks) is retained, and the wording now states the why once instead of repeating it per step.

### Added

- **Parallel specialized sub-agents** for per-requirement code-review (`ab5eba8`). Four dedicated agents — spec, tracing, smell, hazard — each reviewing from a different dimension via the `subagent` tool's parallel mode. Each gets a fresh context window (zero pollution from prior requirements). The agents ship as **package agents** (`agents/pwk-*.md`, declared via the `pi-subagents.agents` manifest key) discovered natively by the optional **`pi-subagents`** package — no copy step, clean upgrades. When `pi-subagents` is not installed, flow falls back to inline `/skill:pwk-code-review`.
- **Reviewers gained frontmatter** (`name`/`description`/`tools`/`systemPromptMode`). The previous `.pi/agents/pwk-*.md` files had no frontmatter, so agent loaders (which require `name` + `description`) silently skipped them — the parallel path never actually ran, even in-repo. Moved to `agents/` and removed `.pi/`.
- **`agentScope` set to `"both"`** in `pwk-executing-tasks` so package + user + project agents are all reachable (package agents are scope-independent in `pi-subagents`, but `both` is the safe default).
- **Sub-agents set to read-only reporters** (`16ee0a2`). Review agents report findings only; they do not edit files or produce commits. Enforced via `tools: read, grep, find, ls, bash` (no `write`/`edit`). The main agent collects all results, applies smell fixes itself, runs the full test suite, and commits — eliminating concurrent write races between parallel subprocesses.

### Changed

- **Phase transitions are skill-only.** Removed the `approve`/`accept`/`lgtm`/`ship it` message-keyword that ended the gated plan phase — it was a false-positive footgun ("I approve of approach A" unlocked writes mid-discussion). Run `/skill:pwk-executing-tasks` (or any non-gated skill) to leave the plan phase.

### Added

- **Proportional workflow** — right-size the pipeline per change and cut human iterations, without restoring the old complexity.
  - **Trivial fast-path** in `pwk-brainstorming`: classify trivial vs non-trivial at the start; trivial changes (typo, obvious fix, config bump) compress brainstorm to one turn with a minimal design doc. The guard still enforces read-only — the phase isn't skipped, just compressed.
  - **Batched design presentation** in `pwk-brainstorming`: the whole design is presented in one pass (organized into sections); the human comments on any section and only revised sections are re-presented. One-to-two stops instead of one-stop-per-section.
  - **Per-requirement tags at plan time** in `pwk-writing-plans`: `### Checkpoints` (`full` default | `spec` tests-stop only | `none` no stops) and `### Review` (`parallel` default | `inline` | `skip`). Defaults preserve 1.0.0 behavior; the human opts in to lighter levels at plan approval. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review) — the lowest-iteration option that doesn't sacrifice quality — but requires at least `inline` review (never combine `spec` with `skip`). Test-first is preserved regardless — even `none` writes tests first (red) and implements to green; only the human *stops* are optional.
  - **`pwk-executing-tasks` honors the tags**: `full` runs both checkpoints, `spec` runs the tests checkpoint only, `none` runs none; review dispatch follows `parallel`/`inline`/`skip`. Stops and asks the human if a plan combines `spec` with `skip`.
  - **Composition check after each commit** in `pwk-executing-tasks`: when a requirement touches shared code (modules imported by other requirements), the executor runs the full suite now and fixes cross-requirement regressions immediately, instead of discovering them only at the integration gate.
  - Skill-text only — no extension or runtime changes; the guard is untouched.
- **Feature acceptance contract** — the integration gate previously asked "do the requirements compose?" with no designed artifact to check against, so per-requirement tests passing together was the only signal (the PRD's end-to-end claim went unverified). Now the PRD claim is a designed, written, run test:
  - `pwk-brainstorming` ends the design doc with a `## Feature acceptance` section — end-to-end `Given/When/Then` scenarios that prove the requirements compose into the PRD's behavior. The human approves these as the feature's definition-of-done. If you can't write one, the requirements don't yet compose — keep designing.
  - `pwk-writing-plans` derives a `## Feature acceptance` section in the plan — a feature-level integration test (distinct from per-requirement tests). Stops and asks the human if the design has none.
  - `pwk-executing-tasks` integration gate now runs the feature-acceptance test (not just the full suite) before allowing finalize.
  - The skill-lint verifies the `Feature acceptance` section name is consistent across all three skills (the contract is followable).
- **Static skill-lint** (`tests/skill-lint.mjs`, wired into `npm run check`): verifies skill frontmatter, tag-vocabulary consistency across the pipeline skills (`full`/`spec`/`none`, `parallel`/`inline`/`skip`), that the plan template emits what the executor parses, the `spec`+`inline` guard is documented, and the `Feature acceptance` contract spans brainstorm→plan→execute. Catches the class of skill-content drift that previously went uncaught (the vitest suite only covers the guard's pure functions).

## [1.0.0] - 2026-07-30

### Changed (breaking)

- **Design-doc-per-pipeline** — removed the `## Features` status table and the per-feature plan→execute loop. Each design doc runs its own plan → execute → finalize pipeline. A large issue may split into multiple design docs (human-approved).
- **Plans are behavioral specs, not implementation recipes** — `pwk-writing-plans` now produces acceptance criteria + integration-test cases per requirement (no exact code, no micro-tasks). The executor implements with full autonomy.
- **Test-first, two mandatory checkpoints per requirement** — `pwk-executing-tasks` writes integration tests (red) → checkpoint: tests → implement (green) → checkpoint: complete → code-review, per requirement.
- **Guard: simple common-blacklist + phase reminder** — `isSafeCommand` is now `!DESTRUCTIVE` (the `SAFE_PATTERNS` allowlist is removed; fewer false positives). A short phase reminder is shown once when the gated phase begins (cache-safe). Added destructive patterns for edit-via-bash vectors (`sed -i`, `perl -i`, `awk -i inplace`, `git apply`, `patch`, `find -delete`).
- **ADRs are permanent** — moved from `docs/plans/adr/` to `docs/adr/`; no longer archived during finalizing.
- **Finalize is per-topic** — archives only the active design's artifacts, not all plan docs.

### Added

- **`pwk-code-review`** — per requirement, after completion: code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check. Unlocked.

### Removed

- **`pwk-design-review`** — superseded by per-requirement `pwk-code-review`.
- **`pwk-verify`** — superseded by per-requirement `pwk-code-review`.

### Notes

- **Continuity** — a new session resumes by invoking the phase skill; it globs `docs/plans/` and reports what it found. The `<topic>` slug in filenames is the identity; no registry file.
- **No backward compatibility** for the old Features table — existing design docs remain readable prose; their status columns are no longer parsed.

## [0.18.0] - 2026-06-09

### Added

- **Feature-based planning** — design docs now include a `## Features` table that tracks each feature's status (`⬜ pending` → `🔄 planned` → `✅ done`). Skills plan and execute one feature at a time, looping back for the next.
- **`pwk-` skill namespace** — all 7 skills renamed with `pwk-` prefix for namespace clarity (e.g., `/skill:brainstorming` → `/skill:pwk-brainstorming`). Old skill names in `docs/plans/completed/` are preserved as historical records.
- **Design review repositioned** — `/skill:pwk-design-review` now runs after `/skill:pwk-writing-plans` (not after brainstorming). Per-feature scope: review findings append to the plan doc, not the design doc. Concrete code in plans makes hazard checks more meaningful.
- **Verify phase in workflow-guard** — `pwk-verify` now enforces read-only (same as brainstorm/plan). `Phase` type extended to include `"verify"`.
- **TypeScript project config** — added `tsconfig.json` and `@types/node` for IDE type resolution in the extension.

### Changed

- **Plan doc naming** — per-feature plans use `YYYY-MM-DD-<topic>-<feature-name>-implementation.md` with `Design:` and `Feature:` metadata header. Backward compatible: plans without a Features table use the original naming.
- **Design review reads both docs** — reads the plan doc for concrete code context alongside the design doc for architectural context.
- **Hazard check ordering** — writing-plans now identifies the feature before evaluating the hazard checklist, so "This feature involves..." is accurate.
- **Executing-tasks feature loop** — marks features `✅ done` in the design doc's Features table when all tasks complete, then suggests planning the next feature or verifying.
- **Finalizing guards** — warns before archiving if the design doc has unstarted features. Archives verification reports alongside plan docs.

## [0.17.0] - 2026-06-03

### Added

- **Verify skill** — new `/skill:verify` for post-implementation code verification. Runs three sequential expert review passes (security, optimization, traceability) over implemented code. Catches issues that pass tests but break in production — based on the 'last prompt' pattern. Outputs a structured report with categorized findings and actionable remediation task list.
- **Verify in workflow pipeline** — `verify` now sits between `execute` and `finalize` in the workflow: `brainstorm → design-review → plan → execute → verify → finalize`. Optional — trivial changes can skip it.

## [0.16.0] - 2026-05-25

### Added

- **Design review skill** — new `/skill:design-review` for auditing design docs against 6 architectural pillars, 8 high-risk production hazards, and 3 Socratic risk heuristics. Runs between brainstorming and planning for non-trivial designs. Trivial changes skip it automatically.
- **Acceptance criteria in planning** — every task in the implementation plan now requires `Given/When/Then` behavioral acceptance criteria (happy path + edge cases) under a QA Engineer Hat.
- **Plan acceptance audit** — writing-plans now runs a 5-point audit (vertical slices, sizing, QA coverage, checkpoint alignment, risk enforcement) before presenting the plan.
- **Design-review safety net** — writing-plans checks whether the design doc has an Architectural Review section and prompts the user to run design-review if missing for non-trivial designs.

### Changed

- **Brainstorming focused** — brainstorming now ends with a trivial/non-trivial gate and hands off to design-review for non-trivial changes, instead of inline security review.
- **Cognitive persona shifts in execution** — executing-tasks now applies three frames: QA Test (translate acceptance criteria, verify sandbox), Pragmatic Developer (simplest green), Senior Refactoring (craftsmanship). Refactoring step merged into the frame rather than a separate step.
- **Lessons curation upgraded** — finalizing now uses an Agile Scrum Master Hat to de-duplicate, categorize (under structured headers like `## Tool Usage`, `## Testing Patterns`), and retire stale rules. New rules append to `## Rules` during execution; categorization happens during finalizing.
- **Trigger list alignment** — brainstorming and writing-plans now check for the same 6 production-risk categories (database schema, auth, external APIs, concurrency, file uploads, Redis/caching).
- **Language-agnostic QA guidance** — executing-tasks QA frame now uses `NODE_ENV=test` as an example alongside other language equivalents.
- **Deduplicated test coverage** — writing-plans task format no longer has overlapping test coverage bullets (Acceptance Criteria covers happy path + edge cases).

### Fixed

- **Biome lint and format errors** — fixed unused imports and string concatenation lint in workflow-guard, tabs→spaces formatting.

## [0.15.0] - 2026-05-20

### Changed

- **Generic lessons enforcement** — `executing-tasks` now requires a generalization test before writing to `docs/lessons.md`: rules must apply to any domain or feature in the repo, not just the current one. Includes a bad/good example in the skill text. `finalizing` now audits `docs/lessons.md` for domain-specific rules and rewrites or removes them. Both skills' `docs/lessons.md` format template comments updated to reinforce the constraint.

## [0.14.0] - 2026-05-09

### Changed

- **Writing-plans concrete code guidance** — added "Level of detail" section requiring plans to include copy-pasteable code (SQL schemas, type definitions, function bodies, test assertions) instead of vague summaries like "implement bookmark model".
- **Writing-plans checkpoint gates** — rewrote checkpoint handling with explicit rules: checkpoints must fire BEFORE any `git add`/`git commit`, code stays uncommitted until human approval, and `checkpoint: done` now uses `git diff` (not `git diff --cached`) since nothing should be staged.
- **Executing-tasks simplified** — replaced the complex multi-step executor with a straightforward plan-following runner with status-driven flow. Removed redundant verification and review steps in favor of a cleaner loop.
- **Skill trigger clarifications** — updated brainstorming and diagnose skill descriptions for more accurate auto-triggering.

## [0.13.0] - 2026-05-08

### Added

- Lessons learned: persistent rules file (`docs/lessons.md`) read at every workflow phase and written to when the agent catches repeat mistakes. Survives `/new` sessions.

## [0.13.2] - 2026-05-08

### Changed

- **Migrated to @earendil-works** — peer dependencies updated from `@mariozechner/*` to `@earendil-works/pi-coding-agent`. Dropped unused `@mariozechner/pi-ai` and `@mariozechner/pi-tui` peer deps. Added `@earendil-works/pi-coding-agent` as devDependency for IDE type resolution.
- **Executing-tasks worktree handoff** — when the user chooses worktree isolation, the agent now moves plan docs into the worktree, commits the removal on the current branch, and stops with a handoff message instead of continuing execution in the wrong directory.

## [0.11.0] - 2026-05-04

### Changed

- **Brainstorming convergence** — agent now self-assesses after each question and presents a summary when it can articulate what, why, and constraints. Human decides when to move on (no fixed question limit).
- **Brainstorming codebase exploration** — step now includes grepping for related functionality, checking dependencies and module structure, with explicit guidance to read only what's necessary.
- **Brainstorming design presentation** — sections are now "one screen of reading" instead of 200-300 words. Agent must present each section for human approval before continuing, and incorporate feedback before re-presenting.
- **Brainstorming doc commit** — branch creation, committing, and workspace setup now fully delegated to executing-tasks.
- **Writing-plans task sizing** — "2-5 minutes of work" replaced with "one committed, testable change" since agents can't measure wall-clock time.
- **Writing-plans read-only header** — replaced misleading "read-only exploration" with explicit "you may only create or edit files under docs/plans/."
- **Writing-plans scope flagging** — large designs (~15+ tasks) now flagged to human with option to reduce scope or proceed (no longer assumes reduction).
- **Writing-plans ordering** — vertical slice ordering now explicitly prohibits separate infrastructure tasks; shared infrastructure must be included in the first slice that needs it.
- **Executing-tasks plan reading** — "read only the relevant task" replaced with selective reading: overview section + all task headings + current task body.
- **Executing-tasks workspace isolation** — reordered to happen before progress file creation so the branch field is accurate.
- **Executing-tasks checkpoint review** — split into two distinct templates: checkpoint: test shows test code with expected behavior; checkpoint: done shows implementation diff. Both show next task for context.
- **Finalizing archive** — `mv` commands now gracefully handle missing files with `2>/dev/null || true`.

### Added

- **Writing-plans plan review** — new step 3: present complete plan to human and wait for approval before suggesting execution.
- **Writing-plans incomplete design handling** — agent now fills gaps in incomplete design docs by asking the human.
- **Writing-plans test scope** — tasks now require tests covering happy path and at least one edge case or error path.
- **Writing-plans cross-task dependencies** — tasks can reference types from earlier tasks (e.g., `import { User } from Task 2`) instead of requiring complete code.
- **Executing-tasks plan-not-found** — explicit error message when no implementation plan exists, directing user to writing-plans.
- **Executing-tasks task verification** — new step 8: re-read task from plan and verify implementation satisfies every requirement before proceeding.
- **Executing-tasks next-task preview** — checkpoint reviews now show the next task so humans can evaluate whether current approach scales.

## [0.10.0] - 2026-05-02

### Added

- **Diagnose skill** — standalone 6-phase debugging loop (build feedback loop → reproduce → minimize → hypothesise → instrument → fix → cleanup). Invoked on demand with `/skill:diagnose`.
- **Design-it-twice in brainstorming** — approaches now include concrete interface sketches (types, method signatures, caller code) for grounded comparison.
- **ADRs in brainstorming** — lightweight architecture decision records written to `docs/plans/adr/` for hard-to-reverse, surprising, trade-off decisions. Archived during finalizing.
- **Vertical slices in planning** — guidance for end-to-end task structure with horizontal slicing called out as an anti-pattern.
- **Refactoring checklist in executing-tasks** — post-test-pass checks for shallow modules, deletion test, duplication, and seam discipline using depth/seam/locality vocabulary.
- **ADR archival in finalizing** — finalizing now archives `docs/plans/adr/` to `docs/plans/completed/adr/` alongside design docs.

## [0.9.0] - 2026-04-30

### Added

- **Safe commands expansion** — allowlisted `cd`, GitHub CLI read-only subcommands (`gh pr view/list/diff/checks/status`, `gh issue view/list`, `gh repo view/fork/list`, `gh release view/list/download`, `gh run view/list`), and git read-only subcommands (`blame`, `shortlog`, `stash list`, `tag -l/--list`, `describe`).
- **Harmless redirect stripping** — `2>/dev/null` and `2>&1` are stripped before pattern matching, fixing false blocks on common stderr suppression.
- **Extracted `shouldBlockFilePath()`** — file-path blocking logic extracted into a testable pure function.
- **4 `shouldBlockFilePath` tests** — validates that only `docs/plans/` subtree is writable during brainstorm/plan, blocks directory itself and absolute paths.

### Fixed

- **`git stash list` and `git tag -l` falsely blocked** — destructive pattern now uses negative lookaheads to allow read-only variants while still blocking mutations.

## [0.8.3] - 2026-04-22

### Added

- **Go read-only commands** — `go doc`, `go list`, `go version`, and `go env` are now allowlisted during brainstorm and plan phases.

## [0.7.0] - 2026-04-11

### Added

- **Checkpoint review gates** — optional `checkpoint: test` and `checkpoint: done` labels on tasks in the implementation plan. The agent pauses at checkpoints for human review before proceeding. The agent assigns checkpoints based on complexity; the user can adjust when reviewing the plan.
- **Workspace setup in brainstorming** — brainstorming now creates the feature branch (or worktree) before committing the design doc, keeping `main` clean.
- **Merge strategy options in finalizing** — finalizing skill offers merge strategy choices (merge commit, squash, rebase) when completing a PR.

## [0.6.0] - 2026-04-10

### Changed

- **Complete rewrite**: replaced 25 extension files (~4,400 lines), 8 skills (~1,530 lines), 4 agent definitions, 3 custom tools, 2 custom commands, and complex session-based state persistence with 1 extension file (67 lines) and 4 skills (146 lines).

### Removed

- **Workflow monitor extension** (workflow-monitor.ts + 15-module workflow-monitor/ directory) — phase tracking, TDD warnings, debug enforcement, verification gating, branch safety, skip-confirmation gates, boundary prompts, and all session-based state persistence.
- **Plan tracker extension** (plan-tracker.ts) — per-task progress tool with TUI widget.
- **Subagent extension** (subagent/ directory, 7 files) — child process spawning for isolated implementation/review.
- **4 agent definitions** (implementer, worker, code-reviewer, spec-reviewer).
- **3 custom tools** (`plan_tracker`, `workflow_reference`, `subagent`).
- **2 custom commands** (`/workflow-next`, `/workflow-reset`).
- **4 supporting skills**: `test-driven-development`, `systematic-debugging`, `using-git-worktrees`, `receiving-code-review`, `dispatching-parallel-agents`.
- All 434 existing tests.

### Added

- **workflow-guard extension** (67 lines) — hard-blocks `write`/`edit` outside `docs/plans/` during brainstorm and plan phases. No state persistence. No custom tools.
- **4 simplified skills**:
  - `brainstorming` — explore, design, write design doc
  - `writing-plans` — break design into tasks with TDD scenarios, set up branch/worktree
  - `executing-tasks` — implement tasks with TDD discipline, handle code review
  - `finalizing` — archive docs, update changelog, create PR
- TDD three-scenario guidance merged into `writing-plans` and `executing-tasks` skills.
- Code review handling guidance merged into `executing-tasks` skill.
- Git worktree setup guidance merged into `writing-plans` skill.
- 6 unit tests for the workflow-guard extension.

### Design decisions

- Skills teach the agent *what* to do. The extension enforces *one* rule: no source writes during thinking phases.
- You control phases explicitly via `/skill:` commands. No auto-detection, no auto-advancing.
- `bash` stays available during brainstorm/plan for investigation commands. The theoretical bash-write loophole is accepted.
- No state persistence — phase resets on reload, you invoke the skill again.

## [0.8.1] - 2026-04-20

### Changed

- **Bash guard supports compound commands** — `&&`, `||`, `;` chains are now split and each sub-command is individually checked against the safe/destructive lists. Pipes (`|`) remain unsplit to allow `git log | head`-style usage.

### Fixed

- **Workflow guard write-blocking bug** — the tool_call handler returned `{ blocked: true }` instead of `{ block: true }`, so writes were never actually blocked during brainstorm/plan phases.
- **Skill matching was unanchored** — `/skill:finalizing` incorrectly matched `/skill:finalizing-extra` patterns; now requires `\b` word boundary.

## [0.8.0] - 2026-04-18

### Added

- **Bash guard during brainstorm/plan** — `bash` tool calls are restricted to a read-only allowlist (grep, find, cat, git status/log/diff, etc.). Destructive commands (rm, mv, install, git mutations, sudo, editors) are hard-blocked.


[0.16.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.13.2...v0.14.0
[0.13.2]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.13.1...v0.13.2
[1.1.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v1.0.0...v1.1.0
[1.2.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v1.1.0...v1.2.0
[1.3.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v1.2.0...v1.3.0
[Unreleased]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v1.3.0...HEAD
[0.18.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.16.0...v0.17.0
[0.11.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.9.0...v0.10.0
[0.7.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.7.0
[0.6.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.6.0
[0.5.1]: https://github.com/yinloo-ola/pi-workflow-kit/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yinloo-ola/pi-workflow-kit/releases/tag/v0.5.0
