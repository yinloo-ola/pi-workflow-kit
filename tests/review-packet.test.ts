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
const NOTES_CMD = "sed -n '/^### Production-risk notes/,/^## /p'";

/** A plan doc shaped like the template pwk-writing-plans emits. */
const PLAN_FIXTURE = [
  "# Implementation Plan: demo",
  "",
  "## Overview",
  "Design: docs/plans/demo-design.md",
  "",
  "## Crosswalk",
  "",
  "| R# | Plan section | Tests |",
  "|----|--------------|-------|",
  "| 1 | Requirement 1: alpha | should-a |",
  "| 2 | Requirement 2: beta | should-b |",
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
  "### Production-risk notes",
  "- alpha: touches auth session storage",
  "- alpha: rotation window must stay under 30s",
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
  "- touches redis: hot path under login storms",
  "- TTL policy must match session rotation",
  "- key cardinality grows with active users",
  "- monitor INCR miss rate in dashboards",
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
    expect(executing).toContain(NOTES_CMD);
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
    expect(criteria).toContain("hot path under login storms");
    expect(criteria).toContain("monitor INCR miss rate"); // >3 lines: range capture, not grep -A3 truncation
    expect(criteria).not.toContain("## Feature acceptance");
    expect(criteria).not.toContain("Feature review: parallel");

    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
    expect(notes).toContain("### Production-risk notes");
    expect(notes).toContain("alpha: touches auth session storage"); // first group captured
    expect(notes).toContain("TTL policy must match session rotation"); // second group captured
    expect(notes).toContain("monitor INCR miss rate");
    expect(notes).not.toContain("## Feature acceptance");

    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
      cwd: dir,
    }).toString();
    expect(featureAcceptance).toContain("## Feature acceptance");
    expect(featureAcceptance).toContain("`should demo` — Given x, When y, Then z.");
    expect(featureAcceptance).not.toContain("Feature review: parallel");
  });

  it("should keep packet spans intact with a crosswalk present", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-xw-"));
    writeFileSync(join(dir, "plan.md"), PLAN_FIXTURE);

    // The three sed commands are byte-identical to the pre-crosswalk recipe (see above);
    // the crosswalk sits before `## Requirement 1`, so no span may reach it.
    const criteria = execSync(`${CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
      cwd: dir,
    }).toString();
    expect(criteria).toContain("## Requirement 1: alpha");
    expect(criteria).not.toContain("## Crosswalk");
    expect(criteria).not.toContain("| 1 | Requirement 1: alpha | should-a |");
    const notes = execSync(`${NOTES_CMD} plan.md | sed '/^## /d'`, { cwd: dir }).toString();
    expect(notes).not.toContain("Crosswalk");
    const featureAcceptance = execSync(`${FA_CMD} plan.md | sed '/^### Feature review/,$d'`, {
      cwd: dir,
    }).toString();
    expect(featureAcceptance).not.toContain("Crosswalk");

    // And the skill must place the crosswalk strictly before Requirement 1 with the
    // sed-span rationale, and present the plan as a one-line confirmation.
    const writing = readFileSync(join(repoRoot, "skills/pwk-writing-plans/SKILL.md"), "utf8");
    expect(writing).toContain("## Crosswalk");
    expect(writing).toContain("strictly before `## Requirement 1`");
    expect(writing).toContain("| R# | Plan section | Tests |");
    expect(writing).toContain("one-line confirmation");
  });

  it("should scope per-requirement reviews to the requirement", () => {
    const executing = readExecuting();
    expect(executing).toMatch(
      /per-requirement[\s\S]{0,600}review-packet\.md|review-packet\.md[\s\S]{0,600}per-requirement/i,
    );
    // requirement-suffixed stem: per-requirement packets must not overwrite the feature packet
    expect(executing).toMatch(/review-packet-r<N>\.md/);
  });
});
