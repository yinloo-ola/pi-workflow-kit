import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TOOL_FREEDOM_MARKERS } from "./markers.mjs";
import { sweepSkillDir } from "./prescription-sweep.mjs";

/**
 * Feature acceptance for harness-neutral tool phrasing.
 *
 * The deliverable is skill/role-contract text plus a lint rule, so the observable
 * interface is the content the host loads plus skill-lint's exit behavior.
 * `npm run check` is the outer gate (this file runs inside it): its green run is
 * the "everything passes with zero unframed, unsanctioned commands" scenario,
 * asserted here as the content invariants that make the gate green. The second
 * design scenario — an editor reintroducing a bare prescription into any skill's
 * content — is encoded as a real skill-lint run against a kit copy.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skillsRoot = join(repoRoot, "skills");
const SKILLS = [
  "pwk-brainstorming",
  "pwk-code-review",
  "pwk-executing-tasks",
  "pwk-finalizing",
  "pwk-status",
  "pwk-walkthrough",
];
const REVIEWERS = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];
const ROLES = [...REVIEWERS, "pwk-recon-scout"];

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** The clause paragraph: the blank-line-delimited block containing the marker fragment. */
function clauseParagraph(content: string): string {
  const paragraph = content.split(/\n{2,}/).find((block) => block.includes(TOOL_FREEDOM_MARKERS.toolFreedom));
  expect(paragraph, "tool-freedom clause paragraph present").toBeTruthy();
  return paragraph as string;
}

describe("harness-neutral tool phrasing (feature E2E)", () => {
  it("carries the tool-freedom clause, byte-identical, in all six skills", () => {
    const paragraphs = SKILLS.map((name) => {
      const content = read(`skills/${name}/SKILL.md`);
      // The canonical clause string itself is the byte-identity pin.
      expect(content).toContain(TOOL_FREEDOM_MARKERS.clause);
      return clauseParagraph(content);
    });
    for (const paragraph of paragraphs.slice(1)) {
      expect(paragraph).toBe(paragraphs[0]);
    }
  });

  it("precedes every finalizing disposal block with the invariant sentence, commands unchanged", () => {
    const finalizing = read("skills/pwk-finalizing/SKILL.md");
    const blocks = [...finalizing.matchAll(/```bash\n([\s\S]*?)```/g)];
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      const before = finalizing.slice(0, block.index ?? 0);
      const lastLine = before
        .split(/\n/)
        .filter((line) => line.trim() !== "")
        .at(-1);
      expect(lastLine, "invariant sentence immediately before every disposal fence").toContain(
        TOOL_FREEDOM_MARKERS.disposalInvariant,
      );
    }
    // The canonical example keeps the pinned disposal commands byte-unchanged.
    for (const anchor of [
      "rm -rf docs/plans/<date>-<topic>/",
      "mv docs/plans/<date>-<topic>/ docs/plans/completed/",
      "ls docs/plans/completed/<date>-<topic>/ >/dev/null",
    ]) {
      expect(finalizing).toContain(anchor);
    }
  });

  it("carries the floor-not-prescription line in all five role contracts, reviewers byte-identical", () => {
    for (const role of ROLES) {
      expect(read(`agents/${role}.md`)).toContain(TOOL_FREEDOM_MARKERS.floorLine);
    }
    const heading = "## Your checklist";
    const conduct = REVIEWERS.map((name) => {
      const body = read(`agents/${name}.md`).replace(/^[\s\S]*?\n---\n/, "");
      return body.slice(0, body.indexOf(heading) + heading.length);
    });
    expect(conduct[0]).toBe(conduct[1]);
    expect(conduct[0]).toBe(conduct[2]);
    expect(conduct[0]).toBe(conduct[3]);
  });

  it("sweeps the shipped skill content with zero violations", () => {
    const names = readdirSync(skillsRoot).filter((d) => statSync(join(skillsRoot, d)).isDirectory());
    for (const name of names) {
      expect(sweepSkillDir(skillsRoot, name), name).toEqual([]);
    }
  });

  it("fails skill-lint on a kit copy with a reintroduced bare prescription, naming file and command", () => {
    for (const skill of SKILLS) {
      const kit = mkdtempSync(join(tmpdir(), "pwk-sweep-"));
      try {
        for (const rel of [
          "skills",
          "agents",
          "extensions/workflow-guard.ts",
          "README.md",
          "docs/lessons.md",
          "docs/oversight-model.md",
          "docs/developer-usage-guide.md",
          "docs/workflow-phases.md",
        ]) {
          const target = join(kit, rel);
          mkdirSync(dirname(target), { recursive: true });
          cpSync(join(repoRoot, rel), target, { recursive: true });
        }
        mkdirSync(join(kit, "tests"));
        for (const file of ["skill-lint.mjs", "markers.mjs", "prescription-sweep.mjs"]) {
          cpSync(join(repoRoot, "tests", file), join(kit, "tests", file));
        }
        // The editor's regression: an unframed, unsanctioned command back in the content.
        const skillFile = join(kit, `skills/${skill}/SKILL.md`);
        const injected = `${readFileSync(skillFile, "utf8")}\n\nBefore continuing, run \`rm foo.txt\`.\n`;
        writeFileSync(skillFile, injected);
        const result = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { encoding: "utf8" });
        expect(result.status, skill).not.toBe(0);
        expect(`${result.stdout}${result.stderr}`, skill).toContain(`${skill}/SKILL.md`);
        expect(`${result.stdout}${result.stderr}`, skill).toContain("rm foo.txt");
      } finally {
        rmSync(kit, { recursive: true, force: true });
      }
    }
  });
});
