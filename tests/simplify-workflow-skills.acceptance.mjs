import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// Explicit, evidence-backed gate: do not run paid agent inference inside npm test.
// This checks recorded real runs, not that the skills contain expected keywords.
// Semantic assessments must cite the transcripts and artifacts they assessed.
test("the installed workflow preserves vertical-slice behavior and reduces measured context", async () => {
  const reportPath = process.env.PWK_EVAL_REPORT;
  assert.ok(
    reportPath,
    "Set PWK_EVAL_REPORT to the completed baseline/candidate evaluation report; real runs are required.",
  );
  assert.ok(existsSync(reportPath), `Missing evaluation report: ${reportPath}`);
  const { validateReport } = await import("./evals/simplify-workflow-skills/report.mjs");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const errors = validateReport(report, resolve(reportPath));
  assert.deepEqual(errors, [], "Real-agent acceptance evidence must satisfy the fixed evaluation protocol.");
});
