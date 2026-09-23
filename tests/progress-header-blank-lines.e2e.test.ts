import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const PROGRESS_FORMAT = join(repoRoot, "skills/pwk-executing-tasks/references/progress-format.md");
const EXECUTING_SKILL = join(repoRoot, "skills/pwk-executing-tasks/SKILL.md");
const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py");

/** The header fields whose CommonMark preview must show one line per field. */
const HEADER_FIELDS = ["# Progress:", "Design:", "Branch:", "Setup:", "Started:", "Last updated:", "Feature phase:"];

const DESIGN_REL = "docs/plans/2026-09-17-demo/demo-design.md";

/** A design fixture shaped like the template pwk-brainstorming emits. */
const DESIGN_FIXTURE = [
  "# Demo",
  "",
  "## Requirements",
  "",
  "### R1: alpha",
  "alpha does one thing",
  "",
  "**Acceptance criteria** — Given/When/Then criteria:",
  "- Given a, When b, Then c.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "## Feature acceptance",
  "",
  "- `should demo` — Given x, When y, Then z.",
  "",
  "### Feature review: auto",
  "",
].join("\n");

/** The compact (old) header shape: consecutive plain lines, merged by previews. */
const OLD_HEADER = [
  "# Progress: demo",
  "",
  `Design: ${DESIGN_REL}`,
  "Branch: test",
  "Setup: pending",
  "Started: 2026-09-17T00:00:00Z",
  "Last updated: 2026-09-17T00:00:00Z",
  "Feature phase: reviewing",
  "",
];

/** The blank-line (new) header shape: one paragraph per field. */
const NEW_HEADER = [
  "# Progress: demo",
  "",
  `Design: ${DESIGN_REL}`,
  "",
  "Branch: test",
  "",
  "Setup: pending",
  "",
  "Started: 2026-09-17T00:00:00Z",
  "",
  "Last updated: 2026-09-17T00:00:00Z",
  "",
  "Feature phase: reviewing",
  "",
];

/** Extract the first ```markdown fence's lines from a source file. */
function firstMarkdownFence(path: string): string[] {
  const source = readFileSync(path, "utf8");
  const open = source.indexOf("```markdown");
  const close = source.indexOf("```", open + 12);
  return source.slice(open + 12, close).split("\n");
}

/** Extract the fenced block containing `# Progress:` (the skill's skeleton example). */
function progressSkeleton(path: string): string[] {
  const source = readFileSync(path, "utf8");
  const marker = source.indexOf("# Progress:");
  const open = source.lastIndexOf("```", marker);
  const close = source.indexOf("```", marker);
  return source.slice(open + 3, close).split("\n");
}

/** Line indices of header-field lines, in document order. */
function fieldIndices(lines: string[]): number[] {
  return lines
    .map((line, index) => (HEADER_FIELDS.some((field) => line.trimStart().startsWith(field)) ? index : -1))
    .filter((index) => index >= 0);
}

/** Every adjacent pair of header fields must be separated by a blank line. */
function expectBlankSeparated(lines: string[]): void {
  const indices = fieldIndices(lines);
  for (let i = 0; i < indices.length - 1; i += 1) {
    expect(lines[indices[i] + 1]?.trim(), `line after "${lines[indices[i]].trim()}" must be blank`).toBe("");
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Run the documented `grep -m1 '^<field>'` recipe against one fixture file. */
function grepFirst(field: string, file: string, cwd: string): string {
  return execSync(`grep -m1 '^${field}' "${file}"`, { cwd }).toString().trim();
}

/** Build a feature-scope review packet in a throwaway git repo with the given progress header. */
function buildPacket(header: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
  mkdirSync(join(dir, "docs", "plans", "2026-09-17-demo"), { recursive: true });
  execSync(
    "git init -q && git config user.email t@t && git config user.name t && git commit -q --allow-empty -m seed",
    {
      cwd: dir,
    },
  );
  writeFileSync(join(dir, DESIGN_REL), DESIGN_FIXTURE);
  execSync("git add . && git commit -q -m fixture", { cwd: dir });
  execSync("git commit -q --allow-empty -m second", { cwd: dir });
  const commits = execSync("git rev-list --max-parents=0 HEAD && git rev-parse HEAD", { cwd: dir })
    .toString()
    .split("\n")
    .filter(Boolean);
  const progress = [
    ...header,
    "## Requirements",
    "| # | Done | Requirement | Per-req ceremony | Commit |",
    "|---|------|-------------|-----------------|--------|",
    `| 1 | ✅ | alpha | — | ${commits[1]} |`,
    "",
  ].join("\n");
  writeFileSync(join(dir, "docs/plans/2026-09-17-demo/demo-progress.md"), progress);
  execSync("git add . && git commit -q -m progress", { cwd: dir });
  execFileSync("python3", [
    PACKET_HELPER,
    "--project",
    dir,
    "--design",
    DESIGN_REL,
    "--progress",
    "docs/plans/2026-09-17-demo/demo-progress.md",
    "--scope",
    "feature",
  ]);
  return readFileSync(join(dir, "docs/plans/2026-09-17-demo/demo-review-packet.md"), "utf8");
}

describe("feature acceptance: progress header blank lines", () => {
  it("progress template separates every adjacent header field with a blank line", () => {
    const lines = firstMarkdownFence(PROGRESS_FORMAT);
    expect(fieldIndices(lines)).toHaveLength(HEADER_FIELDS.length); // extraction sanity: all 7 field lines found
    expectBlankSeparated(lines);
  });

  it("executing skill skeleton separates its header fields with a blank line", () => {
    const lines = progressSkeleton(EXECUTING_SKILL);
    expect(fieldIndices(lines).length).toBeGreaterThanOrEqual(3); // title, Design, Feature phase at minimum
    expectBlankSeparated(lines);
  });

  it("template prose says the blank lines are load-bearing", () => {
    const source = readFileSync(PROGRESS_FORMAT, "utf8");
    expect(source).toMatch(/blank lines are load-bearing/);
    expect(source).toMatch(/CommonMark merges consecutive plain lines/);
  });

  it("documented header greps return exactly one line for both header shapes", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-header-"));
    for (const name of ["old", "new"]) {
      const header = name === "old" ? OLD_HEADER : NEW_HEADER;
      const body = [
        ...header,
        "## Notes",
        "",
        "Setup: done is a decoy the header-only match must never reach.",
        "",
      ].join("\n");
      const file = join(dir, `${name}.md`);
      writeFileSync(file, body);

      // Exactly one header line, never the body decoy — header-only, body never read.
      expect(grepFirst("Feature phase:", file, dir)).toBe("Feature phase: reviewing");
      expect((body.match(/^Feature phase:/gm) ?? []).length).toBe(1);
      expect(grepFirst("Setup:", file, dir)).toBe("Setup: pending");

      // The multiline ^Design: …$ assertion matches either shape.
      const designLine = `Design: ${DESIGN_REL}`;
      expect(body).toMatch(new RegExp(`^${escapeRegExp(designLine)}$`, "m"));
    }
  });

  it("packet helper accepts both header shapes and emits blank-separated Base/Head", () => {
    for (const header of [OLD_HEADER, NEW_HEADER]) {
      const packet = buildPacket(header);
      // Design resolved: the packet exists and carries the design path.
      expect(packet).toContain(DESIGN_REL);
      // Base/Head each on their own single greppable line, blank line between.
      expect(packet).toMatch(/Base: [0-9a-f]{7,64}\n\nHead: [0-9a-f]{7,64}/);
      expect((packet.match(/^Base:/gm) ?? []).length).toBe(1);
      expect((packet.match(/^Head:/gm) ?? []).length).toBe(1);
    }
  });
});
