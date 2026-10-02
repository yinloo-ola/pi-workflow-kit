# Design: prefer codemode (sandboxed batch executors) across the kit

## At a glance

pi 1.0.0 ships `codemode`, a sandboxed JavaScript batch executor that calls the agent's other tools, runs calls in parallel, and filters output before the model sees it — a concrete instance of the "sandboxed batch executor" archetype the 2.8.0 tool-freedom clause already names generically. This topic makes the kit *prefer* such executors where the host grants them: the canonical clause names pi's instance as a framed example, a byte-pinned canonical codeme script becomes the example at the four discovery-sweep sites (with the procedural extraction prose it makes redundant collapsed into it), the prescription sweep learns to read `javascript` fences so prescriptions cannot hide inside codeme-shaped blocks, the developer guide gains a dated cross-harness instances table, and the guard emits one session-start visibility line when codemode is active. Verified landscape (2026-09-29): pi `codemode` (shipped, opt-in), opencode v2 `execute` "Code Mode" (shipped, permission-gated), Claude Platform API Programmatic Tool Calling (GA), Claude Code CLI REPL mode (experimental, env-flag, source-verified, undocumented); zcode and commandcode have none. The preference is advisory end-to-end.

**Key decisions:**

- Generic-first, concrete-by-example: invariants keep archetype terms; the clause names exactly one framed instance (`codemode` on pi ≥ 1.0.0); the dev-guide instances table carries the rest (rejected: clause as a vendor list — every new harness would cost a 7-file byte-pinned edit; a table row is not a clause edit).
- Bounded slimming at the four sweep sites only: the pinned canonical script becomes *the* example, the redundant extraction-discipline prose collapses into invariant + script + one-line bash fallback (rejected: fences added beside full prose — the same lines would be touched twice if slimmed later; rejected: whole-kit prose rewrite — 2.5.0-scale, its own topic if the fences prove out).
- Preference is advisory end-to-end; no mechanical tool-choice enforcement (rejected: blocking bash when codemode is active — preference is not a safety gate, and codemode is sometimes the wrong tool: single pinned commands, plain git, python helpers).
- The prescription sweep reads `javascript` fences from day one — adding JS to skills without extending the sweep would let prescriptions hide inside codeme-shaped blocks, weakening 2.8.0's guarantee.
- Pinned command strings stay byte-exact; pinned commands may be batched verbatim inside a script, with trivial-join aggregation — the pin protects the command string, not the vehicle.
- The guard emits one session-start visibility line, suppressed while guard override is `off`; phase semantics untouched (rejected: per-phase repetition — reminder noise; the model already sees its tool list).
- `package.json` peer dependency stays `"*"` (rejected: pinning `^1.0.0` — the preference must degrade gracefully; skills stay host-neutral and version-agnostic).
- Role contracts `agents/pwk-*.md` untouched (rejected: granting codemode in `tools:` frontmatter — it is a provider-neutral *minimum grant*, and reviewers gain little).
- Known-instances table lives in the developer guide only, every row dated; README gets one paragraph plus an enablement pointer (decisions A1–A5 confirmed 2026-09-29).

| R# | Requirement in one line | Risk |
|---|---|---|
| R1 | Canonical clause names `codemode` as the framed executor instance | — |
| R2 | Prescription sweep classifies commands inside `javascript` fences | — |
| R3 | Pinned canonical codeme sweep script at the four sweep sites with bounded slimming | — |
| R4 | Developer-guide known-instances table + README enablement note | — |
| R5 | Guard session-start codemode detection and one-line tail reminder | ⚠ production-risk |

## Requirements

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

## Feature acceptance

- Given a copy of the kit with a bare prescription injected inside a `javascript` fence in one skill, When the harness-neutral E2E runs skill-lint, Then it exits nonzero naming the skill file and the command.
- Given the guard wired in a simulated session with codemode active and override `auto`, When `session_start` then the first `before_agent_start` fire, Then exactly one codemode-active line rides the tail message; given the same wiring without codemode in the tool set, Then no such line appears.
- Given the six skills, markers, sweep, and guard with all changes applied, When `npm run check` runs, Then clause byte-checks, canonical-script checks, prescription sweep, contract tests, and the E2E suite all pass.
- Given the shipped documentation, When a reader on opencode or Claude Code consults the known-instances table, Then every row states a dated status and, where an executor exists, the concrete tool name the archetype maps to.

### Feature review: auto
