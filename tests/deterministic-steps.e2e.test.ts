import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Feature acceptance for the deterministic-steps pass.
 *
 * The deliverable is skill text plus the helpers the workflow calls, so the observable
 * interface is: what a helper writes into a progress file, what a helper exits with on a
 * dirty tree, what skill-lint refuses, and what the pin checker reports. `npm run check`
 * is the outer gate (this file runs inside it); these scenarios are the primary enforced spec.
 *
 * This test proves that: (1) the workflow's repeat steps run through helpers and leave the
 * tree clean at the review and ship moments; (2) every reference pointer resolves, the recon
 * step enumerates capabilities before declaring one missing, and no Python is required;
 * (3) the word-budget ratchet still fails by name and count; (4) the pin checker passes an
 * intact file and fails a file that dropped a pinned phrase, naming it.
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

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** A throwaway kit copy that skill-lint can run against. */
function copyKit(prefix: string): string {
  const kit = mkdtempSync(join(tmpdir(), prefix));
  for (const rel of KIT_PATHS) {
    const target = join(kit, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repoRoot, rel), target, { recursive: true });
  }
  mkdirSync(join(kit, "tests"), { recursive: true });
  for (const name of KIT_TESTS) cpSync(join(repoRoot, "tests", name), join(kit, "tests", name));
  cpSync(join(repoRoot, "tests", "tools"), join(kit, "tests", "tools"), { recursive: true });
  return kit;
}

const PROGRESS = `# Progress: sample

Design: docs/plans/2026-10-14-sample/sample-design.md

Branch: sample

Setup: n/a

Started: 2026-10-14T00:00:00Z

Last updated: 2026-10-14T00:00:00Z

Feature phase: e2e-written

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
| 1 | ⬜ | First thing | — | — |
| 2 | ⬜ | Second thing | — | — |

## Execution summary
| R# | Requirement | How it was built | Deviated? | Evidence |
|----|-------------|------------------|-----------|----------|
| 1 | First thing | | | |

## Deviation records

## Code digest
`;

function progressFile(kit: string, body = PROGRESS): string {
  const dir = join(kit, "docs/plans/2026-10-14-sample");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "sample-progress.md");
  writeFileSync(file, body);
  return file;
}

function run(script: string, args: string[], cwd: string) {
  return spawnSync("node", [script, ...args], { cwd, encoding: "utf8" });
}

const skill = (kit: string, skillDir: string, helper: string) => join(kit, "skills", skillDir, "scripts", helper);

describe("deterministic steps (feature E2E)", () => {
  it("writes the progress slots through the helper and gates on a clean tree", () => {
    const kit = copyKit("pwk-det-progress-");
    try {
      const file = progressFile(kit);
      const helper = skill(kit, "pwk-executing-tasks", "progress.mjs");

      const phase = run(helper, ["set", "--file", file, "--phase", "implementing (1/6)"], kit);
      expect(phase.status, `set --phase must succeed: ${phase.stdout}${phase.stderr}`).toBe(0);
      let text = readFileSync(file, "utf8");
      expect(text, "the phase line carries the new value").toContain("Feature phase: implementing (1/6)");
      expect(text, "Last updated is refreshed").not.toContain("Last updated: 2026-10-14T00:00:00Z");
      expect(text, "the requirements table is untouched").toContain("| 1 | ⬜ | First thing | — | — |");

      const row = run(
        helper,
        ["set-row", "--file", file, "--requirement", "1", "--done", "🔄", "--commit", "abc1234"],
        kit,
      );
      expect(row.status, `set-row must succeed: ${row.stdout}${row.stderr}`).toBe(0);
      text = readFileSync(file, "utf8");
      expect(text, "row 1 carries the done cell and commit").toContain("| 1 | 🔄 | First thing | — | abc1234 |");
      expect(text, "row 2 is untouched").toContain("| 2 | ⬜ | Second thing | — | — |");

      const summary = run(
        helper,
        [
          "append-summary",
          "--file",
          file,
          "--requirement",
          "1",
          "--built",
          "did the thing",
          "--deviated",
          "—",
          "--evidence",
          "a | b probe",
        ],
        kit,
      );
      expect(summary.status, `append-summary must succeed: ${summary.stdout}${summary.stderr}`).toBe(0);
      expect(readFileSync(file, "utf8"), "a pipe in the prose is escaped, not a broken table").toContain(
        "a \\| b probe",
      );

      const bad = run(helper, ["set", "--file", file, "--phase", "implementing (7/6)"], kit);
      expect(bad.status, "a k greater than N is rejected").not.toBe(0);
      expect(`${bad.stdout}${bad.stderr}`, "the rejection names the vocabulary").toMatch(/phase/i);

      const clean = run(skill(kit, "pwk-executing-tasks", "stage-check.mjs"), [], kit);
      expect(clean.status, `a clean tree must pass: ${clean.stdout}${clean.stderr}`).toBe(0);

      writeFileSync(join(kit, "stray.txt"), "not committed\n");
      const dirty = run(skill(kit, "pwk-executing-tasks", "stage-check.mjs"), [], kit);
      expect(dirty.status, "a stray untracked file must fail the gate").not.toBe(0);
      expect(`${dirty.stdout}${dirty.stderr}`, "the failure names the path").toContain("stray.txt");
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("resolves every reference pointer, enumerates capabilities, and needs no Python", () => {
    const kit = copyKit("pwk-det-corpus-");
    try {
      const lint = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { cwd: kit, encoding: "utf8" });
      expect(`${lint.stdout}${lint.stderr}`, "skill-lint must be green on the kit copy").toContain("all checks passed");
      expect(lint.status).toBe(0);

      const recon = read("skills/pwk-brainstorming/SKILL.md");
      expect(recon, "the recon step enumerates before declaring a capability missing").toMatch(/enumerat/i);
      expect(recon, "the batch-executor form is named").toContain("ALL_TOOLS");

      const python = spawnSync("sh", ["-c", "grep -rn -i 'python3\\|Python 3' skills AGENTS.md || true"], {
        cwd: kit,
        encoding: "utf8",
      });
      expect(python.stdout.trim(), "no Python invocation or prerequisite remains").toBe("");
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("fails a reference pointer whose anchor matches no heading", () => {
    const kit = copyKit("pwk-det-anchor-");
    try {
      const file = join(kit, "skills/pwk-executing-tasks/SKILL.md");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace(
          "references/review.md#assemble-evidence",
          "references/review.md#no-such-section",
        ),
      );
      const lint = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { cwd: kit, encoding: "utf8" });
      const out = `${lint.stdout}${lint.stderr}`;
      expect(lint.status, "a dangling anchor must fail the lint").not.toBe(0);
      expect(out, "the failure names the pointer and the anchor").toContain("references/review.md#no-such-section");
      expect(out, "the failure names the reference file").toContain("review.md");
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("keeps the word-budget ratchet failing by file name and count", () => {
    const kit = copyKit("pwk-det-budget-");
    try {
      const rel = "skills/pwk-status/SKILL.md";
      const file = join(kit, rel);
      writeFileSync(file, `${readFileSync(file, "utf8")}\n\n${"padding word ".repeat(2000)}\n`);
      const lint = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { cwd: kit, encoding: "utf8" });
      const out = `${lint.stdout}${lint.stderr}`;
      expect(lint.status, "an over-budget file still fails the gate").not.toBe(0);
      expect(out, "the failure names the file").toContain(rel);
      expect(out, "the failure names a count").toMatch(/over its budget/);
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("passes an intact file and fails one that dropped a pinned phrase", () => {
    const kit = copyKit("pwk-det-pins-");
    try {
      const git = (args: string[]) => spawnSync("git", args, { cwd: kit, encoding: "utf8" });
      git(["init", "-q"]);
      git(["add", "-A"]);
      git(["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "kit"]);
      const target = join(kit, "skills/pwk-status/SKILL.md");
      const checker = join(kit, "tests", "tools", "pins-lost.mjs");

      const intact = run(checker, [target, "--against", "HEAD"], kit);
      expect(intact.status, `an intact file must pass: ${intact.stdout}${intact.stderr}`).toBe(0);

      const pinned = read("skills/pwk-status/SKILL.md");
      const phrase = pinned.split("\n").find((line) => line.trim().length > 60) ?? "";
      expect(phrase.length, "the sample file must carry a long pinned-ish line").toBeGreaterThan(60);
      writeFileSync(target, pinned.replace(phrase, ""));
      const dropped = run(checker, [target, "--against", "HEAD"], kit);
      expect(dropped.status, "a dropped pinned phrase must fail").not.toBe(0);
      expect(`${dropped.stdout}${dropped.stderr}`, "the failure names the lost phrase").toContain(
        phrase.trim().slice(0, 40),
      );
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });
});
