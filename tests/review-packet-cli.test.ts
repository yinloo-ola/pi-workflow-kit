import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skill = join(root, "skills/pwk-executing-tasks");
const helper = join(skill, "scripts/build-review-packet.mjs");
const temporary: string[] = [];
const alpha = `### R1: alpha deadbeef

**Acceptance criteria**
- Given a | b, when alpha runs, then keep  two spaces.  

\`\`\`markdown
### R99: not a requirement
## Feature acceptance
\`\`\`

### Checkpoints: none
### Review: skip

### Production-risk notes
- alpha risk one
- alpha risk two
- alpha risk three
- alpha risk four

`;
const beta = `### R2: beta

**Acceptance criteria**
- Given beta, when run, then done.

### Checkpoints: none
### Review: skip

### Production-risk notes
- beta risk one
- beta risk two

`;
const gamma = `### R3: gamma

**Acceptance criteria**
- Given gamma, when run, then done.

### Production-risk notes
- gamma risk one
- gamma risk two

`;
const risk = "## Production-risk areas\n\n- shared production risk\n\n";
const acceptance = "## Feature acceptance\n\n- Given all, when run, then complete.  \n\n";
const designText = `# Design: demo

## At a glance

\`\`\`markdown
### R77: example only
\`\`\`

## Requirements

${alpha}${beta}${gamma}${risk}${acceptance}### Feature review: auto
`;

function temp() {
  const path = mkdtempSync(join(tmpdir(), "pwk packet cli "));
  temporary.push(path);
  return path;
}

function git(project: string, ...args: string[]) {
  const result = spawnSync("git", ["-C", project, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function fixture() {
  const outside = temp();
  const project = join(outside, "project with spaces");
  mkdirSync(project);
  git(project, "init", "-q");
  git(project, "config", "user.email", "test@example.invalid");
  git(project, "config", "user.name", "Packet test");
  git(project, "config", "commit.gpgsign", "false");
  git(project, "commit", "--allow-empty", "-qm", "seed");
  const seed = git(project, "rev-parse", "HEAD");
  const commits: string[] = [];
  for (const name of ["alpha", "beta", "gamma"]) {
    writeFileSync(join(project, `${name}.txt`), `${name} content\n`);
    git(project, "add", "--", `${name}.txt`);
    git(project, "commit", "-qm", name);
    commits.push(git(project, "rev-parse", "HEAD"));
  }
  const topic = join(project, "docs/plans/2026-09-17-demo topic");
  mkdirSync(topic, { recursive: true });
  const design = join(topic, "demo-design.md");
  const progress = join(topic, "demo-progress.md");
  const packet = join(topic, "demo-review-packet.md");
  writeFileSync(design, designText);
  const rows = commits.map((sha, index) => `| ${index + 1} | ✅ | name deadbeef | — | ${sha} |`);
  const progressText = `# Progress: demo

Design: ${relative(project, design)}
Branch: test
Feature phase: reviewing

## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
|---|------|-------------|-----------------|--------|
${rows.join("\n")}

## Execution summary
| R# | Requirement | How it was built | Deviated? |
|----|-------------|------------------|-----------|
| 1 | decoy | badc0de | — |

## Code digest
\`\`\`markdown
## Requirements
| # | Done | Requirement | Per-req ceremony | Commit |
| 99 | ✅ | decoy | — | invalid |
\`\`\`
`;
  writeFileSync(progress, progressText);
  function run(args: string[] = [], script = helper) {
    return spawnSync(
      "node",
      [script, "--project", project, "--design", design, "--progress", progress, "--scope", "feature", ...args],
      { cwd: outside, encoding: "utf8" },
    );
  }
  return { outside, project, topic, design, progress, packet, seed, commits, rows, progressText, run };
}

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("review packet CLI", () => {
  it("imports only Node builtins and documents its path rules in --help", () => {
    const source = readFileSync(helper, "utf8");
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(specifiers.length, "the helper imports something").toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(specifier.startsWith("node:"), `${specifier} must be a Node builtin`).toBe(true);
    }
    const help = spawnSync("node", [helper, "--help"], { encoding: "utf8" });
    expect(help.status).toBe(0);
    expect(help.stdout).toMatch(/Node/);
    expect(help.stdout).toContain("relative to --project");
  });

  it("preserves the first feature bound when multiple ordered review-fix commits are recorded", () => {
    const f = fixture();
    writeFileSync(join(f.project, "gamma.txt"), "fixed gamma\n");
    git(f.project, "add", "--", "gamma.txt");
    git(f.project, "commit", "-qm", "fix gamma");
    const fix = git(f.project, "rev-parse", "HEAD");
    writeFileSync(f.progress, f.progressText.replace(f.commits[2], `${f.commits[2]} ${fix}`));
    expect(f.run().status).toBe(0);
    expect(readFileSync(f.packet, "utf8")).toContain(`Base: ${f.seed}\n\nHead: ${fix}`);
    expect(f.run(["--scope", "requirement", "--requirement", "3"]).status).toBe(0);
    expect(readFileSync(join(f.topic, "demo-review-packet-r3.md"), "utf8")).toContain(
      `Base: ${f.commits[1]}\n\nHead: ${fix}`,
    );
    // R3 depends only on its own and the immediately previous recorded bound.
    writeFileSync(f.progress, readFileSync(f.progress, "utf8").replace(`${f.rows[0]}\n`, ""));
    expect(f.run(["--scope", "requirement", "--requirement", "3"]).status).toBe(0);
    expect(f.run().status).not.toBe(0);
  });

  it("builds exact sections and verbatim evidence using only the Requirements Commit column", () => {
    const f = fixture();
    const before = git(f.project, "status", "--porcelain");
    const result = f.run();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const packet = readFileSync(f.packet, "utf8");
    expect(packet).toContain(`Base: ${f.seed}\n\nHead: ${f.commits[2]}`);
    const sections = [
      "## Commits",
      "## Changed files",
      "## Acceptance criteria (verbatim from the design doc)",
      "## Feature acceptance (verbatim)",
      "## Production-risk notes (verbatim, if any)",
      "## Diff",
    ];
    let position = -1;
    for (const section of sections) {
      const next = packet.indexOf(section);
      expect(next).toBeGreaterThan(position);
      position = next;
    }
    expect(packet).toContain(alpha + beta + gamma + risk);
    expect(packet).toContain(acceptance);
    const notes = packet.split(sections[4])[1].split(sections[5])[0];
    for (const block of [alpha, beta, gamma]) {
      expect(notes).toContain(block.slice(block.indexOf("### Production-risk notes")));
    }
    expect(notes).toContain(risk);
    expect(notes).not.toContain("### R2:");
    expect(packet).not.toContain("### R77:");
    expect(packet).not.toContain("### Feature review: auto");
    for (const name of ["alpha", "beta", "gamma"]) expect(packet).toContain(`+${name} content`);
    expect(git(f.project, "rev-parse", "HEAD")).toBe(f.commits[2]);
    expect(git(f.project, "status", "--porcelain")).toBe(before);
    expect(readFileSync(f.progress, "utf8")).toBe(f.progressText);
  });

  it("resolves the single Design pointer from both old compact and new blank-line headers", () => {
    const f = fixture();
    // New shape: a blank line between each adjacent header field; extraction must not care.
    const newShape = f.progressText.replace(
      `Design: ${relative(f.project, f.design)}\nBranch: test\nFeature phase: reviewing`,
      `Design: ${relative(f.project, f.design)}\n\nBranch: test\n\nFeature phase: reviewing`,
    );
    expect(newShape).not.toBe(f.progressText); // the replacement anchor itself is the old shape
    writeFileSync(f.progress, newShape);
    const result = f.run();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const packet = readFileSync(f.packet, "utf8");
    expect(packet).toContain(`Base: ${f.seed}\n\nHead: ${f.commits[2]}`);
    expect((packet.match(/^Design: /gm) ?? []).length).toBeLessThanOrEqual(1); // one pointer, never a blank-line false match
  });

  it("uses distinct requirement bounds and criteria, not HEAD or other requirements", () => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    const feature = readFileSync(f.packet, "utf8");
    for (const index of [0, 1]) {
      expect(f.run(["--scope", "requirement", "--requirement", String(index + 1)]).status).toBe(0);
      const packet = readFileSync(join(f.topic, `demo-review-packet-r${index + 1}.md`), "utf8");
      expect(packet).toContain(`Base: ${index === 0 ? f.seed : f.commits[index - 1]}\n\nHead: ${f.commits[index]}`);
      expect(packet).toContain(index === 0 ? alpha : beta);
      expect(packet).not.toContain(index === 0 ? beta : alpha);
      expect(packet).not.toContain("+gamma content");
    }
    expect(readFileSync(f.packet, "utf8")).toBe(feature);
  });

  it("refreshes late fixes and excludes committed generated packets from both diff and stat", () => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    git(f.project, "add", "--", relative(f.project, f.packet));
    git(f.project, "commit", "-qm", "record review packet");
    writeFileSync(join(f.topic, "other-review-packet-r2.md"), "SELF REFERENCE SENTINEL\n");
    writeFileSync(join(f.project, "beta.txt"), "late review fix\n");
    git(f.project, "add", "--", "beta.txt", relative(f.project, join(f.topic, "other-review-packet-r2.md")));
    git(f.project, "commit", "-qm", "late fix");
    const head = git(f.project, "rev-parse", "HEAD");
    expect(f.run().status).toBe(0);
    const packet = readFileSync(f.packet, "utf8");
    expect(packet).toContain(`Head: ${head}`);
    expect(packet).toContain("+late review fix");
    expect(packet).not.toContain("SELF REFERENCE SENTINEL");
    expect(packet).not.toContain("demo-review-packet.md |");
    expect(packet).not.toContain("diff --git a/docs/plans/");
    writeFileSync(f.progress, f.progressText.replace(f.commits[2], `${f.commits[2]} ${head}`));
    expect(f.run(["--scope", "requirement", "--requirement", "3"]).status).toBe(0);
    expect(readFileSync(join(f.topic, "demo-review-packet-r3.md"), "utf8")).toContain(`Head: ${head}`);
  });

  it("runs a copied standalone skill outside the project with explicit relative project inputs", () => {
    const f = fixture();
    const copy = join(f.outside, "installed skills/pwk-executing-tasks");
    cpSync(skill, copy, { recursive: true });
    const result = f.run(
      ["--design", relative(f.project, f.design), "--progress", relative(f.project, f.progress)],
      join(copy, "scripts/build-review-packet.mjs"),
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(existsSync(f.packet)).toBe(true);
  });

  it.each([
    [
      "ambiguous commit",
      (f: ReturnType<typeof fixture>) => f.progressText.replace(f.commits[1], `${f.commits[1]}, HEAD`),
    ],
    ["invalid revision", (f: ReturnType<typeof fixture>) => f.progressText.replace(f.commits[1], "deadbeef")],
    ["moving revision", (f: ReturnType<typeof fixture>) => f.progressText.replace(f.commits[1], "HEAD")],
    ["missing commit", (f: ReturnType<typeof fixture>) => f.progressText.replace(f.commits[1], "—")],
    ["missing row", (f: ReturnType<typeof fixture>) => f.progressText.replace(`${f.rows[1]}\n`, "")],
    [
      "duplicate row",
      (f: ReturnType<typeof fixture>) => f.progressText.replace(f.rows[1], `${f.rows[1]}\n${f.rows[1]}`),
    ],
    ["reversed commits", (f: ReturnType<typeof fixture>) => f.progressText.replace(f.commits[0], f.commits[2])],
    ["wrong design", (f: ReturnType<typeof fixture>) => f.progressText.replace("demo-design.md", "other-design.md")],
    ["duplicate table", (f: ReturnType<typeof fixture>) => `${f.progressText}\n## Requirements\n`],
  ])("rejects %s and preserves the previous complete packet with no partial files", (_name, mutate) => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    const original = readFileSync(f.packet, "utf8");
    const files = readdirSync(f.topic);
    writeFileSync(f.progress, mutate(f));
    const result = f.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/error:/i);
    expect(readFileSync(f.packet, "utf8")).toBe(original);
    expect(readdirSync(f.topic)).toEqual(files);
  });

  it("allows terminal failed/skipped rows without commits for feature scope but refuses guessed requirement bounds", () => {
    const f = fixture();
    writeFileSync(f.progress, f.progressText.replace(f.rows[1], "| 2 | ⏭ | beta — deferred | — | — |"));
    expect(f.run().status).toBe(0);
    expect(f.run(["--scope", "requirement", "--requirement", "2"]).status).not.toBe(0);
    expect(f.run(["--scope", "requirement", "--requirement", "3"]).status).not.toBe(0);
    writeFileSync(f.progress, f.progressText.replace(f.rows[1], "| 2 | ❌ | beta — reverted | — | — |"));
    expect(f.run().status).toBe(0);
    writeFileSync(f.progress, f.progressText.replace(f.rows[2], "| 3 | ⬜ | gamma | — | — |"));
    expect(f.run(["--scope", "requirement", "--requirement", "2"]).status).toBe(0);
    expect(f.run().status).not.toBe(0);
  });

  it("supports trivial docs and rejects unclosed template fences or duplicate requirement headings", () => {
    const f = fixture();
    writeFileSync(f.design, designText.slice(0, designText.indexOf(acceptance)));
    expect(f.run().status).toBe(0);
    expect(readFileSync(f.packet, "utf8")).toContain("## Feature acceptance (verbatim)\n\n");
    for (const text of [`${designText}\n\`\`\`\n`, designText.replace("### R2: beta", "### R1: duplicate")]) {
      writeFileSync(f.design, text);
      expect(f.run().status).not.toBe(0);
    }
  });

  it("validates scope arguments and topic containment and refuses symlink packet destinations", () => {
    const f = fixture();
    for (const args of [
      ["--scope", "requirement"],
      ["--requirement", "1"],
      ["--scope", "requirement", "--requirement", "99"],
      ["--project", f.topic],
      ["--progress", f.design],
    ])
      expect(f.run(args).status).not.toBe(0);
    const external = join(f.outside, "outside-design.md");
    writeFileSync(external, designText);
    expect(f.run(["--design", external]).status).not.toBe(0);
    const alias = join(f.project, "docs/plans/topic alias");
    symlinkSync(f.topic, alias);
    expect(
      f.run(["--design", join(alias, "demo-design.md"), "--progress", join(alias, "demo-progress.md")]).status,
    ).not.toBe(0);
    const target = join(f.outside, "do not overwrite.md");
    writeFileSync(target, "retain");
    symlinkSync(target, f.packet);
    expect(f.run().status).not.toBe(0);
    expect(readFileSync(target, "utf8")).toBe("retain");
  });

  it("retains a packet when a late Git operation fails", () => {
    const f = fixture();
    expect(f.run().status).toBe(0);
    const original = readFileSync(f.packet, "utf8");
    const blob = git(f.project, "rev-parse", `${f.commits[2]}:gamma.txt`);
    const object = join(f.project, ".git/objects", blob.slice(0, 2), blob.slice(2));
    const bytes = readFileSync(object);
    rmSync(object);
    try {
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/error:/i);
      expect(readFileSync(f.packet, "utf8")).toBe(original);
      expect(readdirSync(f.topic).sort()).toEqual(["demo-design.md", "demo-progress.md", "demo-review-packet.md"]);
    } finally {
      writeFileSync(object, bytes);
    }
  });
});
