import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
import { DIGEST_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("pwk 2.0 single-doc feature (E2E)", () => {
  it("should thread pwk 2.0 end-to-end: one buildable design doc → executing → learning sweep → on-demand walkthrough", () => {
    // R1 — the design doc is the single buildable artifact: ### R<n> blocks carry
    // behavior + criteria + tags in one place; the plan phase's second doc is gone.
    const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.rBlock);
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.criteriaInBlock);
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.noTestNameLists);
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.auditExactlyOnce);
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.autoTagTruth);
    expect(brainstorming).not.toContain("Crosswalk");
    expect(existsSync(join(repoRoot, "skills/pwk-writing-plans"))).toBe(false);

    // R2 — decisions-first At a glance: summary, then key decisions (honest-empty),
    // then the R#/risk table.
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.keyDecisions);
    expect(brainstorming).toContain(SINGLE_DOC_MARKERS.neverManufactured);
    const decisionsIdx = brainstorming.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
    const tableIdx = brainstorming.indexOf(DIGEST_MARKERS.atAGlanceTable);
    expect(decisionsIdx).toBeGreaterThan(-1);
    expect(tableIdx).toBeGreaterThan(decisionsIdx);

    // R3 — the guard maps only brainstorming to a phase; executing parses the
    // blocks, creates the branch, routes legacy docs, and the packet seds the
    // design doc; the flow is design → execute → finalize.
    const guard = read("extensions/workflow-guard.ts");
    expect(guard).not.toMatch(/pwk-writing-plans/);
    expect(guard).toMatch(/"brainstorm" \| null/);
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    expect(executing).toContain(SINGLE_DOC_MARKERS.preFlightBranch);
    expect(executing).toContain(SINGLE_DOC_MARKERS.parseRBlocks);
    expect(executing).toContain(SINGLE_DOC_MARKERS.legacyStem);
    expect(executing).toContain(SINGLE_DOC_MARKERS.bothSuffixes);
    expect(executing).toContain(SINGLE_DOC_MARKERS.packetDesignSpan);
    expect(read("skills/pwk-status/SKILL.md")).toContain(SINGLE_DOC_MARKERS.bothSuffixes);
    expect(existsSync(join(repoRoot, "docs/adr/0004-one-buildable-design-doc.md"))).toBe(true);
    const adr = readFileSync(join(repoRoot, "docs/adr/0004-one-buildable-design-doc.md"), "utf8");
    expect(adr).toContain("plan phase merged into brainstorm");
    expect(adr).toContain("learning sweep");
    // 2.0.0 ships with the migration note the ADR promises
    const changelog = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain("## [2.0.0]");
    expect(changelog).toMatch(/migration/i);

    // R4 — finalize sweeps learning (decisions + Approaches considered + deviations
    // + alerts) before disposal, asking rather than fabricating when material is thin.
    const finalize = read("skills/pwk-finalizing/SKILL.md");
    expect(finalize).toContain(SINGLE_DOC_MARKERS.learningSweep);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.beforeDisposal);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.sweepApproaches);
    expect(finalize).toContain(SINGLE_DOC_MARKERS.askNotFabricate);
    const sweepIdx = finalize.indexOf(SINGLE_DOC_MARKERS.learningSweep);
    const disposalIdx = finalize.indexOf("Dispose of consumed plan docs");
    expect(disposalIdx).toBeGreaterThan(-1);
    expect(sweepIdx).toBeGreaterThan(-1);
    expect(sweepIdx).toBeLessThan(disposalIdx);
    expect(executing).toContain(SINGLE_DOC_MARKERS.deviationRecord);

    // R5 — pwk-walkthrough: on demand, SHA-stamped, file:line-anchored, regenerated
    // wholesale, never disposed, unlocked so it can run in any phase.
    const walkthroughPath = join(repoRoot, "skills/pwk-walkthrough/SKILL.md");
    expect(existsSync(walkthroughPath)).toBe(true);
    const walkthrough = readFileSync(walkthroughPath, "utf8");
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.walkthroughTemplate);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.fileLineAnchors);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.shaStamp);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.regenWholesale);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.neverDisposed);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.onDemand);
    expect(walkthrough).toContain(SINGLE_DOC_MARKERS.walkthroughDir);
    expect(UNLOCK_SKILLS).toContain("pwk-walkthrough");
    expect(finalize).not.toMatch(/walkthroughs/);
  });
});
