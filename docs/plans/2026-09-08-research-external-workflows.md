# Research: External AI-agent spec/workflow tools — docs, token economy, human summaries

**Question**: How do other AI-coding-agent spec/workflow tools structure their documents, and what do they do about token economy and human-facing summaries? (For pwk redesign: cut artifacts, foreground architecture, add on-demand explainer.)

**Answer**: Every surveyed tool splits artifacts by reader — human reviews *why/what* (proposal, requirements) while agent consumes *how* (design, tasks); none has a first-class ADR artifact (Spec Kit's "constitution" is closest); and 2025–26 discourse is dominated by a strong token-cost/review-overload backlash ("plan mode over spec hierarchies"), with delta-specs and scale-adaptive paths as the main mitigations and auto-generated wikis (DeepWiki, `tessl document`) as the emerging on-demand-explainer pattern.

## GitHub Spec Kit (github/spec-kit, v1.0.0)

- **Docs & readers**: `.specify/` workflow — `constitution.md` (human-ratified principles, agent-enforced gate before plan research), `spec.md` (human-reviewed user stories P1/P2/P3 + FRs + edge cases), `plan.md` (mostly agent-consumed: tech context, structure decision, complexity-tracking table), `tasks.md` (agent-consumed checklist, grouped by user story, [P] parallel markers), plus `research.md`, `data-model.md`, `quickstart.md`, `contracts/` (all agent-produced/consumed). Reviewer-owned `checklists/requirements.md` is a quality gate the implement command reads but must not modify. [templates: `templates/{spec,plan,tasks,checklist,constitution}-template.md`; workflow README.md]
- **Plan detail**: plan.md fixes file-tree structure and rejects alternatives in a "Complexity Tracking" table (violation / why / rejected-because); tasks.md carries exact file paths per task — heavy upfront detail. Execution adds `/speckit-converge` to check implementation against spec+plan+tasks.
- **Token practices**: none explicit; the artifact set *grew* (research/data-model/contracts added to plan output). Heaviest tool in every comparison.
- **Architecture/ADR**: no ADR artifact. Constitution ("supersedes all other practices", versioned, amendments documented) is the governance-for-humans concept; project-structure choice inside plan.md is the only architecture decision recorded.
- Sources: https://github.com/github/spec-kit (templates/, README.md "Development Phases")

## AWS Kiro (kiro.dev)

- **Docs & readers**: exactly 3 per spec — `requirements.md` (human-approved; user stories + acceptance criteria in EARS notation `WHEN <trigger> THE SYSTEM SHALL <behavior>`), `design.md` (architecture, sequence diagrams, data models, error handling, testing strategy; human reviews/approves), `tasks.md` (agent-executed discrete tasks with dependencies, optional/required flags). "Steering" files (product.md/tech.md/structure.md) are an agent-read memory bank. Human confirms each phase before the next artifact is generated ("Once you confirm the requirements, Kiro generates design.md").
- **Plan detail**: design.md captures "the big picture"; tasks reference requirement numbers for traceability — task-level implementation detail left to the agent.
- **Token practices**: **Quick Spec** variant generates all three artifacts without approval gates — scale-adaptive ceremony reduction; Design-First variant accepts diagrams/MCP imports instead of writing from scratch.
- **Architecture/ADR**: design.md *is* the architecture doc, human-reviewed; no ADR lifecycle.
- Sources: https://kiro.dev/docs/specs/ , .../specs/feature-specs/ , .../specs/feature-specs/requirements-first/

## OpenSpec (Fission-AI/OpenSpec)

- **Docs & readers**: `openspec/specs/` = living truth of current behavior (agent-context, maintained); `openspec/changes/<id>/` = `proposal.md` (why — human reads first), delta `specs/` (ADDED/MODIFIED/REMOVED requirements + scenarios), `design.md` (how — optional), `tasks.md` (steps). "Your AI writes these; you review the plan before any code is written." Archive folds deltas back into specs. Explicitly "enablers, not gates" — edit any artifact mid-flight.
- **Plan detail**: deltas describe *the diff, not the destination* — you can spec a change to a 50k-line app without documenting the whole system. Design feeds tasks; dependencies exist "only so the AI has the context it needs."
- **Token practices**: delta-specs are the token-economy trick (no full-system rewrites per change); `/opsx:explore` is a **no-stakes, no-artifact** thinking phase before any file is written; README admits "for a truly trivial one-line fix, the ceremony may not pay off."
- **Architecture/ADR**: none; `design.md` per change, optionally regenerated.
- Sources: https://github.com/Fission-AI/OpenSpec (README.md, docs/overview.md)

## BMAD-METHOD (bmadcode/BMAD-METHOD, v6)

- **Docs & readers**: 4 phases (analysis→planning→solutioning→build) via skills: `brainstorm-intent.md`, `prfaq.md`, `brief.md`, `prd.md` (org-owned, "written by bmad-prd, validated by it"), `DESIGN.md`/`EXPERIENCE.md` (UX), `ARCHITECTURE-SPINE.md` (v6 architecture doc), `SPEC.md` + per-story records + `stories.yaml` (agent execution plan), `sprint-status.yaml`. 12+ agent personas (PM, Architect Winston, Dev Amelia, QA…); humans approve PRD/architecture gates.
- **Plan detail**: **scale-adaptive** — one question: "is the intent already well defined?" Well-defined → skip straight to `bmad-spec`; one-session spec → straight to build; epic-sized → Story Breakdown, one build session per story. "A small change may not need BMad at all." Stories are an execution plan to update, not a promise — re-run breakdown when reality diverges.
- **Token practices**: `bmad-spec` reads input in one pass with a **ceiling of a few tens of thousands of tokens** — larger raw docs must be condensed first or content is silently lost; build loads *one story plus shared context* per session (sharded context); `.memlog.md` scratch files.
- **Architecture/ADR**: ARCHITECTURE-SPINE.md is the closest thing to a maintained architecture doc among all tools; no ADR records.
- Sources: https://docs.bmad-method.org/plan/choose-a-planning-path/ , .../reference/workflow-map/ , https://github.com/bmadcode/BMAD-METHOD

## Tessl, Claude Code, Cursor

- **Tessl** (tessl.io): only *spec-as-source* tool — generated code stamped `// GENERATED FROM SPEC - DO NOT EDIT`, 1:1 spec↔code mapping; `tessl document` **reverse-engineers specs from existing code** and regenerates docs on repo change (registry-managed plugins). SDD plugin flow: clarifying questions → specs → human approval → implement → review. https://docs.tessl.io/use/spec-driven-development-with-tessl , https://tessl.io/registry/tessl-labs/spec-driven-development/2.0.0
- **Claude Code plan mode**: ephemeral plan presented in chat, read-only exploration first, human approves → mode exits and implementation runs. Plan is *not* persisted as a project artifact (contrast: pwk plan docs). Official: https://code.claude.com/docs/en/permission-modes , .../common-workflows ("Plan before editing")
- **Cursor**: `.cursor/rules/*.mdc` — human-authored, agent-read persistent conventions with activation modes (Always / Agent-requested / Auto-attached by glob / Manual). No spec/plan artifact format. https://cursor.com/docs/rules

## Discourse 2025–26: criticisms & explainers

- **Review overload / verbosity** (Böckeler, Thoughtworks, on Kiro/spec-kit/Tessl): spec-kit = "a LOT of markdown files… repetitive, very verbose and tedious to review"; "I'd rather review code than all these markdown files"; agent "ultimately not follow[ed] all the instructions" anyway (false sense of control); one-workflow-fits-all "not suitable for the majority of real life coding problems" — she calls for *a few core workflows per problem size* and "a very good spec review experience". https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
- **Token cost** (Instil): SDD artifact hierarchies are hauled through context every step, defeating caching/context discipline; stale plans add "context rot" — "you're paying twice, once on the input bill and once in degraded output"; spec-kit "ran several multiples of the equivalent plan-mode flow"; Scott Logic measured ~10× slower than iterative prompting with no quality gain; prescription: "one document, one round of iteration, then code." Exceptions worth keeping: long-lived specs for public APIs, regulated domains, **ADRs**. https://instil.co/blog/spec-driven-development-is-dead-long-live-plan-mode , https://blog.scottlogic.com/2025/11/26/putting-spec-kit-through-its-paces-radical-idea-or-reinvented-waterfall.html
- **Related critiques**: Marmelab "Waterfall Strikes Back" (markdown layers bury agility); INNOQ (tacit knowledge can't be front-loaded; "thick specs ≠ shared understanding"). https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html , https://www.innoq.com/en/blog/2026/04/versteckte-kosten-spec-driven-development/
- **On-demand explainers**: DeepWiki (Cognition/Devin) auto-generates a wiki per repo — architecture diagrams, file-linked summaries, chat grounded in code, refreshes on push, usable as MCP server in Claude Code/Cursor. https://docs.devin.ai/work-with-devin/deepwiki ; Tessl `tessl document` regenerates docs from code.

## Synthesis (for the three design goals)

**Token economy — converging patterns**: (1) *Delta over monolith* (OpenSpec's ADDED/MODIFIED/REMOVED) — describe the change, never rewrite the system; (2) *Scale-adaptive paths* (BMAD's planning-path decision, Kiro's Quick Spec) — ceremony proportional to risk, trivial work skips artifacts entirely; (3) *No-artifact thinking phase* (OpenSpec `/opsx:explore`) — scope conversation before any file is written; (4) *Sharded execution context* (BMAD loads one story + shared spine per session) — plan docs read once per session, not per step; (5) *Ephemeral plans* (Claude Code plan mode, Instil's prescription) — the strongest anti-artifact position: plan in chat, discard after approval. pwk's crosswalks/digests align with Instil's "artefact-shaped overhead" critique if they duplicate plan content — one source of truth per fact, summaries that *replace* rather than *add to* reading.

**Architecture-first human review**: nobody reviews code *and* a full doc stack (Böckeler); the human-facing artifact every critic actually wants is the *decision record* — which tool rejected which alternative and why (Spec Kit's complexity-tracking table and constitution gates are the strongest precedents; BMAD's ARCHITECTURE-SPINE.md is the maintained-architecture precedent; Tessl/Instil keep ADRs as the one spec class worth long-term maintenance). A dedicated decisions section/artifact the human reviews — while tasks/progress stay agent-only — matches where the field landed.

**On-demand implementation explainer**: validated as an emerging pattern, always *generated-from-code, never hand-maintained*: DeepWiki (wiki on push / on demand, MCP-served) and Tessl `tessl document` (regenerate specs from the repo, "regenerate when the library changes"). No surveyed tool makes the explainer a *checked-in* artifact — generation-on-demand from the finished diff/branch is the norm, which also answers token economy: zero standing tokens until a human asks.

**Outliers**: Tessl is the only spec-as-source bet (Böckeler: risks "the downsides of both MDD and LLMs"); OpenSpec is the only one whose specs describe *current* behavior as living truth; Kiro's EARS notation is the only formal requirement grammar; Spec Kit uniquely ties artifacts to a constitution with an agent-run convergence check.

## Gaps / unverified

- Kiro's per-section `design.md`/`tasks.md` internals are documented only in-IDE; public pages don't enumerate sections (EARS format and phase gates are verified).
- BMAD v6's story-file field structure (v5 "sharded docs" web/search split) not directly read — only the planning-path and workflow-map pages; exact story template would need `src/` or docs site tutorial.
- Tessl spec manifest format is proprietary/beta; only the plugin's behavior is documented publicly.
- No surveyed tool integrates ADRs as a first-class workflow artifact — absence is verified across read docs, but tools may support them via extensions not reviewed.
