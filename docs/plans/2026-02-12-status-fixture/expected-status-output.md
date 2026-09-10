# pwk-status fixture expectation

Fixture: `docs/plans/2026-02-12-status-fixture/` (umbrella with overview.md + 4 parts) + one flat standalone topic.

Expected pwk-status output when the phase-driven state model is followed — per-part state from the progress file's `Feature phase:` header line, done counted separately in the roll-up:

```text
status-fixture (umbrella): 1 done · 2 in-flight · 1 not-started
  part-a      design    —
  part-b      execute   1/2
  part-c      done      1/1
  part-d      not started
standalone   ship-paused
```

Notes:

- `part-c` renders `done 1/1` — the done terminal state; never shown as in-flight.
- The roll-up hint (`— all parts done, ready for /skill:pwk-finalizing`) appears only when every part is `done` (and on a `done` standalone topic). This fixture intentionally leaves part-d not started and standalone at ship-paused, so no hint fires here.
- Discovery is a recursive search that skips `completed/` (e.g. `find docs/plans -name '<suffix>' -not -path '*/completed/*'`) — it reaches this folder one level down.
- Header-only reads: each progress file contributes only its first 10 lines (e.g. `head -n 10`); the `Feature phase:` line sits at line 7 — the bodies (execution summary, review reports, code digests) carry nothing status needs.
- A standalone topic whose progress says `done` would print with the ready-for-finalize hint; a legacy `*-implementation.md` topic would go through the same phase-line inference.
