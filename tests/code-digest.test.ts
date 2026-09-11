import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CODE_DIGEST_MARKERS, LEAN_GATES_MARKERS } from "./markers.mjs";

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
// Re-anchored by the R6/R7 amendment: the topic folder replaced the flat
// per-file globs as the disposal unit (single-leaf topic and umbrella alike),
// and the precedence rule now says so explicitly.
const FINALIZE_DISPOSAL_LINES = [
  "rm -rf docs/plans/<date>-<topic>/",
  "# The folder path is taken verbatim from discovery — never typed or",
  "rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md docs/plans/????-??-??-<topic>-review-packet*.md docs/plans/????-??-??-<topic>-notes.md",
  "mv docs/plans/<date>-<topic>/ docs/plans/completed/",
  "ls docs/plans/completed/<date>-<topic>/ >/dev/null",
  "mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-review-packet*.md   docs/plans/completed/ 2>/dev/null || true",
  "mv docs/plans/????-??-??-<topic>-notes.md            docs/plans/completed/ 2>/dev/null || true",
  "**Disposal precedence:** for a folder topic the folder command is the disposal",
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
  it("should present the digest after the execution summary", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const listAt = executing.indexOf("present, in this order:");
    expect(listAt).toBeGreaterThan(-1);
    const list = executing.slice(listAt, listAt + 800);
    const summaryAt = list.indexOf("the **execution summary**");
    const digestAt = list.indexOf("the **code digest**");
    const diffAt = list.indexOf("full diff on request");
    expect(summaryAt).toBeGreaterThan(-1);
    expect(digestAt).toBeGreaterThan(-1);
    expect(diffAt).toBeGreaterThan(-1);
    expect(digestAt).toBeGreaterThan(summaryAt); // after the execution summary
    expect(digestAt).toBeLessThan(diffAt); // before diff-on-request, which stays last
  });
  it("should state the digest fill rules", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const rulesAt = executing.indexOf("## Code digest` is filled once");
    expect(rulesAt).toBeGreaterThan(-1);
    const rules = executing.slice(rulesAt, rulesAt + 700); // scoped: several phrases exist elsewhere
    expect(rules).toMatch(/plain language/i);
    expect(rules).toContain("R# anchors");
    expect(rules).toContain("no test names");
    expect(rules).toContain("A -> B -> C");
    expect(rules).toContain(CODE_DIGEST_MARKERS.alertReviewerConfirmedOnly);
    expect(rules).toContain(CODE_DIGEST_MARKERS.honestEmptyGotchas);
    expect(rules).toContain(CODE_DIGEST_MARKERS.keyFilesCap);
  });

  // leaner-execution-gates R5 — the Flow becomes a navigable map: spine + branches +
  // was: clauses + inline values + side effects, symbol-labelled, no line numbers.
  it("should enrich the Flow into a spine/branches map with no line numbers", () => {
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const flowAt = executing.indexOf("**Flow shape**");
    expect(flowAt).toBeGreaterThan(-1);
    const flow = executing.slice(flowAt, flowAt + 1400);
    expect(flow).toContain(LEAN_GATES_MARKERS.flowSpine); // Spine
    expect(flow).toContain(LEAN_GATES_MARKERS.flowBranches); // Branches
    expect(flow).toContain(LEAN_GATES_MARKERS.flowWasClause); // was:
    expect(flow).toContain(LEAN_GATES_MARKERS.flowSideEffects); // Side effects
    expect(flow).toContain(LEAN_GATES_MARKERS.flowNoLineNumbers);
    expect(flow).toContain(LEAN_GATES_MARKERS.flowCap); // 15 lines
    expect(flow).toContain(LEAN_GATES_MARKERS.flowWalkthroughOffer);
    expect(flow).toMatch(/symbol|module/); // greppable labels, not paths
    // honest-empty: the was: clause and the side-effects line are both optional
    expect(flow).toMatch(/additive|no was:/i);
    expect(flow).toMatch(/omit/i);
    // the [R#] hop tag ties the Flow to the coverage table
    expect(flow).toContain("[R<n>]");
  });
  it("should exclude completed/ from every recursive discovery glob", () => {
    const sites: Array<[string, string]> = [
      ["skills/pwk-status/SKILL.md", "1. **Discover**"],
      ["skills/pwk-brainstorming/SKILL.md", "**Discovery**"],
      ["skills/pwk-executing-tasks/SKILL.md", "**Find the doc**"],
      ["skills/pwk-finalizing/SKILL.md", "Read **every** relevant progress file"],
      ["skills/pwk-finalizing/SKILL.md", "**Multi-leaf topic**"],
    ];
    for (const [file, anchor] of sites) {
      const content = readRepo(file);
      const at = content.indexOf(anchor);
      expect(at, file).toBeGreaterThan(-1);
      expect(content.slice(at, at + 400), file).toContain(CODE_DIGEST_MARKERS.completedExclusion);
    }
    // the post-review routing block states the exclusion too
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    const routingAt = executing.indexOf("## After the feature review");
    const presentAt = executing.indexOf("Present:", routingAt);
    expect(routingAt).toBeGreaterThan(-1);
    expect(presentAt, "routing end anchor missing").toBeGreaterThan(routingAt);
    const routing = executing.slice(routingAt, presentAt);
    expect(routing).toContain(CODE_DIGEST_MARKERS.completedExclusion);
  });

  it("should leave finalize disposal commands unchanged", () => {
    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
    for (const line of FINALIZE_DISPOSAL_LINES) {
      expect(finalize).toContain(line);
    }
  });
  it("should replace one-question-at-a-time with frontier rounds", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const step3 = brainstorming.slice(
      brainstorming.indexOf("**Understand the idea**"),
      brainstorming.indexOf("**Codebase recon**"),
    );
    expect(step3).toContain(CODE_DIGEST_MARKERS.frontier);
    expect(step3).toContain(CODE_DIGEST_MARKERS.recommendedAnswer);
    expect(step3).toMatch(/number each question/i);
    // single-decision carve-out names all four approvals
    for (const approval of ["approach selection", "umbrella split", "design approval", "ADR unlock"]) {
      expect(step3).toContain(approval);
    }
    const principles = brainstorming.match(/## Principles\n\n(?:- [^\n]*\n?){1,2}/)?.[0];
    if (!principles) throw new Error("brainstorming: Principles list not found");
    expect(principles).not.toContain("One question at a time"); // defining line only
    expect(principles).toContain("frontier"); // replaced by the frontier principle
    expect(principles).toContain("No silent assumptions"); // and the no-assumption principle
  });

  it("should walk every checklist dimension visibly", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const step3 = brainstorming.slice(
      brainstorming.indexOf("**Understand the idea**"),
      brainstorming.indexOf("**Codebase recon**"),
    );
    for (const dimension of [
      "Goal & scope",
      "Data & state",
      "Behavior & edge cases",
      "Errors & failure",
      "Integration",
      "Non-functional",
    ]) {
      expect(step3, dimension).toContain(dimension);
    }
    expect(step3).toContain(CODE_DIGEST_MARKERS.nothingToAsk);
  });
  it("should look up facts instead of asking the human", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const step3 = brainstorming.slice(
      brainstorming.indexOf("**Understand the idea**"),
      brainstorming.indexOf("**Codebase recon**"),
    );
    expect(step3).toContain(CODE_DIGEST_MARKERS.factsNeverAsked);
    expect(step3).toMatch(/looked up/);
    expect(step3).toMatch(/only decisions are asked/i);
    // non-blocking: a pending lookup holds only its downstream questions
    expect(step3).toMatch(/downstream/);
    expect(step3).toMatch(/asked now/);
  });
  it("should sweep assumptions before the design summary", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const gate = brainstorming.slice(
      brainstorming.indexOf("**Present the design**"),
      brainstorming.indexOf("Identified a significant architectural decision"),
    );
    expect(gate).toContain(CODE_DIGEST_MARKERS.assumptionGate);
    expect(gate).toMatch(/numbered question/);
    expect(gate).toMatch(/recommended answer/);
    expect(gate).toMatch(/honest empty gate|no unconfirmed assumptions/i); // honest when clean
    expect(gate).toMatch(/no business behavior enters the design doc on the agent/); // hard rule
    expect(gate).toMatch(/woven into/); // confirmed facts woven in
    expect(gate).toMatch(/no new (template )?section/i); // no template churn
  });
  it("should stop the interview on an empty frontier", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const step3 = brainstorming.slice(
      brainstorming.indexOf("**Understand the idea**"),
      brainstorming.indexOf("**Codebase recon**"),
    );
    expect(step3).toContain(CODE_DIGEST_MARKERS.nothingSilentlyAssumed);
    // the old feel-ready stop rule is gone from its defining sentence
    const summaryLine = step3.match(/[^\n]*present a short summary[^\n]*/)?.[0];
    if (!summaryLine) throw new Error("brainstorming: proceed-summary sentence not found");
    expect(summaryLine).not.toContain("Once you can articulate");
  });

  it("should bounce invented scenario behavior to the gate", () => {
    const brainstorming = readRepo("skills/pwk-brainstorming/SKILL.md");
    const step7 = brainstorming.slice(
      brainstorming.indexOf("Write the design doc"),
      brainstorming.indexOf("Splitting large issues"),
    );
    expect(step7).toMatch(/inventing behavior/);
    expect(step7).toMatch(/back through the assumption gate/);
  });

  it("should mirror digest, exclusion, and frontier wording in user docs", () => {
    for (const doc of MIRROR_DOCS) {
      const content = readRepo(doc);
      expect(content, doc).toMatch(/code digest/i);
      expect(content, doc).toContain(CODE_DIGEST_MARKERS.completedExclusion);
      expect(content, doc).toMatch(/frontier/i);
      // AC4: each doc links to the single source rather than restating the rule as its own
      expect(content, doc).toContain("single source");
      expect(content, doc).toContain("pwk-executing-tasks");
    }
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

    // R10 — the user docs mirror all three behaviors.
    for (const doc of MIRROR_DOCS) {
      const content = readRepo(doc);
      expect(content, doc).toMatch(/code digest/i);
      expect(content, doc).toContain(CODE_DIGEST_MARKERS.completedExclusion);
      expect(content, doc).toMatch(/frontier/i);
    }
  });
});
