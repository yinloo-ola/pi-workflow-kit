import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skill = join(root, "skills/pwk-brainstorming");
const script = join(skill, "scripts/validate-design.py");
const criterion = "- Given an input, When it is processed, Then the result is returned.";
const requirement = (id = 1, tags = "") => `### R${id}: Observable outcome
A caller receives a result.

**Acceptance criteria**
${criterion}

${tags}`;
const feature = `## Feature acceptance\n\n${criterion}\n`;
const design = (blocks = requirement(), ending = feature) => `# Design: Example

## At a glance
Return a useful result.

## Requirements

${blocks}

${ending}`;
const trivial = `# Design: Small fix\n\nIn short: Correct the result by fixing the comparison.\n\n${requirement()}`;

let workspace: string;
let cwd: string;
let input: string;
const run = (args: string[] = [input], helper = script) =>
  spawnSync("python3", [helper, ...args], { cwd, encoding: "utf8", timeout: 10000 });

beforeAll(() => {
  const python = spawnSync("python3", ["-c", "import sys; sys.exit(sys.version_info < (3, 9))"]);
  if (python.error || python.status !== 0) {
    throw new Error("Python 3.9+ is required for design-validator tests; supply it before running (no auto-install).");
  }
});
beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "pwk validator "));
  cwd = join(workspace, "unrelated cwd");
  mkdirSync(cwd);
  input = join(workspace, "project with spaces", "example design.md");
  mkdirSync(dirname(input));
});
afterEach(() => rmSync(workspace, { recursive: true, force: true }));

function valid(text: string) {
  writeFileSync(input, text);
  const result = run();
  expect(result.error).toBeUndefined();
  expect(result.stderr).toBe("");
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain(input);
  expect(result.stdout).toMatch(/structur/i);
  expect(result.stdout).toMatch(/semantic.*(not|unverified)|not.*semantic/i);
  expect(readFileSync(input, "utf8")).toBe(text);
  return result;
}

function invalid(text: string, diagnostic: RegExp) {
  writeFileSync(input, text);
  const result = run();
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain(input);
  expect(result.stderr).toMatch(diagnostic);
  expect(readFileSync(input, "utf8")).toBe(text);
}

describe("design validator CLI", () => {
  it("validates a non-trivial design through the actual CLI without claiming semantic approval", () => {
    valid(design(requirement(1, "### Checkpoints: none\n### Review: skip")));
  });

  it("accepts the documented criteria suffix and CRLF input", () => {
    valid(
      design()
        .replace("**Acceptance criteria**", '**Acceptance criteria** — Given/When/Then criteria defining "done".')
        .replaceAll("\n", "\r\n"),
    );
  });

  it("retains missing-tag defaults and the minimal trivial exception", () => {
    const result = valid(trivial);
    expect(result.stdout).toMatch(/Checkpoints=none/);
    expect(result.stdout).toMatch(/Review=skip/);
    const nonTrivial = valid(design());
    expect(nonTrivial.stdout).toMatch(/Feature review=auto/);
  });

  it.each(["none", "full"])("accepts Checkpoints: %s", (tag) => {
    valid(design(requirement(1, `### Checkpoints: ${tag}`)));
  });
  it.each(["skip", "parallel", "inline"])("accepts Review: %s", (tag) => {
    valid(design(requirement(1, `### Review: ${tag}`)));
  });
  it.each(["auto", "parallel", "inline"])("accepts Feature review: %s", (tag) => {
    valid(design(requirement(), `${feature}\n### Feature review: ${tag}`));
  });

  it("accepts multiple requirements, risk notes, Setup, and narrative context", () => {
    valid(
      design(
        `${requirement(1)}\n### Production-risk notes\n- A migration is needed.\n${requirement(2)}`,
        `## Production-risk areas\n- Schema migration\n## Setup\nRun migration.\n## Approaches considered\nUse existing API.\n${feature}`,
      ),
    );
  });

  it.each([
    ["duplicate IDs", `${requirement(1)}\n${requirement(1)}`, /R1.*duplicate|duplicate.*R1/i],
    ["skipped IDs", `${requirement(1)}\n${requirement(3)}`, /R3.*R2|R2.*R3/],
    ["out-of-order IDs", `${requirement(2)}\n${requirement(1)}`, /R1.*R2|R2.*R1/],
    ["malformed ID", requirement().replace("R1:", "R01:"), /requirement|R01/i],
    ["empty title", requirement().replace("Observable outcome", ""), /title|name/i],
    ["wrong heading level", `${requirement()}\n${requirement(2).replace("### R2:", "#### R2:")}`, /R2.*###|###.*R2/i],
  ])("rejects %s", (_name, blocks, message) => invalid(design(blocks), message));

  it.each([
    ["missing label", criterion, /R1.*Acceptance criteria/i],
    ["empty criteria", "**Acceptance criteria**", /R1.*(empty|criterion|criteria)/i],
    ["empty bullet", "**Acceptance criteria**\n- ", /R1.*(empty|criterion|criteria)/i],
    [
      "risk bullets after empty criteria",
      "**Acceptance criteria**\n### Production-risk notes\n- Risk only",
      /R1.*criteria/i,
    ],
    ["unrelated bullets", "**Acceptance criteria**\n**Implementation**\n- Change a function", /R1.*criteria/i],
    ["inline mention", "The **Acceptance criteria** are elsewhere.\n- An unrelated bullet", /R1.*criteria/i],
    ["criteria inside risk notes", `### Production-risk notes\n**Acceptance criteria**\n${criterion}`, /R1.*criteria/i],
  ])("rejects %s rather than borrowing unrelated section content", (_name, body, message) => {
    invalid(design(`### R1: Outcome\n${body}`), message);
  });

  it("requires criteria in every requirement and nonempty feature acceptance", () => {
    invalid(design(`${requirement()}\n### R2: Empty`), /R2.*Acceptance criteria/i);
    invalid(
      design(requirement(), "## Feature acceptance\n### Feature review: auto"),
      /Feature acceptance.*(empty|criterion|criteria)/i,
    );
    invalid(design(requirement(), ""), /Feature acceptance.*required|require.*Feature acceptance/i);
  });

  it("does not let an In short marker exempt a multi-requirement or full-format design", () => {
    invalid(`${trivial}\n${requirement(2)}`, /trivial.*R1|Feature acceptance/i);
    invalid(
      design(requirement(), "").replace("Return a useful result.", "In short: A summary."),
      /Feature acceptance/i,
    );
    invalid(
      trivial.replace("In short: Correct the result by fixing the comparison.", "In short:"),
      /In short|Feature acceptance/i,
    );
  });

  it.each([
    ["### Checkpoints: spec", /Checkpoints.*none.*full/],
    ["### Review: auto", /Review.*skip.*parallel.*inline/],
    ["### Review: skip | parallel | inline", /Review.*invalid|invalid.*Review/i],
    ["### Checkpoints: none\n### Checkpoints: full", /duplicate.*Checkpoints/i],
    ["### Review: skip\n### Review: inline", /duplicate.*Review/i],
  ])("rejects invalid or duplicate requirement tags: %s", (tags, message) =>
    invalid(design(requirement(1, tags)), message));
  it("rejects invalid and misplaced feature tags", () => {
    invalid(design(requirement(), `${feature}\n### Feature review: skip`), /Feature review.*auto.*parallel.*inline/);
    invalid(design(requirement(1, "### Feature review: auto")), /Feature review.*Feature acceptance/i);
    invalid(
      design(requirement(), `${feature}\n### Feature review: auto\n### Feature review: inline`),
      /duplicate.*Feature review/i,
    );
  });

  it.each(["```", "~~~~"])("ignores template headings, labels, and tags inside %s fences", (fence) => {
    const template = `${fence}markdown\n${requirement(9, "### Review: invalid")}\n${feature}\n${fence}\n`;
    valid(design(`${template}${requirement()}`));
    invalid(design(template, ""), /requirement|R1/i);
    invalid(
      design(`### R1: Outcome\n${fence}\n**Acceptance criteria**\n${criterion}\n${fence}`),
      /R1.*Acceptance criteria/i,
    );
    invalid(design(requirement(), `${fence}\n${feature}\n${fence}`), /Feature acceptance/i);
  });
  it("keeps shorter or other-character fence runs inside a longer fence", () => {
    valid(
      design(`   \`\`\`\`markdown\n\`\`\`\n### R8: template\n~~~\n### Review: wrong\n   \`\`\`\`\n${requirement()}`),
    );
  });

  it("runs a copied skill from an unrelated cwd with absolute and relative paths containing spaces", () => {
    const copied = join(workspace, "installed skill");
    cpSync(skill, copied, { recursive: true });
    writeFileSync(input, design());
    for (const path of [input, relative(cwd, input)]) {
      const result = run([path], join(copied, "scripts/validate-design.py"));
      expect(result.status, result.stderr).toBe(0);
    }
  });
  it("documents path interpretation and Python prerequisite in --help", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Python 3\.9/);
    expect(result.stdout).toMatch(/relative[\s\S]*(working directory|cwd)/i);
  });
  it("reports missing, non-file, and non-UTF-8 inputs without a traceback", () => {
    for (const path of [input, dirname(input)]) {
      const result = run([path]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(path);
      expect(result.stderr).toMatch(/cannot read/i);
      expect(result.stderr).not.toContain("Traceback");
    }
    writeFileSync(input, Buffer.from([0xff]));
    const result = run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(input);
    expect(result.stderr).toMatch(/UTF-8|decode/i);
  });
  it("reports an unreadable file where the OS enforces permissions", () => {
    // Root bypasses mode bits; the non-file case above exercises read failure on every platform.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    writeFileSync(input, design());
    chmodSync(input, 0);
    try {
      const result = run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(input);
      expect(result.stderr).toMatch(/cannot read.*permission/i);
    } finally {
      chmodSync(input, 0o600);
    }
  });
  it("rejects missing CLI input and an empty document", () => {
    expect(run([]).status).not.toBe(0);
    invalid("", /requirement|R1/i);
  });
});
