import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/** The recipe commands exactly as they must appear in the executing skill. */
const CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
const FA_CMD = "sed -n '/^## Feature acceptance/,/^### Feature review/p'";

/** A plan doc shaped like the template pwk-writing-plans emits. */
const PLAN_FIXTURE = [
  "# Implementation Plan: demo",
  "",
  "## Overview",
  "Design: docs/plans/demo-design.md",
  "",
  "## Setup",
  "",
  "n/a",
  "",
  "## Requirement 1: alpha",
  "",
  "### Acceptance criteria",
  "- Given a, When b, Then c.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "## Requirement 2: beta",
  "",
  "### Acceptance criteria",
  "- Given d, When e, Then f.",
  "",
  "### Production-risk notes",
  "- touches redis",
  "",
  "## Feature acceptance",
  "",
  "- `should demo` — Given x, When y, Then z.",
  "",
  "### Feature review: parallel",
  "",
].join("\n");

function readExecuting(): string {
  return readFileSync(join(repoRoot, "skills/pwk-executing-tasks/SKILL.md"), "utf8");
}

describe("review packet recipe", () => {
  it("should define the packet recipe in the executing skill", () => {
    const executing = readExecuting();
    expect((executing.match(/review-packet\.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(executing).toContain("no packet byte passes through model output");
    expect(executing).toContain(CRITERIA_CMD);
    expect(executing).toContain(FA_CMD);
    expect(executing).toContain("git diff <merge-base>...HEAD");
    expect(executing).toMatch(/never appears in spawn arguments/i);
  });

  it("should extract criteria verbatim from a plan-template fixture", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);

    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
      cwd: dir,
    }).toString();
    expect(criteria).toContain("## Requirement 1: alpha");
    expect(criteria).toContain("- Given a, When b, Then c.");
    expect(criteria).toContain("## Requirement 2: beta");
    expect(criteria).toContain("- Given d, When e, Then f.");
    expect(criteria).toContain("### Production-risk notes");
    expect(criteria).not.toContain("## Feature acceptance");
    expect(criteria).not.toContain("Feature review: parallel");

    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
      cwd: dir,
    }).toString();
    expect(featureAcceptance).toContain("## Feature acceptance");
    expect(featureAcceptance).toContain("`should demo` — Given x, When y, Then z.");
    expect(featureAcceptance).not.toContain("Feature review: parallel");
  });

  it("should scope per-requirement reviews to the requirement", () => {
    const executing = readExecuting();
    expect(executing).toMatch(/per-requirement[\s\S]{0,600}review-packet\.md|review-packet\.md[\s\S]{0,600}per-requirement/i);
  });
});
