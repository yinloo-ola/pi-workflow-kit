# R4 evaluation harness

This directory contains a reproducible, read-only evaluation harness for the
workflow skill change. It does not invoke Pi, a provider, or a model. A human
must authorize each run and provide provider configuration outside this
repository.

The fixed matrix is baseline/candidate × large/control, with three fresh
ordinary trials per cell and one lifecycle trial per cell (16 runs total).
`prepare.mjs` records the two explicit commits and the protocol hash.
`usage.mjs` parses provider-exported JSONL and recomputes totals. `report.mjs`
rejects missing or out-of-directory evidence, stale hashes, ungrounded
assessments, instrumentation gaps, and reports without ordinary-path savings.

## Safe manual workflow

Run these commands from a disposable, workspace-local session directory. They
do not contain credentials and do not install or configure a provider:

```sh
mkdir -p .pwk-eval/session .pwk-eval/config
PWK_EVAL_BASELINE_COMMIT=<baseline-git-commit> \
PWK_EVAL_CANDIDATE_COMMIT=<candidate-git-commit> \
node tests/evals/simplify-workflow-skills/prepare.mjs .pwk-eval/session
```

Before every provider invocation, explicitly authorize the provider, model,
network access, and any spend. Then run the locally installed Pi command in a
fresh workspace/session, exporting its transcript and usage JSONL into
`.pwk-eval/session/`. The exact provider command is intentionally not supplied:
it is provider-specific and must not be guessed by this harness. Do not put
tokens, API keys, or provider config in this repository.

After all runs, write a report using the schema exercised by
`workflow-evaluation.test.ts`, then validate it:

```sh
PWK_EVAL_REPORT="$PWD/.pwk-eval/session/report.json" \
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {validateReport} from './tests/evals/simplify-workflow-skills/report.mjs'; const p=process.env.PWK_EVAL_REPORT; const e=validateReport(JSON.parse(readFileSync(p)),p); if(e.length){console.error(e.join('\\n'));process.exit(1)}"
```

If no model runs happen, record only the tooling limitation in
`blockers.json`; do not turn fixtures or an example report into behavioral
evidence.
