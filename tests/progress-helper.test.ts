import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the progress helper (deterministic-steps R1).
 *
 * The feature E2E covers the happy path through the helper. These cover the criteria it
 * does not: what the helper refuses, and that a refusal leaves the file byte-identical.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/progress.mjs");

const TEMPLATE = `# Progress: sample

Design: docs/plans/2026-10-14-sample/sample-design.md

Branch: sample

Setup: n/a

Started: 2026-10-14T00:00:00Z

Last updated: 2026-10-14T00:00:00Z

Feature phase: e2e-written

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ⬜ | First thing | — | — |
| 2 | ⬜ | Second thing | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | First thing | | | |

## Deviation records

## Code digest
`;

function workspace(prefix: string, body = TEMPLATE) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const file = join(dir, "sample-progress.md");
  writeFileSync(file, body);
  return { dir, file };
}

const runHelper = (file: string, args: string[], cwd?: string) =>
  spawnSync("node", [HELPER, ...args, "--file", file], { cwd, encoding: "utf8" });

describe("progress helper", () => {
  it("refuses a malformed table and leaves the file byte-identical", () => {
    const { dir, file } = workspace(
      "pwk-progress-bad-",
      TEMPLATE.replace("| 2 | ⬜ | Second thing | — | — |", "| 2 | ⬜ | Second thing |"),
    );
    try {
      const before = readFileSync(file, "utf8");
      const result = runHelper(file, ["set-row", "--requirement", "2", "--done", "✅"]);
      expect(result.status, "a malformed table is a named failure").not.toBe(0);
      expect(`${result.stdout}${result.stderr}`, "the failure names the file").toContain("sample-progress.md");
      expect(readFileSync(file, "utf8"), "a refusal writes nothing").toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a requirement row that does not exist", () => {
    const { dir, file } = workspace("pwk-progress-missing-");
    try {
      const result = runHelper(file, ["set-row", "--requirement", "9", "--done", "✅"]);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toMatch(/row|requirement/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("appends a commit id after the ones already recorded", () => {
    const { dir, file } = workspace(
      "pwk-progress-commits-",
      TEMPLATE.replace("| 1 | ⬜ | First thing | — | — |", "| 1 | 🔄 | First thing | — | a1b2c3 |"),
    );
    try {
      const result = runHelper(file, ["set-row", "--requirement", "1", "--done", "✅", "--commit", "d4e5f6"]);
      expect(result.status).toBe(0);
      expect(readFileSync(file, "utf8")).toContain("| 1 | ✅ | First thing | — | a1b2c3 d4e5f6 |");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses an unknown done glyph", () => {
    const { dir, file } = workspace("pwk-progress-glyph-");
    try {
      const before = readFileSync(file, "utf8");
      const result = runHelper(file, ["set-row", "--requirement", "1", "--done", "DONE"]);
      expect(result.status).not.toBe(0);
      expect(readFileSync(file, "utf8")).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes the setup slot", () => {
    const { dir, file } = workspace("pwk-progress-setup-");
    try {
      const result = runHelper(file, ["set-setup", "--value", "done"]);
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      expect(readFileSync(file, "utf8")).toContain("Setup: done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite an execution summary already written", () => {
    const { dir, file } = workspace(
      "pwk-progress-summary-",
      TEMPLATE.replace("| 1 | First thing | | | |", "| 1 | First thing | it was built | — | probe ran |"),
    );
    try {
      const before = readFileSync(file, "utf8");
      const result = runHelper(file, ["append-summary", "--requirement", "1", "--built", "again"]);
      expect(result.status, "a second summary for one requirement is refused").not.toBe(0);
      expect(readFileSync(file, "utf8")).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
