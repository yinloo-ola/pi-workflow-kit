# Skill-slimming fidelity and cost probe

A read-only protocol for the one observed claim in the skill-slimming topic: that the slimmed kit still drives the workflow correctly and costs fewer tokens per session. The deterministic size claim (words) lives in `skill-lint` and the feature E2E; this directory holds the separate, observed cost claim. It never invokes a provider or a model, and it holds no credentials.

Six runs total: the baseline kit (commit `dfe0dd0`, version 2.9.0) and the slimmed candidate, three fresh trials each on the same fixture task. A human authorizes the provider, model, network, and spend before every run.

## Safe manual workflow

Run from a disposable, workspace-local session directory. No credentials, no provider config, and no credential-bearing transcripts belong in this repository.

Before every provider invocation, explicitly authorize the provider, model, network access, and any spend. Then run your locally installed agent in a fresh workspace and export the session transcript and the provider-exported usage JSONL. The exact provider command is intentionally not supplied — it is provider-specific and must not be guessed here.

For each trial, the report JSON records:

- `commits.baseline` / `commits.candidate` — the two full git hashes, which must differ;
- `trialId` (`baseline-1`…`candidate-3`), `fresh: true`, `evidence.transcript`, `evidence.usage`, the recomputed `usage` totals, and one assessment entry per name in `protocol.json` carrying a `verdict` and an `evidence` pointer.

Validate the report:

    node tests/evals/skill-slimming/validate.mjs <report.json>

Exit 0 requires both commits present and distinct; all six trials with a transcript and a usage file; every trial carrying a verdict and an evidence pointer for each of the five assessments; the recorded token totals recomputing from the raw usage lines; no candidate trial regressing an assessment against baseline; and the candidate median total tokens below the baseline median. The validator prints both medians and both spreads, so the reader sees the noise beside the comparison.

## Turning a session into usage lines

`extract-usage.mjs` reads a session JSONL and prints the probe's usage lines, folding the provider's prompt-side cache tokens into `inputTokens` so each line's total matches the session's own accounting:

```sh
node tests/evals/skill-slimming/extract-usage.mjs <session.jsonl> <trialId> > evidence/<trialId>.usage.jsonl
```

`skill-probe.test.ts` rebuilds every recorded total from the committed transcripts this way, so a drifted transcript or a mistyped total fails the suite instead of resting on an unreproducible number.

## Reading the result

The word count and the token count are two separate facts. A smaller corpus that costs more tokens per session is a finding to report, not to hide — a terse skill that makes an agent loop costs more than it saved.

## Recorded runs

`runs/2026-10-14/` holds the topic's one recorded probe: six authorized sessions, their transcripts, the recomputed usage lines, and the validator's verdict. Its `README.md` states the conditions, the model actually used, and the result — including that the word cut produced no measurable token saving.

Fixtures under `fixtures/` exercise the validator's accept and reject paths. They are not behavioral evidence and must never be presented as a recorded run. If no authorized runs happen, record that limitation and leave the probe unrecorded; a fabricated report is never acceptable evidence.
