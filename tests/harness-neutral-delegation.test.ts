import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import workflowGuard, { assessDelegationCoverage } from "../extensions/workflow-guard";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const roleNames = [
  "pwk-recon-scout",
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
];

function createExtensionHarness() {
  const handlers = new Map<string, (event: any, ctx: any) => unknown>();
  const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
  const pi = {
    on(event: string, handler: (event: any, ctx: any) => unknown) {
      handlers.set(event, handler);
    },
    registerCommand(name: string, options: { handler: (args: string, ctx: any) => unknown }) {
      commands.set(name, options);
    },
  };
  workflowGuard(pi as any);
  return { commands, handlers };
}

describe("harness-neutral delegation feature", () => {
  it("installs discoverable roles, preserves gated setup, and requires complete review coverage", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-delegation-"));
    const { commands, handlers } = createExtensionHarness();
    const notifications: string[] = [];
    const context = {
      cwd: projectRoot,
      ui: { notify: (message: string) => notifications.push(message) },
    };

    expect(commands.has("pwk-setup")).toBe(true);

    await handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    await expect(commands.get("pwk-setup")?.handler("--force", context)).rejects.toThrow(/brainstorm|plan|gated/i);
    expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0);

    await handlers.get("session_start")?.({}, {});
    await commands.get("pwk-setup")?.handler("", context);

    const installedDir = join(projectRoot, ".agents", "agents");
    expect(readdirSync(installedDir).sort()).toEqual(roleNames.map((name) => `${name}.md`).sort());
    for (const roleName of roleNames) {
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
});
