# ADR 0012: Guards fail closed and carry no bypass

Date: 2026-10-15
Status: accepted

## Context

The failures the deterministic-steps topic set out to fix were slips, not judgement calls. Three of six probe sessions hand-edited a progress table and hit an edit mismatch or a malformed write. Six of six shipped an untracked test file that the reviewed diff could not see. The capability check that reported `Scout: unavailable` was accurate in those sessions, but it was reached without a check, so the same wording would have reported wrongly in a session that did have a delegation tool.

## Decision

The workflow's deterministic guards fail closed. Each one refuses with a named diagnostic and offers no bypass flag:

- the progress helper validates the whole table before writing, then writes atomically, so a refusal leaves the file byte-identical;
- the staging check fails when it cannot verify a root, rather than passing quietly;
- the packet helper refuses invalid UTF-8 rather than building evidence from damaged bytes;
- the anchor check and the recon check fail by name, never by skipping the site.

The escape hatch is the human's `git`, which is visible in the transcript, rather than a flag the agent can reach for.

## Why

**A guard exists because a step was repeatedly skipped.** A bypass converts the policy into a default: the same agent that skipped the step can skip the guard in one more way, and the log line is the only trace.

**Warn-and-continue ships the slip.** The staging check exists because an untracked file is invisible to a commit-range diff. A warning leaves it invisible and adds noise.

**A naming refusal is cheap to fix.** Every refusal names the file, path, or value at fault, so the remedy is one step — commit the file, correct the table, or supply the runtime.

**Failing closed is testable.** The tests pin the refusals: a byte-identical file after a bad write, the offending path in the message, an unverifiable root rejected.

## Rejected alternatives

- **Warn and continue.** The slip ships, and the warning trains the reader to ignore the gate.
- **A `--force` flag.** The slip ships with a log line that nobody reads.
- **Trust the agent to re-read the rule.** That trust is the failure the guard replaces.

## Consequences

- A legitimate run can be blocked by a stale artifact. The remedy is to commit it or remove it, and the diagnostic names it.
- The guards are narrower than a human reviewer: they check structure and cleanliness, never whether the content is good.
- Removing a guard now needs a recorded decision, because the skill text, the lint checks, and the tests all state the behavior.
