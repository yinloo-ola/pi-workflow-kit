import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("docs consistency: review packet and resource hints", () => {
  it("fixes oversight-model scope wording to the packet model", () => {
    const oversight = read("docs/oversight-model.md");
    expect(oversight).toMatch(/review packet/i);
    expect(oversight).toMatch(/scope (?:is )?defined per review level|packet defines the scope/i);
  });

  it("mentions the packet and tier hints consistently across docs", () => {
    for (const rel of ["docs/workflow-phases.md", "docs/developer-usage-guide.md", "README.md"]) {
      const doc = read(rel);
      expect(doc, rel).toMatch(/review packet/i);
    }
    const guide = read("docs/developer-usage-guide.md");
    expect(guide).toMatch(/fast-model|--fast-model/i);
  });

  it("disposes review packets in both finalize disposal paths", () => {
    const finalize = read("skills/pwk-finalizing/SKILL.md");
    const occurrences = finalize.match(/\?\?\?\?-\?\?-\?\?-<topic>-review-packet\.md/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    // one in the delete block, one in the archive block
    expect(finalize).toMatch(/rm -f[\s\S]*review-packet\.md/);
    expect(finalize).toMatch(/mv [\s\S]*review-packet\.md[\s\S]*completed/);
  });
});
