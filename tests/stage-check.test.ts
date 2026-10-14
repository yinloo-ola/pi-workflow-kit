import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Per-slice tests for the staging check (deterministic-steps R3).
 *
 * The helper answers one question before a review: is everything that belongs in the
 * reviewed diff actually in the tree? These pin both sides of the boundary — the plan
 * folder is legitimately dirty, anything else is not — and that a root it cannot verify
 * fails loudly rather than passing.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/stage-check.mjs");

function git(dir: string, args: string[]) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
}

/** A git repo with one commit and a committed file outside the plan folder. */
function repo(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "committed.txt"), "baseline\n");
  mkdirSync(join(dir, "docs/plans/2026-10-14-sample"), { recursive: true });
  writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-progress.md"), "in flight\n");
  git(dir, ["add", "-A"]);
  git(dir, ["-c", "user.name=t", "-c", "user.email=t@local", "commit", "-q", "-m", "baseline"]);
  return dir;
}

const check = (dir: string) => spawnSync("node", [HELPER], { cwd: dir, encoding: "utf8" });

describe("stage check", () => {
  it("passes a tree with no changes", () => {
    const dir = repo("pwk-stage-clean-");
    try {
      const result = check(dir);
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails an untracked file outside the plan folder and prints its path", () => {
    const dir = repo("pwk-stage-untracked-");
    try {
      mkdirSync(join(dir, "tests"), { recursive: true });
      writeFileSync(join(dir, "tests/stray.test.ts"), "x\n");
      const result = check(dir);
      expect(result.status, "an untracked file outside docs/plans is a failure").not.toBe(0);
      expect(`${result.stdout}${result.stderr}`, "the failure names the path").toContain("tests/stray.test.ts");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a modified tracked file outside the plan folder", () => {
    const dir = repo("pwk-stage-modified-");
    try {
      writeFileSync(join(dir, "committed.txt"), "changed\n");
      const result = check(dir);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain("committed.txt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("passes when only the plan folder is dirty", () => {
    const dir = repo("pwk-stage-plans-");
    try {
      writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-progress.md"), "updated in flight\n");
      writeFileSync(join(dir, "docs/plans/2026-10-14-sample/sample-review-packet.md"), "generated\n");
      const result = check(dir);
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails when the root is not a git worktree, naming the path", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-stage-norepo-"));
    try {
      const result = check(dir);
      expect(result.status, "an unverifiable root must not pass silently").not.toBe(0);
      expect(`${result.stdout}${result.stderr}`, "the failure names the root").toContain(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
