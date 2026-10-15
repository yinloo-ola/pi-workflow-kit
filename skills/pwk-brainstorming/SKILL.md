---
name: pwk-brainstorming
description: "Use this before any creative work — creating features, building components, adding functionality, or modifying behavior. Explores intent and design, then writes the single buildable design doc (requirements with acceptance criteria + review tags) that pwk-executing-tasks builds from. Use this skill whenever the user describes something they want to build, change, or improve, even if they don't say 'brainstorm' — phrases like 'I want to add X', 'let's build Y', 'we need a way to Z', or 'help me design' all apply."
---

# Brainstorming

Read-only exploration of source code; every file you create or edit goes under `docs/plans/`. An approved ADR goes to `docs/adr/` — outside the writable boundary, so the human writes it or briefly runs `/pwk-guard off`, and the design phase never unlocks it. The design doc is the **single buildable artifact**: each requirement carries its own acceptance criteria and review tags, and the executor builds straight from it. Source-writing happens in `pwk-executing-tasks`.

Any command or tool recipe in this skill is an example, not the requirement — when your host grants a better tool for an operation (a sandboxed batch executor — e.g. `codemode` on pi ≥ 1.0.0 — a structured file API), use the better tool and treat the recipe as a fallback; the only exact exceptions are this kit's `scripts/` helpers and plain `git` invocations, whose deterministic output is the point.

## Proportionality: trivial vs non-trivial

Classify the change at the start.

- **Trivial** — a typo or obvious bugfix with no open design questions, a config or version bump, a single-function change, or anything the human flags as trivial. Skip steps 3–6: read the design-format reference, run the validator in step 7, and write a **minimal** design doc in one turn — an `In short:` one-liner (what + why + approach), one `### R1:` block with criteria and tags, an optional `## Production-risk areas` line, and deliberately **no `## Feature acceptance`** (a trivial slice ships on the full existing suite; no E2E is manufactured). Hand off to `/skill:pwk-executing-tasks`. The guard still enforces read-only — trivial compresses the phase to one turn, it does not skip it.
- **Non-trivial** — open design questions, multiple approaches, cross-module impact, or new behavior. Run the full process below.

When unsure, ask: "This looks trivial — fast-path it, or full brainstorm?" Default to full.

## Scope and granularity

**One design doc = one PR; one requirement = one testable slice within it.** Most work is a single design doc; several requirements serving one cohesive outcome do not force an umbrella.

A large request with distinct testable outcomes that need separate design/execute cycles becomes an **umbrella** of vertical slices with one-line scopes and a build order, approved before you write an overview or design. A layers-only split (database, API, UI) is not vertical — each slice delivers testable behavior. Design only the current slice, grounded in implemented code, not speculative sibling designs; the umbrella still ships as one PR on one branch, finalized once.

**One folder per topic:** `docs/plans/<date>-<topic>/`, holding `<leaf>-design.md`, `<leaf>-progress.md`, and `<leaf>-review-packet*.md`; `<leaf>` is `<topic>` for a single-part topic, and more than one leaf adds `overview.md`. The folder is the creation, discovery, and disposal unit.

**Umbrella trigger:** before proposing a new umbrella, or when discovery finds an `overview.md` beside this design, read [references/umbrella.md](references/umbrella.md) — it owns the status-free roster, the first/later-slice procedures, and header-only predecessor reporting. Build order is advisory, not a gate, and an existing roster means the split is already decided; design the current slice against it.

## Process

1. **Check git state** — `git status` + `git log --oneline -5`. Uncommitted work? Ask the user what to do first.
2. **Discovery** *(skip in a brand-new repo with no `docs/plans/`)* — first verify the repo root: run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts). Then list `docs/plans` recursively, excluding docs/plans/completed/, for `*-design.md`, `*-progress.md`, and `overview.md` (topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight). Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`; report in-flight topics and any active umbrella, each topic’s `Feature phase:` line header-only (`grep -m1 '^Feature phase:' <file>`; design-only topics report `design` — no body ingest). With a sandboxed batch executor (e.g. `codemode` on pi ≥ 1.0.0) the listing and every phase extraction are one call, returning only the summary lines (adapt the paths to the verified root when your cwd differs):

   ```javascript
   const designs = (await tools.bash({ command: "find docs/plans -name '*-design.md' -not -path '*/completed/*' | sort", timeout: 15 })).output.trim();
   const files = designs ? designs.split('\n') : [];
   const shellq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
   const heads = await Promise.all(files.map(d =>
     tools.bash({ command: "grep -m1 '^Feature phase:' " + shellq(d.replace('-design.md', '-progress.md')), timeout: 15 }).then(r => r.output.trim() || 'design')));
   return text(files.map((d, i) => d + ' — ' + heads[i]).join('\n') || 'no in-flight topics');
   ```

   If the idea continues an existing topic, ask whether to extend it or start fresh. An `overview.md` **beside the design doc** means the split is already decided — read it for the roster and design this part’s `<leaf>-design.md` against it.
3. **Understand the idea** — **PRD brief.** With source material (a PRD, ticket, or spec — pasted text, a path, a URL), open with a brief before any question: **Background** (the problem, why now, who is affected — each product claim cites its PRD section), **Current situation** (what the code does today — each claim cites `file:line`), **The delta** (what must change, each line naming a requirement candidate, and what stays untouched). Zero-context rule: plain meaning first, the pointer second — quote non-English domain terms with a plain-English gloss and mark anything uncited `(interpretation: …)`. Unreadable source material: report the blocker, ground on code only, name the gap. The human corrects the brief before frontier rounds; confirmed facts weave into the design doc, with no sidecar file. No source material, no brief. Then read only enough code, docs, and commits to ground the design, and **check `docs/lessons.md`**.

   Ask questions in **frontier rounds** — the frontier is every question whose prerequisites are settled. Build the tree by walking every checklist dimension (*Goal & scope · Data & state · Behavior & edge cases · Errors & failure · Integration · Non-functional*), print `— nothing to ask` for empty groups, and ask the whole frontier in one round: number each question (`Q1`, `Q2`, …) with your recommended answer (`➡️ <recommendation>`) so the human confirms, strikes, or corrects each in one reply. A question that depends on another still-open one waits for a later round; recompute the frontier after each round.

   **Facts vs. decisions:** anything answerable from the codebase, docs, or tools is looked up — recon scout or inline — never asked of the human; a pending lookup holds only its downstream questions while the rest of the frontier is asked now. **Runnable facts:** an unknown observable by running something — behavior, timing, output, layout — is settled by a bounded sketch, never asked of the human and never guessed: an inline interpreter or a file under `docs/plans/<topic>/`, no installs, no source writes. Record it where it lands as `(settled by sketch: <what ran> → <result>)` and list it in the round summary so the human can strike it; a sketch result that would set business behavior still passes the assumption gate; inconclusive or blocked → record `INCONCLUSIVE` plus one line of what ran, and the question returns to the human with the result attached. A cheaper read beats a run when reading can decide, and only decisions are asked.

   Major approvals stay single-decision — one question each, never batched: approach selection (step 5), umbrella split, design approval, ADR offer. The interview ends when the frontier is empty — every branch visited, nothing left silently assumed — not when you feel you understand. Then present a short summary and ask: "Should I proceed, or is there more?" The human decides when to move on.
4. **(skipped on trivial changes)** **Codebase recon** — first **enumerate what this session actually grants** and name what you found: under a batch executor `Array.from(ALL_TOOLS)` (a tool-hiding executor like `codemode` in `only` mode keeps the spawn tool out of your visible list — that is not absence), otherwise the tools and roles your host listed. Then request the host’s `codebase-recon` capability using the logical `pwk-recon-scout` role: a fresh-context, read-only, bounded worker given the topic, one-line intent, and repo root. Use its 5-section map (Relevant files, Existing patterns, Call sites, Test layout, Gotchas) as grounding for steps 5–6 instead of reading those files inline; the scout reports observations only, never design recommendations. No delegation capability among the tools you enumerated, or constraints it cannot enforce → report `Scout: unavailable` **with the enumeration result** and do the same recon inline, preserving the five-section map and `file:line` citations; never omit recon silently.
5. **Explore approaches** — propose 2–3, leading with your recommendation, and sketch the concrete interface (types, signatures, example caller) for each so the comparison is grounded in code rather than abstractions.
6. **Present the design** in one pass, organized into sections (architecture, components, data flow, error handling, testing) — the human comments on any section; re-present only revised sections.

   **Assumptions to confirm first** — before presenting, sweep the drafted design: every unconfirmed assumption it would bake in (business rules, defaults, edge-case resolutions) re-opens as a numbered question with your recommended answer, for one reply. An honest empty gate ("no unconfirmed assumptions") when the draft is clean — never invent items. Hard rule: no business behavior enters the design doc on the agent's assumption; confirmed facts are woven into existing sections, with no new template section.

   Identified a significant architectural decision? Offer an ADR in `docs/adr/`, only when all three hold: **hard to reverse**, **surprising without context**, **a real trade-off**. Format: title + 1–3 sentences of context/decision/why. ADRs are permanent institutional memory — never archived or rotated. (Guard note: the human writes the approved ADR or briefly runs `/pwk-guard off`; you never write it while the design phase is gated.)
7. **Write the design doc** — validate its structure before handing off. Read [references/design-format.md](references/design-format.md) first for the exact format, tag defaults, risk/Setup rules, and audit; requirement blocks carry acceptance criteria plus `### Checkpoints` / `### Review` tags. Missing tags default to `none` / `skip`. Write `docs/plans/<date>-<topic>/<leaf>-design.md`, creating the topic folder when absent. It is descriptive, not a task list — the executor builds directly from it.

   **Completion gate:** Test observable behavior through the public interface. Audit every requirement’s criteria, tags, and risk notes — each appears exactly once. A criterion is ready only when its `Then` names an outcome a command can observe — a run, a grep, or an assertion; a criterion with no nameable probe sends the requirement back for splitting or rephrasing, and design-doc criteria never name tests — the probe materializes at execution. For non-trivial work, finish with an end-to-end `## Feature acceptance` as the primary enforced spec. If writing a scenario step would require inventing behavior, that invention goes back through the assumption gate: an unwritable step means an unspecified requirement, not permission to guess. Risk notes never set the tag — the written `### Review` value stays `skip` unless the human sets it, and only the human tags a slice for review. Keep designing until the requirements compose into a coherent feature and the human approves the design, including feature acceptance; trivial work keeps the compressed one-turn path above.

   **Runtime prerequisite:** structural validation runs as a dependency-free Node script where commands execute, using only Node's standard library. Confirm `node --version` works before invoking the helper; if Node is missing, report the blocker and request a suitable runtime, then stop at this gate. Never auto-install a runtime, use a fallback implementation, or claim validation succeeded.

   Resolve the helper from this installed skill’s directory and pass explicit paths, quoting paths with spaces:

   ```sh
   node "<brainstorming-skill-dir>/scripts/validate-design.mjs" "<design-path>"
   ```

   Nonzero means validation did not succeed: report file-specific diagnostics, correct the structural errors, and rerun. A missing local reference or helper is a blocker before its dependent action; success verifies structure only — never semantic correctness, sound slicing, confirmed assumptions, or human approval.

The session stays read-only and uncommitted through brainstorm: branch creation and the design-doc commit happen at the start of `pwk-executing-tasks`.

## Principles

- Detail-gathering asks in frontier rounds; approvals ask one decision at a time
- No silent assumptions — ask, gate, or look it up
- YAGNI — remove unnecessary features
- Design for testability
- Explore alternatives before settling

## After the design

Ask: "Ready to execute? Run `/skill:pwk-executing-tasks`"

## Contract index

The detailed design contract is in `references/design-format.md`; this compact index keeps
the pipeline markers visible to tools that inspect only the entrypoint:
`## At a glance` → **Key decisions** → `| R# | Requirement in one line | Risk |`;
`### R<n>: <name>` blocks contain Given/When/Then criteria, no test-name lists, and both
tags. The feature section ends with `### Feature review: auto | parallel | inline`.
Production-risk display is `⚠ production-risk` if and only if notes exist; alternatives
are never manufactured. The umbrella roster uses `## Parts (build order)` and
`N. <leaf> — <one-line scope>`.
The design format carries `Given/When/Then criteria`, `no test-name lists`, and tags;
the full contract also states `written \`### Review\` value stays \`skip\`` and records
architectural deviations `at deviation time`.

```markdown
## Feature acceptance
- Given <starting state>, When <trigger>, Then <outcome>.
### Feature review: auto | parallel | inline
```
