# Decisions: Simplify the pi-workflow-kit workflow and guard

## Problem

`pi-workflow-kit` has accumulated two kinds of complexity that make the workflow heavier than it needs to be.

**1. Workflow coordination via the Features table.** Today a brainstorm produces one design doc containing a `## Features` table whose rows carry status (`⬜ pending` / `🔄 planned` / `✅ done` / `⏭ skipped`). This table is the central coordination mechanism: `pwk-writing-plans` finds the next `⬜ pending` feature and flips it to `🔄 planned`; `pwk-executing-tasks` finds the `🔄 planned` feature, runs, marks it `✅ done`, then loops for the next; `pwk-finalizing` warns if any features are unplanned before archiving; implementation plans link back via `Feature: <name> (row N in Features table)` metadata. Four skills parse and mutate a shared table across multiple sessions, threaded through fragile cross-doc metadata and an implicit per-feature loop. This is the largest source of friction and fragility.

**2. The guard's allowlist bash check.** `isSafeCommand` requires a command to match an explicit `SAFE_PATTERNS` entry *and* not be destructive (`!isDestructive && isSafe`). This hard-blocks legitimate read-only commands the allowlist doesn't anticipate — `for`/`while` loops, `go test`, `pytest`, custom scripts, and any command prefixed by a shell assignment (`PI=...; grep …`). During the read-only phases this causes constant false-positive blocks (it blocked the agent's own research commands during this very brainstorm).

Both run against the kit's own stated goal: enforce the *important* constraints (no source writes during design; block genuinely destructive ops) without getting in the way of legitimate read-only work.

## Approaches considered

**Workflow coordination:**
- **Option A — Design-doc-per-pipeline (chosen).** Brainstorm produces one design doc, or splits a genuinely large issue into several design docs (a human-approved, brainstorm-time decision). Each design doc runs its own self-contained pipeline: `plan → [design-review] → execute → [verify] → finalize`. No Features status table, no per-feature loop, no feature-row metadata. The `<topic>` slug is the sole identity tying a design's artifacts.
- **Option B — Keep one design doc, demote the Features table to a descriptive list, run the whole doc through one pipeline.** Simpler than today, but a large multi-part design collapses into one plan that exceeds the ~15-task budget — re-introducing exactly the "too big for one plan" problem the per-feature loop was invented to solve.

**Guard:**
- **Option A — Simple common blacklist + tail-appended phase reminder (chosen).** Bash check becomes `!isDestructive` (drop `SAFE_PATTERNS`, keep a simple destructive list); keep the write/edit file-path block. A short phase-aware reminder is appended after the user's message each turn (a message, not a system-prompt change) — cache-safe because it sits at the tail, never the prefix.
- **Option B — Blacklist + system-prompt-prefix note.** Rejected on cache grounds: a note merged into the system prompt reprocesses the *entire* (potentially long) message history at every phase transition, because the system prompt is the cached prefix.
- **Option C — Status quo allowlist.** Rejected — false-positive friction.

**Chosen: A + A.** Design-doc-per-pipeline removes the coordination machinery by making each design an independent unit (1 design : 1 plan : 1 progress : 1 finalize). The guard drops the allowlist (removing false-positive blocks) and adds a tail-appended reminder (cache-safe) so the model self-restricts, with the file-path write block and a simple destructive blacklist as backstops.

## Decisions

### Drop the Features status table and the per-feature loop

The Features table — mutated by four skills, threaded through `Feature:` metadata and an implicit loop — is the complexity multiplier. Each design doc becomes a self-contained 1:1:1:1 pipeline. Removes the cross-skill coordination, the fragile metadata, and finalize's coupling to "all features done." Smaller, independent PRs fall out for free.

### Brainstorm may split a big issue into multiple design docs, only when warranted

Splitting replaces the Features table's "decompose a large design" function, but as a first-class, human-approved *design* decision made at brainstorm time — not as implicit plan/execute machinery. Most work is one design doc; splitting is opt-in when the sub-issues are large and genuinely independent.

### Bash guard: simple common blacklist

Drop `SAFE_PATTERNS` (the allowlist) and the `&& isSafe` term; keep `DESTRUCTIVE_PATTERNS` as a simple list of common dangerous commands (`rm`, `git commit`, `npm install`, `>`, `>>`, `mv`, …) plus the write/edit file-path block. We do **not** extend the blacklist exhaustively for every exotic mutation (`sed -i`, `go generate`, `go mod tidy`) — the per-turn reminder (next decision) tells the model the phase is read-only, so it won't run those during design, and the guard is advisory anyway. Fewer false positives, simpler, good enough.

### Phase guidance: a tail-appended reminder each turn + the block reason on violation

A short, phase-aware reminder is appended after the user's message **every turn** via `before_agent_start` — as a message, *not* a system-prompt change. This is cache-safe: the reminder sits at the **tail** of the request (after the user message), so its phase-dependent content never enters the cached prefix. That is the exact reason a system-prompt-prefix note was rejected earlier (that changed the prefix and reprocessed the whole history at every phase transition); a tail-appended message evades it — the differing content is always at the tail, never in the prefix. (If pi persists these messages, history gains one short line per turn — negligible, and each prior line is itself cached.) On an actual blocked attempt, the guard's block `reason` still fires as that call's tool result — a reactive backstop. Together: simple common blacklist + a soft per-turn reminder + a hard block on violation.

### Identity is the `<topic>` slug; continuity via glob + resume-or-ask + skill-entry report

The design-doc filename `YYYY-MM-DD-<topic>-design.md` is the stable identity tying `*-design.md` → `*-implementation.md` → `*-progress.md` → `*-verification-report.md`. A new session resumes by invoking the skill for the phase to continue; the skill globs `docs/plans/`, resumes the single match, or asks if several. Each resumption skill (`pwk-writing-plans`, `pwk-executing-tasks`, `pwk-finalizing`) leads with a one-line "here's what I found" report on entry, so orientation is free — no registry file, no status skill.

### Finalize is scoped per-`<topic>`, not blanket-glob

Today's `mv docs/plans/*-design.md docs/plans/completed/` archives *every* design doc; in the split case it destroys un-started designs. Finalize will archive only the active design's `*<topic>*` artifacts (topic derived from the in-flight pipeline, or asked if ambiguous). Un-started designs survive. This also fixes a latent bug in the current finalize.

### ADRs live permanently under `docs/`, never archived

ADRs record hard-to-reverse, surprising decisions for future readers — institutional memory, not throwaway planning artifacts. So ADRs are written to `docs/adr/` and never moved during finalizing; only the working artifacts (design, implementation, progress, verification docs) get archived to `docs/plans/completed/`. Today ADRs sit at `docs/plans/adr/` and get swept into `docs/plans/completed/adr/` — buried exactly when a future reader would look for them.

## Plan/Execute redesign (refined during execution)

### Plans are behavioral specs, not implementation recipes

`pwk-writing-plans` produces, per requirement: **acceptance criteria + integration-test cases** — a stable behavioral spec. It does NOT specify implementation (no exact code, no file-by-file recipe, no micro-tasks). A fine-grained implementation plan invalidates the moment a detail shifts; acceptance criteria + integration tests survive implementation changes. The executor has full autonomy to choose structure, signatures, internals.

### Executor writes the integration tests first (Option A)

`pwk-writing-plans` specifies acceptance criteria + integration tests in the plan doc; `pwk-executing-tasks` creates the test files first (red), then implements to green. The plan phase stays read-only (no guard change).

### Two mandatory checkpoints per requirement

Each requirement in `pwk-executing-tasks` has two hard human-review gates: (1) after the integration tests are written, (2) after the requirement is implemented. Both mandatory.

### Discard design-review; add pwk-code-review; drop verify

`pwk-design-review` and `pwk-verify` are removed. A new `pwk-code-review` runs after each requirement completes — code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), and the production hazard check. It is unlocked (can modify code to fix smells); per-requirement code-review supersedes the old separate verify pass.

### Design docs list requirements

Brainstorming design docs explicitly enumerate the requirements, so writing-plans derives acceptance criteria per requirement.

## Module outline

Files the next skill will change (edit in place — name + the intent of each change, not signatures):

- `skills/pwk-brainstorming/SKILL.md` — drop Features-table production; a design doc is descriptive (problem, approaches, architecture, components, data flow, error handling, testing) **and enumerates the requirements**; may produce multiple design docs when a large issue is split (human-approved); ADRs are written to `docs/adr/` (not `docs/plans/adr/`).
- `skills/pwk-writing-plans/SKILL.md` — plan the whole design doc; **per requirement produce acceptance criteria + integration-test cases** (a behavioral spec — no implementation code, coarse); drop feature-row logic and `Feature:` metadata; keep the `Design:` reference; specify the two mandatory checkpoints (after tests, after complete).
- `skills/pwk-executing-tasks/SKILL.md` — **high autonomy per requirement**: write integration tests (red) → ⏸ checkpoint: tests → implement to green → ⏸ checkpoint: complete → `/skill:pwk-code-review`; drop Features-table logic; skill-entry discovery report; after all requirements, suggest finalize.
- `skills/pwk-finalizing/SKILL.md` — scope archive to `*<topic>*` artifacts (design/implementation/progress/verification docs only); do **not** move ADRs (they stay at `docs/adr/`); drop the "unplanned features" warning; keep lessons curation, docs update, merge strategy.
- `skills/pwk-design-review/SKILL.md` — **remove** (discarded; replaced by the per-requirement `pwk-code-review`).
- `skills/pwk-verify/SKILL.md` — **remove** (dropped; per-requirement `pwk-code-review` supersedes it).
- `skills/pwk-code-review/SKILL.md` — **new**: per requirement, after the complete checkpoint — code tracing, spec alignment (vs acceptance criteria), code smells (applies fixes), production hazard check; unlocked (can modify code).
- `extensions/workflow-guard.ts` — drop `SAFE_PATTERNS` and the `&& isSafe` term in `isSafeCommand` (simple common blacklist via `DESTRUCTIVE_PATTERNS`); add a `before_agent_start` hook that appends a short phase-aware reminder **after the user's message** each turn (a message, not a system-prompt change — cache-safe); keep `splitCompoundCommand`, `stripHarmlessRedirects`, `DESTRUCTIVE_PATTERNS`, `shouldBlockFilePath`, and the reactive block reason.
- `tests/workflow-guard.test.ts` — update `isSafeCommand` expectations: read-only commands no longer need an allowlist match; destructive commands still blocked.
- `README.md` / `docs/developer-usage-guide.md` / `docs/workflow-phases.md` — rewrite the workflow description: design-doc-per-pipeline (no Features table, no per-feature loop), behavioral-spec plans + autonomous execution + per-requirement `pwk-code-review`, the new continuity model, and the blacklist guard.

## Notes

- **Versioning / backward compatibility:** this is a breaking change to a published npm package (`@tianhai/pi-workflow-kit`). Recommend a major version bump and *no* backward-compat parsing of the old Features table — that would re-introduce the very coordination code being removed. Existing in-flight design docs remain readable prose; their status columns simply stop being parsed.