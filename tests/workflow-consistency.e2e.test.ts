import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
import { SINGLE_DOC_MARKERS, WORKFLOW_CONSISTENCY_MARKERS as WCM } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const M = WCM;

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** Every skill directory under skills/ — the inventory docs must name them all. */
function skillNames(): string[] {
  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("pwk-"))
    .sort();
}

/** The design-doc template's fenced block containing the Feature acceptance section. */
function brainstormTemplate(): string {
  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
  const fences = [...brainstorming.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  const withFa = fences.filter((body) => body.includes("## Feature acceptance"));
  expect(withFa.length, "brainstorming template with ## Feature acceptance").toBeGreaterThan(0);
  return withFa[0];
}

/**
 * Feature acceptance for workflow-consistency (the F1–F15 audit batch).
 *
 * The deliverable is skill/document text, so the observable interface is the
 * content the host loads (the kit's E2E idiom). Scenario 2 additionally executes
 * the packet FA span against the template itself via the per-slice fixture in
 * review-packet.test.ts (pinned FA_CMD) — both suites gate at the ship checkpoint.
 */
describe("workflow-consistency (feature E2E)", () => {
  it("scenario 1 — green gates after repair: phantom vocabulary dies everywhere and the inventory docs match reality", () => {
    const codeReview = read("skills/pwk-code-review/SKILL.md");
    const executing = read("skills/pwk-executing-tasks/SKILL.md");

    // F4/F10 — the phantom row value and plan remnants are gone from code-review.
    expect(codeReview).not.toMatch(/🔎 review/);
    expect(codeReview).not.toMatch(/integration tests/);
    expect(codeReview).toMatch(/acceptance criteria/);

    // F12 — the packet recipe no longer uses a bare merge-base placeholder.
    expect(executing).not.toMatch(/<merge-base>/);

    // F9 — the public flow vocabulary is design → execute → finalize everywhere it is stated.
    expect(read("README.md")).toContain(SINGLE_DOC_MARKERS.designFlow);
    for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md", "docs/workflow-phases.md", "docs/provider-delegation-contract.md"]) {
      expect(read(rel), rel).not.toMatch(/plan phase/i);
    }

    // F7/F8 — every skill is present in every inventory doc, and each unlock-prose
    // site lists the full UNLOCK_SKILLS set (source of truth: the guard export).
    const names = skillNames();
    expect(names.length).toBeGreaterThanOrEqual(7);
    for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md", "docs/workflow-phases.md"]) {
      const doc = read(rel);
      for (const name of names) {
        expect(doc, `${rel} names ${name}`).toContain(name);
      }
    }
    for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md"]) {
      const doc = read(rel);
      for (const skill of UNLOCK_SKILLS) {
        expect(doc, `${rel} unlock prose includes ${skill}`).toContain(skill);
      }
    }

    // F14 — the parity lint exists in skill-lint.
    expect(read("tests/skill-lint.mjs")).toContain(WCM.parityLint);
  });

  it("scenario 2 — the packet terminates on template-conformant docs and bases come from the Commit column", () => {
    // F6 — a design doc rendered verbatim from the brainstorming template carries
    // its own ### Feature review tag, so the packet's FA sed terminates on it.
    const template = brainstormTemplate();
    expect(template).toMatch(/^### Feature review/m);

    // F12 — the recipe names the Commit column as the source of truth for both spans.
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    expect(executing).toContain(WCM.commitColumnFill);
    expect(executing).toContain(WCM.featureBaseRule);
    expect(executing).toContain(WCM.perReqSpanRule);
  });

  it("scenario 3 — failure branches are reachable: done means resolved and finalizing stays the authority", () => {
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    const finalizing = read("skills/pwk-finalizing/SKILL.md");
    const status = read("skills/pwk-status/SKILL.md");

    // F1 — the ship gate accepts terminal rows, and the paths that create them
    // name their glyphs and surface them in the ship digest.
    expect(executing).toContain(WCM.shipGateTerminal);
    expect(executing).toContain(WCM.failedGlyphNamed);
    expect(executing).toContain(WCM.skippedGlyphNamed);
    expect(executing).toContain(WCM.digestListsVerdicts);
    expect(executing).toContain(WCM.knowingWhatFailed);
    expect(executing).toContain(WCM.resumeSkipsTerminal);

    // The consuming side is already correct — finalizing blocks on ❌, warns on ⏭,
    // and demands --force-failed; the gate stays `done`-keyed.
    expect(finalizing).toContain("❌ failed");
    expect(finalizing).toContain("⏭ skipped");
    expect(finalizing).toContain("--force-failed");
    expect(finalizing).toMatch(/must be `done`/);

    // F13 — status renders done with counts and hints the force-failed path.
    expect(status).toContain(WCM.statusDoneCounts);
    expect(status).toContain(WCM.statusForceFailedHint);
  });

  it("scenario 4 — the setup checkpoint survives a crash: the header is the signal", () => {
    const executing = read("skills/pwk-executing-tasks/SKILL.md");
    const status = read("skills/pwk-status/SKILL.md");

    // F2/F3 — the progress file exists before the checkpoint, carries a Setup slot,
    // and the resume rule re-verifies on pending instead of assuming.
    expect(executing).toContain(WCM.setupEnum);
    expect(executing).toContain(WCM.setupPendingInit);
    expect(executing).toContain(WCM.setupApprovalFlip);
    expect(executing).toContain(WCM.setupResumeRecheck);

    // Status renders the pre-approval state, and the inventory docs state the
    // checkpoint count conditionally (two stops with ## Setup, one without).
    expect(status).toContain(WCM.statusAwaitingSetup);
    const claimedSomewhere = [read("README.md"), read("docs/developer-usage-guide.md"), read("docs/oversight-model.md")];
    expect(claimedSomewhere.some((doc) => doc.includes(WCM.conditionalStops))).toBe(true);
  });
});
