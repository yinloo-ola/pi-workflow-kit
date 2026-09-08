# pwk 2.0: one buildable design doc, leaner ceremony, learning that survives

> This feature ships through the legacy 1.x flow (design → plan → execute → finalize) — it is the
> last two-doc feature. The At a glance below dogfoods the new decisions-first shape (R2).

## At a glance

`pwk-writing-plans` is ceremony: its output is ~90% mechanical re-derivation of the design doc, approved by a rubber-stamp one-liner, and the plan doc restates facts the design already carries ("paying twice" — Instil's critique; see `2026-09-08-research-external-workflows.md`). In 2.0.0 the design doc becomes the single buildable artifact: each requirement carries its own acceptance criteria and review tags, the plan phase disappears, and the flow becomes **design → execute → finalize**. Durable knowledge moves to where it survives: finalize gains a learning sweep that harvests decisions, deviations, and alerts into ADRs and lessons.md *because* the planning docs are being destroyed, and a new on-demand `pwk-walkthrough` skill generates a detailed, file-referenced explanation of any shipped feature.

Key decisions (honest-empty — a clause only where the fork was real):

- **Merge plan into design (option C)** — one doc, one meaningful approval; the executor inherits full architecture context. (Rejected: option B, append specs into one doc but keep two phases — kept the rubber-stamp approval without adding information. Rejected: status quo — the ceremony is the complaint.)
- **No test-name lists** — the executor writes and names tests red-green from the criteria; one fact, one place.
- **Keep the skill name `pwk-brainstorming`** — invocation habit and the guard key on it; the description is updated instead.
- **Rejected alternatives recorded only for real forks** — manufactured strawmen train the human to skim past decisions.
- **Learning lives outside the ephemeral docs** — the finalize sweep promotes to ADRs/lessons at the moment of disposal, not by keeping planning docs alive.
- **The walkthrough is a generated cache, not a curated doc** — SHA-stamped, regenerated wholesale, never hand-edited (field norm: DeepWiki / `tessl document`).

| R# | Requirement in one line | Risk |
|----|--------------------------|------|
| 1 | Design doc carries `### R#` blocks with one-liner + Given/When/Then criteria (incl. edge/error) + tags; no test-name lists, no crosswalk | med |
| 2 | Decisions-first At a glance: summary → key decisions (honest-empty) → R#/risk table | low |
| 3 | `pwk-writing-plans` removed; executing parses the design doc, creates the branch, packet seds from it; legacy in-flight support | high |
| 4 | Finalize learning sweep harvests decisions/deviations/alerts into ADR offers + lessons before disposal | med |
| 5 | `pwk-walkthrough`: on-demand, SHA-stamped, detailed walkthrough with file:line anchors at `docs/walkthroughs/<topic>.md` | med |

## Requirements

1. **Merged design doc** — `pwk-brainstorming` ends with one `docs/plans/YYYY-MM-DD-<topic>-design.md` whose `## Requirements` contains one `### R<n>: <name>` block per requirement: the one-line testable behavior, Given/When/Then acceptance criteria covering behavior + edge/error cases, and `### Checkpoints` / `### Review` tags (the risk→`parallel` auto-tag rule moves here as the single source of truth). No per-requirement test-name list is emitted; no `## Crosswalk` is ever written. The audit step verifies every requirement has criteria + both tags exactly once. The trivial path (`In short:` + one requirement block) and the optional `## Setup` section (dependencies/migrations/seed, when production-risk flags demand it) are unchanged in concept and move into this doc.
2. **Decisions-first At a glance** — the digest opens with a 2–4 sentence plain-language summary, then key-decision bullets (decision + why; a `(rejected: X — reason)` clause only when the fork was real and load-bearing — never manufactured), then the `| R# | Requirement in one line | Risk |` table.
3. **Plan phase removed, execution rewired** — the `pwk-writing-plans` skill no longer ships; `SKILL_TO_PHASE` drops its entry and the guard's `Phase` type reduces to `brainstorm | null` (both phases were already behaviorally identical: `docs/plans/`-only writes); `UNLOCK_SKILLS` is unchanged apart from R5's addition. Executing's pre-flight creates the feature branch when on `main`; executing parses `### R<n>` blocks + tags + `## Feature acceptance` from the design doc; the review-packet recipe extracts criteria from the design doc (`### R1` → `## Feature acceptance`); a stem-matched legacy `-implementation.md` routes the old flow so in-flight features finish; `pwk-status` and all discovery globs cover both suffixes (with the `completed/` exclusion).
4. **Finalize learning sweep** — before any disposal command, finalize reads the design doc's key-decision bullets **and its `Approaches considered` body section** (the full forks with reasoning — not just the digest), the progress file's `Deviated?` entries (including any deviation decision-records), and the Code digest's `[ALERT]` entries; for each item that passes the hard-to-reverse / surprising / real-trade-off gates — informed by how the decision actually played out — it offers an ADR in `docs/adr/`; generic rules go to `docs/lessons.md`; both outputs honest-empty when nothing qualifies, and when an item passes the gates but the recorded material is too thin to draft a credible ADR, it asks the human rather than fabricating context. The sweep is file-based by necessity: executing and finalizing usually run in fresh sessions with no memory of the brainstorm conversation — everything it needs must already be on disk.
5. **`pwk-walkthrough` skill** — standalone (added to `UNLOCK_SKILLS`), invoked on demand, never a phase, never auto-run. Given a topic or branch it derives from the branch diff + code (surviving ADRs/lessons optional input; planning docs are usually gone by then, by design) and writes `docs/walkthroughs/<topic>.md` stamped with the commit range it describes. Template: Summary / How it works (per component) / Key flows (arrow chains) / Gotchas & invariants / Change map (where to touch for common edits). Detailed enough to follow with the files open: **every section anchors its claims to concrete file paths (file:line)**. Regeneration overwrites wholesale; never hand-edited; never disposed by finalize.

## Problem

Since 1.7.0 the design doc already carries testable requirements, a testing section, and the Feature-acceptance E2E; the plan phase then mechanically expands these into a second file the human never reads (the presentation is a one-liner). Each feature pays: one extra skill load (~120 lines of context), one extra approval, restated Feature acceptance/risk/Setup content, and an executor that reads a stripped spec instead of the design's architecture context. Meanwhile the field has converged on the opposite direction (delta specs, scale-adaptive ceremony, "one document, one round of iteration, then code"), and the durable knowledge (rejected alternatives, deviations, confirmed risks) currently dies with the disposed docs unless someone happens to write an ADR at brainstorm time — before the evidence exists.

## Approaches considered

- **A — status quo**: rejected; the ceremony is the complaint, and the crosswalk/digest family grows the artifact stack.
- **B — one doc, two phases**: append spec sections into the design doc but keep a separate `/skill:pwk-writing-plans` transition and approval. Rejected: keeps the rubber stamp while saving only tokens; the transition still adds no information.
- **C — one doc, one phase** (chosen): the design conversation ends with a buildable doc; branch creation and doc-commit move to executing. Cost accepted: losing the plan phase's cold re-read (mitigated by the assumption gate + frontier rounds at design time, the E2E-first gate at execute, and reviewer fresh eyes), and a 2.0.0 breaking change.
- **Test-name lists** (sub-decision): dropped — the executor re-derives test names when writing red tests anyway; the criteria carry the information.
- **Ephemeral plans** (Claude Code plan mode / Instil's prescription): rejected — pwk's doc persists deliberately: the executor, the review packet, and the learning sweep all consume it, then it is disposed.
- **Where decision memory lives** (sub-decision): tiered — digest serves the approval *now*, the body serves the executor *during*, ADRs + lessons.md serve *forever*; promotion happens at the finalize sweep.

## Architecture

```
1.x:  brainstorm → design.md → writing-plans → implementation.md → execute → finalize
2.0:  brainstorm → design.md (complete, buildable) ──────────────→ execute → finalize
                                                                  └─ walkthrough (on demand, post-ship)
```

- **Guard**: `Phase = "brainstorm" | null`; `SKILL_TO_PHASE` has one entry; `UNLOCK_SKILLS` gains `pwk-walkthrough`. Write policy unchanged (`docs/plans/`-only while gated) — brainstorm/plan were already identical.
- **Design doc** is the single artifact: At a glance → `### R#` blocks (behavior, criteria, tags) → optional Setup → Feature acceptance → architecture/data-flow/error-handling narrative.
- **Finalize** order becomes: green suite → checks → **learning sweep** → disposal → lessons/docs/version → merge.
- **Walkthrough** is a read-side consumer only; it touches no workflow state.

## Components

- `skills/pwk-brainstorming/SKILL.md` — produces the merged doc; hosts the auto-tag rule; trivial path unchanged; ADR offer unchanged (the sweep is a second, better-informed chance, not a replacement).
- `skills/pwk-executing-tasks/SKILL.md` — branch creation in pre-flight; parse `### R#` blocks; packet recipe re-anchored on the design doc; legacy `-implementation.md` routing; **deviation decision-records**: a departure that reverses or alters a design decision gets a short paragraph (what changed, why, what was rejected) written into the progress file at deviation time, while the knowledge is fresh — mechanical deviations keep the one-line entry; everything ship-checkpoint-related unchanged
- `skills/pwk-finalizing/SKILL.md` — learning-sweep step; disposal globs unchanged in shape (the `-implementation.md` glob stays for legacy; new features simply have no such file).
- `skills/pwk-walkthrough/SKILL.md` — new; template with file:line anchors; regeneration semantics.
- `skills/pwk-status/SKILL.md` — discovery covers both suffixes.
- `extensions/workflow-guard.ts` — `SKILL_TO_PHASE`, `Phase`, `UNLOCK_SKILLS`, reminder wording ("DESIGN phase").
- `agents/pwk-spec-reviewer.md` — packet-key wording (`### R#` blocks) only.
- `docs/` + README + CHANGELOG — mirror the new flow; migration note for 2.0.0.

## Data flow

R# threading is unchanged end-to-end: defined by `### R#` block order in the design doc → progress-file rows → execution-summary rows → spec-reviewer coverage table (packet now seds criteria from the design doc). The packet's criteria span becomes `### R1` → `## Feature acceptance`. Tags flow design → executing (honored verbatim; auto-tag rule's single source of truth moves from writing-plans to brainstorming). The learning sweep reads design decisions + `Deviated?` + `[ALERT]`s and writes ADRs/lessons before disposal. The walkthrough reads the branch diff + code (+ optional surviving ADRs/lessons) and writes a doc nothing else consumes.

## Error handling

- **In-flight 1.x features at upgrade** (including this one): stem-matched `-implementation.md` routes the old flow; executing/status glob both suffixes; CHANGELOG documents the migration.
- **Walkthrough edge cases**: unshipped branch → allowed, stamped at HEAD; no diff found → refuse with a clear reason rather than invent content; file:line anchors are valid against the stamped SHA range (lines drift — the stamp is the contract).
- **Honest-empty everywhere**: no manufactured decisions, rejections, ADRs, lessons, or alerts.
- **Underivable requirement** (was the plan-phase bounce): now caught inside brainstorm by the assumption gate / frontier rounds — an unwritable criterion is a question, not a plan-time discovery.

## Testing

- `tests/markers.mjs` — delete crosswalk markers; add R1-block/decisions-first/walkthrough markers (single canonical registry, both suites import).
- `tests/skill-lint.mjs` — rework Check 11 (human-review digests) for the merged doc; add walkthrough-skill check (frontmatter, template, file:line-anchor rule, regeneration wording, UNLOCK_SKILLS membership).
- `tests/human-review-digests.test.ts` — rethread the R1–R6 E2E to the new doc shape; README literal updates.
- `tests/review-packet.test.ts` — fixture re-anchored (`### R1` blocks in a design doc); the crosswalk-safety test is deleted with its premise.
- `tests/code-digest.test.ts` — unchanged concept; anchored sites keep `completed/` exclusion; finalize byte-guards updated for the sweep step order.
- `tests/docs-consistency.test.ts` + README + 3 docs — mirror the new flow; negative sweeps (`never writes an implementation doc`) added.
- Guard tests — `SKILL_TO_PHASE` single entry, `Phase` reduction, `UNLOCK_SKILLS` gains walkthrough.
- New: walkthrough skill-lint assertions + finalize learning-sweep assertions (sweep-before-disposal ordering, honest-empty wording).

## Production-risk areas

- **Published npm package, breaking 2.0.0** — phase semantics and the skill set change; installed copies and `.agents/agents/` roles are user-managed; migration note required.
- **`UNLOCK_SKILLS` is the exported single source of truth** — guard export ↔ skill-lint ↔ skill set must change atomically.
- **`tests/markers.mjs` is a cross-file canonical registry** — marker renames ripple into both suites; hard-coded literals outside it (`"exactly once"`, byte-guarded disposal lines) must be swept in the same change (lesson: a glob-scope change must enumerate every consumer).
- **Guard `Phase` type change** — public-ish surface (`getCurrentPhase` consumers); keep `null` semantics intact.

## Feature acceptance

- Given a 2.0.0 install with no in-flight work, When `/skill:pwk-brainstorming` completes and the design doc is approved, Then exactly one `-design.md` exists containing a decisions-first At a glance, one `### R#` block per requirement each with Given/When/Then criteria (incl. edge/error) and Checkpoints/Review tags, and a Feature-acceptance E2E — no `-implementation.md` is ever created, `/skill:pwk-writing-plans` no longer resolves, executing creates the feature branch itself, and the review packet extracts acceptance criteria from the design doc.
- Given a feature whose planning docs were disposed at finalize, When the user runs `/skill:pwk-walkthrough <topic>`, Then `docs/walkthroughs/<topic>.md` is generated from the branch diff + code with Summary / How it works / Key flows / Gotchas & invariants / Change map sections, every claim anchored to a file path valid at the stamped commit range, and a re-run regenerates the file wholesale.
- Given a completing feature whose design recorded a decision that proved costly during execution (a `Deviated?` entry), When `/skill:pwk-finalizing` runs, Then before disposal it offers an ADR for that decision and appends a generic rule to `docs/lessons.md` — and with nothing qualifying, it offers nothing and says so.
