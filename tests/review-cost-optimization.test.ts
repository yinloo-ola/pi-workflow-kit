import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createCommandContext, createExtensionHarness } from "./helpers";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const JUDGMENT_ROLES = ["pwk-spec-reviewer", "pwk-tracing-reviewer"] as const;
const FAST_ROLES = ["pwk-smell-reviewer", "pwk-hazard-reviewer"] as const;
const REVIEW_ROLES = [...JUDGMENT_ROLES, ...FAST_ROLES];

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function splitRole(name: string): { frontmatter: string; body: string } {
  const content = readRepo(`agents/${name}.md`);
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Role ${name} has invalid frontmatter`);
  return { frontmatter: match[1], body: match[2] };
}

function commonPrefix(texts: string[]): string {
  let prefix = texts[0];
  for (const text of texts.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < text.length && prefix[i] === text[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

describe("review cost optimization feature (E2E)", () => {
  it("should run the tiered packet review pipeline end to end", async () => {
    // R1 — tier hints on canonical role files: judgment roles bounded but default-tier,
    // checklist roles fast-tier with a commented (not hardcoded) model placeholder.
    for (const name of JUDGMENT_ROLES) {
      const { frontmatter } = splitRole(name);
      expect(frontmatter, name).toMatch(/^max_turns: 40$/m);
      expect(frontmatter, name).not.toMatch(/^model: \S/m);
      expect(frontmatter, name).not.toMatch(/^thinking:/m);
    }
    for (const name of FAST_ROLES) {
      const { frontmatter } = splitRole(name);
      expect(frontmatter, name).toMatch(/^thinking: low$/m);
      expect(frontmatter, name).toMatch(/^max_turns: 20$/m);
      expect(frontmatter, name).toMatch(/^# model: /m);
      expect(frontmatter, name).not.toMatch(/^model: \S/m);
    }

    // R2+R3 — the four reviewer bodies share a byte-identical conduct prefix that
    // carries the packet discipline; each body continues with its own checklist.
    const bodies = REVIEW_ROLES.map((name) => splitRole(name).body);
    const shared = commonPrefix(bodies);
    expect(shared).toMatch(/read-only/i);
    expect(shared).toMatch(/authority boundary|must enforce read-only/i);
    expect(shared).toMatch(/packet/i);
    expect(shared).toMatch(/targeted reads?/i);
    expect(shared).toMatch(/cited|cite what sent/i);
    expect(shared).toMatch(/not covered|did not get to|not reached/i);
    expect(shared).toMatch(/no findings/i);
    for (const [i, name] of REVIEW_ROLES.entries()) {
      expect(bodies[i].length, name).toBeGreaterThan(shared.length);
      expect(bodies[i].slice(shared.length), name).toMatch(/checklist|criteria|hazard|smells|tracing|spec alignment/i);
    }

    // R4+R5 — the executing skill builds scope as a packet file (never spawn-carried)
    // and spawns reviewers with one-liner pointers; per-requirement reviews mirror it.
    const executing = readRepo("skills/pwk-executing-tasks/SKILL.md");
    expect((executing.match(/review-packet\.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(executing).toMatch(/git diff <merge-base>\.\.\.HEAD/);
    expect(executing).toMatch(/review-packet\.md[\s\S]{0,600}(your role|role framing|role tail)/i);
    expect(executing).toMatch(
      /per-requirement[\s\S]{0,600}review-packet\.md|review-packet\.md[\s\S]{0,600}per-requirement/i,
    );

    // R6 — the delegation contract documents the hints as advisory with silent fallback.
    const contract = readRepo("docs/provider-delegation-contract.md");
    expect(contract).toMatch(/advisory/i);
    expect(contract).toMatch(/must not fail/i);
    expect(contract).toMatch(/bounded-execution/i);

    // R7 — /pwk-setup personalizes the fast tier in a temp project (arg form, no UI picker).
    const projectRoot = mkdtempSync(join(tmpdir(), "pwk-rco-"));
    const { commands, handlers } = createExtensionHarness();
    const notifications: string[] = [];
    await handlers.get("session_start")?.({}, {});
    await commands
      .get("pwk-setup")
      ?.handler("--fast-model mimo2.5flash", createCommandContext(projectRoot, notifications));
    for (const name of FAST_ROLES) {
      const installed = readFileSync(join(projectRoot, ".agents/agents", `${name}.md`), "utf8");
      expect(installed, name).toMatch(/^model: mimo2\.5flash$/m);
    }
    for (const name of JUDGMENT_ROLES) {
      const installed = readFileSync(join(projectRoot, ".agents/agents", `${name}.md`), "utf8");
      expect(installed, name).not.toMatch(/^model: \S/m);
    }
    const installedBodies = REVIEW_ROLES.map((name) =>
      readFileSync(join(projectRoot, ".agents/agents", `${name}.md`), "utf8").replace(/^---\n[\s\S]*?\n---\n/, ""),
    );
    expect(commonPrefix(installedBodies)).toBe(shared);
    expect(notifications.join("\n")).toContain("installed");

    // R8 — finalize disposes the packet with the plan docs (delete and archive paths).
    const finalize = readRepo("skills/pwk-finalizing/SKILL.md");
    expect((finalize.match(/\?\?\?\?-\?\?-\?\?-<topic>-review-packet\*.md/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
