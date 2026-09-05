import { describe, expect, it } from "vitest";
import { ROLE_NAMES, readRole } from "./helpers";

const roleNames = [...ROLE_NAMES];

describe("packet discipline", () => {
  const REVIEWERS = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];

  it("should include packet discipline and early-wrap disclosure in every conduct block", () => {
    for (const name of REVIEWERS) {
      const { body } = readRole(name);
      const block = body.slice(0, body.indexOf("## Your checklist"));
      expect(block, name).toMatch(/work from the packet/i);
      expect(block, name).toMatch(/targeted reads? of the files it lists/i);
      expect(block, name).toMatch(/verify a specific suspected finding[\s\S]*?cite what sent you there/i);
      expect(block, name).toMatch(/do not re-derive scope|no re-running git log/i);
      expect(block, name).toMatch(/what was not covered/i);
    }
  });
});

describe("shared conduct block", () => {
  const REVIEWERS = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];
  const HEADING = "## Your checklist";

  it("should open all four reviewer bodies with a byte-identical conduct block", () => {
    const blocks = REVIEWERS.map((name) => {
      const { body } = readRole(name);
      const end = body.indexOf(HEADING);
      expect(end, name).toBeGreaterThan(0);
      return body.slice(0, end + HEADING.length);
    });
    expect(blocks[0]).toBe(blocks[1]);
    expect(blocks[0]).toBe(blocks[2]);
    expect(blocks[0]).toBe(blocks[3]);
  });

  it("should place each role checklist after the conduct block", () => {
    for (const name of REVIEWERS) {
      const { body } = readRole(name);
      const tail = body.slice(body.indexOf(HEADING) + HEADING.length);
      expect(tail.trim().length, name).toBeGreaterThan(40);
      expect(body.indexOf(HEADING), name).toBeGreaterThan(body.indexOf("## Reporting contract"));
    }
  });
});

describe("spec-reviewer coverage table", () => {
  it("should mandate a per-requirement coverage table in the spec-reviewer checklist", () => {
    const { body } = readRole("pwk-spec-reviewer");
    const checklist = body.slice(body.indexOf("## Your checklist"));
    expect(checklist).toMatch(/\| R# \| Verdict \| Evidence \|/);
    expect(checklist).toMatch(/covered \| gap \| scope-creep/);
    expect(checklist).toMatch(/## Requirement N/);
    expect(checklist).toMatch(/No findings/);
    // The coverage mandate is role-specific: the other three checklists stay untouched.
    for (const name of ["pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"]) {
      const other = readRole(name).body.slice(readRole(name).body.indexOf("## Your checklist"));
      expect(other, name).not.toMatch(/\| R# \| Verdict \| Evidence \|/);
    }
  });
});

describe("role resource hints", () => {
  it("should ship max_turns 40 on judgment roles", () => {
    for (const name of ["pwk-spec-reviewer", "pwk-tracing-reviewer"]) {
      const { frontmatter } = readRole(name);
      expect(frontmatter, name).toMatch(/^max_turns: 40$/m);
      expect(frontmatter, name).not.toMatch(/^model: \S/m);
      expect(frontmatter, name).not.toMatch(/^thinking:/m);
    }
  });

  it("should ship fast-tier hints on checklist roles", () => {
    for (const name of ["pwk-smell-reviewer", "pwk-hazard-reviewer"]) {
      const { frontmatter } = readRole(name);
      expect(frontmatter, name).toMatch(/^thinking: low$/m);
      expect(frontmatter, name).toMatch(/^max_turns: 20$/m);
      expect(frontmatter, name).toMatch(/^# model: /m);
      expect(frontmatter, name).not.toMatch(/^model: \S/m);
    }
  });

  it("should not hardcode a model name in shipped roles", () => {
    for (const name of roleNames) {
      const { frontmatter } = readRole(name);
      expect(frontmatter, name).not.toMatch(/^model: \S/m);
    }
  });
});

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
