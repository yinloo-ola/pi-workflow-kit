# Design: pi-topdown-kit (`ptk-`)

> A scaffold-first workflow kit for pi coding agents. Sibling to `pi-workflow-kit` (`pwk-`), maintained alongside it. The two are philosophically inverted but share plumbing.

## TL;DR

`pi-workflow-kit` enforces TDD via **vertical slices** and treats the plan as **markdown prose** that execute translates into code. `pi-topdown-kit` inverts both: the **skeleton IS the plan** — real, compilable code — and execute **fills stubs layer by layer** (horizontal), with recursive re-stubbing when a fill is too complex. Progress is tracked by `grep`, not a status file.

```
brainstorm  →  scaffold  →  execute  →  [verify?]  →  finalize
 (why/what)    (shape)      (behavior)   (review)     (ship)
```

## Why a new kit, not a revamp

The current kit's core value proposition is *"TDD discipline via vertical slices."* Its `writing-plans` skill explicitly shows layer-by-layer work as the **WRONG (horizontal)** anti-example. The topdown kit **embraces exactly that pattern** as its first principle. This is a philosophical inversion of the package's identity, not an iteration. Maintaining both as distinct products lets each be faithful to its own philosophy.

## The philosophical lineage

This is classical **stepwise refinement** (Wirth, 1971) and **"programming by wishful thinking"** (SICP / Abelson & Sussman), driven by a cognitive-load argument: expert programmers read code top-down by **chunking** familiar lines into high-level concepts. Layered, top-down production matches that mental model better than flat vertical-slice task lists. The trade-off accepted: per-step end-to-end runnability is traded for top-down readability — mitigated by keeping the tree green at every commit (stubs compile; unfilled tests are skipped, not failing).

## The synthesis that makes it work

Pure top-down layering loses the TDD safety net. Pure vertical slices lose the shape-review benefit. This kit splits them into two phases:

1. **Scaffold** — emit the full layered structure + named, documented method stubs. Reviewable as a commit, before any logic exists. (Chunking benefit lands here.)
2. **Execute** — fill stubs layer by layer, but each fill is one stub + its unit test, kept green. Recursive re-stubbing when a fill is too complex. (TDD safety net returns here.)

The skeleton is the map; layer-by-layer fill is the order you pave it.

## Skills

Seven skills, prefix `ptk-`. Two are new, one is trimmed, the rest port from `pwk-` with light edits. design-review **folds into scaffold** (adversarial lens becomes a hazard-checklist step at the review gate).

| Skill | Source | Status in this design |
|---|---|---|
| `ptk-brainstorming` | port from `pwk-brainstorming`, **trimmed** | ⬜ pending |
| `ptk-scaffold` | **new** (absorbs `pwk-writing-plans` + `pwk-design-review`) | ⬜ pending |
| `ptk-execute` | **new** (replaces `pwk-executing-tasks`) | ⬜ pending |
| `ptk-verify` | port from `pwk-verify`, light edit | ⬜ pending |
| `ptk-finalize` | port from `pwk-finalizing`, light edit | ⬜ pending |
| `ptk-diagnose` | port from `pwk-diagnose`, unchanged | ⬜ pending |
| `workflow-guard` | port, **one-line change** | ⬜ pending |

### `ptk-brainstorming` (trimmed)

Read-only. Asks questions one at a time, understands the problem, clarifies approaches, records decisions. Output is a **lighter decisions doc** than the current design doc — it drops the heavy "concrete-code plan" output (that job moves to scaffold) and the Features-table-as-task-tracker (replaced by the grep frontier).

Produces `docs/plans/YYYY-MM-DD-<topic>-decisions.md`:
- Problem statement (what, why, constraints)
- Approaches considered + the chosen one + why
- Decisions log (ADR-style entries for hard-to-reverse calls)
- Module outline — a rough list of modules/layers scaffold will create (names + one-line purpose each). NOT signatures, NOT stub bodies. Just the shape sketch.

Write boundary: only `docs/plans/`. Unchanged from current.

### `ptk-scaffold` (new — the heart of the kit)

Reads the decisions doc. Materializes the **system design blueprint as real code** in the repo. This is where the chunking benefit lands: you review the entire system's shape as a diff before any logic exists.

**Process:**
1. Read `docs/plans/*-decisions.md`. Extract module outline.
2. Emit the skeleton, layer by layer:
   - **Files**: create module files for each layer (API, service, data, etc.) per the decisions doc.
   - **Types**: full type/interface definitions with fields (these are concrete — needed for the skeleton to type-check).
   - **Stubs**: every method/function as a named, documented stub with a one-line doc comment, calling the `stub()` marker. **No logic.** Bodies are `return stub("module.layer.method")`.
   - **Tests**: one test file per module. Each stub gets a `it.todo("...")` (TS/vitest) or `t.Skip` (Go) placeholder — never a failing assertion. The tree stays green.
3. Emit the **`stub()` marker helper** once per language (e.g. `src/_ptk/stub.ts`):
   ```ts
   export function stub(path: string): never {
     throw new Error(`[ptk-stub] ${path}`);
   }
   ```
4. Write a **sentinel** `.ptk-scaffold` at the root of each scaffolded module tree. Presence = "this tree is an active frontier." Executed when its subtree's grep goes empty.
5. **Hazard check** (absorbed from design-review) — before the review gate, run the production-risk checklist against the skeleton:
   - Database schema / migrations
   - Authentication / authorization boundaries
   - External API / service integrations
   - Concurrency / batch processing
   - File uploads / large data flows
   - Redis / caching / message queues
   For any hit, annotate the skeleton with a `// HAZARD:` comment at the site, to be verified during execute's fill of that stub.
6. `⏸ CHECKPOINT: skeleton` — **present the skeleton for review.** Show `git diff` (or `git diff --cached` if pre-staged). The human reviews: layering, module boundaries, naming, doc comments, signatures, type definitions, hazard annotations. This is the deliberate "review the whole shape" gate. No logic exists yet — fixes are one-line stub edits, cheap.
7. On approval: commit the skeleton. Hand off to `ptk-execute`.

**Write boundary:** full access (like execute/finalize). The "emit stubs not logic" rule lives in the skill's own instructions, same way execute self-constrains via the plan in the old kit.

### `ptk-execute` (new — replaces executing-tasks)

Fills stubs. **Layer by layer** (top-down), one stub + its unit test per increment, kept green at every commit.

**Process (per increment):**
1. **Find the frontier** — `grep "ptk-stub"` (or `ast_search` for `stub("...")` call nodes) under every dir containing a `.ptk-scaffold` sentinel. This is the live, drift-free todo list. No progress file.
2. **Pick the next stub** — top-down preference: fill the highest layer (API) first, descend to service, then data. Within a layer, fill stubs in dependency order.
3. **Make the test real** — the stub's `it.todo(...)` becomes a concrete `it(...)` with assertions derived from the stub's doc comment (which IS the spec). Run it → confirm fail.
4. **Fill the stub** — write the body. Simplest code to pass the test.
5. **Recursive re-stub** — if the fill is too complex to fit comfortably, **don't force it.** Extract sub-functions as *new* `stub()` call sites with their own doc comments and `it.todo` tests. These appear in the next frontier query automatically. This is stepwise refinement: fill, discover complexity, defer to a sub-stub.
6. **Run** — the filled test passes; all other stubs still skip. Tree green.
7. **Commit.**
8. **Loop** — back to step 1. When `grep "ptk-stub"` returns empty under all sentinels, the feature is done.

**Done condition:** `grep "ptk-stub"` empty under every `.ptk-scaffold` sentinel, AND no `it.todo`/`t.Skip` markers remain.

**Checkpoint gates** (optional, per the decisions doc's hazard annotations): if a stub was tagged `// HAZARD:` by scaffold, execute pauses at `⏸ CHECKPOINT: done` after filling it — adversarial review of the production-risk handling before commit. Mirrors the old kit's checkpoint mechanism, scoped to hazard sites only.

**Write boundary:** full access.

### `ptk-verify` (port, light edit)

Three expert review passes (security, optimization, traceability) on the filled code. Ports from `pwk-verify` largely unchanged. The only edit: it queries filled stubs by "stub markers removed" rather than "progress rows complete."

### `ptk-finalize` (port, light edit)

Archive decisions doc, curate lessons, create PR. The key edit: **remove the `.ptk-scaffold` sentinels and delete the `stub()` helper** once the frontier is empty (no longer needed after ship). No progress table to archive.

### `ptk-diagnose` (port, unchanged)

Utility skill, not a pipeline phase. Ports verbatim.

### `workflow-guard` (port, one-line change)

Same mechanism as `pwk-`'s guard. Phase map gains `ptk-scaffold` as an unlocked phase (it writes source):

```js
if (text.startsWith("/skill:pwk-executing-tasks") ||
    text.startsWith("/skill:pwk-finalizing") ||
    text.startsWith("/skill:ptk-scaffold") ||        // ← add
    text.startsWith("/skill:ptk-execute") ||          // ← add
    text.startsWith("/skill:ptk-finalize")) {         // ← add
  phase = null;
}
```

`ptk-brainstorming` maps to a blocking `brainstorm` phase (write to `docs/plans/` only), mirroring `pwk-brainstorming`. `ptk-verify` maps to a blocking `verify` phase. `ptk-diagnose` is unrestricted.

## The marker protocol (drift-free progress)

The center of the kit. Replaces the old progress-file table.

**Marker helper** — one per language, emitted by scaffold:
```ts
// TS
export function stub(path: string): never {
  throw new Error(`[ptk-stub] ${path}`);
}
```
```go
// Go
func Stub(path string) {
    panic(fmt.Sprintf("[ptk-stub] %s", path))
}
```

**Every stub calls it:**
```ts
/** Registers a user. Returns User. Throws DuplicateEmail on conflict. */
export async function signup(input: SignupInput): Promise<User> {
  return stub("auth.service.signup");
}
```

**Frontier queries:**
- **What's pending?** → `grep "ptk-stub"` under `.ptk-scaffold` dirs (or `ast_search` for `stub("...")` nodes for zero false positives)
- **What's filled?** → the marker call is gone from that function
- **Progress count** → `grep -c`
- **Done?** → grep empty under all sentinels
- **Recursive spawn** → execute writes a new `stub()` call; it just shows up in the next query

**Why a symbol, not prose:** `grep "not implemented"` collides with stray comments, vendored deps, and unrelated monorepo packages. `stub("...")` is a structural call site — `ast_search` matches it with zero false positives. Two layers of defense:
1. **Scope** — grep only under `.ptk-scaffold` sentinel dirs (handles greenfield modules).
2. **Distinctive marker** — the `ptk-stub` symbol handles the modify-existing-files case where directory scope doesn't apply.

**Sentinel behavior:** `.ptk-scaffold` is written by scaffold at each module root. Presence = active frontier. Removed by finalize when its subtree's grep goes empty. Self-describing across sessions (survives `/new`), can't drift.

## Key invariants (must hold at every commit)

1. **The tree compiles and type-checks.** Stub bodies return `never` (TS) / panic (Go); they don't break callers.
2. **Every commit is green.** Filled stubs have passing tests; unfilled stubs have `it.todo`/`t.Skip` (skipped, not failing).
3. **The frontier is grep-queryable.** No separate status file to maintain or drift from reality.
4. **Scaffold emits shape, execute emits behavior.** No logic in scaffold; no new architecture in execute (only re-stubbing of complexity found during fill).

## Project structure (new repo)

```
pi-topdown-kit/
├── extensions/
│   └── workflow-guard.ts          # Ported, +3 lines for ptk- phases
├── skills/
│   ├── ptk-brainstorming/SKILL.md  # Trimmed port
│   ├── ptk-scaffold/SKILL.md       # NEW
│   ├── ptk-execute/SKILL.md        # NEW
│   ├── ptk-verify/SKILL.md         # Light port
│   ├── ptk-finalize/SKILL.md       # Light port
│   └── ptk-diagnose/SKILL.md       # Verbatim port
├── tests/
│   └── workflow-guard.test.ts      # Ported, +cases for ptk- phases
├── docs/
│   └── plans/
├── package.json                    # @tianhai/pi-topdown-kit
├── README.md                       # New identity, scaffold-first
└── LICENSE
```

## Features

| # | Feature | Status | Observable Behavior |
|---|---------|--------|---------------------|
| 1 | New repo scaffolded as `@tianhai/pi-topdown-kit` | ⬜ pending | Repo exists with package.json, tsconfig, biome, vitest, README with new identity; `npm test` runs green |
| 2 | `workflow-guard` ported with `ptk-` phase support | ⬜ pending | `ptk-brainstorming` blocks source writes; `ptk-scaffold`/`ptk-execute`/`ptk-finalize` unlock writes; `ptk-verify` blocks |
| 3 | Guard tests cover all `ptk-` phases | ⬜ pending | `workflow-guard.test.ts` has cases asserting block/unblock for each `ptk-` skill invocation |
| 4 | `ptk-brainstorming` skill (trimmed port) | ⬜ pending | Invoked via `/skill:ptk-brainstorming`; asks questions one at a time; produces `docs/plans/*-decisions.md` with problem, approaches, decisions, module outline; writes blocked outside `docs/plans/` |
| 5 | `ptk-diagnose` skill (verbatim port) | ⬜ pending | Invoked via `/skill:ptk-diagnose`; runs the 6-phase debug loop; write access unrestricted |
| 6 | `ptk-scaffold` skill (new) | ⬜ pending | Invoked via `/skill:ptk-scaffold`; reads decisions doc; emits layered skeleton (files, types, named+documented `stub()` stubs, `it.todo` tests); writes `stub()` helper + `.ptk-scaffold` sentinels; runs hazard checklist; pauses at `⏸ CHECKPOINT: skeleton` before commit |
| 7 | `ptk-execute` skill (new) | ⬜ pending | Invoked via `/skill:ptk-execute`; greps `ptk-stub` frontier; fills one stub + makes test real per increment; recursively re-stubs complexity; tree green at every commit; done when grep empty under sentinels |
| 8 | `ptk-verify` skill (light port) | ⬜ pending | Invoked via `/skill:ptk-verify`; runs security/optimization/traceability passes over filled stubs; reports findings |
| 9 | `ptk-finalize` skill (light port) | ⬜ pending | Invoked via `/skill:ptk-finalize`; removes `.ptk-scaffold` sentinels + `stub()` helper when frontier empty; archives decisions doc; creates PR |
| 10 | Marker protocol (`stub()` + sentinel) | ⬜ pending | `stub("path")` helper exists per language; `.ptk-scaffold` sentinel written by scaffold, removed by finalize; frontier queryable via `grep ptk-stub` |
| 11 | README documents scaffold-first philosophy | ⬜ pending | README explains why/what/how vs `pi-workflow-kit`, the marker protocol, the phase model, side-by-side coexistence |
| 12 | Published to npm as `@tianhai/pi-topdown-kit` | ⬜ pending | `pi install npm:@tianhai/pi-topdown-kit` works; installs alongside `@tianhai/pi-workflow-kit` without conflict |

## Production-risk review areas

This design introduces a new published package. Areas that warrant review before/during implementation:

- **npm package coexistence** — `ptk-` and `pwk-` kits must install side-by-side without skill-prefix or extension conflicts. Verify pi's skill/extension registration handles two kits' `/skill:` commands and guards coexisting.
- **Guard extension interaction** — both kits ship a `workflow-guard.ts`. When both are installed, confirm they don't double-block or conflict on phase tracking. (Likely fine — each tracks its own `phase` module variable — but verify.)
- **Marker helper collisions** — `stub()` is a common name. If the target repo already defines `stub()`, the scaffold's helper needs a namespaced fallback (`ptkStub()`). Document this in scaffold.
- **Sentinel file gitignore risk** — `.ptk-scaffold` must not match common `.gitignore` patterns (dotfiles). Verify it gets committed.

---

## After the design

Ready to plan? Since this new kit deliberately has **no `writing-plans` skill** (the skeleton replaces the plan), its first plan gets hand-written the old-fashioned way — or, recursively, we could scaffold this very kit using its own workflow once `ptk-scaffold` exists. Irony intended.

Next concrete step: say "plan it" and I'll hand-write the first implementation plan for building `pi-topdown-kit`, then we execute.