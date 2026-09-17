import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const evalDir = resolve(process.cwd(), "tests/evals/simplify-workflow-skills");
const reportModule = await import(`${evalDir}/report.mjs`);

describe("R4 evaluation protocol", () => {
  it("defines the fixed 4-cell, three-trial matrix and lifecycle coverage", () => {
    const protocol = JSON.parse(readFileSync(resolve(evalDir, "protocol.json"), "utf8"));
    expect(protocol.conditions).toHaveLength(4);
    expect(protocol.ordinaryTrialsPerCondition).toBe(3);
    expect(protocol.assessments).toEqual([
      "vertical-slices",
      "approval",
      "current-only-design",
      "predecessor-grounding",
      "premature-finalize-blocking",
    ]);
  });

  it("rejects the example report rather than treating it as evidence", () => {
    const path = resolve(evalDir, "example-report.json");
    const report = JSON.parse(readFileSync(path, "utf8"));
    const errors = reportModule.validateReport(report, path);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("missing ordinary trial");
  });
});
