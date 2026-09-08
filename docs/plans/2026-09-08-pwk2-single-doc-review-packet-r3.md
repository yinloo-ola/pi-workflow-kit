# Review packet: pwk2-single-doc — per-requirement review (R3, incl. review-fix commit)

## Commits
32afeb2 fix(review): apply R3 tracing findings
9a5c272 feat!: remove the plan phase — executing rewired to the single design doc (R3)

## Changed files
 AGENTS.md                                          |    4 +-
 README.md                                          |   26 +-
 docs/adr/0004-one-buildable-design-doc.md          |   36 +
 docs/developer-usage-guide.md                      |   30 +-
 docs/lessons.md                                    |    4 +-
 docs/oversight-model.md                            |    5 +-
 docs/plans/2026-09-08-pwk2-single-doc-progress.md  |   10 +-
 .../2026-09-08-pwk2-single-doc-review-packet-r3.md | 1421 ++++++++++++++++++++
 docs/workflow-phases.md                            |   29 +-
 extensions/workflow-guard.ts                       |   18 +-
 skills/pwk-brainstorming/SKILL.md                  |    4 +-
 skills/pwk-diagnose/SKILL.md                       |    2 +-
 skills/pwk-executing-tasks/SKILL.md                |   53 +-
 skills/pwk-finalizing/SKILL.md                     |    4 +-
 skills/pwk-status/SKILL.md                         |    8 +-
 skills/pwk-writing-plans/SKILL.md                  |   97 --
 tests/code-digest.test.ts                          |   14 +-
 tests/human-review-digests.test.ts                 |   25 +-
 tests/integration-guidance.test.ts                 |    1 -
 tests/markers.mjs                                  |    4 -
 tests/pwk2-single-doc.e2e.test.ts                  |    3 +
 tests/review-packet.test.ts                        |  118 +-
 tests/setup-command.test.ts                        |    4 +-
 tests/skill-delegation-contract.test.ts            |    7 +-
 tests/skill-lint.mjs                               |  137 +-
 tests/workflow-guard.test.ts                       |   30 +-
 26 files changed, 1722 insertions(+), 372 deletions(-)

## Acceptance criteria (verbatim from the plan, R3)
## Requirement 3: Plan phase removed, execution rewired

### Acceptance criteria
- Given the guard at 2.0.0, When inspected, Then `SKILL_TO_PHASE` maps only `pwk-brainstorming`, the `Phase` type is `brainstorm | null`, reminder wording says DESIGN, and invoking a skill named `pwk-writing-plans` no longer enters a phase (the skill no longer exists in `skills/` or the tarball).
- Given executing at 2.0.0, When its pre-flight runs on `main`, Then it creates the feature branch itself; when parsing a 2.0.0 design doc it reads `### R<n>` blocks + tags + `## Feature acceptance`.
- Given a stem-matched legacy `-implementation.md` (a 1.x in-flight feature), When executing/status discover work, Then the legacy flow is routed and all discovery globs cover both suffixes with the `completed/` exclusion (every consumer enumerated in the same change — lessons rule).
- Given the review-packet recipe, When run against a 2.0.0 design doc, Then acceptance criteria are extracted verbatim from the `### R1` → `## Feature acceptance` span.
- Given ADR 0004 was approved in brainstorm, When R3 lands, Then `docs/adr/0004-one-buildable-design-doc.md` exists with the approved text.

### Integration tests
- `should map only brainstorming to a gated phase` — guard export assertions; `pwk-writing-plans` absent from `skills/` and package files.
- `should reduce Phase to brainstorm | null` — `getCurrentPhase()` behavior (null initially, `brainstorm` on entry) with type-level compilation.
- `should create the branch in executing pre-flight and parse ### R blocks` — executing skill-text markers.
- `should route stem-matched legacy implementation docs through the old flow` — executing + status + finalize glob-wording assertions.
- `should extract packet criteria from the design doc` — review-packet suite re-anchored on a design-doc fixture (two-requirement fixture per the repeated-section sed lesson); the crosswalk-safety test is deleted with its premise.
- `should write ADR 0004` — file presence + approved-text markers.

### Checkpoints: spec
### Review: parallel

### Production-risk notes
- `UNLOCK_SKILLS` is the exported single source of truth (guard ↔ skill-lint ↔ skill set must change atomically — R3 must not alter its contents beyond R5's addition).
- Published npm package: breaking 2.0.0 — phase semantics and skill set change; CHANGELOG must carry a migration note for in-flight features.


## Feature acceptance (verbatim)
## Feature acceptance
The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. Derived from the design doc: one end-to-end test exercising the requirements *together*. Make it concrete — a named test + the assertion that proves the composed behavior:
- `should thread pwk 2.0 end-to-end: one buildable design doc → executing → learning sweep → on-demand walkthrough` — Given the kit at 2.0.0 (skills + guard + tests at HEAD), When the full contract is asserted, Then brainstorming's single doc carries `### R#` blocks (criteria + tags, no crosswalk, no test-name lists) under a decisions-first At a glance; the guard maps only brainstorming to a phase and `pwk-writing-plans` no longer exists; executing parses the blocks, creates the branch, and the packet extracts criteria from the design doc; finalize sweeps learning (decisions + deviations + alerts → ADR offers/lessons) before disposal; and `pwk-walkthrough` — present in `UNLOCK_SKILLS` — writes a SHA-stamped, file:line-anchored `docs/walkthroughs/<topic>.md` that no disposal glob touches.

## Production-risk notes (verbatim, if any)
### Production-risk notes
- `tests/markers.mjs` is a cross-file canonical registry — marker changes must land atomically in both suites; hard-coded literals outside it must be swept in the same change.

### Production-risk notes
- `UNLOCK_SKILLS` is the exported single source of truth (guard ↔ skill-lint ↔ skill set must change atomically — R3 must not alter its contents beyond R5's addition).
- Published npm package: breaking 2.0.0 — phase semantics and skill set change; CHANGELOG must carry a migration note for in-flight features.

### Production-risk notes
- `UNLOCK_SKILLS` atomicity (shared with R3 — land the export change exactly once).


## Diff
diff --git a/AGENTS.md b/AGENTS.md
index fb39002..b5d83ea 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -4,7 +4,7 @@ Instructions for AI coding agents working in this repository. If you also mainta
 
 ## Project
 
-`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **brainstorm → plan → execute → finalize** workflow with test-first discipline. During the brainstorm and plan phases the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.
+`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **design → execute → finalize** workflow with test-first discipline: one buildable design doc per feature (requirements carry their own acceptance criteria + review tags — no separate plan phase). During the design phase the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.
 
 Three components:
 - `extensions/workflow-guard.ts` — the single code file: the enforcement engine plus the Pi-only `/pwk-setup` command that installs role definitions into `.agents/agents/`.
@@ -27,7 +27,7 @@ No build step. No typecheck script (`tsconfig.json` is IDE-only). No watch mode.
 ```
 extensions/   # TS source — workflow-guard.ts only (guard + /pwk-setup)
 tests/        # vitest — workflow-guard.test.ts + delegation contract tests
-skills/       # 7 SKILL.md dirs, pwk-* namespaced, harness-neutral
+skills/       # SKILL.md dirs, pwk-* namespaced, harness-neutral
 agents/       # canonical role contracts (recon scout + 4 reviewers)
 docs/         # developer-usage-guide, workflow-phases, oversight-model, provider-delegation-contract, lessons
 docs/plans/   # ephemeral active plans (deleted after finalize)
diff --git a/README.md b/README.md
index 2655beb..0344519 100644
--- a/README.md
+++ b/README.md
@@ -50,7 +50,7 @@ Enforces phase-appropriate tool access — not just guidelines, but hard blocks:
 
 | Phase | `write` / `edit` | `bash` |
 |-------|:-:|:-:|
-| **Brainstorm** / **Plan** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
+| **Design** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
 | **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Status** | ✅ Full access | ✅ Full access |
 
 The agent can read code and discuss design with you during brainstorm/plan, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.
@@ -62,7 +62,7 @@ Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → r
 Guide the agent through a disciplined development process:
 
 ```
-brainstorm → writing-plans → executing-tasks → finalizing
+brainstorm → executing-tasks → finalizing
                              (feature-gate: write feature E2E → feature-spec → implement → review → ship checkpoint)
                                 ↕
                    diagnose (anytime)   ·   status (anytime)
@@ -73,8 +73,7 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
 | Phase | Trigger | What Happens |
 |-------|---------|--------------|
 | **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc opening with a `## At a glance` digest (plain summary → **Key decisions** — rejected-alternative clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) before the `## Requirements` blocks; each requirement block carries its own acceptance criteria + review tags. Interviews in **frontier rounds**: numbered questions each with a recommended answer, facts looked up rather than asked, an assumption gate before the design is presented. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
-| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code), with a `## Crosswalk` proving every R# is covered; you review a one-line confirmation, not the full plan |
-| **Execute** | `/skill:pwk-executing-tasks` | Write the feature E2E (red) → **checkpoint: feature-spec** → implement requirements → feature review → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
+| **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **checkpoint: feature-spec** → implement the design doc's `### R<n>` requirement blocks → feature review → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
 | **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
 | **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs or archive them under `docs/plans/completed/` (discovery always runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), update README/CHANGELOG, create PR |
 | **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
@@ -87,16 +86,15 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
 You control each phase — the agent never advances on its own. Invoke a skill to move forward:
 
 ```
-/skill:pwk-brainstorming   →  discuss and design (lists Requirements)
-/skill:pwk-writing-plans   →  turn each Requirement into acceptance criteria + integration tests
-/skill:pwk-executing-tasks →  feature-gate flow: E2E-first, implement, review, ship checkpoint
+/skill:pwk-brainstorming   →  discuss and design — the design doc IS the buildable spec
+/skill:pwk-executing-tasks →  feature-gate flow: branch, E2E-first, implement ### R<n> blocks, review, ship checkpoint
 /skill:pwk-code-review     →  auto-runs at the feature level inside executing-tasks; also invocable manually for ad-hoc reviews
 /skill:pwk-finalizing       →  ship it
 ```
 
-### Behavioral-Spec Planning
+### Behavioral-Spec Design
 
-Plans specify *what*, not *how*. For each requirement, the plan gives **acceptance criteria + integration-test cases** — no implementation code, no file-by-file recipe. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes.
+The design doc specifies *what*, not *how*. Each `### R<n>:` requirement block gives **acceptance criteria** (Given/When/Then, edge and error cases included) — no implementation code, no file-by-file recipe, no test-name lists. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria survive implementation changes.
 
 ### Feature-Gate Execution
 
@@ -154,16 +152,13 @@ pi install npm:@tianhai/pi-workflow-kit
 > /skill:pwk-brainstorming
 > I want to add OAuth2 login to our API
 
-# (agent explores approaches, writes a design doc with a Requirements list)
+# (agent explores approaches, writes the buildable design doc: At a glance,
+#  ### R<n> blocks with acceptance criteria + review tags, Feature acceptance E2E)
 # (write/edit are blocked — your code is safe)
 
-> /skill:pwk-writing-plans
-
-# (agent turns each Requirement into acceptance criteria + integration tests)
-
 > /skill:pwk-executing-tasks
 
-# (feature-gate: writes feature E2E → checkpoint → implements requirements → checkpoint → feature review)
+# (feature-gate: creates the branch, writes feature E2E → checkpoint → implements the blocks → checkpoint → feature review)
 
 > /skill:pwk-finalizing
 
@@ -185,7 +180,6 @@ pi-workflow-kit/
 │   └── workflow-guard.ts      # Write blocker during brainstorm/plan; destructive-bash blacklist
 ├── skills/
 │   ├── pwk-brainstorming/SKILL.md
-│   ├── pwk-writing-plans/SKILL.md
 │   ├── pwk-executing-tasks/SKILL.md
 │   ├── pwk-code-review/SKILL.md
 │   ├── pwk-finalizing/SKILL.md
diff --git a/docs/adr/0004-one-buildable-design-doc.md b/docs/adr/0004-one-buildable-design-doc.md
new file mode 100644
index 0000000..ee4934e
--- /dev/null
+++ b/docs/adr/0004-one-buildable-design-doc.md
@@ -0,0 +1,36 @@
+# ADR 0004: One buildable design doc — plan phase merged into brainstorm
+
+Date: 2026-09-08
+
+## Context
+
+Since 1.7.0 the design doc already carried testable requirements and the Feature-acceptance E2E;
+the plan phase (`pwk-writing-plans`) then mechanically re-derived them into a second
+`-implementation.md` the human approved with a one-line rubber stamp. Every feature paid for a
+second skill load, a second approval, and restated content (criteria, risk notes, Feature
+acceptance) — "paying twice" for derived data, while the executor read a stripped spec instead of
+the design's architecture context.
+
+## Decision
+
+In 2.0.0, `pwk-writing-plans` and the plan phase are removed. The design doc is the single
+buildable artifact: one `### R<n>:` block per requirement carrying the one-line behavior,
+Given/When/Then acceptance criteria (edge and error cases included), and Checkpoints/Review tags,
+plus the Feature-acceptance E2E with the feature-level review tag. `pwk-executing-tasks` creates
+the feature branch in its pre-flight, parses the blocks, and extracts review-packet criteria from
+the design doc. Durable knowledge is promoted at finalize (the learning sweep harvests decisions,
+deviations, and alerts into ADRs and lessons.md) precisely because the doc itself is disposed.
+A decisions-first At a glance (summary → key decisions with honest-empty rejected-alternative
+clauses → R#/risk table) is the human digest; no crosswalk, no test-name lists — the block
+structure is the map and the executor writes tests red-green from criteria.
+
+## Consequences
+
+- One meaningful approval replaces a rubber stamp; the executor inherits the full architecture
+  context; per-feature token cost drops (one fewer skill load, zero restatement).
+- Accepted cost: the plan phase's cold re-read is gone — mitigated by the brainstorm assumption
+  gate and frontier rounds at design time, the E2E-first gate at execute, and reviewer fresh eyes.
+- The guard's phase map reduces to `brainstorm | null` (the two phases were already
+  behaviorally identical: `docs/plans/`-only writes).
+- Legacy stem-matched `-implementation.md` docs route the old flow so in-flight 1.x features
+  finish; breaking change, shipped as 2.0.0 with a CHANGELOG migration note.
diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
index d8a6cf3..4f3f87c 100644
--- a/docs/developer-usage-guide.md
+++ b/docs/developer-usage-guide.md
@@ -4,9 +4,9 @@ How to install and use `pi-workflow-kit` with Pi, and how its workflow roles map
 
 ## What you get
 
-- **5 pipeline skills** — brainstorm → writing-plans → executing-tasks → finalizing, with code-review running at the feature level during execution.
+- **4 pipeline skills** — brainstorm → executing-tasks → finalizing, with code-review running at the feature level during execution.
 - **2 utility skills** — diagnose (debugging) and status (multi-topic overview), both on demand.
-- **1 extension** — hard-blocks source writes during brainstorm and writing-plans, and blocks destructive bash via a simple common-blacklist.
+- **1 extension** — hard-blocks source writes during the design phase, and blocks destructive bash via a simple common-blacklist.
 
 ## Installation
 
@@ -35,7 +35,7 @@ Or in `.pi/settings.json` / `~/.pi/agent/config.json`:
 You control each phase by invoking the skill. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once:
 
 ```
-/skill:pwk-brainstorming  →  /skill:pwk-writing-plans  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
+/skill:pwk-brainstorming  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
 ```
 
 ### 1. Brainstorm
@@ -56,17 +56,7 @@ Explore the idea through collaborative dialogue. The agent reads code, asks ques
 
 Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (plain-language summary → **Key decisions** — `(rejected: …)` clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a too-big requirement, may start an **umbrella** (writes a status-free overview + the first part's design doc). ADRs go to `docs/adr/` (permanent).
 
-### 2. Plan
-
-```
-/skill:pwk-writing-plans
-```
-
-Read the design doc's Requirements and turn each into **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code). The plan carries a `## Crosswalk` (one row per design requirement); you review a **one-line confirmation** ("Plan covers R1–R<N>; tags: …") — the full plan is available on request.
-
-Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
-
-### 3. Execute
+### 2. Execute
 
 ```
 /skill:pwk-executing-tasks
@@ -74,7 +64,7 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
 
 Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
 
-### 4. Code review (feature level)
+### 3. Code review (feature level)
 
 The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.
 
@@ -82,7 +72,7 @@ In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents
 
 *Fallback:* if no host/provider can guarantee the requested capabilities, the skill performs the missing recon or review work inline. Other Pi extensions are supported only when they expose the documented capabilities or have a separate adapter; arbitrary extensions are not automatically compatible. See `docs/provider-delegation-contract.md` for the integration contract.
 
-### 5. Finalize
+### 4. Finalize
 
 ```
 /skill:pwk-finalizing
@@ -110,7 +100,7 @@ A read-only overview of all active design topics — which phase each is in and
 
 The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit` and `bash` tool calls:
 
-- **During brainstorm and writing-plans**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
+- **During the design phase**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
 - **During executing-tasks, code-review, finalizing, diagnose**: no restrictions.
 - **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`; `pwk-status` stays gated. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
 
@@ -125,7 +115,7 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
 ## Tips
 
 - Start with brainstorming for anything non-trivial.
-- The plan is a behavioral spec, not an implementation recipe — let the executor choose how.
+- The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
 - The feature-gate flow has two checkpoints by default (feature-spec + ship): use them to steer the E2E spec and to sign off the finished implementation (digest + coverage, diff on request).
-- **Right-size each requirement at plan time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-writing-plans`; the human can override or downgrade before plan approval.
-- Put all plan artifacts under `docs/plans/`; ADRs under `docs/adr/`.
+- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-brainstorming`; the human can override or downgrade before design approval.
+- Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
diff --git a/docs/lessons.md b/docs/lessons.md
index 6d8999b..fa373e0 100644
--- a/docs/lessons.md
+++ b/docs/lessons.md
@@ -1,7 +1,7 @@
 # Lessons Learned
 
 <!--
-Agent: read this during brainstorm (design), writing-plans (acceptance criteria + tests), executing-tasks (per requirement), and finalizing (curation).
+Agent: read this during brainstorm (design), executing-tasks (per requirement), and finalizing (curation).
 Follow every rule. Add new rules when you catch yourself making repeat mistakes.
 Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
 Retire rules that no longer apply during finalizing.
@@ -24,7 +24,7 @@ Retire rules that no longer apply during finalizing.
 
 ## Testing
 
-- **Meaningful tests, mirrored across writing-plans, executing-tasks, and here.** (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
+- **Meaningful tests, mirrored across brainstorming, executing-tasks, and here.** (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
 - **Reset module-level extension state per test.** Extensions keep `let` module state (e.g. the guard's `phase`); tests that drive phase transitions must fire `session_start` in `beforeEach` (or at test start), otherwise declaration order silently determines pass/fail — green until a reorder, `.only`, or `--sequence.shuffle` breaks it. Verify with a shuffled run before shipping.
 - **Test-doc wording assertions should match behavior, not exact sentences.** Prefer regexes over `toContain("exact phrase")` when asserting documentation; minor rewording of a doc sentence should not break three suites. Keep one canonical marker per contract (or a shared assertions helper) instead of copy-pasting the same phrase into multiple test files.
 
diff --git a/docs/oversight-model.md b/docs/oversight-model.md
index 8377fbb..342f2e1 100644
--- a/docs/oversight-model.md
+++ b/docs/oversight-model.md
@@ -6,9 +6,8 @@
 
 Skills teach the agent the workflow. There are 5 pipeline skills:
 
-- **pwk-brainstorming** — explore ideas, produce a descriptive design doc that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks, each requirement carrying its own acceptance criteria + review tags. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
-- **pwk-writing-plans** — turn each requirement into acceptance criteria + integration-test cases (a behavioral spec, no implementation code); carries a `## Crosswalk` (R# → section → tests) and presents a one-line coverage confirmation instead of the full plan
-- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the requirements, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
+- **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
+- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the design doc's `### R<n>` requirement blocks, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
 - **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review requests the `parallel-review` capability for four logical fresh-context, read-only roles; successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
 - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
 
diff --git a/docs/plans/2026-09-08-pwk2-single-doc-progress.md b/docs/plans/2026-09-08-pwk2-single-doc-progress.md
index f90ce5c..a5833e1 100644
--- a/docs/plans/2026-09-08-pwk2-single-doc-progress.md
+++ b/docs/plans/2026-09-08-pwk2-single-doc-progress.md
@@ -4,14 +4,14 @@ Plan: docs/plans/2026-09-08-pwk2-single-doc-implementation.md
 Branch: pwk2-single-doc
 Started: 2026-09-08T11:19:03+08:00
 Last updated: 2026-09-08T11:19:40+08:00
-Feature phase: implementing (1/5)
+Feature phase: implementing (3/5)
 
 ## Requirements
 | # | Done | Requirement | Per-req ceremony | Commit |
 |---|------|-------------|-----------------|--------|
 | 1 | ✅ | Merged design doc | 🔎 parallel | 474ac6c |
-| 2 | 🔄 | Decisions-first At a glance | — | — |
-| 3 | ⬜ | Plan phase removed, execution rewired | ⏸ spec 🔎 parallel | — |
+| 2 | ✅ | Decisions-first At a glance | — | c6430da |
+| 3 | ✅ | Plan phase removed, execution rewired | ⏸ spec 🔎 parallel | 9a5c272 |
 | 4 | ⬜ | Finalize learning sweep | — | — |
 | 5 | ⬜ | pwk-walkthrough skill | 🔎 parallel | — |
 
@@ -19,8 +19,8 @@ Feature phase: implementing (1/5)
 | R# | Requirement | How it was built | Deviated? |
 |----|-------------|------------------|-----------|
 | 1 | Merged design doc | Brainstorming skill rewritten: `### R<n>: <name>` blocks carry one-liner + Given/When/Then criteria (incl. edges) + both tags; no test-name lists/mapping tables; auto-tag single-source moved in (writing-plans left a pointer); audit rule kept; hand-off re-pointed to executing. | |
-| 2 | Decisions-first At a glance | | |
-| 3 | Plan phase removed, execution rewired | | |
+| 2 | Decisions-first At a glance | At a glance now summary → Key decisions (honest-empty rejected clauses) → R#/risk table; mirrored in README + 3 user docs. | |
+| 3 | Plan phase removed, execution rewired | pwk-writing-plans deleted (23 files, net −144 lines); guard Phase = brainstorm\|null; executing: pre-flight branch creation, ### R<n> parsing, stem-matched legacy routing, packet sed re-anchored on the design doc; status+finalize cover both suffixes; README/dev-guide/workflow-phases/oversight/AGENTS rethreaded; ADR 0004 written. | Kept the branch base with the unmerged setup fix (user decision, not a plan departure) — the commit rides in the PR diff. |
 | 4 | Finalize learning sweep | | |
 | 5 | pwk-walkthrough skill | | |
 
diff --git a/docs/plans/2026-09-08-pwk2-single-doc-review-packet-r3.md b/docs/plans/2026-09-08-pwk2-single-doc-review-packet-r3.md
new file mode 100644
index 0000000..42e6f7f
--- /dev/null
+++ b/docs/plans/2026-09-08-pwk2-single-doc-review-packet-r3.md
@@ -0,0 +1,1421 @@
+# Review packet: pwk2-single-doc — per-requirement review (R3)
+
+## Commits
+9a5c272 feat!: remove the plan phase — executing rewired to the single design doc (R3)
+
+## Changed files
+ AGENTS.md                                         |   4 +-
+ README.md                                         |  26 ++---
+ docs/adr/0004-one-buildable-design-doc.md         |  36 ++++++
+ docs/developer-usage-guide.md                     |  30 ++---
+ docs/lessons.md                                   |   4 +-
+ docs/oversight-model.md                           |   5 +-
+ docs/plans/2026-09-08-pwk2-single-doc-progress.md |   8 +-
+ docs/workflow-phases.md                           |  29 ++---
+ extensions/workflow-guard.ts                      |  18 ++-
+ skills/pwk-brainstorming/SKILL.md                 |   4 +-
+ skills/pwk-executing-tasks/SKILL.md               |  53 +++++----
+ skills/pwk-finalizing/SKILL.md                    |   4 +-
+ skills/pwk-status/SKILL.md                        |   6 +-
+ skills/pwk-writing-plans/SKILL.md                 |  97 ----------------
+ tests/code-digest.test.ts                         |  14 +--
+ tests/human-review-digests.test.ts                |  25 ++--
+ tests/integration-guidance.test.ts                |   1 -
+ tests/markers.mjs                                 |   4 -
+ tests/review-packet.test.ts                       |  82 ++++++-------
+ tests/setup-command.test.ts                       |   2 +-
+ tests/skill-delegation-contract.test.ts           |   7 +-
+ tests/skill-lint.mjs                              | 135 +++++++++-------------
+ tests/workflow-guard.test.ts                      |   4 +-
+ 23 files changed, 227 insertions(+), 371 deletions(-)
+
+## Acceptance criteria (verbatim from the plan, R3)
+## Requirement 3: Plan phase removed, execution rewired
+
+### Acceptance criteria
+- Given the guard at 2.0.0, When inspected, Then `SKILL_TO_PHASE` maps only `pwk-brainstorming`, the `Phase` type is `brainstorm | null`, reminder wording says DESIGN, and invoking a skill named `pwk-writing-plans` no longer enters a phase (the skill no longer exists in `skills/` or the tarball).
+- Given executing at 2.0.0, When its pre-flight runs on `main`, Then it creates the feature branch itself; when parsing a 2.0.0 design doc it reads `### R<n>` blocks + tags + `## Feature acceptance`.
+- Given a stem-matched legacy `-implementation.md` (a 1.x in-flight feature), When executing/status discover work, Then the legacy flow is routed and all discovery globs cover both suffixes with the `completed/` exclusion (every consumer enumerated in the same change — lessons rule).
+- Given the review-packet recipe, When run against a 2.0.0 design doc, Then acceptance criteria are extracted verbatim from the `### R1` → `## Feature acceptance` span.
+- Given ADR 0004 was approved in brainstorm, When R3 lands, Then `docs/adr/0004-one-buildable-design-doc.md` exists with the approved text.
+
+### Integration tests
+- `should map only brainstorming to a gated phase` — guard export assertions; `pwk-writing-plans` absent from `skills/` and package files.
+- `should reduce Phase to brainstorm | null` — `getCurrentPhase()` behavior (null initially, `brainstorm` on entry) with type-level compilation.
+- `should create the branch in executing pre-flight and parse ### R blocks` — executing skill-text markers.
+- `should route stem-matched legacy implementation docs through the old flow` — executing + status + finalize glob-wording assertions.
+- `should extract packet criteria from the design doc` — review-packet suite re-anchored on a design-doc fixture (two-requirement fixture per the repeated-section sed lesson); the crosswalk-safety test is deleted with its premise.
+- `should write ADR 0004` — file presence + approved-text markers.
+
+### Checkpoints: spec
+### Review: parallel
+
+### Production-risk notes
+- `UNLOCK_SKILLS` is the exported single source of truth (guard ↔ skill-lint ↔ skill set must change atomically — R3 must not alter its contents beyond R5's addition).
+- Published npm package: breaking 2.0.0 — phase semantics and skill set change; CHANGELOG must carry a migration note for in-flight features.
+
+
+## Feature acceptance (verbatim)
+## Feature acceptance
+The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. Derived from the design doc: one end-to-end test exercising the requirements *together*. Make it concrete — a named test + the assertion that proves the composed behavior:
+- `should thread pwk 2.0 end-to-end: one buildable design doc → executing → learning sweep → on-demand walkthrough` — Given the kit at 2.0.0 (skills + guard + tests at HEAD), When the full contract is asserted, Then brainstorming's single doc carries `### R#` blocks (criteria + tags, no crosswalk, no test-name lists) under a decisions-first At a glance; the guard maps only brainstorming to a phase and `pwk-writing-plans` no longer exists; executing parses the blocks, creates the branch, and the packet extracts criteria from the design doc; finalize sweeps learning (decisions + deviations + alerts → ADR offers/lessons) before disposal; and `pwk-walkthrough` — present in `UNLOCK_SKILLS` — writes a SHA-stamped, file:line-anchored `docs/walkthroughs/<topic>.md` that no disposal glob touches.
+
+## Production-risk notes (verbatim, if any)
+### Production-risk notes
+- `tests/markers.mjs` is a cross-file canonical registry — marker changes must land atomically in both suites; hard-coded literals outside it must be swept in the same change.
+
+### Production-risk notes
+- `UNLOCK_SKILLS` is the exported single source of truth (guard ↔ skill-lint ↔ skill set must change atomically — R3 must not alter its contents beyond R5's addition).
+- Published npm package: breaking 2.0.0 — phase semantics and skill set change; CHANGELOG must carry a migration note for in-flight features.
+
+### Production-risk notes
+- `UNLOCK_SKILLS` atomicity (shared with R3 — land the export change exactly once).
+
+
+## Diff
+diff --git a/AGENTS.md b/AGENTS.md
+index fb39002..b5d83ea 100644
+--- a/AGENTS.md
++++ b/AGENTS.md
+@@ -4,7 +4,7 @@ Instructions for AI coding agents working in this repository. If you also mainta
+ 
+ ## Project
+ 
+-`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **brainstorm → plan → execute → finalize** workflow with test-first discipline. During the brainstorm and plan phases the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.
++`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **design → execute → finalize** workflow with test-first discipline: one buildable design doc per feature (requirements carry their own acceptance criteria + review tags — no separate plan phase). During the design phase the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.
+ 
+ Three components:
+ - `extensions/workflow-guard.ts` — the single code file: the enforcement engine plus the Pi-only `/pwk-setup` command that installs role definitions into `.agents/agents/`.
+@@ -27,7 +27,7 @@ No build step. No typecheck script (`tsconfig.json` is IDE-only). No watch mode.
+ ```
+ extensions/   # TS source — workflow-guard.ts only (guard + /pwk-setup)
+ tests/        # vitest — workflow-guard.test.ts + delegation contract tests
+-skills/       # 7 SKILL.md dirs, pwk-* namespaced, harness-neutral
++skills/       # SKILL.md dirs, pwk-* namespaced, harness-neutral
+ agents/       # canonical role contracts (recon scout + 4 reviewers)
+ docs/         # developer-usage-guide, workflow-phases, oversight-model, provider-delegation-contract, lessons
+ docs/plans/   # ephemeral active plans (deleted after finalize)
+diff --git a/README.md b/README.md
+index 2655beb..0344519 100644
+--- a/README.md
++++ b/README.md
+@@ -50,7 +50,7 @@ Enforces phase-appropriate tool access — not just guidelines, but hard blocks:
+ 
+ | Phase | `write` / `edit` | `bash` |
+ |-------|:-:|:-:|
+-| **Brainstorm** / **Plan** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
++| **Design** | 🔒 Blocked outside `docs/plans/` | 🔒 Destructive commands blocked (simple blacklist) |
+ | **Execute** / **Code-review** / **Finalize** / **Diagnose** / **Status** | ✅ Full access | ✅ Full access |
+ 
+ The agent can read code and discuss design with you during brainstorm/plan, but it physically cannot modify source files. Bash during gated phases is governed by a simple common-blacklist (a command is allowed unless it matches a destructive pattern), and a short phase reminder is shown once when the gated phase begins so the model self-restricts.
+@@ -62,7 +62,7 @@ Phases transition only when you invoke a skill (`/skill:pwk-brainstorming` → r
+ Guide the agent through a disciplined development process:
+ 
+ ```
+-brainstorm → writing-plans → executing-tasks → finalizing
++brainstorm → executing-tasks → finalizing
+                              (feature-gate: write feature E2E → feature-spec → implement → review → ship checkpoint)
+                                 ↕
+                    diagnose (anytime)   ·   status (anytime)
+@@ -73,8 +73,7 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
+ | Phase | Trigger | What Happens |
+ |-------|---------|--------------|
+ | **Brainstorm** | `/skill:pwk-brainstorming` | Explore approaches, produce a design doc opening with a `## At a glance` digest (plain summary → **Key decisions** — rejected-alternative clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) before the `## Requirements` blocks; each requirement block carries its own acceptance criteria + review tags. Interviews in **frontier rounds**: numbered questions each with a recommended answer, facts looked up rather than asked, an assumption gate before the design is presented. On non-trivial topics, requests the logical `codebase-recon` capability; if unavailable or unsafe, performs the `pwk-recon-scout` role inline. |
+-| **Plan** | `/skill:pwk-writing-plans` | Turn each requirement into **acceptance criteria + integration tests** — a behavioral spec (no implementation code), with a `## Crosswalk` proving every R# is covered; you review a one-line confirmation, not the full plan |
+-| **Execute** | `/skill:pwk-executing-tasks` | Write the feature E2E (red) → **checkpoint: feature-spec** → implement requirements → feature review → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
++| **Execute** | `/skill:pwk-executing-tasks` | Create the feature branch, then: write the feature E2E (red) → **checkpoint: feature-spec** → implement the design doc's `### R<n>` requirement blocks → feature review → **ship checkpoint** (execution summary + code digest + coverage table; full diff on request) |
+ | **Code review** | `/skill:pwk-code-review` | Feature-level (default) or per-requirement: code tracing, spec alignment, code smells (applies fixes), production hazard check. Delegated review uses four tiered logical roles (smell/hazard on a fast model via `/pwk-setup --fast-model`) over a script-assembled review packet when a safe provider is available; otherwise it runs inline. |
+ | **Finalize** | `/skill:pwk-finalizing` | Delete consumed plan docs or archive them under `docs/plans/completed/` (discovery always runs excluding docs/plans/completed/, so archived work never resurfaces as in flight — single source: the `pwk-executing-tasks` glob wording), update README/CHANGELOG, create PR |
+ | **Diagnose** | `/skill:pwk-diagnose` | Debugging loop: reproduce → hypothesise → instrument → fix → cleanup. **Exits the gated phase** (debugging writes tests/instrumentation) |
+@@ -87,16 +86,15 @@ A **design doc is one PR**; a **requirement is one testable slice within it**. A
+ You control each phase — the agent never advances on its own. Invoke a skill to move forward:
+ 
+ ```
+-/skill:pwk-brainstorming   →  discuss and design (lists Requirements)
+-/skill:pwk-writing-plans   →  turn each Requirement into acceptance criteria + integration tests
+-/skill:pwk-executing-tasks →  feature-gate flow: E2E-first, implement, review, ship checkpoint
++/skill:pwk-brainstorming   →  discuss and design — the design doc IS the buildable spec
++/skill:pwk-executing-tasks →  feature-gate flow: branch, E2E-first, implement ### R<n> blocks, review, ship checkpoint
+ /skill:pwk-code-review     →  auto-runs at the feature level inside executing-tasks; also invocable manually for ad-hoc reviews
+ /skill:pwk-finalizing       →  ship it
+ ```
+ 
+-### Behavioral-Spec Planning
++### Behavioral-Spec Design
+ 
+-Plans specify *what*, not *how*. For each requirement, the plan gives **acceptance criteria + integration-test cases** — no implementation code, no file-by-file recipe. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes.
++The design doc specifies *what*, not *how*. Each `### R<n>:` requirement block gives **acceptance criteria** (Given/When/Then, edge and error cases included) — no implementation code, no file-by-file recipe, no test-name lists. The executor has full autonomy to choose structure, signatures, and internals. A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria survive implementation changes.
+ 
+ ### Feature-Gate Execution
+ 
+@@ -154,16 +152,13 @@ pi install npm:@tianhai/pi-workflow-kit
+ > /skill:pwk-brainstorming
+ > I want to add OAuth2 login to our API
+ 
+-# (agent explores approaches, writes a design doc with a Requirements list)
++# (agent explores approaches, writes the buildable design doc: At a glance,
++#  ### R<n> blocks with acceptance criteria + review tags, Feature acceptance E2E)
+ # (write/edit are blocked — your code is safe)
+ 
+-> /skill:pwk-writing-plans
+-
+-# (agent turns each Requirement into acceptance criteria + integration tests)
+-
+ > /skill:pwk-executing-tasks
+ 
+-# (feature-gate: writes feature E2E → checkpoint → implements requirements → checkpoint → feature review)
++# (feature-gate: creates the branch, writes feature E2E → checkpoint → implements the blocks → checkpoint → feature review)
+ 
+ > /skill:pwk-finalizing
+ 
+@@ -185,7 +180,6 @@ pi-workflow-kit/
+ │   └── workflow-guard.ts      # Write blocker during brainstorm/plan; destructive-bash blacklist
+ ├── skills/
+ │   ├── pwk-brainstorming/SKILL.md
+-│   ├── pwk-writing-plans/SKILL.md
+ │   ├── pwk-executing-tasks/SKILL.md
+ │   ├── pwk-code-review/SKILL.md
+ │   ├── pwk-finalizing/SKILL.md
+diff --git a/docs/adr/0004-one-buildable-design-doc.md b/docs/adr/0004-one-buildable-design-doc.md
+new file mode 100644
+index 0000000..ee4934e
+--- /dev/null
++++ b/docs/adr/0004-one-buildable-design-doc.md
+@@ -0,0 +1,36 @@
++# ADR 0004: One buildable design doc — plan phase merged into brainstorm
++
++Date: 2026-09-08
++
++## Context
++
++Since 1.7.0 the design doc already carried testable requirements and the Feature-acceptance E2E;
++the plan phase (`pwk-writing-plans`) then mechanically re-derived them into a second
++`-implementation.md` the human approved with a one-line rubber stamp. Every feature paid for a
++second skill load, a second approval, and restated content (criteria, risk notes, Feature
++acceptance) — "paying twice" for derived data, while the executor read a stripped spec instead of
++the design's architecture context.
++
++## Decision
++
++In 2.0.0, `pwk-writing-plans` and the plan phase are removed. The design doc is the single
++buildable artifact: one `### R<n>:` block per requirement carrying the one-line behavior,
++Given/When/Then acceptance criteria (edge and error cases included), and Checkpoints/Review tags,
++plus the Feature-acceptance E2E with the feature-level review tag. `pwk-executing-tasks` creates
++the feature branch in its pre-flight, parses the blocks, and extracts review-packet criteria from
++the design doc. Durable knowledge is promoted at finalize (the learning sweep harvests decisions,
++deviations, and alerts into ADRs and lessons.md) precisely because the doc itself is disposed.
++A decisions-first At a glance (summary → key decisions with honest-empty rejected-alternative
++clauses → R#/risk table) is the human digest; no crosswalk, no test-name lists — the block
++structure is the map and the executor writes tests red-green from criteria.
++
++## Consequences
++
++- One meaningful approval replaces a rubber stamp; the executor inherits the full architecture
++  context; per-feature token cost drops (one fewer skill load, zero restatement).
++- Accepted cost: the plan phase's cold re-read is gone — mitigated by the brainstorm assumption
++  gate and frontier rounds at design time, the E2E-first gate at execute, and reviewer fresh eyes.
++- The guard's phase map reduces to `brainstorm | null` (the two phases were already
++  behaviorally identical: `docs/plans/`-only writes).
++- Legacy stem-matched `-implementation.md` docs route the old flow so in-flight 1.x features
++  finish; breaking change, shipped as 2.0.0 with a CHANGELOG migration note.
+diff --git a/docs/developer-usage-guide.md b/docs/developer-usage-guide.md
+index d8a6cf3..4f3f87c 100644
+--- a/docs/developer-usage-guide.md
++++ b/docs/developer-usage-guide.md
+@@ -4,9 +4,9 @@ How to install and use `pi-workflow-kit` with Pi, and how its workflow roles map
+ 
+ ## What you get
+ 
+-- **5 pipeline skills** — brainstorm → writing-plans → executing-tasks → finalizing, with code-review running at the feature level during execution.
++- **4 pipeline skills** — brainstorm → executing-tasks → finalizing, with code-review running at the feature level during execution.
+ - **2 utility skills** — diagnose (debugging) and status (multi-topic overview), both on demand.
+-- **1 extension** — hard-blocks source writes during brainstorm and writing-plans, and blocks destructive bash via a simple common-blacklist.
++- **1 extension** — hard-blocks source writes during the design phase, and blocks destructive bash via a simple common-blacklist.
+ 
+ ## Installation
+ 
+@@ -35,7 +35,7 @@ Or in `.pi/settings.json` / `~/.pi/agent/config.json`:
+ You control each phase by invoking the skill. A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once:
+ 
+ ```
+-/skill:pwk-brainstorming  →  /skill:pwk-writing-plans  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
++/skill:pwk-brainstorming  →  /skill:pwk-executing-tasks  →  /skill:pwk-finalizing
+ ```
+ 
+ ### 1. Brainstorm
+@@ -56,17 +56,7 @@ Explore the idea through collaborative dialogue. The agent reads code, asks ques
+ 
+ Outcome: `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (plain-language summary → **Key decisions** — `(rejected: …)` clauses only for real forks — → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a too-big requirement, may start an **umbrella** (writes a status-free overview + the first part's design doc). ADRs go to `docs/adr/` (permanent).
+ 
+-### 2. Plan
+-
+-```
+-/skill:pwk-writing-plans
+-```
+-
+-Read the design doc's Requirements and turn each into **acceptance criteria + integration-test cases** — a behavioral spec (no implementation code). The plan carries a `## Crosswalk` (one row per design requirement); you review a **one-line confirmation** ("Plan covers R1–R<N>; tags: …") — the full plan is available on request.
+-
+-Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
+-
+-### 3. Execute
++### 2. Execute
+ 
+ ```
+ /skill:pwk-executing-tasks
+@@ -74,7 +64,7 @@ Outcome: `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
+ 
+ Implement via the **feature-gate flow** with full autonomy: write the feature-acceptance E2E test (red) → **checkpoint: feature-spec** → implement the requirements back-to-back → feature review → **ship checkpoint** (full suite + E2E green; you review the execution summary + code digest + coverage table — full diff on request). After the review passes, the executor writes the code digest into the progress file from the review packet. Two mandatory checkpoints at the feature level. Per-requirement checkpoints/reviews are opt-in (default off).
+ 
+-### 4. Code review (feature level)
++### 3. Code review (feature level)
+ 
+ The `pwk-executing-tasks` skill requests the `parallel-review` capability for four logical roles over the whole feature diff: spec alignment, code tracing, code smells, and production hazards. The scope is a script-assembled review packet (diff + acceptance criteria verbatim) handed to every role via a one-liner pointer — the packet never rides in spawn arguments. The roles are independent, fresh-context, read-only reporters; the main agent collects their results, applies smell fixes itself, runs the tests, and flags other findings for the human. The review runs before the ship checkpoint, so your final approval is fully informed: execution summary, per-requirement coverage table, findings status, full diff on request.
+ 
+@@ -82,7 +72,7 @@ In Pi, `/pwk-setup` installs the canonical role definitions into `.agents/agents
+ 
+ *Fallback:* if no host/provider can guarantee the requested capabilities, the skill performs the missing recon or review work inline. Other Pi extensions are supported only when they expose the documented capabilities or have a separate adapter; arbitrary extensions are not automatically compatible. See `docs/provider-delegation-contract.md` for the integration contract.
+ 
+-### 5. Finalize
++### 4. Finalize
+ 
+ ```
+ /skill:pwk-finalizing
+@@ -110,7 +100,7 @@ A read-only overview of all active design topics — which phase each is in and
+ 
+ The `workflow-guard` extension registers `/pwk-setup` and watches `write`/`edit` and `bash` tool calls:
+ 
+-- **During brainstorm and writing-plans**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
++- **During the design phase**: blocks writes outside `docs/plans/`, and blocks destructive bash via a simple common-blacklist (a command is allowed unless it matches a destructive pattern). A short phase reminder is shown once when the gated phase begins so the model self-restricts.
+ - **During executing-tasks, code-review, finalizing, diagnose**: no restrictions.
+ - **Phases are skill-driven**: the guard follows the skill you invoke — it never unlocks on message keywords. The exact unlock set is `pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, `pwk-diagnose`; `pwk-status` stays gated. To override, run `/pwk-guard on` (force read-only), `off` (disable), or `auto` (default; skill-driven). Subcommands autocomplete.
+ 
+@@ -125,7 +115,7 @@ Plans specify *what* (acceptance criteria + integration tests); the executor wri
+ ## Tips
+ 
+ - Start with brainstorming for anything non-trivial.
+-- The plan is a behavioral spec, not an implementation recipe — let the executor choose how.
++- The design doc is a behavioral spec, not an implementation recipe — let the executor choose how.
+ - The feature-gate flow has two checkpoints by default (feature-spec + ship): use them to steer the E2E spec and to sign off the finished implementation (digest + coverage, diff on request).
+-- **Right-size each requirement at plan time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-writing-plans`; the human can override or downgrade before plan approval.
+-- Put all plan artifacts under `docs/plans/`; ADRs under `docs/adr/`.
++- **Right-size each requirement at design time** with the `### Checkpoints` (`none`/`full`/`spec`, default `none`) and `### Review` (`skip`/`parallel`/`inline`, default `skip`) tags — per-requirement ceremony is opt-in. The always-on feature-level `### Feature review` covers the whole diff. `spec` keeps the cheap spec-correctness gate and drops the complete checkpoint (covered by review), so it requires at least `inline` review. A trivial fix can also use the brainstorming trivial fast-path (one-turn brainstorm, minimal design doc). Production-risk requirements are auto-tagged `### Review: parallel` by `pwk-brainstorming`; the human can override or downgrade before design approval.
++- Put all design artifacts under `docs/plans/`; ADRs under `docs/adr/`.
+diff --git a/docs/lessons.md b/docs/lessons.md
+index 6d8999b..fa373e0 100644
+--- a/docs/lessons.md
++++ b/docs/lessons.md
+@@ -1,7 +1,7 @@
+ # Lessons Learned
+ 
+ <!--
+-Agent: read this during brainstorm (design), writing-plans (acceptance criteria + tests), executing-tasks (per requirement), and finalizing (curation).
++Agent: read this during brainstorm (design), executing-tasks (per requirement), and finalizing (curation).
+ Follow every rule. Add new rules when you catch yourself making repeat mistakes.
+ Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
+ Retire rules that no longer apply during finalizing.
+@@ -24,7 +24,7 @@ Retire rules that no longer apply during finalizing.
+ 
+ ## Testing
+ 
+-- **Meaningful tests, mirrored across writing-plans, executing-tasks, and here.** (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
++- **Meaningful tests, mirrored across brainstorming, executing-tasks, and here.** (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
+ - **Reset module-level extension state per test.** Extensions keep `let` module state (e.g. the guard's `phase`); tests that drive phase transitions must fire `session_start` in `beforeEach` (or at test start), otherwise declaration order silently determines pass/fail — green until a reorder, `.only`, or `--sequence.shuffle` breaks it. Verify with a shuffled run before shipping.
+ - **Test-doc wording assertions should match behavior, not exact sentences.** Prefer regexes over `toContain("exact phrase")` when asserting documentation; minor rewording of a doc sentence should not break three suites. Keep one canonical marker per contract (or a shared assertions helper) instead of copy-pasting the same phrase into multiple test files.
+ 
+diff --git a/docs/oversight-model.md b/docs/oversight-model.md
+index 8377fbb..342f2e1 100644
+--- a/docs/oversight-model.md
++++ b/docs/oversight-model.md
+@@ -6,9 +6,8 @@
+ 
+ Skills teach the agent the workflow. There are 5 pipeline skills:
+ 
+-- **pwk-brainstorming** — explore ideas, produce a descriptive design doc that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks, each requirement carrying its own acceptance criteria + review tags. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
+-- **pwk-writing-plans** — turn each requirement into acceptance criteria + integration-test cases (a behavioral spec, no implementation code); carries a `## Crosswalk` (R# → section → tests) and presents a one-line coverage confirmation instead of the full plan
+-- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the requirements, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
++- **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
++- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the design doc's `### R<n>` requirement blocks, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
+ - **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review requests the `parallel-review` capability for four logical fresh-context, read-only roles; successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
+ - **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge
+ 
+diff --git a/docs/plans/2026-09-08-pwk2-single-doc-progress.md b/docs/plans/2026-09-08-pwk2-single-doc-progress.md
+index f90ce5c..6d6b5dd 100644
+--- a/docs/plans/2026-09-08-pwk2-single-doc-progress.md
++++ b/docs/plans/2026-09-08-pwk2-single-doc-progress.md
+@@ -4,14 +4,14 @@ Plan: docs/plans/2026-09-08-pwk2-single-doc-implementation.md
+ Branch: pwk2-single-doc
+ Started: 2026-09-08T11:19:03+08:00
+ Last updated: 2026-09-08T11:19:40+08:00
+-Feature phase: implementing (1/5)
++Feature phase: implementing (2/5)
+ 
+ ## Requirements
+ | # | Done | Requirement | Per-req ceremony | Commit |
+ |---|------|-------------|-----------------|--------|
+ | 1 | ✅ | Merged design doc | 🔎 parallel | 474ac6c |
+-| 2 | 🔄 | Decisions-first At a glance | — | — |
+-| 3 | ⬜ | Plan phase removed, execution rewired | ⏸ spec 🔎 parallel | — |
++| 2 | ✅ | Decisions-first At a glance | — | c6430da |
++| 3 | 🔄 | Plan phase removed, execution rewired | ⏸ spec 🔎 parallel | — |
+ | 4 | ⬜ | Finalize learning sweep | — | — |
+ | 5 | ⬜ | pwk-walkthrough skill | 🔎 parallel | — |
+ 
+@@ -19,7 +19,7 @@ Feature phase: implementing (1/5)
+ | R# | Requirement | How it was built | Deviated? |
+ |----|-------------|------------------|-----------|
+ | 1 | Merged design doc | Brainstorming skill rewritten: `### R<n>: <name>` blocks carry one-liner + Given/When/Then criteria (incl. edges) + both tags; no test-name lists/mapping tables; auto-tag single-source moved in (writing-plans left a pointer); audit rule kept; hand-off re-pointed to executing. | |
+-| 2 | Decisions-first At a glance | | |
++| 2 | Decisions-first At a glance | At a glance now summary → Key decisions (honest-empty rejected clauses) → R#/risk table; mirrored in README + 3 user docs. | |
+ | 3 | Plan phase removed, execution rewired | | |
+ | 4 | Finalize learning sweep | | |
+ | 5 | pwk-walkthrough skill | | |
+diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
+index fa5e045..92458d9 100644
+--- a/docs/workflow-phases.md
++++ b/docs/workflow-phases.md
+@@ -1,13 +1,13 @@
+ # Workflow Phases
+ 
+-`pi-workflow-kit` has 5 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.
++`pi-workflow-kit` has 4 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.
+ 
+ ```
+-brainstorm → writing-plans → executing-tasks → finalizing
+-                          (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
++brainstorm → executing-tasks → finalizing
++                (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
+ ```
+ 
+-A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → plan → execute) × N → finalize`).
++A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → execute) × N → finalize`).
+ 
+ ## brainstorm
+ 
+@@ -16,27 +16,12 @@ A design doc is one PR; a requirement is one testable slice within it. A require
+ ```
+ 
+ - Explore requirements and shape the design. Interviews in **frontier rounds**: questions form a dependency tree seeded by a six-dimension checklist; each round asks the full frontier as numbered questions, each with a recommended answer; facts are looked up, only decisions asked; the interview ends when the frontier is empty — nothing left silently assumed — and an assumption gate sweeps the draft before the design is presented.
+-- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks, ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
++- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, the **single buildable artifact**: a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks — one `### R<n>:` block per requirement carrying its one-line behavior, **acceptance criteria** (Given/When/Then incl. edge/error cases) and Checkpoints/Review tags (no test-name lists, no separate plan doc) — ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
+ - May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/<date>-<umbrella>/overview.md` (each umbrella in its own folder; roster of parts + build order) and the **first** part's `-design.md` beside it. Later parts are brainstormed one by one against the overview + implemented predecessors.
+ - ADRs go to `docs/adr/` (permanent, never archived).
+ 
+ Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
+ 
+-## writing-plans
+-
+-```
+-/skill:pwk-writing-plans
+-```
+-
+-- Creates the feature branch first (`git checkout -b <topic>`), so design + plan docs live on the branch, not `main`.
+-- Reads the design doc's `## Requirements`; for each, derives **acceptance criteria + integration-test cases** (a behavioral spec, no implementation code), lists requirements in build order (dependencies positioned earlier), and challenges the design when `## Production-risk areas` is present. Emits a `## Crosswalk` (R# → plan section → tests) after `## Overview` — the audit checks every design R# appears exactly once, and the human is shown a **one-line confirmation** ("Plan covers R1–R<N>; tags: …"), not the full plan.
+-- For an umbrella part, reads the umbrella folder's `overview.md` to plan one slice (composing with earlier parts' code) and reuses the existing feature branch instead of creating a new one.
+-- Derives a **`## Feature acceptance` section** in the plan from the design's Feature acceptance — the **primary enforced spec**, an end-to-end test the executor gates on first. If the design has none, stops and asks the human to brainstorm one.
+-- Tags the plan: per-requirement `### Checkpoints`/`### Review` default to `none`/`skip` (opt-in), plus an always-on feature-level `### Feature review`. Flags only requirements with complex logic, the main part of the feature, or production-risk. Requirements with `### Production-risk notes` are auto-tagged `### Review: parallel` (see `pwk-writing-plans` for the rule).
+-- Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
+-
+-Write boundary: only `docs/plans/` is writable.
+-
+ ## executing-tasks
+ 
+ ```
+@@ -45,7 +30,7 @@ Write boundary: only `docs/plans/` is writable.
+ 
+ - **Feature-gate flow:** write the feature-acceptance E2E test (red) → **⏸ checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (request the `parallel-review` capability for four logical read-only roles when the host supports it; otherwise run `/skill:pwk-code-review` inline — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + code digest + reviewer coverage table; full diff on request).
+ - After the review passes, the executor writes a **code digest** into the progress file — plain-language summary, execution flow, gotchas, key files — derived from the review packet; it rides the existing disposal globs.
+-- Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the plan tags (default off); see [Proportionality](#proportionality).
++- Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the design doc tags (default off); see [Proportionality](#proportionality).
+ - **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
+ - Progress tracked in `docs/plans/*-progress.md` (feature phase + requirement checklist).
+ 
+@@ -53,7 +38,7 @@ No write restrictions. All tools available.
+ 
+ ## Proportionality
+ 
+-The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at plan time the human (or planner) tags only the requirements that need it:
++The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:
+ 
+ - **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
+ - **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
+diff --git a/extensions/workflow-guard.ts b/extensions/workflow-guard.ts
+index 67dedb8..c85caaa 100644
+--- a/extensions/workflow-guard.ts
++++ b/extensions/workflow-guard.ts
+@@ -17,13 +17,13 @@ import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
+ /**
+  * Workflow Guard extension.
+  *
+- * Blocks write/edit outside docs/plans/ and destructive bash during brainstorm and plan phases.
++ * Blocks write/edit outside docs/plans/ and destructive bash during the design phase.
+  * Bash uses a simple common-blacklist (DESTRUCTIVE_PATTERNS) — a command is allowed unless it matches
+  * a destructive pattern. A short phase reminder is appended after the user's message each turn via
+  * before_agent_start. You control phases explicitly via /skill: commands — no auto-detection, no prompts.
+  */
+ 
+-type Phase = "brainstorm" | "plan" | null;
++type Phase = "brainstorm" | null;
+ 
+ type DelegationStatus = "completed" | "failed" | "timed-out" | "skipped";
+ 
+@@ -360,7 +360,7 @@ async function promptFastModelChoice(
+   return { model: choice, allRoles };
+ }
+ 
+-// Destructive commands blocked in brainstorm/plan phases (simple common blacklist)
++// Destructive commands blocked in the design phase (simple common blacklist)
+ const DESTRUCTIVE_PATTERNS = [
+   /\brm\b/i,
+   /\brmdir\b/i,
+@@ -384,7 +384,7 @@ const DESTRUCTIVE_PATTERNS = [
+   /\bbrew\s+(install|uninstall|upgrade)/i,
+   // git add/commit/apply merge files and are blocked below. Plain `git branch`/`checkout`/`switch`
+   // only create or move between branches (no source-file changes), so they are intentionally allowed
+-  // during gated phases — pwk-writing-plans creates the feature branch before authoring the plan.
++  // during gated phases — executing-tasks creates the feature branch in its pre-flight.
+   /\bgit\s+(add|commit|push|pull|merge|rebase|reset|branch\s+-[dD]|stash(?!\s+list)|cherry-pick|revert|tag(?!\s+(-l|--list))|init|clone|apply)/i,
+   // Edit-via-bash vectors: in-place editors, patch appliers, find-delete (bypass the write/edit tool block)
+   /\bsed\b.*\s-i\b/i,
+@@ -473,7 +473,6 @@ export function isSafeCommand(command: string): boolean {
+ 
+ const SKILL_TO_PHASE: Record<string, Phase> = {
+   "pwk-brainstorming": "brainstorm",
+-  "pwk-writing-plans": "plan",
+ };
+ 
+ /** Skills whose invocation exits a gated phase (used by the input handler; exported for tests/
+@@ -485,12 +484,11 @@ export const UNLOCK_SKILLS = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code
+  *  never invalidates the cached prefix. */
+ const PHASE_REMINDERS: Record<Exclude<Phase, null>, string> = {
+   brainstorm:
+-    "[pi-workflow-kit] BRAINSTORM phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
+-  plan: "[pi-workflow-kit] PLAN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
++    "[pi-workflow-kit] DESIGN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
+ };
+ 
+ /** Determine if a write/edit to filePath should be blocked during the given phase.
+- *  Only writes under docs/plans/ are allowed during brainstorm and plan phases.
++ *  Only writes under docs/plans/ are allowed during the design phase.
+  */
+ export function shouldBlockFilePath(filePath: string, cwd: string): boolean {
+   const absolute = resolve(cwd, filePath);
+@@ -653,7 +651,7 @@ export default function (pi: ExtensionAPI) {
+         return;
+       }
+     }
+-    // Phase transitions happen only via skills — no message keyword unlocks the plan phase.
++    // Phase transitions happen only via skills — no message keyword unlocks the design phase.
+     // Run /skill:pwk-executing-tasks (or another write-needing skill) to leave a gated phase.
+     //
+     // Unlock list rationale: execute/finalize/code-review/diagnose all need to write source
+@@ -722,7 +720,7 @@ export default function (pi: ExtensionAPI) {
+     return {
+       block: true,
+       reason: `⚠️ ${label}: Cannot ${event.toolName} to ${filePath}. Only docs/plans/ is writable${
+-        manual ? " under the manual read-only lock" : " during brainstorming and planning"
++        manual ? " under the manual read-only lock" : " during the design phase"
+       }.`,
+     };
+   });
+diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
+index 0d15b3a..50700e1 100644
+--- a/skills/pwk-brainstorming/SKILL.md
++++ b/skills/pwk-brainstorming/SKILL.md
+@@ -73,7 +73,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
+    ### R1: <name>
+    <one-line testable behavior — what the feature produces or changes, through its public interface>
+ 
+-   **Acceptance criteria** — Given/When/Then criteria defining "done". Observable behavior only, not implementation steps; cover edge and error cases.
++   **Acceptance criteria** — Given/When/Then criteria defining "done". Test observable behavior — what the feature produces or changes through its public interface; not implementation steps. Cover edge and error cases.
+    - Given … When … Then …
+    - Given … When … Then … (edge case)
+ 
+@@ -100,7 +100,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
+ 
+    Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` — `pwk-code-review` audits it per requirement, and finalize's learning sweep reads it.
+ 
+-   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
++   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). The section carries the feature-level `### Feature review: parallel | inline` tag — the one whole-feature review; default `parallel` (thoroughness lives here — it is the only review in the common case), `inline` for small features. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
+ 
+    ```markdown
+    ## Feature acceptance
+diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
+index 19976a1..fe978e0 100644
+--- a/skills/pwk-executing-tasks/SKILL.md
++++ b/skills/pwk-executing-tasks/SKILL.md
+@@ -1,30 +1,32 @@
+ ---
+ name: pwk-executing-tasks
+-description: "Implement a plan via the feature-gate flow: write the feature-acceptance E2E first, implement requirements back-to-back, then one feature-level review. Run after pwk-writing-plans. Per-requirement checkpoints/reviews are opt-in (default off)."
++description: "Implement a design doc via the feature-gate flow: write the feature-acceptance E2E first, implement the ### R<n> requirement blocks back-to-back, then one feature-level review. Run after pwk-brainstorming. Per-requirement checkpoints/reviews are opt-in (default off)."
+ ---
+ 
+ # Executing Tasks
+ 
+-Implement the plan from `docs/plans/*-implementation.md` via the **feature-gate flow**. The plan is a behavioral spec (acceptance criteria + integration tests) — you choose structure, signatures, internals; the criteria define *what*, you decide *how*.
++Implement the design doc from `docs/plans/*-design.md` via the **feature-gate flow**. The design doc is the single buildable artifact — its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*: structure, signatures, internals are yours.
+ 
+-The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the plan tags (default off); the feature gate covers everything else.
++The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the design doc tags (default off); the feature gate covers everything else.
++
++**Legacy in-flight features** (created before 2.0): a stem-matched `*-implementation.md` routes the old plan flow — parse its `## Requirement N:` sections instead of ### R<n> blocks; everything else is identical. Discovery covers both suffixes.
+ 
+ ## Before you start
+ 
+ 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
+-2. **Find the plan** — glob `docs/plans/**/*-implementation.md` (recursive — umbrella parts live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived plans are not pending work); if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
+-3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.
++2. **Find the doc** — glob `docs/plans/**/*-design.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived work is not pending). A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
++3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
+ 
+ ## First run
+ 
+-1. **Parse the plan** — read every `## Requirement N:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first.
+-2. **Setup pre-flight** *(only if the plan has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
+-3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
++1. **Parse the design doc** — read every `### R<n>:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag in the `## Feature acceptance` section. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first. (Legacy plan doc: read `## Requirement N:` headings the same way.)
++2. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
++3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the design doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
+ 
+    ```markdown
+    # Progress: <topic>
+ 
+-   Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
++   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
+    Branch: <branch>
+    Started: <ISO timestamp>
+    Last updated: <ISO timestamp>
+@@ -52,10 +54,10 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
+ 
+    The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
+ 
+-   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.
++   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)
+ 
+-4. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
+-5. **Write the feature-acceptance E2E test (red).** Read the plan's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
++4. **Commit the design docs** — `git add docs/plans/ && git commit -m "docs: add design doc"`.
++5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
+ 6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.
+ 
+ ## Resume
+@@ -72,22 +74,22 @@ Read the progress file's `Feature phase`:
+ 
+ Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.
+ 
+-**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the plan, fill the Deviated? column when the departure happens, with a one-line why — it is a log, not a stop.
++**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop.
+ 
+ ## Implement phase (after feature-spec is approved)
+ 
+ Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
+ 
+ 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
+-2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-writing-plans` and `docs/lessons.md`.)
+-3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = after tests only). With the default `none`, show the red→green inline and proceed.
++2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
++3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
+ 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
+ 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
+ 6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
+ 
+ ### Per-requirement review (opt-in)
+ 
+-If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria sections of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
++If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
+ 
+ `Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+ 
+@@ -103,8 +105,8 @@ When a per-requirement checkpoint fires it is a **hard stop**:
+ When every requirement's Done column is ✅:
+ 
+ 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
+-2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the plan declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
+-3. **Run the feature review** (below) per the plan's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
++2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
++3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
+ 4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
+ 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
+    - a green-gates line: full suite green, feature E2E green;
+@@ -122,12 +124,12 @@ The old "integration gate" is gone — the feature E2E at the ship checkpoint *i
+ 
+ ## Feature review
+ 
+-This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the plan's feature-level `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
++This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
+ 
+ **Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
+ 
+ ```bash
+-PACKET="<plan doc's directory>/<plan doc's stem>-review-packet.md"   # beside the plan doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
++PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # beside the design doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
+ {
+   echo "# Review packet: <topic> — feature review"
+   echo
+@@ -137,14 +139,15 @@ PACKET="<plan doc's directory>/<plan doc's stem>-review-packet.md"   # beside th
+   echo "## Changed files"
+   git diff --stat <merge-base>...HEAD
+   echo
+-  echo "## Acceptance criteria (verbatim from the plan)"
+-  sed -n '/^## Requirement 1/,/^## Feature acceptance/p' <plan-doc path> | sed '/^## Feature acceptance/,$d'
++  echo "## Acceptance criteria (verbatim from the design doc)"
++  sed -n '/^### R1/,/^## Feature acceptance/p' <design-doc path> | sed '/^## Feature acceptance/,$d'
++  # legacy plan doc (stem-matched -implementation.md): sed -n '/^## Requirement 1/,/^## Feature acceptance/p' instead of the ### R1 span
+   echo
+   echo "## Feature acceptance (verbatim)"
+-  sed -n '/^## Feature acceptance/,/^### Feature review/p' <plan-doc path> | sed '/^### Feature review/,$d'
++  sed -n '/^## Feature acceptance/,/^### Feature review/p' <design-doc path> | sed '/^### Feature review/,$d'
+   echo
+   echo "## Production-risk notes (verbatim, if any)"
+-  sed -n '/^### Production-risk notes/,/^## /p' <plan-doc path> | sed '/^## /d'
++  sed -n '/^### Production-risk notes/,/^## /p' <design-doc path> | sed '/^## /d'
+   echo
+   echo "## Diff"
+   git diff <merge-base>...HEAD
+@@ -160,7 +163,7 @@ On success, continue assembling the ship checkpoint; once the human approves it,
+ 
+ ## Tags reference
+ 
+-The plan tags each requirement and the feature level:
++The design doc tags each requirement and the feature level:
+ 
+ - **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
+ - **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. The auto-tag default for requirements with non-empty `### Production-risk notes` is `parallel` (see `pwk-brainstorming` for the rule).
+diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
+index 8b76e5a..369305d 100644
+--- a/skills/pwk-finalizing/SKILL.md
++++ b/skills/pwk-finalizing/SKILL.md
+@@ -19,10 +19,10 @@ Ship the completed work.
+ 
+ 1. **Derive the topic set** —
+    - **Umbrella** (a `docs/plans/**/overview.md` exists — excluding docs/plans/completed/, so an archived umbrella is never the one being finalized): read its roster; the set is every part's `<topic>`. The umbrella folder is disposed too.
+-   - **Standalone**: progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. One topic.
++   - **Standalone**: progress file → `Design:` ref → design-doc filename → `<topic>`. One topic. (Legacy progress file: `Plan:` ref → the implementation doc's `Design:` ref → design doc.)
+ 
+    Ambiguous with several designs in flight? Ask.
+-2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md`, `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Crosswalk`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
++2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md` (legacy — a 2.0 feature has none; the glob harmlessly no-ops), `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
+ 
+    - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:
+ 
+diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
+index 4132e46..a6720c7 100644
+--- a/skills/pwk-status/SKILL.md
++++ b/skills/pwk-status/SKILL.md
+@@ -9,15 +9,15 @@ Report on in-flight pipelines in this working tree (a worktree has its own `docs
+ 
+ ## Process
+ 
+-1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md`, `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
+-2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
++1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
++2. For each topic, infer the furthest artifact: only `*-design.md` → execute next; `*-implementation.md` (legacy) or `*-progress.md` → execute, show `done/total`.
+ 3. **Group by umbrella** — for each umbrella `overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
+ 4. Print a compact table, grouped under any umbrellas, e.g.:
+ 
+    ```
+    payments-revamp (umbrella): 2 in-flight · 1 not-started
+      payments-core      execute  2/3 done
+-     payments-ui        plan     —
++     payments-ui        design   —
+      payments-webhooks  not started
+    auth                execute  1/2 done
+    ```
+diff --git a/skills/pwk-writing-plans/SKILL.md b/skills/pwk-writing-plans/SKILL.md
+deleted file mode 100644
+index 5b1e40d..0000000
+--- a/skills/pwk-writing-plans/SKILL.md
++++ /dev/null
+@@ -1,97 +0,0 @@
+----
+-name: pwk-writing-plans
+-description: "Turn a design doc's requirements into a behavioral spec — acceptance criteria + integration tests per requirement. Use after pwk-brainstorming, before pwk-executing-tasks. Use when the user says 'let's plan', 'write a plan', 'break this down', or after a brainstorm when ready to move to implementation."
+----
+-
+-# Writing Plans
+-
+-Turn the design doc's requirements into a **behavioral spec** the executor implements against.
+-
+-One design doc = one plan = one PR. The plan lists **all** the design's requirements in build order; the executor builds them one at a time.
+-
+-The executor runs the **feature-gate flow**: it writes the feature-acceptance E2E first, implements the requirements back-to-back, then runs one feature-level review. Per-requirement checkpoints/reviews happen only for requirements you tag (default off) — so tag only the slices that genuinely need a human stop or a focused review.
+-
+-Your writes go into `docs/plans/` and nowhere else. Source code and configuration get written later, in `pwk-executing-tasks` — this phase produces the document the executor builds from.
+-
+-## Process
+-
+-1. **Find the design doc** — glob `docs/plans/**/*-design.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived designs are not plannable). If none, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. **Read `docs/lessons.md`** if it exists — known patterns belong in the acceptance criteria. **Umbrella part?** If a `docs/plans/**/overview.md` exists (excluding docs/plans/completed/ — an archived umbrella is never the umbrella being planned) and this design is one of its roster parts, read the overview for the umbrella goal + roster — plan this part as one slice, composing with what earlier parts already established in the code. Note the umbrella in the plan's Overview so the executor inherits the context.
+-2. **Create or reuse the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. Otherwise `git checkout -b <topic>` — the umbrella's `<topic>` if this is part of an overview, else the design doc's `<topic>` (branch creation is allowed in the plan phase). Design + plan docs live on this branch, committed at the start of `pwk-executing-tasks`.
+-3. **Read the `## Requirements` list** — the plan covers **all** of them. If the design has none, derive requirements from its described behaviors and confirm with the human before proceeding. A requirement whose testable acceptance criteria cannot be derived without inventing behavior is bounced back to `/skill:pwk-brainstorming` naming the specific gap — never plan on an assumption.
+-4. **Write the plan** — for each requirement:
+-   - **Crosswalk** — immediately after `## Overview`, emit `## Crosswalk`: a table `| R# | Plan section | Tests |` with one row per design requirement (R# = the design's numbering from its at-a-glance `## Requirements` list; Tests = that requirement's test names from the plan). Placement is load-bearing: the crosswalk sits strictly before `## Requirement 1` (between `## Overview` and `## Setup`, if present) so the review-packet sed spans (`## Requirement 1` → `## Feature acceptance` → `### Feature review`) stay untouched.
+-   - **Acceptance criteria** — `Given/When/Then` behavioral statements defining "done". Write observable behaviors, not implementation steps; cover edge and error cases.
+-   - **Integration tests** — test name + what each asserts. This is the spec the executor writes tests from.
+-   - **Meaningful tests** — write acceptance criteria and tests as observable behavior: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
+-   - **`### Checkpoints: none | full | spec`** — how many human stops. `none` = no per-requirement stop (default — the feature gate covers it); `full` = tests + complete stops; `spec` = tests stop only. Flag a requirement `full` or `spec` when it contains complex logic or is the main part of the feature — where a human look at the slice is worth the stop.
+-   - **`### Review: skip | parallel | inline`** — `skip` = no per-requirement review (default — the feature-level review covers it); `parallel` = four reviewers via delegated parallel roles; `inline` = one `pwk-code-review` pass. The auto-tag bullet below is the single source of truth for risky-requirement tagging.
+-   - **`### Feature review: parallel | inline`** — one review over the **whole feature diff**, always present (the single thorough pass). `parallel` (default — thoroughness lives here, since it is the only review in the common case); `inline` for small features.
+-   - Tag every requirement — missing tags default to `none` / `skip`. **`spec` requires at least `inline` review** — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
+-   - **Production-risk notes** — carry forward the design's `## Production-risk areas`, if any.
+-   - **Auto-tag rule (moved)** — `pwk-brainstorming` owns the auto-tag rule (a requirement with a non-empty `### Production-risk notes` section gets `### Review: parallel`; default `skip` otherwise). The tags arrive in the design doc's requirement blocks — carry them through unchanged; never re-derive.
+-   - **Challenge the design first** *(if production-risk areas exist)* — stress-test the design against the flagged risks before writing criteria. If a risk invalidates a design choice, stop and return to `/skill:pwk-brainstorming` rather than planning around a flawed design.
+-   - **Ordering** — dependencies come **earlier** in the list; the executor runs in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
+-
+-   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md` (an umbrella part saves into its umbrella folder as `<part>-implementation.md`):
+-
+-   ```markdown
+-   # Implementation Plan: <topic>
+-
+-   ## Overview
+-   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
+-   Umbrella: docs/plans/<date>-<umbrella>/overview.md   *(umbrella part only — else omit)*
+-
+-   ## Crosswalk
+-
+-   | R# | Plan section | Tests |
+-   |----|--------------|-------|
+-   | 1 | Requirement 1: <name> | `<test name> …` |
+-
+-   ## Requirement 1: <name>
+-
+-   ### Acceptance criteria
+-   - Given … When … Then …
+-   - Given … When … Then … (edge cases)
+-
+-   ### Integration tests
+-   - `should <behavior>` — asserts <observable outcome>
+-   - `should <error case>` — asserts <failure outcome>
+-
+-   ### Checkpoints: none | full | spec
+-   ### Review: skip | parallel | inline
+-
+-   ### Production-risk notes
+-   - <from the design's Production-risk areas, if any>
+-
+-   ## Requirement 2: <name>
+-   …
+-
+-   ## Feature acceptance
+-   The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. Derived from the design doc: one end-to-end test exercising the requirements *together*. Make it concrete — a named test + the assertion that proves the composed behavior:
+-   - `should <the PRD's end-to-end claim>` — Given <starting state>, When <trigger>, Then <composed outcome across requirements>.
+-   ### Feature review: parallel | inline
+-   One review over the whole feature diff (always). Default `parallel`; `inline` for small features.
+-   ```
+-
+-   **If the design has no `## Feature acceptance` section**, stop and ask the human to run `/skill:pwk-brainstorming` to add one — the feature's definition-of-done is missing. (A trivial single-requirement design may fold the scenario into that requirement's criteria; note it and skip the separate section.)
+-
+-   **If `## Production-risk areas` flagged** schema migrations, new dependencies, external APIs, or seed data, emit a `## Setup` section between `## Overview` and `## Requirement 1` (dependencies, migrations, seed data, and how to verify setup worked).
+-
+-5. **Audit before presenting:**
+-   - Every requirement has criteria **and** matching tests, a checkpoint tag, a review tag.
+-   - The `## Crosswalk` covers every design requirement R# exactly once — none dropped, none duplicated.
+-   - No `spec` + `skip` combination.
+-   - A `## Feature acceptance` section exists as the primary enforced spec (or the trivial-fold note).
+-   - A feature-level `### Feature review` tag is present.
+-   - Per-requirement tags default to `none` / `skip`; only requirements with complex logic, the main part of the feature, or production-risk are flagged heavier.
+-   - Production-risk areas from the design are reflected.
+-6. **Workspace isolation** — you're on the `<topic>` branch. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
+-7. **Present the plan** — the human reads a **one-line confirmation**, not the full plan: `Plan covers R1–R<N>; tags: <non-default tags>` plus the feature-acceptance test name. The full plan is available on request. Wait for approval. On approval, hand off: "Ready to execute? Run `/skill:pwk-executing-tasks`" (running it is what exits the gated plan phase).
+-
+-## What belongs in the plan — and what stays out
+-
+-The plan carries: observable behavior (acceptance criteria), the test names + assertions that prove it, and per-requirement tags. Everything about implementation *how* — code, signatures, file-by-file breakdowns, micro-task decomposition — stays with the executor, which picks structure against the spec. That's the division that keeps the plan stable when a detail shifts mid-implementation.
+-
+-## After the plan
+-
+-Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"
+\ No newline at end of file
+diff --git a/tests/code-digest.test.ts b/tests/code-digest.test.ts
+index c55ba39..3949dc5 100644
+--- a/tests/code-digest.test.ts
++++ b/tests/code-digest.test.ts
+@@ -8,7 +8,6 @@ const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+ 
+ const DISCOVERY_SITES = [
+   "skills/pwk-brainstorming/SKILL.md",
+-  "skills/pwk-writing-plans/SKILL.md",
+   "skills/pwk-executing-tasks/SKILL.md",
+   "skills/pwk-status/SKILL.md",
+   "skills/pwk-finalizing/SKILL.md",
+@@ -99,9 +98,7 @@ describe("code-digest per-slice", () => {
+     const sites: Array<[string, string]> = [
+       ["skills/pwk-status/SKILL.md", "1. Glob `docs/plans/**/*-design.md`"],
+       ["skills/pwk-brainstorming/SKILL.md", "**Discovery**"],
+-      ["skills/pwk-executing-tasks/SKILL.md", "**Find the plan**"],
+-      ["skills/pwk-writing-plans/SKILL.md", "**Find the design doc**"],
+-      ["skills/pwk-writing-plans/SKILL.md", "**Umbrella part?**"],
++      ["skills/pwk-executing-tasks/SKILL.md", "**Find the doc**"],
+       ["skills/pwk-finalizing/SKILL.md", "Read **every** relevant progress file"],
+       ["skills/pwk-finalizing/SKILL.md", "**Umbrella** (a `docs/plans/**/overview.md` exists"],
+     ];
+@@ -215,12 +212,6 @@ describe("code-digest per-slice", () => {
+     expect(step7).toMatch(/back through the assumption gate/);
+   });
+ 
+-  it("should bounce un-derivable requirements to brainstorm", () => {
+-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
+-    expect(writingPlans).toContain(CODE_DIGEST_MARKERS.bounceToBrainstorm);
+-    expect(writingPlans).toMatch(/inventing behavior/);
+-    expect(writingPlans).toMatch(/naming the specific gap|name the specific gap/);
+-  });
+   it("should mirror digest, exclusion, and frontier wording in user docs", () => {
+     for (const doc of MIRROR_DOCS) {
+       const content = readRepo(doc);
+@@ -277,9 +268,6 @@ describe("code-digest feature (E2E)", () => {
+     const principlesLine = brainstorming.match(/## Principles\n\n- [^\n]*/)?.[0];
+     if (!principlesLine) throw new Error("brainstorming: Principles list not found");
+     expect(principlesLine).not.toContain("One question at a time"); // defining line only
+-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
+-    expect(writingPlans).toContain(CODE_DIGEST_MARKERS.bounceToBrainstorm);
+-    expect(writingPlans).toMatch(/inventing behavior/);
+ 
+     // R10 — the user docs mirror all three behaviors.
+     for (const doc of MIRROR_DOCS) {
+diff --git a/tests/human-review-digests.test.ts b/tests/human-review-digests.test.ts
+index 1cbd2f8..d9cdad3 100644
+--- a/tests/human-review-digests.test.ts
++++ b/tests/human-review-digests.test.ts
+@@ -1,4 +1,4 @@
+-import { readFileSync } from "node:fs";
++import { existsSync, readFileSync } from "node:fs";
+ import { dirname, join } from "node:path";
+ import { fileURLToPath } from "node:url";
+ import { describe, expect, it } from "vitest";
+@@ -23,7 +23,6 @@ const USER_DOCS = [
+ 
+ const GLOB_SITES = [
+   "skills/pwk-brainstorming/SKILL.md",
+-  "skills/pwk-writing-plans/SKILL.md",
+   "skills/pwk-executing-tasks/SKILL.md",
+   "skills/pwk-status/SKILL.md",
+   "skills/pwk-finalizing/SKILL.md",
+@@ -44,13 +43,19 @@ describe("human review digests feature (E2E)", () => {
+     expect(brainstorming).toContain("In short:");
+     expect(brainstorming).toMatch(/plain language/i);
+ 
+-    // R2 — plans carry a crosswalk the human confirms in one line, placed strictly
+-    // before Requirement 1 so the review-packet sed spans are untouched.
+-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
+-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalk);
+-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkTable);
+-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkPlacement);
+-    expect(writingPlans).toContain(DIGEST_MARKERS.oneLineConfirmation);
++    // R2 — the crosswalk and its plan phase are gone entirely (pwk 2.0): the
++    // design doc's ### R<n> blocks are the map; no skill restates one.
++    expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);
++    for (const site of [
++      "skills/pwk-brainstorming/SKILL.md",
++      "skills/pwk-executing-tasks/SKILL.md",
++      "skills/pwk-status/SKILL.md",
++      "skills/pwk-finalizing/SKILL.md",
++      "skills/pwk-code-review/SKILL.md",
++      "skills/pwk-diagnose/SKILL.md",
++    ]) {
++      expect(readRepo(site), site).not.toMatch(/crosswalk/i);
++    }
+ 
+     // R3 — the progress file carries an execution summary filled as requirements
+     // land, and the ship checkpoint presents digest + coverage, diff on request.
+@@ -110,7 +115,7 @@ describe("human review digests feature (E2E)", () => {
+     }
+     const readme = readRepo("README.md");
+     expect(readme).toContain(DIGEST_MARKERS.diffOnRequest);
+-    expect(readme).toContain(DIGEST_MARKERS.crosswalk);
++    expect(readme).not.toMatch(/crosswalk/i);
+     const agents = readRepo("AGENTS.md");
+     expect(agents).toContain(DIGEST_MARKERS.umbrellaFolder);
+   });
+diff --git a/tests/integration-guidance.test.ts b/tests/integration-guidance.test.ts
+index acb0160..d314015 100644
+--- a/tests/integration-guidance.test.ts
++++ b/tests/integration-guidance.test.ts
+@@ -12,7 +12,6 @@ const portableSkills = [
+   read("skills/pwk-brainstorming/SKILL.md"),
+   read("skills/pwk-executing-tasks/SKILL.md"),
+   read("skills/pwk-code-review/SKILL.md"),
+-  read("skills/pwk-writing-plans/SKILL.md"),
+ ];
+ 
+ describe("cross-host delegation guidance", () => {
+diff --git a/tests/markers.mjs b/tests/markers.mjs
+index 394fcc2..086594b 100644
+--- a/tests/markers.mjs
++++ b/tests/markers.mjs
+@@ -9,10 +9,6 @@
+ export const DIGEST_MARKERS = {
+   atAGlance: "## At a glance",
+   atAGlanceTable: "| R# | Requirement in one line | Risk |",
+-  crosswalk: "## Crosswalk",
+-  crosswalkTable: "| R# | Plan section | Tests |",
+-  crosswalkPlacement: "strictly before `## Requirement 1`",
+-  oneLineConfirmation: "one-line confirmation",
+   execSummary: "## Execution summary",
+   execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
+   fillAsYouLand: "same step as marking",
+diff --git a/tests/review-packet.test.ts b/tests/review-packet.test.ts
+index 2e13575..3237174 100644
+--- a/tests/review-packet.test.ts
++++ b/tests/review-packet.test.ts
+@@ -8,45 +8,48 @@ import { describe, expect, it } from "vitest";
+ const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
+ 
+ /** The recipe commands exactly as they must appear in the executing skill. */
+-const CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
++const CRITERIA_CMD = "sed -n '/^### R1/,/^## Feature acceptance/p'";
++const LEGACY_CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
+ const FA_CMD = "sed -n '/^## Feature acceptance/,/^### Feature review/p'";
+ const NOTES_CMD = "sed -n '/^### Production-risk notes/,/^## /p'";
+ 
+-/** A plan doc shaped like the template pwk-writing-plans emits. */
+-const PLAN_FIXTURE = [
+-  "# Implementation Plan: demo",
++/** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
++const DESIGN_FIXTURE = [
++  "# demo",
+   "",
+-  "## Overview",
+-  "Design: docs/plans/demo-design.md",
++  "## At a glance",
+   "",
+-  "## Crosswalk",
++  "summary text",
+   "",
+-  "| R# | Plan section | Tests |",
+-  "|----|--------------|-------|",
+-  "| 1 | Requirement 1: alpha | should-a |",
+-  "| 2 | Requirement 2: beta | should-b |",
++  "| R# | Requirement in one line | Risk |",
++  "|----|--------------------------|------|",
++  "| 1 | alpha | low |",
++  "| 2 | beta | med |",
+   "",
+-  "## Setup",
++  "## Requirements",
+   "",
+-  "n/a",
++  "### R1: alpha",
++  "alpha does one thing",
+   "",
+-  "## Requirement 1: alpha",
+-  "",
+-  "### Acceptance criteria",
++  "**Acceptance criteria** — Given/When/Then criteria:",
+   "- Given a, When b, Then c.",
+   "",
++  "### Checkpoints: none",
++  "### Review: skip",
++  "",
+   "### Production-risk notes",
+   "- alpha: touches auth session storage",
+   "- alpha: rotation window must stay under 30s",
+   "",
+-  "### Checkpoints: none",
+-  "### Review: skip",
+-  "",
+-  "## Requirement 2: beta",
++  "### R2: beta",
++  "beta does another thing",
+   "",
+-  "### Acceptance criteria",
++  "**Acceptance criteria** — Given/When/Then criteria:",
+   "- Given d, When e, Then f.",
+   "",
++  "### Checkpoints: none",
++  "### Review: skip",
++  "",
+   "### Production-risk notes",
+   "- touches redis: hot path under login storms",
+   "- TTL policy must match session rotation",
+@@ -71,37 +74,40 @@ describe("review packet recipe", () => {
+     expect((executing.match(/review-packet\.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
+     expect(executing).toContain("no packet byte passes through model output");
+     expect(executing).toContain(CRITERIA_CMD);
++    expect(executing).toContain(LEGACY_CRITERIA_CMD);
+     expect(executing).toContain(FA_CMD);
+     expect(executing).toContain(NOTES_CMD);
+     expect(executing).toContain("git diff <merge-base>...HEAD");
+     expect(executing).toMatch(/never appears in spawn arguments/i);
++    expect(executing).toContain("verbatim from the design doc");
+   });
+ 
+-  it("should extract criteria verbatim from a plan-template fixture", () => {
++  it("should extract criteria verbatim from a design-template fixture", () => {
+     const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
+-    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);
++    writeFileSync(join(dir, "design.md"), DESIGN_FIXTURE);
+ 
+-    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
++    const criteria = execSync(`${CRITERIA_CMD} design.md | sed '/^## Feature acceptance/,$d'`, {
+       cwd: dir,
+     }).toString();
+-    expect(criteria).toContain("## Requirement 1: alpha");
++    expect(criteria).toContain("### R1: alpha");
+     expect(criteria).toContain("- Given a, When b, Then c.");
+-    expect(criteria).toContain("## Requirement 2: beta");
++    expect(criteria).toContain("### R2: beta");
+     expect(criteria).toContain("- Given d, When e, Then f.");
+     expect(criteria).toContain("### Production-risk notes");
+     expect(criteria).toContain("hot path under login storms");
+     expect(criteria).toContain("monitor INCR miss rate"); // >3 lines: range capture, not grep -A3 truncation
+     expect(criteria).not.toContain("## Feature acceptance");
+     expect(criteria).not.toContain("Feature review: parallel");
++    expect(criteria).not.toContain("## At a glance");
+ 
+-    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
++    const notes = execSync(`${NOTES_CMD} design.md | sed '/^## /d'`, { cwd: dir }).toString();
+     expect(notes).toContain("### Production-risk notes");
+     expect(notes).toContain("alpha: touches auth session storage"); // first group captured
+     expect(notes).toContain("TTL policy must match session rotation"); // second group captured
+     expect(notes).toContain("monitor INCR miss rate");
+     expect(notes).not.toContain("## Feature acceptance");
+ 
+-    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
++    const featureAcceptance = execSync(`${FA_CMD} design.md | sed '/^### Feature review/,$d'`, {
+       cwd: dir,
+     }).toString();
+     expect(featureAcceptance).toContain("## Feature acceptance");
+@@ -109,26 +115,6 @@ describe("review packet recipe", () => {
+     expect(featureAcceptance).not.toContain("Feature review: parallel");
+   });
+ 
+-  it("should keep packet spans intact with a crosswalk present", () => {
+-    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-xw-"));
+-    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);
+-
+-    // The three sed commands are byte-identical to the pre-crosswalk recipe (see above);
+-    // the crosswalk sits before `## Requirement 1`, so no span may reach it.
+-    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
+-      cwd: dir,
+-    }).toString();
+-    expect(criteria).toContain("## Requirement 1: alpha");
+-    expect(criteria).not.toContain("## Crosswalk");
+-    expect(criteria).not.toContain("| 1 | Requirement 1: alpha | should-a |");
+-    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
+-    expect(notes).not.toContain("Crosswalk");
+-    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
+-      cwd: dir,
+-    }).toString();
+-    expect(featureAcceptance).not.toContain("Crosswalk");
+-  });
+-
+   it("should scope per-requirement reviews to the requirement", () => {
+     const executing = readExecuting();
+     expect(executing).toMatch(
+diff --git a/tests/setup-command.test.ts b/tests/setup-command.test.ts
+index 48010cb..ffc8e40 100644
+--- a/tests/setup-command.test.ts
++++ b/tests/setup-command.test.ts
+@@ -234,7 +234,7 @@ describe("/pwk-setup", () => {
+   it("refuses setup in brainstorm and plan phases even when the manual guard is off", async () => {
+     const command = harness.commands.get("pwk-setup");
+ 
+-    for (const skill of ["pwk-brainstorming", "pwk-writing-plans"] as const) {
++    for (const skill of ["pwk-brainstorming"] as const) {
+       const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
+       await harness.handlers.get("input")?.({ text: `/skill:${skill}` }, {});
+       await harness.commands.get("pwk-guard")?.handler("off", { ui: { notify() {} } });
+diff --git a/tests/skill-delegation-contract.test.ts b/tests/skill-delegation-contract.test.ts
+index a60992f..16ea753 100644
+--- a/tests/skill-delegation-contract.test.ts
++++ b/tests/skill-delegation-contract.test.ts
+@@ -3,12 +3,7 @@ import { describe, expect, it } from "vitest";
+ 
+ const brainstorming = readFileSync("skills/pwk-brainstorming/SKILL.md", "utf8");
+ const executing = readFileSync("skills/pwk-executing-tasks/SKILL.md", "utf8");
+-const relatedSkills = [
+-  brainstorming,
+-  executing,
+-  readFileSync("skills/pwk-code-review/SKILL.md", "utf8"),
+-  readFileSync("skills/pwk-writing-plans/SKILL.md", "utf8"),
+-];
++const relatedSkills = [brainstorming, executing, readFileSync("skills/pwk-code-review/SKILL.md", "utf8")];
+ 
+ describe("portable skill delegation contract", () => {
+   it("requests logical recon capability with safety constraints and fallback", () => {
+diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
+index 0419869..3bef1db 100644
+--- a/tests/skill-lint.mjs
++++ b/tests/skill-lint.mjs
+@@ -7,7 +7,7 @@
+  *
+  * Run via `npm run skill-lint` (or as part of `npm run check`).
+  */
+-import { readdirSync, readFileSync, statSync } from "node:fs";
++import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
+ import { dirname, join, resolve } from "node:path";
+ import { fileURLToPath } from "node:url";
+ import { CODE_DIGEST_MARKERS, DIGEST_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";
+@@ -86,40 +86,39 @@ function vocabOf(text, kind) {
+ }
+ 
+ console.log("tag vocabulary:");
+-const wp = loadSkills().find((s) => s.name === "pwk-writing-plans");
++const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
+ const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
+-if (!wp) fail("pwk-writing-plans skill missing");
++if (!bs) fail("pwk-brainstorming skill missing");
+ if (!et) fail("pwk-executing-tasks skill missing");
+-if (wp && et) {
++if (bs && et) {
+   for (const [kind, vocab] of [
+     ["checkpoint", CHECKPOINT_VOCAB],
+     ["review", REVIEW_VOCAB],
+   ]) {
+-    const wpV = vocabOf(wp.content, kind);
++    const bsV = vocabOf(bs.content, kind);
+     const etV = vocabOf(et.content, kind);
+     const label = kind === "checkpoint" ? "checkpoint" : "review";
+     for (const v of vocab) {
+-      if (!wpV.has(v)) fail(`pwk-writing-plans: ${label} vocab missing "${v}"`);
++      if (!bsV.has(v)) fail(`pwk-brainstorming: ${label} vocab missing "${v}"`);
+       if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
+     }
+     // No stray tokens
+-    for (const t of wpV) if (!vocab.includes(t)) fail(`pwk-writing-plans: unknown ${label} token "${t}"`);
++    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${label} token "${t}"`);
+     for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${label} token "${t}"`);
+-    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across writing-plans + executing-tasks`);
++    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across brainstorming + executing-tasks`);
+   }
+ }
+ 
+-// --- Check 3: plan template emits what executing-tasks parses ---
+-console.log("plan template coverage:");
+-if (wp && et) {
+-  const templateNeeds = ["### Checkpoints", "### Review", "## Requirement", "## Setup"];
++// --- Check 3: the design-doc template emits what executing-tasks parses ---
++console.log("design template coverage:");
++if (bs && et) {
++  const templateNeeds = ["### Checkpoints", "### Review", "### R", "## Setup"];
+   for (const tok of templateNeeds) {
+-    // The writing-plans template should emit each; executing-tasks should reference each.
+-    const inTemplate = wp.content.includes(tok);
+-    const inConsumer = et.content.includes(tok.replace("### ", "### ").replace("## ", "## "));
+-    if (!inTemplate) fail(`pwk-writing-plans template missing "${tok}"`);
++    // The brainstorming template should emit each; executing-tasks should reference each.
++    const inTemplate = bs.content.includes(tok);
++    if (!inTemplate) fail(`pwk-brainstorming template missing "${tok}"`);
+     if (!et.content.includes(tok)) fail(`pwk-executing-tasks doesn't reference "${tok}"`);
+-    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by writing-plans, parsed by executing-tasks`);
++    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by brainstorming, parsed by executing-tasks`);
+   }
+ }
+ 
+@@ -141,10 +140,10 @@ for (const f of docsToCheck) {
+   else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
+ }
+ // And in the skills themselves
+-if (wp && /\bspec\b/.test(wp.content) && /requires at least `inline`/.test(wp.content)) {
+-  ok("pwk-writing-plans: documents spec requires inline review");
+-} else if (wp) {
+-  fail("pwk-writing-plans: missing spec+inline guard note");
++if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
++  ok("pwk-brainstorming: documents spec requires inline review");
++} else if (bs) {
++  fail("pwk-brainstorming: missing spec+inline guard note");
+ }
+ if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
+   ok("pwk-executing-tasks: documents spec requires inline review");
+@@ -153,19 +152,15 @@ if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
+ }
+ 
+ // --- Check 5: Feature acceptance contract across the pipeline ---
+-// brainstorm emits `## Feature acceptance` in the design doc; writing-plans derives it
+-// into the plan and checks for it at audit; executing-tasks runs it at the integration gate.
+-// All three must use the same section name so the contract is followable.
++// brainstorm emits `## Feature acceptance` in the design doc; executing-tasks writes it
++// as the E2E and gates on it. Both must use the same section name so the contract is followable.
+ console.log("feature acceptance contract:");
+-const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
+ // A real section header line: optional leading indent, then `## Feature acceptance`,
+ // NOT wrapped in backticks (prose mentions like `## Feature acceptance` don't count).
+ const faHeader = /^[ \t]*## Feature acceptance\b/m;
+ if (!bs) fail("pwk-brainstorming skill missing");
+ else if (faHeader.test(bs.content)) ok("pwk-brainstorming: emits `## Feature acceptance` in the design doc");
+ else fail("pwk-brainstorming: missing `## Feature acceptance` section header");
+-if (wp && faHeader.test(wp.content)) ok("pwk-writing-plans: derives `## Feature acceptance` into the plan + audits it");
+-else if (wp) fail("pwk-writing-plans: missing `## Feature acceptance` section header");
+ if (et && /Feature acceptance/.test(et.content))
+   ok("pwk-executing-tasks: runs the feature-acceptance test at the integration gate");
+ else if (et) fail("pwk-executing-tasks: missing `## Feature acceptance` at the integration gate");
+@@ -235,9 +230,9 @@ if (bs && /^## Umbrella\b/m.test(bs.content))
+ else fail("pwk-brainstorming: missing `## Umbrella` section (multi-design-doc, one PR)");
+ if (bs && /status-free/i.test(bs.content)) ok("pwk-brainstorming: defines the overview as a status-free roster");
+ else fail("pwk-brainstorming: overview must be documented as status-free");
+-if (wp && /reuse/i.test(wp.content) && /umbrella/i.test(wp.content))
+-  ok("pwk-writing-plans: documents branch reuse for umbrella later parts");
+-else fail("pwk-writing-plans: missing umbrella branch-reuse note");
++if (et && /reuse/i.test(et.content) && /umbrella/i.test(et.content))
++  ok("pwk-executing-tasks: documents branch reuse for umbrella later parts");
++else fail("pwk-executing-tasks: missing umbrella branch-reuse note");
+ if (et && /umbrella/i.test(et.content) && /next part/i.test(et.content))
+   ok("pwk-executing-tasks: suggests finalize or brainstorm-next keyed on the overview roster");
+ else fail("pwk-executing-tasks: missing umbrella post-gate suggestion logic");
+@@ -267,8 +262,8 @@ else fail("guard references a 'decompose' phase — umbrella should add no phase
+ const phaseMatch = guardSrc.match(/SKILL_TO_PHASE[\s\S]*?\{([\s\S]*?)\}/);
+ const phaseBlock = phaseMatch ? phaseMatch[1] : "";
+ const gatedSkillCount = (phaseBlock.match(/pwk-[\w-]+/g) || []).length;
+-if (gatedSkillCount === 2) ok("SKILL_TO_PHASE unchanged (2 gated skills)");
+-else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 2`);
++if (gatedSkillCount === 1) ok("SKILL_TO_PHASE unchanged (1 gated skill — the design phase)");
++else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 1`);
+ 
+ // --- Check 9: feature-gate execution model (grown per-requirement) ---
+ // Feature-acceptance E2E is the primary gate; per-requirement checkpoints/reviews are opt-in
+@@ -279,11 +274,11 @@ const fgMark = (file, content, marker, label) => {
+   if (content?.includes(marker)) ok(`${file}: ${label}`);
+   else fail(`${file}: missing ${label} — marker "${marker}"`);
+ };
+-// Requirement 1 — pwk-writing-plans tag defaults + feature-level review
+-if (wp) {
+-  fgMark("pwk-writing-plans", wp.content, "### Feature review", "feature-level review tag");
+-  fgMark("pwk-writing-plans", wp.content, "default to `none` / `skip`", "flipped per-requirement defaults");
+-  fgMark("pwk-writing-plans", wp.content, "primary enforced spec", "Feature acceptance as primary spec");
++// Requirement 1 — brainstorming tag defaults + feature-level review
++if (bs) {
++  fgMark("pwk-brainstorming", bs.content, "### Feature review", "feature-level review tag");
++  fgMark("pwk-brainstorming", bs.content, "default to `none` / `skip`", "per-requirement defaults");
++  fgMark("pwk-brainstorming", bs.content, "primary enforced spec", "Feature acceptance as primary spec");
+ }
+ // Requirement 2 — pwk-executing-tasks feature-gate flow
+ if (et) {
+@@ -292,8 +287,8 @@ if (et) {
+   fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
+   fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
+ }
+-// Requirement 3 — meaningful-test rules mirrored across writing-plans, executing-tasks, lessons
+-fgMark("pwk-writing-plans", wp.content, "Test observable behavior", "meaningful-test rule (writing-plans)");
++// Requirement 3 — meaningful-test rules mirrored across brainstorming, executing-tasks, lessons
++fgMark("pwk-brainstorming", bs?.content, "Test observable behavior", "meaningful-test rule (brainstorming)");
+ fgMark("pwk-executing-tasks", et.content, "Test observable behavior", "meaningful-test rule (executing-tasks)");
+ const lessonsMd = readFileSync(join(root, "docs/lessons.md"), "utf8");
+ fgMark("docs/lessons.md", lessonsMd, "Test observable behavior", "meaningful-test rule (lessons)");
+@@ -427,12 +422,12 @@ if (bs) {
+     ok("pwk-brainstorming: auto-tag rule is single-source (other skills do not restate it)");
+   }
+ }
+-// R3: pwk-executing-tasks must reference pwk-writing-plans for the auto-tag rule (not restate).
++// R3: pwk-executing-tasks must reference pwk-brainstorming for the auto-tag rule (not restate).
+ if (et) {
+-  if (/pwk-writing-plans/.test(et.content)) {
+-    ok("pwk-executing-tasks: references pwk-writing-plans (single source of truth)");
++  if (/pwk-brainstorming/.test(et.content)) {
++    ok("pwk-executing-tasks: references pwk-brainstorming (single source of truth)");
+   } else {
+-    fail("pwk-executing-tasks: must reference pwk-writing-plans (do not restate the auto-tag rule)");
++    fail("pwk-executing-tasks: must reference pwk-brainstorming (do not restate the auto-tag rule)");
+   }
+ }
+ 
+@@ -467,12 +462,7 @@ if (bs) {
+   // pwk 2.0 R2 — decisions-first At a glance: summary, then Key decisions (honest-empty
+   // rejected-alternative clauses — never manufactured), then the R#/risk table.
+   fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.keyDecisions, "decisions-first at-a-glance");
+-  fgMark(
+-    "pwk-brainstorming",
+-    bs.content,
+-    SINGLE_DOC_MARKERS.neverManufactured,
+-    "honest-empty rejected alternatives",
+-  );
++  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.neverManufactured, "honest-empty rejected alternatives");
+   const glanceDecisionsIdx = bs.content.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
+   const glanceTableIdx = bs.content.indexOf(DIGEST_MARKERS.atAGlanceTable);
+   if (glanceDecisionsIdx !== -1 && glanceTableIdx > glanceDecisionsIdx) {
+@@ -495,20 +485,21 @@ if (bs) {
+   }
+   if (docsOk) ok("user docs mirror the decisions-first At a glance");
+ }
+-// R2 — plans carry a crosswalk (one row per design R#) placed strictly before
+-// `## Requirement 1` so the packet sed spans stay intact; the human confirms in one line.
+-if (wp) {
+-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalk, "crosswalk section mandated");
+-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkTable, "crosswalk table shape");
+-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkPlacement, "crosswalk placement outside sed spans");
+-  fgMark("pwk-writing-plans", wp.content, "exactly once", "crosswalk audit: every R# exactly once");
+-  fgMark(
+-    "pwk-writing-plans",
+-    wp.content,
+-    DIGEST_MARKERS.oneLineConfirmation,
+-    "plan presented as one-line confirmation",
+-  );
++// R2 — the crosswalk is GONE with the plan phase (pwk 2.0): no skill may emit one,
++// and the pwk-writing-plans skill must not exist at all.
++if (existsSync(join(skillsDir, "pwk-writing-plans"))) {
++  fail("pwk-writing-plans: skill still exists — the plan phase was removed in pwk 2.0");
++} else {
++  ok("pwk-writing-plans: removed (no plan phase)");
++}
++let crosswalkFree = true;
++for (const s of loadSkills()) {
++  if (/crosswalk/i.test(s.content)) {
++    fail(`${s.name}: still mentions a crosswalk — the plan-phase artifact is gone`);
++    crosswalkFree = false;
++  }
+ }
++if (crosswalkFree) ok("no skill mentions a crosswalk (plan-phase artifact gone)");
+ // R3 — the progress file carries an execution summary filled as requirements land; the
+ // ship checkpoint merges feature-complete + review: review runs before the one final
+ // approval, presenting digest + coverage table, diff on request.
+@@ -528,7 +519,7 @@ if (et) {
+ }
+ // R5 — umbrella docs live in their own docs/plans/<date>-<umbrella>/ folder; every
+ // discovery site globs recursively; finalize disposes the folder as one unit.
+-const GLOB_SITES = [bs, wp, et, status, fin].filter(Boolean);
++const GLOB_SITES = [bs, et, status, fin].filter(Boolean);
+ for (const s of GLOB_SITES) {
+   fgMark(s.name, s.content, DIGEST_MARKERS.recursiveGlob, "recursive discovery globs");
+ }
+@@ -546,14 +537,6 @@ if (et) {
+     "review phase is set before the review runs (mid-review resume routes in)",
+   );
+ }
+-if (wp) {
+-  fgMark(
+-    "pwk-writing-plans",
+-    wp.content,
+-    "docs/plans/<date>-<umbrella>/overview.md",
+-    "plan template umbrella path is folder-based",
+-  );
+-}
+ if (fin) {
+   fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.umbrellaFolder, "umbrella folder disposal as one unit");
+ }
+@@ -672,8 +655,7 @@ if (et) {
+ const EXCLUSION_SITES = [
+   [status, "1. Glob `docs/plans/**/*-design.md`"],
+   [bs, "**Discovery**"],
+-  [et, "**Find the plan**"],
+-  [wp, "**Find the design doc**"],
++  [et, "**Find the doc**"],
+   [fin, "Read **every** relevant progress file"],
+   [fin, "**Umbrella** (a `docs/plans/**/overview.md` exists"],
+ ];
+@@ -824,11 +806,8 @@ if (bs) {
+     fail("pwk-brainstorming: step 7 must route invented scenario behavior to the gate");
+   }
+ }
+-if (wp) {
+-  fgMark("pwk-writing-plans", wp.content, CODE_DIGEST_MARKERS.bounceToBrainstorm, "planner bounce to brainstorm");
+-  if (/inventing behavior/.test(wp.content)) ok("pwk-writing-plans: bounce names inventing behavior");
+-  else fail("pwk-writing-plans: bounce rule must name inventing behavior");
+-}
++// (pwk 2.0: the planner bounce is gone with the planner — the assumption gate in
++// brainstorm catches underivable criteria in-session; no separate bounce rule remains.)
+ 
+ // --- Summary ---
+ console.log("");
+diff --git a/tests/workflow-guard.test.ts b/tests/workflow-guard.test.ts
+index 6a5e0f3..2f1bac1 100644
+--- a/tests/workflow-guard.test.ts
++++ b/tests/workflow-guard.test.ts
+@@ -75,8 +75,8 @@ describe("isSafeCommand", () => {
+     expect(isSafeCommand("git add .")).toBe(false);
+     expect(isSafeCommand("git commit -m 'msg'")).toBe(false);
+     expect(isSafeCommand("git push")).toBe(false);
+-    // Allowed: creating/switching branches doesn't modify source files; pwk-writing-plans creates the
+-    // feature branch during the plan phase before authoring the plan.
++    // Allowed: creating/switching branches doesn't modify source files; pwk-executing-tasks creates
++    // the feature branch in its pre-flight before implementing.
+     expect(isSafeCommand("git checkout -b feature")).toBe(true);
+     expect(isSafeCommand("git branch feature")).toBe(true);
+     expect(isSafeCommand("git branch -d feature")).toBe(false); // deleting is a mutation
diff --git a/docs/workflow-phases.md b/docs/workflow-phases.md
index fa5e045..92458d9 100644
--- a/docs/workflow-phases.md
+++ b/docs/workflow-phases.md
@@ -1,13 +1,13 @@
 # Workflow Phases
 
-`pi-workflow-kit` has 5 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.
+`pi-workflow-kit` has 4 pipeline skills plus 2 utility skills. You invoke each one explicitly with `/skill:`.
 
 ```
-brainstorm → writing-plans → executing-tasks → finalizing
-                          (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
+brainstorm → executing-tasks → finalizing
+                (feature-gate: write feature E2E → ⏸ feature-spec → implement requirements → feature review → ⏸ ship)
 ```
 
-A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → plan → execute) × N → finalize`).
+A design doc is one PR; a requirement is one testable slice within it. A requirement too big for one design doc but shipping as one PR is an **umbrella**: multiple design docs under one status-free overview, on one branch, finalized once (`(brainstorm → execute) × N → finalize`).
 
 ## brainstorm
 
@@ -16,27 +16,12 @@ A design doc is one PR; a requirement is one testable slice within it. A require
 ```
 
 - Explore requirements and shape the design. Interviews in **frontier rounds**: questions form a dependency tree seeded by a six-dimension checklist; each round asks the full frontier as numbered questions, each with a recommended answer; facts are looked up, only decisions asked; the interview ends when the frontier is empty — nothing left silently assumed — and an assumption gate sweeps the draft before the design is presented.
-- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, opening with a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks, ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
+- Produce `docs/plans/YYYY-MM-DD-<topic>-design.md` — descriptive, the **single buildable artifact**: a `## At a glance` digest for the human (2–4 sentence plain-language summary → **Key decisions**, one line each: decision + why, a `(rejected: …)` clause only when the fork was real → a `| R# | Requirement in one line | Risk |` table, one row per requirement) immediately before the `## Requirements` blocks — one `### R<n>:` block per requirement carrying its one-line behavior, **acceptance criteria** (Given/When/Then incl. edge/error cases) and Checkpoints/Review tags (no test-name lists, no separate plan doc) — ending with a `## Feature acceptance` section (end-to-end scenarios that prove the requirements compose into the PRD's behavior — the feature's definition-of-done).
 - May start an **umbrella** for a requirement too big for one design doc (human-approved): writes the status-free `docs/plans/<date>-<umbrella>/overview.md` (each umbrella in its own folder; roster of parts + build order) and the **first** part's `-design.md` beside it. Later parts are brainstormed one by one against the overview + implemented predecessors.
 - ADRs go to `docs/adr/` (permanent, never archived).
 
 Write boundary: only `docs/plans/` is writable. Source files are hard-blocked.
 
-## writing-plans
-
-```
-/skill:pwk-writing-plans
-```
-
-- Creates the feature branch first (`git checkout -b <topic>`), so design + plan docs live on the branch, not `main`.
-- Reads the design doc's `## Requirements`; for each, derives **acceptance criteria + integration-test cases** (a behavioral spec, no implementation code), lists requirements in build order (dependencies positioned earlier), and challenges the design when `## Production-risk areas` is present. Emits a `## Crosswalk` (R# → plan section → tests) after `## Overview` — the audit checks every design R# appears exactly once, and the human is shown a **one-line confirmation** ("Plan covers R1–R<N>; tags: …"), not the full plan.
-- For an umbrella part, reads the umbrella folder's `overview.md` to plan one slice (composing with earlier parts' code) and reuses the existing feature branch instead of creating a new one.
-- Derives a **`## Feature acceptance` section** in the plan from the design's Feature acceptance — the **primary enforced spec**, an end-to-end test the executor gates on first. If the design has none, stops and asks the human to brainstorm one.
-- Tags the plan: per-requirement `### Checkpoints`/`### Review` default to `none`/`skip` (opt-in), plus an always-on feature-level `### Feature review`. Flags only requirements with complex logic, the main part of the feature, or production-risk. Requirements with `### Production-risk notes` are auto-tagged `### Review: parallel` (see `pwk-writing-plans` for the rule).
-- Produce `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
-
-Write boundary: only `docs/plans/` is writable.
-
 ## executing-tasks
 
 ```
@@ -45,7 +30,7 @@ Write boundary: only `docs/plans/` is writable.
 
 - **Feature-gate flow:** write the feature-acceptance E2E test (red) → **⏸ checkpoint: feature-spec** (human confirms the E2E proves the feature) → implement the requirements back-to-back with full autonomy (the executor chooses structure/signatures/internals) → **feature review** (request the `parallel-review` capability for four logical read-only roles when the host supports it; otherwise run `/skill:pwk-code-review` inline — see [code-review](#code-review)) → **⏸ checkpoint: ship** (full suite + feature E2E green; present the execution summary + code digest + reviewer coverage table; full diff on request).
 - After the review passes, the executor writes a **code digest** into the progress file — plain-language summary, execution flow, gotchas, key files — derived from the review packet; it rides the existing disposal globs.
-- Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the plan tags (default off); see [Proportionality](#proportionality).
+- Per-requirement checkpoints/reviews are **opt-in** — they fire only for requirements the design doc tags (default off); see [Proportionality](#proportionality).
 - **Regression check after each commit** — run the full existing suite to catch cross-requirement regressions immediately. The feature E2E stays red until the last requirement and is gated only at the ship checkpoint (the old integration gate folds into it).
 - Progress tracked in `docs/plans/*-progress.md` (feature phase + requirement checklist).
 
@@ -53,7 +38,7 @@ No write restrictions. All tools available.
 
 ## Proportionality
 
-The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at plan time the human (or planner) tags only the requirements that need it:
+The **feature-gate flow** is the default: write the feature E2E first, implement the requirements, then one feature-level review. Per-requirement ceremony is opt-in — at design time the human tags only the requirements that need it:
 
 - **Checkpoints** — `none` (no per-requirement stop, **default**) | `full` (both stops) | `spec` (tests stop only — cheap spec-correctness gate, implementation covered by review). Test-first is preserved either way: even `none` writes a meaningful test first (red) and implements to green; only the human *stops* are optional. `spec` requires at least `inline` review (never combine with `skip`).
 - **Review** — `skip` (no per-requirement review, **default**) | `parallel` (four fresh-context reviewers) | `inline` (single `pwk-code-review` pass).
diff --git a/extensions/workflow-guard.ts b/extensions/workflow-guard.ts
index 67dedb8..c85caaa 100644
--- a/extensions/workflow-guard.ts
+++ b/extensions/workflow-guard.ts
@@ -17,13 +17,13 @@ import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
 /**
  * Workflow Guard extension.
  *
- * Blocks write/edit outside docs/plans/ and destructive bash during brainstorm and plan phases.
+ * Blocks write/edit outside docs/plans/ and destructive bash during the design phase.
  * Bash uses a simple common-blacklist (DESTRUCTIVE_PATTERNS) — a command is allowed unless it matches
  * a destructive pattern. A short phase reminder is appended after the user's message each turn via
  * before_agent_start. You control phases explicitly via /skill: commands — no auto-detection, no prompts.
  */
 
-type Phase = "brainstorm" | "plan" | null;
+type Phase = "brainstorm" | null;
 
 type DelegationStatus = "completed" | "failed" | "timed-out" | "skipped";
 
@@ -360,7 +360,7 @@ async function promptFastModelChoice(
   return { model: choice, allRoles };
 }
 
-// Destructive commands blocked in brainstorm/plan phases (simple common blacklist)
+// Destructive commands blocked in the design phase (simple common blacklist)
 const DESTRUCTIVE_PATTERNS = [
   /\brm\b/i,
   /\brmdir\b/i,
@@ -384,7 +384,7 @@ const DESTRUCTIVE_PATTERNS = [
   /\bbrew\s+(install|uninstall|upgrade)/i,
   // git add/commit/apply merge files and are blocked below. Plain `git branch`/`checkout`/`switch`
   // only create or move between branches (no source-file changes), so they are intentionally allowed
-  // during gated phases — pwk-writing-plans creates the feature branch before authoring the plan.
+  // during gated phases — executing-tasks creates the feature branch in its pre-flight.
   /\bgit\s+(add|commit|push|pull|merge|rebase|reset|branch\s+-[dD]|stash(?!\s+list)|cherry-pick|revert|tag(?!\s+(-l|--list))|init|clone|apply)/i,
   // Edit-via-bash vectors: in-place editors, patch appliers, find-delete (bypass the write/edit tool block)
   /\bsed\b.*\s-i\b/i,
@@ -473,7 +473,6 @@ export function isSafeCommand(command: string): boolean {
 
 const SKILL_TO_PHASE: Record<string, Phase> = {
   "pwk-brainstorming": "brainstorm",
-  "pwk-writing-plans": "plan",
 };
 
 /** Skills whose invocation exits a gated phase (used by the input handler; exported for tests/
@@ -485,12 +484,11 @@ export const UNLOCK_SKILLS = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code
  *  never invalidates the cached prefix. */
 const PHASE_REMINDERS: Record<Exclude<Phase, null>, string> = {
   brainstorm:
-    "[pi-workflow-kit] BRAINSTORM phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
-  plan: "[pi-workflow-kit] PLAN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
+    "[pi-workflow-kit] DESIGN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
 };
 
 /** Determine if a write/edit to filePath should be blocked during the given phase.
- *  Only writes under docs/plans/ are allowed during brainstorm and plan phases.
+ *  Only writes under docs/plans/ are allowed during the design phase.
  */
 export function shouldBlockFilePath(filePath: string, cwd: string): boolean {
   const absolute = resolve(cwd, filePath);
@@ -653,7 +651,7 @@ export default function (pi: ExtensionAPI) {
         return;
       }
     }
-    // Phase transitions happen only via skills — no message keyword unlocks the plan phase.
+    // Phase transitions happen only via skills — no message keyword unlocks the design phase.
     // Run /skill:pwk-executing-tasks (or another write-needing skill) to leave a gated phase.
     //
     // Unlock list rationale: execute/finalize/code-review/diagnose all need to write source
@@ -722,7 +720,7 @@ export default function (pi: ExtensionAPI) {
     return {
       block: true,
       reason: `⚠️ ${label}: Cannot ${event.toolName} to ${filePath}. Only docs/plans/ is writable${
-        manual ? " under the manual read-only lock" : " during brainstorming and planning"
+        manual ? " under the manual read-only lock" : " during the design phase"
       }.`,
     };
   });
diff --git a/skills/pwk-brainstorming/SKILL.md b/skills/pwk-brainstorming/SKILL.md
index 0d15b3a..50700e1 100644
--- a/skills/pwk-brainstorming/SKILL.md
+++ b/skills/pwk-brainstorming/SKILL.md
@@ -73,7 +73,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
    ### R1: <name>
    <one-line testable behavior — what the feature produces or changes, through its public interface>
 
-   **Acceptance criteria** — Given/When/Then criteria defining "done". Observable behavior only, not implementation steps; cover edge and error cases.
+   **Acceptance criteria** — Given/When/Then criteria defining "done". Test observable behavior — what the feature produces or changes through its public interface; not implementation steps. Cover edge and error cases.
    - Given … When … Then …
    - Given … When … Then … (edge case)
 
@@ -100,7 +100,7 @@ The whole umbrella is one branch and one PR: `pwk-executing-tasks` creates the b
 
    Touches a production-risk area (DB schema/migrations, auth, external APIs, concurrency/batch, uploads/large data flows, Redis/caching/queues)? Add a brief `## Production-risk areas` — `pwk-code-review` audits it per requirement, and finalize's learning sweep reads it.
 
-   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
+   **End with `## Feature acceptance`** — one or more end-to-end `Given/When/Then` scenarios proving the requirements *compose* into the feature. This is the feature's definition-of-done; the human approves it as what "the feature works" means. `pwk-executing-tasks` writes it as the E2E test first and runs it as the **primary enforced spec** (the test it gates on first). The section carries the feature-level `### Feature review: parallel | inline` tag — the one whole-feature review; default `parallel` (thoroughness lives here — it is the only review in the common case), `inline` for small features. Treat "I can write this scenario" as the green light to finish designing — if you can't, keep designing because the requirements don't yet compose into a coherent feature. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate — it may never be silently written into the scenario; an unwritable step means an unspecified requirement, so keep designing.
 
    ```markdown
    ## Feature acceptance
diff --git a/skills/pwk-diagnose/SKILL.md b/skills/pwk-diagnose/SKILL.md
index 1f441f7..bc5974d 100644
--- a/skills/pwk-diagnose/SKILL.md
+++ b/skills/pwk-diagnose/SKILL.md
@@ -7,7 +7,7 @@ description: "Disciplined debugging loop for hard bugs and performance regressio
 
 A 6-phase debugging discipline. Phase 1 is the skill — spend disproportionate effort here.
 
-Invoking `/skill:pwk-diagnose` **exits the gated brainstorm/plan phase** (the workflow guard unlocks) — diagnosis needs to write failing tests and `[DEBUG-…]` instrumentation. If you only wanted read-only investigation, use `/skill:pwk-status` (stays gated) or reinstate the lock with `/pwk-guard on`.
+Invoking `/skill:pwk-diagnose` **exits the gated design phase** (the workflow guard unlocks) — diagnosis needs to write failing tests and `[DEBUG-…]` instrumentation. If you only wanted read-only investigation, use `/skill:pwk-status` (stays gated) or reinstate the lock with `/pwk-guard on`.
 
 ## Phase 1 — Build a feedback loop
 
diff --git a/skills/pwk-executing-tasks/SKILL.md b/skills/pwk-executing-tasks/SKILL.md
index 19976a1..e52acf4 100644
--- a/skills/pwk-executing-tasks/SKILL.md
+++ b/skills/pwk-executing-tasks/SKILL.md
@@ -1,30 +1,32 @@
 ---
 name: pwk-executing-tasks
-description: "Implement a plan via the feature-gate flow: write the feature-acceptance E2E first, implement requirements back-to-back, then one feature-level review. Run after pwk-writing-plans. Per-requirement checkpoints/reviews are opt-in (default off)."
+description: "Implement a design doc via the feature-gate flow: write the feature-acceptance E2E first, implement the ### R<n> requirement blocks back-to-back, then one feature-level review. Run after pwk-brainstorming. Per-requirement checkpoints/reviews are opt-in (default off)."
 ---
 
 # Executing Tasks
 
-Implement the plan from `docs/plans/*-implementation.md` via the **feature-gate flow**. The plan is a behavioral spec (acceptance criteria + integration tests) — you choose structure, signatures, internals; the criteria define *what*, you decide *how*.
+Implement the design doc from `docs/plans/*-design.md` via the **feature-gate flow**. The design doc is the single buildable artifact — its `### R<n>` blocks carry each requirement's acceptance criteria and tags. The criteria define *what*, you decide *how*: structure, signatures, internals are yours.
 
-The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the plan tags (default off); the feature gate covers everything else.
+The feature-acceptance E2E test is the primary enforced gate and the primary enforced spec for the feature. The flow is always on: write the E2E first (red), implement the requirements back-to-back, then run the feature review and pause at the **ship checkpoint** — one fully-informed stop where you present the execution summary and the reviewer coverage table, with the full diff on request. Per-requirement checkpoints and reviews are **opt-in** — they fire only for requirements the design doc tags (default off); the feature gate covers everything else.
+
+**Legacy in-flight features** (created before 2.0): a stem-matched `*-implementation.md` routes the old plan flow — parse its `## Requirement N:` sections instead of ### R<n> blocks; everything else is identical. Discovery covers both suffixes.
 
 ## Before you start
 
 1. **Git state** — `git status` + `git log --oneline -5`; note uncommitted changes.
-2. **Find the plan** — glob `docs/plans/**/*-implementation.md` (recursive — umbrella parts live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived plans are not pending work); if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
-3. **Workspace** — `pwk-writing-plans` already created the branch/worktree. If you're still on `main`, tell the user the workspace wasn't set up and suggest fixing that before executing.
+2. **Find the doc** — glob `docs/plans/**/*-design.md` and `docs/plans/**/*-implementation.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived work is not pending). A stem-matched legacy `*-implementation.md` wins for that topic (an in-flight 1.x feature — old flow). If no doc at all, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. Report one line, e.g. `Found: design "auth" — feature-gate execute (feature-spec done, implementing 2/5)`. A matching `*-progress.md` means this is a **resume** (see [Resume](#resume)).
+3. **Workspace — create the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. If on `main`, `git checkout -b <topic>` — the umbrella's `<topic>` if this design doc is one of an overview's parts, else the design doc's `<topic>`. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
 
 ## First run
 
-1. **Parse the plan** — read every `## Requirement N:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first.
-2. **Setup pre-flight** *(only if the plan has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
-3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the implementation doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
+1. **Parse the design doc** — read every `### R<n>:` heading and its `### Checkpoints` / `### Review` tags (defaults `none` / `skip`), plus the feature-level `### Feature review` tag in the `## Feature acceptance` section. Requirements run in **listed order** (build order); do not reorder. Read the `## Feature acceptance` section — it is the E2E you gate on first. (Legacy plan doc: read `## Requirement N:` headings the same way.)
+2. **Setup pre-flight** *(only if the design doc has a `## Setup` section)* — install dependencies, apply migrations, seed data, then run the existing test suite. **⏸ CHECKPOINT: setup** — present results and wait for approval. Record `setup: done` in the progress-file header so a resume can confirm it rather than assume it.
+3. **Create the progress file** `docs/plans/YYYY-MM-DD-<topic>-progress.md` (same dated stem as the design doc, so `pwk-finalizing`'s glob matches; an umbrella part creates `<part>-progress.md` inside its `docs/plans/<date>-<umbrella>/` folder):
 
    ```markdown
    # Progress: <topic>
 
-   Plan: docs/plans/YYYY-MM-DD-<topic>-implementation.md
+   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
    Branch: <branch>
    Started: <ISO timestamp>
    Last updated: <ISO timestamp>
@@ -52,10 +54,10 @@ The feature-acceptance E2E test is the primary enforced gate and the primary enf
 
    The `## Code digest` is filled once, at the write point in the ship checkpoint — never per requirement. Fill rules: plain language, R# anchors where natural, no test names (the execution-summary rule). `### Flow` uses `A -> B -> C` arrow chains. `### Gotchas` lifts real risks from the review findings — `[ALERT]` only for reviewer-confirmed issues, never invented; with no findings, write `none beyond review findings` and mean it. `### Key files` is capped at 5 pivotal files, one line each: what shifted inside them.
 
-   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`.
+   `Feature phase` is one of: `e2e-written`, `feature-spec-paused`, `implementing (k/N)`, `reviewing`, `ship-paused`, `done`. (A legacy progress file's `Plan:` ref points at its implementation doc — follow that chain instead.)
 
-4. **Commit the plan docs** — `git add docs/plans/ && git commit -m "docs: add implementation plan"`.
-5. **Write the feature-acceptance E2E test (red).** Read the plan's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
+4. **Commit the design docs** — `git add docs/plans/ && git commit -m "docs: add design doc"`.
+5. **Write the feature-acceptance E2E test (red).** Read the design doc's `## Feature acceptance` section and encode it as a real test file; run it; confirm it **fails** (it must — little or none of the feature exists yet). If it passes immediately, the behavior may already exist or the test is wrong — investigate before proceeding.
 6. **⏸ CHECKPOINT: feature-spec** — set `Feature phase: feature-spec-paused`, lead with 1–2 plain-language lines stating **what the E2E proves** ("this test proves that …"), then present the E2E test + failing output, and wait. This is where the human confirms the E2E actually proves the feature (the definition of done). **request changes** → revise, re-run, re-present.
 
 ## Resume
@@ -72,22 +74,22 @@ Read the progress file's `Feature phase`:
 
 Update the matching requirement row directly (not via pattern matching that could corrupt the table). Update `Last updated` and `Feature phase` on every change. The `Per-req ceremony` column records a requirement's tagged checkpoint/review status when it has one (e.g. `⏸ tests`, `🔎 inline`); leave `—` for default (`none`/`skip`) requirements.
 
-**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the plan, fill the Deviated? column when the departure happens, with a one-line why — it is a log, not a stop.
+**Execution summary rows are written in the same step as marking a requirement ✅** — never retrofitted at the end. "How it was built" = one or two plain sentences: what it does now + the approach actually taken; file names sparingly; **no test names, no code** (the human reads this at the ship checkpoint — big picture only). If the implementation departs from the design, fill the Deviated? column **at deviation time** (when the departure happens), with a one-line why — it is a log, not a stop.
 
 ## Implement phase (after feature-spec is approved)
 
 Set `Feature phase: implementing (0/N)` and work the requirements in listed order. For each:
 
 1. **Mark the requirement 🔄** (Done column) and read its `### Checkpoints` / `### Review` tags.
-2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-writing-plans` and `docs/lessons.md`.)
-3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = after tests only). With the default `none`, show the red→green inline and proceed.
+2. **Write a meaningful test (red), then implement (green)** — TDD discipline. Encode the requirement's acceptance criteria as a real test through the public interface; run it; confirm it fails; implement to green. Skip the per-slice test only when the slice has no independent observable behavior (the feature E2E covers it). Follow the meaningful-test rules: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary. (Mirrored in `pwk-brainstorming` and `docs/lessons.md`.)
+3. **⏸ per-requirement checkpoint** *(fires only when the tag says so — opt-in)* — if `### Checkpoints: full` or `spec`, stop and present per the tag (`full` = after tests and after complete; `spec` = tests only). With the default `none`, show the red→green inline and proceed.
 4. **Regression check after each commit** — run the **full existing suite**. This is what catches cross-requirement regressions (a later requirement breaking an earlier one's test). The **feature E2E stays red until the last requirement lands**; you may run it to watch the failure point advance, but it is gated only at the ship checkpoint — never expect it green per-commit.
 5. **Learn.** Caught a repeat mistake? Append a **generic** rule to `docs/lessons.md` (strip domain specifics).
 6. **Commit** the requirement with a clear message; mark its row ✅ and write its execution-summary row in the same step; advance `Feature phase: implementing (k/N)`.
 
 ### Per-requirement review (opt-in)
 
-If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria sections of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
+If the requirement's `### Review` tag is `parallel` or `inline` (default `skip`), review that slice now — same mechanics as the [feature review](#feature-review), with a requirement-scoped packet: the same recipe limited to the commits and criteria of that requirement, written to `docs/plans/<dated-stem>-review-packet-r<N>.md` (requirement-suffixed, so per-requirement packets never overwrite the feature packet or each other). With `skip`, no per-requirement review; the feature-level review covers it.
 
 `Checkpoints: spec` requires at least `inline` review — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
 
@@ -103,8 +105,8 @@ When a per-requirement checkpoint fires it is a **hard stop**:
 When every requirement's Done column is ✅:
 
 1. **Run the FULL test suite** — a failure means one requirement regressed another; fix it now, in execute context.
-2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the plan declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
-3. **Run the feature review** (below) per the plan's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
+2. **Run the feature-acceptance E2E** — the test you wrote at the start. It must be **green** now that all requirements have landed. If it is still red, a requirement is missing or wrong — fix it before proceeding. (If the design declared no feature E2E — a pure refactor — gate on the full suite staying green instead.)
+3. **Run the feature review** (below) per the design's `### Feature review` tag — set `Feature phase: reviewing` first, so a mid-review resume routes into this step instead of the implement loop. The review runs **before** your final approval, so the pause is fully informed. Apply smell fixes yourself and re-green (full suite + E2E) before pausing.
 4. **Write the code digest** into the progress file — the review has succeeded, findings are fixed, and the code is final: read the packet's `## Commits`, `## Changed files`, and `## Diff` sections and fill the progress file's `## Code digest` (template above) per the fill rules. If the packet is stale or missing, re-run the recipe before writing. A resumed `Feature phase: reviewing` that completes lands on this same write point before the checkpoint is assembled. Written once — never rewritten per requirement, never a gate: it explains the change, it does not block shipping.
 5. **Set `Feature phase: ship-paused`** and **⏸ CHECKPOINT: ship** — present, in this order:
    - a green-gates line: full suite green, feature E2E green;
@@ -122,12 +124,12 @@ The old "integration gate" is gone — the feature E2E at the ship checkpoint *i
 
 ## Feature review
 
-This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the plan's feature-level `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
+This is step 3 of the [ship checkpoint](#ship-checkpoint-feature-complete--review-merged): it runs **before** the final human approval, so the pause is fully informed. Run **one** review over the **whole feature diff**, driven by the design doc's `### Feature review` tag. This is the single thorough review — per-requirement reviews, if any, only saw slices in isolation.
 
 **Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:
 
 ```bash
-PACKET="<plan doc's directory>/<plan doc's stem>-review-packet.md"   # beside the plan doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
+PACKET="<design doc's directory>/<design doc's stem>-review-packet.md"   # beside the design doc — flat topic: docs/plans/<dated-stem>-review-packet.md; umbrella part: inside the docs/plans/<date>-<umbrella>/ folder
 {
   echo "# Review packet: <topic> — feature review"
   echo
@@ -137,14 +139,15 @@ PACKET="<plan doc's directory>/<plan doc's stem>-review-packet.md"   # beside th
   echo "## Changed files"
   git diff --stat <merge-base>...HEAD
   echo
-  echo "## Acceptance criteria (verbatim from the plan)"
-  sed -n '/^## Requirement 1/,/^## Feature acceptance/p' <plan-doc path> | sed '/^## Feature acceptance/,$d'
+  echo "## Acceptance criteria (verbatim from the design doc)"
+  sed -n '/^### R1/,/^## Feature acceptance/p' <design-doc path> | sed '/^## Feature acceptance/,$d'
+  # legacy plan doc (stem-matched -implementation.md): sed -n '/^## Requirement 1/,/^## Feature acceptance/p' instead of the ### R1 span
   echo
   echo "## Feature acceptance (verbatim)"
-  sed -n '/^## Feature acceptance/,/^### Feature review/p' <plan-doc path> | sed '/^### Feature review/,$d'
+  sed -n '/^## Feature acceptance/,/^### Feature review/p' <design-doc path> | sed '/^### Feature review/,$d'
   echo
   echo "## Production-risk notes (verbatim, if any)"
-  sed -n '/^### Production-risk notes/,/^## /p' <plan-doc path> | sed '/^## /d'
+  sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p' <design-doc path> | sed -E '/^(## |### R[0-9])/d'
   echo
   echo "## Diff"
   git diff <merge-base>...HEAD
@@ -160,7 +163,7 @@ On success, continue assembling the ship checkpoint; once the human approves it,
 
 ## Tags reference
 
-The plan tags each requirement and the feature level:
+The design doc tags each requirement and the feature level:
 
 - **`### Checkpoints: none | full | spec`** — per-requirement human stops. `none` (default) = no per-requirement stop; `full` = tests + complete; `spec` = tests only.
 - **`### Review: skip | parallel | inline`** — per-requirement review. `skip` (default) = none; `parallel` = four reviewers; `inline` = one `pwk-code-review` pass. The auto-tag default for requirements with non-empty `### Production-risk notes` is `parallel` (see `pwk-brainstorming` for the rule).
diff --git a/skills/pwk-finalizing/SKILL.md b/skills/pwk-finalizing/SKILL.md
index 8b76e5a..369305d 100644
--- a/skills/pwk-finalizing/SKILL.md
+++ b/skills/pwk-finalizing/SKILL.md
@@ -19,10 +19,10 @@ Ship the completed work.
 
 1. **Derive the topic set** —
    - **Umbrella** (a `docs/plans/**/overview.md` exists — excluding docs/plans/completed/, so an archived umbrella is never the one being finalized): read its roster; the set is every part's `<topic>`. The umbrella folder is disposed too.
-   - **Standalone**: progress file → `Plan:` ref → plan's `Design:` ref → design-doc filename → `<topic>`. One topic.
+   - **Standalone**: progress file → `Design:` ref → design-doc filename → `<topic>`. One topic. (Legacy progress file: `Plan:` ref → the implementation doc's `Design:` ref → design doc.)
 
    Ambiguous with several designs in flight? Ask.
-2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md`, `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Crosswalk`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
+2. **Dispose of consumed plan docs — ask archive or delete** — for **every topic** in the set, dispose its `-design.md`, `-implementation.md` (legacy — a 2.0 feature has none; the glob harmlessly no-ops), `-progress.md` (matched by the exact dated topic slug so similarly-named plans for other topics survive); for an umbrella, dispose the whole `docs/plans/<date>-<umbrella>/` folder — overview + every part — as one unit. Standalone topics keep the per-file paths. The digest sections (`## At a glance`, `## Execution summary`) live inside their host docs and ride the same globs — no separate disposal. Each path is matched with the `????-??-??-` prefix. Present both options and let the human choose:
 
    - **Delete (default)** — code + tests are the source of truth; removing the scaffold prevents stale plan docs from misleading future sessions:
 
diff --git a/skills/pwk-status/SKILL.md b/skills/pwk-status/SKILL.md
index 4132e46..6714e96 100644
--- a/skills/pwk-status/SKILL.md
+++ b/skills/pwk-status/SKILL.md
@@ -5,19 +5,19 @@ description: "Show all active pipeline topics and their phase/progress. Use when
 
 # Status
 
-Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the brainstorm/plan read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).
+Report on in-flight pipelines in this working tree (a worktree has its own `docs/plans/`, so run status in each). Read-only. This skill **does not unlock the guard** — it needs no writes, so it runs fine inside the design read-only phase. If you want source edits after a status check, invoke the skill for the next phase yourself (the guard follows the skill).
 
 ## Process
 
-1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md`, `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
-2. For each topic, infer the furthest artifact: only `*-design.md` → plan next; `*-implementation.md` no progress → execute next; `*-progress.md` → execute, show `done/total`.
+1. Glob `docs/plans/**/*-design.md`, `docs/plans/**/*-implementation.md` (legacy — a 2.0 feature has no implementation doc; discovery covers both suffixes), `docs/plans/**/*-progress.md`, and `docs/plans/**/overview.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived topics are not in flight) — this working tree only.
+2. For each topic, infer the furthest artifact: only `*-design.md` → execute next; `*-implementation.md` (legacy) or `*-progress.md` → execute, show `done/total`.
 3. **Group by umbrella** — for each umbrella `overview.md`, take its **parts** roster and roll up each part by state, inferred from artifacts (the overview is **status-free** — read no status from it): **in-flight** if it has an active `*-implementation.md`/`*-progress.md` (show `done/total`); else **not-started**. Print one roll-up line (`<umbrella> (umbrella): n in-flight · n not-started`), then nest the parts under it with their phase. Once the umbrella finalizes, its folder — overview included — is disposed, so it no longer appears here. Topics not part of an overview print flat.
 4. Print a compact table, grouped under any umbrellas, e.g.:
 
    ```
    payments-revamp (umbrella): 2 in-flight · 1 not-started
      payments-core      execute  2/3 done
-     payments-ui        plan     —
+     payments-ui        design   —
      payments-webhooks  not started
    auth                execute  1/2 done
    ```
diff --git a/skills/pwk-writing-plans/SKILL.md b/skills/pwk-writing-plans/SKILL.md
deleted file mode 100644
index 5b1e40d..0000000
--- a/skills/pwk-writing-plans/SKILL.md
+++ /dev/null
@@ -1,97 +0,0 @@
----
-name: pwk-writing-plans
-description: "Turn a design doc's requirements into a behavioral spec — acceptance criteria + integration tests per requirement. Use after pwk-brainstorming, before pwk-executing-tasks. Use when the user says 'let's plan', 'write a plan', 'break this down', or after a brainstorm when ready to move to implementation."
----
-
-# Writing Plans
-
-Turn the design doc's requirements into a **behavioral spec** the executor implements against.
-
-One design doc = one plan = one PR. The plan lists **all** the design's requirements in build order; the executor builds them one at a time.
-
-The executor runs the **feature-gate flow**: it writes the feature-acceptance E2E first, implements the requirements back-to-back, then runs one feature-level review. Per-requirement checkpoints/reviews happen only for requirements you tag (default off) — so tag only the slices that genuinely need a human stop or a focused review.
-
-Your writes go into `docs/plans/` and nowhere else. Source code and configuration get written later, in `pwk-executing-tasks` — this phase produces the document the executor builds from.
-
-## Process
-
-1. **Find the design doc** — glob `docs/plans/**/*-design.md` (recursive — umbrella docs live in `docs/plans/<date>-<umbrella>/` folders, excluding docs/plans/completed/ — archived designs are not plannable). If none, ask the user to run `/skill:pwk-brainstorming` first; if several, ask which. **Read `docs/lessons.md`** if it exists — known patterns belong in the acceptance criteria. **Umbrella part?** If a `docs/plans/**/overview.md` exists (excluding docs/plans/completed/ — an archived umbrella is never the umbrella being planned) and this design is one of its roster parts, read the overview for the umbrella goal + roster — plan this part as one slice, composing with what earlier parts already established in the code. Note the umbrella in the plan's Overview so the executor inherits the context.
-2. **Create or reuse the feature branch** — if you're already on a feature branch (not `main`), **reuse** it: a later umbrella part continues on the same umbrella branch. Otherwise `git checkout -b <topic>` — the umbrella's `<topic>` if this is part of an overview, else the design doc's `<topic>` (branch creation is allowed in the plan phase). Design + plan docs live on this branch, committed at the start of `pwk-executing-tasks`.
-3. **Read the `## Requirements` list** — the plan covers **all** of them. If the design has none, derive requirements from its described behaviors and confirm with the human before proceeding. A requirement whose testable acceptance criteria cannot be derived without inventing behavior is bounced back to `/skill:pwk-brainstorming` naming the specific gap — never plan on an assumption.
-4. **Write the plan** — for each requirement:
-   - **Crosswalk** — immediately after `## Overview`, emit `## Crosswalk`: a table `| R# | Plan section | Tests |` with one row per design requirement (R# = the design's numbering from its at-a-glance `## Requirements` list; Tests = that requirement's test names from the plan). Placement is load-bearing: the crosswalk sits strictly before `## Requirement 1` (between `## Overview` and `## Setup`, if present) so the review-packet sed spans (`## Requirement 1` → `## Feature acceptance` → `### Feature review`) stay untouched.
-   - **Acceptance criteria** — `Given/When/Then` behavioral statements defining "done". Write observable behaviors, not implementation steps; cover edge and error cases.
-   - **Integration tests** — test name + what each asserts. This is the spec the executor writes tests from.
-   - **Meaningful tests** — write acceptance criteria and tests as observable behavior: (1) **Test observable behavior** — assert on what the feature produces or changes (a return value, persisted/updated data, an emitted event, an HTTP response) through its public interface; these assertions keep passing as the implementation changes. (2) **Write a per-slice test when the slice has its own observable behavior** — when a slice is pure config or a trivial extraction, the feature E2E covers it and a per-slice test is unnecessary.
-   - **`### Checkpoints: none | full | spec`** — how many human stops. `none` = no per-requirement stop (default — the feature gate covers it); `full` = tests + complete stops; `spec` = tests stop only. Flag a requirement `full` or `spec` when it contains complex logic or is the main part of the feature — where a human look at the slice is worth the stop.
-   - **`### Review: skip | parallel | inline`** — `skip` = no per-requirement review (default — the feature-level review covers it); `parallel` = four reviewers via delegated parallel roles; `inline` = one `pwk-code-review` pass. The auto-tag bullet below is the single source of truth for risky-requirement tagging.
-   - **`### Feature review: parallel | inline`** — one review over the **whole feature diff**, always present (the single thorough pass). `parallel` (default — thoroughness lives here, since it is the only review in the common case); `inline` for small features.
-   - Tag every requirement — missing tags default to `none` / `skip`. **`spec` requires at least `inline` review** — dropping the complete checkpoint is only safe when review covers implementation quality; never combine `spec` with `Review: skip` (use `Checkpoints: none` instead).
-   - **Production-risk notes** — carry forward the design's `## Production-risk areas`, if any.
-   - **Auto-tag rule (moved)** — `pwk-brainstorming` owns the auto-tag rule (a requirement with a non-empty `### Production-risk notes` section gets `### Review: parallel`; default `skip` otherwise). The tags arrive in the design doc's requirement blocks — carry them through unchanged; never re-derive.
-   - **Challenge the design first** *(if production-risk areas exist)* — stress-test the design against the flagged risks before writing criteria. If a risk invalidates a design choice, stop and return to `/skill:pwk-brainstorming` rather than planning around a flawed design.
-   - **Ordering** — dependencies come **earlier** in the list; the executor runs in listed order with no dependency graph. Aim for vertical slices that merge cleanly on their own.
-
-   Save to `docs/plans/YYYY-MM-DD-<topic>-implementation.md` (an umbrella part saves into its umbrella folder as `<part>-implementation.md`):
-
-   ```markdown
-   # Implementation Plan: <topic>
-
-   ## Overview
-   Design: docs/plans/YYYY-MM-DD-<topic>-design.md
-   Umbrella: docs/plans/<date>-<umbrella>/overview.md   *(umbrella part only — else omit)*
-
-   ## Crosswalk
-
-   | R# | Plan section | Tests |
-   |----|--------------|-------|
-   | 1 | Requirement 1: <name> | `<test name> …` |
-
-   ## Requirement 1: <name>
-
-   ### Acceptance criteria
-   - Given … When … Then …
-   - Given … When … Then … (edge cases)
-
-   ### Integration tests
-   - `should <behavior>` — asserts <observable outcome>
-   - `should <error case>` — asserts <failure outcome>
-
-   ### Checkpoints: none | full | spec
-   ### Review: skip | parallel | inline
-
-   ### Production-risk notes
-   - <from the design's Production-risk areas, if any>
-
-   ## Requirement 2: <name>
-   …
-
-   ## Feature acceptance
-   The **primary enforced spec** — the definition of done for the feature, and the test the executor gates on first. Derived from the design doc: one end-to-end test exercising the requirements *together*. Make it concrete — a named test + the assertion that proves the composed behavior:
-   - `should <the PRD's end-to-end claim>` — Given <starting state>, When <trigger>, Then <composed outcome across requirements>.
-   ### Feature review: parallel | inline
-   One review over the whole feature diff (always). Default `parallel`; `inline` for small features.
-   ```
-
-   **If the design has no `## Feature acceptance` section**, stop and ask the human to run `/skill:pwk-brainstorming` to add one — the feature's definition-of-done is missing. (A trivial single-requirement design may fold the scenario into that requirement's criteria; note it and skip the separate section.)
-
-   **If `## Production-risk areas` flagged** schema migrations, new dependencies, external APIs, or seed data, emit a `## Setup` section between `## Overview` and `## Requirement 1` (dependencies, migrations, seed data, and how to verify setup worked).
-
-5. **Audit before presenting:**
-   - Every requirement has criteria **and** matching tests, a checkpoint tag, a review tag.
-   - The `## Crosswalk` covers every design requirement R# exactly once — none dropped, none duplicated.
-   - No `spec` + `skip` combination.
-   - A `## Feature acceptance` section exists as the primary enforced spec (or the trivial-fold note).
-   - A feature-level `### Feature review` tag is present.
-   - Per-requirement tags default to `none` / `skip`; only requirements with complex logic, the main part of the feature, or production-risk are flagged heavier.
-   - Production-risk areas from the design are reflected.
-6. **Workspace isolation** — you're on the `<topic>` branch. For larger work, offer a worktree (`git worktree add ../<repo>-<topic> <topic>`) and hand off to a new session there so `pwd` is the worktree. Wait for the user's choice.
-7. **Present the plan** — the human reads a **one-line confirmation**, not the full plan: `Plan covers R1–R<N>; tags: <non-default tags>` plus the feature-acceptance test name. The full plan is available on request. Wait for approval. On approval, hand off: "Ready to execute? Run `/skill:pwk-executing-tasks`" (running it is what exits the gated plan phase).
-
-## What belongs in the plan — and what stays out
-
-The plan carries: observable behavior (acceptance criteria), the test names + assertions that prove it, and per-requirement tags. Everything about implementation *how* — code, signatures, file-by-file breakdowns, micro-task decomposition — stays with the executor, which picks structure against the spec. That's the division that keeps the plan stable when a detail shifts mid-implementation.
-
-## After the plan
-
-Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"
\ No newline at end of file
diff --git a/tests/code-digest.test.ts b/tests/code-digest.test.ts
index c55ba39..3949dc5 100644
--- a/tests/code-digest.test.ts
+++ b/tests/code-digest.test.ts
@@ -8,7 +8,6 @@ const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
 const DISCOVERY_SITES = [
   "skills/pwk-brainstorming/SKILL.md",
-  "skills/pwk-writing-plans/SKILL.md",
   "skills/pwk-executing-tasks/SKILL.md",
   "skills/pwk-status/SKILL.md",
   "skills/pwk-finalizing/SKILL.md",
@@ -99,9 +98,7 @@ describe("code-digest per-slice", () => {
     const sites: Array<[string, string]> = [
       ["skills/pwk-status/SKILL.md", "1. Glob `docs/plans/**/*-design.md`"],
       ["skills/pwk-brainstorming/SKILL.md", "**Discovery**"],
-      ["skills/pwk-executing-tasks/SKILL.md", "**Find the plan**"],
-      ["skills/pwk-writing-plans/SKILL.md", "**Find the design doc**"],
-      ["skills/pwk-writing-plans/SKILL.md", "**Umbrella part?**"],
+      ["skills/pwk-executing-tasks/SKILL.md", "**Find the doc**"],
       ["skills/pwk-finalizing/SKILL.md", "Read **every** relevant progress file"],
       ["skills/pwk-finalizing/SKILL.md", "**Umbrella** (a `docs/plans/**/overview.md` exists"],
     ];
@@ -215,12 +212,6 @@ describe("code-digest per-slice", () => {
     expect(step7).toMatch(/back through the assumption gate/);
   });
 
-  it("should bounce un-derivable requirements to brainstorm", () => {
-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
-    expect(writingPlans).toContain(CODE_DIGEST_MARKERS.bounceToBrainstorm);
-    expect(writingPlans).toMatch(/inventing behavior/);
-    expect(writingPlans).toMatch(/naming the specific gap|name the specific gap/);
-  });
   it("should mirror digest, exclusion, and frontier wording in user docs", () => {
     for (const doc of MIRROR_DOCS) {
       const content = readRepo(doc);
@@ -277,9 +268,6 @@ describe("code-digest feature (E2E)", () => {
     const principlesLine = brainstorming.match(/## Principles\n\n- [^\n]*/)?.[0];
     if (!principlesLine) throw new Error("brainstorming: Principles list not found");
     expect(principlesLine).not.toContain("One question at a time"); // defining line only
-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
-    expect(writingPlans).toContain(CODE_DIGEST_MARKERS.bounceToBrainstorm);
-    expect(writingPlans).toMatch(/inventing behavior/);
 
     // R10 — the user docs mirror all three behaviors.
     for (const doc of MIRROR_DOCS) {
diff --git a/tests/human-review-digests.test.ts b/tests/human-review-digests.test.ts
index 1cbd2f8..d9cdad3 100644
--- a/tests/human-review-digests.test.ts
+++ b/tests/human-review-digests.test.ts
@@ -1,4 +1,4 @@
-import { readFileSync } from "node:fs";
+import { existsSync, readFileSync } from "node:fs";
 import { dirname, join } from "node:path";
 import { fileURLToPath } from "node:url";
 import { describe, expect, it } from "vitest";
@@ -23,7 +23,6 @@ const USER_DOCS = [
 
 const GLOB_SITES = [
   "skills/pwk-brainstorming/SKILL.md",
-  "skills/pwk-writing-plans/SKILL.md",
   "skills/pwk-executing-tasks/SKILL.md",
   "skills/pwk-status/SKILL.md",
   "skills/pwk-finalizing/SKILL.md",
@@ -44,13 +43,19 @@ describe("human review digests feature (E2E)", () => {
     expect(brainstorming).toContain("In short:");
     expect(brainstorming).toMatch(/plain language/i);
 
-    // R2 — plans carry a crosswalk the human confirms in one line, placed strictly
-    // before Requirement 1 so the review-packet sed spans are untouched.
-    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalk);
-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkTable);
-    expect(writingPlans).toContain(DIGEST_MARKERS.crosswalkPlacement);
-    expect(writingPlans).toContain(DIGEST_MARKERS.oneLineConfirmation);
+    // R2 — the crosswalk and its plan phase are gone entirely (pwk 2.0): the
+    // design doc's ### R<n> blocks are the map; no skill restates one.
+    expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);
+    for (const site of [
+      "skills/pwk-brainstorming/SKILL.md",
+      "skills/pwk-executing-tasks/SKILL.md",
+      "skills/pwk-status/SKILL.md",
+      "skills/pwk-finalizing/SKILL.md",
+      "skills/pwk-code-review/SKILL.md",
+      "skills/pwk-diagnose/SKILL.md",
+    ]) {
+      expect(readRepo(site), site).not.toMatch(/crosswalk/i);
+    }
 
     // R3 — the progress file carries an execution summary filled as requirements
     // land, and the ship checkpoint presents digest + coverage, diff on request.
@@ -110,7 +115,7 @@ describe("human review digests feature (E2E)", () => {
     }
     const readme = readRepo("README.md");
     expect(readme).toContain(DIGEST_MARKERS.diffOnRequest);
-    expect(readme).toContain(DIGEST_MARKERS.crosswalk);
+    expect(readme).not.toMatch(/crosswalk/i);
     const agents = readRepo("AGENTS.md");
     expect(agents).toContain(DIGEST_MARKERS.umbrellaFolder);
   });
diff --git a/tests/integration-guidance.test.ts b/tests/integration-guidance.test.ts
index acb0160..d314015 100644
--- a/tests/integration-guidance.test.ts
+++ b/tests/integration-guidance.test.ts
@@ -12,7 +12,6 @@ const portableSkills = [
   read("skills/pwk-brainstorming/SKILL.md"),
   read("skills/pwk-executing-tasks/SKILL.md"),
   read("skills/pwk-code-review/SKILL.md"),
-  read("skills/pwk-writing-plans/SKILL.md"),
 ];
 
 describe("cross-host delegation guidance", () => {
diff --git a/tests/markers.mjs b/tests/markers.mjs
index 394fcc2..086594b 100644
--- a/tests/markers.mjs
+++ b/tests/markers.mjs
@@ -9,10 +9,6 @@
 export const DIGEST_MARKERS = {
   atAGlance: "## At a glance",
   atAGlanceTable: "| R# | Requirement in one line | Risk |",
-  crosswalk: "## Crosswalk",
-  crosswalkTable: "| R# | Plan section | Tests |",
-  crosswalkPlacement: "strictly before `## Requirement 1`",
-  oneLineConfirmation: "one-line confirmation",
   execSummary: "## Execution summary",
   execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
   fillAsYouLand: "same step as marking",
diff --git a/tests/pwk2-single-doc.e2e.test.ts b/tests/pwk2-single-doc.e2e.test.ts
index bfbcd20..0d7ac09 100644
--- a/tests/pwk2-single-doc.e2e.test.ts
+++ b/tests/pwk2-single-doc.e2e.test.ts
@@ -47,6 +47,9 @@ describe("pwk 2.0 single-doc feature (E2E)", () => {
     expect(executing).toContain(SINGLE_DOC_MARKERS.packetDesignSpan);
     expect(read("skills/pwk-status/SKILL.md")).toContain(SINGLE_DOC_MARKERS.bothSuffixes);
     expect(existsSync(join(repoRoot, "docs/adr/0004-one-buildable-design-doc.md"))).toBe(true);
+    const adr = readFileSync(join(repoRoot, "docs/adr/0004-one-buildable-design-doc.md"), "utf8");
+    expect(adr).toContain("plan phase merged into brainstorm");
+    expect(adr).toContain("learning sweep");
 
     // R4 — finalize sweeps learning (decisions + Approaches considered + deviations
     // + alerts) before disposal, asking rather than fabricating when material is thin.
diff --git a/tests/review-packet.test.ts b/tests/review-packet.test.ts
index 2e13575..1363dbb 100644
--- a/tests/review-packet.test.ts
+++ b/tests/review-packet.test.ts
@@ -8,45 +8,49 @@ import { describe, expect, it } from "vitest";
 const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
 
 /** The recipe commands exactly as they must appear in the executing skill. */
-const CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
+const CRITERIA_CMD = "sed -n '/^### R1/,/^## Feature acceptance/p'";
+const LEGACY_CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
 const FA_CMD = "sed -n '/^## Feature acceptance/,/^### Feature review/p'";
-const NOTES_CMD = "sed -n '/^### Production-risk notes/,/^## /p'";
+const NOTES_CMD = "sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p'";
+const NOTES_STRIP = "sed -E '/^(## |### R[0-9])/d'";
 
-/** A plan doc shaped like the template pwk-writing-plans emits. */
-const PLAN_FIXTURE = [
-  "# Implementation Plan: demo",
+/** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
+const DESIGN_FIXTURE = [
+  "# demo",
   "",
-  "## Overview",
-  "Design: docs/plans/demo-design.md",
+  "## At a glance",
   "",
-  "## Crosswalk",
+  "summary text",
   "",
-  "| R# | Plan section | Tests |",
-  "|----|--------------|-------|",
-  "| 1 | Requirement 1: alpha | should-a |",
-  "| 2 | Requirement 2: beta | should-b |",
+  "| R# | Requirement in one line | Risk |",
+  "|----|--------------------------|------|",
+  "| 1 | alpha | low |",
+  "| 2 | beta | med |",
   "",
-  "## Setup",
+  "## Requirements",
   "",
-  "n/a",
+  "### R1: alpha",
+  "alpha does one thing",
   "",
-  "## Requirement 1: alpha",
-  "",
-  "### Acceptance criteria",
+  "**Acceptance criteria** — Given/When/Then criteria:",
   "- Given a, When b, Then c.",
   "",
+  "### Checkpoints: none",
+  "### Review: skip",
+  "",
   "### Production-risk notes",
   "- alpha: touches auth session storage",
   "- alpha: rotation window must stay under 30s",
   "",
-  "### Checkpoints: none",
-  "### Review: skip",
-  "",
-  "## Requirement 2: beta",
+  "### R2: beta",
+  "beta does another thing",
   "",
-  "### Acceptance criteria",
+  "**Acceptance criteria** — Given/When/Then criteria:",
   "- Given d, When e, Then f.",
   "",
+  "### Checkpoints: none",
+  "### Review: skip",
+  "",
   "### Production-risk notes",
   "- touches redis: hot path under login storms",
   "- TTL policy must match session rotation",
@@ -71,37 +75,42 @@ describe("review packet recipe", () => {
     expect((executing.match(/review-packet\.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
     expect(executing).toContain("no packet byte passes through model output");
     expect(executing).toContain(CRITERIA_CMD);
+    expect(executing).toContain(LEGACY_CRITERIA_CMD);
     expect(executing).toContain(FA_CMD);
     expect(executing).toContain(NOTES_CMD);
     expect(executing).toContain("git diff <merge-base>...HEAD");
     expect(executing).toMatch(/never appears in spawn arguments/i);
+    expect(executing).toContain("verbatim from the design doc");
   });
 
-  it("should extract criteria verbatim from a plan-template fixture", () => {
+  it("should extract criteria verbatim from a design-template fixture", () => {
     const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
-    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);
+    writeFileSync(join(dir, "design.md"), DESIGN_FIXTURE);
 
-    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
+    const criteria = execSync(`${CRITERIA_CMD} design.md | sed '/^## Feature acceptance/,$d'`, {
       cwd: dir,
     }).toString();
-    expect(criteria).toContain("## Requirement 1: alpha");
+    expect(criteria).toContain("### R1: alpha");
     expect(criteria).toContain("- Given a, When b, Then c.");
-    expect(criteria).toContain("## Requirement 2: beta");
+    expect(criteria).toContain("### R2: beta");
     expect(criteria).toContain("- Given d, When e, Then f.");
     expect(criteria).toContain("### Production-risk notes");
     expect(criteria).toContain("hot path under login storms");
     expect(criteria).toContain("monitor INCR miss rate"); // >3 lines: range capture, not grep -A3 truncation
     expect(criteria).not.toContain("## Feature acceptance");
     expect(criteria).not.toContain("Feature review: parallel");
+    expect(criteria).not.toContain("## At a glance");
 
-    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
+    const notes = execSync(`${NOTES_CMD} design.md | ${NOTES_STRIP}`, { cwd: dir }).toString();
     expect(notes).toContain("### Production-risk notes");
     expect(notes).toContain("alpha: touches auth session storage"); // first group captured
     expect(notes).toContain("TTL policy must match session rotation"); // second group captured
     expect(notes).toContain("monitor INCR miss rate");
     expect(notes).not.toContain("## Feature acceptance");
+    expect(notes).not.toContain("### R2: beta"); // the ### R terminator stops each group: no R2 duplication
+    expect(notes).not.toContain("- Given d, When e, Then f.");
 
-    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
+    const featureAcceptance = execSync(`${FA_CMD} design.md | sed '/^### Feature review/,$d'`, {
       cwd: dir,
     }).toString();
     expect(featureAcceptance).toContain("## Feature acceptance");
@@ -109,24 +118,47 @@ describe("review packet recipe", () => {
     expect(featureAcceptance).not.toContain("Feature review: parallel");
   });
 
-  it("should keep packet spans intact with a crosswalk present", () => {
-    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-xw-"));
-    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);
+  it("should extract criteria verbatim from a legacy plan fixture (in-flight 1.x flow)", () => {
+    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-legacy-"));
+    const legacyFixture = [
+      "# Implementation Plan: demo",
+      "",
+      "## Overview",
+      "Design: docs/plans/demo-design.md",
+      "",
+      "## Requirement 1: alpha",
+      "",
+      "### Acceptance criteria",
+      "- Given a, When b, Then c.",
+      "",
+      "### Production-risk notes",
+      "- touches redis: hot path",
+      "",
+      "## Requirement 2: beta",
+      "",
+      "### Acceptance criteria",
+      "- Given d, When e, Then f.",
+      "",
+      "## Feature acceptance",
+      "",
+      "- `should demo` — Given x, When y, Then z.",
+      "",
+      "### Feature review: parallel",
+      "",
+    ].join("\n");
+    writeFileSync(join(dir, "plan.md"), legacyFixture);
 
-    // The three sed commands are byte-identical to the pre-crosswalk recipe (see above);
-    // the crosswalk sits before `## Requirement 1`, so no span may reach it.
-    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
+    const criteria = execSync(`${LEGACY_CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
       cwd: dir,
     }).toString();
     expect(criteria).toContain("## Requirement 1: alpha");
-    expect(criteria).not.toContain("## Crosswalk");
-    expect(criteria).not.toContain("| 1 | Requirement 1: alpha | should-a |");
-    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
-    expect(notes).not.toContain("Crosswalk");
-    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
-      cwd: dir,
-    }).toString();
-    expect(featureAcceptance).not.toContain("Crosswalk");
+    expect(criteria).toContain("- Given a, When b, Then c.");
+    expect(criteria).toContain("## Requirement 2: beta");
+    expect(criteria).not.toContain("## Feature acceptance");
+
+    const notes = execSync(`${NOTES_CMD} plan.md | ${NOTES_STRIP}`, { cwd: dir }).toString();
+    expect(notes).toContain("touches redis: hot path");
+    expect(notes).not.toContain("## Requirement 2: beta");
   });
 
   it("should scope per-requirement reviews to the requirement", () => {
diff --git a/tests/setup-command.test.ts b/tests/setup-command.test.ts
index 48010cb..a0a905a 100644
--- a/tests/setup-command.test.ts
+++ b/tests/setup-command.test.ts
@@ -231,10 +231,10 @@ describe("/pwk-setup", () => {
     expect(readdirSync(cleanRoot, { withFileTypes: true })).toHaveLength(0);
   });
 
-  it("refuses setup in brainstorm and plan phases even when the manual guard is off", async () => {
+  it("refuses setup in the design phase even when the manual guard is off", async () => {
     const command = harness.commands.get("pwk-setup");
 
-    for (const skill of ["pwk-brainstorming", "pwk-writing-plans"] as const) {
+    for (const skill of ["pwk-brainstorming"] as const) {
       const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
       await harness.handlers.get("input")?.({ text: `/skill:${skill}` }, {});
       await harness.commands.get("pwk-guard")?.handler("off", { ui: { notify() {} } });
diff --git a/tests/skill-delegation-contract.test.ts b/tests/skill-delegation-contract.test.ts
index a60992f..16ea753 100644
--- a/tests/skill-delegation-contract.test.ts
+++ b/tests/skill-delegation-contract.test.ts
@@ -3,12 +3,7 @@ import { describe, expect, it } from "vitest";
 
 const brainstorming = readFileSync("skills/pwk-brainstorming/SKILL.md", "utf8");
 const executing = readFileSync("skills/pwk-executing-tasks/SKILL.md", "utf8");
-const relatedSkills = [
-  brainstorming,
-  executing,
-  readFileSync("skills/pwk-code-review/SKILL.md", "utf8"),
-  readFileSync("skills/pwk-writing-plans/SKILL.md", "utf8"),
-];
+const relatedSkills = [brainstorming, executing, readFileSync("skills/pwk-code-review/SKILL.md", "utf8")];
 
 describe("portable skill delegation contract", () => {
   it("requests logical recon capability with safety constraints and fallback", () => {
diff --git a/tests/skill-lint.mjs b/tests/skill-lint.mjs
index 0419869..004057a 100644
--- a/tests/skill-lint.mjs
+++ b/tests/skill-lint.mjs
@@ -7,7 +7,7 @@
  *
  * Run via `npm run skill-lint` (or as part of `npm run check`).
  */
-import { readdirSync, readFileSync, statSync } from "node:fs";
+import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
 import { dirname, join, resolve } from "node:path";
 import { fileURLToPath } from "node:url";
 import { CODE_DIGEST_MARKERS, DIGEST_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";
@@ -63,7 +63,7 @@ for (const skill of loadSkills()) {
 }
 
 // --- Check 2: tag vocabulary consistency across the pipeline ---
-// The canonical vocabularies, defined in pwk-writing-plans and consumed by pwk-executing-tasks.
+// The canonical vocabularies, defined in pwk-brainstorming and consumed by pwk-executing-tasks.
 const CHECKPOINT_VOCAB = ["full", "spec", "none"];
 const REVIEW_VOCAB = ["parallel", "inline", "skip"];
 
@@ -86,40 +86,39 @@ function vocabOf(text, kind) {
 }
 
 console.log("tag vocabulary:");
-const wp = loadSkills().find((s) => s.name === "pwk-writing-plans");
+const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
 const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
-if (!wp) fail("pwk-writing-plans skill missing");
+if (!bs) fail("pwk-brainstorming skill missing");
 if (!et) fail("pwk-executing-tasks skill missing");
-if (wp && et) {
+if (bs && et) {
   for (const [kind, vocab] of [
     ["checkpoint", CHECKPOINT_VOCAB],
     ["review", REVIEW_VOCAB],
   ]) {
-    const wpV = vocabOf(wp.content, kind);
+    const bsV = vocabOf(bs.content, kind);
     const etV = vocabOf(et.content, kind);
     const label = kind === "checkpoint" ? "checkpoint" : "review";
     for (const v of vocab) {
-      if (!wpV.has(v)) fail(`pwk-writing-plans: ${label} vocab missing "${v}"`);
+      if (!bsV.has(v)) fail(`pwk-brainstorming: ${label} vocab missing "${v}"`);
       if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
     }
     // No stray tokens
-    for (const t of wpV) if (!vocab.includes(t)) fail(`pwk-writing-plans: unknown ${label} token "${t}"`);
+    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${label} token "${t}"`);
     for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${label} token "${t}"`);
-    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across writing-plans + executing-tasks`);
+    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across brainstorming + executing-tasks`);
   }
 }
 
-// --- Check 3: plan template emits what executing-tasks parses ---
-console.log("plan template coverage:");
-if (wp && et) {
-  const templateNeeds = ["### Checkpoints", "### Review", "## Requirement", "## Setup"];
+// --- Check 3: the design-doc template emits what executing-tasks parses ---
+console.log("design template coverage:");
+if (bs && et) {
+  const templateNeeds = ["### Checkpoints", "### Review", "### R", "## Setup"];
   for (const tok of templateNeeds) {
-    // The writing-plans template should emit each; executing-tasks should reference each.
-    const inTemplate = wp.content.includes(tok);
-    const inConsumer = et.content.includes(tok.replace("### ", "### ").replace("## ", "## "));
-    if (!inTemplate) fail(`pwk-writing-plans template missing "${tok}"`);
+    // The brainstorming template should emit each; executing-tasks should reference each.
+    const inTemplate = bs.content.includes(tok);
+    if (!inTemplate) fail(`pwk-brainstorming template missing "${tok}"`);
     if (!et.content.includes(tok)) fail(`pwk-executing-tasks doesn't reference "${tok}"`);
-    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by writing-plans, parsed by executing-tasks`);
+    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by brainstorming, parsed by executing-tasks`);
   }
 }
 
@@ -141,10 +140,10 @@ for (const f of docsToCheck) {
   else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
 }
 // And in the skills themselves
-if (wp && /\bspec\b/.test(wp.content) && /requires at least `inline`/.test(wp.content)) {
-  ok("pwk-writing-plans: documents spec requires inline review");
-} else if (wp) {
-  fail("pwk-writing-plans: missing spec+inline guard note");
+if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
+  ok("pwk-brainstorming: documents spec requires inline review");
+} else if (bs) {
+  fail("pwk-brainstorming: missing spec+inline guard note");
 }
 if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
   ok("pwk-executing-tasks: documents spec requires inline review");
@@ -153,19 +152,15 @@ if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
 }
 
 // --- Check 5: Feature acceptance contract across the pipeline ---
-// brainstorm emits `## Feature acceptance` in the design doc; writing-plans derives it
-// into the plan and checks for it at audit; executing-tasks runs it at the integration gate.
-// All three must use the same section name so the contract is followable.
+// brainstorm emits `## Feature acceptance` in the design doc; executing-tasks writes it
+// as the E2E and gates on it. Both must use the same section name so the contract is followable.
 console.log("feature acceptance contract:");
-const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
 // A real section header line: optional leading indent, then `## Feature acceptance`,
 // NOT wrapped in backticks (prose mentions like `## Feature acceptance` don't count).
 const faHeader = /^[ \t]*## Feature acceptance\b/m;
 if (!bs) fail("pwk-brainstorming skill missing");
 else if (faHeader.test(bs.content)) ok("pwk-brainstorming: emits `## Feature acceptance` in the design doc");
 else fail("pwk-brainstorming: missing `## Feature acceptance` section header");
-if (wp && faHeader.test(wp.content)) ok("pwk-writing-plans: derives `## Feature acceptance` into the plan + audits it");
-else if (wp) fail("pwk-writing-plans: missing `## Feature acceptance` section header");
 if (et && /Feature acceptance/.test(et.content))
   ok("pwk-executing-tasks: runs the feature-acceptance test at the integration gate");
 else if (et) fail("pwk-executing-tasks: missing `## Feature acceptance` at the integration gate");
@@ -235,9 +230,9 @@ if (bs && /^## Umbrella\b/m.test(bs.content))
 else fail("pwk-brainstorming: missing `## Umbrella` section (multi-design-doc, one PR)");
 if (bs && /status-free/i.test(bs.content)) ok("pwk-brainstorming: defines the overview as a status-free roster");
 else fail("pwk-brainstorming: overview must be documented as status-free");
-if (wp && /reuse/i.test(wp.content) && /umbrella/i.test(wp.content))
-  ok("pwk-writing-plans: documents branch reuse for umbrella later parts");
-else fail("pwk-writing-plans: missing umbrella branch-reuse note");
+if (et && /reuse/i.test(et.content) && /umbrella/i.test(et.content))
+  ok("pwk-executing-tasks: documents branch reuse for umbrella later parts");
+else fail("pwk-executing-tasks: missing umbrella branch-reuse note");
 if (et && /umbrella/i.test(et.content) && /next part/i.test(et.content))
   ok("pwk-executing-tasks: suggests finalize or brainstorm-next keyed on the overview roster");
 else fail("pwk-executing-tasks: missing umbrella post-gate suggestion logic");
@@ -267,8 +262,8 @@ else fail("guard references a 'decompose' phase — umbrella should add no phase
 const phaseMatch = guardSrc.match(/SKILL_TO_PHASE[\s\S]*?\{([\s\S]*?)\}/);
 const phaseBlock = phaseMatch ? phaseMatch[1] : "";
 const gatedSkillCount = (phaseBlock.match(/pwk-[\w-]+/g) || []).length;
-if (gatedSkillCount === 2) ok("SKILL_TO_PHASE unchanged (2 gated skills)");
-else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 2`);
+if (gatedSkillCount === 1) ok("SKILL_TO_PHASE unchanged (1 gated skill — the design phase)");
+else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 1`);
 
 // --- Check 9: feature-gate execution model (grown per-requirement) ---
 // Feature-acceptance E2E is the primary gate; per-requirement checkpoints/reviews are opt-in
@@ -279,11 +274,11 @@ const fgMark = (file, content, marker, label) => {
   if (content?.includes(marker)) ok(`${file}: ${label}`);
   else fail(`${file}: missing ${label} — marker "${marker}"`);
 };
-// Requirement 1 — pwk-writing-plans tag defaults + feature-level review
-if (wp) {
-  fgMark("pwk-writing-plans", wp.content, "### Feature review", "feature-level review tag");
-  fgMark("pwk-writing-plans", wp.content, "default to `none` / `skip`", "flipped per-requirement defaults");
-  fgMark("pwk-writing-plans", wp.content, "primary enforced spec", "Feature acceptance as primary spec");
+// Requirement 1 — brainstorming tag defaults + feature-level review
+if (bs) {
+  fgMark("pwk-brainstorming", bs.content, "### Feature review", "feature-level review tag");
+  fgMark("pwk-brainstorming", bs.content, "default to `none` / `skip`", "per-requirement defaults");
+  fgMark("pwk-brainstorming", bs.content, "primary enforced spec", "Feature acceptance as primary spec");
 }
 // Requirement 2 — pwk-executing-tasks feature-gate flow
 if (et) {
@@ -292,8 +287,8 @@ if (et) {
   fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
   fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
 }
-// Requirement 3 — meaningful-test rules mirrored across writing-plans, executing-tasks, lessons
-fgMark("pwk-writing-plans", wp.content, "Test observable behavior", "meaningful-test rule (writing-plans)");
+// Requirement 3 — meaningful-test rules mirrored across brainstorming, executing-tasks, lessons
+fgMark("pwk-brainstorming", bs?.content, "Test observable behavior", "meaningful-test rule (brainstorming)");
 fgMark("pwk-executing-tasks", et.content, "Test observable behavior", "meaningful-test rule (executing-tasks)");
 const lessonsMd = readFileSync(join(root, "docs/lessons.md"), "utf8");
 fgMark("docs/lessons.md", lessonsMd, "Test observable behavior", "meaningful-test rule (lessons)");
@@ -427,12 +422,12 @@ if (bs) {
     ok("pwk-brainstorming: auto-tag rule is single-source (other skills do not restate it)");
   }
 }
-// R3: pwk-executing-tasks must reference pwk-writing-plans for the auto-tag rule (not restate).
+// R3: pwk-executing-tasks must reference pwk-brainstorming for the auto-tag rule (not restate).
 if (et) {
-  if (/pwk-writing-plans/.test(et.content)) {
-    ok("pwk-executing-tasks: references pwk-writing-plans (single source of truth)");
+  if (/pwk-brainstorming/.test(et.content)) {
+    ok("pwk-executing-tasks: references pwk-brainstorming (single source of truth)");
   } else {
-    fail("pwk-executing-tasks: must reference pwk-writing-plans (do not restate the auto-tag rule)");
+    fail("pwk-executing-tasks: must reference pwk-brainstorming (do not restate the auto-tag rule)");
   }
 }
 
@@ -467,12 +462,7 @@ if (bs) {
   // pwk 2.0 R2 — decisions-first At a glance: summary, then Key decisions (honest-empty
   // rejected-alternative clauses — never manufactured), then the R#/risk table.
   fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.keyDecisions, "decisions-first at-a-glance");
-  fgMark(
-    "pwk-brainstorming",
-    bs.content,
-    SINGLE_DOC_MARKERS.neverManufactured,
-    "honest-empty rejected alternatives",
-  );
+  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.neverManufactured, "honest-empty rejected alternatives");
   const glanceDecisionsIdx = bs.content.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
   const glanceTableIdx = bs.content.indexOf(DIGEST_MARKERS.atAGlanceTable);
   if (glanceDecisionsIdx !== -1 && glanceTableIdx > glanceDecisionsIdx) {
@@ -495,20 +485,21 @@ if (bs) {
   }
   if (docsOk) ok("user docs mirror the decisions-first At a glance");
 }
-// R2 — plans carry a crosswalk (one row per design R#) placed strictly before
-// `## Requirement 1` so the packet sed spans stay intact; the human confirms in one line.
-if (wp) {
-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalk, "crosswalk section mandated");
-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkTable, "crosswalk table shape");
-  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkPlacement, "crosswalk placement outside sed spans");
-  fgMark("pwk-writing-plans", wp.content, "exactly once", "crosswalk audit: every R# exactly once");
-  fgMark(
-    "pwk-writing-plans",
-    wp.content,
-    DIGEST_MARKERS.oneLineConfirmation,
-    "plan presented as one-line confirmation",
-  );
+// R2 — the crosswalk is GONE with the plan phase (pwk 2.0): no skill may emit one,
+// and the pwk-writing-plans skill must not exist at all.
+if (existsSync(join(skillsDir, "pwk-writing-plans"))) {
+  fail("pwk-writing-plans: skill still exists — the plan phase was removed in pwk 2.0");
+} else {
+  ok("pwk-writing-plans: removed (no plan phase)");
+}
+let crosswalkFree = true;
+for (const s of loadSkills()) {
+  if (/crosswalk/i.test(s.content)) {
+    fail(`${s.name}: still mentions a crosswalk — the plan-phase artifact is gone`);
+    crosswalkFree = false;
+  }
 }
+if (crosswalkFree) ok("no skill mentions a crosswalk (plan-phase artifact gone)");
 // R3 — the progress file carries an execution summary filled as requirements land; the
 // ship checkpoint merges feature-complete + review: review runs before the one final
 // approval, presenting digest + coverage table, diff on request.
@@ -528,7 +519,7 @@ if (et) {
 }
 // R5 — umbrella docs live in their own docs/plans/<date>-<umbrella>/ folder; every
 // discovery site globs recursively; finalize disposes the folder as one unit.
-const GLOB_SITES = [bs, wp, et, status, fin].filter(Boolean);
+const GLOB_SITES = [bs, et, status, fin].filter(Boolean);
 for (const s of GLOB_SITES) {
   fgMark(s.name, s.content, DIGEST_MARKERS.recursiveGlob, "recursive discovery globs");
 }
@@ -546,14 +537,6 @@ if (et) {
     "review phase is set before the review runs (mid-review resume routes in)",
   );
 }
-if (wp) {
-  fgMark(
-    "pwk-writing-plans",
-    wp.content,
-    "docs/plans/<date>-<umbrella>/overview.md",
-    "plan template umbrella path is folder-based",
-  );
-}
 if (fin) {
   fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.umbrellaFolder, "umbrella folder disposal as one unit");
 }
@@ -672,8 +655,7 @@ if (et) {
 const EXCLUSION_SITES = [
   [status, "1. Glob `docs/plans/**/*-design.md`"],
   [bs, "**Discovery**"],
-  [et, "**Find the plan**"],
-  [wp, "**Find the design doc**"],
+  [et, "**Find the doc**"],
   [fin, "Read **every** relevant progress file"],
   [fin, "**Umbrella** (a `docs/plans/**/overview.md` exists"],
 ];
@@ -824,11 +806,8 @@ if (bs) {
     fail("pwk-brainstorming: step 7 must route invented scenario behavior to the gate");
   }
 }
-if (wp) {
-  fgMark("pwk-writing-plans", wp.content, CODE_DIGEST_MARKERS.bounceToBrainstorm, "planner bounce to brainstorm");
-  if (/inventing behavior/.test(wp.content)) ok("pwk-writing-plans: bounce names inventing behavior");
-  else fail("pwk-writing-plans: bounce rule must name inventing behavior");
-}
+// (pwk 2.0: the planner bounce is gone with the planner — the assumption gate in
+// brainstorm catches underivable criteria in-session; no separate bounce rule remains.)
 
 // --- Summary ---
 console.log("");
diff --git a/tests/workflow-guard.test.ts b/tests/workflow-guard.test.ts
index 6a5e0f3..43acfb9 100644
--- a/tests/workflow-guard.test.ts
+++ b/tests/workflow-guard.test.ts
@@ -16,13 +16,37 @@ import { describe, it, expect } from "vitest";
 // The phase variable is module-level, so we need to reset it between tests.
 
 // Import the module to access getCurrentPhase
-import { isSafeCommand, shouldBlockFilePath, UNLOCK_SKILLS } from "../extensions/workflow-guard";
+import { getCurrentPhase, isSafeCommand, shouldBlockFilePath, UNLOCK_SKILLS } from "../extensions/workflow-guard";
+import { createExtensionHarness } from "./helpers";
 
 describe("guard phase transitions", () => {
   it("unlocks on write-needing skills only", () => {
     expect([...UNLOCK_SKILLS]).toEqual(["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-diagnose"]);
   });
 
+  it("gates only brainstorming; a removed skill no longer enters a phase", () => {
+    const harness = createExtensionHarness();
+    harness.handlers.get("session_start")?.({}, {});
+    expect(getCurrentPhase()).toBeNull();
+    // pwk-writing-plans was removed in 2.0: invoking it must NOT enter any phase
+    harness.handlers.get("input")?.({ text: "/skill:pwk-writing-plans" }, {});
+    expect(getCurrentPhase()).toBeNull();
+    harness.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    expect(getCurrentPhase()).toBe("brainstorm");
+    harness.handlers.get("input")?.({ text: "/skill:pwk-executing-tasks" }, {});
+    expect(getCurrentPhase()).toBeNull();
+  });
+
+  it("announces the DESIGN phase reminder once on entry", async () => {
+    const harness = createExtensionHarness();
+    harness.handlers.get("session_start")?.({}, {});
+    harness.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
+    const first = await harness.handlers.get("before_agent_start")?.({}, {});
+    expect((first as { message?: { content?: string } })?.message?.content).toContain("DESIGN phase");
+    const second = await harness.handlers.get("before_agent_start")?.({}, {});
+    expect(second ?? {}).toEqual({});
+  });
+
   it("does not unlock on pwk-status (read-only orientation stays gated)", () => {
     expect(UNLOCK_SKILLS).not.toContain("pwk-status");
   });
@@ -75,8 +99,8 @@ describe("isSafeCommand", () => {
     expect(isSafeCommand("git add .")).toBe(false);
     expect(isSafeCommand("git commit -m 'msg'")).toBe(false);
     expect(isSafeCommand("git push")).toBe(false);
-    // Allowed: creating/switching branches doesn't modify source files; pwk-writing-plans creates the
-    // feature branch during the plan phase before authoring the plan.
+    // Allowed: creating/switching branches doesn't modify source files; pwk-executing-tasks creates
+    // the feature branch in its pre-flight before implementing.
     expect(isSafeCommand("git checkout -b feature")).toBe(true);
     expect(isSafeCommand("git branch feature")).toBe(true);
     expect(isSafeCommand("git branch -d feature")).toBe(false); // deleting is a mutation
