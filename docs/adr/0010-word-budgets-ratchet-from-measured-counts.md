# ADR 0010: Word budgets ratchet from measured counts, not a target percentage

Date: 2026-10-14
Status: accepted

## Context

The skill-slimming topic set out to cut every skill markdown file to 70% of its 2.9.0 word count. Measured against the pins, that target held for two of the eleven files and failed for the rest: the reference files are contract text end to end (`design-format.md` finished at 87% of its count, `progress-format.md` at 78%, `review.md` at 76%), and the SKILL.md files landed between 0% and 27% depending on how much of each was pinned prose.

The first pass of the same kind, in August, judged the corpus "already lean" and left no gate behind it. The corpus then grew 28%.

## Decision

`skill-lint` holds the ratchet, and both the lint table and the feature E2E use the same numbers:

- a **per-file budget** = the file's measured count plus 10% headroom, rounded up;
- a **corpus ceiling** = the measured total plus 10% headroom, rounded up (14,143 words).

Exceeding either fails by file name and count. The aggregate claim reported for this topic is what was achieved — a 16.3% cut, 15,360 to 12,857 words — not a target that was missed.

## Why

**A ratchet beats a percentage.** The value of these budgets is that the corpus cannot drift back up unnoticed. A percentage of a historical count encodes an editorial ambition; it does not encode anything about the file. When the ambition and the contract conflict, the contract wins and the number has to move, so a percentage target either blocks legitimate contract text or gets waived — and a waived gate teaches the next agent that these gates are negotiable.

**The measured floor is the honest ceiling.** Ten percent headroom is enough for a clarified sentence and too little for a new section, which is the shape of change the gate should force into a design decision.

**The corpus claim is a measurement, not a promise.** Reporting "16.3% smaller" beside "no measurable token saving" (ADR 0009) keeps both facts visible; a rounded claim of "30% leaner" would have been false.

## Rejected alternatives

- **Keep the 70% per-file target and mark the requirements failed.** It would report an unmet number that no further editing could reach without deleting pinned contracts — a target, not an outcome.
- **Drop budgets entirely and rely on review.** That is the state that produced the 28% regrowth.
- **Budget the corpus only.** A total lets one file balloon while another shrinks to compensate, which is exactly how a heavy file gets heavier.

## Consequences

- The gate is a ratchet: every future slimming pass lowers the numbers, and no pass can raise them without a recorded decision.
- Per-file budgets are now derived data — they are regenerated from the measured counts when skill text changes, and the lint table and the E2E must move together.
- The topic's stated goal changes shape: from "cut 30%" to "hold the achieved floor and report what the cut bought", which the probe answered honestly.
