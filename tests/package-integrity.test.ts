import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROLE_NAMES } from "./helpers";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("package and regression coverage", () => {
  it("preserves Pi extension and skill package entries", () => {
    expect(pkg.pi?.extensions).toContain("extensions/workflow-guard.ts");
    expect(pkg.pi?.skills).toContain("skills");
    expect(pkg.files).toContain("extensions/");
    expect(pkg.files).toContain("skills/");
    expect(pkg.files).toContain("agents/");
  });

  it("ships the provider contract alongside the setup command's role assets", () => {
    expect(pkg.files).toContain("docs/provider-delegation-contract.md");

    const packed = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }),
    );
    const paths: string[] = packed[0].files.map((f: { path: string }) => f.path);
    for (const role of ROLE_NAMES) {
      expect(paths).toContain(`agents/${role}.md`);
    }
    expect(paths).toContain("extensions/workflow-guard.ts");
    expect(paths).toContain("docs/provider-delegation-contract.md");
  });

  it("keeps delegation providers optional", () => {
    const deps = { ...pkg.dependencies, ...pkg.peerDependencies } as Record<string, unknown>;
    expect(Object.keys(deps)).not.toContain("@tintinweb/pi-subagents");

    // The legacy pi-subagents peer, if retained, must stay optional compatibility metadata.
    if (pkg.peerDependencies?.["pi-subagents"]) {
      expect(pkg.peerDependenciesMeta?.["pi-subagents"]?.optional).toBe(true);
    }
  });

  it("registers the setup command in the guard extension", () => {
    const guard = readFileSync("extensions/workflow-guard.ts", "utf8");
    expect(guard).toContain('registerCommand("pwk-setup"');
  });

  it("keeps project guidance and changelog aligned with /pwk-setup", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    const changelog = readFileSync("CHANGELOG.md", "utf8");
    expect(agents).toContain("/pwk-setup");
    expect(agents).toContain(".agents/agents/");
    expect(agents).toMatch(/harness-neutral|provider-neutral|logical roles/i);
    expect(changelog).toMatch(/## \[Unreleased\]|## \[1\.5\.0\]/);
    expect(changelog).toMatch(/pwk-setup/);
    expect(changelog).toMatch(/harness-neutral|provider/i);
  });
});
