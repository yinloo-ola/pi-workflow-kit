import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/**
 * Per-requirement acceptance criteria for leaner-execution-gates.
 *
 * The feature E2E (`lean-gates.e2e.test.ts`) encodes the design's `## Feature acceptance`
 * scenarios. This suite covers the criteria the spec review flagged as having code but no
 * covering test — one `describe` per requirement, one assertion per uncovered criterion.
 */
describe("lean gates R1: untagged requirements get no per-requirement review", () => {
  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
  const executing = read("skills/pwk-executing-tasks/SKILL.md");

  it("should state the effective default is skip, so one-of-several untagged requirements fires nothing", () => {
    expect(brainstorming).toContain("Missing tags default to `none` / `skip`");
    expect(brainstorming).toContain("written `### Review` value stays `skip`");
  });

  it("should gate a per-requirement review on the tag alone — skip means none", () => {
    expect(executing).toMatch(/`### Review` tag is `parallel` or `inline` \(default `skip`\)/);
    expect(executing).toContain("With `skip`, no per-requirement review");
  });

  it("should keep the removed auto-tag rule out of the consumer docs too", () => {
    for (const rel of ["docs/workflow-phases.md", "docs/developer-usage-guide.md"]) {
      const doc = read(rel);
      for (const line of doc.split("\n")) {
        const pairsAutoTag = /auto-tag/i.test(line) && /Production-risk notes/.test(line);
        expect(pairsAutoTag, `${rel}: ${line.trim()}`).toBe(false);
      }
      expect(doc, rel).not.toMatch(/one source of truth for the auto-tag rule/);
    }
  });
});

describe("lean gates R2: feature-review resolution edges", () => {
  const executing = read("skills/pwk-executing-tasks/SKILL.md");

  it("should resolve a missing tag to auto rather than to no review", () => {
    expect(executing).toMatch(/`auto` \(the default, and what a missing tag means\)/);
  });

  it("should run exactly once per part — not once per requirement", () => {
    expect(executing).toContain("exactly one per part, never once per requirement");
    expect(executing).toContain("always present, never per requirement");
  });
});

describe("lean gates R3: notice edges", () => {
  const executing = read("skills/pwk-executing-tasks/SKILL.md");

  it("should route a resumed e2e-written phase into implementation, not into a pause", () => {
    expect(executing).toMatch(/`e2e-written` → write the E2E if not yet present, post the notice, and continue/);
    expect(executing).toContain("continue into the implement phase (no stop)");
  });

  it("should keep both reserved failure stops — ungreenable and wrong-but-passing", () => {
    expect(executing).toMatch(/passes immediately, probe why/);
    expect(executing).toMatch(/stop and present only when you are genuinely blocked/);
    expect(executing).toMatch(/stop and present\*\* rather than implementing against a wrong spec/);
  });
});

describe("lean gates R4: checkpoint defaults and migration", () => {
  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
  const executing = read("skills/pwk-executing-tasks/SKILL.md");
  const changelog = read("CHANGELOG.md");

  it("should keep the default none and the surviving full value firing both stops", () => {
    expect(brainstorming).toContain("Missing tags default to `none` / `skip`");
    expect(executing).toContain("stop and present after the tests and again after the slice is complete");
    expect(executing).toMatch(/with the default `none`/i);
  });

  it("should carry the legacy spec → none mapping in the release migration note", () => {
    const section = changelog.slice(changelog.indexOf("## [2.2.0]"), changelog.indexOf("## [2.1.2]"));
    expect(section).toMatch(/### Migration/);
    expect(section).toContain("retired `spec` checkpoint value resolve to `none`");
  });
});
