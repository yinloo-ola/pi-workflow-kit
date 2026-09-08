# Oversight Model

`pi-workflow-kit` combines **skills** and **one extension**.

## Skills

Skills teach the agent the workflow. There are 5 pipeline skills:

- **pwk-brainstorming** — explore ideas, produce the single buildable design doc (each `### R<n>:` block carries its acceptance criteria + review tags) that opens with a `## At a glance` digest for the human (plain-language summary → **Key decisions** with rejected-alternative clauses only for real forks → `| R# | Requirement in one line | Risk |` table) immediately before the `## Requirements` blocks. For a requirement too big for one design doc, may start an **umbrella** (multiple design docs under one status-free overview, shipping as one PR). On non-trivial topics, requests the logical `codebase-recon` capability and falls back to the `pwk-recon-scout` role inline when unavailable or unsafe.
- **pwk-executing-tasks** — feature-gate flow: write the feature E2E first, implement the design doc's `### R<n>` requirement blocks, then one feature-level review before the **ship checkpoint** (execution summary + coverage table presented for approval; full diff on request); two mandatory checkpoints (feature-spec + ship), per-requirement ceremony opt-in
- **pwk-code-review** — the inline reviewer (code tracing, spec alignment, code smells, production hazards). During `pwk-executing-tasks`, the feature-level review requests the `parallel-review` capability for four logical fresh-context, read-only roles; successful reports are retained and missing roles are retried or completed inline. It falls back to inline review when no safe compatible provider exists. The canonical provider contract is documented in `docs/provider-delegation-contract.md`.
- **pwk-finalizing** — dispose consumed plan docs (archive or delete; for an umbrella, the overview + every part), curate lessons, update docs, create PR or merge

Plus 2 on-demand skills:

- **pwk-status** — read-only overview of all active design topics (phase + progress), for resuming or juggling parallel designs
- **pwk-diagnose** — 6-phase debugging loop, invoked anytime something is broken

They explain *what* to do and *when* to do it. Phase control is manual — you invoke each skill with `/skill:`; the agent never advances on its own.

## Extension

The `workflow-guard` extension registers the Pi-only `/pwk-setup` command and enforces one workflow rule:

> During brainstorm and plan phases, `write` and `edit` are **hard-blocked** outside `docs/plans/`.

The agent can still use `read` and `bash` for investigation. During those gated phases, `bash` is governed by a simple destructive-command blacklist (`rm`, `>`, `git commit`, `npm install`, in-place editors, etc.) — a command is allowed unless it matches a destructive pattern. A short phase reminder is shown once when the gated phase begins so the model self-restricts.

During executing-tasks, code-review, finalizing, **and diagnose**, nothing is restricted (diagnosis needs to write failing tests and debug instrumentation, so it exits the gate). `pwk-status` stays inside the gate.

Canonical role contracts live in `agents/pwk-*.md` (single source of truth) and can be installed into `.agents/agents/` with `/pwk-setup`. `pwk-executing-tasks` requests logical review roles through the host’s delegation capabilities and passes each role a one-liner pointer to a script-assembled review packet — the packet defines the scope per review level (feature review: the whole feature diff; per-requirement: just that slice).

Phases follow the skill you invoke — there is no message-keyword unlock. Invoking `/skill:pwk-executing-tasks`, `pwk-finalizing`, `pwk-code-review`, or `pwk-diagnose` exits the gated phase (those skills write source); `pwk-status` deliberately does **not** (read-only orientation). `/pwk-guard on|off|auto` manually overrides the guard.

## Enforcement style

Hard block for write boundaries during gated phases. No warnings, no escalation, no prompts. Either the tool call is allowed or it's blocked. The unlock list is hard-coded in the extension and verified by `tests/skill-lint.mjs` against the skills' claims, so a skill that promises "read-only" can't silently unlock.

TDD, checkpoints, debugging, and code review are guidance in the skill instructions, not runtime-enforced. The bash blacklist covers common destructive vectors only; exotic escapes (interpreter one-liners, piped shells) rely on the phase reminder — the guard is advisory, not a security boundary.