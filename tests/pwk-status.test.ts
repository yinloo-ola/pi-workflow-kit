import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CODE_DIGEST_MARKERS, STATUS_STATE_MARKERS } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

// The four skills that discover in-flight planning artifacts.
const DISCOVERY_SITES = [
  "skills/pwk-status/SKILL.md",
  "skills/pwk-brainstorming/SKILL.md",
  "skills/pwk-executing-tasks/SKILL.md",
  "skills/pwk-finalizing/SKILL.md",
];

describe("pwk-status phase-driven state (feature E2E)", () => {
  it("infers per-topic state from the Feature phase line — every executor phase value maps to a displayed state", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toContain(STATUS_STATE_MARKERS.phaseLine);
    expect(status).toMatch(/`e2e-written`[^→]*→[^→]{0,60}`feature-spec`/);
    expect(status).toMatch(/`feature-spec-paused`[^→]*→[^→]{0,60}`feature-spec`/);
    expect(status).toMatch(/`implementing \(k\/N\)`[^→]*→[^→]{0,60}`execute k\/N`/);
    expect(status).toMatch(/`reviewing`[^→]*→[^→]{0,60}`review`/);
    expect(status).toMatch(/legacy `feature-complete-paused`[^→]*→[^→]{0,60}`review`/);
    expect(status).toMatch(/`ship-paused`[^→]*→[^→]{0,60}`ship-paused`/);
  });

  it("has a done terminal state — a finished part is never shown as in-flight", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toMatch(/`done`[^→]*→[^→]{0,80}`done`/);
    expect(status).toMatch(/terminal/i);
    expect(status).toMatch(/`N\/N`/);
  });

  it("covers the artifact-less states — design-only, roster-only, and the unparseable fallback", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toMatch(/only `[^`]*-design\.md`[^.]{0,120}`design`/);
    expect(status).toMatch(/roster-only[^.]{0,120}`not started`/);
    expect(status).toMatch(/[Nn]o parseable `Feature phase`[^.]{0,120}`execute`/);
  });

  it("rolls the umbrella up with done counts and hints finalize when every part is done", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toContain(STATUS_STATE_MARKERS.rollUp);
    expect(status).toMatch(/every part [^.\n]*`done`[\s\S]{0,160}\/skill:pwk-finalizing/);
  });

  it("pins the find discovery recipe with the completed/ exclusion in all four discovery sites", () => {
    for (const site of DISCOVERY_SITES) {
      const content = readRepo(site);
      expect(content, site).toContain(STATUS_STATE_MARKERS.findRecipe);
      expect(content, site).toContain(CODE_DIGEST_MARKERS.completedExclusion);
    }
    const status = readRepo("skills/pwk-status/SKILL.md");
    for (const suffix of ["*-design.md", "*-implementation.md", "*-progress.md", "overview.md"]) {
      expect(status, suffix).toContain(`\`${suffix}\``);
    }
  });

  it("verifies the repo root (step 0) and stops on mismatch — never cd — in all four discovery sites", () => {
    for (const site of DISCOVERY_SITES) {
      const content = readRepo(site);
      expect(content, site).toContain(STATUS_STATE_MARKERS.rootCheck);
      expect(content, site).toContain(STATUS_STATE_MARKERS.stopNoCd);
    }
  });

  it("extracts state without ingesting progress files — header-only reads and grep tallies", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toContain(STATUS_STATE_MARKERS.headerRead);
    expect(status).toContain(STATUS_STATE_MARKERS.tallyGrep);
    expect(status).toMatch(/only the header/);
    expect(status).toMatch(/carries nothing status needs/);
  });

  it("stays read-only orientation and does not unlock the guard", () => {
    const status = readRepo("skills/pwk-status/SKILL.md");
    expect(status).toMatch(/does not unlock/i);
    expect(status).toMatch(/[Rr]ead-only/);
  });
});
