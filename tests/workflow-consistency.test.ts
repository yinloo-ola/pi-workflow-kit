import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UNLOCK_SKILLS } from "../extensions/workflow-guard";
import { WORKFLOW_CONSISTENCY_MARKERS as M } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** Every skill directory under skills/ — the inventory docs must name them all (R6 per-slice). */
function skillNamesForR6(): string[] {
  return readdirSync(join(repoRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("pwk-"))
    .sort();
}

/** The design-doc template's fenced block containing the Feature acceptance section (shared by R5 per-slice and the E2E). */
function brainstormTemplateForR5(): string {
  const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
  const fences = [...brainstorming.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  const withFa = fences.filter((body) => body.includes("## Feature acceptance"));
  expect(withFa.length, "brainstorming template with ## Feature acceptance").toBeGreaterThan(0);
  return withFa[0];
}

/**
 * Per-slice tests for workflow-consistency (the F1–F15 audit batch). One describe
 * per requirement; the feature E2E in workflow-consistency.e2e.test.ts covers the
 * composed scenarios. Text-assertion is this kit's testing idiom: the skills are
 * the deliverable, so their content is the public interface.
 */
describe("workflow-consistency per-slice", () => {
  describe("R1 — one row-state and ceremony vocabulary", () => {
    it("defines the five Done glyphs and the ceremony echo values in one canonical block", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      expect(executing).toContain(M.rowStates);
      expect(executing).toContain(M.ceremonyEcho);
      expect(executing).toContain(M.fullTwoStops);
      expect(executing).toContain("`⏸ full`");
      expect(executing).toContain("`🔎 parallel`");
    });

    it("scopes the writers: code-review only ever flips 🔄 to ✅", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      const codeReview = read("skills/pwk-code-review/SKILL.md");
      expect(executing).toContain(M.codeReviewScoped);
      expect(codeReview).not.toMatch(/🔎 review/);
      expect(codeReview).toContain("set the requirement's Done cell `✅`");
    });
  }); // R1

  describe("R2 — terminal-state ship gate and reachable failure branches", () => {
    it("the ship gate, failure/skip paths, and resume all speak the terminal vocabulary", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      expect(executing).toContain(M.shipGateTerminal);
      expect(executing).toContain(M.failedGlyphNamed);
      expect(executing).toContain(M.skippedGlyphNamed);
      expect(executing).toContain(M.digestListsVerdicts);
      expect(executing).toContain(M.knowingWhatFailed);
      expect(executing).toContain(M.resumeSkipsTerminal);
      expect(executing).not.toMatch(/continue the next not-yet-✅ requirement/);
    });

    it("status renders done with verdict counts and hints the force-failed path", () => {
      const status = read("skills/pwk-status/SKILL.md");
      expect(status).toContain(M.statusDoneCounts);
      expect(status).toContain(M.statusForceFailedHint);
    });

    it("finalizing's consuming branches are untouched — the reachability fix is on the writing side", () => {
      const finalizing = read("skills/pwk-finalizing/SKILL.md");
      expect(finalizing).toContain("`❌ failed`");
      expect(finalizing).toContain("`⏭ skipped`");
      expect(finalizing).toContain("--force-failed");
    });

    it("pins the resume route, umbrella, legacy, reason-suffix, and coverage-reconciliation contracts (tracing findings 1–3, 5)", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      expect(executing).toContain(M.resumeTerminalRoute);
      expect(executing).toContain(M.umbrellaBlockRule);
      expect(executing).toContain(M.legacyFailureNote);
      expect(executing).toContain(M.reasonInShipGate);
      expect(executing).toContain(M.reasonSuffix);
      expect(executing).toContain(M.coverageReconciled);
    });

    it("scopes status verdict counts to Requirements-table rows; ADR 0007 exists (tracing findings 4, 6)", () => {
      const status = read("skills/pwk-status/SKILL.md");
      expect(status).toContain(M.statusVerdictGrep);
      expect(existsSync(join(repoRoot, "docs/adr/0007-resolved-requirements-ship-gate.md"))).toBe(true);
    });
  });

  describe("R3 — setup checkpoint made implementable", () => {
    it("creates the progress file before the checkpoint and gives the header a Setup slot", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      expect(executing).toContain(M.setupEnum);
      expect(executing).toContain(M.setupPendingInit);
      expect(executing).toContain(M.setupApprovalFlip);
      const createIdx = executing.indexOf("**Create the progress file**");
      const setupIdx = executing.indexOf("**Setup pre-flight**");
      expect(createIdx, "create-step must precede the setup checkpoint").toBeGreaterThan(-1);
      expect(createIdx).toBeLessThan(setupIdx);
    });

    it("resume re-checks a pending setup and status renders the awaiting state", () => {
      const executing = read("skills/pwk-executing-tasks/SKILL.md");
      const status = read("skills/pwk-status/SKILL.md");
      expect(executing).toContain(M.setupResumeRecheck);
      expect(status).toContain(M.statusAwaitingSetup);
    });

    it("checkpoint-count claims are conditional across every doc site", () => {
      for (const rel of ["README.md", "docs/oversight-model.md", "docs/developer-usage-guide.md"]) {
        const doc = read(rel);
        expect(doc, rel).toContain(M.conditionalStops);
        expect(doc, rel).not.toMatch(/one mandatory checkpoint|one hard human-review gate/);
      }
    });
  });

  describe("R4 — derived At-a-glance Risk column", () => {
    it("states the derivation rule and the display-only declaration exactly once", () => {
      const brainstorming = read("skills/pwk-brainstorming/SKILL.md");
      expect(brainstorming).toContain(M.riskDerived);
      expect(brainstorming).toContain(M.riskDisplayOnly);
      const occurrences = brainstorming.split(M.riskDisplayOnly).length - 1;
      expect(occurrences, "display-only declaration must be singular").toBe(1);
    });
  });

  describe("R5 — feature-acceptance template renders its review tag", () => {
    it("the brainstorming template's fenced FA block carries the Feature review tag line", () => {
      const template = brainstormTemplateForR5();
      expect(template).toMatch(/^\s*### Feature review/m);
    });

    it("skill-lint pins the tag in the template and the packet fixtures carry it", () => {
      const lint = read("tests/skill-lint.mjs");
      expect(lint).toContain("FA_TEMPLATE_TAG");
      const reviewPacket = read("tests/review-packet.test.ts");
      // the fixtures must exercise tag-present docs — the old tag-absent case is what let this defect survive.
      expect(reviewPacket).toContain("### Feature review: parallel");
    });
  });

  describe("R6 — inventory doc parity sweep", () => {
    it("all seven skills appear in every inventory doc", () => {
      const names = skillNamesForR6();
      expect(names.length).toBe(7);
      for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md", "docs/workflow-phases.md"]) {
        const doc = read(rel);
        for (const name of names) {
          expect(doc, `${rel} names ${name}`).toContain(name);
        }
        expect(doc, rel).not.toMatch(/5 pipeline skills|2 utility skills/);
      }
    });

    it("each unlock-prose site lists exactly the UNLOCK_SKILLS members", () => {
      for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/oversight-model.md"]) {
        const doc = read(rel);
        for (const skill of UNLOCK_SKILLS) {
          expect(doc, `${rel} unlock prose includes ${skill}`).toContain(skill);
        }
        expect(doc, rel).not.toMatch(/stays gated \(read-only orientation\)/);
        expect(doc, rel).not.toMatch(/instruments the repo root/);
      }
    });

    it("stale terminology is gone: plan-phase, plan remnants, guard-table Status row", () => {
      const codeReview = read("skills/pwk-code-review/SKILL.md");
      expect(codeReview).not.toMatch(/integration tests/);
      expect(codeReview).toContain("acceptance criteria");
      expect(codeReview).not.toMatch(/in the plan(?!ning)/);
      expect(codeReview).not.toMatch(/the human tagged this requirement/);
      for (const rel of ["README.md", "docs/developer-usage-guide.md", "docs/workflow-phases.md"]) {
        expect(read(rel), rel).toMatch(/design → execute → finalize/);
      }
      const guide = read("docs/developer-usage-guide.md");
      const diagnoseIdx = guide.indexOf("### Diagnose");
      const walkthroughIdx = guide.indexOf("### Walkthrough");
      expect(diagnoseIdx, "diagnose prose precedes the walkthrough block").toBeLessThan(walkthroughIdx);
    });
  });
});
