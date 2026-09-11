import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_SKILLS } from "../extensions/workflow-guard";

/**
 * Feature acceptance for `remove-pwk-diagnose`: the skill and every reference to it
 * are gone, the guard keeps no unlock path for it, and the shipped corpus stays
 * consistent (no orphaned skill counts, no doc pointing at a missing file).
 *
 * The design doc's stated acceptance is "`npm run check` is green, `skills/pwk-diagnose/`
 * does not exist, and a repo-wide grep for `pwk-diagnose` returns zero hits outside
 * `CHANGELOG.md` history entries and the design doc". `npm run check` is the outer gate
 * (this file runs inside it); the scenarios below assert the other two, plus the count
 * claims the gate's lint would otherwise fail on.
 *
 * Files allowed to name the removed token in their content:
 * - this test and `tests/workflow-guard.test.ts` — they assert the removal, so they must
 *   name what they assert is gone (the guard test proves invoking it leaves the gate closed);
 * - `CHANGELOG.md` — immutable history record;
 * - anything under `docs/plans/` — ephemeral planning artifacts, disposed at finalize.
 * Everything else is the shipped corpus and must be clean. Content is scanned; file names
 * are not exempted (`skills/pwk-diagnose/` must not reappear as a path either).
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const REMOVED = "pwk-diagnose";
const SELF = "tests/remove-pwk-diagnose.e2e.test.ts";
const GUARD_TEST = "tests/workflow-guard.test.ts";
const PLANNING_PREFIX = "docs/plans/";
const MENTION_ALLOWLIST = new Set([SELF, GUARD_TEST, "CHANGELOG.md"]);

/** The shipped corpus as git sees it — ignored installs (`node_modules`, `.agents/`) are out. */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" }).split("\0").filter(Boolean);
}

/** Skill dirs under `skills/`, ignoring any that are not `pwk-*`. */
function skillDirs(): string[] {
  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("pwk-"))
    .map((entry) => entry.name)
    .sort();
}

/** The roster skill-lint declares, parsed from its own source so drift is visible here. */
function declaredRoster(): string[] {
  const lint = readFileSync(join(repoRoot, "tests/skill-lint.mjs"), "utf8");
  const lists = [...lint.matchAll(/const (?:PIPELINE_SKILLS|UTILITY_SKILLS) = \[([^\]]+)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/"(pwk-[\w-]+)"/g)].map((m) => m[1]))
    .sort();
  expect(lists.length, "skill-lint declares a pipeline + utility roster").toBeGreaterThan(0);
  return lists;
}

const INVENTORY_DOCS = [
  "README.md",
  "docs/oversight-model.md",
  "docs/developer-usage-guide.md",
  "docs/workflow-phases.md",
];
const PIPELINE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-code-review", "pwk-finalizing"];
const UTILITY_SKILLS = ["pwk-status", "pwk-walkthrough"];

describe("remove-pwk-diagnose (feature E2E)", () => {
  it("scenario 1 — the skill dir is gone and no unlock path remains in the guard", () => {
    expect(skillDirs()).not.toContain(REMOVED);
    expect(() => statSync(join(repoRoot, "skills", REMOVED))).toThrow();
    expect(UNLOCK_SKILLS).not.toContain(REMOVED);
    expect([...UNLOCK_SKILLS].sort()).toEqual([
      "pwk-code-review",
      "pwk-executing-tasks",
      "pwk-finalizing",
      "pwk-walkthrough",
    ]);

    // No shipped path (outside planning artifacts + this test) is named after it either.
    for (const rel of trackedFiles()) {
      if (MENTION_ALLOWLIST.has(rel) || rel.startsWith(PLANNING_PREFIX)) continue;
      expect(rel, `path still names the removed skill`).not.toContain(REMOVED);
    }
    // The plan for deleting the seed note lives in the design doc; nothing dangles.
    expect(trackedFiles()).not.toContain("docs/plans/2026-09-11-skill-slimming-notes.md");
  });

  it("scenario 2 — a repo-wide grep for the token returns zero hits outside history and planning artifacts", () => {
    const hits: string[] = [];
    for (const rel of trackedFiles()) {
      if (MENTION_ALLOWLIST.has(rel) || rel.startsWith(PLANNING_PREFIX)) continue;
      const body = readFileSync(join(repoRoot, rel), "utf8");
      if (body.includes("\0")) continue;
      body.split("\n").forEach((line, i) => {
        if (line.includes(REMOVED)) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits, `references to the removed skill survived:\n${hits.join("\n")}`).toEqual([]);
  });

  it("scenario 3 — the shipped corpus still reads coherently: one roster, matching counts", () => {
    // The guard export, the tree, and skill-lint's declared roster agree on one set.
    expect(declaredRoster()).toEqual(skillDirs());
    expect(skillDirs()).toEqual([...PIPELINE_SKILLS, ...UTILITY_SKILLS].sort());

    // No inventory doc claims a skill count that disagrees with the tree — an orphaned
    // "3 utility skills" would send a reader looking for a skill that is not there.
    for (const doc of INVENTORY_DOCS) {
      const body = readFileSync(join(repoRoot, doc), "utf8");
      for (const [, n] of body.matchAll(/(\d+) pipeline skills?/gi)) {
        expect(Number(n), `${doc} pipeline-skill count`).toBe(PIPELINE_SKILLS.length);
      }
      for (const [, n] of body.matchAll(/(\d+) utility skills?/gi)) {
        expect(Number(n), `${doc} utility-skill count`).toBe(UTILITY_SKILLS.length);
      }
      // Every unlock skill the doc's prose names is a real skill dir.
      const names = skillDirs();
      expect(names.every((name) => body.includes(name) || !body.includes("Unlocking skills"))).toBe(true);
    }
  });
});
