import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * R1 — the ratchet's two quieter teeth: an unbudgeted file and a restated rule must both
 * fail the gate. The feature E2E covers the loud case (a file past its budget); these are
 * what stop the corpus from creeping back in unnoticed.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const KIT_PATHS = [
  "skills",
  "agents",
  "extensions/workflow-guard.ts",
  "AGENTS.md",
  "README.md",
  "docs/lessons.md",
  "docs/oversight-model.md",
  "docs/developer-usage-guide.md",
  "docs/workflow-phases.md",
];
const KIT_TESTS = ["skill-lint.mjs", "markers.mjs", "prescription-sweep.mjs"];

function copyKit(prefix: string): string {
  const kit = mkdtempSync(join(tmpdir(), prefix));
  for (const rel of KIT_PATHS) {
    const target = join(kit, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repoRoot, rel), target, { recursive: true });
  }
  mkdirSync(join(kit, "tests"), { recursive: true });
  for (const name of KIT_TESTS) cpSync(join(repoRoot, "tests", name), join(kit, "tests", name));
  return kit;
}

function runSkillLint(cwd: string) {
  const result = spawnSync("node", [join(cwd, "tests", "skill-lint.mjs")], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("skill word budgets (R1)", () => {
  it("fails on a markdown file under skills/ that no budget covers", () => {
    const kit = copyKit("pwk-slim-unbudgeted-");
    try {
      const rel = "skills/pwk-status/references/brand-new.md";
      mkdirSync(dirname(join(kit, rel)), { recursive: true });
      writeFileSync(
        join(kit, rel),
        "# Brand new\n\nA file the budget table has never seen, long enough to be prose an agent would load and pay for.\n",
      );
      const { status, output } = runSkillLint(kit);
      expect(status, "an unbudgeted file must fail the gate").not.toBe(0);
      expect(output).toContain(rel);
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("fails when a file states the same long sentence twice", () => {
    const kit = copyKit("pwk-slim-restated-");
    try {
      const rel = "skills/pwk-status/SKILL.md";
      const sentence = "Match the phase header line and route the session from the first nonterminal requirement row.";
      const file = join(kit, rel);
      writeFileSync(file, `${readFileSync(file, "utf8")}\n\n${sentence}\n\n${sentence}\n`);
      const { status, output } = runSkillLint(kit);
      expect(status, "a restated rule must fail the gate").not.toBe(0);
      expect(output).toContain(rel);
      expect(output).toContain("restated");
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });
});
