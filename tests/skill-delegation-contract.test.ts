import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brainstorming = readFileSync("skills/pwk-brainstorming/SKILL.md", "utf8");
const executing = readFileSync("skills/pwk-executing-tasks/SKILL.md", "utf8");
const relatedSkills = [
  brainstorming,
  executing,
  readFileSync("skills/pwk-code-review/SKILL.md", "utf8"),
  readFileSync("skills/pwk-writing-plans/SKILL.md", "utf8"),
];

describe("portable skill delegation contract", () => {
  it("requests logical recon capability with safety constraints and fallback", () => {
    expect(brainstorming).toContain("codebase-recon");
    expect(brainstorming).toContain("pwk-recon-scout");
    expect(brainstorming).toMatch(/fresh.?context/i);
    expect(brainstorming).toMatch(/read.?only/i);
    expect(brainstorming).toMatch(/bounded|time.?box/i);
    expect(brainstorming).toContain("Scout: unavailable");
    expect(brainstorming).toMatch(/inline/i);
  });

  it("requests four logical review roles and preserves partial-result handling", () => {
    for (const role of ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"]) {
      expect(executing).toContain(role);
    }
    expect(executing).toMatch(/independent/i);
    expect(executing).toMatch(/concurr|parallel/i);
    expect(executing).toMatch(/result|report/i);
    expect(executing).toMatch(/failed|timed.?out|missing/i);
    expect(executing).toMatch(/inline/i);
  });

  it("does not prescribe a concrete provider invocation in portable skills", () => {
    for (const skill of relatedSkills) {
      expect(skill).not.toMatch(/"tasks"\s*:/);
      expect(skill).not.toMatch(/\b(?:subagent|Agent|Task|SubagentWorkflow)\s*\(/);
    }
  });

  it("preserves the feature gate and phase transition contracts", () => {
    expect(executing).toContain("feature-spec");
    expect(executing).toContain("feature-complete");
    expect(executing).toContain("primary enforced spec");
    expect(executing).toMatch(/per-requirement checkpoints(?: and reviews|\/reviews)? are \*\*opt-in\*\*/i);
  });
});
