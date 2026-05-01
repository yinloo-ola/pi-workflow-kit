# Incorporate mattpocock/skills Ideas into pi-workflow-kit

## Source

Incorporates engineering best practices from [mattpocock/skills](https://github.com/mattpocock/skills) into pi-workflow-kit's existing workflow. The ideas are adapted to fit pi-workflow-kit's tight plan→execute pipeline and artifact lifecycle philosophy.

## Design principles

- **No new forever-documents.** No CONTEXT.md, no persistent glossary. Every artifact has a clear birth and death within the brainstorm→finalize lifecycle.
- **No new external dependencies.** No issue tracker integration, no sub-agent infrastructure.
- **Small, precise edits.** Each change is a few lines in the right place in the existing skill files.

## Changes

### 1. "Design it twice" in brainstorming

**File:** `skills/brainstorming/SKILL.md`

**Current behavior (step 3):**
> Explore approaches — propose 2-3 approaches with trade-offs. Lead with your recommendation.

**New behavior:** Each approach includes a concrete interface sketch — types, method signatures, and example caller code — so the comparison is grounded in actual code, not abstract descriptions.

**Rationale:** Without a concrete interface sketch, the agent can describe two approaches that sound different but collapse to the same implementation. Showing the actual caller code makes the trade-offs visible and forces the agent to think about the interface, not just the architecture.

**Reference:** Matt's `grill-with-docs` and `improve-codebase-architecture` skills both require concrete interface sketches before any discussion proceeds.

---

### 2. ADRs in brainstorming

**File:** `skills/brainstorming/SKILL.md`

**Current behavior:** The brainstorming skill produces a design doc. No mechanism for recording *why* decisions were made.

**New behavior:** During the design presentation (step 4), when a significant architectural decision is identified, the agent offers to write a lightweight ADR to `docs/plans/adr/`. ADRs are short (one paragraph), and only written when all three conditions are met:

1. **Hard to reverse** — changing your mind later has meaningful cost
2. **Surprising without context** — a future reader will wonder "why?"
3. **A real trade-off** — there were genuine alternatives

ADR format:

```markdown
# <Short title of the decision>

<1-3 sentences: context, decision, and why.>
```

**Lifecycle:** ADRs live under `docs/plans/adr/` (writable during brainstorm phase). They get archived to `docs/plans/completed/adr/` during finalizing alongside the design doc. No forever-document.

**Rationale:** The design doc captures *what* was decided. ADRs capture *why*. This matters when someone (human or agent) encounters the code later and wonders about a surprising implementation choice. The strict gating (all 3 conditions) prevents ADR bloat.

**Reference:** Matt's ADR format (single paragraph, optional sections only when genuinely useful). The key adaptation: ADRs live inside `docs/plans/` so they're subject to the same lifecycle as design docs, rather than being a permanent `docs/adr/` directory.

---

### 3. Vertical slices in planning

**File:** `skills/writing-plans/SKILL.md`

**Current behavior:** Tasks are 2-5 minutes of work with exact file paths and code. No guidance on task *structure* — horizontal slices (all DB tasks, then all API tasks) are as valid as vertical slices.

**New behavior:** Each task should be a **vertical slice** — a thin path through ALL relevant layers end-to-end, delivering one complete piece of observable behavior. The plan should explicitly call out horizontal slicing as an anti-pattern.

```
WRONG (horizontal):
  Task 1: Create database schema for users
  Task 2: Write user API endpoints
  Task 3: Build user UI components
  Task 4: Wire everything together

RIGHT (vertical):
  Task 1: User can sign up (model + endpoint + validation + test)
  Task 2: User can log in (auth check + token + test)
  Task 3: User can view profile (query + endpoint + test)
```

**Rationale:** Horizontal slicing produces plans where tasks don't compile or run in isolation — you can't test the schema without the API, you can't test the API without the schema. Vertical slices mean every committed task leaves the codebase in a testable state. This also reduces the blast radius of a bad task — rolling back one vertical slice doesn't break unrelated layers.

**Reference:** Matt's TDD skill ("Anti-Pattern: Horizontal Slices") and `to-issues` skill ("vertical slice rules"). The key adaptation: in pi-workflow-kit, vertical slices are guidance in the planning skill, not a separate skill with issue tracker integration.

---

### 4. Deep modules in TDD refactoring

**File:** `skills/executing-tasks/SKILL.md`

**Current behavior:** TDD discipline is: write test first → see it fail → implement → see it pass. No refactoring guidance after tests pass.

**New behavior:** After all tests pass for a task, add a refactoring check:

- Look for shallow modules (interface nearly as complex as implementation) — can complexity be hidden behind a simpler interface?
- Apply the deletion test: if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
- Extract duplication
- Ensure one adapter = hypothetical seam, two adapters = real seam (don't introduce abstraction unless something actually varies across it)

Key vocabulary to use: **depth** (lots of behavior behind a small interface), **seam** (where behavior can be altered without editing in place), **locality** (change concentrated in one place).

**Rationale:** Without a refactoring pass, the agent treats "tests pass" as "done." Over many tasks, this accumulates shallow modules — thin wrappers that add indirection without hiding complexity. A lightweight refactoring checklist prevents this accumulation.

**Reference:** Matt's TDD skill (refactoring checklist) and `improve-codebase-architecture` skill (depth, seam, locality vocabulary). The key adaptation: a brief checklist in the existing TDD section, not a full architecture review skill.

---

### 5. Diagnose skill (new standalone skill)

**File:** `skills/diagnose/SKILL.md` (new)

**What it is:** A 6-phase debugging discipline the user invokes when a test fails, a bug is found, or something is broken during execution. It sits outside the brainstorm→finalize pipeline — a utility skill used on demand.

**Phases:**

1. **Build a feedback loop** — the core insight. Before doing anything else, create a fast, deterministic, agent-runnable pass/fail signal for the bug (failing test, curl script, CLI invocation, etc.). "Build the right feedback loop, and the bug is 90% fixed."
2. **Reproduce** — run the loop, confirm it matches the user's reported symptom
3. **Hypothesise** — generate 3-5 ranked falsifiable hypotheses. Show the list to the user before testing — they often have domain knowledge that re-ranks instantly
4. **Instrument** — add targeted debug logs with unique tags (e.g. `[DEBUG-a4f2]`) for easy cleanup. One variable at a time
5. **Fix + regression test** — write the regression test before the fix, if a correct test seam exists
6. **Cleanup** — remove all debug logs, verify original repro no longer triggers, document what would have prevented the bug

**Design decisions:**

- **No extension changes needed.** Diagnose is a standalone skill invoked explicitly by the user. It doesn't need workflow-guard integration — if the user invokes it during execution, the workflow-guard already allows all tools.
- **Not a pipeline phase.** It's a utility skill like a wrench — you pick it up when needed. The brainstorm→plan→execute→finalize pipeline remains unchanged.
- **Phase 1 is the skill.** The other phases are mechanical. The skill should emphasize that spending disproportionate effort on building the feedback loop is the correct strategy.

**Rationale:** Pi-workflow-kit currently has no debugging flow. When a test fails during execution, the agent is unguided — it might stare at code, add random logs, or try shotgun debugging. A disciplined loop prevents wasted time and ensures bugs are properly locked down with regression tests.

**Reference:** Matt's `diagnose` skill. The key adaptation: simplified to fit pi-workflow-kit's concise skill style (~30-40 lines instead of ~120 lines with supporting files). No CONTEXT.md dependency — the agent uses the codebase's own terminology.

---

## What's NOT being incorporated

| Idea | Why not |
|------|---------|
| CONTEXT.md | Accumulates without bound, rots over time, doesn't scale to monorepos |
| Triage / to-issues / to-prd | Tightly coupled to GitHub/GitLab issue trackers, outside pi-workflow-kit's scope |
| setup skill | Scaffolding for issue tracker config — not relevant without issue tracker integration |
| caveman / grill-me | Fun but orthogonal to workflow |
| Full improve-codebase-architecture | Too heavy (~100+ lines, multiple reference files, depends on CONTEXT.md) |
| Parallel sub-agents | Not available in pi currently |

## Files changed

| File | Change |
|------|--------|
| `skills/brainstorming/SKILL.md` | Add "design it twice" interface sketches, add ADR output |
| `skills/writing-plans/SKILL.md` | Add vertical slice guidance with anti-pattern example |
| `skills/executing-tasks/SKILL.md` | Add refactoring checklist with deep modules vocabulary |
| `skills/diagnose/SKILL.md` | New skill file (6-phase debugging loop) |
| `docs/developer-usage-guide.md` | Mention diagnose skill and ADR output |
| `docs/workflow-phases.md` | Mention diagnose as a utility skill |
| `README.md` | Add diagnose to skills table |
