import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Feature acceptance for the skill-slimming pass.
 *
 * The deliverable is skill prose plus the gates that keep it slim, so the observable
 * interface is: the word count of the content a host loads, skill-lint's exit behavior
 * on a kit copy, the probe validator's verdict on a recorded report, and the rule block
 * a future skill edit reads. `npm run check` is the outer gate (this file runs inside
 * it); these scenarios are the primary enforced spec.
 *
 * This test proves that: (1) every loadable skill markdown file sits inside its recorded
 * budget and the corpus inside its ceiling — budgets ratchet from the achieved counts plus
 * 10% headroom (ADR 0010), not from a target percentage; (2) a skill file that grows
 * past its budget fails the gate by name and count rather than silently; (3) the probe
 * validator accepts a complete recorded report and rejects one that drops an assessment;
 * (4) the five editorial rules are recorded where the next skill edit looks.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every markdown file a host can load, with the ceiling it must stay under (measured count + 10% headroom, rounded up). */
const BUDGETS: Record<string, number> = {
  "skills/pwk-brainstorming/SKILL.md": 2430,
  "skills/pwk-brainstorming/references/design-format.md": 1439,
  "skills/pwk-brainstorming/references/umbrella.md": 303,
  "skills/pwk-code-review/SKILL.md": 1098,
  "skills/pwk-executing-tasks/SKILL.md": 3173,
  "skills/pwk-executing-tasks/references/progress-format.md": 1107,
  "skills/pwk-executing-tasks/references/resume.md": 494,
  "skills/pwk-executing-tasks/references/review.md": 668,
  "skills/pwk-finalizing/SKILL.md": 1806,
  "skills/pwk-status/SKILL.md": 986,
  "skills/pwk-walkthrough/SKILL.md": 643,
};
const CORPUS_CEILING = 14143;
const PROBE_DIR = "tests/evals/skill-slimming";
const RULE_LABELS = ["E1:", "E2:", "E3:", "E4:", "E5:"];

/** Paths a kit copy needs for skill-lint to run against it, plus the files it cross-reads. */
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

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Kit copy in a tmpdir, with skill-lint runnable against it. */
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
  return spawnSync("node", [join(cwd, "tests", "skill-lint.mjs")], { encoding: "utf8" });
}

function runValidator(report: string) {
  return spawnSync("node", [join(repoRoot, PROBE_DIR, "validate.mjs"), report], { encoding: "utf8" });
}

describe("skill slimming (feature E2E)", () => {
  it("keeps every loadable skill file and the corpus inside the recorded budgets", () => {
    const files = Object.keys(BUDGETS);
    expect(files.length, "eleven loadable markdown files").toBe(11);
    let total = 0;
    for (const rel of files) {
      const count = words(read(rel));
      expect(count, `${rel} must stay at or under its ceiling`).toBeLessThanOrEqual(BUDGETS[rel]);
      total += count;
    }
    expect(total, "corpus ceiling").toBeLessThanOrEqual(CORPUS_CEILING);

    const lint = runSkillLint(repoRoot);
    expect(`${lint.stdout}${lint.stderr}`, "skill-lint must be green on the slimmed corpus").toContain(
      "all checks passed",
    );
    expect(lint.status).toBe(0);
  });

  it("fails the gate on a kit copy whose skill file outgrew its budget, naming file and count", () => {
    const kit = copyKit("pwk-slim-budget-");
    try {
      const rel = "skills/pwk-status/SKILL.md";
      const clean = runSkillLint(kit);
      expect(clean.status, `baseline kit copy must pass: ${clean.stdout}${clean.stderr}`).toBe(0);

      const file = join(kit, rel);
      const grown = `${readFileSync(file, "utf8")}\n\n${"padding word ".repeat(BUDGETS[rel] + 5)}\n`;
      writeFileSync(file, grown);

      const result = runSkillLint(kit);
      const output = `${result.stdout}${result.stderr}`;
      expect(result.status, "an over-budget file must fail the gate").not.toBe(0);
      expect(output, "the failure names the file").toContain(rel);
      expect(output, "the failure names the actual count").toContain(String(words(grown)));
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("accepts a complete recorded probe report and rejects one that drops an assessment", () => {
    const accepted = runValidator(join(repoRoot, PROBE_DIR, "fixtures", "report-complete.json"));
    expect(accepted.status, `complete report must validate: ${accepted.stdout}${accepted.stderr}`).toBe(0);

    const rejected = runValidator(join(repoRoot, PROBE_DIR, "fixtures", "report-missing-assessment.json"));
    const output = `${rejected.stdout}${rejected.stderr}`;
    expect(rejected.status, "an incomplete report must be rejected").not.toBe(0);
    expect(output, "the rejection names the missing assessment").toContain("premature-finalize-blocking");
  });

  it("records the five editorial rules in AGENTS.md", () => {
    const agents = read("AGENTS.md");
    for (const label of RULE_LABELS) {
      expect(agents, `${label} must be recorded where the next skill edit looks`).toContain(label);
    }
  });
});
