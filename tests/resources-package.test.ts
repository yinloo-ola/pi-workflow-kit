import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROLE_NAMES, UNLOCK_SKILLS } from "../extensions/workflow-guard";

const ROOT = resolve(import.meta.dirname, "..");
const SKILLS = [
  "pwk-brainstorming",
  "pwk-code-review",
  "pwk-executing-tasks",
  "pwk-finalizing",
  "pwk-status",
  "pwk-walkthrough",
];
// Explicit minimum from the approved R1/R2 resource interfaces prevents a vacuous
// pass before extraction. Additional resources are discovered recursively below.
const REQUIRED_RESOURCES = [
  "pwk-brainstorming/references/umbrella.md",
  "pwk-brainstorming/references/design-format.md",
  "pwk-brainstorming/scripts/validate-design.mjs",
  "pwk-executing-tasks/references/progress-format.md",
  "pwk-executing-tasks/references/resume.md",
  "pwk-executing-tasks/references/review.md",
  "pwk-executing-tasks/scripts/build-review-packet.mjs",
];
const HELPERS = [
  ["pwk-brainstorming", "scripts/validate-design.mjs"],
  ["pwk-executing-tasks", "scripts/build-review-packet.mjs"],
];
const PUBLISHED_GUIDES = [
  "README.md",
  "docs/developer-usage-guide.md",
  "docs/workflow-phases.md",
  "docs/oversight-model.md",
  "docs/provider-delegation-contract.md",
];
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const python = spawnSync("node", ["--version"], { encoding: "utf8" });
let fixture: string;
let packed: Set<string>;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/** Local resource mentions in prose, Markdown links, and example commands.
 * Paths are relative to the installed skill root, even inside references/.
 * Logical /skill:pwk-* handoffs and project docs/plans paths are not resources.
 */
function resourcePaths(content: string): string[] {
  return [...content.matchAll(/(?:\.{1,2}\/)*(?:references|scripts)\/[A-Za-z0-9_./-]+\.(?:md|mjs)\b/g)].map(
    (match) => match[0],
  );
}

function assertLocalClosure(skillRoot: string): void {
  const files = filesUnder(skillRoot);
  for (const file of files.filter((path) => /\.(?:md|mjs)$/.test(path))) {
    const content = readFileSync(file, "utf8");
    const label = relative(skillRoot, file);
    // Reject concrete sibling filesystem access, not logical skill handoffs.
    expect(content, label).not.toMatch(/(?:\.\.\/|skills\/)pwk-[a-z-]+\//);
    expect(content, `${label} crosses a skill root`).not.toMatch(
      /(?:\.\.\/)+(?:[A-Za-z0-9_.-]+\/)*(?:references\/|scripts\/|SKILL\.md)/,
    );
    for (const dependency of resourcePaths(content)) {
      const target = resolve(skillRoot, dependency);
      const localPath = relative(skillRoot, target);
      expect(isAbsolute(localPath) || localPath === ".." || localPath.startsWith(`..${sep}`), dependency).toBe(false);
      expect(existsSync(target), `${label} needs skill-local ${dependency}`).toBe(true);
    }
  }
}

beforeAll(() => {
  fixture = mkdtempSync(join(tmpdir(), "pwk installed resources "));
  // npm's packlist is the publication boundary. No lifecycle scripts, install,
  // network request, or tarball write is needed to inspect the actual manifest.
  const result = spawnSync(
    "npm",
    ["pack", ROOT, "--dry-run", "--json", "--ignore-scripts", "--cache", join(fixture, "npm-cache")],
    { cwd: fixture, encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
  );
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(result.stdout);
  expect(manifest).toHaveLength(1);
  packed = new Set(manifest[0].files.map((file: { path: string }) => file.path));
}, 65_000);

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("R3 installed skill resource closure", () => {
  it.each([
    "../pwk-status/SKILL.md",
    "../../shared/references/schema.md",
    "references/../../pwk-status/SKILL.md",
    "skills/pwk-status/SKILL.md",
  ])("rejects cross-root dependency %s even when the target exists", (dependency) => {
    const base = mkdtempSync(join(fixture, "dependency check "));
    const skillRoot = join(base, "nested", "pwk-test");
    mkdirSync(skillRoot, { recursive: true });
    const target = resolve(skillRoot, dependency);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(ROOT, "skills/pwk-status/SKILL.md"), target);
    // Write only inside the disposable fixture; the sibling is deliberately
    // present, so rejection must come from the path boundary, not ENOENT.
    const source = join(skillRoot, "SKILL.md");
    writeFileSync(source, `Read [resource](${dependency}) before proceeding.\n`);
    expect(() => assertLocalClosure(skillRoot)).toThrow();
  });

  it("allows logical handoffs and resolves reference links from the skill root", () => {
    const skillRoot = join(fixture, "skill root resolution");
    mkdirSync(join(skillRoot, "references"), { recursive: true });
    writeFileSync(join(skillRoot, "SKILL.md"), "Read references/detail.md; then invoke /skill:pwk-finalizing.\n");
    writeFileSync(
      join(skillRoot, "references/detail.md"),
      "Read references/format.md before producing docs/plans/output.md.\n",
    );
    writeFileSync(join(skillRoot, "references/format.md"), "Local format.\n");
    expect(() => assertLocalClosure(skillRoot)).not.toThrow();
  });

  it("includes the required extracted resources in npm's tarball manifest", () => {
    const missing = REQUIRED_RESOURCES.map((resource) => `skills/${resource}`).filter((path) => !packed.has(path));
    expect(missing, "npm pack omitted required skill resources").toEqual([]);
  });

  it.each(SKILLS)("fully packages %s references/ and scripts/ without a sibling dependency", (skill) => {
    const skillRoot = join(ROOT, "skills", skill);
    expect(packed.has(`skills/${skill}/SKILL.md`)).toBe(true);
    for (const directory of ["references", "scripts"]) {
      const path = join(skillRoot, directory);
      if (!existsSync(path)) continue; // Adjacent skills need not invent resources.
      for (const file of filesUnder(path)) {
        const packagePath = relative(ROOT, file).split(sep).join("/");
        expect(packed.has(packagePath), `npm pack omitted ${packagePath}`).toBe(true);
      }
    }
    assertLocalClosure(skillRoot);
  });

  it.each(SKILLS)("resolves %s dependencies after copying only that installed skill", (skill) => {
    const installation = join(fixture, "independent copies", skill);
    const skillRoot = join(installation, skill);
    mkdirSync(skillRoot, { recursive: true });
    const prefix = `skills/${skill}/`;
    for (const path of packed) {
      if (!path.startsWith(prefix)) continue;
      const destination = join(skillRoot, path.slice(prefix.length));
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(ROOT, path), destination);
    }
    expect(readdirSync(installation)).toEqual([skill]);
    expect(existsSync(join(skillRoot, "SKILL.md"))).toBe(true);
    for (const resource of REQUIRED_RESOURCES.filter((path) => path.startsWith(`${skill}/`))) {
      expect(existsSync(join(installation, resource)), resource).toBe(true);
    }
    assertLocalClosure(skillRoot);
  });

  it.skipIf(python.status !== 0).each(HELPERS)(
    "runs copied %s helper %s from an unrelated directory without sibling skills",
    (skill, script) => {
      const skillRoot = join(fixture, "helper copies", skill);
      mkdirSync(skillRoot, { recursive: true });
      const prefix = `skills/${skill}/`;
      for (const path of packed) {
        if (!path.startsWith(prefix)) continue;
        const destination = join(skillRoot, path.slice(prefix.length));
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(join(ROOT, path), destination);
      }
      const cwd = join(fixture, "unrelated project with spaces");
      mkdirSync(cwd, { recursive: true });
      const result = spawnSync("node", [join(skillRoot, script), "--help"], {
        cwd,
        encoding: "utf8",
        timeout: 10_000,
        env: { ...process.env, PYTHONPATH: "", PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1" },
      });
      expect(result.error, result.stderr).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toMatch(/usage:/i);
      expect(readdirSync(cwd)).toEqual([]);
    },
  );
});

describe("R3 unchanged package contracts", () => {
  it("retains six skill entrypoints, Pi discovery, and the guard unlock list", () => {
    const inventory = [...packed]
      .filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path))
      .map((path) => path.split("/")[1])
      .sort();
    expect(inventory).toEqual(SKILLS);
    expect(pkg.pi).toEqual({ extensions: ["extensions/workflow-guard.ts"], skills: ["skills"] });
    expect([...UNLOCK_SKILLS].sort()).toEqual([
      "pwk-code-review",
      "pwk-executing-tasks",
      "pwk-finalizing",
      "pwk-walkthrough",
    ]);
    expect(packed.has("extensions/workflow-guard.ts")).toBe(true);
  });

  it("keeps five provider-neutral read-only roles packaged and providers optional", () => {
    const roles = [
      "pwk-recon-scout",
      "pwk-spec-reviewer",
      "pwk-tracing-reviewer",
      "pwk-smell-reviewer",
      "pwk-hazard-reviewer",
    ];
    expect([...ROLE_NAMES]).toEqual(roles);
    expect([...packed].filter((path) => /^agents\/[^/]+\.md$/.test(path)).sort()).toEqual(
      roles.map((role) => `agents/${role}.md`).sort(),
    );
    for (const role of roles) {
      const content = readFileSync(join(ROOT, "agents", `${role}.md`), "utf8");
      expect(content).toMatch(new RegExp(`^name: ${role}$`, "m"));
      expect(content).toMatch(/^tools: read, grep, find, ls, bash$/m);
      expect(content).toMatch(/^systemPromptMode: replace$/m);
    }
    const requiredProviders = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter(
      (name) => /subagents/.test(name) && (pkg.dependencies?.[name] || !pkg.peerDependenciesMeta?.[name]?.optional),
    );
    expect(requiredProviders).toEqual([]);
    expect(pkg["pi-subagents"]).toEqual({ agents: ["./agents"] });
    expect(packed.has("docs/provider-delegation-contract.md")).toBe(true);
  });
});

describe("R3 installed-resource guidance", () => {
  it("documents extracted resource locations in published guidance and root agent instructions", () => {
    const guides = PUBLISHED_GUIDES.map((path) => {
      expect(packed.has(path), path).toBe(true);
      return readFileSync(join(ROOT, path), "utf8");
    }).join("\n");
    for (const resource of REQUIRED_RESOURCES) {
      expect(guides.includes(resource), `Published documentation must locate skills/${resource}`).toBe(true);
    }
    const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
    expect(agents).toMatch(/references\//);
    expect(agents).toMatch(/scripts\//);
    expect(agents).toMatch(/node/i);
    expect(agents).not.toMatch(/the single code file/);
    const claude = join(ROOT, "CLAUDE.md");
    if (existsSync(claude)) expect(readFileSync(claude, "utf8")).toBe(agents);
  });

  it.each(HELPERS)("keeps missing-runtime blocker instructions visible in %s before %s", (skill, script) => {
    const content = readFileSync(join(ROOT, "skills", skill, "SKILL.md"), "utf8");
    // Guidance-only gate: never emulate a missing runtime by installing one.
    // Actual instruction-following remains the separately recorded R4 gate.
    const paragraphs = content.split(/\n\s*\n/);
    const prerequisite = paragraphs.filter((paragraph) => /node --version/i.test(paragraph)).join("\n");
    expect(prerequisite, "Declare the runtime the helper needs").toMatch(/Node/i);
    expect(prerequisite).toMatch(/missing|unavailable|not (?:installed|available|found)/i);
    expect(prerequisite).toMatch(/blocker|blocked|block/);
    expect(prerequisite).toMatch(/stop|do not (?:continue|proceed)|must not (?:continue|proceed)/i);
    expect(prerequisite).toMatch(/(?:request|ask)[\s\S]*(?:runtime|interpreter|Node)/i);
    expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:auto.?install|install[^.\n]*automatic)/i);
    expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:fallback|alternate|second implementation)/i);
    expect(prerequisite).toMatch(/(?:do not|never|no)[\s\S]*(?:claim|report)[\s\S]*(?:success|succeed|passed)/i);
    expect(resourcePaths(content)).toContain(script);
    expect(content).toMatch(/(?:relative to|from)[^.\n]*(?:skill|SKILL\.md)/i);
  });
});
