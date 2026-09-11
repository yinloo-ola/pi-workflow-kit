import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIGEST_MARKERS, LEAN_GATES_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/**
 * Feature acceptance for leaner-execution-gates.
 *
 * The deliverable is skill/document text, so the observable interface is the
 * content the host loads: these encode the design doc's `## Feature acceptance`
 * scenarios through that interface.
 */
describe("leaner execution gates (feature E2E)", () => {
  it("should reach the ship checkpoint as the only mandatory stop, with a navigable digest and no reviewer roles when the design carries no risk", () => {
    const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    const finalizing = read("skills/pwk-finalizing/SKILL.md");

    // R1 — the silent per-requirement review tag is gone; the human owns the tag.
    expect(brainstorming).toContain(LEAN_GATES_MARKERS.onlyHumanTags);
    expect(brainstorming).not.toContain(SINGLE_DOC_MARKERS.autoTagTruth);
    expect(executing).not.toMatch(/auto-tag default/i);

    // R2 — one risk-scaled feature review, keyed on the design's own risk content.
    expect(brainstorming).toContain(LEAN_GATES_MARKERS.featureReviewTag);
    expect(brainstorming).toContain(LEAN_GATES_MARKERS.autoKeyedOnRisk);
    expect(executing).toContain(LEAN_GATES_MARKERS.autoKeyedOnRisk);
    expect(executing).toContain(LEAN_GATES_MARKERS.explicitTagWins);

    // R2 sweep — every consumer site describes the conditional, not an unconditional
    // four-role review (a glob-scope change must enumerate all its consumers).
    for (const rel of [
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "docs/oversight-model.md",
      "README.md",
    ]) {
      const doc = read(rel);
      expect(doc, rel).toMatch(/production-risk content/);
      expect(doc, rel).toMatch(/risk-scaled|or one inline pass|otherwise one inline|one inline pass when it does not/);
    }

    // R3 sweep — the retired `feature-spec` display state appears in no example line.
    for (const rel of ["skills/pwk-executing-tasks/SKILL.md", "skills/pwk-status/SKILL.md"]) {
      const bare = read(rel)
        .split("\n")
        .filter((line) => /feature-spec(?!-paused)/.test(line));
      expect(bare, `${rel} still uses the retired feature-spec vocabulary`).toEqual([]);
    }

    // R3 — the reserved failure stops survive the notice (they are the reason the
    // notice is safe): ungreenable E2E and an immediately-passing wrong E2E both halt.
    expect(executing).toMatch(/stop and present/i);
    expect(executing).toMatch(/genuinely blocked/i);

    // R3 — the feature-spec stop is a notice; the ship stop remains the one stop.
    expect(executing).toContain(LEAN_GATES_MARKERS.specNotice);
    expect(executing).not.toMatch(/CHECKPOINT: feature-spec/);
    expect(executing).toContain(DIGEST_MARKERS.shipCheckpoint);
    expect(read("skills/pwk-status/SKILL.md")).toContain(LEAN_GATES_MARKERS.statusExecuteZero);

    // R3 — status renders the pre-implementation state as execute 0/N, never as
    // the retired `feature-spec` display state.
    const status = read("skills/pwk-status/SKILL.md");
    expect(status).not.toMatch(/feature-spec-paused`\s*→\s*`feature-spec/);
    expect(status).not.toMatch(/→\s*`feature-spec`/);

    // R4 — the checkpoint enum is none | full across every consumer site, and the
    // retired `spec` value is gone from the enumerations and the paired rule.
    expect(brainstorming).toContain(LEAN_GATES_MARKERS.checkpointsEnum);
    expect(executing).toContain(LEAN_GATES_MARKERS.checkpointsEnumRow);
    for (const rel of [
      "skills/pwk-brainstorming/SKILL.md",
      "skills/pwk-executing-tasks/SKILL.md",
      "docs/workflow-phases.md",
      "docs/developer-usage-guide.md",
      "README.md",
    ]) {
      const specLines = read(rel)
        .split("\n")
        .filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
      expect(specLines, `${rel} still enumerates \`spec\``).toEqual([]);
      expect(read(rel), rel).not.toMatch(/requires at least `inline`/);
    }

    // R5 — the digest's Flow is a navigable map: spine + branches + was: clause +
    // side effects, symbol labels, no line numbers, capped with a deep-read offer.
    expect(executing).toContain(LEAN_GATES_MARKERS.flowSpine);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowBranches);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowWasClause);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowSideEffects);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowNoLineNumbers);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowCap);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowWalkthroughOffer);
    // The Execution summary stays four columns — no location/commit column.
    expect(DIGEST_MARKERS.execSummaryTable).toBe("| R# | Requirement | How it was built | Deviated? |");
    expect(executing).not.toMatch(/\|\s*Look at\s*\|/);

    // R6 — the Flow must agree with reviewed reality, and disagreements surface.
    expect(executing).toContain(LEAN_GATES_MARKERS.flowTruth);
    expect(executing).toContain(LEAN_GATES_MARKERS.flowSurfaced);

    // The clean end of the flow is unchanged: finalize still ships it.
    expect(finalizing).toContain("pwk-finalizing");
  });

  it("should request exactly four reviewer roles over the whole diff when the design carries risk content, plus only the explicitly tagged slice reviews", () => {
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    const brainstorming = read("skills/pwk-brainstorming/SKILL.md");

    // R2 — the auto resolution keys on either mirrored risk signal, and the four
    // roles run once over the whole feature diff (never once per requirement).
    expect(executing).toContain("pwk-spec-reviewer");
    expect(executing).toContain("pwk-tracing-reviewer");
    expect(executing).toContain("pwk-smell-reviewer");
    expect(executing).toContain("pwk-hazard-reviewer");
    expect(brainstorming).toContain("Production-risk");
    expect(executing).toMatch(/whole feature diff/);
    expect(executing).not.toMatch(/auto-tag/i);

    // R1 — an explicit human tag is the only path to a per-requirement review;
    // the untagged requirements get none.
    expect(executing).toContain(LEAN_GATES_MARKERS.onlyHumanTags);
    expect(executing).toMatch(/review-packet-r<N>\.md/);

    // R6 — in inline mode (no tracing role) the Flow is checked against the
    // spec-coverage pass instead.
    expect(executing).toMatch(/spec-coverage|coverage pass/);
  });

  it("should render a pre-implementation topic as execute 0/N in pwk-status", () => {
    const status = read("skills/pwk-status/SKILL.md");

    // R3 — `e2e-written` is a real state that routes into implementation; the
    // legacy `feature-spec-paused` file renders the same way.
    expect(status).toContain("`e2e-written`");
    expect(status).toContain(LEAN_GATES_MARKERS.statusExecuteZero);
    expect(status).toContain("`feature-spec-paused`");
    expect(status).not.toMatch(/feature-spec\b(?!-paused)/);
  });
});
