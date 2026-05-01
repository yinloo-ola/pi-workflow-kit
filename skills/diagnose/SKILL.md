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
