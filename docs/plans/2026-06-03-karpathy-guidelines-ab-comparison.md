# A/B Comparison: Writing Plans — Karpathy Behavioral Guidelines

## Setup
- **Same design doc** (bookmarks: CRUD + search)
- **Same Go project scaffold**
- **Same prompt** (no questions, full plan with concrete code)
- **Variant A** (WITHOUT guidelines): 292-line SKILL.md — original writing-plans skill
- **Variant B** (WITH guidelines): 354-line SKILL.md — with Behavioral Guidelines section appended

---

## Structural Comparison

| Dimension | A (Without) | B (With) |
|---|---|---|
| **Total tasks** | 4 | 6 |
| **Lines in plan** | ~1,054 | ~1,019 |
| **New files per plan** | 7 files in Task 1 alone | 1-2 files per task |
| **External dependency** | None (stdlib only) | `github.com/google/uuid` |

---

## Task Decomposition

### A (Without) — 4 tasks
| Task | Scope | Files touched |
|---|---|---|
| 1 | Bookmark + ALL infrastructure (model, store interface, mem store with full CRUD, service, handler, errors, route, tests) | 7 files |
| 2 | Delete bookmark | 3 files |
| 3 | List bookmarks (paginated, cursor) | 3 files |
| 4 | Search bookmarks (keyword + pagination) | 3 files |

### B (With) — 6 tasks
| Task | Scope | Files touched |
|---|---|---|
| 1 | Scaffold (go.mod + model only) | 2 files |
| 2 | Bookmark a message (store + handler + test + route) | 4 files |
| 3 | List bookmarks (offset/limit pagination) | 4 files |
| 4 | Remove a bookmark | 4 files |
| 5 | Search bookmarks (keyword) | 4 files |
| 6 | Final wiring + integration lifecycle test | 2 files |

---

## Detailed Analysis by Guideline

### Simplicity First

**A (Without):** ⚠️ **Overbuilt in Task 1.** Task 1 creates a `BookmarkStore` interface with 4 methods (Create, Delete, ListByUser, SearchByUser) — methods that won't be used until Tasks 2-4. It also creates the full `MemoryStore` implementation with all 4 methods, an `errors.go` file, a `Service` struct, AND the handler — all in a single task. The store interface is the full contract upfront before any task exercises most of it.

**B (With):** ✅ **Minimal per task.** Task 1 only creates `go.mod` + the `Bookmark` struct. Task 2 introduces `Store` with only `Create`, and `MemStore` with only `Create`. `List` is added to the interface in Task 3, `Delete` in Task 4, `Search` in Task 5 — each method appears when it's needed, not before.

**Verdict:** Guidelines had a clear positive effect. Plan B builds only what each task needs.

### Surgical Changes

**A (Without):** ⚠️ Task 1 touches 7 files in one go (model, store interface, store mem, errors, service, handler, main.go). The Task 1 description says "create the full vertical slice" which bundles infrastructure that isn't tested yet.

**B (With):** ✅ Each task touches 1-2 files for new code. Task 1 creates 2 files (go.mod, model.go). Task 2 adds 3 new files + modifies main.go. No task creates more than 4 files.

**Verdict:** Guidelines had a clear positive effect. Plan B has tighter blast radius per task.

### Think Before Coding (surface assumptions)

**A (Without):** ❌ Silent assumptions throughout:
- Used cursor-based pagination without noting the design just said "paginated" — didn't surface that offset-based vs cursor-based is a choice
- Added `sync.RWMutex` and concurrent safety without the design mentioning concurrency
- Created a `Service` layer between handler and store without justification

**B (With):** ⚠️ Still has assumptions but more defensible:
- Used offset/limit pagination (simpler, matches "paginated" literally)
- No concurrency concerns added (store uses `sync.Mutex` only, no RWMutex overhead)
- No `Service` layer — handler calls store directly
- Did add `github.com/google/uuid` dependency without asking — minor assumption

**Verdict:** Marginal positive effect. Plan B is less presumptuous but both plans made assumptions. Neither explicitly surfaced tradeoffs to the user.

### Goal-Driven Execution

**A (Without):** ✅ Good acceptance criteria with Given/When/Then. Has a `checkpoint: test` on 3/4 tasks and `checkpoint: done` on the last task.

**B (With):** ✅ Good acceptance criteria. Has `checkpoint: test` on 3 tasks, `checkpoint: done` on 1, and no checkpoint on 2 simpler tasks. Added a full lifecycle integration test in Task 6 that wasn't in A.

**Verdict:** Roughly equivalent. Both plans have strong acceptance criteria (required by the base skill). The lifecycle test in B is a nice bonus that catches integration issues.

---

## Unrelated Observations (noise, not guidelines)

| Observation | A (Without) | B (With) |
|---|---|---|
| Pagination style | Cursor-based (more complex) | Offset-based (simpler) |
| External deps | None | `google/uuid` |
| Handler method naming | `Create`, `Delete`, `List`, `Search` | `CreateBookmark`, `DeleteBookmark`, `ListBookmarks`, `SearchBookmarks` |
| Test structure | Single `TestXxx` with `t.Run` subtests | Separate top-level test functions |
| `make([]T, 0, len)` usage | Yes (mem store candidates) | Yes (list handler, search handler) |

---

## Overall Assessment

| Guideline | Effect | Evidence |
|---|---|---|
| **Simplicity First** | ✅ Strong positive | B builds incrementally; A front-loads the full store interface |
| **Surgical Changes** | ✅ Positive | B touches fewer files per task (1-4 vs 7 in Task 1) |
| **Think Before Coding** | ⚠️ Marginal | B made fewer silent assumptions but neither surfaced tradeoffs explicitly |
| **Goal-Driven Execution** | ≈ Neutral | Both strong; base skill already enforces acceptance criteria |

**Bottom line (iteration 1):** The guidelines measurably improved the plan. The biggest win is **Simplicity First** — Plan B's incremental interface growth (adding methods to `Store` as each task needs them) is clearly better than Plan A's upfront full-contract approach. This is exactly the kind of thing "no abstractions for single-use code" catches.

**Weakness:** Neither plan explicitly called out assumptions or asked clarifying questions — the "Think Before Coding" guideline had the weakest signal. The guidelines alone may not be enough to overcome the model's tendency to fill gaps silently.

---

## Iteration 2: Revised Guidelines

### What changed

The guidelines were reworked from 4 generic coding rules to 3 planning-specific principles:

| v1 (Generic) | v2 (Planning-Specific) | Why |
|---|---|---|
| Think Before Coding | **Surface Assumptions** | v1 said "ask" — the agent ignores this when told not to ask. v2 says "annotate in the plan" with a concrete `> **Assumption:** ...` format and examples of what to annotate. |
| Simplicity First | **Build Only What Each Task Needs** | Kept the same core principle but added the specific anti-pattern from the v1 A/B test: "don't define interface methods that no task exercises yet." |
| Surgical Changes | **One Task, One Change** | Reframed from "don't touch adjacent code" to "each task should trace to exactly one user-facing behavior" with a concrete guardrail (max 4 new files). |
| Goal-Driven Execution | *(removed)* | Redundant — the base skill already enforces Given/When/Then acceptance criteria. |

### Iteration 2 Plan (v2 guidelines) vs Iteration 1 Plans

| Dimension | A (No guidelines) | B1 (v1 guidelines) | B2 (v2 guidelines) |
|---|---|---|---|
| **Total tasks** | 4 | 6 | 4 |
| **Max files/task** | 7 (Task 1) | 4 | 4 |
| **Assumptions annotated** | 0 | 0 | **4** (header below) |
| **External deps** | None | `google/uuid` | None |
| **Store interface** | 4 methods upfront in Task 1 | 1 method per task | 1 method per task |
| **Service layer** | Yes (unjustified) | No | No |

### The big win: Surface Assumptions

Plan B2 opens with four explicit assumption annotations:

```
> **Assumption:** User identification via X-User-ID request header since
> no auth system exists in the project.

> **Assumption:** Bookmarks include a Note field so users can annotate
> bookmarks. The design says "search by keyword" but doesn't specify
> the field.

> **Assumption:** Offset/limit pagination (not cursor-based).

> **Assumption:** In-memory store behind a Store interface.
```

None of the previous plans (A or B1) did this. The v1 "Think Before Coding" guideline was completely invisible in output. The v2 "Surface Assumptions" guideline produced visible, reviewable annotations on the first run.

### Iteration 2 Assessment

| Guideline | v1 Effect | v2 Effect | Improvement |
|---|---|---|---|
| **Surface Assumptions** (was Think Before Coding) | ⚠️ Invisible | ✅ 4 explicit annotations | Complete turnaround — concrete format + examples fixed the weakest signal |
| **Build Only What's Needed** (was Simplicity First) | ✅ Strong | ✅ Strong | Maintained — interface still grows incrementally |
| **One Task, One Change** (was Surgical Changes) | ✅ Positive | ✅ Positive | Maintained — max 4 files/task |

**Bottom line (iteration 2):** The v2 guidelines fixed the weakest signal from v1. "Surface Assumptions" went from invisible to producing 4 explicit, reviewable annotations. The other two principles maintained their positive effect. The removal of "Goal-Driven Execution" (redundant) reduced noise without losing signal.
