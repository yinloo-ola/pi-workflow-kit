import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const REVIEW_REFERENCE = "skills/pwk-executing-tasks/references/review.md";
const PACKET_HELPER = join(repoRoot, "skills/pwk-executing-tasks/scripts/build-review-packet.py");

/** A design doc shaped like the template pwk-brainstorming emits (pwk 2.0). */
const DESIGN_FIXTURE = [
  "# demo",
  "",
  "## At a glance",
  "",
  "summary text",
  "",
  "| R# | Requirement in one line | Risk |",
  "|----|--------------------------|------|",
  "| 1 | alpha | low |",
  "| 2 | beta | med |",
  "",
  "## Requirements",
  "",
  "### R1: alpha",
  "alpha does one thing",
  "",
  "**Acceptance criteria** — Given/When/Then criteria:",
  "- Given a, When b, Then c.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "### Production-risk notes",
  "- alpha: touches auth session storage",
  "- alpha: rotation window must stay under 30s",
  "",
  "### R2: beta",
  "beta does another thing",
  "",
  "**Acceptance criteria** — Given/When/Then criteria:",
  "- Given d, When e, Then f.",
  "",
  "### Checkpoints: none",
  "### Review: skip",
  "",
  "### Production-risk notes",
  "- touches redis: hot path under login storms",
  "- TTL policy must match session rotation",
  "- key cardinality grows with active users",
  "- monitor INCR miss rate in dashboards",
  "",
  "## Production-risk areas",
  "",
  "- redis TTL policy is load-bearing for session rotation",
  "",
  "## Feature acceptance",
  "",
  "- `should demo` — Given x, When y, Then z.",
  "",
  "### Feature review: parallel",
  "",
].join("\n");

function readExecuting(): string {
  return readFileSync(join(repoRoot, "skills/pwk-executing-tasks/SKILL.md"), "utf8");
}

function readReviewReference(): string {
  return readFileSync(join(repoRoot, REVIEW_REFERENCE), "utf8");
}

describe("review packet recipe", () => {
  it("should define the helper invocation contract in the review reference", () => {
    const review = readReviewReference();
    expect(review).toContain("build-review-packet.py");
    for (const argument of ["--project", "--design", "--progress", "--scope feature"]) {
      expect(review).toContain(argument);
    }
    expect(review).toContain("--scope requirement --requirement 2");
    expect(review).toContain("No `merge-base` guessing");
    expect(review).toContain("no packet byte passes through model output");
    expect(review).toContain("The helper excludes generated `*-review-packet*.md` files");
    expect(review).toContain("Acceptance criteria (verbatim from the design doc)");
  });

  it("should extract criteria verbatim through the helper", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-"));
    execSync("git init -q && git config user.email test@example.invalid && git config user.name packet", { cwd: dir });
    execSync("git commit --allow-empty -qm seed", { cwd: dir });
    const topic = join(dir, "docs/plans/2026-09-17-demo");
    mkdirSync(topic, { recursive: true });
    const design = join(topic, "demo-design.md");
    const progress = join(topic, "demo-progress.md");
    writeFileSync(design, DESIGN_FIXTURE);
    writeFileSync(join(dir, "change.txt"), "changed\n");
    execSync("git add . && git commit -qm fixture", { cwd: dir });
    const firstCommit = execSync("git rev-parse HEAD", { cwd: dir }).toString().trim();
    writeFileSync(join(dir, "second-change.txt"), "changed again\n");
    execSync("git add . && git commit -qm second", { cwd: dir });
    const secondCommit = execSync("git rev-parse HEAD", { cwd: dir }).toString().trim();
    writeFileSync(
      progress,
      `# Progress: demo\n\nDesign: docs/plans/2026-09-17-demo/demo-design.md\n\n## Requirements\n| # | Done | Requirement | Per-req ceremony | Commit |\n|---|---|---|---|---|\n| 1 | ✅ | alpha | — | ${firstCommit} |\n| 2 | ✅ | beta | — | ${secondCommit} |\n`,
    );
    execFileSync("python3", [
      PACKET_HELPER,
      "--project",
      dir,
      "--design",
      design,
      "--progress",
      progress,
      "--scope",
      "feature",
    ]);
    const packet = readFileSync(join(topic, "demo-review-packet.md"), "utf8");
    const criteria = packet.slice(packet.indexOf("## Acceptance criteria"), packet.indexOf("## Feature acceptance"));
    expect(criteria).toContain("### R1: alpha");
    expect(criteria).toContain("- Given a, When b, Then c.");
    expect(criteria).toContain("### R2: beta");
    expect(criteria).toContain("- Given d, When e, Then f.");
    expect(criteria).toContain("### Production-risk notes");
    expect(criteria).toContain("hot path under login storms");
    expect(criteria).toContain("monitor INCR miss rate"); // >3 lines: range capture, not grep -A3 truncation
    expect(criteria).toContain("## Production-risk areas"); // design-level risk section rides the span into the packet
    expect(criteria).toContain("redis TTL policy is load-bearing");
    expect(criteria).not.toContain("## Feature acceptance");
    expect(criteria).not.toContain("Feature review: parallel");
    expect(criteria).not.toContain("## At a glance");

    const notes = packet.slice(packet.indexOf("## Production-risk notes (verbatim"), packet.indexOf("## Diff"));
    expect(notes).toContain("### Production-risk notes");
    expect(notes).toContain("alpha: touches auth session storage"); // first group captured
    expect(notes).toContain("TTL policy must match session rotation"); // second group captured
    expect(notes).toContain("monitor INCR miss rate");
    expect(notes).not.toContain("## Feature acceptance");
    expect(notes).not.toContain("### R2: beta"); // the ### R terminator stops each group: no R2 duplication
    expect(notes).not.toContain("- Given d, When e, Then f.");

    const featureAcceptance = packet.slice(
      packet.indexOf("## Feature acceptance (verbatim)"),
      packet.indexOf("## Production-risk notes (verbatim"),
    );
    expect(featureAcceptance).toContain("## Feature acceptance");
    expect(featureAcceptance).toContain("`should demo` — Given x, When y, Then z.");
    expect(featureAcceptance).not.toContain("Feature review: parallel");
  });

  it("should derive requirement packet bounds from the Commit column", () => {
    const dir = mkdtempSync(join(tmpdir(), "pwk-packet-base-"));
    const git = (cmd) => execSync(cmd, { cwd: dir }).toString().trim();
    git("git init -q -b main && git config user.email t@t && git config user.name t");
    const sha: string[] = [];
    git("git commit -qm seed --allow-empty");
    for (const [name, body] of [
      ["a", "alpha"],
      ["b", "beta"],
      ["c", "gamma"],
    ]) {
      writeFileSync(join(dir, `${name}.txt`), body);
      git(`git add ${name}.txt && git commit -qm ${name}`);
      sha.push(git("git rev-parse HEAD"));
    }
    const topic = join(dir, "docs/plans/2026-09-17-demo");
    mkdirSync(topic, { recursive: true });
    const design = join(topic, "demo-design.md");
    writeFileSync(
      design,
      "# Demo\n\n## Requirements\n\n### R1: alpha\n\n### R2: beta\n\n### R3: gamma\n\n## Feature acceptance\n",
    );
    const progress = [
      "# Progress: demo",
      "",
      "Design: docs/plans/2026-09-17-demo/demo-design.md",
      "",
      "## Requirements",
      "| # | Done | Requirement | Per-req ceremony | Commit |",
      "|---|---|-------------|-----------------|--------|",
      `| 1 | ✅ | alpha | — | ${sha[0]} |`,
      `| 2 | ✅ | beta | — | ${sha[1]} |`,
      `| 3 | ✅ | gamma | — | ${sha[2]} |`,
      "",
    ].join("\n");
    const progressPath = join(topic, "demo-progress.md");
    writeFileSync(progressPath, progress);
    execFileSync("python3", [
      PACKET_HELPER,
      "--project",
      dir,
      "--design",
      design,
      "--progress",
      progressPath,
      "--scope",
      "requirement",
      "--requirement",
      "3",
    ]);
    const packet = readFileSync(join(topic, "demo-review-packet-r3.md"), "utf8");
    expect(packet).toContain(`Base: ${sha[1]}`);
    expect(packet).toContain(`Head: ${sha[2]}`);
    expect(packet).toContain("## Diff");
    expect(packet).not.toContain("beta");
    expect(packet).toContain("gamma");
  });

  it("should scope per-requirement reviews to the requirement", () => {
    const review = readReviewReference();
    expect(review).toContain("For an opt-in requirement review");
    expect(review).toContain("Requirement-suffixed packets never overwrite");
    // requirement-suffixed stem: per-requirement packets must not overwrite the feature packet
    expect(review).toMatch(/review-packet-r<N>\.md/);
  });
});
