import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRole } from "./helpers";
import { DIGEST_MARKERS } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const REVIEW_ROLES = [
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
] as const;

const USER_DOCS = [
  "docs/workflow-phases.md",
  "docs/developer-usage-guide.md",
  "docs/oversight-model.md",
  "README.md",
] as const;

const GLOB_SITES = [
  "skills/pwk-brainstorming/SKILL.md",
  "skills/pwk-executing-tasks/SKILL.md",
  "skills/pwk-status/SKILL.md",
  "skills/pwk-finalizing/SKILL.md",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("human review digests feature (E2E)", () => {
  it("should thread R# digests from design to coverage table", () => {
    // R1 — design docs open with an at-a-glance digest: plain summary + one row per
    // requirement; the trivial fast-path gets a single In-short line instead.
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    expect(brainstorming).toMatch(new RegExp(DIGEST_MARKERS.atAGlance));
    expect(brainstorming).toMatch(/immediately before [`]## Requirements[`]/);
    expect(brainstorming).toContain(DIGEST_MARKERS.atAGlanceTable);
    expect(brainstorming).toContain("In short:");
    expect(brainstorming).toMatch(/plain language/i);

    // R2 — the crosswalk and its plan phase are gone entirely (pwk 2.0): the
    // design doc's ### R<n> blocks are the map; no skill restates one.
    expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);
    for (const site of [
      "skills/pwk-brainstorming/SKILL.md",
      "skills/pwk-executing-tasks/SKILL.md",
      "skills/pwk-status/SKILL.md",
      "skills/pwk-finalizing/SKILL.md",
      "skills/pwk-code-review/SKILL.md",
      "skills/pwk-diagnose/SKILL.md",
    ]) {
      expect(readRepo(site), site).not.toMatch(/crosswalk/i);
    }

    // R3 — the progress file carries an execution summary filled as requirements
    // land, and the ship checkpoint presents digest + coverage, diff on request.
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    expect(executing).toContain(DIGEST_MARKERS.execSummary);
    expect(executing).toContain(DIGEST_MARKERS.execSummaryTable);
    expect(executing).toContain(DIGEST_MARKERS.fillAsYouLand);
    expect(executing).toContain(DIGEST_MARKERS.shipPaused);
    expect(executing).toContain(DIGEST_MARKERS.diffOnRequest);
    const enumLine = executing.match(/`Feature phase` is one of:[^\n]*/)?.[0];
    if (!enumLine) throw new Error("executing skill: `Feature phase` enum line not found");
    expect(enumLine).toContain(DIGEST_MARKERS.shipPaused);
    expect(enumLine).not.toContain("feature-complete-paused");

    // R4 — the spec-reviewer report opens with a per-requirement coverage table,
    // keyed by the packet's requirement headings, while the four reviewers keep a
    // byte-identical shared conduct block (same strict check as role-contracts).
    const specReviewer = readRole("pwk-spec-reviewer").body;
    expect(specReviewer).toContain(DIGEST_MARKERS.coverageTable);
    expect(specReviewer).toContain(DIGEST_MARKERS.coverageVerdicts);
    expect(specReviewer).toMatch(/## Requirement N/);
    expect(specReviewer).toMatch(/No findings/);
    const HEADING = "## Your checklist";
    const blocks = REVIEW_ROLES.map((name) => {
      const body = readRole(name).body;
      const end = body.indexOf(HEADING);
      expect(end, name).toBeGreaterThan(0);
      return body.slice(0, end + HEADING.length);
    });
    expect(blocks[0]).toBe(blocks[1]);
    expect(blocks[0]).toBe(blocks[2]);
    expect(blocks[0]).toBe(blocks[3]);
    for (const [i, name] of REVIEW_ROLES.entries()) {
      expect(readRole(name).body.length, name).toBeGreaterThan(blocks[i].length);
    }

    // R5 — every discovery site resolves docs one level down (umbrella folders).
    for (const site of GLOB_SITES) {
      expect(readRepo(site), site).toContain(DIGEST_MARKERS.recursiveGlob);
    }
  });

  it("should gate shipping on done and keep the docs consistent", () => {
    // R6 — finalizing ships only Feature phase `done`; digest sections ride the
    // existing disposal globs and umbrella folders dispose as one unit.
    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
    expect(finalize).toMatch(/Feature phase/);
    expect(finalize).toContain(DIGEST_MARKERS.mustBeDone);
    expect(finalize).toMatch(/feature-complete-paused/);
    expect(finalize).toContain(DIGEST_MARKERS.umbrellaFolder);

    // The user-facing docs describe the new flow and none of them defaults the
    // human to reading the full plan or the whole diff.
    for (const doc of USER_DOCS) {
      expect(readRepo(doc), doc).toMatch(/At a glance/i);
      expect(readRepo(doc), doc).toMatch(/ship gate|ship checkpoint/i);
    }
    const readme = readRepo("README.md");
    expect(readme).toContain(DIGEST_MARKERS.diffOnRequest);
    expect(readme).not.toMatch(/crosswalk/i);
    const agents = readRepo("AGENTS.md");
    expect(agents).toContain(DIGEST_MARKERS.umbrellaFolder);
  });
});
