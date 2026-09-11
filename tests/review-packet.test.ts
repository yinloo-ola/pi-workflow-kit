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
const FEATURE_BASE_DEF = 'FEATURE_BASE="$(git rev-parse $(grep -m1 -o';

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
    expect(executing).toContain(FEATURE_BASE_DEF);
    expect(executing).toContain("git diff $FEATURE_BASE...HEAD");
    expect(executing).not.toMatch(/<merge-base>/);
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

  it("should derive the packet base from the Commit column (spec-reviewer R8 gap)", () => {
    // Build a real repo: three commits, a progress file recording them, then run
    // the skill's own FEATURE_BASE extraction verbatim and assert the span rule.
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-base-"));
    const git = (cmd) => execSync(cmd, { cwd: dir }).toString().trim();
    git("git init -q -b main && git config user.email t@t && git config user.name t");
    const sha = [];
    git("git commit -qm seed --allow-empty");
    for (const [name, body] of [
      ["a", "alpha"],
      ["b", "beta"],
      ["c", "gamma"],
    ]) {
      writeFileSync(join(dir, `${name}.txt`), body);
      git(`git add ${name}.txt && git commit -qm ${name}`);
      sha.push(git("git rev-parse HEAD"));
    }
    const progress = [
      "# Progress: demo",
      "",
      "## Requirements",
      "| # | Done | Requirement | Per-req ceremony | Commit |",
      "|---|---|-------------|-----------------|--------|",
      `| 1 | ✅ | alpha | — | ${sha[0]} |`,
      `| 2 | ✅ | beta | — | ${sha[1]} |`,
      `| 3 | ✅ | gamma | — | ${sha[2]} |`,
      "",
    ].join("\n");
    writeFileSync(join(dir, "progress.md"), progress);
    // The FEATURE_BASE one-liner exactly as the skill recipe defines it.
    const first = git(
      `grep -m1 -o '^| [0-9]* | [^|]* | [^|]* | [^|]* | [0-9a-f]\\{7,\\}' progress.md | grep -o '[0-9a-f]\\{7,\\}' | head -1`,
    );
    expect(first).toBe(sha[0]);
    const base = git(`git rev-parse ${first}^`);
    expect(base).toBe(git(`git rev-parse HEAD~3`));
    // R3's packet spans the previous requirement's last commit (exclusive) to
    // this one's last commit (inclusive).
    const r3span = git(`git log --format=%s ${sha[1]}..${sha[2]}`);
    expect(r3span).toBe("c");
    const r2span = git(`git log --format=%s ${sha[0]}..${sha[1]}`);
    expect(r2span).toBe("b");
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
