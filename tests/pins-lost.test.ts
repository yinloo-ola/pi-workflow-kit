import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the pin checker's refinements (deterministic-steps R5).
 *
 * The feature E2E covers the straightforward drop against HEAD. These pin the revision
 * argument, the exit status a caller can gate on, and the refusal to guess at a revision
 * that does not resolve.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const CHECKER = join(repoRoot, "tests/tools/pins-lost.mjs");

const PINNED = "a pinned phrase that must survive the pass";
const TARGET = "skills/x/SKILL.md";

function git(dir: string, args: string[]) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
}

/** A repo whose pin pool names one phrase, with that phrase in a skill file. */
function workspace(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(dir, "tests"), { recursive: true });
  mkdirSync(join(dir, "skills/x"), { recursive: true });
  writeFileSync(join(dir, "tests/markers.mjs"), `export const M = { pinned: "${PINNED}" };\n`);
  writeFileSync(join(dir, "tests/skill-lint.mjs"), 'console.log("another pool entry that is long enough");\n');
  writeFileSync(join(dir, "skills/x/SKILL.md"), `# X\n\n${PINNED}\n\nfiller line\n`);
  git(dir, ["init", "-q"]);
  git(dir, ["add", "-A"]);
  git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "with the pin"]);
  return dir;
}

const check = (dir: string, args: string[] = []) =>
  spawnSync("node", [CHECKER, TARGET, ...args], { cwd: dir, encoding: "utf8" });

describe("pin checker", () => {
  it("passes a file whose pinned phrases are intact", () => {
    const dir = workspace("pwk-pins-intact-");
    try {
      const result = check(dir);
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      expect(result.stdout, "reports how many pins it found").toMatch(/present/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails naming the phrase a file dropped against a named revision", () => {
    const dir = workspace("pwk-pins-drop-");
    try {
      const first = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
      const file = join(dir, TARGET);
      writeFileSync(file, readFileSync(file, "utf8").replace(PINNED, ""));
      git(dir, ["add", "-A"]);
      git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "drop the pin"]);

      const againstHead = check(dir, ["--against", "HEAD"]);
      expect(againstHead.status, "the current revision no longer carries the pin").toBe(0);

      const againstFirst = check(dir, ["--against", first]);
      expect(againstFirst.status, "a pin present in that revision and absent now fails").not.toBe(0);
      expect(`${againstFirst.stdout}${againstFirst.stderr}`, "the failure names the phrase").toContain(PINNED);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts an absolute path, as a caller outside the repo root would pass", () => {
    const dir = workspace("pwk-pins-absolute-");
    try {
      const absolute = join(dir, TARGET);
      const intact = spawnSync("node", [CHECKER, absolute], { cwd: dir, encoding: "utf8" });
      expect(intact.status, `${intact.stdout}${intact.stderr}`).toBe(0);

      writeFileSync(absolute, readFileSync(absolute, "utf8").replace(PINNED, ""));
      const dropped = spawnSync("node", [CHECKER, absolute], { cwd: dir, encoding: "utf8" });
      expect(dropped.status, "an absolute path must still find the pin").not.toBe(0);
      expect(`${dropped.stdout}${dropped.stderr}`).toContain(PINNED);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a revision that does not resolve", () => {
    const dir = workspace("pwk-pins-badrev-");
    try {
      const result = check(dir, ["--against", "no-such-revision"]);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`, "the failure names the revision").toContain("no-such-revision");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
