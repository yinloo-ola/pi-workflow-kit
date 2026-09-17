### R4 blocker (recorded)
- Evaluation-protocol worker failed mid-task on OpenRouter rate limiting (subagent 548173871648462d). Protocol files (protocol.json, prepare.mjs, usage.mjs, report.mjs, README, example-report.json, blockers.json, fixtures) live in its isolated worktree only; tests/evals/ never replicated to the parent tree.
- Before R4 can run: recover those files (re-run worker scoped to finish + git add -N), then obtain human authorization for real baseline/candidate agent runs with a configured provider.
- Acceptance gate tests/simplify-workflow-skills.acceptance.mjs stays red until a real report exists. No manufactured evidence is acceptable.
