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

// --- Check 5: Feature acceptance contract across the pipeline ---
// brainstorm emits `## Feature acceptance` in the design doc; writing-plans derives it
// into the plan and checks for it at audit; executing-tasks runs it at the integration gate.
// All three must use the same section name so the contract is followable.
console.log("feature acceptance contract:");
const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
// A real section header line: optional leading indent, then `## Feature acceptance`,
// NOT wrapped in backticks (prose mentions like `## Feature acceptance` don't count).
const faHeader = /^[ \t]*## Feature acceptance\b/m;
if (!bs) fail("pwk-brainstorming skill missing");
else if (faHeader.test(bs.content)) ok("pwk-brainstorming: emits `## Feature acceptance` in the design doc");
else fail("pwk-brainstorming: missing `## Feature acceptance` section header");
if (wp && faHeader.test(wp.content)) ok("pwk-writing-plans: derives `## Feature acceptance` into the plan + audits it");
else if (wp) fail("pwk-writing-plans: missing `## Feature acceptance` section header");
if (et && /Feature acceptance/.test(et.content))
  ok("pwk-executing-tasks: runs the feature-acceptance test at the integration gate");
else if (et) fail("pwk-executing-tasks: missing `## Feature acceptance` at the integration gate");

// --- Check 6: phase-unlock list consistency (guard ↔ skills ↔ docs) ---
// The guard hard-codes which /skill: commands exit a gated phase. The skills and docs must
// agree, or the write boundary silently moves. Keep this in sync with workflow-guard.ts.
console.log("phase unlock list:");
const guardSrc = readFileSync(join(root, "extensions/workflow-guard.ts"), "utf8");
// The guard exports UNLOCK_SKILLS as the single source of truth, and the input handler
// dereferences it (`UNLOCK_SKILLS.some(...)`). Verify both halves: the export's contents,
// and that the handler genuinely reads the export (an inline list crept back in would drift).
const unlockSet = new Set();
const exportMatch = guardSrc.match(/export const UNLOCK_SKILLS = \[([^\]]+)\]/);
if (!exportMatch) {
  fail("workflow-guard.ts: missing exported UNLOCK_SKILLS const");
} else {
  for (const m of exportMatch[1].matchAll(/"(pwk-[\w-]+)"/g)) unlockSet.add(m[1]);
}
if (!/UNLOCK_SKILLS\.some\(/.test(guardSrc)) {
  fail("workflow-guard.ts: input handler does not dereference UNLOCK_SKILLS");
}
const EXPECTED_UNLOCK = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-diagnose"];
let unlockOk = true;
for (const s of EXPECTED_UNLOCK) {
  if (!unlockSet.has(s)) {
    fail(`guard unlock list missing ${s}`);
    unlockOk = false;
  }
}
for (const s of unlockSet) {
  if (!EXPECTED_UNLOCK.includes(s)) {
    fail(`guard unlock list has unexpected ${s} (not in EXPECTED_UNLOCK)`);
    unlockOk = false;
  }
}
if (unlockOk) ok(`guard unlock list {${EXPECTED_UNLOCK.join(", ")}} consistent (export + handler)`);
// pwk-status must claim it does NOT unlock.
const status = loadSkills().find((s) => s.name === "pwk-status");
if (status && /does not unlock/i.test(status.content)) {
  ok("pwk-status: documents it does not unlock the guard");
} else if (status) {
  fail("pwk-status: must state it does not unlock the guard");
}
// pwk-diagnose must claim it exits the gated phase.
const diag = loadSkills().find((s) => s.name === "pwk-diagnose");
if (diag && /exits the gated/i.test(diag.content)) {
  ok("pwk-diagnose: documents it exits the gated phase");
} else if (diag) {
  fail("pwk-diagnose: must state invoking it exits the gated phase");
}
// pwk-code-review must claim it is unlocked.
const crSkill = loadSkills().find((s) => s.name === "pwk-code-review");
if (crSkill && /unlocked/i.test(crSkill.content)) {
  ok("pwk-code-review: documents it is unlocked");
} else if (crSkill) {
  fail("pwk-code-review: must state it is unlocked (may edit code)");
}

// --- Check 7: umbrella contract (multi-design-doc requirement = one PR) ---
// An umbrella splits one large requirement into multiple design docs that ship together as
// one PR, via a status-free overview roster + per-part cycle + finalize-once. Each pipeline
// skill must document its half so the contract is followable. Grown per-requirement.
console.log("umbrella contract:");
if (bs && /^## Umbrella\b/m.test(bs.content))
  ok("pwk-brainstorming: documents the umbrella (multi-design-doc, one PR)");
else fail("pwk-brainstorming: missing `## Umbrella` section (multi-design-doc, one PR)");
if (bs && /status-free/i.test(bs.content)) ok("pwk-brainstorming: defines the overview as a status-free roster");
else fail("pwk-brainstorming: overview must be documented as status-free");
if (wp && /reuse/i.test(wp.content) && /umbrella/i.test(wp.content))
  ok("pwk-writing-plans: documents branch reuse for umbrella later parts");
else fail("pwk-writing-plans: missing umbrella branch-reuse note");
if (et && /umbrella/i.test(et.content) && /next part/i.test(et.content))
  ok("pwk-executing-tasks: suggests finalize or brainstorm-next keyed on the overview roster");
else fail("pwk-executing-tasks: missing umbrella post-gate suggestion logic");
const fin = loadSkills().find((s) => s.name === "pwk-finalizing");
if (fin && /umbrella/i.test(fin.content) && /every topic/i.test(fin.content))
  ok("pwk-finalizing: disposes the overview + every part for an umbrella (one PR)");
else fail("pwk-finalizing: missing umbrella dispose-all note");
const wfPhasesDoc = readFileSync(join(root, "docs/workflow-phases.md"), "utf8");
const devGuideDoc = readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8");
if (/status-free/i.test(wfPhasesDoc)) ok("workflow-phases.md: documents the umbrella (status-free overview, one PR)");
else fail("workflow-phases.md: missing umbrella model (status-free overview)");
if (/status-free/i.test(devGuideDoc))
  ok("developer-usage-guide.md: documents the umbrella (status-free overview, one PR)");
else fail("developer-usage-guide.md: missing umbrella model (status-free overview)");

// --- Check 8: umbrella adds no skill and no guard phase (regression lock) ---
// The umbrella feature lives inside the existing 4 pipeline skills; no new skill, no new guard
// phase. This locks that invariant so a future change can't quietly add a pwk-decomposing skill
// or a 'decompose' phase. Green by design — it guards against future drift, not new behavior.
console.log("umbrella scope lock:");
const skillDirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
const straySkill = skillDirs.find((d) => /decompos|split/i.test(d));
if (!straySkill) ok("no decompose/split skill added (umbrella is skill-free)");
else fail(`unexpected new skill dir: ${straySkill}`);
if (!/decompos/i.test(guardSrc)) ok("guard references no decompose phase");
else fail("guard references a 'decompose' phase — umbrella should add no phase");
const phaseMatch = guardSrc.match(/SKILL_TO_PHASE[\s\S]*?\{([\s\S]*?)\}/);
const phaseBlock = phaseMatch ? phaseMatch[1] : "";
const gatedSkillCount = (phaseBlock.match(/pwk-[\w-]+/g) || []).length;
if (gatedSkillCount === 2) ok("SKILL_TO_PHASE unchanged (2 gated skills)");
else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 2`);

// --- Summary ---
console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
