import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ROLE_NAMES, createCommandContext, createExtensionHarness } from "./helpers";

describe("/pwk-setup", () => {
  let harness: ReturnType<typeof createExtensionHarness>;

  // Module-level phase state leaks across tests without this reset.
  beforeEach(async () => {
    harness = createExtensionHarness();
    await harness.handlers.get("session_start")?.({}, {});
  });

  it("installs all canonical role files and is idempotent", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const notifications: string[] = [];
    const command = harness.commands.get("pwk-setup");
    expect(command).toBeDefined();

    await command?.handler("", createCommandContext(projectRoot, notifications));

    const agentsRoot = join(projectRoot, ".agents", "agents");
    expect(readdirSync(agentsRoot).sort()).toEqual(ROLE_NAMES.map((name) => `${name}.md`).sort());
    const installed = ROLE_NAMES.map((name) => readFileSync(join(agentsRoot, `${name}.md`), "utf8"));

    await command?.handler("", createCommandContext(projectRoot, notifications));
    expect(ROLE_NAMES.map((name) => readFileSync(join(agentsRoot, `${name}.md`), "utf8"))).toEqual(installed);
    expect(notifications.join("\n")).toMatch(/installed|already|skipped/i);
  });

  it("preserves conflicts unless --force is explicit", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const command = harness.commands.get("pwk-setup");
    const agentsRoot = join(projectRoot, ".agents", "agents");
    mkdirSync(agentsRoot, { recursive: true });
    const rolePath = join(agentsRoot, "pwk-spec-reviewer.md");
    const customContent = "custom role\n";
    writeFileSync(rolePath, customContent);

    await expect(command?.handler("", createCommandContext(projectRoot))).rejects.toThrow(/conflict|incomplete/i);
    expect(readFileSync(rolePath, "utf8")).toBe(customContent);

    await command?.handler("--force", createCommandContext(projectRoot));
    expect(readFileSync(rolePath, "utf8")).not.toBe(customContent);
  });

  it("rejects symlinked .agents, intermediate agents dir, and role-file destinations", async () => {
    const command = harness.commands.get("pwk-setup");

    // Symlinked .agents (top-level destination component).
    const rootWithAgentsLink = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const agentsTarget = mkdtempSync(join(tmpdir(), "pwk-setup-target-"));
    symlinkSync(agentsTarget, join(rootWithAgentsLink, ".agents"));
    await expect(command?.handler("", createCommandContext(rootWithAgentsLink))).rejects.toThrow(/symlink/i);
    expect(readdirSync(agentsTarget)).toHaveLength(0);
    expect(lstatSync(join(rootWithAgentsLink, ".agents")).isSymbolicLink()).toBe(true);

    // Symlinked intermediate .agents/agents directory.
    const rootWithAgentsDir = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const innerTarget = mkdtempSync(join(tmpdir(), "pwk-setup-target-"));
    mkdirSync(join(rootWithAgentsDir, ".agents"));
    symlinkSync(innerTarget, join(rootWithAgentsDir, ".agents", "agents"));
    await expect(command?.handler("", createCommandContext(rootWithAgentsDir))).rejects.toThrow(/symlink/i);
    expect(readdirSync(innerTarget)).toHaveLength(0);
    expect(lstatSync(join(rootWithAgentsDir, ".agents", "agents")).isSymbolicLink()).toBe(true);

    // Symlinked role-file destination (lstat + O_NOFOLLOW path).
    const rootWithFileLink = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const fileTarget = mkdtempSync(join(tmpdir(), "pwk-setup-target-"));
    const linkedFilePath = join(fileTarget, "leaked.md");
    writeFileSync(linkedFilePath, "leaked\n");
    const agentsRoot = join(rootWithFileLink, ".agents", "agents");
    mkdirSync(agentsRoot, { recursive: true });
    symlinkSync(linkedFilePath, join(agentsRoot, "pwk-spec-reviewer.md"));
    await expect(command?.handler("", createCommandContext(rootWithFileLink))).rejects.toThrow(/symlink|incomplete/i);
    expect(readFileSync(linkedFilePath, "utf8")).toBe("leaked\n");
    expect(lstatSync(join(agentsRoot, "pwk-spec-reviewer.md")).isSymbolicLink()).toBe(true);

    // Unknown arguments are rejected before any write.
    const cleanRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    await expect(command?.handler("--unexpected", createCommandContext(cleanRoot))).rejects.toThrow(/usage|argument/i);
    expect(readdirSync(cleanRoot, { withFileTypes: true })).toHaveLength(0);
  });

  it("refuses setup in brainstorm and plan phases even when the manual guard is off", async () => {
    const command = harness.commands.get("pwk-setup");

    for (const skill of ["pwk-brainstorming", "pwk-writing-plans"] as const) {
      const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
      await harness.handlers.get("input")?.({ text: `/skill:${skill}` }, {});
      await harness.commands.get("pwk-guard")?.handler("off", { ui: { notify() {} } });
      await expect(command?.handler("--force", createCommandContext(projectRoot))).rejects.toThrow(
        /brainstorm|plan|gated/i,
      );
      expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0);
      await harness.handlers.get("session_start")?.({}, {});
    }
  });

  it("refuses non-regular file destinations such as FIFOs", async () => {
    if (process.platform === "win32") return; // mkfifo is POSIX-only
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const command = harness.commands.get("pwk-setup");
    const agentsRoot = join(projectRoot, ".agents", "agents");
    mkdirSync(agentsRoot, { recursive: true });
    const fifoPath = join(agentsRoot, "pwk-spec-reviewer.md");
    execSync(`mkfifo ${JSON.stringify(fifoPath)}`);

    await expect(command?.handler("--force", createCommandContext(projectRoot))).rejects.toThrow(
      /not a regular file|non-regular/i,
    );
    expect(lstatSync(fifoPath).isFIFO()).toBe(true);
  });

  it("refuses setup under the manual read-only lock even with no active phase", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-setup-"));
    const command = harness.commands.get("pwk-setup");
    const guardCommand = harness.commands.get("pwk-guard");
    expect(guardCommand).toBeDefined();

    await guardCommand?.handler("on", { ui: { notify() {} } });
    await expect(command?.handler("--force", createCommandContext(projectRoot))).rejects.toThrow(
      /manual read-only lock/i,
    );
    expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0);

    // Returning to auto re-enables setup.
    await guardCommand?.handler("auto", { ui: { notify() {} } });
    await command?.handler("", createCommandContext(projectRoot));
    expect(readdirSync(join(projectRoot, ".agents", "agents")).sort()).toEqual(
      ROLE_NAMES.map((name) => `${name}.md`).sort(),
    );
  });
});
