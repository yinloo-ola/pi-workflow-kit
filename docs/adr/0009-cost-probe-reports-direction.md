# ADR 0009: The cost probe reports direction — it does not require it

Date: 2026-10-14
Status: accepted

## Context

R5 of the skill-slimming topic ran the fidelity/cost probe: six authorized agent sessions, the baseline kit (`dfe0dd0`, 2.9.0) and the slimmed kit, three trials each on one fixture task. Behavior held — all five assessments passed in all six trials, no regression. Cost did not: the candidate median was 2,021,740 tokens against the baseline's 1,995,148, a rise of 26,592 (+1.3%), with within-condition spreads of 266,689 (13%) and 554,058 (27%).

The design's R5 criterion required "the candidate median total tokens are below the baseline median". The validator therefore rejected a report that was complete, honest, and fully recomputable — because the hypothesis it measured did not hold.

## Decision

A probe report validates on **structure and verifiable numbers only**: both commits present and distinct, six trials each with a transcript and a usage file, every trial carrying a verdict and an evidence pointer for each of the five assessments, token totals recomputed from the raw usage lines, and no candidate trial regressing an assessment against baseline.

The **direction** of the cost comparison is a finding the validator prints (with the delta), never a validity property. A candidate median above the baseline median validates and is reported as a negative result.

## Why

A validator that encodes the hoped-for direction turns a measurement into a verdict on the hypothesis. It then rewards re-running until the numbers look right, which is the one thing an evidence harness must never do.

The measurement also explains why the original expectation was never testable at this sample size. About 95% of every trial's tokens are context re-read on each turn, so a session's cost is approximately turns x context. The whole skill corpus is roughly 20k tokens of a context that reaches 72k-96k, about 22%. The 16.3% word cut therefore removes ~3.3k tokens, a ~3.7% effect on the session total, against a 13-27% noise band. Three trials cannot resolve it in either direction.

## Rejected alternatives

- **Keep the criterion and mark R5 failed.** It would report "the slimming made sessions costlier" from a +1.3% difference whose spread is ten times larger — an unsupported claim, and the opposite error from the one the criterion was written to prevent.
- **Add trials until the direction flips.** Choosing the sample size after seeing the result converts the probe into a search for a favourable number. If more trials are ever run, they get their own pre-declared protocol and their result is reported whatever it says.
- **Drop the cost claim entirely.** The size claim (words) and the cost claim (tokens) stay two separate reported facts, which is what the design already promised; the second one is now measured and reported without a required sign.

## Consequences

- The probe's value becomes the finding it produces, not a threshold it clears: the word cut bought no measurable token saving, and behavior fidelity is unaffected.
- Any future probe keeps the structural checks; only the direction is informational.
- The gap between "smaller corpus" and "cheaper sessions" is now documented: the lever for cost is turns and context volume, not prose length.
