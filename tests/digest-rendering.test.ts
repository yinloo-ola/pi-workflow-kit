import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIGEST_RENDERING_MARKERS, bareContentLines } from "./markers.mjs";

// Feature acceptance (digest-rendering design doc):
// 1. A digest written per the updated progress-format.md renders as labeled bullet
//    groups in any CommonMark preview — never a merged run-on paragraph.
// 2. The ship-time sample progress doc renders the real up_adventure flow as
//    distinct labeled bullets.

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("feature acceptance: digest rendering", () => {
  it("digest Flow template renders as labeled bullets in any CommonMark preview", () => {
    const progressFormat = readFileSync(
      join(repoRoot, "skills/pwk-executing-tasks/references/progress-format.md"),
      "utf8",
    );
    const templateStart = progressFormat.indexOf("# Progress:");
    expect(templateStart, "progress template not found").toBeGreaterThan(-1);
    const template = progressFormat.slice(templateStart, progressFormat.indexOf("```", templateStart));
    const flowAt = template.indexOf("### Flow");
    expect(flowAt, "Flow heading missing from template").toBeGreaterThan(-1);
    const flow = template.slice(flowAt, template.indexOf("### Gotchas", flowAt));

    // Spine / Branches / Side effects appear as labeled bullets …
    expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletSpine);
    expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletBranches);
    expect(flow).toContain(DIGEST_RENDERING_MARKERS.flowBulletSideEffects);
    // … and every content line is a list item, so no renderer merges them.
    expect(bareContentLines(flow), "non-list content lines in the Flow template").toEqual([]);
  });

  it("sample progress doc renders the up_adventure flow as distinct bullets", () => {
    const samplePath = join(repoRoot, "docs/plans/2026-09-18-digest-rendering/sample-progress.md");
    if (!existsSync(samplePath)) {
      throw new Error("sample-progress.md not written yet (R5 ship-time artifact)");
    }
    const sample = readFileSync(samplePath, "utf8");
    const flowAt = sample.indexOf("### Flow");
    expect(flowAt, "sample Flow heading missing").toBeGreaterThan(-1);
    const flow = sample.slice(flowAt, sample.indexOf("### Gotchas", flowAt));

    for (const symbol of [
      "CrossedMilestoneTiers",
      "claimAndSend",
      "UnlockOrExtendPrivilegeGift",
      "notifyMilestoneTier",
    ]) {
      expect(flow).toContain(symbol);
    }
    expect(flow).toMatch(/was:/);
    expect(flow).toMatch(/reads:/);
    expect(flow).toMatch(/writes:/);
    expect(bareContentLines(flow), "non-list content lines in the sample Flow").toEqual([]);
  });
});
