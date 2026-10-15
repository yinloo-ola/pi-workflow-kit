#!/usr/bin/env node
/**
 * Static lint for pi-workflow-kit skills.
 *
 * Verifies properties the test suite can't: that the skill markdown is internally
 * consistent and followable by an agent. Pure content checks — no runtime, no model.
 *
 * Run via `npm run skill-lint` (or as part of `npm run check`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CODE_DIGEST_MARKERS,
  DIGEST_MARKERS,
  DIGEST_RENDERING_MARKERS,
  EVIDENCE_SPINE_MARKERS,
  SINGLE_DOC_MARKERS,
  STATUS_STATE_MARKERS,
  TOOL_FREEDOM_MARKERS,
  CODEMODE_SWEEP_SCRIPT,
} from "./markers.mjs";
import { sweepSkillDir } from "./prescription-sweep.mjs";

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
    const resourceDirs = ["references", "scripts"].map((name) => join(skillsDir, dir, name));
    const resources = resourceDirs
      .filter((resourceDir) => existsSync(resourceDir))
      .flatMap((resourceDir) =>
        readdirSync(resourceDir)
          .filter((name) => /\.(md|py)$/.test(name))
          .map((name) => readFileSync(join(resourceDir, name), "utf8")),
      );
    return { name: dir, path, content, contractContent: [content, ...resources].join("\n") };
  });
}

// --- Check 1: every skill has valid frontmatter, name matches directory ---
console.log("frontmatter:");
for (const skill of loadSkills()) {
  const fm = parseFrontmatter(skill.contractContent);
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
// The canonical vocabularies, defined in pwk-brainstorming and consumed by pwk-executing-tasks.
const CHECKPOINT_VOCAB = ["none", "full"];
const REVIEW_VOCAB = ["parallel", "inline", "skip"];
// leaner-execution-gates R2: the feature-level review gained a risk-scaled `auto`.
const FEATURE_REVIEW_VOCAB = ["auto", "parallel", "inline"];

function vocabOf(text, label, exclude) {
  // Collect the option tokens that appear after a vocabulary header/label.
  // Matches `### Checkpoints: none | full` and prose like `none | full`.
  // `exclude` drops lines that belong to a longer label (plain `Review` must not swallow
  // `### Feature review: auto | parallel | inline`).
  const lines = text.split("\n");
  const hits = new Set();
  for (const line of lines) {
    if (!line.includes(label)) continue;
    if (exclude && line.includes(exclude)) continue;
    // Match `|`-separated tokens, tolerating backticks, spaces, a leading colon/paren, and
    // GFM-escaped pipes in table cells (`none \| full`).
    // e.g. "### Checkpoints: none | full" and "accepted values: `parallel | inline | skip`)".
    const pipeMatch = line.match(/[`:]\s*`?([a-z]+(?:\s*\\?\|\s*`?[a-z]+)+)`?/);
    if (pipeMatch) {
      for (const t of pipeMatch[1].split("|")) hits.add(t.replace(/[`\\]/g, "").trim());
    }
  }
  return hits;
}

console.log("tag vocabulary:");
const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
if (!bs) fail("pwk-brainstorming skill missing");
if (!et) fail("pwk-executing-tasks skill missing");
if (bs && et) {
  for (const [label, vocab] of [
    ["Checkpoints", CHECKPOINT_VOCAB],
    ["Review", REVIEW_VOCAB],
    ["Feature review", FEATURE_REVIEW_VOCAB],
  ]) {
    const exclude = label === "Review" ? "Feature review" : undefined;
    const bsV = vocabOf(bs.contractContent, label, exclude);
    const etV = vocabOf(et.contractContent, label, exclude);
    const kind = label.toLowerCase();
    const isPerReq = label === "Checkpoints" || label === "Review";
    for (const v of vocab) {
      if (!bsV.has(v)) fail(`pwk-brainstorming: ${label} vocab missing "${v}"`);
      if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
    }
    // No stray tokens
    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${kind} token "${t}"`);
    for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${kind} token "${t}"`);
    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across brainstorming + executing-tasks`);
    // leaner-execution-gates R2 — the feature review is risk-scaled: `auto` resolves on the
    // design's own production-risk content, and an explicit human tag wins both ways.
    if (!isPerReq) {
      if (/production-risk content/i.test(bs.contractContent) && /production-risk content/i.test(et.contractContent)) {
        ok("feature review: `auto` is keyed on the design's production-risk content (both skills)");
      } else {
        fail("feature review: both skills must state what `auto` keys on (production-risk content)");
      }
      if (/explicit tag wins/i.test(et.contractContent)) {
        ok("pwk-executing-tasks: an explicit feature-review tag wins over `auto`");
      } else {
        fail("pwk-executing-tasks: must state that an explicit feature-review tag wins over `auto`");
      }
    }
  }
}

// --- Check 3: the design-doc template emits what executing-tasks parses ---
console.log("design template coverage:");
if (bs && et) {
  const templateNeeds = ["### Checkpoints", "### Review", "### R", "## Setup"];
  for (const tok of templateNeeds) {
    // The brainstorming template should emit each; executing-tasks should reference each.
    const inTemplate = bs.contractContent.includes(tok);
    if (!inTemplate) fail(`pwk-brainstorming template missing "${tok}"`);
    if (!et.contractContent.includes(tok)) fail(`pwk-executing-tasks doesn't reference "${tok}"`);
    if (inTemplate && et.contractContent.includes(tok))
      ok(`"${tok}" emitted by brainstorming, parsed by executing-tasks`);
  }
}

// --- Check 4: the `spec` checkpoint value is gone (leaner-execution-gates R4) ---
// It was a stop on acceptance criteria the human already approved during brainstorm, so
// the enum is `none | full` and the paired "spec requires inline review" rule went with it.
console.log("spec checkpoint removed:");
const specSites = [
  ["docs/workflow-phases.md", readFileSync(join(root, "docs/workflow-phases.md"), "utf8")],
  ["docs/developer-usage-guide.md", readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8")],
  ["pwk-brainstorming", bs?.contractContent ?? ""],
  ["pwk-executing-tasks", et?.contractContent ?? ""],
];
let specFree = true;
for (const [name, content] of specSites) {
  const specLines = content.split("\n").filter((line) => /Checkpoints/.test(line) && /\bspec\b/.test(line));
  if (specLines.length > 0) {
    fail(`${name}: Checkpoints enum still lists \`spec\`: "${specLines[0].trim()}"`);
    specFree = false;
  }
  if (/requires at least `inline`/.test(content)) {
    fail(`${name}: the retired \`spec\` ⇒ inline rule must be gone`);
    specFree = false;
  }
}
if (specFree) ok("`spec` checkpoint value removed from every site (enum + paired rule)");

// F6 (workflow-consistency R5): the brainstorming template's fenced design block
// must itself contain the `### Feature review` tag line — the packet FA_CMD sed
// terminates on it, so a template-conformant doc with a tagless FA section silently
// widened the FA span to EOF. Asserts the fence, not prose mentions.
const FA_TEMPLATE_TAG = "### Feature review";
console.log("feature-acceptance template tag (F6):");
if (!bs) fail("pwk-brainstorming skill missing");
else {
  const mdFences = [...bs.contractContent.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  const faFences = mdFences.filter((body) => /^ {0,3}## Feature acceptance\b/m.test(body));
  if (faFences.length === 0) fail("pwk-brainstorming: no fenced template block contains `## Feature acceptance`");
  else if (!faFences.every((body) => new RegExp(`^ {0,3}${FA_TEMPLATE_TAG}`, "m").test(body)))
    fail("pwk-brainstorming template FA block missing `### Feature review` tag line");
  else ok("pwk-brainstorming template FA block carries the `### Feature review` tag line");
}

// --- Check 5: Feature acceptance contract across the pipeline ---
// brainstorm emits `## Feature acceptance` in the design doc; executing-tasks writes it
// as the E2E and gates on it. Both must use the same section name so the contract is followable.
console.log("feature acceptance contract:");
// A real section header line: optional leading indent, then `## Feature acceptance`,
// NOT wrapped in backticks (prose mentions like `## Feature acceptance` don't count).
const faHeader = /^[ \t]*## Feature acceptance\b/m;
if (!bs) fail("pwk-brainstorming skill missing");
else if (faHeader.test(bs.contractContent)) ok("pwk-brainstorming: emits `## Feature acceptance` in the design doc");
else fail("pwk-brainstorming: missing `## Feature acceptance` section header");
if (et && /Feature acceptance/.test(et.contractContent))
  ok("pwk-executing-tasks: runs the feature-acceptance test at the ship checkpoint");
else if (et) fail("pwk-executing-tasks: missing `## Feature acceptance` at the ship checkpoint");

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
const EXPECTED_UNLOCK = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-walkthrough"];
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
if (status && /does not unlock/i.test(status.contractContent)) {
  ok("pwk-status: documents it does not unlock the guard");
} else if (status) {
  fail("pwk-status: must state it does not unlock the guard");
}
// pwk-code-review must claim it is unlocked.
const crSkill = loadSkills().find((s) => s.name === "pwk-code-review");
if (crSkill && /unlocked/i.test(crSkill.contractContent)) {
  ok("pwk-code-review: documents it is unlocked");
} else if (crSkill) {
  fail("pwk-code-review: must state it is unlocked (may edit code)");
}

// --- Check 7: umbrella contract (multi-design-doc requirement = one PR) ---
// An umbrella splits one large requirement into multiple design docs that ship together as
// one PR, via a status-free overview roster + per-part cycle + finalize-once. Each pipeline
// skill must document its half so the contract is followable. Grown per-requirement.
console.log("umbrella contract:");
if (bs && (/^## Umbrella\b/m.test(bs.contractContent) || /^# Umbrella mechanics\b/m.test(bs.contractContent)))
  ok("pwk-brainstorming: documents the umbrella (multi-design-doc, one PR)");
else fail("pwk-brainstorming: missing `## Umbrella` section (multi-design-doc, one PR)");
if (bs && /status-free/i.test(bs.contractContent))
  ok("pwk-brainstorming: defines the overview as a status-free roster");
else fail("pwk-brainstorming: overview must be documented as status-free");
// R7 — the roster shape two consumers read (pwk-finalizing's "read its parts roster",
// pwk-status's roll-up) is pinned here, so a drifted heading fails loudly instead of
// both readers silently seeing an empty roster and disposing nothing.
if (bs?.contractContent.includes("## Parts (build order)"))
  ok("pwk-brainstorming: pins the roster heading `## Parts (build order)`");
else fail("pwk-brainstorming: missing the `## Parts (build order)` roster heading");
if (bs && /^\s*\d+\.\s*<leaf>\s*—\s*<one-line scope>\s*$/m.test(bs.contractContent))
  ok("pwk-brainstorming: pins the roster item shape (`N. <leaf> — <one-line scope>)`");
else fail("pwk-brainstorming: missing the roster item shape `N. <leaf> — <one-line scope>`");
if (et && /reuse/i.test(et.contractContent) && /umbrella/i.test(et.contractContent))
  ok("pwk-executing-tasks: documents branch reuse for umbrella later parts");
else fail("pwk-executing-tasks: missing umbrella branch-reuse note");
if (et && /umbrella/i.test(et.contractContent) && /next part/i.test(et.contractContent))
  ok("pwk-executing-tasks: suggests finalize or brainstorm-next keyed on the overview roster");
else fail("pwk-executing-tasks: missing umbrella post-gate suggestion logic");
const fin = loadSkills().find((s) => s.name === "pwk-finalizing");
if (fin && /umbrella/i.test(fin.contractContent) && /every topic/i.test(fin.contractContent))
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
if (gatedSkillCount === 1) ok("SKILL_TO_PHASE unchanged (1 gated skill — the design phase)");
else fail(`SKILL_TO_PHASE has ${gatedSkillCount} gated skills — expected 1`);

// --- Check 9: feature-gate execution model (grown per-requirement) ---
// Feature-acceptance E2E is the primary gate; per-requirement checkpoints/reviews are opt-in
// (default off); two always-on feature checkpoints + one feature-level review; meaningful-test
// rules. Each marker is a string only the new model has, so a stale skill fails (no false green).
console.log("feature-gate model:");
const fgMark = (file, content, marker, label) => {
  if (content?.includes(marker)) ok(`${file}: ${label}`);
  else fail(`${file}: missing ${label} — marker "${marker}"`);
};
// Requirement 1 — brainstorming tag defaults + feature-level review
if (bs) {
  fgMark("pwk-brainstorming", bs.contractContent, "### Feature review", "feature-level review tag");
  fgMark("pwk-brainstorming", bs.contractContent, "default to `none` / `skip`", "per-requirement defaults");
  fgMark("pwk-brainstorming", bs.contractContent, "primary enforced spec", "Feature acceptance as primary spec");
}
// Requirement 2 — pwk-executing-tasks feature-gate flow
if (et) {
  // leaner-execution-gates R3: the feature-spec checkpoint became a notice — the E2E is still
  // written first and still gates, it just no longer pauses execution.
  fgMark("pwk-executing-tasks", et.contractContent, "without waiting for approval", "feature-spec notice (no stop)");
  if (!/CHECKPOINT: feature-spec/.test(et.contractContent)) {
    ok("pwk-executing-tasks: the retired feature-spec checkpoint is gone");
  } else {
    fail("pwk-executing-tasks: the feature-spec checkpoint must be a notice, not a stop");
  }
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    "ship checkpoint",
    "ship checkpoint (review before final approval)",
  );
  fgMark("pwk-executing-tasks", et.contractContent, "ship-paused", "ship-paused phase");
  fgMark("pwk-executing-tasks", et.contractContent, "opt-in", "per-requirement ceremony is opt-in");
}
// Requirement 3 — meaningful-test rules mirrored across brainstorming, executing-tasks, lessons
fgMark("pwk-brainstorming", bs?.contractContent, "Test observable behavior", "meaningful-test rule (brainstorming)");
fgMark("pwk-executing-tasks", et.contractContent, "Test observable behavior", "meaningful-test rule (executing-tasks)");
const lessonsMd = readFileSync(join(root, "docs/lessons.md"), "utf8");
fgMark("docs/lessons.md", lessonsMd, "Test observable behavior", "meaningful-test rule (lessons)");
// Requirement 4 — code-review + brainstorming wording
fgMark("pwk-code-review", crSkill?.contractContent, "whole feature diff", "whole-feature-diff scope");
fgMark("pwk-brainstorming", bs?.contractContent, "primary enforced spec", "Feature acceptance as primary spec");

// leaner-execution-gates R5/R6 — the digest's `### Flow` is a navigable map, and it is
// written from reviewed reality: it must agree with the tracing report (or, in `inline`
// mode, the spec-coverage pass), with unresolved disagreements surfaced, not smoothed over.
console.log("flow truth:");
if (et) {
  fgMark("pwk-executing-tasks", et.contractContent, "**Flow shape**", "enriched Flow shape block");
  fgMark("pwk-executing-tasks", et.contractContent, "tracing report", "Flow truth-checked against the tracing report");
  if (/inline[\s\S]{0,260}spec-coverage|spec-coverage[\s\S]{0,260}inline/i.test(et.contractContent)) {
    ok("pwk-executing-tasks: inline mode falls back to the spec-coverage pass");
  } else {
    fail("pwk-executing-tasks: must check the Flow against the spec-coverage pass in inline mode");
  }
  if (/surfaced/i.test(et.contractContent)) ok("pwk-executing-tasks: unresolved Flow disagreement is surfaced");
  else fail("pwk-executing-tasks: unresolved Flow disagreement must be surfaced to the human");
}

// digest-rendering — the digest's structured sections are markdown lists, so any
// CommonMark preview renders each label and hop chain on its own line (bare label
// lines with 2-space indents are lazy continuations and merge into one paragraph).
console.log("digest rendering:");
if (et) {
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.flowBulletSpine,
    "Flow Spine label is a bullet",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.flowBulletBranches,
    "Flow Branches label is a bullet",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.flowBulletSideEffects,
    "Flow Side effects label is a bullet",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.flowBulletLineRule,
    "fill rule states the bullet line form",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.gotchasBulletItem,
    "Gotchas: one real risk per bullet",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_RENDERING_MARKERS.keyFilesBulletEach,
    "Key files: one bullet each",
  );
}

// --- Check 10: parallelize-workflow (R1 scout + R2 auto-tag + R3 cross-skill) ---
// pwk-recon-scout is a new read-only package agent dispatched from pwk-brainstorming before
// design; pwk-brainstorming (since pwk 2.0) auto-tags `### Review: parallel` for requirements
// with a non-empty `### Production-risk notes` section; the other skills + docs reference (not
// restate) the rule. Markers are unique to the new behavior so a stale skill fails (no false
// green). See docs/plans/2026-08-27-parallelize-workflow-design.md.
console.log("parallelize-workflow:");
// R1: scout agent shape (YAML frontmatter, read-only tools, systemPromptMode replace)
const scoutPath = join(root, "agents", "pwk-recon-scout.md");
let scoutContent;
try {
  scoutContent = readFileSync(scoutPath, "utf8");
  ok("agents/pwk-recon-scout.md: exists");
} catch {
  fail("agents/pwk-recon-scout.md: missing");
}
if (scoutContent) {
  const scoutFm = parseFrontmatter(scoutContent);
  if (scoutFm?.name === "pwk-recon-scout") ok("scout: frontmatter name matches");
  else fail("scout: frontmatter name must be `pwk-recon-scout`");
  // The harness's parseFrontmatter only reads `name` + `description`; read tools/systemPromptMode
  // by re-scanning the YAML block.
  const fmBlock = scoutContent.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  if (/tools:\s*read,\s*grep,\s*find,\s*ls,\s*bash\b/.test(fmBlock)) {
    ok("scout: tools restricted to read, grep, find, ls, bash (read-only set)");
  } else {
    fail("scout: tools must be exactly `read, grep, find, ls, bash` (read-only set)");
  }
  if (/systemPromptMode:\s*replace/.test(fmBlock)) {
    ok("scout: systemPromptMode replace");
  } else {
    fail("scout: systemPromptMode must be `replace` (mirror reviewer agents)");
  }
  // 5-section codebase map: each header must appear, in order.
  const requiredSections = ["Relevant files", "Existing patterns", "Call sites", "Test layout", "Gotchas"];
  let lastIdx = -1;
  let sectionsOk = true;
  for (const s of requiredSections) {
    const idx = scoutContent.indexOf(s);
    if (idx < 0 || idx <= lastIdx) {
      fail(`scout: missing or out-of-order section "${s}"`);
      sectionsOk = false;
    }
    lastIdx = idx;
  }
  if (sectionsOk) {
    ok("scout: 5-section codebase map (Relevant files → Existing patterns → Call sites → Test layout → Gotchas)");
  }
  // Must require file:line citations.
  if (/file:line|path:line|\bpath:line\b/i.test(scoutContent)) {
    ok("scout: requires file:line citations per claim");
  } else {
    fail("scout: must require `file:line` (or `path:line`) citations per claim");
  }
  // Must be observations only (no design recommendations).
  if (/observations? only/i.test(scoutContent) || /no design (recommendations?|opinion)/i.test(scoutContent)) {
    ok("scout: framed as observations only (no design opinion)");
  } else {
    fail("scout: must be framed as observations only (no design recommendations)");
  }
}
// R1: pwk-brainstorming dispatches the scout and has a graceful fallback.
if (bs) {
  if (bs.contractContent.includes("pwk-recon-scout")) {
    ok("pwk-brainstorming: dispatches pwk-recon-scout by name");
  } else {
    fail("pwk-brainstorming: must dispatch pwk-recon-scout (mention by name)");
  }
  if (/Scout:\s*unavailable/i.test(bs.contractContent)) {
    ok("pwk-brainstorming: documents the `Scout: unavailable` fallback when pi-subagents is absent");
  } else {
    fail("pwk-brainstorming: must document `Scout: unavailable` fallback (graceful degradation)");
  }
  if (
    /trivial/i.test(bs.contractContent) &&
    /skip/i.test(bs.contractContent) &&
    /scout|recon/i.test(bs.contractContent)
  ) {
    ok("pwk-brainstorming: skips scout on trivial changes (proportionality shortcut)");
  } else {
    fail("pwk-brainstorming: must skip scout on trivial changes (proportionality shortcut)");
  }
}
// R2 (leaner-execution-gates R1): the per-requirement review auto-tag is DELETED.
// The human owns `### Review` — nothing is tagged silently. The old rule (non-empty
// Production-risk notes ⇒ Review: parallel) must not survive anywhere, and no skill may
// re-introduce a silent tag. Markers are absence-shaped so a stale skill fails.
if (bs) {
  if (/only the human tags/i.test(bs.contractContent)) {
    ok("pwk-brainstorming: only the human tags a slice for review");
  } else {
    fail("pwk-brainstorming: must state that only the human tags a slice");
  }
  if (/Production-risk notes/.test(bs.contractContent) && !/Review:\s*parallel/.test(bs.contractContent)) {
    ok("pwk-brainstorming: risk notes no longer imply `Review: parallel` (auto-tag removed)");
  } else {
    fail("pwk-brainstorming: must not map Production-risk notes to `Review: parallel`");
  }
  // The default must still be `skip` for requirements the human does not tag.
  if (/### Review: skip \| parallel \| inline/.test(bs.contractContent)) {
    ok("pwk-brainstorming: still documents `### Review: skip | parallel | inline`");
  } else {
    fail("pwk-brainstorming: must keep the Review tag vocabulary with `skip`");
  }
}
// No skill may re-introduce silent tagging: the concept must be absent repo-wide.
let autoTagSurvivors = 0;
for (const s of loadSkills()) {
  for (const line of s.contractContent.split("\n")) {
    if (/auto-tag/i.test(line)) {
      autoTagSurvivors++;
      fail(`${s.name}: still mentions auto-tagging: "${line.trim()}"`);
    }
  }
}
if (autoTagSurvivors === 0) ok("no skill auto-tags requirements (silent tagging removed)");
// The cross-skill link survives independently of the removed rule.
if (et) {
  if (/pwk-brainstorming/.test(et.contractContent)) {
    ok("pwk-executing-tasks: references pwk-brainstorming (tag semantics)");
  } else {
    fail("pwk-executing-tasks: must reference pwk-brainstorming");
  }
}

// --- Check 11: human-review-digests (grown per-requirement) ---
// R1 — design docs open with an at-a-glance digest for the human: a plain-language
// summary + a one-line-per-requirement R# table; trivial docs get a single In-short line.
console.log("human-review-digests:");
if (bs) {
  fgMark("pwk-brainstorming", bs.contractContent, DIGEST_MARKERS.atAGlance, "at-a-glance digest mandated");
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    "immediately before `## Requirements`",
    "at-a-glance sits before Requirements",
  );
  fgMark("pwk-brainstorming", bs.contractContent, DIGEST_MARKERS.atAGlanceTable, "R# one-line table");
  fgMark("pwk-brainstorming", bs.contractContent, "R# = the requirement", "R# numbering linkage");
  fgMark("pwk-brainstorming", bs.contractContent, "In short:", "trivial fast-path In-short line");
  if (/plain language/i.test(bs.contractContent)) ok("pwk-brainstorming: at-a-glance plain-language rule");
  else fail("pwk-brainstorming: at-a-glance must mandate plain language");
  // pwk 2.0 R1 — the design doc is the single buildable artifact: one block per
  // requirement carrying criteria + tags; the plan phase's re-derivations are gone.
  fgMark("pwk-brainstorming", bs.contractContent, SINGLE_DOC_MARKERS.rBlock, "R<n> requirement blocks");
  fgMark("pwk-brainstorming", bs.contractContent, SINGLE_DOC_MARKERS.criteriaInBlock, "criteria inside the block");
  fgMark("pwk-brainstorming", bs.contractContent, SINGLE_DOC_MARKERS.noTestNameLists, "no test-name lists");
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    SINGLE_DOC_MARKERS.auditExactlyOnce,
    "audit: criteria + tags exactly once",
  );
  // leaner-execution-gates R1 — the auto-tag rule and its single-source claim are gone.
  if (!bs.contractContent.includes(SINGLE_DOC_MARKERS.autoTagTruth)) {
    ok("pwk-brainstorming: removed auto-tag rule leaves no single-source claim");
  } else {
    fail("pwk-brainstorming: the removed auto-tag rule must not leave its single-source claim behind");
  }
  if (!/crosswalk/i.test(bs.contractContent)) ok("pwk-brainstorming: no mapping-table instruction");
  else fail("pwk-brainstorming: must not instruct a crosswalk mapping table");
  if (!/pwk-writing-plans/.test(bs.contractContent)) ok("pwk-brainstorming: no plan-phase hand-off");
  else fail("pwk-brainstorming: must hand off to pwk-executing-tasks, not a plan phase");
  // pwk 2.0 R2 — decisions-first At a glance: summary, then Key decisions (honest-empty
  // rejected-alternative clauses — never manufactured), then the R#/risk table.
  fgMark("pwk-brainstorming", bs.contractContent, SINGLE_DOC_MARKERS.keyDecisions, "decisions-first at-a-glance");
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    SINGLE_DOC_MARKERS.neverManufactured,
    "honest-empty rejected alternatives",
  );
  const glanceDecisionsIdx = bs.contractContent.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
  const glanceTableIdx = bs.contractContent.indexOf(DIGEST_MARKERS.atAGlanceTable);
  if (glanceDecisionsIdx !== -1 && glanceTableIdx > glanceDecisionsIdx) {
    ok("pwk-brainstorming: Key decisions sit before the R# table");
  } else {
    fail("pwk-brainstorming: Key decisions must precede the R#/risk table");
  }
  const userDocsDecisions = [
    join(root, "docs/workflow-phases.md"),
    join(root, "docs/developer-usage-guide.md"),
    join(root, "docs/oversight-model.md"),
    join(root, "README.md"),
  ];
  let docsOk = true;
  for (const f of userDocsDecisions) {
    if (!/Key decisions/i.test(readFileSync(f, "utf8"))) {
      fail(`${f.split("/").pop()}: must mirror the decisions-first At a glance`);
      docsOk = false;
    }
  }
  if (docsOk) ok("user docs mirror the decisions-first At a glance");
}
// R2 — the crosswalk is GONE with the plan phase (pwk 2.0): no skill may emit one,
// and the pwk-writing-plans skill must not exist at all.
if (existsSync(join(skillsDir, "pwk-writing-plans"))) {
  fail("pwk-writing-plans: skill still exists — the plan phase was removed in pwk 2.0");
} else {
  ok("pwk-writing-plans: removed (no plan phase)");
}
let crosswalkFree = true;
for (const s of loadSkills()) {
  if (/crosswalk/i.test(s.contractContent)) {
    fail(`${s.name}: still mentions a crosswalk — the plan-phase artifact is gone`);
    crosswalkFree = false;
  }
}
if (crosswalkFree) ok("no skill mentions a crosswalk (plan-phase artifact gone)");
// R3 — the progress file carries an execution summary filled as requirements land; the
// ship checkpoint merges feature-complete + review: review runs before the one final
// approval, presenting digest + coverage table, diff on request.
if (et) {
  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_MARKERS.execSummary, "execution summary section");
  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_MARKERS.execSummaryTable, "execution summary table shape");
  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_MARKERS.fillAsYouLand, "fill-as-you-land rule");
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    DIGEST_MARKERS.deviationAtDeviation,
    "deviation logged at deviation time",
  );
  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_MARKERS.shipPaused, "ship-paused phase");
  fgMark("pwk-executing-tasks", et.contractContent, DIGEST_MARKERS.diffOnRequest, "ship presentation: diff on request");
  const enumLine = et.contractContent.match(/`Feature phase` is one of:[^\n]*/)?.[0] ?? "";
  if (enumLine.includes(DIGEST_MARKERS.shipPaused) && !enumLine.includes("feature-complete-paused")) {
    ok("pwk-executing-tasks: phase enum uses ship-paused (legacy feature-complete-paused gone)");
  } else {
    fail("pwk-executing-tasks: phase enum must use ship-paused, not feature-complete-paused");
  }
}
// R5/R6 — topic docs live in their own docs/plans/<date>-<topic>/ folder (one folder
// per topic, single-leaf and umbrella alike); every discovery site pins the find recipe
// (recursive by construction); finalize disposes the folder as one unit.
const GLOB_SITES = [bs, et, status, fin].filter(Boolean);
for (const s of GLOB_SITES) {
  fgMark(s.name, s.contractContent, STATUS_STATE_MARKERS.findRecipe, "pinned find discovery recipe");
}
if (et) {
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    "docs/plans/**/overview.md",
    "post-review routing names the forbidden repo-wide overview glob",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    "set `Feature phase: reviewing` first",
    "review phase is set before the review runs (mid-review resume routes in)",
  );
}
if (fin) {
  fgMark("pwk-finalizing", fin.contractContent, DIGEST_MARKERS.umbrellaFolder, "umbrella folder disposal as one unit");
}
// R6 — finalizing ships only Feature phase `done`; every other state bounces back
// to executing-tasks.
if (fin) {
  fgMark("pwk-finalizing", fin.contractContent, "Feature phase", "finalizing reads Feature phase");
  fgMark("pwk-finalizing", fin.contractContent, DIGEST_MARKERS.mustBeDone, "done is the only shippable phase");
}
// Post-review hazard fixes — the topic-folder rm -rf path is anchored to discovery
// (never agent-typed) and the folder archive is verified before committing.
if (fin) {
  fgMark("pwk-finalizing", fin.contractContent, "verbatim from discovery", "folder delete path anchored to discovery");
  fgMark(
    "pwk-finalizing",
    fin.contractContent,
    "ls docs/plans/completed/<date>-<topic>/",
    "archive verified before commit",
  );
}

// --- Check 12: code-digest feature (grown per-requirement) ---
// R1 — the progress-file template carries a code-digest section below the
// execution summary: four subsections, filled once after the review passes.
console.log("code-digest:");
if (et) {
  fgMark("pwk-executing-tasks", et.contractContent, CODE_DIGEST_MARKERS.codeDigest, "code-digest section in template");
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    CODE_DIGEST_MARKERS.digestOnceOnly,
    "digest written once, post-review, never back-filled",
  );
  const tStart = et.contractContent.indexOf("# Progress:");
  const tEnd = tStart === -1 ? -1 : et.contractContent.indexOf("```", tStart);
  if (tStart !== -1 && tEnd !== -1) {
    const template = et.contractContent.slice(tStart, tEnd);
    const shape = /### Summary[\s\S]*### Flow[\s\S]*### Gotchas[\s\S]*### Key files/.test(template);
    if (shape) ok("pwk-executing-tasks: digest subsection shape in template");
    else fail("pwk-executing-tasks: digest must carry Summary/Flow/Gotchas/Key files in order");
    if (template.indexOf("## Code digest") > template.indexOf("## Execution summary")) {
      ok("pwk-executing-tasks: digest sits below the execution summary");
    } else {
      fail("pwk-executing-tasks: digest must sit directly below the execution summary");
    }
  } else {
    fail("pwk-executing-tasks: progress template not found");
  }
}

// R2 — the digest write point: after review success, before the ship pause,
// derived from the packet sections; stale packet re-runs the recipe; resume-safe.
if (et) {
  const stepAt = et.contractContent.indexOf("**Write the code digest**");
  const reviewAt = et.contractContent.indexOf("**Run the feature review**");
  const pauseAt = et.contractContent.indexOf("**⏸ CHECKPOINT: ship**");
  if (stepAt === -1 || reviewAt === -1 || pauseAt === -1) {
    fail("pwk-executing-tasks: digest write step / review step / ship pause not found");
  } else if (stepAt > reviewAt && stepAt < pauseAt) {
    ok("pwk-executing-tasks: digest written between review success and the pause");
    const stepLine = et.contractContent.slice(stepAt, et.contractContent.indexOf("\n", stepAt));
    for (const section of ["`## Commits`", "`## Changed files`", "`## Diff`"]) {
      fgMark("pwk-executing-tasks", stepLine, section, `digest derives from the packet ${section}`);
    }
    const stepBlock = et.contractContent.slice(stepAt, stepAt + 900);
    if (/re-run (?:the )?(?:recipe|helper)/.test(`${stepBlock}\n${et.contractContent}`))
      ok("pwk-executing-tasks: stale packet re-runs the packet helper");
    else fail("pwk-executing-tasks: digest step must re-run a stale packet first");
    if (/`Feature phase: reviewing`/.test(stepBlock)) ok("pwk-executing-tasks: resume path hits the same write point");
    else fail("pwk-executing-tasks: digest step must name the reviewing resume path");
  } else {
    fail("pwk-executing-tasks: digest write step must sit after the review, before the pause");
  }
}

// R3 — the ship-checkpoint presentation includes the code digest, after the
// execution summary and before diff-on-request (which stays last).
if (et) {
  const listAt = et.contractContent.indexOf("present, in this order:");
  if (listAt === -1) {
    fail("pwk-executing-tasks: ship presentation list not found");
  } else {
    const list = et.contractContent.slice(listAt, listAt + 800);
    const summaryAt = list.indexOf("the **execution summary**");
    const digestAt = list.indexOf("the **code digest**");
    const diffAt = list.indexOf("full diff on request");
    if (summaryAt !== -1 && digestAt !== -1 && diffAt !== -1 && digestAt > summaryAt && digestAt < diffAt) {
      ok("pwk-executing-tasks: digest presented after the summary, before diff-on-request");
    } else {
      fail("pwk-executing-tasks: presentation order must be summary → code digest → diff on request");
    }
  }
}

// R4 — fill rules stated once next to the template, scoped to that paragraph
// (several phrases legitimately exist elsewhere in the skill).
if (et) {
  const rulesAt = et.contractContent.indexOf("## Code digest` is filled once");
  if (rulesAt === -1) {
    fail("pwk-executing-tasks: digest fill-rules paragraph not found");
  } else {
    const rules = et.contractContent.slice(rulesAt, rulesAt + 900);
    const ruleChecks = [
      [/plain language/i, "plain language"],
      [/R# anchors/, "R# anchors"],
      [/no test names/, "no test names"],
      [/A -> B -> C/, "arrow chains"],
      [new RegExp(CODE_DIGEST_MARKERS.alertReviewerConfirmedOnly), "[ALERT] reviewer-confirmed only"],
      [new RegExp(CODE_DIGEST_MARKERS.honestEmptyGotchas), "honest empty gotchas"],
      [new RegExp(CODE_DIGEST_MARKERS.keyFilesCap), "key files cap"],
    ];
    for (const [re, label] of ruleChecks) {
      if (re.test(rules)) ok(`pwk-executing-tasks: fill rule — ${label}`);
      else fail(`pwk-executing-tasks: fill rule missing — ${label}`);
    }
  }
}

// R5 — every pinned discovery recipe excludes completed/ (archived work is not
// in flight), while the finalize disposal commands stay byte-identical.
const EXCLUSION_SITES = [
  [status, "1. **Discover**"],
  [bs, "**Discovery**"],
  [et, "**Find the doc**"],
  [fin, "Read **every** relevant progress file"],
  [fin, "**Multi-leaf topic**"],
];
for (const pair of EXCLUSION_SITES) {
  const s = pair[0];
  if (!s) {
    fail(`skill file missing from load: ${pair[1]}`);
    continue;
  }
  const at = s.contractContent.indexOf(pair[1]);
  if (at === -1) {
    fail(`${s.name}: discovery anchor not found for the completed/ exclusion`);
    continue;
  }
  fgMark(
    s.name,
    s.contractContent.slice(at, at + 400),
    CODE_DIGEST_MARKERS.completedExclusion,
    "discovery excludes completed/",
  );
}
if (et) {
  const routingAt = et.contractContent.indexOf("## After the feature review");
  const presentAt = et.contractContent.indexOf("Present:", routingAt);
  if (routingAt !== -1 && presentAt !== -1) {
    const routing = et.contractContent.slice(routingAt, presentAt);
    fgMark("pwk-executing-tasks", routing, CODE_DIGEST_MARKERS.completedExclusion, "routing excludes completed/");
  } else {
    fail("pwk-executing-tasks: routing block anchors not found");
  }
}
if (fin) {
  const DISPOSAL_ANCHORS = [
    "rm -rf docs/plans/<date>-<topic>/",
    "mv docs/plans/<date>-<topic>/ docs/plans/completed/",
    "ls docs/plans/completed/<date>-<topic>/ >/dev/null",
    "verbatim from discovery",
  ];
  for (const anchor of DISPOSAL_ANCHORS) {
    fgMark("pwk-finalizing", fin.contractContent, anchor, "disposal command unchanged");
  }
}

// R6 — brainstorming interviews in frontier rounds: numbered questions with
// recommended answers, dimension checklist walked visibly, approvals single-decision,
// and the old one-question-at-a-time principle gone from its defining line.
if (bs) {
  const step3 = bs.contractContent.slice(
    bs.contractContent.indexOf("**Understand the idea**"),
    bs.contractContent.indexOf("**Codebase recon**"),
  );
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.frontier, "frontier-round protocol");
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.recommendedAnswer, "recommended answer per question");
  if (/number each question/i.test(step3)) ok("pwk-brainstorming: questions numbered per round");
  else fail("pwk-brainstorming: questions must be numbered");
  for (const approval of ["approach selection", "umbrella split", "design approval", "ADR offer"]) {
    fgMark("pwk-brainstorming", step3, approval, `single-decision carve-out — ${approval}`);
  }
  for (const dimension of [
    "Goal & scope",
    "Data & state",
    "Behavior & edge cases",
    "Errors & failure",
    "Integration",
    "Non-functional",
  ]) {
    fgMark("pwk-brainstorming", step3, dimension, `checklist dimension — ${dimension}`);
  }
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.nothingToAsk, "empty dimensions printed visibly");
  const principlesLine = bs.contractContent.match(/## Principles\n\n(?:- [^\n]*\n?){1,2}/)?.[0] ?? "";
  if (principlesLine && !principlesLine.includes("One question at a time")) {
    ok("pwk-brainstorming: one-question-at-a-time principle replaced");
    if (/frontier/.test(principlesLine) && /No silent assumptions/.test(principlesLine)) {
      ok("pwk-brainstorming: replacement principles present");
    } else {
      fail("pwk-brainstorming: Principles must carry the frontier and no-silent-assumptions replacements");
    }
  } else {
    fail("pwk-brainstorming: Principles must not lead with one-question-at-a-time");
  }
}

// R7 — facts are looked up, never asked; pending lookups hold only downstream
// questions while the rest of the frontier proceeds.
if (bs) {
  const step3 = bs.contractContent.slice(
    bs.contractContent.indexOf("**Understand the idea**"),
    bs.contractContent.indexOf("**Codebase recon**"),
  );
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.factsNeverAsked, "facts never asked of the human");
  if (/only decisions are asked/i.test(step3)) ok("pwk-brainstorming: only decisions are asked");
  else fail("pwk-brainstorming: facts rule must state only decisions are asked");
  if (/downstream/.test(step3) && /asked now/.test(step3)) {
    ok("pwk-brainstorming: pending lookups hold only downstream questions");
  } else {
    fail("pwk-brainstorming: fact-finding must be non-blocking");
  }
}

// R8 — assumption gate before the design presentation: numbered confirm/strike
// items with recommendations, honest when empty, woven not new-sectioned.
if (bs) {
  const gate = bs.contractContent.slice(
    bs.contractContent.indexOf("**Present the design**"),
    bs.contractContent.indexOf("Identified a significant architectural decision"),
  );
  fgMark("pwk-brainstorming", gate, CODE_DIGEST_MARKERS.assumptionGate, "assumption gate before the summary");
  const gateChecks = [
    [/numbered question/, "assumptions re-opened as numbered questions"],
    [/recommended answer/, "each carries a recommended answer"],
    [/no unconfirmed assumptions/i, "honest empty gate"],
    [/no business behavior enters the design doc on the agent/, "hard rule stated"],
    [/woven into/, "confirmed facts woven into existing sections"],
    [/no new (template )?section/i, "no new template section"],
  ];
  for (const [re, label] of gateChecks) {
    if (re.test(gate)) ok(`pwk-brainstorming: gate — ${label}`);
    else fail(`pwk-brainstorming: gate missing — ${label}`);
  }
}

// R9 — checkable termination and the two backstops: frontier-empty stop rule,
// scenario-step forcing in step 7, and the planner bounce.
if (bs) {
  const step3 = bs.contractContent.slice(
    bs.contractContent.indexOf("**Understand the idea**"),
    bs.contractContent.indexOf("**Codebase recon**"),
  );
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.nothingSilentlyAssumed, "frontier-empty stop rule");
  const summaryLine = step3.match(/[^\n]*present a short summary[^\n]*/)?.[0] ?? "";
  if (summaryLine && !summaryLine.includes("Once you can articulate")) {
    ok("pwk-brainstorming: feel-ready stop rule replaced");
  } else {
    fail("pwk-brainstorming: stop rule must not be once-you-can-articulate");
  }
  const step7 = bs.contractContent.slice(
    bs.contractContent.indexOf("Write the design doc"),
    bs.contractContent.indexOf("Splitting large issues"),
  );
  if (/inventing behavior/.test(step7) && /back through the assumption gate/.test(step7)) {
    ok("pwk-brainstorming: unwritable scenario steps bounce to the gate");
  } else {
    fail("pwk-brainstorming: step 7 must route invented scenario behavior to the gate");
  }
}
// (pwk 2.0: the planner bounce is gone with the planner — the assumption gate in
// brainstorm catches underivable criteria in-session; no separate bounce rule remains.)

// --- Check 13: pwk-walkthrough (pwk 2.0 R5) ---
// A standalone on-demand explainer skill: five-section template, file:line anchors,
// commit-range stamp, wholesale regeneration, never disposed, unlock-list member.
console.log("walkthrough skill:");
const wtPath = join(skillsDir, "pwk-walkthrough", "SKILL.md");
if (existsSync(wtPath)) {
  ok("pwk-walkthrough: skill exists");
  const wtContent = readFileSync(wtPath, "utf8");
  const wtFm = parseFrontmatter(wtContent);
  if (wtFm?.name === "pwk-walkthrough") ok("walkthrough: frontmatter name matches");
  else fail("walkthrough: frontmatter name must be `pwk-walkthrough`");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.walkthroughTemplate, "five-section template");
  fgMark(
    "pwk-walkthrough",
    wtContent,
    DIGEST_RENDERING_MARKERS.walkthroughFlowBullet,
    "Key flows: one flow per bullet line",
  );
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.fileLineAnchors, "file:line anchors mandated");
  fgMark("pwk-walkthrough", wtContent, "follow with the files open", "detailed enough to follow along");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.shaStamp, "commit-range stamp");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.regenWholesale, "regeneration overwrites wholesale");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.neverDisposed, "never disposed");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.onDemand, "on demand only");
  fgMark("pwk-walkthrough", wtContent, SINGLE_DOC_MARKERS.walkthroughDir, "docs/walkthroughs/ output dir");
  if (/exits (any|the) gated/i.test(wtContent)) ok("walkthrough: documents it exits the gate");
  else fail("walkthrough: must state it exits the gated phase");
  if (unlockSet.has("pwk-walkthrough")) ok("guard unlock list includes pwk-walkthrough");
  else fail("guard unlock list missing pwk-walkthrough");
  if (fin && !/walkthroughs/.test(fin.contractContent)) ok("finalize never disposes walkthroughs");
  else fail("pwk-finalizing: must not touch docs/walkthroughs/");
} else {
  fail("pwk-walkthrough: skill missing");
}

// --- Check 13b: cross-skill boilerplate canonicalization (skill-slimming R5 S1) ---
// Four skills open with the same pre-flight prose: the repo-root check and the docs/plans
// discovery recipe. They were near-identical variants — the same drift shape that produced
// the doc-inventory defects (F7–F11) — so the shared sentences are pinned verbatim here.
// Each skill stays self-contained by design: this asserts wording, it does not share text.
// The suffix lists legitimately differ per skill and are deliberately not pinned.
console.log("cross-skill boilerplate:");
const BOILERPLATE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
const SHARED_SENTENCES = [
  [
    "root check",
    "run `pwd` (or your shell's equivalent) and `git rev-parse --show-toplevel`; mismatch → report both paths and stop; never `cd` (a worktree root counts).",
  ],
  ["discovery frame", "`docs/plans` recursively, excluding docs/plans/completed/, for "],
  [
    "umbrella parenthetical",
    "(topic docs live in `docs/plans/<date>-<topic>/` folders — archived work is not in flight)",
  ],
  [
    "discovery recipe tail",
    "Use whatever recurses in your harness; one example: `find docs/plans -name '<suffix>' -not -path '*/completed/*'`",
  ],
];
for (const name of BOILERPLATE_SKILLS) {
  const skill = loadSkills().find((s) => s.name === name);
  if (!skill) {
    fail(`cross-skill boilerplate: ${name} skill missing`);
    continue;
  }
  for (const [label, sentence] of SHARED_SENTENCES) {
    if (skill.contractContent.includes(sentence)) ok(`${name}: ${label} matches the canonical wording`);
    else fail(`${name}: ${label} drifted from the canonical wording — see pwk-executing-tasks`);
  }
}

// --- Check 13c: reviewer-role ↔ code-review-skill checklist alignment (R4) ---
// R4 ports the four role checklists into steps 2-5 of pwk-code-review, so the inline path
// and the delegated roles review the same things. That alignment was previously kept by
// hand with nothing watching it: edit a hazard item or a smell bullet in agents/ and the
// skill drifts silently. Three divergences are sanctioned by the design and asserted
// below as such — the tracing object phrase (the skill traces the diff it holds in
// context, the role traces the packet it was handed), the spec table's keying (the
// skill keys to the design doc's ### R<n>: headings directly, since the inline path has
// no packet; the role keys to the same headings as carried verbatim in the packet's
// `## Acceptance criteria` section), and the smell direction (the unlocked skill applies
// fixes where the read-only role flags them). Everything else must read identically in both.
console.log("reviewer-role checklist alignment:");
const CODE_REVIEW_SKILL = "skills/pwk-code-review/SKILL.md";
const codeReview = readFileSync(join(root, CODE_REVIEW_SKILL), "utf8");
// Sentences that must appear verbatim in BOTH the role contract and the skill.
const ALIGNED_WITH_ROLES = [
  [
    "pwk-tracing-reviewer",
    "agents/pwk-tracing-reviewer.md",
    "For each path, determine whether data flows correctly from entry to the asserted outcome. Note any branch the tests do not exercise, any dead branch, or any path where the trace breaks.",
  ],
  [
    "pwk-spec-reviewer",
    "agents/pwk-spec-reviewer.md",
    "A criterion with no covering code or no test is a **gap**. Code that does more than the criteria specify is **scope creep** — flag it.",
  ],
  [
    "pwk-smell-reviewer",
    "agents/pwk-smell-reviewer.md",
    "Shallow modules (interface nearly as complex as implementation)",
  ],
  ["pwk-smell-reviewer", "agents/pwk-smell-reviewer.md", "Missing seams or premature abstraction"],
  ["pwk-smell-reviewer", "agents/pwk-smell-reviewer.md", "Poor naming, magic values, dead code"],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Unbounded operations** — multi-key deletions/scans (`KEYS`, raw `SCAN` loops), full-table loads filtered in memory",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Missing indexes** — hot queries on unindexed columns (table scans under load)",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Unbounded concurrency** — unthrottled fan-out (`Promise.all` without batch limits)",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Long-running transactions** — holding DB connections/locks across slow external calls",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Query/command interpolation** — raw variables merged into SQL or shell (injection)",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Unrestricted uploads / temp flooding** — uploads to local temp without limits or `finally` cleanup",
  ],
  [
    "pwk-hazard-reviewer",
    "agents/pwk-hazard-reviewer.md",
    "**Silent swallowing loops** — background workers catching/suppressing exceptions without logging/back-off",
  ],
];
for (const [role, rolePath, sentence] of ALIGNED_WITH_ROLES) {
  // Normalize a missing trailing newline (a role file may legitimately end mid-line) so the
  // line-complete check below does not depend on file-ending hygiene.
  const norm = (text) => (text.endsWith("\n") ? text : `${text}\n`);
  const roleBody = norm(readFileSync(join(root, rolePath), "utf8"));
  const short = sentence.length > 48 ? `${sentence.slice(0, 48)}…` : sentence;
  // Line-complete match, not a bare substring: each pinned sentence is its own line in both
  // files, so appending a new clause to the role's item (the plausible drift) fails here
  // instead of sliding past a plain `includes`.
  const line = `${sentence}\n`;
  if (!roleBody.includes(line)) fail(`${role}: checklist item missing from the role contract (${short})`);
  else if (!norm(codeReview).includes(line))
    fail(`${role}: checklist item drifted out of ${CODE_REVIEW_SKILL} (${short})`);
  else ok(`${role}: checklist item aligned in ${CODE_REVIEW_SKILL}`);
}
// The three sanctioned divergences must still read as the design describes them.
const SANCTIONED_DIVERGENCES = [
  [
    "the tracing object phrase is adapted, not the banned 'integration tests'",
    /against the acceptance criteria and the feature E2E/,
  ],
  ["the spec table is keyed to the design doc's headings", /keyed by the design doc's `### R<n>:` headings/],
  ["the smell direction is inverted for the unlocked skill", /Code smells — fix these directly/],
];
for (const [label, pattern] of SANCTIONED_DIVERGENCES) {
  if (pattern.test(codeReview)) ok(`pwk-code-review: ${label}`);
  else fail(`pwk-code-review: divergence not stated — ${label}`);
}
if (/integration tests/.test(codeReview)) fail(`pwk-code-review: banned 'integration tests' phrasing returned`);
else ok("pwk-code-review: no banned 'integration tests' phrasing");
// The ban is kit-wide, not skill-local: the delegated roles review the same feature
// under the same vocabulary, so a role contract carrying the stale term would put the
// delegated and inline paths back out of alignment.
for (const rolePath of [
  "agents/pwk-recon-scout.md",
  "agents/pwk-spec-reviewer.md",
  "agents/pwk-tracing-reviewer.md",
  "agents/pwk-smell-reviewer.md",
  "agents/pwk-hazard-reviewer.md",
]) {
  const role = readFileSync(join(root, rolePath), "utf8");
  if (/integration tests/.test(role)) fail(`${rolePath}: banned 'integration tests' phrasing returned`);
  else ok(`${rolePath}: no banned 'integration tests' phrasing`);
}
// The spec role keys its coverage table to headings the packet actually carries — the
// retired `## Requirement N` shape must not reappear in the contract.
const specRole = readFileSync(join(root, "agents/pwk-spec-reviewer.md"), "utf8");
if (/## Requirement N/.test(specRole)) fail("agents/pwk-spec-reviewer.md: retired '## Requirement N' keying returned");
else ok("agents/pwk-spec-reviewer.md: coverage table keyed to the packet's ### R<n> headings");

// --- Check 13: cross-skill flow coherence (coherence-audit batch) ---
// Each assertion pins a hand-off point where two skills read the same artifact or
// state; drift on one side silently routes the human (or a count) wrong.
console.log("flow coherence:");
// R1 — the trivial fast-path compresses the design-doc write (step 7), it does not
// skip it: claiming to skip steps 3–7 contradicts the doc the same bullet mandates.
if (bs) {
  if (/Skip steps 3–6/.test(bs.contractContent) && !/3–7/.test(bs.contractContent)) {
    ok("pwk-brainstorming: trivial fast-path skips steps 3–6 (step 7 is compressed, not skipped)");
  } else {
    fail("pwk-brainstorming: trivial fast-path must skip steps 3–6 — step 7 writes the doc and cannot be skipped");
  }
  // `auto` resolves from the underlying risk content (the section + the notes), never
  // the display-only Risk column it shares a sentence with.
  if (/`auto` reads the underlying risk content/.test(bs.contractContent)) {
    ok("pwk-brainstorming: `auto` reads the underlying risk content, not the display column");
  } else {
    fail("pwk-brainstorming: `auto` resolution must read the underlying risk content, not the Risk column");
  }
}
if (et) {
  // R2 — umbrella routing: pwk-status maps a design-doc-without-progress leaf to
  // `design` → execute; the post-review suggestion must agree instead of bouncing a
  // designed leaf back to brainstorm.
  const routing = et.contractContent.slice(et.contractContent.indexOf("## After the feature review"));
  if (
    /no progress file and no `<leaf>-design\.md`/.test(routing) &&
    /`<leaf>-design\.md` but no progress file/.test(routing)
  ) {
    ok(
      "pwk-executing-tasks: umbrella routing distinguishes unstarted (brainstorm) from designed-but-unexecuted (execute)",
    );
  } else {
    fail(
      "pwk-executing-tasks: umbrella routing must key brainstorm-vs-execute on the leaf's design doc, not the progress file alone",
    );
  }
  // R3 — only the spec role owes the coverage table; a blanket "reviewer report" claim
  // contradicts the tracing/smell/hazard roles' contracts.
  if (
    /spec-reviewer report without a per-requirement coverage table/.test(et.contractContent) &&
    !/A reviewer report without a per-requirement coverage table/.test(et.contractContent)
  ) {
    ok("pwk-executing-tasks: coverage-table validity attributed to the spec-reviewer report only");
  } else {
    fail(
      "pwk-executing-tasks: the coverage-table validity rule must name the spec-reviewer report, not every reviewer",
    );
  }
  // R4 — the implement loop reads docs/lessons.md per requirement (lessons.md's own
  // header claims it is read there; the skill must actually say so).
  const loopStepAt = et.contractContent.indexOf("Mark the requirement 🔄");
  if (loopStepAt !== -1 && /lessons\.md/.test(et.contractContent.slice(loopStepAt, loopStepAt + 400))) {
    ok("pwk-executing-tasks: implement loop checks docs/lessons.md per requirement");
  } else {
    fail(
      "pwk-executing-tasks: the per-requirement step must check docs/lessons.md (lessons.md header claims it is read there)",
    );
  }
  // R5 — the inline Flow truth-check names the inline pass's own tracing findings;
  // "there is no tracing report" contradicts pwk-code-review, which traces inline.
  if (/the inline pass itself performs code tracing/.test(et.contractContent)) {
    ok("pwk-executing-tasks: inline Flow truth-check names the inline pass's tracing findings");
  } else {
    fail("pwk-executing-tasks: inline mode must acknowledge the inline pass performs code tracing");
  }
}
if (status) {
  // R6 — the N/N tally is scoped to the Requirements table: the Execution summary rows
  // share the `| <n> |` row shape, so a bare grep double-counts every requirement.
  const SCOPED_TALLY = "sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep -c '^| [0-9]'";
  if (
    /share the same `\| <n> \|` row shape/.test(status.contractContent) &&
    status.contractContent.includes(SCOPED_TALLY)
  ) {
    ok("pwk-status: Requirements-table tally is scoped past the Execution summary rows");
  } else {
    fail("pwk-status: the tally must be scoped to the Requirements table (Execution summary rows share the row shape)");
  }
}
if (fin) {
  // R7 — finalizing's verdict greps read Requirements-table rows only, matching its own
  // "verdict rows in the Requirements table" claim (prose elsewhere must not match).
  if (fin.contractContent.includes("grep '^| [0-9].*❌'") && fin.contractContent.includes("grep '^| [0-9].*⏭'")) {
    ok("pwk-finalizing: verdict greps are scoped to Requirements-table rows");
  } else {
    fail("pwk-finalizing: verdict greps must be scoped to Requirements-table rows (`grep '^| [0-9].*❌'`)");
  }
}
if (crSkill) {
  // R8 — the executing skill assembles the packet before any review (parallel or
  // inline); the inline reviewer must say it works from the packet, not re-derive scope.
  if (/work from the packet/.test(crSkill.contractContent)) {
    ok("pwk-code-review: works from an assembled review packet when provided");
  } else {
    fail("pwk-code-review: must work from the assembled review packet when the invoking skill provides one");
  }
}
// R9 (pass 2) — the doc roll-up vocabulary matches what pwk-status actually prints
// (done / in-flight / not-started), not a near-miss like "shipped".
{
  const rollup = /done \/ in-flight \/ not-started/.test(wfPhasesDoc);
  if (rollup && !/shipped \/ in-flight/.test(wfPhasesDoc)) {
    ok("workflow-phases.md: umbrella roll-up names status's real buckets (done / in-flight / not-started)");
  } else {
    fail("workflow-phases.md: roll-up must name status's buckets (done / in-flight / not-started), not 'shipped'");
  }
}
if (et) {
  // R10 (pass 2) — both `Checkpoints: full` stops precede the slice's commit; the
  // checkpoint rule forbids committing before approval, so "slice is complete" alone
  // is ambiguous about where the second stop sits.
  if (/both before its commit/.test(et.contractContent)) {
    ok("pwk-executing-tasks: `Checkpoints: full` stops are pinned before the slice's commit");
  } else {
    fail("pwk-executing-tasks: the two `full` checkpoint stops must be stated to sit before the slice's commit");
  }
}
if (fin) {
  // R11 (pass 2) — the learning sweep names its inputs, so a trivial doc (no
  // `## At a glance`, no `Approaches considered`) is an expected honest-empty, not a miss.
  if (/trivial doc has no `## At a glance`/.test(fin.contractContent)) {
    ok("pwk-finalizing: learning sweep accounts for the trivial doc's missing sections");
  } else {
    fail(
      "pwk-finalizing: the learning sweep must note the trivial doc has no `## At a glance`/`Approaches considered` to harvest",
    );
  }
}

// --- Pass-5 flow coherence (coherence sweep 5) ---
console.log("flow coherence (pass 5):");
if (status) {
  // R12 — the ❌/⏭ glyph counts run over the same scoped range as the N/N tally:
  // the Execution summary rows share the `| <n> |` row shape, so an unscoped grep
  // contradicts the skill's own "do not inflate the count" claim.
  const SCOPED_VERDICT = "sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep -c '^| [0-9].*❌'";
  if (status.contractContent.includes(SCOPED_VERDICT) && status.contractContent.includes("| grep -c '^| [0-9].*⏭'")) {
    ok("pwk-status: verdict glyph counts run over the scoped Requirements-table range");
  } else {
    fail("pwk-status: the ❌/⏭ counts must run over the same scoped range as the N/N tally");
  }
  // R13 — the awaiting-setup state is decided by the header slot alone; a design-doc
  // cross-check would contradict "neither do design docs" extraction discipline.
  if (/Setup: pending` renders the topic as \*\*`awaiting setup`\*\*/.test(status.contractContent)) {
    ok("pwk-status: awaiting setup is decided from the header slot alone");
  } else {
    fail("pwk-status: the awaiting-setup rule must key on the header slot, not a design-doc read");
  }
}
if (fin) {
  // R14 — finalizing's verdict greps are sed-scoped like status's, making the
  // "Requirements-table rows" claim true in the command, not just the prose.
  const FIN_SCOPED = "sed -n '/^## Requirements/,/^## Execution summary/p' <file> | grep '^| [0-9].*❌'";
  if (fin.contractContent.includes(FIN_SCOPED) && fin.contractContent.includes("| grep '^| [0-9].*⏭'")) {
    ok("pwk-finalizing: verdict greps are sed-scoped to the Requirements table");
  } else {
    fail("pwk-finalizing: the ❌/⏭ verdict greps must be sed-scoped to the Requirements table");
  }
}
if (et) {
  // R15 — the ship-paused resume re-presents a checkpoint that includes the code
  // digest, so the blanket "nothing the resume needs" read rule needs this carve-out.
  if (
    /ship-paused` route re-presents the ship checkpoint, so it also reads the `## Code digest`/.test(et.contractContent)
  ) {
    ok("pwk-executing-tasks: the ship-paused resume exception reads the Code digest");
  } else {
    fail("pwk-executing-tasks: the resume read rule must carve out the ship-paused route's Code digest read");
  }
  // R16 — uncommitted planning docs do not cross `git worktree add`; the hand-off
  // must say how they reach the worktree (commit on the branch, or copy + verify).
  if (/do not cross a worktree boundary/.test(et.contractContent)) {
    ok("pwk-executing-tasks: the worktree hand-off carries the uncommitted topic folder across");
  } else {
    fail("pwk-executing-tasks: the worktree hand-off must state how uncommitted planning docs cross");
  }
}
if (crSkill) {
  // R17 — the terminal-row parenthetical is scoped to the feature-level review: a
  // per-requirement review also runs in the feature-gate flow, and its row is 🔄.
  if (
    /At the feature-level review every row is already terminal/.test(crSkill.contractContent) &&
    !/In the feature-gate flow every row/.test(crSkill.contractContent)
  ) {
    ok("pwk-code-review: the terminal-row note is scoped to the feature-level review");
  } else {
    fail("pwk-code-review: the terminal-row note must name the feature-level review, not the whole flow");
  }
}
{
  // R18 — README's guard table must not grant status full access: status never exits
  // the gate, so its row says the active phase's enforcement is unchanged.
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const statusRow = readme.split("\n").find((l) => l.startsWith("| **Status**"));
  if (statusRow && /never exits the gate/.test(statusRow) && !/Full access/.test(statusRow)) {
    ok("README: the Status guard-table row keeps the gate up (no full-access claim)");
  } else {
    fail(
      `README: the Status guard-table row must not grant full access — status runs inside the gate: "${statusRow ?? "missing"}"`,
    );
  }
}

// --- Summary ---
// --- Inventory parity (workflow-consistency R7; kills doc drift in both directions) ---
// The four inventory docs must name every skill directory under skills/, the unlock-prose
// sites must list exactly the guard's UNLOCK_SKILLS, and the stated skill-count claims must
// match the counts computed from the skills/ tree (pipeline vs utility). The skills/ tree
// is the source of truth — a new skill dir without doc updates fails, and a doc claim
// disagreeing with the computed count fails with both values shown.
const INVENTORY_DOCS = [
  "README.md",
  "docs/oversight-model.md",
  "docs/developer-usage-guide.md",
  "docs/workflow-phases.md",
];
const UNLOCK_PROSE_SITES = ["README.md", "docs/oversight-model.md", "docs/developer-usage-guide.md"];
const PIPELINE_SKILLS = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-code-review", "pwk-finalizing"];
const UTILITY_SKILLS = ["pwk-status", "pwk-walkthrough"];
// The tree's complete roster — EXPECTED_SKILL_COUNT is these two lists merged; adding a
// skill dir without extending the right list fails loudly (see roster check below).
const EXPECTED_SKILL_COUNT = PIPELINE_SKILLS.length + UTILITY_SKILLS.length;
console.log("inventory parity:");
{
  const skillDirs = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
  const roster = [...PIPELINE_SKILLS, ...UTILITY_SKILLS].sort();
  const treeNames = skillDirs.filter((d) => d.startsWith("pwk-")).sort();
  if (treeNames.length !== EXPECTED_SKILL_COUNT)
    fail(
      `skills/ tree has ${treeNames.length} pwk-* dirs, EXPECTED_SKILL_COUNT is ${EXPECTED_SKILL_COUNT} (extend PIPELINE_SKILLS/UTILITY_SKILLS)`,
    );
  else if (JSON.stringify(treeNames) !== JSON.stringify(roster))
    fail(`skills/ roster drift: tree [${treeNames.join(", ")}] vs lists [${roster.join(", ")}]`);
  else ok(`skills/ roster {${roster.join(", ")}} matches EXPECTED_SKILL_COUNT (${EXPECTED_SKILL_COUNT})`);
  const invDocs = INVENTORY_DOCS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")]);
  for (const skill of roster) {
    for (const [rel, content] of invDocs) {
      if (!content.includes(skill)) fail(`inventory parity: ${rel} does not name ${skill}`);
    }
  }
  if (failures === 0) ok(`inventory parity: every skill named in all ${INVENTORY_DOCS.length} inventory docs`);
  for (const [rel, content] of UNLOCK_PROSE_SITES.map((r) => [r, readFileSync(join(root, r), "utf8")])) {
    for (const skill of unlockSet) {
      if (!content.includes(skill)) fail(`inventory parity: ${rel} unlock prose missing ${skill}`);
    }
  }
  if (failures === 0)
    ok(`inventory parity: unlock prose lists UNLOCK_SKILLS at all ${UNLOCK_PROSE_SITES.length} sites`);
  const pipelineClaims = invDocs.flatMap(([rel, content]) =>
    [...content.matchAll(/(\d+) pipeline skills?/gi)].map((m) => ({ rel, n: Number(m[1]) })),
  );
  const utilityClaims = invDocs.flatMap(([rel, content]) =>
    [...content.matchAll(/(\d+) utility skills?/gi)].map((m) => ({ rel, n: Number(m[1]) })),
  );
  for (const { rel, n } of pipelineClaims) {
    if (n !== PIPELINE_SKILLS.length)
      fail(`inventory parity: ${rel} claims ${n} pipeline skills, tree has ${PIPELINE_SKILLS.length}`);
  }
  for (const { rel, n } of utilityClaims) {
    if (n !== UTILITY_SKILLS.length)
      fail(`inventory parity: ${rel} claims ${n} utility skills, tree has ${UTILITY_SKILLS.length}`);
  }
  if (pipelineClaims.length + utilityClaims.length === 0)
    fail("inventory parity: no pipeline/utility count claims found in any inventory doc");
  else if (failures === 0)
    ok(
      `inventory parity: count claims match the tree (${PIPELINE_SKILLS.length} pipeline + ${UTILITY_SKILLS.length} utility)`,
    );
}

// --- Check 14: harness-neutral tool phrasing (tool-freedom clause, byte-identical) ---
// Every skill opens with the canonical clause right after its intro paragraph; the
// clause is one sentence pinned byte-identically in markers.mjs, so per-skill rewording
// cannot drift past the lint. The paragraph extraction additionally pins placement:
// the clause is its own paragraph, not a mid-paragraph splice.
console.log("tool freedom:");
{
  const clauses = loadSkills().map((skill) => {
    fgMark(skill.name, skill.content, TOOL_FREEDOM_MARKERS.clause, "tool-freedom clause after the intro paragraph");
    const paragraph = skill.content.split(/\n{2,}/).find((block) => block.includes(TOOL_FREEDOM_MARKERS.toolFreedom));
    if (!paragraph) {
      fail(`${skill.name}: tool-freedom clause paragraph not found`);
      return null;
    }
    return paragraph;
  });
  if (clauses.every(Boolean)) {
    if (new Set(clauses).size === 1) ok("tool-freedom clause is byte-identical across all skills");
    else fail("tool-freedom clause differs across skills — re-copy the canonical sentence from tests/markers.mjs");
  }
}

// --- Check 15: canonical executor-script sweep example (codemode preference, R3) ---
// The four sweep sites demonstrate the batched shape with one byte-pinned script, so
// the demonstrated example cannot drift per-site. The prescription sweep reads the
// fence's embedded commands like any other fenced content.
console.log("codemode sweep script:");
{
  const SWEEP_SITES = ["pwk-brainstorming", "pwk-executing-tasks", "pwk-finalizing", "pwk-status"];
  for (const name of SWEEP_SITES) {
    const skill = loadSkills().find((s) => s.name === name);
    if (!skill) {
      fail(`codemode sweep script: ${name} skill missing`);
      continue;
    }
    if (skill.content.includes(CODEMODE_SWEEP_SCRIPT)) ok(`${name}: canonical sweep script embedded`);
    else
      fail(`${name}: canonical sweep script missing or drifted — re-copy CODEMODE_SWEEP_SCRIPT from tests/markers.mjs`);
  }
}

// R2 — disposal blocks are invariant + canonical example: every fenced bash block in
// pwk-finalizing (the disposal sections hold the only fences) is immediately preceded
// by a sentence stating the outcome invariant, so an executor with a better tool can
// satisfy the disposal with any single operation that achieves it. The commands inside
// stay pinned byte-unchanged by DISPOSAL_ANCHORS above.
{
  const finSkill = loadSkills().find((s) => s.name === "pwk-finalizing");
  if (!finSkill) {
    fail("pwk-finalizing skill missing");
  } else {
    for (const match of finSkill.content.matchAll(/```bash/g)) {
      const before = finSkill.content.slice(0, match.index ?? 0);
      const lastLine = before
        .split("\n")
        .filter((line) => line.trim() !== "")
        .at(-1);
      if (lastLine?.includes(TOOL_FREEDOM_MARKERS.disposalInvariant))
        ok("pwk-finalizing: disposal fence preceded by the invariant sentence");
      else fail("pwk-finalizing: disposal fence missing the invariant sentence before the bash example");
    }
  }
}

// R3 — floor-not-prescription line in all five role contracts: the tools: frontmatter
// stays a concrete grant list (providers need concrete grants), and the conduct prose
// now says it is a floor. The four reviewers share a byte-identical conduct block, so
// the same insertion point in each keeps that identity (role-contracts.test.ts pins it).
{
  const FLOOR_ROLES = [
    "pwk-spec-reviewer",
    "pwk-tracing-reviewer",
    "pwk-smell-reviewer",
    "pwk-hazard-reviewer",
    "pwk-recon-scout",
  ];
  for (const role of FLOOR_ROLES) {
    const content = readFileSync(join(root, `agents/${role}.md`), "utf8");
    fgMark(role, content, TOOL_FREEDOM_MARKERS.floorLine, "floor-not-prescription line in the conduct block");
  }
}

// R4 — prescription sweep over every skill's contract content: each inline-code
// command and fenced bash block must be sanctioned (git/gh, kit scripts/, the test
// gates, the pinned disposal commands) or framed as one example. Stragglers the recon
// inventory missed fail loudly here; the fix is framing the site or deliberately
// sanctioning the recipe in tests/prescription-sweep.mjs — never a silent exemption.
// evidence-spine R1 — the PRD brief opens understand-the-idea: cited,
// zero-context, human-corrected before frontier rounds.
if (bs) {
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.briefRule,
    "PRD brief opens before any question",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.zeroContextRule,
    "zero-context plain-meaning-first rule",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.interpretationMark,
    "inference mark for uncited claims",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.runnableFacts,
    "runnable facts settle by bounded sketch",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.sketchClause,
    "settled-by-sketch clause in the interview rule",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.inconclusiveMark,
    "INCONCLUSIVE returns the question with context",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.probeTest,
    "probe test rejects nameless-probe criteria",
  );
  fgMark(
    "pwk-brainstorming",
    bs.contractContent,
    EVIDENCE_SPINE_MARKERS.probeKinds,
    "probe kinds: run, grep, assertion",
  );
}
if (et) {
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    EVIDENCE_SPINE_MARKERS.evidenceColumn,
    "execution summary carries the Evidence column",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    EVIDENCE_SPINE_MARKERS.evidenceFillStep,
    "done mark only with a non-empty Evidence cell",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    EVIDENCE_SPINE_MARKERS.evidencePairing,
    "evidence pairs plain words with a pointer",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    EVIDENCE_SPINE_MARKERS.singleProbe,
    "one probe test allowed, never a list",
  );
  fgMark(
    "pwk-executing-tasks",
    et.contractContent,
    EVIDENCE_SPINE_MARKERS.evidenceRefusal,
    "empty Evidence cell refuses the done mark",
  );
}
if (fin) {
  fgMark(
    "pwk-finalizing",
    fin.contractContent,
    EVIDENCE_SPINE_MARKERS.digestQuotesEvidence,
    "disposed digests keep their Evidence cells",
  );
}

// --- Check 14: skill word budgets and no restatement (skill-slimming-2 R1) ---
console.log("skill word budgets:");
{
  // One row per loadable markdown file under skills/, each at its measured count plus 10%
  // headroom (ADR 0010). A markdown file the table does not list is prose an agent would pay
  // to load, so it fails rather than slipping in unmeasured.
  const wordBudgets = new Map([
    // Measured count plus 10% headroom, rounded up (ADR 0010): the ratchet holds the
    // achieved floor, and a file that grows past it fails by name and count.
    ["pwk-brainstorming/SKILL.md", 2430],
    ["pwk-brainstorming/references/design-format.md", 1439],
    ["pwk-brainstorming/references/umbrella.md", 303],
    ["pwk-code-review/SKILL.md", 1098],
    ["pwk-executing-tasks/SKILL.md", 3173],
    ["pwk-executing-tasks/references/progress-format.md", 1107],
    ["pwk-executing-tasks/references/resume.md", 494],
    ["pwk-executing-tasks/references/review.md", 668],
    ["pwk-finalizing/SKILL.md", 1806],
    ["pwk-status/SKILL.md", 986],
    ["pwk-walkthrough/SKILL.md", 643],
  ]);

  const markdownUnder = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const child = join(dir, name);
      if (statSync(child).isDirectory()) return markdownUnder(child);
      return /\.md$/.test(name) ? [child] : [];
    });
  const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

  let overBudget = 0;
  let restated = 0;
  const files = markdownUnder(skillsDir).sort();
  for (const file of files) {
    const rel = join("skills", relative(skillsDir, file));
    const content = readFileSync(file, "utf8");
    const budget = wordBudgets.get(relative(skillsDir, file));
    if (budget === undefined) {
      fail(`word budget: ${rel}: no budget recorded — add a row to the table in tests/skill-lint.mjs`);
      overBudget++;
    } else if (wordCount(content) > budget) {
      fail(`word budget: ${rel}: ${wordCount(content)} words, over its budget of ${budget}`);
      overBudget++;
    }

    // A rule stated twice inside one file is the shape this check exists to stop: the first
    // mention is complete, later mentions are pointers, per the skill-slimming editorial rules.
    const sentences = new Map();
    for (const raw of content.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)) {
      const sentence = raw.trim();
      if (wordCount(sentence) < 12) continue;
      sentences.set(sentence, (sentences.get(sentence) ?? 0) + 1);
    }
    for (const [sentence, count] of sentences) {
      if (count < 2) continue;
      fail(`word budget: ${rel}: a rule is restated in one file — "${sentence.slice(0, 80)}…"`);
      restated++;
    }
  }
  if (overBudget === 0) ok(`word budget: all ${files.length} markdown files under skills/ are inside their budget`);
  if (restated === 0) ok("word budget: no file restates a long sentence");
}

console.log("prescription sweep:");
{
  let violations = 0;
  for (const skill of loadSkills()) {
    for (const violation of sweepSkillDir(skillsDir, skill.name)) {
      fail(
        `prescription sweep: ${violation.file}: unframed, unsanctioned command \`${violation.command}\` — frame the sentence or deliberately sanction the recipe`,
      );
      violations++;
    }
  }
  if (violations === 0) ok("prescription sweep: every command in skill content is sanctioned or framed");
}

// --- Check 16: reference pointers resolve (deterministic-steps R2) ---
console.log("reference pointers:");
{
  // A pointer that names a section is only useful if the section is there: the file must
  // exist, and an anchor must match a heading under the same slug rule the extractor uses.
  const pointerSlug = (heading) =>
    heading
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
  const headingSlugs = (text) => [...text.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)].map((match) => pointerSlug(match[2]));

  let broken = 0;
  let checked = 0;
  for (const skill of loadSkills()) {
    const dir = dirname(skill.path);
    for (const match of skill.content.matchAll(/\]\((references\/[^)#]+)\.md(?:#([^)]+))?\)/g)) {
      checked++;
      const rel = `${match[1]}.md`;
      const target = join(dir, rel);
      if (!existsSync(target)) {
        fail(`reference pointer: ${skill.name}: ${rel} does not exist`);
        broken++;
        continue;
      }
      const anchor = match[2];
      if (anchor && !headingSlugs(readFileSync(target, "utf8")).includes(anchor)) {
        fail(`reference pointer: ${skill.name}: ${rel}#${anchor} matches no heading in ${rel}`);
        broken++;
      }
    }
  }
  if (broken === 0) ok(`reference pointer: all ${checked} reference pointers resolve`);
}

// --- Check 17: the recon step enumerates before declaring a capability missing (deterministic-steps R4) ---
console.log("recon enumeration:");
{
  // A capability check that is never made is a guess: the step must say what was found
  // before it reports anything missing, in both the batch-executor and the plain form.
  const brainstorming = loadSkills().find((skill) => skill.name === "pwk-brainstorming");
  const lines = brainstorming.content.split("\n");
  const start = lines.findIndex((line) => line.includes("Codebase recon"));
  const end = start === -1 ? -1 : lines.findIndex((line, index) => index > start && /^\d+\. \*\*/.test(line));
  const block = start === -1 ? "" : lines.slice(start, end === -1 ? lines.length : end).join("\n");
  if (!block) {
    fail("recon enumeration: pwk-brainstorming has no recon step to check");
  } else {
    const problems = [];
    if (!/enumerat/i.test(block)) problems.push("no instruction to enumerate the session's capabilities");
    if (!block.includes("ALL_TOOLS")) problems.push("no batch-executor form (Array.from(ALL_TOOLS))");
    if (block.includes("Scout: unavailable") && !/enumeration result/i.test(block)) {
      problems.push("the unavailability report does not require the enumeration result");
    }
    if (problems.length) for (const problem of problems) fail(`recon enumeration: ${problem}`);
    else ok("recon enumeration: the recon step enumerates before reporting a capability missing");
  }
}

// --- Check 18: the review fallback enumerates before declaring a capability missing (deterministic-steps R4) ---
console.log("review enumeration:");
{
  // The same rule as the recon step, at the review capability: absence is a probe result, not
  // an inference from the tools the model can see, so the mechanics file names the probe and
  // the entrypoint that reaches it gates on enumeration.
  const executing = loadSkills().find((skill) => skill.name === "pwk-executing-tasks");
  const refPath = executing ? join(dirname(executing.path), "references/review.md") : "";
  const refText = executing && existsSync(refPath) ? readFileSync(refPath, "utf8") : "";
  const problems = [];
  if (!executing) problems.push("pwk-executing-tasks is not loaded");
  if (!/enumerat/i.test(refText))
    problems.push("references/review.md does not require enumeration before the inline fallback");
  if (!refText.includes("ALL_TOOLS"))
    problems.push("references/review.md names no batch-executor probe (Array.from(ALL_TOOLS))");
  if (executing && !/enumerat/i.test(executing.content)) {
    problems.push("pwk-executing-tasks/SKILL.md does not gate its fallback on enumeration");
  }
  if (problems.length) for (const problem of problems) fail(`review enumeration: ${problem}`);
  else ok("review enumeration: the review fallback enumerates before declaring a capability missing");
}

console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
