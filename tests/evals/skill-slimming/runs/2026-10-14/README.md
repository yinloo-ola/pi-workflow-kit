# Probe run — 2026-10-14

The recorded R5 result: six authorized agent sessions, three per condition, on one fixture task (`../../fixture-task.md`). This is the topic's observed cost claim; the deterministic size claim lives in `skill-lint` and the feature E2E.

## Conditions

| Condition | Kit | Revision | `pwk-executing-tasks/SKILL.md` |
|---|---|---|---|
| baseline | npm 2.9.0 | `dfe0dd0455fd952756eb7a9d231f88ff96a496b4` | 3,937 words |
| candidate | slimmed | `c3df7fc73bcf4242fbffbaeda45964fac0869ef2` | 2,884 words |

Each condition ran in its own isolated HOME whose settings named only that condition's kit as a local package — no other packages, no competing skill sources. Every transcript's skill paths cite its own worktree, which is the provenance check.

**Model:** every session started on `zai/glm-5.3` and switched to `olaparty/deepseek-flash` within seconds. The switch is identical in all six trials, so the comparison is like-for-like; the effective model was `olaparty/deepseek-flash`.

## Result

| Condition | Trials | Median | Spread |
|---|---|---|---|
| baseline | 1,888,883 · 2,155,572 · 1,995,148 | 1,995,148 | 266,689 (13%) |
| candidate | 2,393,815 · 1,839,757 · 2,021,740 | 2,021,740 | 554,058 (27%) |

- **Fidelity: held.** All five assessments passed in all six trials — 15/15 in each condition, no regression.
- **Cost: no detectable saving.** The candidate median is 26,592 tokens higher (+1.3%), against spreads of 13% and 27%. A difference this small is not resolvable at three trials per condition.

Why the word cut could not move the number: about **95% of each trial's tokens are context re-read** (`cacheRead`) rather than fresh input, so a session costs roughly *turns x context*. The whole skill corpus is ~20k tokens of a context that reaches 72k–96k (~22%). A 16.3% word cut removes ~3.3k tokens — a ~3.7% effect on the session total, well under the noise floor. The lever for cost is turns and context volume, not prose length.

## Files

| File | What it is |
|---|---|
| `report.json` | the recorded report: commits, six trials, recomputed usage, five verdicts with evidence pointers |
| `validator-output.txt` | the validator's verdict on this report (exit 0) |
| `evidence/<trial>.transcript.jsonl` | the session transcript, one per trial |
| `evidence/<trial>.usage.jsonl` | the usage lines the report's totals are recomputed from |

## Transcript integrity

| File | sha256 (prefix) |
|---|---|
| `baseline-1.transcript.jsonl` | `65059c75e687cc9a…` |
| `baseline-2.transcript.jsonl` | `2fcc1a262168f055…` |
| `baseline-3.transcript.jsonl` | `1f6869ec4f907636…` |
| `candidate-1.transcript.jsonl` | `33cbbda66bc10bec…` |
| `candidate-2.transcript.jsonl` | `61da5ac63e3a1fc7…` |
| `candidate-3.transcript.jsonl` | `9608bf4e280d8dfa…` |

The transcripts contain no credentials (scanned for key and token patterns) and no user memory: each session loaded only the kit under test.

## Validate

```sh
node tests/evals/skill-slimming/validate.mjs tests/evals/skill-slimming/runs/2026-10-14/report.json
```

Exit 0 means structure and numbers hold. The cost **direction** is a finding the validator prints, never a reason to reject the report (ADR 0009).
