# Implementation Plan: review-cost-optimization

## Overview

Design: docs/plans/2026-09-05-review-cost-optimization-design.md

Cut token usage and wall-clock of the 4-role parallel review without changing review semantics: tier-hinted roles (fast model on smell/hazard via `/pwk-setup`), a script-assembled review packet consumed by one-liner spawns, packet discipline in a byte-identical shared conduct block, advisory resource hints in the delegation contract, and doc/disposal consistency. No role is added, removed, renamed, or merged; `assessDelegationCoverage` and fallback semantics are untouched.

Conventions (from `docs/lessons.md` — apply throughout):
- Test-first for skill/doc content: add the skill-lint / role-contracts / setup-command assertion first (red), then edit the markdown (green).
- Wording assertions are regexes, not exact sentences; keep one canonical marker per contract.
- Guard-state tests fire `session_start` in `beforeEach` (module-level `let` state).
- `docs/plans/` holds parked artifacts from another topic (readme draft/revised, currently deleted in the worktree) — commit this topic's docs with explicit `--` paths, never a bare `git add docs/plans/`.
- Editing skill/agent markdown: anchor edit-tool `oldText` on apostrophe-free text (these docs use U+2019).
- No new Review-vocab tokens: tags use only `none|full|spec` and `skip|parallel|inline` (skill-lint Check 2 rejects strays).

## Requirement 1: Role frontmatter resource hints

### Acceptance criteria
- Given the canonical role files, When read, Then `pwk-spec-reviewer.md` and `pwk-tracing-reviewer.md` frontmatter contain `max_turns: 40` and no `model:` or `thinking:` field.
- Given the canonical role files, When read, Then `pwk-smell-reviewer.md` and `pwk-hazard-reviewer.md` frontmatter contain `thinking: low`, `max_turns: 20`, and a *commented* model placeholder (`# model: <fast-tier> … /pwk-setup`), with no uncommented `model:` line.
- Given the published package, When inspected, Then no concrete model name appears in any shipped role file.
- Existing per-role pins stay green: exact `name:`, `description:`, `tools: read, grep, find, ls, bash`, `systemPromptMode: replace`.

### Integration tests
- `should ship max_turns 40 on judgment roles` — spec/tracing frontmatter has `max_turns: 40`, no `model`, no `thinking`.
- `should ship fast-tier hints on checklist roles` — smell/hazard have `thinking: low`, `max_turns: 20`, commented `# model:` placeholder, no uncommented `model:`.
- `should not hardcode a model name in shipped roles` — no `model: <value-without-#>` matching a concrete provider model in any `agents/*.md`.

### Checkpoints: none
### Review: skip

## Requirement 2: Shared conduct block in role bodies

### Acceptance criteria
- Given all four reviewer role bodies, When compared, Then each opens with a byte-identical conduct block covering: read-only reporter statement, authority boundary, evidence bar (file:line per finding), report format, and the explicit "No findings" rule.
- Given each role body, When parsed, Then the role-specific checklist appears after the conduct block (checklist last).
- Given the four bodies, When the conduct block is extracted, Then extraction is well-defined (a shared terminator heading) and the blocks are byte-equal.

### Integration tests
- `should open all four reviewer bodies with a byte-identical conduct block` — extract body text up to the role-checklist heading; assert strict equality across the four.
- `should place each role checklist after the conduct block` — checklist heading index > conduct-block end in every file.

### Checkpoints: none
### Review: skip

## Requirement 3: Packet discipline clause

### Acceptance criteria
- Given the shared conduct block, When read, Then it contains the packet rule: work from the provided packet; targeted reads of listed files are expected; reads beyond the packet only to verify a specific suspected finding, cited; no scope re-derivation (no re-running `git log`, no repo-wide sweeps).
- Given the shared conduct block, When read, Then it contains early-wrap disclosure: a reviewer wrapping up before completing its checklist states explicitly what was not covered.
- Given all four role bodies, When compared after the change, Then the conduct blocks remain byte-identical (the clause is added to all four identically).

### Integration tests
- `should include packet discipline in every conduct block` — regex over each body: targeted reads of listed files, cited excursion, no re-derivation markers.
- `should require early-wrap disclosure in every conduct block` — regex: not covered / did not get to / not reached, present in all four, byte-identical prefix preserved.
- `should keep conduct blocks byte-identical after adding the clause` — re-run of the Requirement 2 byte-equality assertion.

### Checkpoints: none
### Review: skip

## Requirement 4: Script-assembled review packet recipe

### Acceptance criteria
- Given the `pwk-executing-tasks` feature-review section, When read, Then it specifies a fixed shell recipe that writes `docs/plans/YYYY-MM-DD-<topic>-review-packet.md` (same dated stem as the plan docs) containing: commit list, changed-file list, every requirement's acceptance criteria extracted **verbatim from the plan file by fixed shell commands** (deterministic `sed`-style extraction, no model improvisation), `## Feature acceptance`, `## Production-risk notes` when present, and the raw `git diff <merge-base>...HEAD`.
- Given a plan doc in the repo's own template format, When the recipe's extraction commands run against it, Then they yield the criteria sections verbatim (validated against the template `pwk-writing-plans` emits).
- Given the recipe, When the packet is built, Then no packet byte passes through any model's output (recipe is pure shell).
- Given a per-requirement `Review: parallel` tag, When its review runs, Then the same recipe applies scoped to that requirement's commits and criteria.

### Integration tests
- `should define the packet recipe in the executing skill` — skill-lint marker: `review-packet.md` recipe block, `git diff <merge-base>...HEAD`, verbatim-extraction commands, `docs/plans/` target.
- `should extract criteria verbatim from a plan-template fixture` — run the recipe's extraction commands (captured from the skill text) against a fixture plan doc shaped like the `pwk-writing-plans` template; assert the criteria sections come out byte-verbatim.
- `should scope per-requirement reviews to the requirement` — executing skill's per-requirement section references the same recipe with requirement scope.

### Checkpoints: spec
### Review: inline

*(The deterministic extraction is why this slice keeps a tests checkpoint — a wrong recipe silently degrades every future review's packet. No production-risk areas per the design.)*

## Requirement 5: One-liner spawn template

### Acceptance criteria
- Given the feature-review section, When read, Then the spawn template for each role is a one-liner: a pointer to the packet file with the role framing appended last — the packet never appears in spawn arguments.
- Given the four spawn prompts, When compared, Then they are identical up to the role-framing tail.
- Given the skill text, When scanned, Then it contains no provider payload syntax (existing anti-provider-syntax suites stay green).

### Integration tests
- `should spawn reviewers with one-liner packet pointers` — skill-lint marker for the spawn template (pointer + role framing last).
- `should keep spawns identical up to the role tail` — the template text (if given as a literal in the skill) differs across roles only after the packet pointer.
- Existing `skill-delegation-contract` / `integration-guidance` provider-syntax bans remain green.

### Checkpoints: none
### Review: skip

## Requirement 6: Advisory resource hints in the delegation contract

### Acceptance criteria
- Given `docs/provider-delegation-contract.md`, When read, Then it documents `model`/`thinking`/`max_turns` in role frontmatter as **advisory**: hosts that support per-role resources SHOULD honor them; an unresolvable model hint falls back to the host default and MUST NOT fail the review; `max_turns` is the per-role instance of the existing `bounded-execution` capability.

### Integration tests
- `should document advisory hints with silent fallback` — `delegation-contract` assertions: advisory wording, fallback-not-fail rule, `bounded-execution` tie-in.

### Checkpoints: none
### Review: skip

## Requirement 7: /pwk-setup fast-model personalization

### Acceptance criteria
- Given `/pwk-setup` with no installed fast-model hint, When run with UI, Then it offers `ctx.ui.select` populated from `ctx.scopedModels` (gated on `ctx.hasUI`) with a skip option, and asks only when no hint is present (re-runs without a new choice are non-interactive).
- Given `--fast-model <name>`, When provided, Then the picker is bypassed (headless path; no UI prompt without `ctx.hasUI`).
- Given a chosen model with the default split, When files are installed, Then installed `pwk-smell-reviewer.md` / `pwk-hazard-reviewer.md` carry `model: <name>` (placeholder replaced); spec/tracing do not. Given the "apply to all four" choice, Then all installed reviewers carry it.
- Given installed copies equal to `canonical + chosen hint`, When setup re-runs with the same choice, Then they are skipped (substitution-aware idempotence — no conflict).
- Given an installed copy whose only delta vs expected is the hint line, When setup runs with a new choice, Then the hint is auto-updated (no conflict, no `--force` needed).
- Given an installed copy with other local edits, When setup runs, Then existing conflict/preserve/`--force` rules apply unchanged.
- Given brainstorm/plan phase (or guard override off during gated phases), When `/pwk-setup` runs, Then it is refused (existing rule unchanged).
- Symlink/FIFO destination rejection unchanged.
- `applyFastModelHint(content, model)` is exported as a pure helper.

### Integration tests
- `applyFastModelHint` unit suite — injects/updates the commented placeholder to a concrete `model:` line; idempotent on repeat; leaves bodies untouched.
- `should install hinted copies for the default split` — temp-project `/pwk-setup --fast-model X`: smell/hazard installed with `model: X`, spec/tracing without.
- `should apply the fast model to all four when chosen` — all-four variant.
- `should be substitution-aware idempotent` — re-run with same choice = no writes, no conflicts.
- `should auto-update hint-only deltas` — change only the installed hint line; re-run with a new model updates it silently.
- `should preserve conflict rules for other deltas` — locally edited body still conflicts unless `--force`.
- `should not prompt headless` — no `ctx.hasUI` → arg or skip, no picker call.
- `should refuse during gated phases` — existing refusal assertions stay green.

### Checkpoints: spec
### Review: inline

## Requirement 8: Doc consistency and packet disposal

### Acceptance criteria
- Given `docs/oversight-model.md`, When read, Then the scope wording matches the packet model (the packet defines scope per review level — the pre-existing feature-vs-requirement inconsistency is gone).
- Given `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `README.md`, When read, Then each mentions the packet and the tier hints consistently with the skills (no restated rules — links to the single sources).
- Given a packet file named `YYYY-MM-DD-<topic>-review-packet.md`, When `pwk-finalizing`'s `????-??-??-<topic>-*` glob runs, Then the packet is matched and disposed with the plan docs.

### Integration tests
- `should fix oversight-model scope wording` — regex: packet defines scope per review level.
- `should mention packet and hints consistently across docs` — one marker each in workflow-phases, developer-usage-guide, README.
- `should dispose review packets with the finalize glob` — assert `YYYY-MM-DD-<topic>-review-packet.md` matches the finalize skill's glob (extract glob from the skill text; minimatch-style check).

### Checkpoints: none
### Review: skip

## Feature acceptance

The primary enforced spec — the whole pipeline composes:

- `should run the tiered packet review pipeline end to end` — Given the canonical role files, skills, and contract at HEAD, When `/pwk-setup --fast-model <m>` runs in a temp project and the feature-review artifacts are assembled per the skill text, Then installed smell/hazard copies carry `model: <m>` while spec/tracing do not; all four installed bodies open byte-identically with the packet-discipline clause and checklists last; the spawn template is a one-liner pointing at a `docs/plans/…-review-packet.md` built by the fixed shell recipe (packet bytes in no spawn argument); the contract documents the hints as advisory with silent fallback; and the finalize glob matches the packet stem.

### Feature review: parallel
