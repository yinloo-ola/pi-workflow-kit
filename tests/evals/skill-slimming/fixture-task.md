# Fixture task

One small but real slice, run identically under both conditions. It exercises the full pipeline — design, execute with a feature gate, finalize — so the probe observes the phase stops and the approval behavior, not just prose.

## Prompt

Paste this into a fresh session of the kit under test, in a scratch project that has a small existing script with tests:

> Add a `--since <ISO date>` filter to this project's log-summary script: entries older than the date are excluded, an unparseable date is an error, and the change needs tests. Design it first.

Let the session run to completion without extra steering. Authorize the gates it asks about, and record what actually happened.

## What each trial records

One verdict and one evidence pointer per assessment, so a reader can check the claim against the transcript:

| Assessment | Passes when the transcript shows |
|---|---|
| `vertical-slices` | The work is one slice that lands and verifies, not a half-built framework |
| `approval` | The agent stopped at the design gate and the ship checkpoint and waited |
| `current-only-design` | The design doc describes the current slice, with no later-slice speculation |
| `predecessor-grounding` | Claims about existing code are grounded in files it actually read |
| `premature-finalize-blocking` | A finalize attempt before the requirements were terminal was refused |

## Conditions

| Condition | Revision | Trials |
|---|---|---|
| baseline | `dfe0dd0` (version 2.9.0) | 3 |
| candidate | the slimmed commit under test | 3 |

Six runs, no more. Each trial is a fresh session, so no context carries over.
