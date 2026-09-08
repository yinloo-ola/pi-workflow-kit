import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SINGLE_DOC_MARKERS } from "./markers.mjs";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("single-doc: merged design doc (R1)", () => {
  const bs = read("skills/pwk-brainstorming/SKILL.md");

  it("should instruct ### R<n> requirement blocks with criteria and tags in one design doc", () => {
    expect(bs).toContain(SINGLE_DOC_MARKERS.rBlock);
    expect(bs).toContain(SINGLE_DOC_MARKERS.criteriaInBlock);
    expect(bs).toContain("### Checkpoints");
    expect(bs).toContain("### Review");
    expect(bs).toContain(SINGLE_DOC_MARKERS.autoTagTruth);
    // auto-tag rule: non-empty risk notes trigger parallel; editable by the human
    expect(bs).toMatch(/non-empty[^\n]*Production-risk notes|Production-risk notes[^\n]*non-empty/i);
    expect(bs).toMatch(/override or downgrade/i);
    // spec+skip incompatibility travels with the tags
    expect(bs).toMatch(/`spec` requires at least `inline`/);
  });

  it("should never emit a crosswalk or per-requirement test-name list", () => {
    expect(bs).toContain(SINGLE_DOC_MARKERS.noTestNameLists);
    expect(bs).not.toMatch(/crosswalk/i);
    expect(bs).not.toMatch(/### Integration tests/);
    expect(bs).not.toMatch(/\| R# \| Plan section \| Tests \|/);
  });

  it("should audit every requirement has criteria and tags exactly once", () => {
    expect(bs).toContain(SINGLE_DOC_MARKERS.auditExactlyOnce);
    expect(bs).toMatch(/both tags/);
  });

  it("should hand off to executing-tasks (no plan phase in between)", () => {
    expect(bs).not.toMatch(/pwk-writing-plans/);
    expect(bs).toMatch(/pwk-executing-tasks/);
  });
});

describe("single-doc: decisions-first At a glance (R2)", () => {
  it("should open At a glance summary → decisions → table", () => {
    const bs = read("skills/pwk-brainstorming/SKILL.md");
    expect(bs).toContain(SINGLE_DOC_MARKERS.keyDecisions);
    expect(bs).toContain(SINGLE_DOC_MARKERS.neverManufactured);
    const glanceIdx = bs.indexOf("## At a glance");
    const decisionsIdx = bs.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
    const tableIdx = bs.indexOf("| R# | Requirement in one line | Risk |");
    expect(glanceIdx).toBeGreaterThan(-1);
    expect(decisionsIdx).toBeGreaterThan(glanceIdx);
    expect(tableIdx).toBeGreaterThan(decisionsIdx);
    expect(bs).toContain("(rejected:");
  });

  it("should mirror decisions-first digest across README and user docs", () => {
    for (const rel of [
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "docs/oversight-model.md",
      "README.md",
    ]) {
      expect(read(rel), rel).toMatch(/Key decisions/i);
    }
  });
});
