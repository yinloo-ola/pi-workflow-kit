import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import workflowGuard from "../extensions/workflow-guard";

const roleNames = [
  "pwk-recon-scout",
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
];

type Handler = (event: any, ctx: any) => unknown;

function createExtensionHarness() {
  const handlers = new Map<string, Handler>();
  const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
  const pi = {
    on(event: string, handler: Handler) {
      handlers.set(event, handler);
    },
    registerCommand(name: string, options: { handler: (args: string, ctx: any) => unknown }) {
      commands.set(name, options);
    },
    sendMessage() {},
  };
  workflowGuard(pi as any);
  return { commands, handlers };
}

function createContext(cwd: string, notifications: string[] = []) {
  return {
    cwd,
    ui: {
      notify(message: string) {
        notifications.push(message);
      },
    },
  };
}

describe("/pwk-setup", () => {
  it("installs all canonical role files and is idempotent", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const harness = createExtensionHarness();
    const notifications: string[] = [];
    const command = harness.commands.get("pwk-setup");
    expect(command).toBeDefined();

    await harness.handlers.get("session_start")?.({}, {});
    await command?.handler("", createContext(projectRoot, notifications));

    const agentsRoot = join(projectRoot, ".agents", "agents");
    expect(readdirSync(agentsRoot).sort()).toEqual(roleNames.map((name) => `${name}.md`).sort());
    const installed = roleNames.map((name) => readFileSync(join(agentsRoot, `${name}.md`), "utf8"));

    await command?.handler("", createContext(projectRoot, notifications));
    expect(roleNames.map((name) => readFileSync(join(agentsRoot, `${name}.md`), "utf8"))).toEqual(installed);
    expect(notifications.join("\n")).toMatch(/installed|already|skipped/i);
  });

  it("preserves conflicts unless --force is explicit", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const harness = createExtensionHarness();
    const command = harness.commands.get("pwk-setup");
    const agentsRoot = join(projectRoot, ".agents", "agents");
    mkdirSync(agentsRoot, { recursive: true });
    const rolePath = join(agentsRoot, "pwk-spec-reviewer.md");
    const customContent = "custom role\n";
    writeFileSync(rolePath, customContent);

    await expect(command?.handler("", createContext(projectRoot))).rejects.toThrow(/conflict/i);
    expect(readFileSync(rolePath, "utf8")).toBe(customContent);

    await command?.handler("--force", createContext(projectRoot));
    expect(readFileSync(rolePath, "utf8")).not.toBe(customContent);
  });

  it("rejects symlink destinations and unknown arguments", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const symlinkTarget = mkdtempSync(join(tmpdir(), "pwk-setup-target-"));
    const harness = createExtensionHarness();
    const command = harness.commands.get("pwk-setup");

    await harness.handlers.get("session_start")?.({}, {});
    symlinkSync(symlinkTarget, join(projectRoot, ".agents"));
    await expect(command?.handler("", createContext(projectRoot))).rejects.toThrow(/symlink/i);
    expect(readdirSync(symlinkTarget)).toHaveLength(0);
    expect(lstatSync(join(projectRoot, ".agents")).isSymbolicLink()).toBe(true);

    const cleanRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    await expect(command?.handler("--unexpected", createContext(cleanRoot))).rejects.toThrow(/usage|argument/i);
    expect(() => readdirSync(cleanRoot, { withFileTypes: true })).not.toThrow();
    expect(readdirSync(cleanRoot, { withFileTypes: true })).toHaveLength(0);
  });

  it("refuses setup in gated phases even when the manual guard is off", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const harness = createExtensionHarness();
    const command = harness.commands.get("pwk-setup");
    const context = createContext(projectRoot);

    await harness.handlers.get("session_start")?.({}, {});
    await harness.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    await harness.commands.get("pwk-guard")?.handler("off", { ui: { notify() {} } });
    await expect(command?.handler("--force", context)).rejects.toThrow(/brainstorm|plan|gated/i);
    expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0);
  });
});
