import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assessDelegationCoverage } from "../extensions/workflow-guard";
import { ROLE_NAMES, createCommandContext, createExtensionHarness } from "./helpers";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("harness-neutral delegation feature", () => {
  it("installs discoverable roles, preserves gated setup, and requires complete review coverage", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-delegation-"));
    const { commands, handlers } = createExtensionHarness();
    const notifications: string[] = [];
    const context = createCommandContext(projectRoot, notifications);

    expect(commands.has("pwk-setup")).toBe(true);

    await handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    await expect(commands.get("pwk-setup")?.handler("--force", context)).rejects.toThrow(/brainstorm|plan|gated/i);
    expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0);

    await handlers.get("session_start")?.({}, {});
    await commands.get("pwk-setup")?.handler("", context);

    const installedDir = join(projectRoot, ".agents", "agents");
    expect(readdirSync(installedDir).sort()).toEqual(ROLE_NAMES.map((name) => `${name}.md`).sort());
    for (const roleName of ROLE_NAMES) {
      expect(readFileSync(join(installedDir, `${roleName}.md`), "utf8")).toBe(
        readFileSync(join(repoRoot, "agents", `${roleName}.md`), "utf8"),
      );
    }
    expect(notifications.join("\n")).toContain("installed");

    const brainstorming = readFileSync(join(repoRoot, "skills/pwk-brainstorming/SKILL.md"), "utf8");
    const executing = readFileSync(join(repoRoot, "skills/pwk-executing-tasks/SKILL.md"), "utf8");
    expect(brainstorming).toContain("codebase-recon");
    expect(brainstorming).toContain("Scout: unavailable");
    expect(executing).toContain("pwk-spec-reviewer");
    expect(executing).toContain("pwk-tracing-reviewer");
    expect(executing).toContain("pwk-smell-reviewer");
    expect(executing).toContain("pwk-hazard-reviewer");
    expect(executing).toContain("inline");
    expect(executing).not.toContain('"tasks":');

    const requiredRoles = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];
    const partial = assessDelegationCoverage(requiredRoles, [
      { role: "pwk-spec-reviewer", status: "completed", report: "spec report" },
      { role: "pwk-tracing-reviewer", status: "completed", report: "trace report" },
      { role: "pwk-smell-reviewer", status: "completed", report: "smell report" },
      { role: "pwk-hazard-reviewer", status: "timed-out", error: "timeout" },
    ]);
    expect(partial.complete).toBe(false);
    expect(partial.missing).toEqual(["pwk-hazard-reviewer"]);
    expect(partial.retainedReports).toEqual(["spec report", "trace report", "smell report"]);

    const recovered = assessDelegationCoverage(requiredRoles, [
      { role: "pwk-spec-reviewer", status: "completed", report: "spec report" },
      { role: "pwk-tracing-reviewer", status: "completed", report: "trace report" },
      { role: "pwk-smell-reviewer", status: "completed", report: "smell report" },
      { role: "pwk-hazard-reviewer", status: "completed", report: "inline hazard report" },
    ]);
    expect(recovered.complete).toBe(true);
    expect(recovered.missing).toEqual([]);
  });

  it("treats failed, skipped, and empty-report outcomes as missing coverage", () => {
    const requiredRoles = ["pwk-spec-reviewer", "pwk-hazard-reviewer"] as const;
    const outcomes = [
      { role: "pwk-spec-reviewer", status: "failed" as const, error: "provider crashed" },
      { role: "pwk-hazard-reviewer", status: "skipped" as const },
    ];
    const failedOrSkipped = assessDelegationCoverage(requiredRoles, outcomes);
    expect(failedOrSkipped.complete).toBe(false);
    expect(failedOrSkipped.missing).toEqual([...requiredRoles]);
    expect(failedOrSkipped.retainedReports).toEqual([]);

    const emptyReport = assessDelegationCoverage(requiredRoles, [
      { role: "pwk-spec-reviewer", status: "completed", report: "" },
      { role: "pwk-hazard-reviewer", status: "completed", report: "hazard report" },
    ]);
    expect(emptyReport.complete).toBe(false);
    expect(emptyReport.missing).toEqual(["pwk-spec-reviewer"]);
    expect(emptyReport.retainedReports).toEqual(["hazard report"]);
  });
});
