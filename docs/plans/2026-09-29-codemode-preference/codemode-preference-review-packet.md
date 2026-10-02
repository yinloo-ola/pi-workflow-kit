# Review packet: 2026-09-29-codemode-preference — feature review

Base: 7aa441f45ff7d5c272fda7fe18ed771da58083cd

Head: e9405f0c97424a888251448510dde8f691b3525e

## Commits

e9405f0 fix: sweep-site lead-ins note root-relative path adaptation (smoke-test finding)
9851e36 docs: digest and ship-pause for codemode-preference
c36b8c1 fix: review fixes — shell-quote canonical script path, fail-closed registry container shapes, pin both hint emission branches
cc1aadf feat: guard session-start codemode detection and one-line tail reminder (R5)
321d177 feat: developer-guide known-instances table and README enablement note (R4)
303ffe2 feat: pinned canonical codeme sweep script at the four sweep sites (R3)
3d2acb9 feat: prescription sweep classifies commands inside javascript fences (R2)
5c8c4b2 feat: clause names codemode as the framed executor instance (R1)

## Changed files

 CHANGELOG.md                                       |   4 +
 README.md                                          |   4 +
 docs/developer-usage-guide.md                      |  17 ++
 .../codemode-preference-progress.md                |  43 +++--
 extensions/workflow-guard.ts                       |  69 ++++++-
 skills/pwk-brainstorming/SKILL.md                  |  15 +-
 skills/pwk-code-review/SKILL.md                    |   2 +-
 skills/pwk-executing-tasks/SKILL.md                |  15 +-
 skills/pwk-finalizing/SKILL.md                     |  15 +-
 skills/pwk-status/SKILL.md                         |  16 +-
 skills/pwk-walkthrough/SKILL.md                    |   2 +-
 tests/codemode-preference.e2e.test.ts              | 201 +++++++++++++++++++++
 tests/markers.mjs                                  |  17 +-
 tests/prescription-sweep.mjs                       |  39 +++-
 tests/prescription-sweep.test.ts                   |  46 +++++
 tests/skill-lint.mjs                               |  20 ++
 tests/workflow-guard.test.ts                       |  40 +++-
 17 files changed, 535 insertions(+), 30 deletions(-)

## Acceptance criteria (verbatim from the design doc)

### R1: Clause names codemode as the framed executor instance

The canonical tool-freedom clause — `TOOL_FREEDOM_MARKERS.clause` in `tests/markers.mjs`, byte-identical at line 10 of all six `skills/pwk-*/SKILL.md` — names pi's codemode as a concrete instance of the sandboxed-batch-executor archetype, inside the existing example framing.

Target canonical text (archetype terms retained, one instance, `e.g.` framing inside the sentence so the prescription sweep stays green):

> Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

**Acceptance criteria**
- Given the updated `tests/markers.mjs` and the six `SKILL.md` files, When any skill is read, Then every clause instance carries the identical updated canonical text — archetype terms ("a sandboxed batch executor", "a structured file API") retained, `codemode` appearing exactly once as an `e.g.`-framed instance.
- Given the updated clause, When `npm run skill-lint` runs, Then the clause byte-identity check passes over the new canonical string with no file left on the old text.
- Given the prescription sweep, When it scans the clause's new inline span `codemode`, Then the paragraph classifies green (framed or sanctioned) and no new sweep pin is required; if a pin proves necessary during execution it is a deliberate reviewed allowlist entry with a comment, never a silent exemption.
- Given the three skills covered by the portable-delegation contract tests, When `npm test` runs, Then they pass unchanged — the `codemode` mention matches no forbidden provider-invocation pattern (`"tasks":`, `Agent(`, `SubagentWorkflow(`).
- Edge — Given any single skill drifts from the new canonical string, When `npm run skill-lint` runs, Then it fails naming the file (existing Check 14 behavior preserved under the new text).

### Checkpoints: none
### Review: skip

### R2: Prescription sweep classifies commands inside javascript fences

`tests/prescription-sweep.mjs` extracts embedded command strings from ` ```javascript ` / ` ```js ` fenced blocks — string and template literals keyed `command:` (as in `tools.bash({ command: '…' })`) and first-positional strings in `tools.*(…)` calls — and classifies each through the existing sanctioned/framed machinery, with the fence's introducing paragraph as the framing sentence. Extraction is conservative: only those two shapes.

**Acceptance criteria**
- Given a skill contract file with a ` ```javascript ` fence containing `tools.bash({ command: 'rm -rf foo' })` outside any framing sentence, When `npm run skill-lint` runs, Then it fails naming the file and the command.
- Given the same fence shape with a sanctioned command (`git status`, `python3 … scripts/…`, the pinned `grep -m1 '^Feature phase:' …`), Then the sweep passes it.
- Given the unsanctioned command sits in a fence whose introducing paragraph carries a framing marker ("one example", "e.g.", "equivalent", "whatever", "your harness"), Then the sweep passes it.
- Given commands written as template literals (`command: \`git log --oneline -5\``) or positional strings (`tools.bash('npm run check')`), Then extraction handles them identically to quoted key-value strings.
- Edge — Given a ` ```javascript ` fence containing no tool-call command strings, When scanned, Then the sweep reports nothing for it (no false positives on prose JavaScript).
- Given the pre-existing ` ```bash ` fence and inline-span behaviors, When the full suite runs, Then they are unchanged (regression-green).
- Given a copy of the kit with a bare prescription injected inside a `javascript` fence in one skill, When the harness-neutral E2E runs, Then skill-lint exits nonzero naming the skill file and the command.

### Checkpoints: none
### Review: skip

### R3: Pinned canonical codeme sweep script at the four sweep sites with bounded slimming

The four discovery-sweep sites — `pwk-status`, `pwk-brainstorming` (step 2 discovery), `pwk-executing-tasks` (resume/discovery), `pwk-finalizing` (discovery pre-checks) — each present: the invariant sentence (recursive listing reaching nested topic folders, skipping `completed/`, host-alias note — "let the search tool recurse"; some hosts alias `find` and reject compound predicates), the canonical codeme script in a ` ```javascript ` fence as *the* example, and a one-line bash fallback. The multi-line procedural extraction prose the script makes redundant (the head/grep dance around header-only reads) is deleted at these sites; the one-line rationale survives. Site deltas stay as example-framed additions beside the canonical core: pwk-status's requirements-table count, pwk-executing-tasks's design/progress pairing. `references/` files keep their existing pinned recipes untouched.

Canonical script (behavior fixed here; exact bytes finalized against `markers.mjs` during execution, then byte-pinned as `CODEMODE_SWEEP_SCRIPT`):

```javascript
const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
const files = designs ? designs.split('\n') : [];
const heads = await Promise.all(files.map(f =>
  tools.bash({ command: "grep -m1 '^Feature phase:' " + f, timeout: 15 }).then(r => r.output.trim() || 'design')));
return text(files.map((f, i) => `${f} — ${heads[i]}`).join('\n') || 'no in-flight topics');
```

**Acceptance criteria**
- Given each of the four sites, When the skill is read, Then the sweep step shows the invariant sentence, the canonical script in a `javascript` fence, and a one-line bash fallback example — and no longer carries the procedural extraction-dance lines the script replaces.
- Given `tests/markers.mjs`, When read, Then `CODEMODE_SWEEP_SCRIPT` holds the canonical script bytes beside `TOOL_FREEDOM_MARKERS`.
- Given the four sites and markers, When `npm run skill-lint` runs, Then a check asserts each site's fenced script matches `CODEMODE_SWEEP_SCRIPT` byte-exactly.
- Given the canonical script, When the R2-hardened sweep scans it, Then every embedded command is either the existing pinned recipe verbatim (`grep -m1 '^Feature phase:' `) or example-framed by the introducing paragraph — no unsanctioned bare command passes and no new pin is needed.
- Given the script's embedded commands, When compared to the pre-topic pinned recipes, Then the `grep -m1 '^Feature phase:'` command string is byte-identical to the existing pin (verbatim-batching rule).
- Edge — Given a host where `find` rejects compound predicates, When the script's listing fails, Then the skill text's invariant sentence already directs the agent to the host's recursing search tool and the one-line bash fallback; no weakening of pinned strings.
- Edge — Given a repo with two in-flight topics (one with a progress file carrying `Feature phase: execute`, one design-only), When the canonical script runs on a host with a batch executor, Then one call returns one line per design file with its phase, design-only topics reporting `design`, and no topic-body content.

### Checkpoints: none
### Review: skip

### R4: Developer-guide known-instances table and README enablement note

`docs/developer-usage-guide.md` gains a "sandboxed batch executors — known instances" section: a dated table plus the translate-the-shape note and the verbatim-batching rule. `README.md` gains one paragraph with an enablement pointer. No instance table in README.

**Acceptance criteria**
- Given the developer guide, When the section is read, Then the table lists every verified instance with tool name and dated status: pi `codemode` (shipped, opt-in via settings — 2026-09-29), opencode v2 `execute` "Code Mode" (shipped, permission `execute` — 2026-09-29), Claude Platform API Programmatic Tool Calling (GA, `code_execution_20260120`+ — 2026-09-29), Claude Code CLI REPL mode (experimental env-flag, source-verified, undocumented — 2026-09-29), zcode (absent, CLI closed-source — 2026-09-29), commandcode (absent, tool-reference verified — 2026-09-29).
- Given a reader on any listed harness, When they consult their row, Then a present instance names the concrete tool to prefer and an absent instance states the bash recipes are the path.
- Given the same section, When read, Then it carries the translate-the-shape note — canonical scripts call tools by name, so they read correctly whether the host declares tools directly (pi default) or hides them behind the executor (Claude REPL mode, pi `codemode.mode: only`) — and the verbatim-batching rule for pinned commands.
- Given `README.md`, When read, Then it carries exactly one paragraph on the codemode preference with an enablement pointer to pi's "Enable codemode" documentation, and no instances table.
- Edge — Given a harness ships or renames its executor later, When the table is consulted, Then each row's date makes the staleness self-declaring rather than silently wrong.

### Checkpoints: none
### Review: skip

### R5: Guard session-start codemode detection and one-line tail reminder

`extensions/workflow-guard.ts` detects codemode in the session's registered/active tool set once at `session_start` (exported pure helper `detectCodeme(tools)`; exact registry call — `pi.getAllTools()` / `pi.getActiveTools()` — verified against the pi 1.0.0 extension API during execution) and appends exactly one visibility line to the first `before_agent_start` tail message when the tool is active and the guard override is not `off`. The line appears once per session, never per phase; presence is decided by the session-start snapshot of both conditions. Phase enforcement, file-write blocking, destructive-bash blacklist, and `/pwk-guard` semantics are untouched.

**Acceptance criteria**
- Given the guard wired with codemode present in the tool set and override `auto` (or `on`), When `session_start` then the first `before_agent_start` fire, Then the tail message contains exactly one line naming codemode active and pointing at batched read-only exploration — and no later phase reminder repeats it.
- Given the same wiring without codemode in the tool set, When the session starts, Then no such line appears anywhere.
- Given codemode present but override pinned `off`, When the session starts, Then no such line appears; Given override toggled to `on` mid-session, Then the line is not retroactively added (session-start snapshot).
- Given the pure helper, When unit-tested, Then `detectCodeme` returns true for a registry containing a tool named `codemode` and false for one without it, and tolerates differing exposure/namespace shapes without throwing.
- Given the existing guard test suite, When `npm test` runs, Then all prior behaviors are regression-green — design-phase write blocking, destructive-bash guarding, `/pwk-guard on|off|auto`, reminder cache-safety (tail message via `before_agent_start`, never a system-prompt mutation).
- Edge — Given a registry entry for codemode that is present but inactive/deferred, When detection runs, Then the helper's behavior follows the verified pi 1.0.0 API semantics for active tools and the unit test pins that choice.

### Checkpoints: none
### Review: skip

### Production-risk notes
- The change touches the shipped enforcement engine's reminder path in every user session: the line must remain cache-safe (tail message through `before_agent_start`, never a system-prompt mutation), at most one line, once per session, suppressed under guard-`off`.
- Detection must not disturb phase detection, write blocking, or override semantics; a registry-shape surprise must fail closed (no line) rather than throw.

### Production-risk areas

- R5 only — reminder-path regression risk in `extensions/workflow-guard.ts` as described in its notes. No schema, auth, external API, dependency, or data-flow changes anywhere in this topic; `package.json` peer dependencies stay `"*"`.

## Approaches considered

- **A — name-only** (clause edit + sweep hardening + docs): honest minimum, but leaves the preference as a name with no demonstrated shape at the exact sites that need it. Lost to B+ on adoption: agents imitate demonstrated shapes far more reliably than they follow preference prose.
- **B+ — name + canonical sweep examples + byte-pins + sweep hardening + enablement guidance**: chosen core. The bounded-slimming variant was taken over fences-beside-full-prose because the same lines would otherwise be edited twice, and the extraction-discipline prose exists only to manage round-trip cost the script eliminates.
- **C — B+ plus guard nudge**: chosen (user decision). The one-line session-start signal is the only runtime surface that knows the tool is actually enabled; kept to a single line, once, guard-off-suppressed.
- **Mechanical enforcement** (block bash when codemode is active): rejected — preference is not a safety gate; codemode is sometimes the wrong tool (single pinned commands, plain git, python helpers); the guard enforces writes and phase gates, not tool style.
- **Clause as vendor list** (name every harness's instance): rejected — a 7-file byte-pinned edit per new harness; the dev-guide table carries instances at one-row cost.
- **Rewriting the Python helpers as inline codeme scripts** (dropping the python3 prerequisite): rejected — the helpers are byte-pinned source-of-truth on disk; a pasted long JS validator is strictly more drift-prone, and codemode's sandbox cannot load scripts from the filesystem.
- **Per-harness script variants**: rejected — translate the shape, not the syntax; one canonical (pi-codemode-shaped) script plus the instances table.
- **Moving kit state into codemode `store`/`load`**: rejected — session-scoped and invisible to humans; the kit's premise is durable, human-readable file artifacts.
- **Pinning peerDeps `^1.0.0`**: rejected — the preference must degrade gracefully on older pi and other harnesses.
- **Granting codemode in role-contract `tools:` frontmatter**: rejected — provider-neutral minimum grant; reviewers' marginal gain.

## Architecture

Layered, generic-first: (1) the 2.8.0 invariant layer is unchanged — better-tool-wins, archetype terms; (2) the naming layer (R1) adds one framed instance to the canonical clause; (3) the integrity layer (R2) extends the prescription sweep to `javascript` fences before any script content lands; (4) the demonstration layer (R3) embeds one byte-pinned canonical script at the four sweep sites with bounded slimming; (5) the knowledge layer (R4) carries the dated cross-harness instances table and enablement guidance; (6) the runtime layer (R5) adds the guard's single session-start visibility line. Deterministic pins (kit `scripts/` helpers, plain git, pinned disposal commands, the `grep -m1` header extraction) keep their exact bash invocations; pinned command *strings* may be batched verbatim inside a script with trivial-join aggregation.

## Components

- `tests/markers.mjs` — updated `TOOL_FREEDOM_MARKERS.clause`; new `CODEMODE_SWEEP_SCRIPT` canonical string.
- `skills/pwk-{status,brainstorming,executing-tasks,finalizing}/SKILL.md` — clause swap (all six skills atomically, including code-review and walkthrough which otherwise don't change); sweep-site slimming and script embedding at the four sites.
- `skills/pwk-{code-review,walkthrough}/SKILL.md` — clause swap only.
- `tests/prescription-sweep.mjs` — js-fence parsing and command-string extraction; conservative shapes only.
- `tests/skill-lint.mjs` — canonical-script presence/identity check at the four sites (clause check auto-follows markers).
- `tests/prescription-sweep.test.ts`, `tests/harness-neutral-tools.e2e.test.ts` — js-fence fixtures and the injection E2E scenario.
- `extensions/workflow-guard.ts` — `detectCodeme` pure helper + `session_start` flag + one-line `before_agent_start` addition; guard unit tests for the gating matrix.
- `docs/developer-usage-guide.md`, `README.md`, `CHANGELOG.md` — instances table, paragraph + pointer, Keep-a-Changelog entry.

## Data flow

An agent enters a sweep site → reads the invariant sentence and the pinned script → issues one executor call: listing → N parallel pinned `grep -m1` header extractions → join → filtered text returns (only summary lines reach the model; ~2N+1 round-trips collapse to 1). Pinned commands stay byte-exact inside the script. Separately, at session start the guard computes codemode presence once and rides one informational line on the existing tail-message path; it never touches enforcement state.

## Error handling

Host without a batch executor → the clause's fallback rules apply unchanged; skills read as they do today; the guard line simply does not fire. Executor call fails mid-script → the failure surfaces like any tool error, and the one-line bash fallback remains the documented path; the `find` host-alias quirk is pre-covered by the invariant sentence. Registry-shape surprises at detection → fail closed (no line), never throw, never alter enforcement. Sweep misclassification risk → conservative extraction (two shapes only), unit fixtures for sanctioned/framed/bare, and the E2E injection scenario.


## Feature acceptance (verbatim)

## Feature acceptance

- Given a copy of the kit with a bare prescription injected inside a `javascript` fence in one skill, When the harness-neutral E2E runs skill-lint, Then it exits nonzero naming the skill file and the command.
- Given the guard wired in a simulated session with codemode active and override `auto`, When `session_start` then the first `before_agent_start` fire, Then exactly one codemode-active line rides the tail message; given the same wiring without codemode in the tool set, Then no such line appears.
- Given the six skills, markers, sweep, and guard with all changes applied, When `npm run check` runs, Then clause byte-checks, canonical-script checks, prescription sweep, contract tests, and the E2E suite all pass.
- Given the shipped documentation, When a reader on opencode or Claude Code consults the known-instances table, Then every row states a dated status and, where an executor exists, the concrete tool name the archetype maps to.


## Production-risk notes (verbatim, if any)

### Production-risk notes
- The change touches the shipped enforcement engine's reminder path in every user session: the line must remain cache-safe (tail message through `before_agent_start`, never a system-prompt mutation), at most one line, once per session, suppressed under guard-`off`.
- Detection must not disturb phase detection, write blocking, or override semantics; a registry-shape surprise must fail closed (no line) rather than throw.

### Production-risk areas

- R5 only — reminder-path regression risk in `extensions/workflow-guard.ts` as described in its notes. No schema, auth, external API, dependency, or data-flow changes anywhere in this topic; `package.json` peer dependencies stay `"*"`.


## Diff

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 1e099a6..43cfde6 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -6,6 +6,10 @@ The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
 
 ## [Unreleased]
 
+### Added
+
+- **The kit prefers sandboxed batch executors where the host grants them.** The canonical tool-freedom clause in all six skills names pi's `codemode` (pi ≥ 1.0.0) as the framed instance of the "sandboxed batch executor" archetype, and the four discovery-sweep sites (status, brainstorming, executing, finalizing) demonstrate the batched shape with a byte-pinned canonical script — one executor call lists in-flight designs and extracts every topic's phase header-only, with the pinned `grep -m1` recipe embedded verbatim. The prescription sweep now reads `javascript`/`js` fences (keyed `command:` literals and first-positional `tools.*()` strings classified like inline bash), so prescriptions cannot hide inside codeme-shaped blocks; the developer guide carries a dated known-instances table (pi `codemode`, opencode v2 `execute`, Claude API Programmatic Tool Calling, Claude Code CLI REPL mode experimental, zcode/commandcode absent); and the guard announces codemode once per session when the tool is active and the guard is not pinned off.
+
 ## [2.8.0] - 2026-09-29
 
 ### Changed
diff --git a/README.md b/README.md
index 464e8ba..67b5496 100644
--- a/README.md
+++ b/README.md
@@ -80,6 +80,10 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. *
 | **Walkthrough** | `/skill:pwk-walkthrough` | On demand: generate a detailed, file:line-anchored walkthrough of a shipped feature into `docs/walkthroughs/<topic>.md` (Summary / How it works / Key flows / Gotchas & invariants / Change map); stamped with the commit range, regenerated wholesale, never disposed. **Exits the gated phase** |
 | **Status** | `/skill:pwk-status` | Read-only overview of all active design topics — phase + progress. Use when resuming or juggling several designs in parallel worktrees. Not a pipeline phase; **does not exit the gated phase**. |
 
+### ⚡ Batched tool calls (pi ≥ 1.0.0 `codemode`)
+
+Every skill treats its shell recipes as fallbacks: when the host grants a sandboxed batch executor, the kit prefers it — on pi ≥ 1.0.0 that is `codemode` (turn it on via pi's "Enable codemode" settings documentation; the guard announces it once per session when active, and the discovery sweeps demonstrate the one-call shape). The dated cross-harness instance table — opencode's `execute`, Claude's Programmatic Tool Calling, and the verified absences — lives in `docs/developer-usage-guide.md`. On hosts without such a tool, the bash recipes are the path and nothing changes.
+
 ## The Workflow in Detail
 
 ### Phase Control
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index b35b546..6aab212 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -110,6 +110,23 @@ The destructive blacklist covers common file-mutating vectors (redirects, `tee`,
 
 No configuration needed. It activates automatically after install.
 
+## Sandboxed batch executors — known instances
+
+Every skill treats its shell recipes as fallbacks: when the host grants a sandboxed batch executor (a tool that runs a script calling the agent's other tools, batching calls and filtering output before the model sees it), the skills prefer it. On pi ≥ 1.0.0 that executor is `codemode`, and the four discovery-sweep sites demonstrate the shape with a byte-pinned canonical script. Translate the shape, not the syntax: the scripts call tools by name, so they read correctly whether the host declares tools directly (pi's default) or hides them behind the executor (Claude Code's REPL mode hides its REPL-only tools; pi's `codemode.mode: only` does the same). Pinned command strings — the kit's `scripts/` helpers, plain `git`, the pinned `grep -m1 '^Feature phase:'` extraction — stay byte-exact even when batched inside one executor call; the pin protects the command string, not the vehicle.
+
+Verified instances and absences, each dated so staleness is self-declaring rather than silently wrong:
+
+| Host | Executor | Status (verified 2026-09-29) |
+|------|----------|------------------------------|
+| pi ≥ 1.0.0 | `codemode` | Shipped, opt-in via settings — see pi's "Enable codemode" documentation (verified 2026-09-29) |
+| opencode v2 | `execute` ("Code Mode") | Shipped, gated by the `execute` permission (verified 2026-09-29) |
+| Claude Platform API | Programmatic Tool Calling (`code_execution_20260120`+) | GA — code-execution container calling tools programmatically (verified 2026-09-29) |
+| Claude Code CLI | REPL mode (`REPLTool`) | Experimental env-flag, source-verified, undocumented as of 2026-09-29 |
+| zcode | — | Absent as of 2026-09-29 (CLI closed-source; docs silent) |
+| commandcode | — | Absent as of 2026-09-29 (tool reference verified) |
+
+A present instance names the concrete tool to prefer; an absent one means the bash recipes are the path — the skills read identically either way, and the dated rows tell a future reader when to re-verify.
+
 ## Test-first discipline
 
 Design docs specify *what* (acceptance criteria + end-to-end scenarios); the executor writes the feature-acceptance E2E first (red), then implements to green. This keeps the spec stable — implementation details can change without invalidating the design.
diff --git a/docs/plans/2026-09-29-codemode-preference/codemode-preference-progress.md b/docs/plans/2026-09-29-codemode-preference/codemode-preference-progress.md
index fae635a..2d3cf5f 100644
--- a/docs/plans/2026-09-29-codemode-preference/codemode-preference-progress.md
+++ b/docs/plans/2026-09-29-codemode-preference/codemode-preference-progress.md
@@ -8,33 +8,52 @@ Setup: n/a
 
 Started: 2026-10-02T04:34:44Z
 
-Last updated: 2026-10-02T04:34:44Z
+Last updated: 2026-10-02T06:10:00Z
 
-Feature phase: e2e-written
+Feature phase: ship-paused
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
-| 1 | ⬜ | Clause names codemode as the framed executor instance | — | — |
-| 2 | ⬜ | Prescription sweep classifies commands inside javascript fences | — | — |
-| 3 | ⬜ | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | — | — |
-| 4 | ⬜ | Developer-guide known-instances table and README enablement note | — | — |
-| 5 | ⬜ | Guard session-start codemode detection and one-line tail reminder | — | — |
+| 1 | ✅ | Clause names codemode as the framed executor instance | — | 5c8c4b2 |
+| 2 | ✅ | Prescription sweep classifies commands inside javascript fences | — | 3d2acb9 |
+| 3 | ✅ | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | — | 303ffe2 |
+| 4 | ✅ | Developer-guide known-instances table and README enablement note | — | 321d177 |
+| 5 | ✅ | Guard session-start codemode detection and one-line tail reminder | — | cc1aadf c36b8c1 |
 
 ## Execution summary
 | R# | Requirement | How it was built | Deviated? |
 |----|-------------|------------------|-----------|
-| 1 | Clause names codemode as the framed executor instance | | |
-| 2 | Prescription sweep classifies commands inside javascript fences | | |
-| 3 | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | | |
-| 4 | Developer-guide known-instances table and README enablement note | | |
-| 5 | Guard session-start codemode detection and one-line tail reminder | | |
+| 1 | Clause names codemode as the framed executor instance | One-line canonical-string swap in markers.mjs applied atomically to all six SKILL.md; the existing byte-identity check and sweep stayed green with no new pins (the `e.g.` framing covers the new inline span). | |
+| 2 | Prescription sweep classifies commands inside javascript fences | New exported `extractExecutorCommands` pulls keyed `command:` literals (quoted or template) and first-positional strings of `tools.*()` calls out of javascript/js fences; each segment then flows through the existing sanctioned/framed machinery with the fence's introducing line as context. Six unit fixtures plus the E2E injection scenario; extraction stays deliberately shape-conservative so plain string variables never count. | |
+| 3 | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | `CODEMODE_SWEEP_SCRIPT` pinned in markers.mjs (fence indentation included, so the byte-match holds against list-indented embeds) with a new skill-lint presence check; each site keeps the pinned discovery sentences and gains an e.g.-framed lead-in + fence, with the per-topic extraction prose collapsed into it. The design draft's illustrative script grepped the design file itself; the pinned script derives each topic's sibling progress file so phases actually surface (design anticipated finalizing exact bytes). Review fix: the derived path is now POSIX-shell-quoted inside the script (hazard finding, landed with the review-fix commit in R5’s cell). | |
+| 4 | Developer-guide known-instances table and README enablement note | New "Sandboxed batch executors — known instances" section: translate-the-shape note, verbatim-batching rule, six dated rows (pi codemode / opencode execute / Claude API PTC / Claude Code CLI REPL mode experimental / zcode + commandcode absent); README gains one paragraph with the Enable-codemode pointer, no table; CHANGELOG Unreleased entry drafted. All six rows dated after the E2E count check caught three undated rows. | |
+| 5 | Guard session-start codemode detection and one-line tail reminder | Exported `detectCodeme` pure helper (active set authoritative over full registry; absent/throwing registries fail closed), snapshot at session_start, and a once-per-session emission window in before_agent_start: the line rides the first tail message (appended to a phase reminder or emitted alone), suppressed while the guard is pinned off, never retro-added — the design's "session-start snapshot of both conditions" reads as detection snapshotted, suppression checked at the single emission window. Guard unit tests pin the helper shapes; the feature E2E pins the wiring matrix. | |
 
 ## Deviation records
 
 ## Code digest
 
 ### Summary
+The kit now prefers sandboxed batch executors wherever the host grants one: the canonical tool-freedom clause names pi `codemode` as the framed instance, the four discovery-sweep sites demonstrate the batched shape with one byte-pinned script, and the guard shows a single informational tail line when the executor is active. The prescription sweep reads `javascript` fences so prescriptions cannot hide inside codeme-shaped blocks, and the shipped docs carry a dated cross-harness instances table. Everything stays advisory — invariants remain archetype-generic, bash recipes remain the fallback, and no enforcement semantics changed.
 ### Flow
+- **Spine** — `TOOL_FREEDOM_MARKERS.clause` -> six SKILL.md clause paragraphs [R1] -> `CODEMODE_SWEEP_SCRIPT` -> four sweep-site fences [R3] -> `extractExecutorCommands` through `JS_FENCE_RE` -> `sweepText` sanctioned/framed cascade [R2] -> skill-lint Check 14 + Check 15 -> feature-E2E kit-copy scenarios
+- **Branches**
+  - `host grants the executor -> find once -> N parallel pinned grep -m1 -> joined summary lines only` [R3]
+  - `session_start -> detectCodeme -> before_agent_start single emission window -> hint rides the phase reminder or stands alone` [R5]
+  - `registry absent, throwing, or non-array -> false -> no line` — was: no runtime visibility existed [R5]
+  - `guard pinned off at the first fire -> window consumed silently -> /pwk-guard auto re-arms the phase reminder but never the hint` [R5]
+  - `prescription hidden in a javascript fence -> keyed/positional extraction -> violation names file and command` [R2]
+  - `host without an executor -> bash fallback recipes unchanged` [R1]
+- **Side effects** — reads: docs/plans listing + header-only phase lines, host tool registry at session start · writes: none — the runtime surface is one `display: false` tail message
 ### Gotchas
+- derived paths inside canonical scripts must be POSIX-shell-quoted — the kit's one demonstrated example now is (hazard finding, fixed)
+- a registry that exists decides alone — container-shape surprises fail closed with no fall-through to the broader registry (tracing finding, fixed)
+- `/reload` re-fires session_start and re-arms the hint — one line per session-start, desired after a context reload (tracing observation)
+- pipe tails after `|` are not separately classified by the sweep — the head command decides (documented limitation)
 ### Key files
+- `tests/markers.mjs` — the two canonical pins (clause text, sweep script)
+- `skills/pwk-status/SKILL.md` (+3 sibling sweep sites) — slimmed steps with the embedded script
+- `tests/prescription-sweep.mjs` — executor-fence extraction through the existing cascade
+- `extensions/workflow-guard.ts` — `detectCodeme` plus the one-line visibility window
+- `tests/codemode-preference.e2e.test.ts` — the primary enforced spec
diff --git a/extensions/workflow-guard.ts b/extensions/workflow-guard.ts
index 3370e54..d2100e2 100644
--- a/extensions/workflow-guard.ts
+++ b/extensions/workflow-guard.ts
@@ -487,6 +487,46 @@ const PHASE_REMINDERS: Record<Exclude<Phase, null>, string> = {
     "[pi-workflow-kit] DESIGN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
 };
 
+/** The one-line session visibility signal for a granted sandboxed batch executor.
+ *  Informational only — the skills carry the actual preference; this line makes the
+ *  host capability visible when work starts. */
+const CODEMODE_HINT_LINE =
+  "codemode: active — prefer it for batched read-only exploration (one executor call beats N tool round-trips); the kit's shell recipes are fallbacks.";
+
+/** A host that can report its tool registry (pi's ExtensionAPI can; minimal hosts and
+ *  test harnesses may not — detection fails closed there). */
+type ToolRegistryHost = {
+  getActiveTools?: () => unknown;
+  getAllTools?: () => unknown;
+};
+
+/** Does the host grant `codemode` (pi ≥ 1.0.0's sandboxed batch executor) to the model?
+ *  The active tool set is authoritative when the host exposes one (`getAllTools` also
+ *  reports registered-but-deferred tools); absent registries and unexpected entry
+ *  shapes fail closed to false — the visibility line must never throw. */
+export function detectCodeme(pi: ToolRegistryHost): boolean {
+  const grantsCodeme = (entries: unknown[]): boolean =>
+    entries.some((entry) =>
+      typeof entry === "string"
+        ? entry === "codemode"
+        : typeof entry === "object" && entry !== null && (entry as { name?: unknown }).name === "codemode",
+    );
+  for (const source of [pi.getActiveTools, pi.getAllTools]) {
+    if (typeof source !== "function") continue;
+    try {
+      const entries = source.call(pi);
+      // Each registry that exists decides on its own answer — a container-shape
+      // surprise fails closed to false rather than falling through to the broader
+      // registry, which also reports deferred (not granted) tools.
+      return Array.isArray(entries) ? grantsCodeme(entries) : false;
+    } catch {
+      // Registry surprises fail closed; visibility never breaks the session.
+      return false;
+    }
+  }
+  return false;
+}
+
 /** Determine if a write/edit to filePath should be blocked during the given phase.
  *  Only writes under docs/plans/ are allowed during the design phase.
  */
@@ -515,6 +555,13 @@ let pendingPhaseReminder = false;
  */
 let guardOverride: "on" | "off" | null = null;
 
+/** Codemode visibility (once per session): whether the host grants the executor,
+ *  decided once at session_start, and whether the one-line hint has had its single
+ *  emission window (the window never retries — a later /pwk-guard auto/on does not
+ *  retro-add a suppressed line). */
+let codemodeActive = false;
+let codemodeAnnounced = false;
+
 /** Is the guard actively enforcing read-only right now? */
 function enforceActive(): boolean {
   if (guardOverride === "off") return false;
@@ -542,6 +589,8 @@ export default function (pi: ExtensionAPI) {
     phase = null;
     pendingPhaseReminder = false;
     guardOverride = null;
+    codemodeActive = detectCodeme(pi);
+    codemodeAnnounced = false;
   });
 
   // --- Project role setup -------------------------------------------------
@@ -673,15 +722,29 @@ export default function (pi: ExtensionAPI) {
   // return { block, reason }, not a message. So at bash time the reminder surfaces only when a
   // destructive command is actually blocked (the reactive `reason` in the tool_call handler).
   pi.on("before_agent_start", async () => {
-    if (!phase || !pendingPhaseReminder) return {};
+    // Codemode visibility: the line rides the first tail message of the session —
+    // appended to a phase reminder when one fires, emitted on its own when none
+    // does — once ever, and suppressed when the guard is pinned off.
+    let codemodeLine: string | null = null;
+    if (codemodeActive && !codemodeAnnounced) {
+      codemodeAnnounced = true;
+      if (guardOverride !== "off") codemodeLine = CODEMODE_HINT_LINE;
+    }
+    if (!phase || !pendingPhaseReminder) {
+      if (codemodeLine) return { message: { customType: "pwk-codemode-hint", content: codemodeLine, display: false } };
+      return {};
+    }
     pendingPhaseReminder = false;
     // Override states announce themselves via the /pwk-guard handler; this reminder
     // is the auto-mode phase-entry cue only.
-    if (guardOverride !== null) return {};
+    if (guardOverride !== null) {
+      if (codemodeLine) return { message: { customType: "pwk-codemode-hint", content: codemodeLine, display: false } };
+      return {};
+    }
     return {
       message: {
         customType: "pwk-phase-reminder",
-        content: PHASE_REMINDERS[phase],
+        content: codemodeLine ? `${PHASE_REMINDERS[phase]}\n\n${codemodeLine}` : PHASE_REMINDERS[phase],
         display: false,
       },
     };
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index ce4531c..7fddf79 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -7,7 +7,7 @@ description: "Use this before any creative work — creating features, building
 
 Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. (An approved ADR goes to `docs/adr/`, which sits outside the writable boundary — the human writes it themselves or briefly runs `/pwk-guard off`; the design phase never unlocks it.) The design doc is the **single buildable artifact** — each requirement carries its own acceptance criteria and review tags, and the executor builds straight from it; nothing is re-derived into a second document later. Source-writing happens in `pwk-executing-tasks`.
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 ## Proportionality: trivial vs non-trivial
 
@@ -31,7 +31,18 @@ Before drafting, assess whether a large request has distinct testable outcomes t
 ## Process
 
 1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
-2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella. For each in-flight topic with a progress file, report its `Feature phase:` line (matched header-only — `grep -m1 '^Feature phase:' <file>` — no body ingest); design-only topics report `design`. If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` **beside the design doc** means the split is already decided — read it for the roster and design this part's `<leaf>-design.md` against it (read [references/umbrella.md](references/umbrella.md) before proceeding).
+2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella, each topic’s `Feature phase:` line header-only (`grep -m1 '^Feature phase:' <file>`; design-only topics report `design` — no body ingest). With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every phase extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):
+
+   ```javascript
+   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
+   const files = designs ? designs.split('\n') : [];
+   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
+   const heads = await Promise.all(files.map(d =>
+     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
+   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
+   ```
+
+   If the new idea continues an existing topic, ask whether to extend it or start fresh. Part of an umbrella? An existing `overview.md` **beside the design doc** means the split is already decided — read it for the roster and design this part's `<leaf>-design.md` against it (read [references/umbrella.md](references/umbrella.md) before proceeding).
 3. **Understand the idea** — read only enough code/docs/commits to ground the design. **Check `docs/lessons.md`** — known constraints may shape it. Ask questions in **frontier rounds**: build a question tree seeded by the dimension checklist, then ask in rounds. The **frontier** is every question whose prerequisites are already settled — ask the whole frontier in one round; a question whose answer depends on another still-open question waits for a later round. Number each question (`Q1`, `Q2`, …) and attach your recommended answer (`➡️ <recommendation>`) — the recommendation is your assumption surfaced up front; the human confirms, strikes, or corrects each in one reply. Recompute the frontier after each round of answers. Seed the tree by walking every checklist dimension — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — printing `— nothing to ask` for groups with no questions (never skip silently). **Facts vs. decisions**: anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now. Only decisions are asked. Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
 4. **(skipped on trivial changes)** **Codebase recon** — for non-trivial topics with prior art, request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role. Require a fresh-context, read-only, bounded worker and pass the topic, one-line intent, and repo root. Use the returned 5-section codebase map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as the grounding context for the next two steps instead of reading those files inline. The scout is observations only — no design recommendations. Skip this step on trivial changes (typo, version bump, single-function edit per the proportionality rule). If no compatible capability is available or the provider cannot enforce the requested constraints, report `Scout: unavailable` and do the same recon inline, preserving the five-section map and `file:line` citations; do not silently omit recon.
 5. **Explore approaches** — propose 2–3, leading with your recommendation. Sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code, not abstractions.
diff --git a/skills/pwk-code-review/SKILL.md b/skills/pwk-code-review/SKILL.md
index 06ecebd..89e9409 100644
--- a/skills/pwk-code-review/SKILL.md
+++ b/skills/pwk-code-review/SKILL.md
@@ -7,7 +7,7 @@ description: "Review a completed requirement's code — trace the logic, check s
 
 Review the code just implemented — one tagged requirement, or the whole feature at the feature-level review. **Unlocked** — you may edit code to apply smell fixes; flag everything else as a follow-up.
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 ## Process
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 8ea8d2c..3e46396 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -7,7 +7,7 @@ description: "Implement a design doc via the feature-gate flow: write the featur
 
 Implement the design doc found under `docs/plans/` via the **feature-gate flow**. The design doc is the single buildable artifact — its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*: structure, signatures, internals are yours.
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the design doc tags (default off); the feature gate covers everything else. A trivial design doc (no `## Feature acceptance`, per brainstorming's proportionality rule) skips the E2E steps and ships on the full suite; the one whole-feature review still runs at its ship checkpoint, its missing `### Feature review` tag defaulting to `auto`.
 
@@ -16,7 +16,18 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 Resolve local references and scripts from this installed skill directory. If a required resource is missing, report the blocker and stop before the affected action; do not silently skip its instructions.
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume and progress](#resume-and-progress)). An umbrella part whose prior leaves are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<leaf>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
+2. **Find the doc** — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; take each topic’s `Feature phase:` line header-only (`grep -m1 '^Feature phase:' <file>`). With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every phase extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):
+
+   ```javascript
+   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
+   const files = designs ? designs.split('\n') : [];
+   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
+   const heads = await Promise.all(files.map(d =>
+     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
+   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
+   ```
+
+   If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (E2E written, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume and progress](#resume-and-progress)). An umbrella part whose prior leaves are not all at `done`: surface their `Feature phase:` lines (matched header-only from each `<leaf>-progress.md`) as advisory context in the pre-flight report — no refusal, no reorder; build order stays advisory.
 3. **Workspace — choose this topic’s branch/worktree.** Before creating, switching, or adopting one, read [Workspace and resume details](references/resume.md#workspace). Reuse this topic’s branch (one umbrella = one branch); a different topic’s branch never hosts these commits. Uncommitted planning docs do not cross a worktree boundary: commit this topic folder on its branch before a new worktree handoff; when adopting an existing checkout with uncommitted docs here, copy the topic folder there, verify it, then remove the source copy. Read the reference's command order before acting. Offer/adopt only after checking existing worktrees; wait for the user's choice.
 
 ## First run
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 7ce9075..051bdf3 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -7,13 +7,24 @@ description: "Use after all requirements are complete to archive or delete consu
 
 Ship the completed work.
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 ## Pre-finalization checks
 
 1. **Verify the repo root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).
 2. **Run the FULL test suite** — every test must pass, and only a green suite ships. Resume spans sessions; re-run the suite yourself rather than trust the previous session's ending state. Anything failing → send the user back to `/skill:pwk-executing-tasks`.
-3. Read **every** relevant progress file — for a multi-leaf topic that's each leaf's progress file — discovered by listing `docs/plans` recursively, excluding docs/plans/completed/, for `*-progress.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. More than one topic in flight? Ask which one this finalize ships — finalizing touches only its own topic, and another topic still being designed or executed never blocks this run. Then match, in the chosen topic's file(s), the `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only the matching ❌/⏭ verdict rows in the Requirements table (e.g. `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*❌'` / `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*⏭'` — scoped to Requirements-table rows because the Execution summary rows share the same row shape, with reasons); the sections after the tables carry nothing the gate needs. Apply the gates below to the chosen topic's file(s) and no others:
+3. Read **every** relevant progress file — for a multi-leaf topic that's each leaf's progress file — discovered by listing `docs/plans` recursively, excluding docs/plans/completed/, for `*-progress.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every topic’s `Feature phase:` extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):
+
+   ```javascript
+   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
+   const files = designs ? designs.split('\n') : [];
+   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
+   const heads = await Promise.all(files.map(d =>
+     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
+   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
+   ```
+
+   More than one topic in flight? Ask which one this finalize ships — finalizing touches only its own topic, and another topic still being designed or executed never blocks this run. Then match, in the chosen topic's file(s), the `Feature phase:` line (e.g. `grep -m1 '^Feature phase:' <file>`) and read only the matching ❌/⏭ verdict rows in the Requirements table (e.g. `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*❌'` / `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*⏭'` — scoped to Requirements-table rows because the Execution summary rows share the same row shape, with reasons); the sections after the tables carry nothing the gate needs. Apply the gates below to the chosen topic's file(s) and no others:
    - **Any `❌ failed`** (in any leaf of the topic) → **block**. Present counts and reasons; continue only when the user sends the task back to executing-tasks, or explicitly types `--force-failed` to acknowledge shipping with incomplete requirements.
    - **Only `⏭ skipped`** → warn and confirm ("Requirement N was skipped. Continue, or go back?").
    - **`Feature phase` must be `done`** in every progress file of the topic — any other value (`e2e-written`, `implementing (k/N)`, `reviewing`, `ship-paused`) means that topic is still in flight: its ship checkpoint has not been approved. Send the user back to `/skill:pwk-executing-tasks` instead of finalizing.
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index 197984a..039fd5c 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -7,13 +7,23 @@ description: "Show all active pipeline topics and their phase/progress. Use when
 
 Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the design read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 ## Process
 
 0. **Verify the root** — run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).
-1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight) — this working tree only. Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`.
-2. **State per topic/part — extract, never ingest.** For each progress file take the `Feature phase:` line by matching it (e.g. `grep -m1 '^Feature phase:' <file>` — wherever the template puts it); the body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` renders the topic as **`awaiting setup`** — the setup checkpoint was never approved (the slot is only ever written when the design doc has a `## Setup` section, so the header alone decides — no design-doc read) — ahead of any phase-derived state below. Map the line to the displayed state:
+1. **Discover** — List `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight) — this working tree only; take each topic’s `Feature phase:` line header-only (`grep -m1 '^Feature phase:' <file>`). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`. With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every phase extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):
+
+   ```javascript
+   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
+   const files = designs ? designs.split('\n') : [];
+   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
+   const heads = await Promise.all(files.map(d =>
+     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
+   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
+   ```
+
+2. **State per topic/part — map the header.** The body (execution summary, review reports, code digest) carries nothing status needs, and neither do design docs. A header reading `Setup: pending` renders the topic as **`awaiting setup`** — the setup checkpoint was never approved (the slot is only ever written when the design doc has a `## Setup` section, so the header alone decides — no design-doc read) — ahead of any phase-derived state below. Map the line to the displayed state:
    - `done` → **`done`** — terminal, never shown as in-flight; every row is resolved (`✅` passed, `❌` failed, `⏭` skipped — resolved, not necessarily passed). Append the tally as `N/N` when wanted — the Requirements-table row count, scoped to that table because the Execution summary rows share the same `| <n> |` row shape and a bare grep would double it (e.g. `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep -c '^| [0-9]'`) — and when that same scoped range finds any — `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep -c '^| [0-9].*❌'` / `sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep -c '^| [0-9].*⏭'` (the same scoping, so Execution-summary rows — which share the row shape — and prose mentions of the glyphs do not inflate the count) — render the counts, e.g. `done (1 ❌ · 1 ⏭)`, noting finalizing will require `--force-failed` while `❌` rows stand
    - `implementing (k/N)` → `execute k/N` (the tally rides on the line itself — no extra read)
    - `e2e-written` → `execute 0/N` (the E2E is written and the run continues into implementation — never shown as a paused state; N comes from the same Requirements-table-scoped row count as `done` — so no tally renders without a defined source)
diff --git a/skills/pwk-walkthrough/SKILL.md b/skills/pwk-walkthrough/SKILL.md
index 3d23953..76223f5 100644
--- a/skills/pwk-walkthrough/SKILL.md
+++ b/skills/pwk-walkthrough/SKILL.md
@@ -7,7 +7,7 @@ description: "Generate a detailed, file-referenced walkthrough of a shipped feat
 
 Explain a shipped feature in code-level detail, for a human reading with the files open.
 
-Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
+Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.
 
 **Not a pipeline phase** — never auto-run, never blocks anything. The skill is generated on demand and invoking it exits any gated design phase (it writes outside `docs/plans/`).
 
diff --git a/tests/codemode-preference.e2e.test.ts b/tests/codemode-preference.e2e.test.ts
new file mode 100644
index 0000000..c0a36c6
--- /dev/null
+++ b/tests/codemode-preference.e2e.test.ts
@@ -0,0 +1,201 @@
+import { spawnSync } from "node:child_process";
+import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { dirname, join } from "node:path";
+import { fileURLToPath } from "node:url";
+import { describe, expect, it } from "vitest";
+import workflowGuard from "../extensions/workflow-guard";
+import { createCommandContext } from "./helpers";
+import { CODEMODE_SWEEP_SCRIPT, TOOL_FREEDOM_MARKERS } from "./markers.mjs";
+import { sweepSkillDir } from "./prescription-sweep.mjs";
+
+/**
+ * Feature acceptance for codemode preference.
+ *
+ * The deliverable is skill prose, lint rules, docs, and one guard behavior, so the
+ * observable interface is: the content the host loads, skill-lint's exit behavior on
+ * a kit copy, and the extension's before_agent_start emission. `npm run check` is the
+ * outer gate (this file runs inside it); these scenarios are the primary enforced spec.
+ *
+ * This test proves that: (1) a prescription hidden inside a javascript fence is caught
+ * by skill-lint like any inline bash command; (2) the guard announces codemode exactly
+ * once per session when the host grants it, and never when it does not or when the
+ * guard is pinned off; (3) the six skills name the executor instance and carry the
+ * byte-pinned canonical sweep script with zero sweep violations; (4) the shipped docs
+ * carry the dated known-instances table and the README enablement pointer.
+ */
+const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+const skillsRoot = join(repoRoot, "skills");
+const SKILLS = [
+  "pwk-brainstorming",
+  "pwk-code-review",
+  "pwk-executing-tasks",
+  "pwk-finalizing",
+  "pwk-status",
+  "pwk-walkthrough",
+];
+const SWEEP_SITES = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
+const KIT_COPY_PATHS = [
+  "skills",
+  "agents",
+  "extensions/workflow-guard.ts",
+  "README.md",
+  "docs/lessons.md",
+  "docs/oversight-model.md",
+  "docs/developer-usage-guide.md",
+  "docs/workflow-phases.md",
+];
+const KIT_COPY_TESTS = ["skill-lint.mjs", "markers.mjs", "prescription-sweep.mjs"];
+
+function read(rel: string): string {
+  return readFileSync(join(repoRoot, rel), "utf8");
+}
+
+/** Kit copy in a tmpdir, with skill-lint runnable against it. */
+function copyKit(prefix: string): string {
+  const kit = mkdtempSync(join(tmpdir(), prefix));
+  for (const rel of KIT_COPY_PATHS) {
+    const target = join(kit, rel);
+    mkdirSync(dirname(target), { recursive: true });
+    cpSync(join(repoRoot, rel), target, { recursive: true });
+  }
+  mkdirSync(join(kit, "tests"));
+  for (const file of KIT_COPY_TESTS) {
+    cpSync(join(repoRoot, "tests", file), join(kit, "tests", file));
+  }
+  return kit;
+}
+
+/**
+ * Minimal ExtensionAPI harness with an optional tool registry: `getAllTools` is only
+ * defined when `tools` is provided, mirroring hosts that expose no registry (the
+ * guard's detection must fail closed there).
+ */
+function createGuardHarness(tools?: Array<{ name: string }>) {
+  const handlers = new Map<string, (event: any, ctx: any) => unknown>();
+  const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
+  const pi: any = {
+    on(event: string, handler: (event: any, ctx: any) => unknown) {
+      handlers.set(event, handler);
+    },
+    registerCommand(name: string, options: { handler: (args: string, ctx: any) => unknown }) {
+      commands.set(name, options);
+    },
+    sendMessage() {},
+  };
+  if (tools) pi.getAllTools = () => tools;
+  workflowGuard(pi);
+  return { commands, handlers };
+}
+
+async function reminderContent(harness: ReturnType<typeof createGuardHarness>): Promise<string> {
+  const result = await harness.handlers.get("before_agent_start")?.({}, {});
+  return ((result as { message?: { content?: string } })?.message?.content ?? "") as string;
+}
+
+describe("codemode preference (feature E2E)", () => {
+  it("fails skill-lint on a kit copy with a prescription hidden in a javascript fence, naming file and command", () => {
+    const skill = "pwk-status";
+    const kit = copyKit("pwk-codemode-js-");
+    try {
+      const skillFile = join(kit, `skills/${skill}/SKILL.md`);
+      // The editor's regression: an unsanctioned command, but wrapped in executor syntax.
+      const injected = `${readFileSync(skillFile, "utf8")}\n\nGather state first:\n\n\`\`\`javascript\nconst out = await tools.bash({ command: "rm foo.txt" });\nreturn text(out);\n\`\`\`\n`;
+      writeFileSync(skillFile, injected);
+      const result = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { encoding: "utf8" });
+      expect(result.status, "js-fence prescriptions must not be invisible").not.toBe(0);
+      expect(`${result.stdout}${result.stderr}`).toContain(`${skill}/SKILL.md`);
+      expect(`${result.stdout}${result.stderr}`).toContain("rm foo.txt");
+    } finally {
+      rmSync(kit, { recursive: true, force: true });
+    }
+  });
+
+  it("announces codemode exactly once when the host grants it; never without it or under guard-off", async () => {
+    const withCodemode = createGuardHarness([{ name: "codemode" }]);
+    withCodemode.handlers.get("session_start")?.({}, {});
+    withCodemode.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    const first = await reminderContent(withCodemode);
+    expect(first).toContain("DESIGN phase");
+    expect(first).toContain("codemode: active");
+    expect(first.match(/codemode: active/g)?.length, "exactly one line").toBe(1);
+    const second = await reminderContent(withCodemode);
+    expect(second).not.toContain("codemode: active");
+
+    const withoutCodemode = createGuardHarness([{ name: "bash" }]);
+    withoutCodemode.handlers.get("session_start")?.({}, {});
+    withoutCodemode.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    const plain = await reminderContent(withoutCodemode);
+    expect(plain).toContain("DESIGN phase");
+    expect(plain).not.toContain("codemode: active");
+
+    const noRegistry = createGuardHarness();
+    noRegistry.handlers.get("session_start")?.({}, {});
+    noRegistry.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    expect(await reminderContent(noRegistry)).not.toContain("codemode: active");
+
+    const noPhaseFirst = createGuardHarness([{ name: "codemode" }]);
+    noPhaseFirst.handlers.get("session_start")?.({}, {});
+    const hintAlone = await reminderContent(noPhaseFirst);
+    expect(hintAlone, "no phase entered — the hint rides alone on the first tail message").toContain(
+      "codemode: active",
+    );
+    expect(hintAlone).not.toContain("DESIGN phase");
+    expect(await reminderContent(noPhaseFirst)).toBe("");
+
+    const pinnedOn = createGuardHarness([{ name: "codemode" }]);
+    pinnedOn.handlers.get("session_start")?.({}, {});
+    pinnedOn.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    const onNotes: string[] = [];
+    pinnedOn.commands.get("pwk-guard")?.handler("on", createCommandContext(process.cwd(), onNotes));
+    const onHint = await reminderContent(pinnedOn);
+    expect(onHint, "guard-on keeps the informational line, drops the phase reminder").toContain("codemode: active");
+    expect(onHint).not.toContain("DESIGN phase");
+
+    const pinnedOff = createGuardHarness([{ name: "codemode" }]);
+    pinnedOff.handlers.get("session_start")?.({}, {});
+    pinnedOff.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    const notifications: string[] = [];
+    pinnedOff.commands.get("pwk-guard")?.handler("off", createCommandContext(process.cwd(), notifications));
+    expect(await reminderContent(pinnedOff), "guard-off suppresses the line").not.toContain("codemode: active");
+    pinnedOff.commands.get("pwk-guard")?.handler("auto", createCommandContext(process.cwd(), notifications));
+    const afterAuto = await reminderContent(pinnedOff);
+    expect(afterAuto).toContain("DESIGN phase");
+    expect(afterAuto, "the emission window passed — never retroactively added").not.toContain("codemode: active");
+  });
+
+  it("names the executor instance in the clause and carries the pinned canonical sweep script", () => {
+    const instanceFragment = "e.g. `codemode` on pi ≥ 1.0.0";
+    expect(TOOL_FREEDOM_MARKERS.clause, "canonical clause names the instance").toContain(instanceFragment);
+    for (const name of SKILLS) {
+      expect(read(`skills/${name}/SKILL.md`), name).toContain(TOOL_FREEDOM_MARKERS.clause);
+    }
+    expect(CODEMODE_SWEEP_SCRIPT, "markers export the canonical script").toContain("grep -m1 '^Feature phase:'");
+    for (const name of SWEEP_SITES) {
+      expect(read(`skills/${name}/SKILL.md`), name).toContain(CODEMODE_SWEEP_SCRIPT);
+    }
+    const names = readdirSync(skillsRoot).filter((d) => statSync(join(skillsRoot, d)).isDirectory());
+    for (const name of names) {
+      expect(sweepSkillDir(skillsRoot, name), name).toEqual([]);
+    }
+  });
+
+  it("ships the dated known-instances table in the dev guide and one enablement paragraph in README", () => {
+    const guide = read("docs/developer-usage-guide.md");
+    for (const harness of [
+      "that executor is `codemode`",
+      "opencode",
+      "Claude Platform API",
+      "Claude Code CLI",
+      "zcode",
+      "commandcode",
+    ]) {
+      expect(guide, harness).toContain(harness);
+    }
+    expect(guide.match(/2026-09-29/g)?.length ?? 0, "every instance row is dated").toBeGreaterThanOrEqual(6);
+    const readme = read("README.md");
+    expect(readme).toContain("codemode");
+    expect(readme).toContain("Enable codemode");
+    expect(readme, "no instances table in README").not.toContain("| opencode");
+  });
+});
diff --git a/tests/markers.mjs b/tests/markers.mjs
index f43de29..1b28df4 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -212,13 +212,28 @@ export const DIGEST_RENDERING_MARKERS = {
  */
 export const TOOL_FREEDOM_MARKERS = {
   clause:
-    "Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor, a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.",
+    "Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.",
   toolFreedom: "use the better tool and treat the recipe as a fallback",
   disposalInvariant: "any single operation achieving exactly this is correct",
   floorLine:
     "The `tools:` frontmatter is the minimum grant requested of the delegation provider, not a prescription — use any tool your host actually grants.",
 };
 
+/**
+ * Canonical executor-script sweep example (codemode preference): one sandboxed
+ * batch-executor call lists in-flight designs and extracts each topic's phase
+ * header-only from the sibling progress file, with design-only topics reporting
+ * `design`. Byte-pinned and embedded at the four sweep sites (pwk-brainstorming,
+ * pwk-executing-tasks, pwk-finalizing, pwk-status); skill-lint asserts presence,
+ * and the prescription sweep reads the fence's embedded commands like any other.
+ */
+export const CODEMODE_SWEEP_SCRIPT = `   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
+   const files = designs ? designs.split('\\n') : [];
+   const shellq = (s) => "'" + s.replace(/'/g, "'\\\\''") + "'";
+   const heads = await Promise.all(files.map(d =>
+     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
+   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\\n') || 'no in-flight topics');`;
+
 /**
  * Shared property helper (digest-rendering): a content line that is not a list item,
  * heading, or fence is a lazy continuation in CommonMark — it merges into the previous
diff --git a/tests/prescription-sweep.mjs b/tests/prescription-sweep.mjs
index 8ba407d..021ae45 100644
--- a/tests/prescription-sweep.mjs
+++ b/tests/prescription-sweep.mjs
@@ -13,9 +13,14 @@
  *
  * Known limitations (deliberate, kept proportional): a command is detected by its
  * first token appearing in COMMAND_WORDS — an unlisted tool head (e.g. a brand-new
- * CLI) is not flagged until the word is added; and fence ranges assume no nested
+ * CLI) is not flagged until the word is added; fence ranges assume no nested
  * fences (an outer fenced block containing another fence line mis-spans — the
- * shipped corpus has none; the parity scan in the feature review verified it).
+ * shipped corpus has none; the parity scan in the feature review verified it);
+ * and executor-script (javascript/js) fences yield commands only from the two
+ * conservative tool-call shapes — a keyed `command:` literal or the first string
+ * positional of a `tools.<name>(…)` call — so plain string variables are never
+ * mistaken for prescriptions. Pipe tails after `|` inherit the bash-sweep
+ * semantics and are not separately classified — the head command decides.
  */
 import { existsSync, readdirSync, readFileSync } from "node:fs";
 import { join } from "node:path";
@@ -122,6 +127,7 @@ const COMMAND_WORDS = new Set([
 ]);
 
 const BASH_FENCE_RE = /```bash\n([\s\S]*?)```/g;
+const JS_FENCE_RE = /```(?:javascript|js)\n([\s\S]*?)```/g;
 const ANY_FENCE_RE = /```[a-z]*\n?[\s\S]*?```/g;
 const INLINE_RE = /`([^`\n]+)`/g;
 
@@ -173,6 +179,23 @@ const lineBefore = (text, index) => {
 /** Fence ranges of any language — inline spans inside code are not prose commands. */
 const fenceRanges = (text) => [...text.matchAll(ANY_FENCE_RE)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
 
+/** Executor-script extraction shapes: a string or template literal keyed `command:`,
+ *  and the first string positional of a `tools.<name>(…)` call. */
+const KEYED_COMMAND_RE = /command\s*:\s*("([^"\\\n]|\\.)*"|'([^'\\\n]|\\.)*'|`([^`\\]|\\.)*`)/g;
+const TOOLS_POSITIONAL_RE = /\btools\s*\.\s*\w+\s*\(\s*("([^"\\\n]|\\.)*"|'([^'\\\n]|\\.)*'|`([^`\\]|\\.)*`)/g;
+
+/** Unescape a JS string-literal body's quote/backslash escapes; template interpolation
+ *  (`${…}`) passes through untouched — the command head is what gets classified. */
+const unescapeLiteral = (body) => body.replace(/\\(['"`\\])/g, "$1");
+
+/** Embedded tool-call command strings inside executor script code. */
+export function extractExecutorCommands(code) {
+  const commands = [];
+  for (const match of code.matchAll(KEYED_COMMAND_RE)) commands.push(unescapeLiteral(match[1].slice(1, -1)));
+  for (const match of code.matchAll(TOOLS_POSITIONAL_RE)) commands.push(unescapeLiteral(match[1].slice(1, -1)));
+  return commands;
+}
+
 /** Sweep one file's text: violations name the file and the offending command. */
 export function sweepText(file, text) {
   const violations = [];
@@ -193,6 +216,18 @@ export function sweepText(file, text) {
     }
   }
 
+  for (const fence of text.matchAll(JS_FENCE_RE)) {
+    const context = lineBefore(text, fence.index ?? 0);
+    for (const extracted of extractExecutorCommands(fence[1])) {
+      for (const segment of segmentsOf(extracted)) {
+        if (!looksLikeCommand(segment)) continue;
+        if (isSanctioned(segment)) continue;
+        if (isFramed(context)) continue;
+        violations.push({ file, command: segment });
+      }
+    }
+  }
+
   for (const span of text.matchAll(INLINE_RE)) {
     const command = span[1].trim();
     if (!looksLikeCommand(command)) continue;
diff --git a/tests/prescription-sweep.test.ts b/tests/prescription-sweep.test.ts
index 3b39c35..3a7820e 100644
--- a/tests/prescription-sweep.test.ts
+++ b/tests/prescription-sweep.test.ts
@@ -94,3 +94,49 @@ describe("prescription sweep", () => {
     expect(violations[1].command).toContain("find");
   });
 });
+
+describe("executor-script fences (javascript/js)", () => {
+  it("fails an unsanctioned command keyed inside a javascript fence, naming file and command", () => {
+    const violations = sweep({
+      "SKILL.md":
+        '# Demo\n\nGather state first:\n\n```javascript\nconst out = await tools.bash({ command: "rm foo.txt" });\nreturn text(out);\n```\n',
+    });
+    expect(violations.length).toBe(1);
+    expect(violations[0].file).toBe("pwk-demo/SKILL.md");
+    expect(violations[0].command).toBe("rm foo.txt");
+  });
+
+  it("passes sanctioned commands inside a javascript fence without framing", () => {
+    expect(
+      sweep({
+        "SKILL.md": `# Demo\n\nDo it:\n\n\`\`\`javascript\nconst r = await tools.bash({ command: \`grep -m1 '^Feature phase:' \${file}\` });\nconst s = await tools.bash({ command: 'npm run check' });\n\`\`\`\n`,
+      }),
+    ).toEqual([]);
+  });
+
+  it("passes an unsanctioned command when the fence's introducing line is framed", () => {
+    expect(
+      sweep({
+        "SKILL.md":
+          '# Demo\n\nOne example, adjust to your harness:\n\n```javascript\nconst x = await tools.bash({ command: "curl https://example.test/x" });\n```\n',
+      }),
+    ).toEqual([]);
+  });
+
+  it("extracts first-positional strings in tools.* calls from js fences too", () => {
+    const violations = sweep({
+      "SKILL.md": '# Demo\n\nRun:\n\n```js\nawait tools.bash("find . -name node_modules -delete");\n```\n',
+    });
+    expect(violations.length).toBe(1);
+    expect(violations[0].command).toContain("find");
+  });
+
+  it("reports nothing for javascript without tool-call command strings", () => {
+    expect(
+      sweep({
+        "SKILL.md":
+          '# Demo\n\nLogic:\n\n```javascript\nconst flags = "rm foo.txt"; // a plain variable, not a keyed command\nconst n = lines.filter((l) => l.startsWith("mkdir tmp")).length;\n```\n',
+      }),
+    ).toEqual([]);
+  });
+});
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 91a5b46..6c0f729 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -17,6 +17,7 @@ import {
   SINGLE_DOC_MARKERS,
   STATUS_STATE_MARKERS,
   TOOL_FREEDOM_MARKERS,
+  CODEMODE_SWEEP_SCRIPT,
 } from "./markers.mjs";
 import { sweepSkillDir } from "./prescription-sweep.mjs";
 
@@ -1426,6 +1427,25 @@ console.log("tool freedom:");
   }
 }
 
+// --- Check 15: canonical executor-script sweep example (codemode preference, R3) ---
+// The four sweep sites demonstrate the batched shape with one byte-pinned script, so
+// the demonstrated example cannot drift per-site. The prescription sweep reads the
+// fence's embedded commands like any other fenced content.
+console.log("codemode sweep script:");
+{
+  const SWEEP_SITES = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
+  for (const name of SWEEP_SITES) {
+    const skill = loadSkills().find((s) => s.name === name);
+    if (!skill) {
+      fail(`codemode sweep script: ${name} skill missing`);
+      continue;
+    }
+    if (skill.content.includes(CODEMODE_SWEEP_SCRIPT)) ok(`${name}: canonical sweep script embedded`);
+    else
+      fail(`${name}: canonical sweep script missing or drifted — re-copy CODEMODE_SWEEP_SCRIPT from tests/markers.mjs`);
+  }
+}
+
 // R2 — disposal blocks are invariant + canonical example: every fenced bash block in
 // pwk-finalizing (the disposal sections hold the only fences) is immediately preceded
 // by a sentence stating the outcome invariant, so an executor with a better tool can
diff --git a/tests/workflow-guard.test.ts b/tests/workflow-guard.test.ts
index ae0e001..8392c9c 100644
--- a/tests/workflow-guard.test.ts
+++ b/tests/workflow-guard.test.ts
@@ -16,9 +16,47 @@ import { describe, it, expect } from "vitest";
 // The phase variable is module-level, so we need to reset it between tests.
 
 // Import the module to access getCurrentPhase
-import { getCurrentPhase, isSafeCommand, shouldBlockFilePath, UNLOCK_SKILLS } from "../extensions/workflow-guard";
+import {
+  detectCodeme,
+  getCurrentPhase,
+  isSafeCommand,
+  shouldBlockFilePath,
+  UNLOCK_SKILLS,
+} from "../extensions/workflow-guard";
 import { createExtensionHarness } from "./helpers";
 
+describe("detectCodeme", () => {
+  it("detects the executor in the active set or full registry, strings or objects", () => {
+    expect(detectCodeme({ getActiveTools: () => [{ name: "codemode" }] })).toBe(true);
+    expect(detectCodeme({ getAllTools: () => ["bash", "codemode"] })).toBe(true);
+    expect(detectCodeme({ getAllTools: () => [{ name: "bash" }] })).toBe(false);
+  });
+
+  it("fails closed without a registry, on surprises, and when the executor is not active", () => {
+    expect(detectCodeme({})).toBe(false);
+    expect(
+      detectCodeme({
+        getAllTools: () => {
+          throw new Error("registry unavailable");
+        },
+      }),
+    ).toBe(false);
+    expect(detectCodeme({ getAllTools: () => "not-a-list" })).toBe(false);
+    // The active set is authoritative: registered but not declared means not granted.
+    expect(detectCodeme({ getActiveTools: () => [], getAllTools: () => [{ name: "codemode" }] })).toBe(false);
+    // Container-shape surprises fail closed instead of trusting the broader registry.
+    expect(detectCodeme({ getActiveTools: () => "not-a-list", getAllTools: () => [{ name: "codemode" }] })).toBe(false);
+    expect(
+      detectCodeme({
+        getActiveTools: () => {
+          throw new Error("active set unavailable");
+        },
+        getAllTools: () => [{ name: "codemode" }],
+      }),
+    ).toBe(false);
+  });
+});
+
 describe("guard phase transitions", () => {
   it("unlocks on write-needing skills only", () => {
     expect([...UNLOCK_SKILLS]).toEqual(["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-walkthrough"]);

