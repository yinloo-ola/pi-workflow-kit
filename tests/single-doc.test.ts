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

describe("single-doc: finalize learning sweep (R4)", () => {
  const finalize = read("skills/pwk-finalizing/SKILL.md");

  it("should sweep learning before disposal", () => {
    expect(finalize).toContain(SINGLE_DOC_MARKERS.learningSweep);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.beforeDisposal);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.sweepApproaches);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.askNotFabricate);
    const sweepIdx = finalize.indexOf(SINGLE_DOC_MARKERS.learningSweep);
    const disposalIdx = finalize.indexOf("Dispose of consumed plan docs");
    expect(sweepIdx).toBeGreaterThan(-1);
    expect(disposalIdx).toBeGreaterThan(-1);
    expect(sweepIdx).toBeLessThan(disposalIdx);
    // ADR offers via the three gates; honest-empty when nothing qualifies
    expect(finalize).toMatch(/hard to reverse/);
    expect(finalize).toMatch(/honest-empty|honest empty/i);
  });

  it("should record architectural deviations at deviation time", () => {
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    expect(executing).toContain(SINGLE_DOC_MARKERS.deviationRecord);
    expect(executing).toMatch(/what changed, why, what was rejected/);
  });
});
