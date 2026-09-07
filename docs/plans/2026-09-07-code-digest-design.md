# Code digest at part completion, completed/ glob exclusion, and frontier-round brainstorming

## At a glance

Three changes in one PR: (1) when all requirements in a progress file are finished and the feature review has passed, the main agent writes a plain-language **code digest** — summary, execution flow, gotchas, key files — into the progress file, derived from the already-assembled review packet, and presents it at the ship checkpoint; (2) every recursive `docs/plans/**` discovery glob learns to exclude `docs/plans/completed/`, closing a 1.7.0 regression where archived topics resurface as active and a finalized standalone topic can be misrouted down the archived umbrella's path — up to `rm -rf` on the archive itself; (3) `pwk-brainstorming` replaces one-question-at-a-time with **frontier-round interviewing** — questions as a dependency tree asked round-by-round with recommended answers, facts looked up rather than asked, an assumption gate before the design summary, and a checkable stopping rule ("frontier empty — nothing silently assumed") so the agent never bakes unconfirmed business logic into a design.

| R# | Requirement in one line | Risk |
|----|--------------------------|------|
| R1 | Progress-file template gains a `## Code digest` section (below `## Execution summary`) with the four-subsection shape | low |
| R2 | `pwk-executing-tasks` writes the digest once per feature — after review success, before checkpoint presentation — derived from the packet | medium |
| R3 | The ship-checkpoint presentation includes the code digest, after the execution summary | low |
| R4 | Digest fill rules: plain language, arrow flows, `[ALERT]` only for reviewer-confirmed risks, 3–5 key files, no test names | low |
| R5 | All recursive `docs/plans/**` globs exclude `docs/plans/completed/` (status, brainstorm discovery, find-the-plan, routing, finalize umbrella check) | medium |
| R6 | Brainstorm questioning becomes frontier rounds: dependency-ordered questions, numbered, each with a recommended answer; major approvals stay single-decision | medium |
| R7 | Facts vs. decisions: facts are looked up (recon scout or inline), never asked of the human; pending facts block only their downstream questions | low |
| R8 | Assumption gate before the design summary: every assumption the draft would bake in unconfirmed is re-opened as a numbered question with a recommendation | medium |
| R9 | Checkable termination and forcing functions: frontier-empty stopping rule; unwritable feature-acceptance steps bounce to the gate; the planner bounces requirements whose AC would require inventing behavior | medium |
| R10 | Marker/lint/vitest/docs mirrors for all three behaviors, following the existing trio convention | low |

## Requirements

1. **Digest template.** The progress-file template in `skills/pwk-executing-tasks/SKILL.md` gains a `## Code digest` section directly below `## Execution summary`, with a placeholder and the four subsections: `### Summary` (2–3 sentences: what the code now does differently, and why), `### Flow` (execution/data movement through the changed code as arrow chains), `### Gotchas` (edge cases, implicit assumptions, `[ALERT]`-prefixed real risks), `### Key files` (3–5 pivotal files, one line each).
2. **Write point.** After the feature review succeeds (findings fixed, packet fresh) and before the ship checkpoint is presented, the executing agent writes the digest into the progress file, reading the packet's `## Commits`, `## Changed files`, and `## Diff` sections. Written once per feature — never back-filled per requirement. Works identically for umbrella parts (packet and progress file both live inside `docs/plans/<date>-<umbrella>/`) and standalone topics (flat).
3. **Checkpoint presentation.** The ship-checkpoint presentation list gains the code digest immediately after the execution summary; "full diff on request" remains the last item.
4. **Fill rules.** Plain language; R# anchors where natural; no test names (mirrors the execution-summary rule). Flow uses `A -> B -> C` arrow chains. Gotchas lifts real risks from the smell/hazard/tracing findings — `[ALERT]` only for reviewer-confirmed issues, never invented; "none beyond review findings" when empty. Key files capped at 5.
5. **completed/ exclusion.** Every recursive discovery glob — `pwk-status` (all four artifact globs), `pwk-brainstorming` discovery, `pwk-executing-tasks` find-the-plan and post-review routing, `pwk-finalizing` umbrella detection — excludes `docs/plans/completed/`, using one consistent canonical wording so the exclusion is a single-source rule the docs can link to.
6. **Frontier rounds.** `pwk-brainstorming` step 3 replaces "Ask questions one at a time" with: build a question tree seeded by the dimension checklist — *Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional* — walking **every** group and printing an explicit `— nothing to ask` for empty ones. Ask in rounds: each round presents the **frontier** (every question whose prerequisites are settled), numbered, each with the agent's recommended answer (`➡️`). A question whose answer depends on another open question waits for a later round. The human answers a whole round in one reply. Major approvals stay single-decision: approach selection, umbrella split, design approval, ADR unlock. The Principles section replaces "One question at a time" with "Detail-gathering asks in frontier rounds; approvals ask one decision at a time" and "No silent assumptions — ask, gate, or look it up."
7. **Facts vs. decisions.** Anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; only decisions are asked. Fact-finding is non-blocking: a pending lookup is an unsettled prerequisite that holds only its downstream questions, while the rest of the frontier is asked now.
8. **Assumption gate.** Before presenting the design summary ("Should I proceed, or is there more?"), the agent enumerates every assumption the drafted design would bake in unconfirmed — business rules, defaults, edge-case resolutions — as a final frontier sweep: each re-opened as a numbered question with a recommended answer, confirmed/struck/corrected by the human in one reply. Hard rule: no business behavior enters the design doc on the agent's assumption. Fires on every non-trivial brainstorm. Confirmed facts are woven into the design doc's existing sections (no new template section).
9. **Termination and forcing functions.** The interview is done when the frontier is empty — every branch visited, nothing silently assumed — replacing "once you can articulate what/why/constraints." Two backstops: (a) if writing a `## Feature acceptance` scenario step would require inventing behavior, that invention goes back through the assumption gate — it may not be silently written into the scenario; (b) `pwk-writing-plans` bounces back to brainstorm any requirement whose testable acceptance criteria cannot be derived without inventing behavior, naming the specific gap.
10. **Tests and mirrors.** New markers in `tests/markers.mjs`; skill-lint assertions for the digest template/write-point/presentation/fill-rules, the exclusion wording in each affected skill, and the questioning model (frontier/round/recommendation wording present; the old "one question at a time" principle absent from its defining line); a vitest suite threading template → write point → presentation → disposal-rides-existing-globs and the questioning-model wording; docs-consistency mirrors in `README.md`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md`.

## Problem

After 1.7.0, the changelog and commit log are the only surviving record of what each part's code actually does — the progress file's `## Execution summary` (how it was built) is disposed or archived with all plan docs, and nothing anywhere explains the code in plain language with flows and gotchas. The human approving at the ship checkpoint gets behavior-level digests and a raw diff "on request," but no middle layer: an executive, flow-aware explanation of the change.

Separately, R5 of 1.7.0 made the discovery globs recursive to find umbrella folders. Finalize's archive path moves consumed docs into `docs/plans/completed/` (flat files) and `docs/plans/completed/<date>-<umbrella>/` (folders whose `overview.md` matches `**/overview.md`). No recursive glob excludes `completed/`, so archived work is still discoverable:

- `pwk-status` lists archived topics as in-flight and rolls up archived umbrellas.
- `pwk-brainstorming` discovery reports archived designs as in-flight topics and treats an archived overview as a live umbrella split.
- `pwk-executing-tasks:173-174` post-review routing inverts — any archived umbrella makes every standalone feature route as an umbrella part of the archived roster.
- Worst, `pwk-finalizing:21` — with an archived umbrella present, finalizing a standalone topic takes the umbrella branch, derives its topic set from the archived roster, and the `rm -rf` "taken verbatim from the discovered `docs/plans/**/overview.md`" targets `docs/plans/completed/<date>-<umbrella>/`: destroying the archive the human chose to keep.

Before 1.7.0 the globs were flat, so `completed/` was naturally invisible; the regression is strictly reachable via the archive choice.

Third, `pwk-brainstorming`'s questioning model under-specifies requirements. "Ask questions one at a time" costs many round trips, invites asking dependent questions before their prerequisites are settled, and lets the agent ask the human for facts it could look up. The stop rule — "once you can articulate what/why/constraints, present a summary" — lets the agent proceed when it *feels* it understands, which is precisely when unconfirmed business logic gets baked into the design doc as silent assumptions. Nothing in the kit enumerates assumptions for confirmation, and nothing later catches a requirement too vague to test until execution.

## Approaches considered

**Who writes the digest:**

1. *Main agent, from the packet, at ship-checkpoint assembly* (chosen) — no new role or spawn; reuses packet bytes; the author's blind spots are mitigated by requiring Gotchas to cite reviewer findings. The adversarial eye stays with the reviewers; the digest is explanation, not discovery.
2. *Fresh `pwk-digest-writer` role* — more objective gotchas, but duplicates the reviewers' finding job, adds a spawn and role contract per feature.
3. *Standalone `/skill:pwk-explaining-diffs` skill, manual trigger* — useful complement later, but not automatic at part completion, which is the requirement.

**Write timing:** after review success rather than at feature-complete — the code is final (fixes applied), the packet is fresh, and reviewer findings exist to cite. Same user-facing moment: it lands in the material the human approves.

**completed/ fix shape:**

1. *Exclusion wording on every recursive glob* (chosen) — smallest change, one canonical phrase, lint-assertable per skill.
2. *Flatten the archive layout* (no per-umbrella folders under `completed/`) — rejected: folder-per-umbrella archiving is the 1.7.0 design, and flat archives would still match `docs/plans/completed/*-design.md` under `**`.
3. *Guard-level filtering* — rejected: discovery is skill-side shell/LLM behavior; the guard doesn't mediate reads.

**Brainstorm questioning model:**

1. *Frontier rounds* (chosen, adapted from the user's `grilling` skill) — questions as a dependency tree, rounds asking the full prerequisite-settled frontier, numbered questions each with a recommended answer, facts looked up rather than asked, termination when the frontier is empty. Supersedes plain topic-grouped batches: grouping stays only as the seed checklist that forces every dimension to be walked visibly.
2. *Topic-grouped batches without dependency ordering* — fewer round trips than one-at-a-time, but asks dependent questions too early and keeps the "feels understood" stop rule.
3. *Fresh assumption-reviewer role per brainstorm* — strongest single catch, but a spawn + role contract per design; deferred. The four-layer net (checklist → gate → scenario forcing → planner bounce) triangulates the same gap; `docs/lessons.md` accumulates repo-specific question dimensions over time for free.

Tone deliberately not imported: `grilling` interviews "relentlessly"; pwk-brainstorming stays collaborative. Machinery, not persona.

## Architecture

- `skills/pwk-executing-tasks/SKILL.md` — three edit sites: progress-file template (digest section), post-review flow (write step between review success and checkpoint assembly), checkpoint presentation list. Plus the two discovery/routing globs gain the exclusion.
- `skills/pwk-status/SKILL.md`, `skills/pwk-brainstorming/SKILL.md`, `skills/pwk-finalizing/SKILL.md` — exclusion wording on their recursive globs.
- `skills/pwk-brainstorming/SKILL.md` (same file, questioning changes) — step 3 rewritten to the frontier-round protocol; Principles rewritten; assumption gate inserted before the design summary; feature-acceptance forcing sentence in step 7.
- `skills/pwk-writing-plans/SKILL.md` — one bounce rule: requirements whose testable AC cannot be derived without inventing behavior go back to brainstorm with the gap named.
- No `extensions/workflow-guard.ts` change (execute/finalize phases are unlocked; the digest is written in execute; questioning needs no phase change). No finalize disposal change (the digest rides the `*-progress.md` glob; umbrella folders go wholesale). No package-surface change. No new role contracts.

## Components

1. **Progress template** — new section below `## Execution summary`:
   ```markdown
   ## Code digest

   <!-- Written once, after the feature review passes; never back-filled per requirement. -->

   ### Summary — 2–3 sentences: what the code now does differently, and why.
   ### Flow — execution/data movement through the changed code, as arrow chains.
   ### Gotchas — edge cases, implicit assumptions; [ALERT]-prefixed real risks.
   ### Key files — 3–5 pivotal files, one line each: what shifted inside them.
   ```
2. **Write step** — inserted after "On success, continue assembling the ship checkpoint": read the packet (`## Commits`, `## Changed files`, `## Diff`), write the four subsections into the progress file.
3. **Fill rules** — as in Requirement 4; stated once in executing-tasks next to the template.
4. **Presentation** — one line in the ordered checkpoint list, after the execution summary.
5. **Exclusion wording** — one canonical phrase (e.g. `excluding docs/plans/completed/`) appended to every recursive `docs/plans/**` glob across the four skills; docs link to executing-tasks' statement as the single source, mirroring the auto-tag precedent.
6. **Frontier protocol** (pwk-brainstorming step 3) — seed the question tree by walking the six-dimension checklist (printing `— nothing to ask` for empty groups); ask rounds of the full frontier; number questions; attach `➡️ <recommended answer>` to each; recompute the frontier after each round of answers; single-decision carve-out for major approvals.
7. **Facts rule** — facts via recon scout or inline lookups, never user questions; pending lookups hold only downstream questions.
8. **Assumption gate** — final frontier sweep on the drafted design before the summary; numbered confirm/strike items with recommendations; confirmed facts woven into existing doc sections.
9. **Stop rule + backstops** — frontier-empty termination; scenario-step forcing in step 7; planner bounce in `pwk-writing-plans`.

## Data flow

Packet (shell-assembled, zero model-output bytes) → executing agent reads it post-review → writes `## Code digest` into `*-progress.md` → presented at ship checkpoint → human approves → finalize archives/disposes it with the progress file (flat glob or umbrella-folder wholesale). Discovery globs thereafter see only active docs.

Brainstorm: topic + codebase facts (scout) → question tree seeded by the dimension checklist → frontier rounds with recommendations → human answers reshape the tree → assumption gate sweep → design doc written from confirmed facts only → planner derives AC; un-derivable requirements bounce back named.

## Error handling

- Packet stale or missing at write time → re-run the assembly recipe first (extends the existing re-run rule).
- Resume at `Feature phase: reviewing` → the same post-success write point fires on the resume path.
- Review found nothing → Gotchas says "none beyond review findings"; never fabricated.
- The digest never gates shipping — explanatory material, not a pass/fail check.
- Exclusion: `docs/plans/completed/` is never enumerated, so archived overviews can no longer win the finalize umbrella branch or the routing check.
- Scout unavailable → facts are looked up inline; frontier questions are never blocked on delegation (only their content might refine later).
- A rubber-stamped wrong recommendation is still visible — the recommendation is the assumption, surfaced inline; the human retains the strike.
- Trivial fast-path unchanged — one turn, no interview.

## Testing

- `tests/markers.mjs` — new markers: the digest section heading, `[ALERT]` rule, arrow-flow rule, the exclusion phrase, frontier/round/recommended-answer wording, the gate wording, the stop rule (markers must distinguish new from old, per lessons).
- `tests/skill-lint.mjs` — new check(s): template section + fill rules + presentation line in executing-tasks; exclusion wording present in all four skills next to their recursive globs; frontier protocol + facts rule + gate + principles rewrite in brainstorming (asserting the old "one question at a time" absent from its defining line, per the wording-ban scoping lesson); planner bounce line in writing-plans.
- Vitest — thread template → write point → presentation → disposal (digest marker present in the progress template; finalize globs unchanged and still cover it); exclusion asserted per skill text; questioning-model wording asserted; old principle absent.
- `tests/docs-consistency.test.ts` — mirrors in `README.md`, `docs/workflow-phases.md`, `docs/developer-usage-guide.md` (checkpoint description gains the digest; discovery descriptions gain the exclusion; brainstorm description gains frontier rounds).
- `tests/review-packet.test.ts` untouched — packet sed spans live in the plan doc; the digest is in the progress file.

## Production-risk areas

- **R5 touches the finalize `rm -rf` path** (the archive-destruction vector it fixes). The change is wording-only (discovery exclusion), but the hazard reviewer should verify no skill's disposal commands or anchoring rules regress.
- No DB/auth/external-API/concurrency surface otherwise.

## Feature acceptance

- Given a standalone feature whose requirements are all implemented and whose feature review has passed (findings fixed, packet assembled), When the ship checkpoint is assembled, Then the progress file contains `## Code digest` with Summary/Flow/Gotchas/Key-files derived from the packet, the checkpoint presents it after the execution summary, and finalizing archives or deletes it with the progress file.
- Given an umbrella where one part's review has passed and more parts remain, When that part's ship checkpoint is assembled, Then that part's progress file (inside the umbrella folder) gains its own code digest and routing suggests the next part — each part independent.
- Given `docs/plans/completed/` holds an archived umbrella (its `overview.md` inside), When the user runs `pwk-status`, starts a new standalone brainstorm, finishes a standalone feature, or finalizes that standalone topic, Then no archived artifact matches any discovery glob: status lists only active work, the topic routes and finalizes as standalone, and no disposal path targets anything under `completed/`.
- Given a non-trivial feature request with several unspecified business behaviors and interdependent decisions, When `pwk-brainstorming` interviews the human, Then questions arrive as numbered frontier rounds each carrying a recommended answer, facts the agent could look up are never asked, empty checklist dimensions print `— nothing to ask`, and the design doc is written only after an assumption-gate round confirms every otherwise-silent assumption — with the interview ending on a frontier that is empty, not on the agent feeling ready.
- Given a design requirement too vague to derive testable acceptance criteria without inventing behavior, When `pwk-writing-plans` processes it, Then the requirement bounces back to brainstorm with the specific gap named instead of being planned on an assumption.
