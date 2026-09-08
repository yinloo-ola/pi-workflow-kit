import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/** The recipe commands exactly as they must appear in the executing skill. */
const CRITERIA_CMD = "sed -n '/^### R1/,/^## Feature acceptance/p'";
const LEGACY_CRITERIA_CMD = "sed -n '/^## Requirement 1/,/^## Feature acceptance/p'";
const FA_CMD = "sed -n '/^## Feature acceptance/,/^### Feature review/p'";
const NOTES_CMD = "sed -nE '/^### Production-risk notes/,/^(## |### R[0-9])/p'";
const NOTES_STRIP = "sed -E '/^(## |### R[0-9])/d'";

/** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
const DESIGN_FIXTURE = [
  "# demo",
  "",
  "## At a glance",
  "",
  "summary text",
  "",
  "| R# | Requirement in one line | Risk |",
  "|----|--------------------------|------|",
  "| 1 | alpha | low |",
  "| 2 | beta | med |",
  "",
  "## Requirements",
  "",
  "### R1: alpha",
  "alpha does one thing",
  "",
  "**Acceptance criteria** — Given/When/Then criteria:",
  "- Given a, When b, Then c.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "### Production-risk notes",
  "- alpha: touches auth session storage",
  "- alpha: rotation window must stay under 30s",
  "",
  "### R2: beta",
  "beta does another thing",
  "",
  "**Acceptance criteria** — Given/When/Then criteria:",
  "- Given d, When e, Then f.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "### Production-risk notes",
  "- touches redis: hot path under login storms",
  "- TTL policy must match session rotation",
  "- key cardinality grows with active users",
  "- monitor INCR miss rate in dashboards",
  "",
  "## Production-risk areas",
  "",
  "- redis TTL policy is load-bearing for session rotation",
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
    expect(executing).toContain(LEGACY_CRITERIA_CMD);
    expect(executing).toContain(FA_CMD);
    expect(executing).toContain(NOTES_CMD);
    expect(executing).toContain("git diff <merge-base>...HEAD");
    expect(executing).toMatch(/never appears in spawn arguments/i);
    expect(executing).toContain("verbatim from the design doc");
  });

  it("should extract criteria verbatim from a design-template fixture", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
    writeFileSync(join(dir, "design.md"), DESIGN_FIXTURE);

    const criteria = execSync(`${CRITERIA_CMD} design.md | sed '/^## Feature acceptance/,$d'`, {
      cwd: dir,
    }).toString();
    expect(criteria).toContain("### R1: alpha");
    expect(criteria).toContain("- Given a, When b, Then c.");
    expect(criteria).toContain("### R2: beta");
    expect(criteria).toContain("- Given d, When e, Then f.");
    expect(criteria).toContain("### Production-risk notes");
    expect(criteria).toContain("hot path under login storms");
    expect(criteria).toContain("monitor INCR miss rate"); // >3 lines: range capture, not grep -A3 truncation
    expect(criteria).toContain("## Production-risk areas"); // design-level risk section rides the span into the packet
    expect(criteria).toContain("redis TTL policy is load-bearing");
    expect(criteria).not.toContain("## Feature acceptance");
    expect(criteria).not.toContain("Feature review: parallel");
    expect(criteria).not.toContain("## At a glance");

    const notes = execSync(`${NOTES_CMD} design.md | ${NOTES_STRIP}`, { cwd: dir }).toString();
    expect(notes).toContain("### Production-risk notes");
    expect(notes).toContain("alpha: touches auth session storage"); // first group captured
    expect(notes).toContain("TTL policy must match session rotation"); // second group captured
    expect(notes).toContain("monitor INCR miss rate");
    expect(notes).not.toContain("## Feature acceptance");
    expect(notes).not.toContain("### R2: beta"); // the ### R terminator stops each group: no R2 duplication
    expect(notes).not.toContain("- Given d, When e, Then f.");

    const featureAcceptance = execSync(`${FA_CMD} design.md | sed '/^### Feature review/,$d'`, {
      cwd: dir,
    }).toString();
    expect(featureAcceptance).toContain("## Feature acceptance");
    expect(featureAcceptance).toContain("`should demo` — Given x, When y, Then z.");
    expect(featureAcceptance).not.toContain("Feature review: parallel");
  });

  it("should extract criteria verbatim from a legacy plan fixture (in-flight 1.x flow)", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-legacy-"));
    const legacyFixture = [
      "# Implementation Plan: demo",
      "",
      "## Overview",
      "Design: docs/plans/demo-design.md",
      "",
      "## Requirement 1: alpha",
      "",
      "### Acceptance criteria",
      "- Given a, When b, Then c.",
      "",
      "### Production-risk notes",
      "- touches redis: hot path",
      "",
      "## Requirement 2: beta",
      "",
      "### Acceptance criteria",
      "- Given d, When e, Then f.",
      "",
      "## Feature acceptance",
      "",
      "- `should demo` — Given x, When y, Then z.",
      "",
      "### Feature review: parallel",
      "",
    ].join("\n");
    writeFileSync(join(dir, "plan.md"), legacyFixture);

    const criteria = execSync(`${LEGACY_CRITERIA_CMD} plan.md | sed '/^## Feature acceptance/,$d'`, {
      cwd: dir,
    }).toString();
    expect(criteria).toContain("## Requirement 1: alpha");
    expect(criteria).toContain("- Given a, When b, Then c.");
    expect(criteria).toContain("## Requirement 2: beta");
    expect(criteria).not.toContain("## Feature acceptance");

    const notes = execSync(`${NOTES_CMD} plan.md | ${NOTES_STRIP}`, { cwd: dir }).toString();
    expect(notes).toContain("touches redis: hot path");
    expect(notes).not.toContain("## Requirement 2: beta");
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
