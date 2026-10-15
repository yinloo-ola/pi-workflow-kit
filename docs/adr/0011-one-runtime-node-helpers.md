# ADR 0011: One runtime — the kit's helpers are dependency-free Node scripts

Date: 2026-10-15
Status: accepted

## Context

The kit shipped two helpers as Python scripts — `validate-design.py` (194 lines) and `build-review-packet.py` (320 lines) — both standard-library only, with a "Python 3.9+" prerequisite clause in the two skills that call them and a matching blocker instruction in `AGENTS.md` and the guides. The deterministic-steps topic added four more helpers, so the kit had to settle which runtime its helpers target.

## Decision

Every helper under `skills/*/scripts/` is a dependency-free `.mjs` script, run with `node`. The two Python helpers are ported, and the skill text, docs, and `AGENTS.md` state the Node runtime instead of the Python prerequisite.

The conversion is proven against goldens recorded from the Python originals while both existed: the validator matches exit codes and diagnostics case by case across nine fixtures, and the packet builder produces a byte-identical packet.

## Why

**One runtime, one invocation pattern.** Two runtimes meant two prerequisite clauses, two blocker instructions, and two shapes for the same operation. The kit's own gates — `vitest`, `skill-lint` — already require Node, so the Python prerequisite bought nothing a host without Node could have used.

**The port is verifiable, so the risk is bounded.** The packet helper runs at every feature review, which made a rewrite expensive to get wrong. Byte-identical output against a recorded original is a stronger claim than a green suite, and it is what the requirement asked for.

**A refusal is part of the behavior.** Python raised on invalid UTF-8; Node's `readFileSync(…, "utf8")` silently replaces the bad bytes. The port therefore decodes strictly, so the helper refuses damaged evidence exactly as before.

## Rejected alternatives

- **Keep Python and write the new helpers in Python.** It preserves one runtime but keeps the heavier prerequisite: Python 3.9+ where commands execute, for hosts that already run Node.
- **Port only the validator.** Cheaper, but it leaves the kit split across two runtimes and two invocation patterns for no benefit.
- **Choose the runtime per host.** A compatibility table nobody can measure, and two code paths to maintain for one behavior.

## Consequences

- A host must ship Node to run a helper. It already does for the kit's gates, so this adds no new environment requirement in practice.
- The goldens under `tests/fixtures/` are the conversion's evidence. An intentional behavior change means regenerating them, which is the point: the fixtures make the change visible.
- The "Python 3.9+" prerequisite retires from the skills, `AGENTS.md`, and the guides.
