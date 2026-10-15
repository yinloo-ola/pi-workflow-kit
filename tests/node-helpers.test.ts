import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the runtime conversion (deterministic-steps R6).
 *
 * The conversion is proven against goldens recorded from the Python helpers while both
 * existed: a rewrite that changes one byte of a packet, or one line of a diagnostic,
 * fails here. The fixture repository is built with fixed author and dates, so its commit
 * hashes are reproducible and the packet golden can hold them.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES = join(repoRoot, "tests/fixtures");

const VALIDATOR = join(repoRoot, "skills/pwk-brainstorming/scripts/validate-design.mjs");
const PACKET = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.mjs");

const CRITERION = "- Given an input, When it is processed, Then the result is returned.";
const requirement = (id = 1, tags = "") => `### R${id}: Observable outcome
A caller receives a result.

**Acceptance criteria**
${CRITERION}

${tags}`;
const feature = `## Feature acceptance\n\n${CRITERION}\n`;
const design = (blocks = requirement(), ending = feature) => `# Design: Example

## At a glance
Return a useful result.

## Requirements

${blocks}

${ending}`;

const CASES: Record<string, string> = {
  valid: design(),
  "valid-trivial": `# Design: Small fix\n\nIn short: Correct the result by fixing the comparison.\n\n${requirement()}`,
  "missing-criteria": design(
    `### R1: Observable outcome\nA caller receives a result.\n\n### Checkpoints: none\n### Review: skip\n`,
  ),
  "no-feature-acceptance": design(requirement(), ""),
  "duplicate-requirement": design(`${requirement(1)}\n${requirement(2).replace("R2", "R1")}`),
  "non-sequential": design(requirement(2)),
};

/** A git repo whose content and metadata are fixed, so its hashes are reproducible. */
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@local",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@local",
  GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
  GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
};

function buildPacketFixture() {
  const dir = mkdtempSync(join(tmpdir(), "pwk-node-helpers-"));
  const git = (args: string[]) => spawnSync("git", args, { cwd: dir, env: GIT_ENV, encoding: "utf8" });
  git(["init", "-q", "-b", "main"]);
  const plan = join(dir, "docs/plans/2026-01-01-fixture");
  mkdirSync(plan, { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), '{\n  "name": "fixture",\n  "version": "1.0.0",\n  "private": true\n}\n');
  writeFileSync(join(dir, "src/index.mjs"), "export const value = 1;\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "fixture: base"]);
  writeFileSync(join(dir, "src/index.mjs"), "export const value = 2;\n");
  // The design the golden packet was built from, byte for byte.
  writeFileSync(
    join(plan, "fixture-design.md"),
    readFileSync(join(FIXTURES, "review-packet/fixture-design.md"), "utf8"),
  );
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "docs: add design doc"]);
  const head = git(["rev-parse", "--short", "HEAD"]).stdout.trim();
  const progress = readFileSync(join(FIXTURES, "review-packet/fixture-progress-template.md"), "utf8").replace(
    "HEADOFSECONDCOMMIT",
    head,
  );
  writeFileSync(join(plan, "fixture-progress.md"), progress);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "feat: the tiny behaviour"]);
  return { dir, plan };
}

describe("node helpers (conversion)", () => {
  it("matches the recorded validator diagnostics case by case", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-validator-golden-"));
    try {
      for (const [name, body] of Object.entries(CASES)) {
        const file = join(dir, `${name}.md`);
        writeFileSync(file, body);
        const result = spawnSync("node", [VALIDATOR, file], { encoding: "utf8" });
        const golden = readFileSync(join(FIXTURES, "design-validator", `${name}.txt`), "utf8").replaceAll(
          dir + "/",
          "",
        );
        const actual = `# exit: ${result.status}\n${result.stdout}${result.stderr}`.replaceAll(dir + "/", "");
        expect(actual, `${name} must match the Python validator`).toBe(golden);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("builds a packet byte-identical to the recorded Python packet", () => {
    const { dir, plan } = buildPacketFixture();
    try {
      const result = spawnSync(
        "node",
        [
          PACKET,
          "--project",
          dir,
          "--design",
          "docs/plans/2026-01-01-fixture/fixture-design.md",
          "--progress",
          "docs/plans/2026-01-01-fixture/fixture-progress.md",
          "--scope",
          "feature",
        ],
        { encoding: "utf8" },
      );
      expect(result.status, `packet helper failed: ${result.stdout}${result.stderr}`).toBe(0);
      const produced = readFileSync(join(plan, "fixture-review-packet.md"), "utf8");
      const golden = readFileSync(join(FIXTURES, "review-packet/packet-golden.md"), "utf8");
      expect(produced, "the packet must match the Python helper byte for byte").toBe(golden);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("leaves no Python in the helpers, the skill text, or the test suite", () => {
    expect(existsSync(join(repoRoot, "skills/pwk-brainstorming/scripts/validate-design.py")), "validator ported").toBe(
      false,
    );
    expect(
      existsSync(join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py")),
      "packet helper ported",
    ).toBe(false);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name === "runs") continue; // frozen probe evidence
          walk(path);
          continue;
        }
        // These two name Python only to assert its absence.
        // These name Python only to assert its absence, or to detect it.
        if (["node-helpers.test.ts", "deterministic-steps.e2e.test.ts", "prescription-sweep.mjs"].includes(name)) {
          continue;
        }
        if (!/\.(md|ts|mjs)$/.test(name)) continue;
        const text = readFileSync(path, "utf8");
        if (/python3|Python 3/i.test(text)) offenders.push(`${path.replace(`${repoRoot}/`, "")}`);
      }
    };
    walk(join(repoRoot, "skills"));
    walk(join(repoRoot, "docs"));
    walk(join(repoRoot, "tests"));
    expect(offenders, "no Python invocation or prerequisite remains").toEqual([]);
    expect(readFileSync(join(repoRoot, "AGENTS.md"), "utf8"), "AGENTS.md states the runtime").not.toMatch(/python3/i);
  });
});
