import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const docs = [
  read("README.md"),
  read("docs/developer-usage-guide.md"),
  read("docs/workflow-phases.md"),
  read("docs/oversight-model.md"),
];
const portableSkills = [
  read("skills/pwk-brainstorming/SKILL.md"),
  read("skills/pwk-executing-tasks/SKILL.md"),
  read("skills/pwk-code-review/SKILL.md"),
];

describe("cross-host delegation guidance", () => {
  it("documents Claude Code permissions and native read-only delegation", () => {
    expect(docs.join("\n")).toMatch(/Claude Code/i);
    expect(docs.join("\n")).toMatch(/permissions|hooks/i);
    expect(docs.join("\n")).toMatch(/native.*(?:task|subagent)|read-only.*(?:task|subagent)/i);
  });

  it("documents Tintinweb setup and role mapping without requiring a provider package", () => {
    const content = docs.join("\n");
    expect(content).toContain("@tintinweb/pi-subagents");
    expect(content).toContain("/pwk-setup");
    expect(content).toContain(".agents/agents/");
    expect(content).toMatch(/Explore/);
    expect(content).toMatch(/no running subagents need to be pre-created/i);
    expect(content).toMatch(/does not install|optional|no.*provider.*required/i);
  });

  it("documents unsupported providers and inline fallback", () => {
    const content = docs.join("\n");
    expect(content).toMatch(/other Pi extensions|arbitrary.*extensions|unsupported/i);
    expect(content).toMatch(/compatible.*capabilit|separate.*adapter/i);
    expect(content).toMatch(/perform(?:s)? recon and review inline|performs the missing recon or review work inline/i);
    expect(content).toMatch(/not.*universal|not.*automatically compatible/i);
  });

  it("keeps provider invocation examples out of portable skills", () => {
    for (const skill of portableSkills) {
      expect(skill).not.toMatch(/"tasks"\s*:/);
      expect(skill).not.toMatch(/\b(?:subagent|Agent|Task|SubagentWorkflow)\s*\(/);
    }
  });
});
