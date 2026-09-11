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
 *
 * The scan covers **git-tracked** files, which matches the design's "clean tree"
 * precondition; a stray untracked copy under `skills/` is still caught, because scenario 1
 * reads that directory from the filesystem rather than from git.
 *
 * Scenarios 4–5 cover the R6/R7 amendment: one folder per topic (so a single-part topic and
 * an umbrella share one shape on disk), and one identity model for the two flows (so the
 * four discovery skills cannot disagree about which topic is being finalized).
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

/** Read a repo-relative file as UTF-8. */
function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** The four skills that discover in-flight planning artifacts. */
const DISCOVERY_SKILLS = [
  "skills/pwk-brainstorming/SKILL.md",
  "skills/pwk-executing-tasks/SKILL.md",
  "skills/pwk-status/SKILL.md",
  "skills/pwk-finalizing/SKILL.md",
];

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
    }
  });

  it("scenario 4 — one folder per topic: every in-flight topic folder conforms, and no flat topic docs exist", () => {
    const plansDir = join(repoRoot, "docs/plans");
    const topicFolders = readdirSync(plansDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "completed")
      .map((entry) => entry.name);

    // Every in-flight topic folder is the one shape: leaf docs inside it, and each leaf's
    // progress file pointing back at its own design doc in that same folder. Stated
    // universally on purpose — a finalized topic leaves no folder, so the rule simply has
    // nothing to check, and the next topic is covered the moment it is created with no
    // fixture to keep in sync. (This topic was the first live exercise of the layout; it is
    // disposed at finalize, which is why the assertion is over any folder rather than the
    // one this feature happened to create.)
    for (const folder of topicFolders) {
      const leaves = readdirSync(join(plansDir, folder));
      const designs = leaves.filter((name) => name.endsWith("-design.md"));
      expect(designs.length, `${folder} must hold at least one leaf design doc`).toBeGreaterThan(0);
      for (const design of designs) {
        const leaf = design.replace(/-design\.md$/, "");
        const progressName = `${leaf}-progress.md`;
        if (!leaves.includes(progressName)) continue; // design-only topic: not executed yet
        const progress = readFileSync(join(plansDir, folder, progressName), "utf8");
        expect(progress, `${folder}/${progressName} Design: ref`).toMatch(
          new RegExp(`^Design: docs/plans/${folder}/${design}$`, "m"),
        );
      }
    }

    // R6's rule: new work is always a folder. A flat dated topic doc at the docs/plans top
    // level is the retired shape reappearing — legacy flat topics stay readable and
    // resumable, but are never newly written.
    const flat = trackedFiles().filter((rel) =>
      /^docs\/plans\/\d{4}-\d{2}-\d{2}-[^/]+-(design|progress|review-packet.*|notes)\.md$/.test(rel),
    );
    expect(flat, `flat topic docs at the docs/plans top level:\n${flat.join("\n")}`).toEqual([]);

    // Every discovery skill speaks the one folder form, so a single-part topic and an umbrella
    // are the same shape to all four of them.
    for (const skill of DISCOVERY_SKILLS) {
      expect(readRepo(skill), `${skill}: folder-form write/discovery path`).toMatch(/docs\/plans\/<date>-<topic>\//);
    }
  });

  it("scenario 5 — one identity model: the two flows cannot disagree about the topic", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const finalizing = readRepo("skills/pwk-finalizing/SKILL.md");
    const lint = readRepo("tests/skill-lint.mjs");

    // 1. Umbrella detection is local — the rule executing-tasks already states, now shared.
    //    A repo-wide overview search would let a sibling umbrella take over this topic's finalize.
    expect(finalizing, "finalizing must not re-derive the umbrella from a repo-wide search").not.toMatch(
      /docs\/plans\/\*\*\/overview\.md` exists/,
    );
    expect(finalizing, "the umbrella is read beside the design doc").toMatch(
      /`overview\.md`[^\n]*beside the design doc/,
    );
    expect(executing, "executing-tasks keeps the local rule").toMatch(
      /never a repo-wide `docs\/plans\/\*\*\/overview\.md`/,
    );

    // 2. `<topic>` has one meaning (the folder slug) in both skills, so the worktree probe
    //    and the branch name agree for a standalone topic and an umbrella part alike.
    expect(executing, "<topic> is defined as the folder slug").toMatch(/is the folder slug/);
    expect(finalizing, "finalizing uses the same slug meaning").toMatch(/is the folder slug/);

    // 3. The next part is the first roster part with no `done` progress file — build order is
    //    advisory, so the roster successor would skip a part built out of order.
    expect(executing, "next-part predicate ignores the roster successor").toMatch(
      /first roster part with no `done` progress file/,
    );

    // 4. The roster shape two consumers read is pinned by lint, so drift fails loudly
    //    instead of silently disposing nothing.
    expect(lint, "roster heading pinned").toContain("## Parts (build order)");

    // 5. Retired prose is gone: plans merged into design docs in 2.0, and "integration tests"
    //    is the stale term R4 had to route around.
    expect(readRepo("docs/developer-usage-guide.md"), "retired plan/integration-test prose").not.toMatch(
      /integration tests/,
    );
    expect(lint, "retired integration-gate wording").not.toMatch(/integration gate/);

    // 6. Disposal precedence is stated, not implied: for a folder topic the flat globs must not
    //    run, or a leaf slug that collides with an unrelated flat topic deletes a foreign doc.
    expect(finalizing, "folder command takes precedence over the flat globs").toMatch(
      /the folder command is the disposal/,
    );
  });
});
