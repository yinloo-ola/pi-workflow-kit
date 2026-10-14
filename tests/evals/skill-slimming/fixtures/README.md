# Fixtures

These files exercise the validator's accept and reject paths in `tests/skill-probe.test.ts` and the skill-slimming feature E2E. `report-complete.json` must validate; `report-missing-assessment.json` must be rejected naming the dropped assessment.

They are not behavioral evidence: the token numbers are hand-set to give the validator something to recompute, and no agent session produced them. The recorded probe report for the topic must come from the six authorized runs described in `../README.md` — never from these fixtures.
