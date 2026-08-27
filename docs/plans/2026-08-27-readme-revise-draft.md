# Design: Revise README — dedupe, document parallel-review model tiering

<!--
Brainstorm deliverable. The revised README content lives in the message reply;
this doc is the rationale so /skill:pwk-writing-plans can derive acceptance
criteria and the next session can reconstruct intent.
-->

## Requirements

- **R1 — One source of truth per concept.** Install instructions, the skill
  trigger list, and the pipeline diagram each appear exactly once in README.md.
  (Today each appears twice — install in `## Install` and `## Quick Start`;
  the seven skill triggers in `## What You Get` and `## Phase Control`; the
  pipeline diagram in `## What You Get` and `## Feature-Gate Execution`.)
- **R2 — A new "Model tiering & cost" subsection** sits in the `## Parallel
  review` paragraph (where `pi-subagents` is introduced), not as a separate
  top-level section. It shows a `subagents.agentOverrides` JSON snippet for
  the four reviewer roles and explains the "checklist work → cheap model,
  judgment work → mid-tier, no top model in the loop" rationale.
- **R3 — Unchanged factual content.** The seven skill descriptions, the
  feature-gate flow, the two checkpoints, the lessons-learned rules, the
  project layout, and the install commands all stay verbatim. The diff is
  structural, not editorial.
- **R4 — No new top-level sections** beyond what already exists. The
  revision only restructures content already present.

## Why now

The README repeats itself, costing the main agent tokens on every read. It
also undersells the model-tiering story: the four `pwk-*-reviewer` agents
have no `model:` in frontmatter (correctly — providers differ per user), so
right now all four reviewers inherit the parent's model, including the two
mechanical-checklist ones (`smell`, `hazard`). The README tells users how to
install `pi-subagents` but not how to bind cheaper models to the four
reviewer roles it ships.

## Approach considered: ship `model:` in reviewer frontmatter

Rejected. The four agents are package agents — `pi-subagents` discovers them
from this kit. Hardcoding `model: openai-codex/gpt-5.6-luna` would break
for every user who doesn't have that provider. The right place is the user's
own `~/.pi/agent/settings.json`, documented in the README.

## Approach considered: a separate "Performance" / "Cost" top-level section

Rejected. The kit is small and proud of it. The cost story is part of the
parallel-review story — keeping them together means a user who reads the
`pi-subagents` paragraph and decides they care about cost sees the answer
in the next paragraph, not three sections later.

## Design

Merge the two install paragraphs (`## Install` keeps the npm/try-before-
commit block; `## Quick Start` keeps the transcript only). Replace the
"Phase Control" list with a `## Skill reference` table whose rows are the
seven skills and whose columns are the trigger, what it does, and whether
it exits the gated phase — sourced from the existing `## What You Get`
table plus the `UNLOCK_SKILLS` note. Replace the duplicated pipeline
diagram with one occurrence (in `## Feature-Gate Execution`).

Add a 12-line `### Model tiering & cost` subsection immediately under the
`pi-subagents` paragraph in `## What You Get` (or wherever the parallel-
review paragraph finally lands after merge — same place), with:

- A one-sentence rationale: checklists are bounded pattern-matching, so
  cheap models do well; tracing and spec-alignment need mid-tier; no
  reviewer is on the top tier.
- A settings JSON snippet mapping the four reviewers to cheap / mid / mid
  / mid thinking.
- A pointer to `pi-subagents` `docs/models.md` for the full tiering model.

## Production-risk areas

None. README is docs-only; no runtime, no test surface. The `skill-lint`
check still runs on the kit's source — README is excluded from biome
(`*.md` in `biome.json`'s targets) and from the lint script.

## Feature acceptance

- Given the revised README, When a user reads the `pi-subagents`
  paragraph, Then they can find the `subagents.agentOverrides` JSON for
  the four reviewer roles in the very next paragraph without scrolling
  past another top-level heading.
- Given the revised README, When `grep -c "install" README.md` runs,
  Then the literal token `pi install npm:@tianhai/pi-workflow-kit`
  appears exactly once.
- Given the revised README, When the seven skill triggers are listed,
  Then they appear in exactly one place (a single table or list), not two.
