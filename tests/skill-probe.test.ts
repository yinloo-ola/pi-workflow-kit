import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the fidelity/cost probe (skill-slimming-2 R5).
 *
 * The feature E2E exercises the validator CLI's accept/reject on the two fixtures.
 * These cover the criteria it does not: the usage recomputation naming both values,
 * the median/spread reporting the reader needs beside the comparison, and the two
 * structural refusals (a regressed assessment, identical conditions).
 */
const kitDir = resolve(process.cwd(), "tests/evals/skill-slimming");
const { validateReport } = await import(`${kitDir}/validate.mjs`);

const COMPLETE = join(kitDir, "fixtures", "report-complete.json");

/** A throwaway copy of the complete fixture, so a test can damage exactly one field. */
function copyFixture(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cpSync(join(kitDir, "fixtures"), dir, { recursive: true });
  return { dir, report: join(dir, "report-complete.json") };
}

function loadFixture(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("skill probe validator", () => {
  it("accepts the complete six-trial report and reports both medians and spreads", () => {
    const { errors, stats } = validateReport(loadFixture(COMPLETE), COMPLETE);
    expect(errors).toEqual([]);
    expect(stats.baseline.median).toBe(120);
    expect(stats.candidate.median).toBe(90);
    expect(stats.baseline.spread).toBe(40);
    expect(stats.candidate.spread).toBe(20);
  });

  it("rejects a recorded total that disagrees with the raw usage lines, naming both values", () => {
    const { dir, report } = copyFixture("pwk-probe-usage-");
    try {
      const data = loadFixture(report);
      data.trials[0].usage.totalTokens = 999;
      writeFileSync(report, JSON.stringify(data));
      const { errors } = validateReport(loadFixture(report), report);
      const text = errors.join("\n");
      expect(text, "names the recorded value").toContain("999");
      expect(text, "names the recomputed value").toContain(String(100));
      expect(text, "names the trial").toContain("baseline-1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts a report whose candidate costs more, reporting the direction as a finding", () => {
    const { dir, report } = copyFixture("pwk-probe-costlier-");
    try {
      const data = loadFixture(report);
      // Raise the candidate's spend above the baseline's, updating raw lines and the
      // recorded totals together so the recomputation still agrees.
      for (const [id, total] of [
        ["candidate-1", 250],
        ["candidate-2", 300],
        ["candidate-3", 350],
      ] as const) {
        const trial = data.trials.find((t: { trialId: string }) => t.trialId === id);
        trial.usage = { inputTokens: total, outputTokens: 0, totalTokens: total };
        writeFileSync(
          join(dir, "evidence", `${id}.usage.jsonl`),
          `${JSON.stringify({ trialId: id, inputTokens: total, outputTokens: 0, totalTokens: total })}\n`,
        );
      }
      writeFileSync(report, JSON.stringify(data));
      const { errors, stats } = validateReport(loadFixture(report), report);
      expect(errors, "a costlier candidate is a finding, not a fault").toEqual([]);
      expect(stats.direction).toBe("higher-or-equal");
      expect(stats.candidate.median).toBe(300);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a candidate trial that regresses an assessment the baseline passed", () => {
    const { dir, report } = copyFixture("pwk-probe-regress-");
    try {
      const data = loadFixture(report);
      const trial = data.trials.find((t: { trialId: string }) => t.trialId === "candidate-2");
      trial.assessments.find((a: { name: string }) => a.name === "premature-finalize-blocking").verdict = "fail";
      writeFileSync(report, JSON.stringify(data));
      const { errors } = validateReport(loadFixture(report), report);
      const text = errors.join("\n");
      expect(text).toContain("candidate-2");
      expect(text).toContain("premature-finalize-blocking");
      expect(text.toLowerCase()).toContain("regress");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a report whose two conditions are the same commit", () => {
    const { dir, report } = copyFixture("pwk-probe-same-");
    try {
      const data = loadFixture(report);
      data.commits.candidate = data.commits.baseline;
      writeFileSync(report, JSON.stringify(data));
      const { errors } = validateReport(loadFixture(report), report);
      expect(errors.join("\n").toLowerCase()).toContain("differ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
