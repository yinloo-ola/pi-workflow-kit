# Implementation Plan: Incorporate mattpocock/skills Ideas

Design doc: `docs/plans/2026-05-01-incorporate-mattpocock-skills-design.md`

## Task 1: Update brainstorming skill — design it twice + ADRs

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Edit `skills/brainstorming/SKILL.md`:

**Step 3** — change from:

```
3. **Explore approaches** — propose 2-3 approaches with trade-offs. Lead with your recommendation.
```

to:

```
3. **Explore approaches** — propose 2-3 approaches. For each approach, sketch the concrete interface (types, method signatures, example caller code) so the comparison is grounded in actual code, not abstract descriptions. Lead with your recommendation.
```

**Step 4** — change from:

```
4. **Present the design** — break it into sections of 200-300 words. Check after each section whether it looks right. Cover: architecture, components, data flow, error handling, testing.
```

to:

```
4. **Present the design** — break it into sections of 200-300 words. Check after each section whether it looks right. Cover: architecture, components, data flow, error handling, testing.

   When a significant architectural decision is identified, offer to write a lightweight ADR to `docs/plans/adr/`. Only write an ADR when all three are true:

   1. **Hard to reverse** — changing your mind later has meaningful cost
   2. **Surprising without context** — a future reader will wonder "why?"
   3. **A real trade-off** — there were genuine alternatives

   ADR format — a title and 1-3 sentences covering context, decision, and why:

   ```markdown
   # <Short title of the decision>

   <1-3 sentences: context, decision, and why.>
   ```

   ADRs live under `docs/plans/adr/` and are archived during finalizing alongside the design doc.
```

```bash
git commit -m "feat(brainstorming): add design-it-twice interface sketches and ADR output"
```

---

## Task 2: Update writing-plans skill — vertical slices

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Edit `skills/writing-plans/SKILL.md` — add a new section after "## Task format" and before "## TDD in the plan":

```markdown
## Vertical slices

Each task should be a **vertical slice** — a thin path through ALL relevant layers end-to-end, delivering one complete piece of observable behavior.

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

Vertical slices ensure every committed task leaves the codebase in a testable state and reduces the blast radius of a bad task.
```

```bash
git commit -m "feat(writing-plans): add vertical slice guidance with anti-pattern example"
```

---

## Task 3: Update executing-tasks skill — deep modules refactoring

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Edit `skills/executing-tasks/SKILL.md` — add a new section after "## TDD discipline":

```markdown
## Refactoring

After all tests pass for a task, check for refactoring opportunities:

- **Shallow modules** — is the interface nearly as complex as the implementation? Can complexity be hidden behind a simpler interface?
- **Deletion test** — if you deleted this module, would complexity vanish (pass-through) or reappear across callers (earning its keep)?
- **Duplication** — extract repeated patterns
- **Seam discipline** — don't introduce abstraction unless something actually varies across it. One adapter = hypothetical seam. Two adapters = real seam

Run tests after each refactor step. Never refactor while tests are failing.

Key vocabulary: **depth** (lots of behavior behind a small interface), **seam** (where behavior can be altered without editing in place), **locality** (change concentrated in one place).
```

```bash
git commit -m "feat(executing-tasks): add refactoring checklist with deep modules vocabulary"
```

---

## Task 4: Create diagnose skill

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Create `skills/diagnose/SKILL.md`:

```markdown
---
name: diagnose
description: "Disciplined debugging loop for hard bugs and performance regressions. Use when a test fails unexpectedly, a bug is found during execution, or something is broken."
---

# Diagnose

A 6-phase debugging discipline. Phase 1 is the skill — spend disproportionate effort here.

## Phase 1 — Build a feedback loop

Create a fast, deterministic, agent-runnable pass/fail signal for the bug before doing anything else. Try in this order: failing test, curl script, CLI invocation, headless browser script.

The loop must produce the failure mode the **user** described — not a nearby but different failure. Iterate on the loop itself: can you make it faster? Sharper? More deterministic?

If you genuinely cannot build a loop, stop and say so. List what you tried. Ask for access to a reproducing environment or a captured artifact.

Do not proceed until you have a loop you believe in.

## Phase 2 — Reproduce

Run the loop. Confirm:
- The failure matches the user's reported symptom
- The failure is reproducible across multiple runs
- You've captured the exact symptom (error message, wrong output, slow timing)

## Phase 3 — Hypothesise

Generate 3-5 ranked hypotheses. Each must be falsifiable:

> "If `<X>` is the cause, then `<changing Y>` will make the bug disappear / `<changing Z>` will make it worse."

Show the ranked list to the user before testing. They often have domain knowledge that re-ranks instantly.

## Phase 4 — Instrument

Each probe must map to a specific hypothesis. Change one variable at a time. Tag every debug log with a unique prefix (e.g. `[DEBUG-a4f2]`) for easy cleanup later. Prefer a debugger breakpoint over logs when available.

## Phase 5 — Fix + regression test

Write the regression test **before** the fix — but only if there's a correct seam (one that exercises the real bug pattern at the call site). If no correct seam exists, note it — the codebase architecture is preventing the bug from being locked down.

## Phase 6 — Cleanup

Required before declaring done:
- Original repro no longer triggers
- Regression test passes (or absence of seam is documented)
- All `[DEBUG-...]` instrumentation removed
- Ask: what would have prevented this bug?
```

```bash
git commit -m "feat(diagnose): add standalone debugging skill with 6-phase loop"
```

---

## Task 5: Update finalizing skill — archive ADRs

<!-- tdd: trivial -->
<!-- checkpoint: none -->

Edit `skills/finalizing/SKILL.md` — update step 1 from:

```
1. **Move planning docs** — archive the design, implementation, and progress docs, then commit:
   ```
   mkdir -p docs/plans/completed
   mv docs/plans/*-design.md docs/plans/completed/
   mv docs/plans/*-implementation.md docs/plans/completed/
   mv docs/plans/*-progress.md docs/plans/completed/
   git add docs/plans/ && git commit -m "chore: archive planning docs"
   ```
```

to:

```
1. **Move planning docs** — archive the design, implementation, progress docs, and ADRs (if any), then commit:
   ```
   mkdir -p docs/plans/completed
   mkdir -p docs/plans/completed/adr
   mv docs/plans/*-design.md docs/plans/completed/
   mv docs/plans/*-implementation.md docs/plans/completed/
   mv docs/plans/*-progress.md docs/plans/completed/
   mv docs/plans/adr/*.md docs/plans/completed/adr/ 2>/dev/null || true
   rmdir docs/plans/adr 2>/dev/null || true
   git add docs/plans/ && git commit -m "chore: archive planning docs"
   ```
```

```bash
git commit -m "feat(finalizing): archive ADRs alongside planning docs"
```

---

## Task 6: Update documentation

<!-- tdd: trivial -->
<!-- checkpoint: none -->

### README.md

Update the intro line from:

```
**4 workflow skills** that guide the agent through a structured development process:
```

to:

```
**4 workflow skills** and **1 utility skill** that guide the agent through a structured development process:
```

Update the pipeline diagram from:

```
brainstorm → plan → execute → finalize
```

to:

```
brainstorm → plan → execute → finalize
                          ↕
                      diagnose (on demand)
```

Add `diagnose` to the skills table:

```
| `diagnose` | ~35 | 6-phase debugging loop: build feedback loop, reproduce, hypothesise, instrument, fix, cleanup |
```

Update the Architecture section to include `diagnose/`:

```
├── skills/
│   ├── brainstorming/SKILL.md
│   ├── writing-plans/SKILL.md
│   ├── executing-tasks/SKILL.md
│   ├── finalizing/SKILL.md
│   └── diagnose/SKILL.md
```

### docs/developer-usage-guide.md

Add to the brainstorm section (after "Outcome"):

```
- Optionally writes ADRs to `docs/plans/adr/` for significant architectural decisions
```

Add a new section after the 4 workflow phases:

```markdown
### 5. Diagnose (on demand)

```
/skill:diagnose
```

A 6-phase debugging loop you invoke when something is broken. Build a feedback loop first, then reproduce, hypothesise, instrument, fix, and cleanup. Not a pipeline phase — use whenever needed.
```

### docs/workflow-phases.md

Add a new section at the end:

```markdown
## diagnose

```
/skill:diagnose
```

Not a pipeline phase. A utility skill invoked on demand when debugging is needed.

- Build a feedback loop (failing test, curl script, etc.)
- Reproduce, hypothesise, instrument, fix, cleanup
- No write restrictions (used during execute/finalize, or outside the pipeline)
```

```bash
git commit -m "docs: update README, usage guide, and workflow phases for new skills"
```
