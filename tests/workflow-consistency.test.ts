import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WORKFLOW_CONSISTENCY_MARKERS as M } from "./markers.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
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
  });

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
});
