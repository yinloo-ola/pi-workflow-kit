import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const REVIEW_ROLES = [
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
] as const;

const USER_DOCS = [
  "docs/workflow-phases.md",
  "docs/developer-usage-guide.md",
  "docs/oversight-model.md",
  "README.md",
] as const;

const GLOB_SITES = [
  "skills/pwk-brainstorming/SKILL.md",
  "skills/pwk-writing-plans/SKILL.md",
  "skills/pwk-executing-tasks/SKILL.md",
  "skills/pwk-status/SKILL.md",
  "skills/pwk-finalizing/SKILL.md",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function splitRoleBody(name: string): string {
  const content = readRepo(`agents/${name}.md`);
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
  return match[1];
}

function commonPrefix(texts: string[]): string {
  let prefix = texts[0];
  for (const text of texts.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < text.length && prefix[i] === text[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

describe("human review digests feature (E2E)", () => {
  it("should thread R# digests from design to coverage table", () => {
    // R1 — design docs open with an at-a-glance digest: plain summary + one row per
    // requirement; the trivial fast-path gets a single In-short line instead.
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    expect(brainstorming).toMatch(/## At a glance/);
    expect(brainstorming).toMatch(/immediately before [`]## Requirements[`]/);
    expect(brainstorming).toMatch(/\| R# \| Requirement in one line \| Risk \|/);
    expect(brainstorming).toMatch(/In short:/);
    expect(brainstorming).toMatch(/plain language/i);

    // R2 — plans carry a crosswalk the human confirms in one line, placed strictly
    // before Requirement 1 so the review-packet sed spans are untouched.
    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
    expect(writingPlans).toMatch(/## Crosswalk/);
    expect(writingPlans).toMatch(/\| R# \| Plan section \| Tests \|/);
    expect(writingPlans).toMatch(/strictly before [`]## Requirement 1[`]/);
    expect(writingPlans).toMatch(/one-line confirmation/);

    // R3 — the progress file carries an execution summary filled as requirements
    // land, and the ship checkpoint presents digest + coverage, diff on request.
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    expect(executing).toMatch(/## Execution summary/);
    expect(executing).toMatch(/\| R# \| Requirement \| How it was built \| Deviated\? \|/);
    expect(executing).toMatch(/same step as marking/);
    expect(executing).toMatch(/ship-paused/);
    expect(executing).toMatch(/coverage table/);
    expect(executing).toMatch(/diff on request/i);
    expect(executing).not.toMatch(/feature-complete-paused/);

    // R4 — the spec-reviewer report opens with a per-requirement coverage table,
    // keyed by the packet's requirement headings, while the four reviewers keep a
    // byte-identical shared conduct block.
    const specReviewer = splitRoleBody("pwk-spec-reviewer");
    expect(specReviewer).toMatch(/\| R# \| Verdict \| Evidence \|/);
    expect(specReviewer).toMatch(/covered \| gap \| scope-creep/);
    expect(specReviewer).toMatch(/## Requirement N/);
    expect(specReviewer).toMatch(/No findings/);
    const bodies = REVIEW_ROLES.map((name) => splitRoleBody(name));
    const shared = commonPrefix(bodies);
    expect(shared).toMatch(/read-only/i);
    expect(shared).toMatch(/packet/i);
    for (const [i, name] of REVIEW_ROLES.entries()) {
      expect(bodies[i].length, name).toBeGreaterThan(shared.length);
    }

    // R5 — every discovery site resolves docs one level down (umbrella folders).
    for (const site of GLOB_SITES) {
      expect(readRepo(site), site).toMatch(/docs\/plans\/\*\*\//);
    }
  });

  it("should gate shipping on done and keep the docs consistent", () => {
    // R6 — finalizing ships only Feature phase `done`; digest sections ride the
    // existing disposal globs and umbrella folders dispose as one unit.
    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
    expect(finalize).toMatch(/Feature phase/);
    expect(finalize).toMatch(/must be [`]done[`]/);
    expect(finalize).toMatch(/feature-complete-paused/);
    expect(finalize).toMatch(/docs\/plans\/<date>-<umbrella>\//);

    // The user-facing docs describe the new flow and none of them defaults the
    // human to reading the full plan or the whole diff.
    for (const doc of USER_DOCS) {
      expect(readRepo(doc), doc).toMatch(/At a glance/i);
      expect(readRepo(doc), doc).toMatch(/ship gate|ship checkpoint/i);
      expect(readRepo(doc), doc).not.toMatch(/you review the whole diff/i);
    }
    const readme = readRepo("README.md");
    expect(readme).toMatch(/diff on request/i);
    expect(readme).toMatch(/## Crosswalk/);
    const agents = readRepo("AGENTS.md");
    expect(agents).toMatch(/docs\/plans\/<date>-<umbrella>\//);
  });
});
