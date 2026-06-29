# Implementation Plan: pi-topdown-kit

## Overview

- **Design:** `docs/plans/2026-06-29-topdown-kit-design.md`
- **Target:** new repo at `/Users/yinlootan/src/pi-topdown-kit`
- **Bootstrap note:** This kit has no `writing-plans` skill (the skeleton replaces the plan). Its first plan is hand-written, old-fashioned sequential tasks. Source ports from `/Users/yinlootan/src/pi-superpowers-plus` (the `pwk-` kit).

The new repo is a docs/config repo: one real TS file (`workflow-guard.ts` + its tests), six skill markdown files, and configs. No application stubs — the `stub()` marker protocol is *documented* in the skills, emitted into target repos by `ptk-scaffold`, not shipped as code here.

## Task 1: Scaffold the new repo

**Files:**
- `package.json` — mirror `pi-workflow-kit`'s; `name: @tianhai/pi-topdown-kit`, `description` updated to scaffold-first, `pi.extensions` + `pi.skills` arrays, same devDeps/scripts
- `tsconfig.json` — verbatim port
- `vitest.config.ts` — verbatim port
- `biome.json` — verbatim port
- `.gitignore` — port (drop `.kotadb/`, keep `node_modules/`)
- `LICENSE` — MIT, port
- `.npmignore` — not needed (`package.json` `files` field controls packaging)

**Steps:**
1. Create `/Users/yinlootan/src/pi-topdown-kit`
2. Write the files above
3. `git init && git add -A && git commit -m "chore: scaffold pi-topdown-kit repo"`
4. `npm install`
5. Verify: `npm test` runs (no tests yet → exits clean), `npx tsc --noEmit` passes

---

## Task 2: Port `workflow-guard.ts` with ptk- phases (TDD)

The only real code. Port + adapt the phase logic.

**Phase logic changes from `pwk-` guard:**
- `SKILL_TO_PHASE` (blocking): `ptk-brainstorming → brainstorm`, `ptk-verify → verify`. **No `plan` phase** (no writing-plans skill). **`ptk-scaffold` is NOT blocking** — it writes source, so it belongs in the unlock set.
- Unlock set (`phase = null`): `ptk-scaffold`, `ptk-execute`, `ptk-finalizing`.
- Update all comments + error messages to reference ptk phases.
- `ptk-diagnose` mirrors `pwk-diagnose` — not specially handled (faithful port; known carryover that diagnose doesn't clear an active blocking phase).

**Files:**
- `extensions/workflow-guard.ts` — port + adapt
- `tests/workflow-guard.test.ts` — port all `isSafeCommand`/`shouldBlockFilePath` cases verbatim (they're phase-agnostic), then add ptk-specific phase cases

**Steps (TDD):**
1. Port `workflow-guard.ts` with ptk phase logic
2. Port the test file; add new cases asserting: `/skill:ptk-brainstorming` sets blocking phase, `/skill:ptk-scaffold`/`ptk-execute`/`ptk-finalizing` unlock, `/skill:ptk-verify` blocks
3. `npm test` → green
4. Commit

---

## Task 3: Port the near-verbatim skills (`ptk-diagnose`, `ptk-verify`, `ptk-finalizing`)

Markdown ports with `pwk-` → `ptk-` cross-reference renames and light edits.

**Files:**
- `skills/ptk-diagnose/SKILL.md` — verbatim port (generic, no cross-refs to rename); update frontmatter `name`
- `skills/ptk-verify/SKILL.md` — port; rename `pwk-` refs to `ptk-`; adjust the "queries filled stubs by markers removed" framing (frontier grep, not progress rows); `it.todo`/`t.Skip` skip markers instead of progress-file completeness
- `skills/ptk-finalizing/SKILL.md` — port; rename refs; **add sentinel + stub-helper removal step** (`.ptk-scaffold` sentinels + `stub()`/`ptkStub()` helpers deleted once frontier grep empty); archive `*-decisions.md` not `*-design.md`; drop the skipped-tasks/progress-file pre-checks (no progress file in this kit)

**Steps:**
1. Write the three files
2. `npm run lint` → green (markdown excluded from biome, but verify no TS broke)
3. Commit

---

## Task 4: `ptk-brainstorming` (trimmed port)

Lighter than `pwk-brainstorming` — drops the heavy concrete-code plan output (that job moves to scaffold) and the Features-table-as-tracker.

**File:** `skills/ptk-brainstorming/SKILL.md`

**Output spec** (from design): produces `docs/plans/YYYY-MM-DD-<topic>-decisions.md` with:
- Problem statement (what/why/constraints)
- Approaches considered + chosen + why
- Decisions log (ADR-style)
- Module outline (names + one-line purpose each — NOT signatures, NOT stub bodies)

**Steps:**
1. Port from `pwk-brainstorming`, trim the plan-output sections, replace the Features-table output with the decisions-doc format above
2. Commit

---

## Task 5: `ptk-scaffold` (new — the heart of the kit)

Absorbs `pwk-writing-plans` + `pwk-design-review`. Spec in design doc §`ptk-scaffold` + §`The marker protocol`.

**File:** `skills/ptk-scaffold/SKILL.md`

**Must cover:**
- Read `docs/plans/*-decisions.md`, extract module outline
- Emit skeleton layer by layer: files, full type defs, named+documented stubs calling `stub("module.layer.method")`, `it.todo`/`t.Skip` test placeholders
- Emit `stub()` marker helper once per language (TS/Go examples); **name-collision note**: if target repo defines `stub()`, use `ptkStub()`
- Write `.ptk-scaffold` sentinel at each module root
- **Hazard check** (folded from `pwk-design-review`): the 6 pillars + 8 hazards + 3 Socratic heuristics, applied to the skeleton; annotate `// HAZARD:` at sites
- `⏸ CHECKPOINT: skeleton` review gate (show `git diff`, review shape before any logic)
- Write boundary: full access; "emit stubs not logic" is a self-constraint

**Steps:**
1. Write the skill, pulling the hazard checklist from `pwk-design-review/SKILL.md`
2. Commit

---

## Task 6: `ptk-execute` (new — replaces executing-tasks)

Spec in design doc §`ptk-execute` + §`The marker protocol`.

**File:** `skills/ptk-execute/SKILL.md`

**Must cover:**
- Find frontier: `grep ptk-stub` (or `ast_search` for `stub("...")`) under `.ptk-scaffold` dirs
- Per increment: pick top-down stub → make `it.todo` real (red) → fill (green) → recursive re-stub if complex → commit
- Done condition: grep empty under sentinels AND no `it.todo`/`t.Skip` remain
- `⏸ CHECKPOINT: done` gates only at `// HAZARD:`-tagged stubs
- Key invariants: tree compiles + green at every commit

**Steps:**
1. Write the skill
2. Commit

---

## Task 7: README

**File:** `README.md`

**Must cover:**
- Scaffold-first philosophy (why: chunking, stepwise refinement, SICP "wishful thinking")
- The workflow diagram: `brainstorm → scaffold → execute → [verify?] → finalize`
- vs `pi-workflow-kit`: philosophical inversion (vertical-slice TDD vs scaffold-first), side-by-side coexistence
- The marker protocol (`stub()` + `.ptk-scaffold` sentinel, grep frontier)
- Install: `pi install npm:@tianhai/pi-topdown-kit`
- Project structure

**Steps:**
1. Write README
2. Commit

---

## Task 8: Publish preparation (document, don't run)

`npm publish` is destructive and user-scoped — document the steps, let the user run.

**Steps:**
1. Set `package.json` `repository.url` to the new GitHub repo (user creates it)
2. Document publish flow in README/CONTRIBUTING: `npm publish` then `pi install npm:@tianhai/pi-topdown-kit`
3. Note the coexistence verification (production-risk area from design): install both kits, confirm no `/skill:` or guard conflicts
4. Commit

---

## Notes

- **No application stubs in this repo** — the `stub()` protocol lives in the skill docs, not as shipped code.
- **Guard coexistence**: both kits ship a `workflow-guard.ts`; each tracks its own module-level `phase` variable. Verify no double-block during Task 8.
- **Sentinel gitignore**: `.ptk-scaffold` must be committable — it's not in any standard ignore. Verified during Task 5's documentation.