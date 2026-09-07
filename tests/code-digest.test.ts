import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CODE_DIGEST_MARKERS } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const DISCOVERY_SITES = [
  "skills/pwk-brainstorming/SKILL.md",
  "skills/pwk-executing-tasks/SKILL.md",
  "skills/pwk-status/SKILL.md",
  "skills/pwk-finalizing/SKILL.md",
] as const;

const MIRROR_DOCS = ["README.md", "docs/workflow-phases.md", "docs/developer-usage-guide.md"] as const;

// Byte-identical regression guard (R5): the finalize disposal commands and
// their anchoring comments must not change — the exclusion is wording-only.
// Literals transcribed from the pre-feature file (verify with the per-slice test).
const FINALIZE_DISPOSAL_LINES = [
  "rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md docs/plans/????-??-??-<topic>-review-packet*.md",
  "# The folder path is taken verbatim from the discovered docs/plans/**/overview.md",
  "rm -rf docs/plans/<date>-<umbrella>/",
  "mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-review-packet*.md   docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/<date>-<umbrella>/ docs/plans/completed/",
  "ls docs/plans/completed/<date>-<umbrella>/ >/dev/null",
] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("code-digest per-slice", () => {
  it("should add the code-digest section to the progress template", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    // The progress-file template is the ```markdown fence containing "# Progress:".
    const start = executing.indexOf("# Progress:");
    if (start === -1) throw new Error("executing skill: progress template not found");
    const end = executing.indexOf("```", start);
    const template = executing.slice(start, end);
    const execSummaryAt = template.indexOf("## Execution summary");
    const digestAt = template.indexOf(CODE_DIGEST_MARKERS.codeDigest);
    expect(digestAt).toBeGreaterThan(execSummaryAt); // directly below the execution summary
    expect(template.slice(digestAt)).toMatch(/### Summary[\s\S]*### Flow[\s\S]*### Gotchas[\s\S]*### Key files/);
    expect(template).toContain(CODE_DIGEST_MARKERS.digestOnceOnly);
  });
  it("should write the digest after review success, derived from the packet", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const stepAt = executing.indexOf("**Write the code digest**");
    expect(stepAt).toBeGreaterThan(-1);
    // placed between the feature review (step 3) and the ship pause (step 5)
    const reviewAt = executing.indexOf("**Run the feature review**");
    const pauseAt = executing.indexOf("**⏸ CHECKPOINT: ship**");
    expect(reviewAt).toBeGreaterThan(-1);
    expect(pauseAt).toBeGreaterThan(-1);
    expect(stepAt).toBeGreaterThan(reviewAt);
    expect(stepAt).toBeLessThan(pauseAt);
    const stepLine = executing.slice(stepAt, executing.indexOf("\n", stepAt));
    expect(stepLine).toContain("`## Commits`");
    expect(stepLine).toContain("`## Changed files`");
    expect(stepLine).toContain("`## Diff`");
    const stepBlock = executing.slice(stepAt, stepAt + 900);
    expect(stepBlock).toMatch(/re-run the recipe/); // stale/missing packet
    expect(stepBlock).toMatch(/`Feature phase: reviewing`/); // resume path fires the same write point
  });
});

describe("code-digest feature (E2E)", () => {
  it("should compose digest-at-completion, archive-blind discovery, and frontier questioning across the kit", () => {
    // R1–R4 — the executing skill wires a code digest from the packet into the
    // progress file and presents it at the ship checkpoint.
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const execSummaryAt = executing.indexOf("## Execution summary");
    const digestAt = executing.indexOf(CODE_DIGEST_MARKERS.codeDigest);
    expect(digestAt).toBeGreaterThan(-1);
    expect(execSummaryAt).toBeGreaterThan(-1);
    expect(digestAt).toBeGreaterThan(execSummaryAt); // directly below the execution summary
    for (const sub of ["### Summary", "### Flow", "### Gotchas", "### Key files"]) {
      expect(executing.indexOf(sub)).toBeGreaterThan(digestAt);
    }
    expect(executing).toContain(CODE_DIGEST_MARKERS.digestOnceOnly);
    expect(executing).toContain(CODE_DIGEST_MARKERS.alertReviewerConfirmedOnly);
    expect(executing).toContain(CODE_DIGEST_MARKERS.honestEmptyGotchas);
    expect(executing).toContain(CODE_DIGEST_MARKERS.keyFilesCap);
    expect(executing).toMatch(/full diff on request/i); // digest supplements, never replaces

    // R5 — every recursive discovery glob excludes completed/, and the finalize
    // disposal commands stay byte-identical (wording-only change elsewhere).
    for (const site of DISCOVERY_SITES) {
      const content = readRepo(site);
      expect(content, site).toContain(CODE_DIGEST_MARKERS.completedExclusion);
    }
    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
    for (const line of FINALIZE_DISPOSAL_LINES) {
      expect(finalize).toContain(line);
    }

    // R6–R9 — brainstorming interviews in frontier rounds with recommended
    // answers, looks facts up, gates assumptions, and stops only when the
    // frontier is empty; the planner bounces un-derivable requirements.
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.frontier);
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.recommendedAnswer);
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.nothingToAsk);
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.factsNeverAsked);
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.assumptionGate);
    expect(brainstorming).toContain(CODE_DIGEST_MARKERS.nothingSilentlyAssumed);
    const principlesLine = brainstorming.match(/## Principles\n\n- [^\n]*/)?.[0];
    if (!principlesLine) throw new Error("brainstorming: Principles list not found");
    expect(principlesLine).not.toContain("One question at a time"); // defining line only
    const writingPlans = readRepo("skills/pwk-writing-plans/SKILL.md");
    expect(writingPlans).toContain(CODE_DIGEST_MARKERS.bounceToBrainstorm);
    expect(writingPlans).toMatch(/inventing behavior/);

    // R10 — the user docs mirror all three behaviors.
    for (const doc of MIRROR_DOCS) {
      const content = readRepo(doc);
      expect(content, doc).toMatch(/code digest/i);
      expect(content, doc).toContain(CODE_DIGEST_MARKERS.completedExclusion);
      expect(content, doc).toMatch(/frontier/i);
    }
  });
});
