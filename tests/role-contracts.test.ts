import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roleNames = [
  "pwk-recon-scout",
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
];

function readRole(name: string): { frontmatter: string; body: string } {
  const content = readFileSync(`agents/${name}.md`, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

describe("provider-neutral role contracts", () => {
  it("defines stable identities and read-only reporter boundaries", () => {
    for (const name of roleNames) {
      const { frontmatter, body } = readRole(name);
      expect(frontmatter).toMatch(new RegExp(`^name: ${name}$`, "m"));
      expect(frontmatter).toMatch(/^description: .+$/m);
      expect(frontmatter).toMatch(/^tools: read, grep, find, ls, bash$/m);
      expect(body).toMatch(/read-only/i);
      expect(body).toMatch(/report/i);
      expect(body).not.toMatch(/\b(?:write|edit) files/i);
    }
  });

  it("defines the recon report contract without provider-specific instructions", () => {
    const { body } = readRole("pwk-recon-scout");
    const sections = ["Relevant files", "Existing patterns", "Call sites", "Test layout", "Gotchas"];
    let previous = -1;

    for (const section of sections) {
      const index = body.indexOf(`### ${section}`);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }

    expect(body).toMatch(/file:line/i);
    expect(body).toMatch(/observations only/i);
    expect(body).toMatch(/no design recommendations/i);
    expect(body).not.toMatch(/\b(?:subagent|Agent|Task|SubagentWorkflow)\s*\(/);
  });

  it("defines evidence and explicit no-findings behavior for every review role", () => {
    for (const name of roleNames.slice(1)) {
      const { body } = readRole(name);
      expect(body).toMatch(/acceptance criteri|changed code|changed files|each changed file/i);
      expect(body).toMatch(/evidence|file:line|code and the test/i);
      expect(body).toMatch(/severity|disposition|\[safe\]|findings only/i);
      expect(body).toMatch(/no findings|none found|no issues/i);
      expect(body).not.toMatch(/\b(?:subagent|Agent|Task|SubagentWorkflow)\s*\(/);
    }
  });
});
