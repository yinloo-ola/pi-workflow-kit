import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the section extractor (deterministic-steps R2).
 *
 * The point of the helper is that a step loads one section instead of a whole file, so the
 * tests pin the exact boundaries: from the anchor heading to the next heading of the same
 * or higher level, verbatim, and a named refusal otherwise.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/ref.mjs");

const DOC = `# Title

Intro prose.

## First section

first body line
second body line

### Nested detail

nested body

## Second section

second body
`;

function workspace(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const file = join(dir, "doc.md");
  writeFileSync(file, DOC);
  return { dir, file };
}

const runHelper = (target: string) => spawnSync("node", [HELPER, target], { encoding: "utf8" });

describe("section extractor", () => {
  it("prints a section from its heading to the next heading of the same level", () => {
    const { dir, file } = workspace("pwk-ref-");
    try {
      const result = runHelper(`${file}#first-section`);
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      expect(result.stdout).toContain("## First section");
      expect(result.stdout, "includes its own nested subsection").toContain("nested body");
      expect(result.stdout, "stops before the next same-level heading").not.toContain("## Second section");
      expect(result.stdout, "does not include the intro").not.toContain("Intro prose.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stops a nested section at the next heading of the same or higher level", () => {
    const { dir, file } = workspace("pwk-ref-nested-");
    try {
      const result = runHelper(`${file}#nested-detail`);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("nested body");
      expect(result.stdout, "a sibling section is excluded").not.toContain("second body");
      expect(result.stdout, "the parent heading is excluded").not.toContain("## First section");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names the anchor and lists the available headings when it matches nothing", () => {
    const { dir, file } = workspace("pwk-ref-missing-");
    try {
      const result = runHelper(`${file}#nope`);
      expect(result.status).not.toBe(0);
      const text = `${result.stdout}${result.stderr}`;
      expect(text, "names the anchor").toContain("nope");
      expect(text, "lists a heading the file does offer").toContain("first-section");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names the path when the file does not exist", () => {
    const { dir, file } = workspace("pwk-ref-absent-");
    try {
      const result = runHelper(`${file}.absent#anything`);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain("doc.md.absent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a target with no anchor", () => {
    const { dir, file } = workspace("pwk-ref-noanchor-");
    try {
      const result = runHelper(file);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toMatch(/anchor|#/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
