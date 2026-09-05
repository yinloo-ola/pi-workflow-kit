# Design: review cost optimization — packet, tiers, bounds

Optimize the 4-role parallel review fan-out (feature review + per-requirement `Review: parallel`) for token usage and wall-clock **without changing review semantics or findings quality**. The reviews are useful; the spend around them is not. No role is removed, renamed, or merged; coverage semantics (`assessDelegationCoverage`, fallback rules) stay byte-for-byte in behavior.

## Requirements

1. **Fast-tier resource hints on checklist roles.** `agents/pwk-smell-reviewer.md` and `agents/pwk-hazard-reviewer.md` frontmatter ships `thinking: low`, `max_turns: 20`, and a *commented* model placeholder (`# model: <fast-tier> — set yours via /pwk-setup`) — no hardcoded model in the published package. `agents/pwk-{spec,tracing}-reviewer.md` ship `max_turns: 40` only (no model or thinking hints — frontier/default tier).
2. **Shared conduct block in role bodies.** All four role bodies open with a byte-identical shared conduct block (read-only reporter, authority boundary, evidence bar with file:line, report format, explicit "No findings" rule) and each role's checklist sits at the **end** of its body.
3. **Packet discipline clause.** The shared conduct block includes the packet rule: work from the provided packet; targeted reads of files it lists are expected; reads beyond the packet only to verify a specific suspected finding, cited; do not re-derive scope (no re-running `git log`, no repo-wide sweeps). `max_turns` is the hard backstop.
4. **Script-assembled review packet.** The `pwk-executing-tasks` feature-review section defines a deterministic shell recipe that writes `docs/plans/YYYY-MM-DD-<topic>-review-packet.md` (same dated stem as the plan docs): commit list, changed-file list with sizes, every requirement's acceptance criteria copied verbatim from the plan file, `## Feature acceptance`, `## Production-risk notes` if any, and the raw `git diff <merge-base>...HEAD`. The packet bytes pass through no model's output.
5. **One-liner spawns.** Every reviewer spawn is a one-liner: a pointer to the packet file plus role framing appended last. The packet never appears in spawn arguments. Per-requirement `Review: parallel` uses the same recipe scoped to that requirement's commits and criteria.
6. **`/pwk-setup` fast-model personalization.** Setup asks for the fast-tier model only when no hint is installed yet: `ctx.ui.select` populated from `ctx.scopedModels` (gated on `ctx.hasUI`), headless/arg form `--fast-model <name>`, with a skip option. Default injects `model: <chosen>` into installed smell/hazard copies; an explicit "apply to all four" option covers it. Injection is a pure helper (`applyFastModelHint`); idempotence is substitution-aware (`installed == canonical + hint` → skip); a hint-only delta auto-updates; other deltas keep the existing conflict/`--force` rules. Refusal during gated phases unchanged.
7. **Advisory resource hints in the delegation contract.** `docs/provider-delegation-contract.md` gains a short section: `model`/`thinking`/`max_turns` in role frontmatter are advisory; hosts that support per-role resources SHOULD honor them; an unresolvable model hint falls back to the host default and MUST NOT fail the review; `max_turns` is the per-role instance of the existing `bounded-execution` capability.
8. **Doc consistency and packet disposal.** `docs/oversight-model.md` scope wording is fixed (the packet defines scope per review level — resolves the pre-existing feature-vs-requirement inconsistency); `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, and `README.md` mention the packet and hints consistently; the packet filename falls under `pwk-finalizing`'s existing `????-??-??-<topic>-*` glob so it is disposed with the plan docs.

## Problem

The feature review (default `parallel`) fans out four fresh-context read-only reviewers. Where the tokens actually go, per reviewer session:

| Sink | Size | Fixed? |
|---|---|---|
| Role contract (system prompt) | ~300 tokens | yes |
| Scope gather (criteria + raw diff) | packet-sized, once per role | yes — needed by each |
| **Free exploration** (read/grep/find to re-ground) | **unbounded — the tail** | no |
| Model tier × thinking level | everything × price | no |
| Packet transport **into spawn prompts** (spawner output) | 4 × packet as *output* tokens (3–5× input price) | no — hidden largest line item |
| Report round-trip into main context | small | yes |

Wall-clock = slowest reviewer's unbounded exploration. All four run truly parallel (pi-subagents or equivalents), so the levers are tier, bounds, and transport — not parallelism itself.

## Approaches considered

| Approach | Verdict | Reason |
|---|---|---|
| **A. Per-role model/effort hints** (smell+hazard fast tier, spec+tracing frontier) | **adopted** | smell/hazard are bounded pattern checklists; spec/tracing are criteria↔code↔tests triangulation ("the core — they catch what tests miss"). Miss-cost is asymmetric: false positives get caught at triage; misses on core roles are silent at the last gate. |
| **B. Shared bounded packet** | **adopted** | kills the exploration tail; everything exploration was *for* is in the packet or one targeted read away; independence of judgment untouched (fresh sessions, own judgment, cited excursions allowed). |
| **C. Merge 4 roles → 2** | rejected | halves fresh-context perspectives on a review whose results are valued; role names duplicated 5×, "four" prose in 7 sites, coverage semantics rework — a 13-file campaign for savings A+B already capture. |
| **Coordinator subagent forking 4 nested reviewers** | rejected | extra serial session; coverage becomes secondhand (a hallucinated "all four completed" is indistinguishable — erodes the kit's hardest invariant); nested spawning is host-config-dependent; its context-protection benefit evaporates once reports are the only return. *It did inspire packet-as-file.* |
| **Packet inline in spawn prompts** (original P1) | superseded | spawner emits the packet 4× as output tokens — the hidden largest line item. File transport eliminates it. |
| **Full system-prompt unification for cache** (identical bodies, checklists in spawn tail) | rejected | guts role contracts into shells, reverses "checklists live in role contracts", reworks tests — to save ~30k input-equivalents while paying 40k output tokens (120–200k input-equiv). Strictly worse. |
| **All four roles on one model** | rejected as default, offered as setup choice | fastest/cheapest (~90% off) but concentrates silent-miss risk on the core roles. Available via `/pwk-setup` "apply to all four" for users who trust their fast tier. |
| **Risk/diff-size gating of reviews** | out of scope | results are useful; the goal is cost of the review, not fewer reviews. |

## Architecture

Final shape (all four roles retained, coverage untouched):

```
definitions (agents/pwk-*-reviewer.md)     spawn (one-liner)              session
┌──────────────────────────────┐          "Read docs/plans/…-review-    ┌────────────────────────┐
│ frontmatter: tier hints      │           packet.md. Role: <framing>"  │ [system: conduct block │
│ body: shared conduct block   │ ───────►                               │  + this checklist]     │
│        + role checklist last │          packet file (script-built):   │ [spawn one-liner]      │
└──────────────────────────────┘          commits, files, criteria,     │ [read → packet]        │
                                          feature acceptance, risk      │ targeted reads, cited  │
                                          notes, raw diff               │ excursions, report     │
                                          (docs/plans/, ephemeral)      │ (≤ max_turns)          │
                                                                        └────────────────────────┘
```

- **Tier split (default):** spec/tracing on the host default (frontier) model with `max_turns: 40`; smell/hazard on the user's fast model (`thinking: low`, `max_turns: 20`) chosen at `/pwk-setup`.
- **Packet = scope.** Assembled once by fixed shell commands; the main agent's output for the whole gather is ~5 commands. Reviewers read it (input-priced) rather than receive it in spawn args (output-priced).
- **Bounds.** Packet discipline (targeted reads, cited excursions only) in the contract; `max_turns` graceful cap as the backstop; exploration re-derivation eliminated by construction.

## Components

- `agents/pwk-{spec,tracing}-reviewer.md` — reorder body (conduct block first, checklist last); add `max_turns: 40`.
- `agents/pwk-{smell,hazard}-reviewer.md` — same reorder; add `thinking: low`, `max_turns: 20`, commented `# model:` placeholder.
- `skills/pwk-executing-tasks/SKILL.md` — feature-review section: packet recipe (exact shell commands, deterministic `sed`-style extraction of criteria/risk notes from the plan file), one-liner spawn template (pointer + role framing last), excursion rule, per-requirement mirror.
- `extensions/workflow-guard.ts` — `/pwk-setup`: `--fast-model` arg, `ctx.hasUI`-gated picker from `ctx.scopedModels`, ask-only-when-absent, split vs all-four option; exported pure helper `applyFastModelHint(content, model)`; substitution-aware idempotence in `installRoleFiles`. Setup refusal during gated phases and symlink/FIFO rejection unchanged.
- `docs/provider-delegation-contract.md` — advisory resource-hints section (fallback rule, `bounded-execution` tie-in).
- `docs/oversight-model.md` (scope wording fix), `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `README.md` — consistent packet/hint mentions.
- Tests — see below. `CHANGELOG.md` at finalize.

## Data flow

1. Feature-complete checkpoint approved → main agent runs the packet recipe → `docs/plans/YYYY-MM-DD-<topic>-review-packet.md` exists.
2. Main agent spawns four roles in parallel, each with the one-liner (byte-identical except the role tail).
3. Each reviewer: reads packet → targeted reads of listed files around hunks → (rare) cited excursion to verify a suspected finding → report with file:line evidence or explicit "No findings", within its turn budget.
4. Collected outcomes → `assessDelegationCoverage` exactly as today (every role completed with non-empty report; else retry/inline fallback).
5. Main agent applies smell fixes itself (packet file available as reference), flags trace/spec/hazard findings.
6. `pwk-finalizing` disposes the packet with the other `????-??-??-<topic>-*` plan docs.

## Error handling

- **Unresolvable model hint** → host default model; never a failed dispatch (contract rule; pi-subagents fuzzy resolution is the happy path).
- **Turn cap hit** → graceful wrap-up (pi-subagents warns, then stops) → partial report → existing timeout/missing semantics: retry or inline fallback, never silently dropped; empty report is still not success.
- **Packet file missing/unreadable at spawn** → delegation fails → existing fallback path (inline review).
- **`/pwk-setup` headless** → arg form or skip; no UI prompt without `ctx.hasUI`.
- **User edits installed role file beyond the hint** → existing conflict/preserve/`--force` rules apply; only hint-only deltas auto-update.

## Caching analysis (recorded so it is not re-litigated)

Within one session, every turn re-reads its prefix at ~10% — automatic. The design maximizes this: `[system][one-liner][packet]` is static and byte-stable at the head of each session. Cross-agent packet sharing is **structurally unavailable at a profit**:

| Route | Cost | Saves | Verdict |
|---|---|---|---|
| packet in spawn args + identical bodies | 4× packet as output (≈120–200k input-equiv) | 2× packet input | pays 4–6× more |
| packet via file + identical turn-1 tool calls | requires deterministic model output | 3× packet input | not engineerable |
| packet in system prompt | host templating of static files | 4× packet input | no host does this |
| accept (chosen) | — | — | residual ≈ 30k input-equiv/review (~$0.09 at $3/M) |

Caches are per-model, so the two tiers never share anything regardless. Provider caveats: Anthropic requires explicit `cache_control` breakpoints (host-dependent); whether MiMo's API does automatic prefix caching is an open question below — neither affects correctness.

## Testing

Test-first per `docs/lessons.md` (red → green; regex wording assertions, not exact sentences):

- `tests/role-contracts.test.ts` — hint fields per role (`max_turns` values, `thinking: low` on fast pair, commented model placeholder); shared conduct block byte-identical prefix across the four bodies; packet-discipline clause present; checklists still last and per-role distinct.
- `tests/setup-command.test.ts` — `applyFastModelHint` unit cases; injection, substitution-aware idempotence, hint-only auto-update, split vs all-four, headless path, gated-phase refusal unchanged.
- `tests/skill-lint.mjs` — executing-tasks contains the packet-recipe marker, one-liner spawn template, excursion rule; contract doc states advisory + silent-fallback; writing-plans/executing vocab (Check 2) untouched.
- Existing suites stay green: role names, "four reviewers" prose, `/independent/`, `/concurr|parallel/`, fallback regexes, anti-provider-syntax bans, `package-integrity`, `harness-neutral-delegation` E2E.
- New: finalize-glob test that the packet stem is caught by `????-??-??-<topic>-*`.

No `## Production-risk areas` — the change is skills, role markdown, one extension command, and docs; no schema/auth/external-API/concurrency surface beyond what exists.

## Open questions (verify during execute)

1. Does `mimo2.5flash`'s API do automatic prefix caching, and does it accept thinking-level parameters? (Affects cache expectations and the all-four option's compensation, not correctness.)
2. pi-subagents fuzzy resolution: confirm `mimo2.5flash` matches the user's enabled model IDs and what happens when a hint resolves to nothing (informs the fallback-rule wording).
3. The `sed`-style criteria extraction must be validated against the actual plan-doc template emitted by `pwk-writing-plans` (deterministic, no model improvisation).
4. Proposed ADR (awaiting user approval — `docs/adr/` is locked in this phase): *"Review packet transports via file, not spawn prompt"* — output-token economics beat the illusory cache win of inlining; permanent record so nobody "optimizes" it back.

## Feature acceptance

- Given feature-complete approval on a `### Feature review: parallel` feature, When the review runs, Then the packet file is assembled by the fixed recipe, four roles spawn with one-liner prompts referencing it, each reviewer works within packet discipline and its turn budget, and collected outcomes satisfy `assessDelegationCoverage` exactly as before.
- Given `/pwk-setup` with no fast model installed, When the user picks one (or passes `--fast-model`), Then installed smell/hazard copies carry `model: <chosen>` (default split; all-four optional), spec/tracing carry only `max_turns`, and a re-run without a new choice is a no-op.
- Given a role whose `model` hint cannot resolve on the host, When the review dispatches, Then the role runs on the host default model and the review completes.
- Given a reviewer that reaches its turn limit, When it wraps up gracefully, Then its partial report flows through existing missing/retry/inline semantics — never silently dropped.
- Given a reviewer needing context beyond the packet to verify a specific suspected finding, When it makes the excursion, Then the report cites what sent it there; scope re-derivation and repo-wide sweeps remain outside the contract.
- Given the feature is done and `/skill:pwk-finalizing` runs, When plan docs are disposed, Then the review packet file is disposed with them.
