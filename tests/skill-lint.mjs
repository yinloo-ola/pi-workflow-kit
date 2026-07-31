#!/usr/bin/env node
/**
 * Static lint for pi-workflow-kit skills.
 *
 * Verifies properties the test suite can't: that the skill markdown is internally
 * consistent and followable by an agent. Pure content checks — no runtime, no model.
 *
 * Run via `npm run skill-lint` (or as part of `npm run check`).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  ✖ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

/** Parse YAML-ish frontmatter (name: / description:) from a skill markdown file. */
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const block = m[1];
  const get = (key) => {
    const line = block.split("\n").find((l) => l.startsWith(`${key}:`));
    if (!line) return undefined;
    return line
      .slice(key.length + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
  };
  return { name: get("name"), description: get("description") };
}

/** Read all skill files: { name, path, content } */
function loadSkills() {
  const dirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
  return dirs.map((dir) => {
    const path = join(skillsDir, dir, "SKILL.md");
    const content = readFileSync(path, "utf8");
    return { name: dir, path, content };
  });
}

// --- Check 1: every skill has valid frontmatter, name matches directory ---
console.log("frontmatter:");
for (const skill of loadSkills()) {
  const fm = parseFrontmatter(skill.content);
  if (!fm) {
    fail(`${skill.name}: missing YAML frontmatter`);
    continue;
  }
  if (fm.name !== skill.name) fail(`${skill.name}: frontmatter name "${fm.name}" != dir "${skill.name}"`);
  else ok(`${skill.name}: name matches dir`);
  if (!fm.description) fail(`${skill.name}: missing description`);
  else ok(`${skill.name}: has description`);
}

// --- Check 2: tag vocabulary consistency across the pipeline ---
// The canonical vocabularies, defined in pwk-writing-plans and consumed by pwk-executing-tasks.
const CHECKPOINT_VOCAB = ["full", "spec", "none"];
const REVIEW_VOCAB = ["parallel", "inline", "skip"];

function vocabOf(text, kind) {
  // Collect the option tokens that appear after a "Checkpoints" or "Review" header/label.
  // Matches `### Checkpoints: full | spec | none` and prose like `full | spec | none`.
  const lines = text.split("\n");
  const hits = new Set();
  const want = kind === "checkpoint" ? "Checkpoints" : "Review";
  for (const line of lines) {
    if (!line.includes(want)) continue;
    // Match `|`-separated tokens, tolerating backticks, spaces, and a leading colon/paren.
    // e.g. "### Checkpoints: full | spec | none" and "accepted values: `parallel | inline | skip`)".
    const pipeMatch = line.match(/[`:]\s*`?([a-z]+(?:\s*\|\s*`?[a-z]+)+)`?/);
    if (pipeMatch) {
      for (const t of pipeMatch[1].split("|")) hits.add(t.replace(/`/g, "").trim());
    }
  }
  return hits;
}

console.log("tag vocabulary:");
const wp = loadSkills().find((s) => s.name === "pwk-writing-plans");
const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
if (!wp) fail("pwk-writing-plans skill missing");
if (!et) fail("pwk-executing-tasks skill missing");
if (wp && et) {
  for (const [kind, vocab] of [
    ["checkpoint", CHECKPOINT_VOCAB],
    ["review", REVIEW_VOCAB],
  ]) {
    const wpV = vocabOf(wp.content, kind);
    const etV = vocabOf(et.content, kind);
    const label = kind === "checkpoint" ? "checkpoint" : "review";
    for (const v of vocab) {
      if (!wpV.has(v)) fail(`pwk-writing-plans: ${label} vocab missing "${v}"`);
      if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
    }
    // No stray tokens
    for (const t of wpV) if (!vocab.includes(t)) fail(`pwk-writing-plans: unknown ${label} token "${t}"`);
    for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${label} token "${t}"`);
    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across writing-plans + executing-tasks`);
  }
}

// --- Check 3: plan template emits what executing-tasks parses ---
console.log("plan template coverage:");
if (wp && et) {
  const templateNeeds = ["### Checkpoints", "### Review", "## Requirement", "## Setup"];
  for (const tok of templateNeeds) {
    // The writing-plans template should emit each; executing-tasks should reference each.
    const inTemplate = wp.content.includes(tok);
    const inConsumer = et.content.includes(tok.replace("### ", "### ").replace("## ", "## "));
    if (!inTemplate) fail(`pwk-writing-plans template missing "${tok}"`);
    if (!et.content.includes(tok)) fail(`pwk-executing-tasks doesn't reference "${tok}"`);
    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by writing-plans, parsed by executing-tasks`);
  }
}

// --- Check 4: spec+skip incompatibility documented wherever tags are enumerated ---
console.log("spec+skip guard:");
const docsToCheck = [join(root, "docs/workflow-phases.md"), join(root, "docs/developer-usage-guide.md")];
for (const f of docsToCheck) {
  let content;
  try {
    content = readFileSync(f, "utf8");
  } catch {
    fail(`${f}: not found`);
    continue;
  }
  // Must mention spec and the inline-requirement constraint somewhere.
  const hasSpec = /\bspec\b/.test(content);
  const hasGuard = /spec.*inline|inline.*spec/i.test(content) || /requires at least `inline`/.test(content);
  if (hasSpec && hasGuard) ok(`${f.split("/").pop()}: documents spec requires inline review`);
  else fail(`${f.split("/").pop()}: missing spec+inline guard note`);
}
// And in the skills themselves
if (wp && /\bspec\b/.test(wp.content) && /requires at least `inline`/.test(wp.content)) {
  ok("pwk-writing-plans: documents spec requires inline review");
} else if (wp) {
  fail("pwk-writing-plans: missing spec+inline guard note");
}
if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
  ok("pwk-executing-tasks: documents spec requires inline review");
} else if (et) {
  fail("pwk-executing-tasks: missing spec+inline guard note");
}

// --- Summary ---
console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
