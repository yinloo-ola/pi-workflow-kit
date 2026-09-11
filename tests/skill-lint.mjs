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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODE_DIGEST_MARKERS, DIGEST_MARKERS, SINGLE_DOC_MARKERS, STATUS_STATE_MARKERS } from "./markers.mjs";

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
    // Match `|`-separated tokens, tolerating backticks, spaces, and a leading colon/paren.
    // e.g. "### Checkpoints: none | full" and "accepted values: `parallel | inline | skip`)".
    const pipeMatch = line.match(/[`:]\s*`?([a-z]+(?:\s*\|\s*`?[a-z]+)+)`?/);
    if (pipeMatch) {
      for (const t of pipeMatch[1].split("|")) hits.add(t.replace(/`/g, "").trim());
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
    const bsV = vocabOf(bs.content, label, exclude);
    const etV = vocabOf(et.content, label, exclude);
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
      if (/production-risk content/i.test(bs.content) && /production-risk content/i.test(et.content)) {
        ok("feature review: `auto` is keyed on the design's production-risk content (both skills)");
      } else {
        fail("feature review: both skills must state what `auto` keys on (production-risk content)");
      }
      if (/explicit tag wins/i.test(et.content)) {
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
    const inTemplate = bs.content.includes(tok);
    if (!inTemplate) fail(`pwk-brainstorming template missing "${tok}"`);
    if (!et.content.includes(tok)) fail(`pwk-executing-tasks doesn't reference "${tok}"`);
    if (inTemplate && et.content.includes(tok)) ok(`"${tok}" emitted by brainstorming, parsed by executing-tasks`);
  }
}

// --- Check 4: the `spec` checkpoint value is gone (leaner-execution-gates R4) ---
// It was a stop on acceptance criteria the human already approved during brainstorm, so
// the enum is `none | full` and the paired "spec requires inline review" rule went with it.
// A legacy in-flight `spec` resolves to `none` rather than erroring.
console.log("spec checkpoint removed:");
const specSites = [
  ["docs/workflow-phases.md", readFileSync(join(root, "docs/workflow-phases.md"), "utf8")],
  ["docs/developer-usage-guide.md", readFileSync(join(root, "docs/developer-usage-guide.md"), "utf8")],
  ["pwk-brainstorming", bs?.content ?? ""],
  ["pwk-executing-tasks", et?.content ?? ""],
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
// The legacy value migrates instead of erroring.
const legacySpecLine = (et?.content ?? "").split("\n").find((l) => /legacy/i.test(l) && /`spec`/.test(l)) ?? "";
if (legacySpecLine && /`none`/.test(legacySpecLine)) {
  ok("pwk-executing-tasks: legacy `spec` resolves to `none` (migration documented)");
} else {
  fail("pwk-executing-tasks: must document the legacy `spec` → `none` migration on one line");
}

// F6 (workflow-consistency R5): the brainstorming template's fenced design block
// must itself contain the `### Feature review` tag line — the packet FA_CMD sed
// terminates on it, so a template-conformant doc with a tagless FA section silently
// widened the FA span to EOF. Asserts the fence, not prose mentions.
const FA_TEMPLATE_TAG = "### Feature review";
console.log("feature-acceptance template tag (F6):");
if (!bs) fail("pwk-brainstorming skill missing");
else {
  const mdFences = [...bs.content.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
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
else if (faHeader.test(bs.content)) ok("pwk-brainstorming: emits `## Feature acceptance` in the design doc");
else fail("pwk-brainstorming: missing `## Feature acceptance` section header");
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
const EXPECTED_UNLOCK = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-diagnose", "pwk-walkthrough"];
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
if (et && /reuse/i.test(et.content) && /umbrella/i.test(et.content))
  ok("pwk-executing-tasks: documents branch reuse for umbrella later parts");
else fail("pwk-executing-tasks: missing umbrella branch-reuse note");
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
  fgMark("pwk-brainstorming", bs.content, "### Feature review", "feature-level review tag");
  fgMark("pwk-brainstorming", bs.content, "default to `none` / `skip`", "per-requirement defaults");
  fgMark("pwk-brainstorming", bs.content, "primary enforced spec", "Feature acceptance as primary spec");
}
// Requirement 2 — pwk-executing-tasks feature-gate flow
if (et) {
  // leaner-execution-gates R3: the feature-spec checkpoint became a notice — the E2E is still
  // written first and still gates, it just no longer pauses execution.
  fgMark("pwk-executing-tasks", et.content, "without waiting for approval", "feature-spec notice (no stop)");
  if (!/CHECKPOINT: feature-spec/.test(et.content)) {
    ok("pwk-executing-tasks: the retired feature-spec checkpoint is gone");
  } else {
    fail("pwk-executing-tasks: the feature-spec checkpoint must be a notice, not a stop");
  }
  fgMark("pwk-executing-tasks", et.content, "ship checkpoint", "ship checkpoint (review before final approval)");
  fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
  fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
}
// Requirement 3 — meaningful-test rules mirrored across brainstorming, executing-tasks, lessons
fgMark("pwk-brainstorming", bs?.content, "Test observable behavior", "meaningful-test rule (brainstorming)");
fgMark("pwk-executing-tasks", et.content, "Test observable behavior", "meaningful-test rule (executing-tasks)");
const lessonsMd = readFileSync(join(root, "docs/lessons.md"), "utf8");
fgMark("docs/lessons.md", lessonsMd, "Test observable behavior", "meaningful-test rule (lessons)");
// Requirement 4 — code-review + brainstorming wording
fgMark("pwk-code-review", crSkill?.content, "whole feature diff", "whole-feature-diff scope");
fgMark("pwk-brainstorming", bs?.content, "primary enforced spec", "Feature acceptance as primary spec");

// leaner-execution-gates R5/R6 — the digest's `### Flow` is a navigable map, and it is
// written from reviewed reality: it must agree with the tracing report (or, in `inline`
// mode, the spec-coverage pass), with unresolved disagreements surfaced, not smoothed over.
console.log("flow truth:");
if (et) {
  fgMark("pwk-executing-tasks", et.content, "**Flow shape**", "enriched Flow shape block");
  fgMark("pwk-executing-tasks", et.content, "tracing report", "Flow truth-checked against the tracing report");
  if (/inline[\s\S]{0,260}spec-coverage|spec-coverage[\s\S]{0,260}inline/i.test(et.content)) {
    ok("pwk-executing-tasks: inline mode falls back to the spec-coverage pass");
  } else {
    fail("pwk-executing-tasks: must check the Flow against the spec-coverage pass in inline mode");
  }
  if (/surfaced/i.test(et.content)) ok("pwk-executing-tasks: unresolved Flow disagreement is surfaced");
  else fail("pwk-executing-tasks: unresolved Flow disagreement must be surfaced to the human");
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
  if (bs.content.includes("pwk-recon-scout")) {
    ok("pwk-brainstorming: dispatches pwk-recon-scout by name");
  } else {
    fail("pwk-brainstorming: must dispatch pwk-recon-scout (mention by name)");
  }
  if (/Scout:\s*unavailable/i.test(bs.content)) {
    ok("pwk-brainstorming: documents the `Scout: unavailable` fallback when pi-subagents is absent");
  } else {
    fail("pwk-brainstorming: must document `Scout: unavailable` fallback (graceful degradation)");
  }
  if (/trivial/i.test(bs.content) && /skip/i.test(bs.content) && /scout|recon/i.test(bs.content)) {
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
  if (/only the human tags/i.test(bs.content)) {
    ok("pwk-brainstorming: only the human tags a slice for review");
  } else {
    fail("pwk-brainstorming: must state that only the human tags a slice");
  }
  if (/Production-risk notes/.test(bs.content) && !/Review:\s*parallel/.test(bs.content)) {
    ok("pwk-brainstorming: risk notes no longer imply `Review: parallel` (auto-tag removed)");
  } else {
    fail("pwk-brainstorming: must not map Production-risk notes to `Review: parallel`");
  }
  // The default must still be `skip` for requirements the human does not tag.
  if (/### Review: skip \| parallel \| inline/.test(bs.content)) {
    ok("pwk-brainstorming: still documents `### Review: skip | parallel | inline`");
  } else {
    fail("pwk-brainstorming: must keep the Review tag vocabulary with `skip`");
  }
}
// No skill may re-introduce silent tagging: the concept must be absent repo-wide.
let autoTagSurvivors = 0;
for (const s of loadSkills()) {
  for (const line of s.content.split("\n")) {
    if (/auto-tag/i.test(line)) {
      autoTagSurvivors++;
      fail(`${s.name}: still mentions auto-tagging: "${line.trim()}"`);
    }
  }
}
if (autoTagSurvivors === 0) ok("no skill auto-tags requirements (silent tagging removed)");
// The cross-skill link survives independently of the removed rule.
if (et) {
  if (/pwk-brainstorming/.test(et.content)) {
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
  fgMark("pwk-brainstorming", bs.content, DIGEST_MARKERS.atAGlance, "at-a-glance digest mandated");
  fgMark(
    "pwk-brainstorming",
    bs.content,
    "immediately before `## Requirements`",
    "at-a-glance sits before Requirements",
  );
  fgMark("pwk-brainstorming", bs.content, DIGEST_MARKERS.atAGlanceTable, "R# one-line table");
  fgMark("pwk-brainstorming", bs.content, "R# = the requirement", "R# numbering linkage");
  fgMark("pwk-brainstorming", bs.content, "In short:", "trivial fast-path In-short line");
  if (/plain language/i.test(bs.content)) ok("pwk-brainstorming: at-a-glance plain-language rule");
  else fail("pwk-brainstorming: at-a-glance must mandate plain language");
  // pwk 2.0 R1 — the design doc is the single buildable artifact: one block per
  // requirement carrying criteria + tags; the plan phase's re-derivations are gone.
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.rBlock, "R<n> requirement blocks");
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.criteriaInBlock, "criteria inside the block");
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.noTestNameLists, "no test-name lists");
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.auditExactlyOnce, "audit: criteria + tags exactly once");
  // leaner-execution-gates R1 — the auto-tag rule and its single-source claim are gone.
  if (!bs.content.includes(SINGLE_DOC_MARKERS.autoTagTruth)) {
    ok("pwk-brainstorming: removed auto-tag rule leaves no single-source claim");
  } else {
    fail("pwk-brainstorming: the removed auto-tag rule must not leave its single-source claim behind");
  }
  if (!/crosswalk/i.test(bs.content)) ok("pwk-brainstorming: no mapping-table instruction");
  else fail("pwk-brainstorming: must not instruct a crosswalk mapping table");
  if (!/pwk-writing-plans/.test(bs.content)) ok("pwk-brainstorming: no plan-phase hand-off");
  else fail("pwk-brainstorming: must hand off to pwk-executing-tasks, not a plan phase");
  // pwk 2.0 R2 — decisions-first At a glance: summary, then Key decisions (honest-empty
  // rejected-alternative clauses — never manufactured), then the R#/risk table.
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.keyDecisions, "decisions-first at-a-glance");
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.neverManufactured, "honest-empty rejected alternatives");
  const glanceDecisionsIdx = bs.content.indexOf(SINGLE_DOC_MARKERS.keyDecisions);
  const glanceTableIdx = bs.content.indexOf(DIGEST_MARKERS.atAGlanceTable);
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
  if (/crosswalk/i.test(s.content)) {
    fail(`${s.name}: still mentions a crosswalk — the plan-phase artifact is gone`);
    crosswalkFree = false;
  }
}
if (crosswalkFree) ok("no skill mentions a crosswalk (plan-phase artifact gone)");
// R3 — the progress file carries an execution summary filled as requirements land; the
// ship checkpoint merges feature-complete + review: review runs before the one final
// approval, presenting digest + coverage table, diff on request.
if (et) {
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.execSummary, "execution summary section");
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.execSummaryTable, "execution summary table shape");
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.fillAsYouLand, "fill-as-you-land rule");
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.deviationAtDeviation, "deviation logged at deviation time");
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.shipPaused, "ship-paused phase");
  fgMark("pwk-executing-tasks", et.content, DIGEST_MARKERS.diffOnRequest, "ship presentation: diff on request");
  const enumLine = et.content.match(/`Feature phase` is one of:[^\n]*/)?.[0] ?? "";
  if (enumLine.includes(DIGEST_MARKERS.shipPaused) && !enumLine.includes("feature-complete-paused")) {
    ok("pwk-executing-tasks: phase enum uses ship-paused (legacy feature-complete-paused gone)");
  } else {
    fail("pwk-executing-tasks: phase enum must use ship-paused, not feature-complete-paused");
  }
}
// R5 — umbrella docs live in their own docs/plans/<date>-<umbrella>/ folder; every
// discovery site pins the find recipe (recursive by construction); finalize disposes
// the folder as one unit.
const GLOB_SITES = [bs, et, status, fin].filter(Boolean);
for (const s of GLOB_SITES) {
  fgMark(s.name, s.content, STATUS_STATE_MARKERS.findRecipe, "pinned find discovery recipe");
}
if (et) {
  fgMark(
    "pwk-executing-tasks",
    et.content,
    "docs/plans/**/overview.md",
    "post-review umbrella routing uses the recursive overview glob",
  );
  fgMark(
    "pwk-executing-tasks",
    et.content,
    "set `Feature phase: reviewing` first",
    "review phase is set before the review runs (mid-review resume routes in)",
  );
}
if (fin) {
  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.umbrellaFolder, "umbrella folder disposal as one unit");
}
// R6 — finalizing ships only Feature phase `done`; every other state (including the
// legacy feature-complete-paused) bounces back to executing-tasks.
if (fin) {
  fgMark("pwk-finalizing", fin.content, "Feature phase", "finalizing reads Feature phase");
  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.mustBeDone, "done is the only shippable phase");
  fgMark("pwk-finalizing", fin.content, DIGEST_MARKERS.legacyPaused, "legacy in-flight state named and gated");
}
// Post-review hazard fixes — the umbrella rm -rf path is anchored to the discovery
// glob (never agent-typed) and the folder archive is verified before committing.
if (fin) {
  fgMark("pwk-finalizing", fin.content, "verbatim from the discovered", "folder delete path anchored to discovery");
  fgMark("pwk-finalizing", fin.content, "ls docs/plans/completed/<date>-<umbrella>/", "archive verified before commit");
}

// --- Check 12: code-digest feature (grown per-requirement) ---
// R1 — the progress-file template carries a code-digest section below the
// execution summary: four subsections, filled once after the review passes.
console.log("code-digest:");
if (et) {
  fgMark("pwk-executing-tasks", et.content, CODE_DIGEST_MARKERS.codeDigest, "code-digest section in template");
  fgMark(
    "pwk-executing-tasks",
    et.content,
    CODE_DIGEST_MARKERS.digestOnceOnly,
    "digest written once, post-review, never back-filled",
  );
  const tStart = et.content.indexOf("# Progress:");
  const tEnd = tStart === -1 ? -1 : et.content.indexOf("```", tStart);
  if (tStart !== -1 && tEnd !== -1) {
    const template = et.content.slice(tStart, tEnd);
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
  const stepAt = et.content.indexOf("**Write the code digest**");
  const reviewAt = et.content.indexOf("**Run the feature review**");
  const pauseAt = et.content.indexOf("**⏸ CHECKPOINT: ship**");
  if (stepAt === -1 || reviewAt === -1 || pauseAt === -1) {
    fail("pwk-executing-tasks: digest write step / review step / ship pause not found");
  } else if (stepAt > reviewAt && stepAt < pauseAt) {
    ok("pwk-executing-tasks: digest written between review success and the pause");
    const stepLine = et.content.slice(stepAt, et.content.indexOf("\n", stepAt));
    for (const section of ["`## Commits`", "`## Changed files`", "`## Diff`"]) {
      fgMark("pwk-executing-tasks", stepLine, section, `digest derives from the packet ${section}`);
    }
    const stepBlock = et.content.slice(stepAt, stepAt + 900);
    if (/re-run the recipe/.test(stepBlock)) ok("pwk-executing-tasks: stale packet re-runs the recipe");
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
  const listAt = et.content.indexOf("present, in this order:");
  if (listAt === -1) {
    fail("pwk-executing-tasks: ship presentation list not found");
  } else {
    const list = et.content.slice(listAt, listAt + 800);
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
  const rulesAt = et.content.indexOf("## Code digest` is filled once");
  if (rulesAt === -1) {
    fail("pwk-executing-tasks: digest fill-rules paragraph not found");
  } else {
    const rules = et.content.slice(rulesAt, rulesAt + 700);
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
  [fin, "**Umbrella** (a `docs/plans/**/overview.md` exists"],
];
for (const pair of EXCLUSION_SITES) {
  const s = pair[0];
  if (!s) {
    fail(`skill file missing from load: ${pair[1]}`);
    continue;
  }
  const at = s.content.indexOf(pair[1]);
  if (at === -1) {
    fail(`${s.name}: discovery anchor not found for the completed/ exclusion`);
    continue;
  }
  fgMark(
    s.name,
    s.content.slice(at, at + 400),
    CODE_DIGEST_MARKERS.completedExclusion,
    "discovery excludes completed/",
  );
}
if (et) {
  const routingAt = et.content.indexOf("## After the feature review");
  const presentAt = et.content.indexOf("Present:", routingAt);
  if (routingAt !== -1 && presentAt !== -1) {
    const routing = et.content.slice(routingAt, presentAt);
    fgMark("pwk-executing-tasks", routing, CODE_DIGEST_MARKERS.completedExclusion, "routing excludes completed/");
  } else {
    fail("pwk-executing-tasks: routing block anchors not found");
  }
}
if (fin) {
  const DISPOSAL_ANCHORS = [
    "rm -f docs/plans/????-??-??-<topic>-design.md docs/plans/????-??-??-<topic>-implementation.md docs/plans/????-??-??-<topic>-progress.md docs/plans/????-??-??-<topic>-review-packet*.md",
    "rm -rf docs/plans/<date>-<umbrella>/",
    "mv docs/plans/????-??-??-<topic>-design.md          docs/plans/completed/ 2>/dev/null || true",
    "mv docs/plans/????-??-??-<topic>-implementation.md  docs/plans/completed/ 2>/dev/null || true",
    "mv docs/plans/????-??-??-<topic>-progress.md        docs/plans/completed/ 2>/dev/null || true",
    "mv docs/plans/????-??-??-<topic>-review-packet*.md   docs/plans/completed/ 2>/dev/null || true",
    "mv docs/plans/<date>-<umbrella>/ docs/plans/completed/",
    "ls docs/plans/completed/<date>-<umbrella>/ >/dev/null",
    "verbatim from the discovered",
  ];
  for (const anchor of DISPOSAL_ANCHORS) {
    fgMark("pwk-finalizing", fin.content, anchor, "disposal command unchanged");
  }
}

// R6 — brainstorming interviews in frontier rounds: numbered questions with
// recommended answers, dimension checklist walked visibly, approvals single-decision,
// and the old one-question-at-a-time principle gone from its defining line.
if (bs) {
  const step3 = bs.content.slice(
    bs.content.indexOf("**Understand the idea**"),
    bs.content.indexOf("**Codebase recon**"),
  );
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.frontier, "frontier-round protocol");
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.recommendedAnswer, "recommended answer per question");
  if (/number each question/i.test(step3)) ok("pwk-brainstorming: questions numbered per round");
  else fail("pwk-brainstorming: questions must be numbered");
  for (const approval of ["approach selection", "umbrella split", "design approval", "ADR unlock"]) {
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
  const principlesLine = bs.content.match(/## Principles\n\n(?:- [^\n]*\n?){1,2}/)?.[0] ?? "";
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
  const step3 = bs.content.slice(
    bs.content.indexOf("**Understand the idea**"),
    bs.content.indexOf("**Codebase recon**"),
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
  const gate = bs.content.slice(
    bs.content.indexOf("**Present the design**"),
    bs.content.indexOf("Identified a significant architectural decision"),
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
  const step3 = bs.content.slice(
    bs.content.indexOf("**Understand the idea**"),
    bs.content.indexOf("**Codebase recon**"),
  );
  fgMark("pwk-brainstorming", step3, CODE_DIGEST_MARKERS.nothingSilentlyAssumed, "frontier-empty stop rule");
  const summaryLine = step3.match(/[^\n]*present a short summary[^\n]*/)?.[0] ?? "";
  if (summaryLine && !summaryLine.includes("Once you can articulate")) {
    ok("pwk-brainstorming: feel-ready stop rule replaced");
  } else {
    fail("pwk-brainstorming: stop rule must not be once-you-can-articulate");
  }
  const step7 = bs.content.slice(
    bs.content.indexOf("Write the design doc"),
    bs.content.indexOf("Splitting large issues"),
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
  if (fin && !/walkthroughs/.test(fin.content)) ok("finalize never disposes walkthroughs");
  else fail("pwk-finalizing: must not touch docs/walkthroughs/");
} else {
  fail("pwk-walkthrough: skill missing");
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
const UTILITY_SKILLS = ["pwk-status", "pwk-diagnose", "pwk-walkthrough"];
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

console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
