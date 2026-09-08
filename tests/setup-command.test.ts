import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ROLE_NAMES, createCommandContext, createExtensionHarness } from "./helpers";
import { applyFastModelHint } from "../extensions/workflow-guard";

describe("/pwk-setup fast-model personalization", () => {
  const FAST_PAIR = ["pwk-smell-reviewer", "pwk-hazard-reviewer"];
  const JUDGMENT_PAIR = ["pwk-spec-reviewer", "pwk-tracing-reviewer"];
  const ALL_REVIEWERS = [...JUDGMENT_PAIR, ...FAST_PAIR];
  let harness: ReturnType<typeof createExtensionHarness>;

  beforeEach(async () => {
    harness = createExtensionHarness();
    await harness.handlers.get("session_start")?.({}, {});
  });

  const rolePath = (root: string, name: string) => join(root, ".agents", "agents", `${name}.md`);

  it("applyFastModelHint injects, updates, and stays idempotent", () => {
    const canonical = readFileSync("agents/pwk-smell-reviewer.md", "utf8");
    const hinted = applyFastModelHint(canonical, "mimo2.5flash");
    expect(hinted).toMatch(/^model: mimo2\.5flash$/m);
    expect(hinted).not.toMatch(/^# model: /m);
    expect(applyFastModelHint(hinted, "mimo2.5flash")).toBe(hinted);
    expect(applyFastModelHint(hinted, "other-model")).toMatch(/^model: other-model$/m);

    const spec = readFileSync("agents/pwk-spec-reviewer.md", "utf8");
    expect(applyFastModelHint(spec, "x")).toBe(spec);
    const inserted = applyFastModelHint(spec, "x", { insertIfAbsent: true });
    expect(inserted).toMatch(/^model: x$/m);

    expect(() => applyFastModelHint(canonical, "")).toThrow();
    expect(() => applyFastModelHint(canonical, "two words")).toThrow();
  });

  it("installs hinted copies for the default split", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("--fast-model mimo2.5flash", createCommandContext(projectRoot));
    for (const name of FAST_PAIR) {
      expect(readFileSync(rolePath(projectRoot, name), "utf8"), name).toMatch(/^model: mimo2\.5flash$/m);
    }
    for (const name of [...JUDGMENT_PAIR, "pwk-recon-scout"]) {
      expect(readFileSync(rolePath(projectRoot, name), "utf8"), name).not.toMatch(/^model: \S/m);
    }
  });

  it("applies the fast model to all four reviewers with --all-roles", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("--fast-model m2 --all-roles", createCommandContext(projectRoot));
    for (const name of ALL_REVIEWERS) {
      expect(readFileSync(rolePath(projectRoot, name), "utf8"), name).toMatch(/^model: m2$/m);
    }
    expect(readFileSync(rolePath(projectRoot, "pwk-recon-scout"), "utf8")).not.toMatch(/^model: \S/m);
  });

  it("is substitution-aware idempotent on re-run with the same choice", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    const notifications: string[] = [];
    await command?.handler("--fast-model m1", createCommandContext(projectRoot, notifications));
    const afterFirst = FAST_PAIR.map((n) => readFileSync(rolePath(projectRoot, n), "utf8"));
    await command?.handler("--fast-model m1", createCommandContext(projectRoot, notifications));
    expect(FAST_PAIR.map((n) => readFileSync(rolePath(projectRoot, n), "utf8"))).toEqual(afterFirst);
    expect(notifications.join("\n")).toMatch(/0 installed, 5 skipped/);
  });

  it("auto-updates hint-only deltas without --force", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("--fast-model m1", createCommandContext(projectRoot));
    await command?.handler("--fast-model m2", createCommandContext(projectRoot));
    for (const name of FAST_PAIR) {
      expect(readFileSync(rolePath(projectRoot, name), "utf8"), name).toMatch(/^model: m2$/m);
    }
  });

  it("preserves conflict rules for non-hint deltas", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("--fast-model m1", createCommandContext(projectRoot));
    const edited = `${readFileSync(rolePath(projectRoot, "pwk-smell-reviewer"), "utf8")}\nlocal edit\n`;
    writeFileSync(rolePath(projectRoot, "pwk-smell-reviewer"), edited);
    await expect(command?.handler("--fast-model m1", createCommandContext(projectRoot))).rejects.toThrow(
      /conflict|incomplete/i,
    );
    expect(readFileSync(rolePath(projectRoot, "pwk-smell-reviewer"), "utf8")).toBe(edited);
  });

  it("treats a hand-added model line as a local edit on bare runs", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("", createCommandContext(projectRoot));
    const path = rolePath(projectRoot, "pwk-spec-reviewer");
    const handEdited = readFileSync(path, "utf8").replace(
      "systemPromptMode: replace\n",
      "systemPromptMode: replace\nmodel: my-model\n",
    );
    writeFileSync(path, handEdited);
    await expect(command?.handler("", createCommandContext(projectRoot))).rejects.toThrow(/conflict|incomplete/i);
    expect(readFileSync(path, "utf8")).toBe(handEdited); // not silently deleted
  });

  it("rejects --all-roles without --fast-model and --fast-model without a value", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await expect(command?.handler("--all-roles", createCommandContext(projectRoot))).rejects.toThrow(/usage/i);
    await expect(command?.handler("--fast-model --force", createCommandContext(projectRoot))).rejects.toThrow(/usage/i);
    expect(readdirSync(projectRoot, { withFileTypes: true })).toHaveLength(0); // rejected before any write
  });

  it("does not prompt headless and installs unhinted", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    await command?.handler("", createCommandContext(projectRoot));
    for (const name of FAST_PAIR) {
      const content = readFileSync(rolePath(projectRoot, name), "utf8");
      expect(content, name).toMatch(/^# model: /m);
      expect(content, name).not.toMatch(/^model: \S/m);
    }
  });

  it("prompts once when a picker is available and no hint is installed, then never while a hint exists", async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-fast-"));
    const command = harness.commands.get("pwk-setup");
    let selectCalls = 0;
    const ctx = (cwd: string) => ({
      cwd,
      hasUI: true,
      // Real pi passes Model objects ({ id, name, provider, ... }) in scopedModels
      // and ui.select takes plain strings, resolving to the chosen string.
      scopedModels: [{ model: { id: "x/mimo2.5flash" } }, { model: { id: "x/frontier" } }],
      ui: {
        notify() {},
        select: async (_title: string, options: string[]) => {
          selectCalls += 1;
          return options.find((option) => option.includes("mimo")) ?? "skip";
        },
      },
    });

    await command?.handler("", ctx(projectRoot));
    expect(selectCalls).toBe(1);
    expect(readFileSync(rolePath(projectRoot, "pwk-smell-reviewer"), "utf8")).toMatch(/^model: x\/mimo2\.5flash$/m);

    await command?.handler("", ctx(projectRoot));
    expect(selectCalls).toBe(1); // hint present — never re-prompts
  });
});
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
