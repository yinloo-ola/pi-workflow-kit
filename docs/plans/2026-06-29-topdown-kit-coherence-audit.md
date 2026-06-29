# Coherence Audit: pi-topdown-kit cross-session resume

**Question:** Can a fresh agent thread (`/new` + `/skill:ptk-X`) pick up the artifacts of the previous phase and continue correctly?

**Method:** Read all 6 skills end-to-end. For each phase transition, trace (a) what phase N *commits*, (b) what phase N+1 *reads*, (c) whether N+1 *self-detects* its entry condition from artifacts alone.

## Transition matrix

| Transition | Artifact | Committed? | Reader self-detects? | Verdict |
|---|---|---|---|---|
| brainstorm → scaffold | `docs/plans/*-decisions.md` (problem, approaches, decisions, module outline) | ❌ **NO** — brainstorm is read-only, never commits | ✅ scaffold looks for it, says "run brainstorm" if missing | ⚠️ **Gap A** |
| scaffold → execute | skeleton files + `stub()` helper + `.ptk-scaffold` sentinels (carry frontier ERE) | ✅ committed at checkpoint approval | ✅ execute looks for `scaffold:` commit + sentinels | ✅ strong |
| execute → verify | filled stubs (committed per increment) | ✅ | ✅ verify checks frontier empty | ✅ strong |
| verify → finalize | `docs/plans/*-verification-report.md` (optional) | ❌ (verify is read-only) but optional | ✅ finalize works without it | ✅ ok |
| scaffold checkpoint (mid) → scaffold (resume) | uncommitted skeleton + sentinels on disk | ❌ uncommitted at checkpoint | ❌ **re-entry doesn't detect uncommitted skeleton** | ⚠️ **Gap B** |

## The four gaps

### Gap A (HIGH) — decisions doc is never committed

`ptk-brainstorming` writes `docs/plans/*-decisions.md` but the skill is read-only (guard blocks `git commit` in brainstorm phase). It relies on *scaffold* to commit — but scaffold's "Before you start" never says to. So the handoff artifact for the brainstorm→scaffold boundary lives as an uncommitted file.

- **Survives** brainstorm → `/new` → scaffold in the happy path (file still on disk).
- **Breaks** on `git stash` / `git checkout` / fresh clone / `git clean` between phases — the decisions doc is gone, and with it the module outline, the name-collision choice ("use ptkStub"), and the why.
- This is the **only** handoff artifact not persisted by its producing phase.

### Gap B (HIGH) — scaffold checkpoint doesn't survive `/new`

The `⏸ CHECKPOINT: skeleton` menu offers "stop → resume later with `/skill:ptk-scaffold`." But at that point the skeleton is emitted and **uncommitted** (the whole point of the checkpoint is pre-commit review). A fresh scaffold invocation's entry logic looks for a *decisions doc*, finds one, and **re-emits the skeleton from scratch** — it has no logic to detect "uncommitted skeleton + sentinels already here, resume the checkpoint."

Result of `/new` mid-checkpoint: duplicate or overwritten skeleton, or conflicting stubs. The advertised resume path is effectively broken across sessions.

### Gap C (MEDIUM) — no multi-feature disambiguation

If two features are in flight (two sentinels, two decisions docs — common in real repos with parallel branches, or even two subsystems on one branch):
- `ptk-execute` greps **all** sentinels → interleaves fills from different features.
- `ptk-verify` / `ptk-finalize` check all sentinels.
- A fresh agent invoking execute has **no way** to say "work on auth, not scheduler." The frontier query has no feature selector.

The kit assumes one feature at a time. Reasonable default, but undocumented and unsupported when violated.

### Gap D (MEDIUM) — sentinel doesn't link to its decisions doc

Compound with C. The `.ptk-scaffold` sentinel carries the language pattern but not *which feature it belongs to*. Even if an agent wanted to disambiguate, it can't map sentinel → decisions doc. (The decisions doc filename contains the topic, so the link is implicit — but never made explicit.)

### Gap E (LOW) — scaffold doesn't detect pre-existing sentinels on entry

Re-running scaffold (accidentally, or after a partial run) doesn't notice committed sentinels already exist → would create a second skeleton alongside the first. Minor (usually obvious) but a missing coherence check.

## Fixes — all applied in commit `84fc841`

| Gap | Status | Fix |
|---|---|---|
| A | ✅ fixed | ptk-scaffold step 4 commits `docs/plans/*-decisions.md` before emitting anything; brainstorm "After" notes scaffold persists it |
| B | ✅ fixed | ptk-scaffold entry 3-way detects: (a) uncommitted skeleton → resume checkpoint; (b) committed scaffold → ask execute vs re-scaffold; (c) fresh |
| C + D | ✅ fixed | `.ptk-scaffold` sentinel gains `# feature: <topic>` line; execute/verify/finalize scope to one chosen sentinel when multiple exist; finalize removes only the chosen feature's sentinels + helper-if-unreferenced |
| E | ✅ fixed | folded into entry detection (b) — committed sentinels now warn instead of double-scaffolding |

## What's already coherent (no fix needed)

- **execute self-detects done** (frontier empty → suggests verify) — a fresh session lands correctly.
- **verify self-detects not-ready** (frontier not empty → suggests execute).
- **finalize warns if frontier not empty.**
- **The marker protocol is stateless** — grep finds the frontier from committed code alone, no progress file to sync. This is the kit's strongest coherence property.
- **finalize cleanup is idempotent** — if sentinels/helper already gone, the `rm -f` / `find -delete` no-ops cleanly.