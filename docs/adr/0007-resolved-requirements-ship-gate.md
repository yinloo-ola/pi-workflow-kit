# ADR 0007: `done` means resolved — finalizing is the failure authority

Date: 2026-09-11

## Context

The ship gate required every requirement's Done cell to be `✅`, but the failure and
skip paths mark rows `❌`/`⏭`. A feature with any failed or skipped requirement could
therefore never reach `Feature phase: done`, which made pwk-finalizing's `❌`-block,
`⏭`-warn, and `--force-failed` branches dead code (audit F1, the P0 of the
workflow-consistency batch). The resume rule had the same blind spot: any non-`✅` row
routed as "next", so a resume walked back into an already-failed requirement.

## Decision

`Feature phase: done` means **execution complete — every row terminal** (`✅` passed,
`❌` failed with reason, `⏭` skipped with reason), not "all passed". The ship digest
lists every `❌`/`⏭` row with its reason, so the approval is given knowing what failed;
the phase is set only after that informed approval. **pwk-finalizing stays the failure
authority**: its pre-existing block/warn/`--force-failed` branches — unchanged — become
reachable exactly as designed. `pwk-status` renders `done` with verdict counts
(`done (1 ❌ · 1 ⏭)`) and hints that finalizing will require `--force-failed` while
`❌` rows stand. Marking a row terminal includes reconciling its E2E coverage (assertions
removed or skipped with the reason in the same step), so the green-suite gates stay
meaningful. An umbrella's gate is per-part; finalizing reads every part's file and a
`❌` in any part blocks the whole umbrella.

## Rejected alternative

A new `partial` phase for completed-with-failures features. It would propagate a new
vocabulary value through every consumer (pwk-status, pwk-finalizing, resume routing,
guard, docs) to express what "done with recorded, surfaced failures" already says — and
pwk-finalizing's branches were designed for exactly this case; they only needed to be
reachable. Rejected as vocabulary churn with no new information.

## Consequences

- A design can ship with failed requirements, but only through an explicit human path:
  informed approval at the ship checkpoint, then an explicit `--force-failed` (or
  `⏭`-confirmation) at finalize. Nothing ships silently — the digest's verdict rows and
  the status counts are the visible surface, pinned by tests.
- Resume routing keys on "terminal", not "passed": `✅`/`❌`/`⏭` are skipped past; only
  `⬜`/`🔄`/blank route the next requirement.
- Legacy 1.x features (implementation-doc flow) are unaffected: they never had a
  Feature-phase gate.
