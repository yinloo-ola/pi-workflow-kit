import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("docs consistency: human review digests", () => {
  it("mirrors the at-a-glance design opening across user docs", () => {
    for (const rel of [
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "docs/oversight-model.md",
      "README.md",
    ]) {
      const doc = read(rel);
      expect(doc, rel).toMatch(/## At a glance/);
      expect(doc, rel).toMatch(/\| R# \|/);
    }
  });
});

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
      expect(doc, rel).toMatch(/fast[- ]model|--fast-model/i);
    }
  });

  it("describes the ship gate consistently across user docs", () => {
    for (const rel of [
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "docs/oversight-model.md",
      "README.md",
    ]) {
      const doc = read(rel);
      expect(doc, rel).toMatch(/ship checkpoint|ship gate/i);
      expect(doc, rel).toMatch(/diff on request/i);
      expect(doc, rel).not.toMatch(/you review the whole diff/i);
    }
  });

  it("sweeps user docs for the digest flow with no stale defaults", () => {
    const rels = [
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "docs/oversight-model.md",
      "README.md",
      "AGENTS.md",
    ];
    for (const rel of rels) {
      const doc = read(rel);
      expect(doc, rel).not.toMatch(/review the whole diff/i);
      expect(doc, rel).not.toMatch(/read the (?:full|whole) plan/i);
    }
    expect(read("AGENTS.md")).toMatch(/docs\/plans\/<date>-<topic>\//);
  });

  it("keeps the one-folder-per-topic layout consistent in workflow-phases", () => {
    const doc = read("docs/workflow-phases.md");
    expect(doc).toContain("docs/plans/<date>-<topic>/");
    expect(doc).not.toMatch(/YYYY-MM-DD-<topic>-design\.md/);
    expect(doc).not.toMatch(/<date>-<umbrella>\//);
    expect(doc).not.toMatch(/\*-overview\.md/);
  });

  it("disposes review packets with the topic folder in both finalize disposal paths", () => {
    const finalize = read("skills/pwk-finalizing/SKILL.md");
    // the packet rides the folder disposal (delete + archive), never a separate glob
    expect(finalize).toContain("-review-packet*.md");
    expect(finalize).toMatch(/rm -rf docs\/plans\/<date>-<topic>\//);
    expect(finalize).toMatch(/mv docs\/plans\/<date>-<topic>\/ docs\/plans\/completed\//);
    // the retired flat per-file globs must not reappear
    expect(finalize).not.toMatch(/rm -f |mv docs\/plans\/\?\?\?\?-\?\?-\?\?-/);
  });
});
