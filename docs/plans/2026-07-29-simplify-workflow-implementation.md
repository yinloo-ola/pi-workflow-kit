# Implementation Plan: Simplify pi-workflow-kit workflow and guard

## Overview

Design: docs/plans/2026-07-29-simplify-workflow-decisions.md

No Features table — this plan covers the whole design as one pipeline. The change is mostly prose (skill + doc rewrites) plus one code change (the guard). Task 1 is the testable core; Tasks 2–10 are skill/doc edits ordered by pipeline dependency.

> **Assumption (flagged):** the "simple common blacklist" intentionally *un-blocks* some commands that today are blocked only by the allowlist and are not in `DESTRUCTIVE_PATTERNS` — notably `gh pr create/merge`, `go build/test/install/mod tidy`, `for` loops, and var-prefixed commands. This is accepted: the per-turn reminder (Task 1) tells the model the phase is read-only, and the guard is advisory. If you want any of these kept blocked, say so and we add them to `DESTRUCTIVE_PATTERNS` instead.

---

## Task 1: Guard — simple common blacklist + tail-appended phase reminder

<!-- tdd: modifying-tested-code -->
<!-- checkpoint: test -->

Acceptance Criteria (QA Engineer Hat):
- **Happy Path**:
  - Given: a read-only command that the old allowlist rejected (e.g. `for f in *.md; do echo $f; done`, `go test ./...`, `FOO=bar; grep -r x src/`)
  - When: `isSafeCommand` is called during a gated phase
  - Then: it returns `true` (no longer requires an allowlist match)
- **Happy Path (reminder)**:
  - Given: phase is `plan`
  - When: `before_agent_start` fires
  - Then: a short `[pi-workflow-kit] PLAN phase: …` message is returned for appending after the user's message
- **Edge Case (destructive still blocked)**:
  - Given: `rm -rf x`, `git commit -m x`, `npm install x`, `echo x > f`, `echo x >> f`
  - When: `isSafeCommand` is called
  - Then: returns `false`
- **Edge Case (writes outside docs/plans/)**:
  - Given: phase is `brainstorm`/`plan`/`verify`
  - When: a `write`/`edit` to `src/index.ts`
  - Then: blocked by `shouldBlockFilePath` (unchanged)

Files:
- `extensions/workflow-guard.ts`
- `tests/workflow-guard.test.ts`

Steps:
1. Write the new/changed tests first (see concrete tests below).
2. Run tests — the changed `isSafeCommand` tests fail (behavior not yet implemented); the new "blacklist model" test fails.

⏸ **CHECKPOINT: test** — present the new test expectations for review. The key behavior change (un-blocking gh/go writes) is the thing to eyeball before we lock it in.

3. Replace `isSafeCommand` with the blacklist-only body:
   ```ts
   export function isSafeCommand(command: string): boolean {
     return splitCompoundCommand(command).every((part) => {
       const cleaned = stripHarmlessRedirects(part);
       return !DESTRUCTIVE_PATTERNS.some((p) => p.test(cleaned));
     });
   }
   ```
4. Delete the entire `SAFE_PATTERNS` array (the `const SAFE_PATTERNS = [...]` block).
5. Add a phase-reminder map near `SKILL_TO_PHASE`, and register a `before_agent_start` handler inside the default export:
   ```ts
   const PHASE_REMINDERS: Record<Exclude<Phase, null>, string> = {
     brainstorm: "[pi-workflow-kit] BRAINSTORM phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
     plan: "[pi-workflow-kit] PLAN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
     verify: "[pi-workflow-kit] VERIFY phase: read-only. No source edits; writes only under docs/plans/.",
   };
   ```
   and inside `export default function (pi: ExtensionAPI) { … }`:
   ```ts
   pi.on("before_agent_start", async () => {
     if (!phase) return {};
     return {
       message: {
         customType: "pwk-phase-reminder",
         content: PHASE_REMINDERS[phase],
         display: false,
       },
     };
   });
   ```
   > The handler returns `{ message }` (singular) — the runner collects it into the per-turn message list appended after the user's message. `display: false` keeps it out of the UI (tune if you want it visible). Verify during execution whether pi persists these messages; if so, history gains one short line/turn — acceptable.
6. Run tests — all green.

Concrete test changes (`tests/workflow-guard.test.ts`):
- **Delete** `it("blocks gh write subcommands", …)` — gh writes are now allowed under the blacklist.
- **Delete** `it("blocks go write subcommands", …)` — go writes are now allowed.
- **Add**:
  ```ts
  it("allows commands no longer gated by an allowlist (blacklist model)", () => {
    // Previously blocked only because they didn't match a SAFE_PATTERN, not because they're destructive.
    expect(isSafeCommand("gh pr create --title 'fix'")).toBe(true);
    expect(isSafeCommand("gh pr merge 1564")).toBe(true);
    expect(isSafeCommand("go build ./...")).toBe(true);
    expect(isSafeCommand("go test ./...")).toBe(true);
    expect(isSafeCommand("go mod tidy")).toBe(true);
    expect(isSafeCommand("for f in *.md; do echo \"$f\"; done")).toBe(true);
    expect(isSafeCommand("FOO=bar; grep -r x src/")).toBe(true);
  });
  ```
- **Keep unchanged**: all destructive-blocked tests (`rm`, `touch`, `mv`, `mkdir`, `>`/`>>`/`tee`, `git add/commit/push/checkout`, editors, `sudo`, `npm install`, `git stash` mutations) and the `2>/dev/null` / redirect-edge tests, plus the two `BUG:` tests (the `>`-inside-grep quote bug is unrelated to this change and stays `false`).

---

## Task 2: Rewrite pwk-brainstorming — descriptive design doc, optional split, ADRs to docs/adr/

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the rewritten skill, When the agent brainstorms, Then it produces a descriptive design doc (problem, approaches, architecture, components, data flow, error handling, testing) with **no** `## Features` status table.
- Given a large issue with independent sub-issues, When brainstorming, Then it may produce multiple design docs (human-approved).
- Given a hard-to-reverse decision, When captured, Then the ADR is written to `docs/adr/` (not `docs/plans/adr/`).

Files:
- `skills/pwk-brainstorming/SKILL.md`

Changes:
- **Remove**: the entire `## Features` table section, the status-value list (`⬜ pending` …), and the "Simple change — no design review needed" / production-risk note that's tied to the table.
- **Replace** step 5 ("Write the design doc") with: produce a descriptive design doc at `docs/plans/YYYY-MM-DD-<topic>-design.md` covering problem, approaches considered, architecture, components, data flow, error handling, testing. Add a short `## Production-risk areas` note (DB schema, auth, external APIs, concurrency, uploads, Redis/cache) **only if** any apply — this replaces the old table-tied note.
- **Add** a step: if the issue is large and splits into genuinely independent sub-issues, propose splitting into multiple design docs (one per sub-issue) and get human approval before writing them.
- **Change** the ADR instruction from `docs/plans/adr/` → `docs/adr/` (two places: the "offer to write an ADR" step and the "ADRs live under…" sentence).
- **Change** the "After the design" prompt: drop "design doc with a Features table"; say "design doc" only.

---

## Task 3: Rewrite pwk-writing-plans — plan the whole design doc, drop feature-row logic

<!-- tdd: trivial -->

Acceptance Criteria:
- Given a design doc with no Features table, When planning, Then it writes one plan doc for the whole design at `docs/plans/YYYY-MM-DD-<topic>-implementation.md`.
- Given the plan doc, When read by the executor, Then its metadata references the design doc (`Design:`) but has **no** `Feature:` row.
- Given multiple design docs (split case), When planning, Then it asks which to plan.

Files:
- `skills/pwk-writing-plans/SKILL.md`

Changes:
- **Remove** from step 1: "read the Features table, identify the next `⬜ pending` feature, mark it `🔄 planned`" and all `Feature:` metadata references.
- **Change** the plan-doc naming from `YYYY-MM-DD-<topic>-<feature-name>-implementation.md` → `YYYY-MM-DD-<topic>-implementation.md`.
- **Change** the Overview metadata block to keep only `Design:` (drop the `Feature:` line):
  ```markdown
  # Implementation Plan: <topic>
  ## Overview
  Design: docs/plans/YYYY-MM-DD-<topic>-design.md
  ```
- **Keep** the production-risk hazard trigger (step 1), now keyed on the whole design doc's `## Production-risk areas` note (not a feature row). If the design notes risks, prompt for `/skill:pwk-design-review`.
- **Add**: "If multiple `*-design.md` exist, list them and ask the human which to plan."
- **Keep** the task format, vertical-slices, TDD, checkpoint, and behavioral-guidelines sections unchanged — they're phase-agnostic.

---

## Task 4: Rewrite pwk-executing-tasks — drop feature-table mutation, add entry report, 1:1 mapping

<!-- tdd: trivial -->

Acceptance Criteria:
- Given a plan doc, When executing, Then it runs the tasks for that one plan (no "find `🔄 planned` feature", no "mark feature `✅ done`").
- Given a new session invoking the skill, When it starts, Then it prints a one-line "here's what I found" report (design + phase + progress) before acting.
- Given all tasks done, When the loop ends, Then it suggests verify/finalize (not "next feature").

Files:
- `skills/pwk-executing-tasks/SKILL.md`

Changes:
- **Add** a discovery step at the very top (after the git-state check): glob `docs/plans/` for `*-progress.md` (resume) / `*-implementation.md` (first run); if one, use it; if several, list and ask. Print a one-line report, e.g.:
  ```
  Found: design `simplify-workflow` — execute phase (3/10 tasks done).
  ```
- **Remove** from "Before you start" / "First run": all Features-table references ("get the Features table", "feature with status `🔄 planned`", the `<slugified-feature-name>` plan-doc derivation, the worktree "all plan docs for this design move together" feature-table note).
- **Remove** from per-task execution step 2: the `Feature:` metadata extraction and "check the current feature's status in the design doc's Features table".
- **Remove** per-task step 8 ("Update design doc — mark feature `✅ done`").
- **Replace** "After all tasks": remove the "More features remaining" branch entirely. Keep only: show the per-task summary, then suggest `/skill:pwk-verify` or `/skill:pwk-finalizing`.
- **Keep**: progress file, per-task execution loop, checkpoints, lessons, resume logic, user-override commands, session-break suggestion.

---

## Task 5: Rewrite pwk-finalizing — per-topic archive, no ADR move, no features warning

<!-- tdd: trivial -->

Acceptance Criteria:
- Given a finished design `X`, When finalizing, Then it archives only `*X*` artifacts and leaves other design docs in place.
- Given ADRs at `docs/adr/`, When finalizing, Then they are **not** moved.
- Given no Features table, When finalizing, Then there is no "unplanned features" warning.

Files:
- `skills/pwk-finalizing/SKILL.md`

Changes:
- **Derive the topic**: read the progress file → plan doc → its `Design:` metadata → the design-doc filename → `<topic>`. If ambiguous, ask.
- **Replace** the blanket archive block with topic-scoped moves (each `|| true` for graceful no-match):
  ```bash
  mkdir -p docs/plans/completed
  mv docs/plans/*<topic>*-design.md docs/plans/completed/ 2>/dev/null || true
  mv docs/plans/*<topic>*-implementation.md docs/plans/completed/ 2>/dev/null || true
  mv docs/plans/*<topic>*-progress.md docs/plans/completed/ 2>/dev/null || true
  mv docs/plans/*<topic>*-verification-report.md docs/plans/completed/ 2>/dev/null || true
  git add docs/plans/ && git commit -m "chore: archive planning docs"
  ```
- **Remove** the `mv docs/plans/adr/*.md docs/plans/completed/adr/` line and the `rmdir docs/plans/adr` line — ADRs now live at `docs/adr/` permanently.
- **Remove** the "if any features have status `⬜ pending` or `🔄 planned` … warn" check (no Features table).
- **Keep**: skipped-tasks progress check, lessons curation (Agile Scrum Master Hat), docs update, merge strategy, worktree cleanup.

---

## Task 6: pwk-design-review — drop per-feature language

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the rewritten skill, When reviewing, Then it describes the review as covering "the design's plan doc" with no "per-feature" / feature-row language.

Files:
- `skills/pwk-design-review/SKILL.md`

Changes:
- In step 8 ("Append to plan doc"), change "review is per-feature, and the plan doc is the per-feature artifact" → "the plan doc is the design's artifact". Substance of the review (pillars, hazards, Socratic) unchanged.

---

## Task 7: pwk-verify — confirm no stale feature-table references

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the skill, When read, Then it contains no references to the Features table or feature-row status (verify operates on git diff, so it likely needs no change).

Files:
- `skills/pwk-verify/SKILL.md`

Changes:
- Grep the file for `Features`, `feature`, `⬜`, `🔄`, `✅`, `⏭`. If any reference the table/status, remove or reword. If none (expected), this task is a no-op confirmation — note that in the commit message.

---

## Task 8: Rewrite README — design-doc-per-pipeline + blacklist guard

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the README, When read, Then it describes the design-doc-per-pipeline flow (no Features table, no per-feature loop), the new continuity model, and the blacklist guard + tail reminder.

Files:
- `README.md`

Changes:
- **Remove** the "Feature-Based Planning" section (the Features status table example).
- **Rewrite** "The Workflow in Detail" / the flow diagram to: `brainstorm → [split?] → per design: plan → [design-review] → execute → [verify] → finalize`.
- **Add** a short "Continuity" note: new sessions resume by invoking the phase skill; the skill globs `docs/plans/` and reports what it found.
- **Update** the guard table/description: bash is blacklist-based (common destructive commands blocked); a short phase reminder is appended each turn; writes outside `docs/plans/` blocked during brainstorm/plan/verify.
- **Update** the project tree if ADR location changed (`docs/adr/`).

---

## Task 9: Rewrite docs/developer-usage-guide

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the guide, When read, Then it matches the new workflow (no Features table, design-doc-per-pipeline, blacklist guard).

Files:
- `docs/developer-usage-guide.md`

Changes:
- Update "The workflow" section + the per-skill outcome bullets to drop Features-table mentions and reflect 1:1 design→plan→execute→finalize.
- Update "What the extension does" to describe the blacklist + tail reminder.

---

## Task 10: Rewrite docs/workflow-phases

<!-- tdd: trivial -->

Acceptance Criteria:
- Given the doc, When read, Then the phase diagram and per-phase descriptions reflect design-doc-per-pipeline with no per-feature loop.

Files:
- `docs/workflow-phases.md`

Changes:
- Replace the "For complex features, each phase loops per feature" diagram with: "For multi-design work, run the pipeline once per design doc."
- Update the brainstorm/plan/execute/finalize bullets to drop Features-table language and add the skill-entry discovery report note.

---

## Notes

- Each task is one cohesive unit (one file, or guard+tests) → one commit. Executing-tasks handles commits; no `git commit` in task bodies.
- The guard (Task 1) is the only code change and the only task with a checkpoint; Tasks 2–10 are prose edits that auto-advance.
- This is a breaking change to a published package → major version bump, no backward-compat parsing of the old Features table (per the decisions doc).