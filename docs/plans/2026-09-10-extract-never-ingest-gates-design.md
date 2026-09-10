# Design: extract-never-ingest for finalize gate + executing resume

In short: apply the extract-never-ingest contract (shipped for `pwk-status` in 2.1.0, recorded in `docs/lessons.md`) to the last two sites that still instruct full progress-file reads — `pwk-finalizing` pre-check 2 and the `pwk-executing-tasks` resume — so gate and resume costs scale with topic count instead of history size. Scope is progress files only: the design doc stays a full read everywhere, because it is the executor's input rather than history — its criteria, feature-acceptance spec, and narrative are all decision-relevant, it does not grow during execution, and cross-requirement references ("mirrors R4's pattern") make partial reads unsafe in a fresh session. `(rejected: extracting the design doc too — it confuses the executor's input with other consumers' history and risks context-loss on cross-referencing requirements)`

## Requirements

### R1: Extract-never-ingest for the last two progress-file reads

`pwk-finalizing` pre-check 2 and the `pwk-executing-tasks` resume take what they need from progress files' header and tables instead of reading the bodies, stated in positive terms. Example commands are one way to meet each invariant; any harness-native equivalent (ripgrep, Select-String, Grep tools) is equally compliant — the invariant is the contract, the command is the fallback.

**Acceptance criteria** —
- Given a done umbrella whose progress files carry review reports and code digests, When the finalizing pre-check evaluates its gates, Then it takes `Feature phase:` by matching the line itself — e.g. `grep -m1 '^Feature phase:'` or the harness's line-search tool (found wherever the template puts it — no line estimate) — and the ❌/⏭ verdicts by reading only the matching rows (e.g. `grep '❌'` / `grep '⏭'` — rows with reasons, not content windows) — the sections after the tables (deviation-records, review reports, code digest) carry nothing the gate needs.
- Given a mid-flight resume (`implementing (k/N)`), When the executor restores context from the progress file, Then it reads the phase line (same line-match), the Requirements table, and the Execution summary rows (how prior parts were built) — read from the top through the end of `## Execution summary`, stopping before the optional sections (deviation-records, feature-level review, code digest): anchor-terminated, so it reads however many lines the tables need. Routing keys on the Done **cell**, not an icon search: the first row whose Done cell is not `✅` is the next requirement (`⬜`, `🔄`, and blank all mean not-done), with every row present from progress-file creation and the phase line's `(k/N)` as a sanity cross-check. Deviation-records, review reports, and the code digest are finalize/learning-sweep material.
- Given either site, Then the `must be \`done\`` gate line survives untouched and the wording keeps the `excluding docs/plans/completed/` phrase within its lint anchor window (anchors re-verified in `tests/skill-lint.mjs` and `tests/code-digest.test.ts`; E2E assertions extended in `tests/pwk-status.test.ts`).
- Given the design doc on a fresh run or resume, Then it is still read in full — the extraction contract applies to progress files only.
- Given `pwk-status`'s own extraction wording, Then it aligns with the same pattern — match the `Feature phase:` line directly (e.g. `grep -m1 '^Feature phase:'`; the 10-line estimate retired) as one example among equals, and the `done` tally counts **Requirements-table rows** (e.g. `grep -c '^| [0-9]' <file>`) instead of ✅ icons: at `done` every row is complete by the ship-gate invariant, so `N/N` is the row count on both sides and no icon presence is assumed.

### Checkpoints: none
### Review: skip

## Feature acceptance

- Given a done umbrella (fixture or greasy-monkey shape: progress files 10KB+ with digests and review sections), When the finalizing pre-check and a mid-flight resume each run per the reworded skills, Then both produce identical gate/routing decisions as before while reading only headers and tables — proven by the extended contract assertions in the suite.

### Feature review: inline
