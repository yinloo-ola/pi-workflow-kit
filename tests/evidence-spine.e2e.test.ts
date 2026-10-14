import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EVIDENCE_SPINE_MARKERS as ESM } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** Marker -> the files that must each contain it exactly once. */
const OWNERS: Partial<Record<keyof typeof ESM, string[]>> = {
  briefRule: ["skills/pwk-brainstorming/SKILL.md"],
  zeroContextRule: ["skills/pwk-brainstorming/SKILL.md"],
  interpretationMark: ["skills/pwk-brainstorming/SKILL.md"],
  runnableFacts: ["skills/pwk-brainstorming/SKILL.md"],
  sketchClause: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
  inconclusiveMark: ["skills/pwk-brainstorming/SKILL.md"],
  probeTest: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
  probeKinds: ["skills/pwk-brainstorming/SKILL.md", "skills/pwk-brainstorming/references/design-format.md"],
  evidenceColumn: ["skills/pwk-executing-tasks/references/progress-format.md", "skills/pwk-executing-tasks/SKILL.md"],
  evidencePairing: ["skills/pwk-executing-tasks/references/progress-format.md"],
  singleProbe: ["skills/pwk-executing-tasks/references/progress-format.md"],
  evidenceRefusal: ["skills/pwk-executing-tasks/references/progress-format.md"],
  evidenceFillStep: ["skills/pwk-executing-tasks/SKILL.md"],
  digestQuotesEvidence: ["skills/pwk-finalizing/SKILL.md"],
};

/**
 * Feature acceptance for evidence-spine.
 *
 * The deliverable is skill/document text, so the observable interface is the
 * content the host loads (the kit's E2E idiom). Scenario 1 proves each rule's
 * marker sentence greps exactly once in its owning file (and that the bare
 * four-column execution summary is gone from the template); scenario 2 proves
 * the README and workflow-phases name the four rules where their phases are
 * described. The full gate (`npm run check`) runs at the ship checkpoint.
 */
describe("evidence-spine (feature E2E)", () => {
  it("scenario 1 — each rule's marker sentence appears exactly once in its owning file", () => {
    for (const [marker, files] of Object.entries(OWNERS)) {
      for (const rel of files ?? []) {
        const occurrences = read(rel).split(ESM[marker as keyof typeof ESM]).length - 1;
        expect(occurrences, `${marker} in ${rel}`).toBe(1);
      }
    }
  });

  it("scenario 1 (continued) — the bare four-column execution summary is gone from the template", () => {
    expect(read("skills/pwk-executing-tasks/references/progress-format.md")).not.toMatch(
      /^\| R# \| Requirement \| How it was built \| Deviated\? \|$/m,
    );
  });

  it("scenario 2 — the README and workflow-phases name the four rules where their phases are described", () => {
    for (const rel of ["README.md", "docs/workflow-phases.md"]) {
      const doc = read(rel);
      expect(doc, `${rel} names the PRD brief`).toContain(ESM.briefName);
      expect(doc, `${rel} names the decide-by-experiment tier`).toContain(ESM.tierName);
      expect(doc, `${rel} names the probe test`).toContain(ESM.probeName);
      expect(doc, `${rel} names Evidence rows`).toContain(ESM.evidenceName);
    }
  });
});
