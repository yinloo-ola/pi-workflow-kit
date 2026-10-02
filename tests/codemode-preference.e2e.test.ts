import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import workflowGuard from "../extensions/workflow-guard";
import { createCommandContext } from "./helpers";
import { CODEMODE_SWEEP_SCRIPT, TOOL_FREEDOM_MARKERS } from "./markers.mjs";
import { sweepSkillDir } from "./prescription-sweep.mjs";

/**
 * Feature acceptance for codemode preference.
 *
 * The deliverable is skill prose, lint rules, docs, and one guard behavior, so the
 * observable interface is: the content the host loads, skill-lint's exit behavior on
 * a kit copy, and the extension's before_agent_start emission. `npm run check` is the
 * outer gate (this file runs inside it); these scenarios are the primary enforced spec.
 *
 * This test proves that: (1) a prescription hidden inside a javascript fence is caught
 * by skill-lint like any inline bash command; (2) the guard announces codemode exactly
 * once per session when the host grants it, and never when it does not or when the
 * guard is pinned off; (3) the six skills name the executor instance and carry the
 * byte-pinned canonical sweep script with zero sweep violations; (4) the shipped docs
 * carry the dated known-instances table and the README enablement pointer.
 */
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skillsRoot = join(repoRoot, "skills");
const SKILLS = [
  "pwk-brainstorming",
  "pwk-code-review",
  "pwk-executing-tasks",
  "pwk-finalizing",
  "pwk-status",
  "pwk-walkthrough",
];
const SWEEP_SITES = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
const KIT_COPY_PATHS = [
  "skills",
  "agents",
  "extensions/workflow-guard.ts",
  "README.md",
  "docs/lessons.md",
  "docs/oversight-model.md",
  "docs/developer-usage-guide.md",
  "docs/workflow-phases.md",
];
const KIT_COPY_TESTS = ["skill-lint.mjs", "markers.mjs", "prescription-sweep.mjs"];

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

/** Kit copy in a tmpdir, with skill-lint runnable against it. */
function copyKit(prefix: string): string {
  const kit = mkdtempSync(join(tmpdir(), prefix));
  for (const rel of KIT_COPY_PATHS) {
    const target = join(kit, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(repoRoot, rel), target, { recursive: true });
  }
  mkdirSync(join(kit, "tests"));
  for (const file of KIT_COPY_TESTS) {
    cpSync(join(repoRoot, "tests", file), join(kit, "tests", file));
  }
  return kit;
}

/**
 * Minimal ExtensionAPI harness with an optional tool registry: `getAllTools` is only
 * defined when `tools` is provided, mirroring hosts that expose no registry (the
 * guard's detection must fail closed there).
 */
function createGuardHarness(tools?: Array<{ name: string }>) {
  const handlers = new Map<string, (event: any, ctx: any) => unknown>();
  const commands = new Map<string, { handler: (args: string, ctx: any) => unknown }>();
  const pi: any = {
    on(event: string, handler: (event: any, ctx: any) => unknown) {
      handlers.set(event, handler);
    },
    registerCommand(name: string, options: { handler: (args: string, ctx: any) => unknown }) {
      commands.set(name, options);
    },
    sendMessage() {},
  };
  if (tools) pi.getAllTools = () => tools;
  workflowGuard(pi);
  return { commands, handlers };
}

async function reminderContent(harness: ReturnType<typeof createGuardHarness>): Promise<string> {
  const result = await harness.handlers.get("before_agent_start")?.({}, {});
  return ((result as { message?: { content?: string } })?.message?.content ?? "") as string;
}

describe("codemode preference (feature E2E)", () => {
  it("fails skill-lint on a kit copy with a prescription hidden in a javascript fence, naming file and command", () => {
    const skill = "pwk-status";
    const kit = copyKit("pwk-codemode-js-");
    try {
      const skillFile = join(kit, `skills/${skill}/SKILL.md`);
      // The editor's regression: an unsanctioned command, but wrapped in executor syntax.
      const injected = `${readFileSync(skillFile, "utf8")}\n\nGather state first:\n\n\`\`\`javascript\nconst out = await tools.bash({ command: "rm foo.txt" });\nreturn text(out);\n\`\`\`\n`;
      writeFileSync(skillFile, injected);
      const result = spawnSync("node", [join(kit, "tests", "skill-lint.mjs")], { encoding: "utf8" });
      expect(result.status, "js-fence prescriptions must not be invisible").not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain(`${skill}/SKILL.md`);
      expect(`${result.stdout}${result.stderr}`).toContain("rm foo.txt");
    } finally {
      rmSync(kit, { recursive: true, force: true });
    }
  });

  it("announces codemode exactly once when the host grants it; never without it or under guard-off", async () => {
    const withCodemode = createGuardHarness([{ name: "codemode" }]);
    withCodemode.handlers.get("session_start")?.({}, {});
    withCodemode.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    const first = await reminderContent(withCodemode);
    expect(first).toContain("DESIGN phase");
    expect(first).toContain("codemode: active");
    expect(first.match(/codemode: active/g)?.length, "exactly one line").toBe(1);
    const second = await reminderContent(withCodemode);
    expect(second).not.toContain("codemode: active");

    const withoutCodemode = createGuardHarness([{ name: "bash" }]);
    withoutCodemode.handlers.get("session_start")?.({}, {});
    withoutCodemode.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    const plain = await reminderContent(withoutCodemode);
    expect(plain).toContain("DESIGN phase");
    expect(plain).not.toContain("codemode: active");

    const noRegistry = createGuardHarness();
    noRegistry.handlers.get("session_start")?.({}, {});
    noRegistry.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    expect(await reminderContent(noRegistry)).not.toContain("codemode: active");

    const pinnedOff = createGuardHarness([{ name: "codemode" }]);
    pinnedOff.handlers.get("session_start")?.({}, {});
    pinnedOff.handlers.get("input")?.({ text: "/skill:pwk-brainstorming" }, {});
    const notifications: string[] = [];
    pinnedOff.commands.get("pwk-guard")?.handler("off", createCommandContext(process.cwd(), notifications));
    expect(await reminderContent(pinnedOff), "guard-off suppresses the line").not.toContain("codemode: active");
    pinnedOff.commands.get("pwk-guard")?.handler("auto", createCommandContext(process.cwd(), notifications));
    const afterAuto = await reminderContent(pinnedOff);
    expect(afterAuto).toContain("DESIGN phase");
    expect(afterAuto, "the emission window passed — never retroactively added").not.toContain("codemode: active");
  });

  it("names the executor instance in the clause and carries the pinned canonical sweep script", () => {
    const instanceFragment = "e.g. `codemode` on pi ≥ 1.0.0";
    expect(TOOL_FREEDOM_MARKERS.clause, "canonical clause names the instance").toContain(instanceFragment);
    for (const name of SKILLS) {
      expect(read(`skills/${name}/SKILL.md`), name).toContain(TOOL_FREEDOM_MARKERS.clause);
    }
    expect(CODEMODE_SWEEP_SCRIPT, "markers export the canonical script").toContain("grep -m1 '^Feature phase:'");
    for (const name of SWEEP_SITES) {
      expect(read(`skills/${name}/SKILL.md`), name).toContain(CODEMODE_SWEEP_SCRIPT);
    }
    const names = readdirSync(skillsRoot).filter((d) => statSync(join(skillsRoot, d)).isDirectory());
    for (const name of names) {
      expect(sweepSkillDir(skillsRoot, name), name).toEqual([]);
    }
  });

  it("ships the dated known-instances table in the dev guide and one enablement paragraph in README", () => {
    const guide = read("docs/developer-usage-guide.md");
    for (const harness of [
      "that executor is `codemode`",
      "opencode",
      "Claude Platform API",
      "Claude Code CLI",
      "zcode",
      "commandcode",
    ]) {
      expect(guide, harness).toContain(harness);
    }
    expect(guide.match(/2026-09-29/g)?.length ?? 0, "every instance row is dated").toBeGreaterThanOrEqual(6);
    const readme = read("README.md");
    expect(readme).toContain("codemode");
    expect(readme).toContain("Enable codemode");
    expect(readme, "no instances table in README").not.toContain("| opencode");
  });
});
