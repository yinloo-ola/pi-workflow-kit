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
import { CODE_DIGEST_MARKERS, DIGEST_MARKERS, SINGLE_DOC_MARKERS } from "./markers.mjs";

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
const bs = loadSkills().find((s) => s.name === "pwk-brainstorming");
const et = loadSkills().find((s) => s.name === "pwk-executing-tasks");
if (!bs) fail("pwk-brainstorming skill missing");
if (!et) fail("pwk-executing-tasks skill missing");
if (bs && et) {
  for (const [kind, vocab] of [
    ["checkpoint", CHECKPOINT_VOCAB],
    ["review", REVIEW_VOCAB],
  ]) {
    const bsV = vocabOf(bs.content, kind);
    const etV = vocabOf(et.content, kind);
    const label = kind === "checkpoint" ? "checkpoint" : "review";
    for (const v of vocab) {
      if (!bsV.has(v)) fail(`pwk-brainstorming: ${label} vocab missing "${v}"`);
      if (!etV.has(v)) fail(`pwk-executing-tasks: ${label} vocab missing "${v}"`);
    }
    // No stray tokens
    for (const t of bsV) if (!vocab.includes(t)) fail(`pwk-brainstorming: unknown ${label} token "${t}"`);
    for (const t of etV) if (!vocab.includes(t)) fail(`pwk-executing-tasks: unknown ${label} token "${t}"`);
    if (failures === 0) ok(`${label} vocab {${vocab.join(", ")}} consistent across brainstorming + executing-tasks`);
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
if (bs && /\bspec\b/.test(bs.content) && /requires at least `inline`/.test(bs.content)) {
  ok("pwk-brainstorming: documents spec requires inline review");
} else if (bs) {
  fail("pwk-brainstorming: missing spec+inline guard note");
}
if (et && /\bspec\b/.test(et.content) && /at least `inline`/.test(et.content)) {
  ok("pwk-executing-tasks: documents spec requires inline review");
} else if (et) {
  fail("pwk-executing-tasks: missing spec+inline guard note");
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
  fgMark("pwk-executing-tasks", et.content, "feature-spec", "feature-spec checkpoint");
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

// --- Check 10: parallelize-workflow (R1 scout + R2 auto-tag + R3 cross-skill) ---
// pwk-recon-scout is a new read-only package agent dispatched from pwk-brainstorming before
// design; pwk-writing-plans auto-tags `### Review: parallel` for requirements with a
// non-empty `### Production-risk notes` section; the other skills + docs reference (not
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
// R2: auto-tag rule — since pwk 2.0 the tags live in the design doc's requirement
// blocks, so pwk-brainstorming owns the rule (non-empty Production-risk notes ⇒
// Review: parallel). The marker must be unique to this rule.
if (bs) {
  if (/Production-risk notes/.test(bs.content) && /Review:\s*parallel/.test(bs.content)) {
    ok("pwk-brainstorming: documents Production-risk notes → Review: parallel auto-tag");
  } else {
    fail("pwk-brainstorming: must document the auto-tag rule (Production-risk notes ⇒ Review: parallel)");
  }
  // The default must still be `skip` for requirements WITHOUT risk notes (no over-broaden).
  if (/Review:\s*skip/.test(bs.content)) {
    ok("pwk-brainstorming: still documents `Review: skip` as the default (no over-broaden)");
  } else {
    fail("pwk-brainstorming: must keep `Review: skip` as the default for non-risky requirements");
  }
  // The auto-tag must be presented as editable (the human can downgrade it).
  if (/edit/i.test(bs.content) && /downgrade|change|override/i.test(bs.content)) {
    ok("pwk-brainstorming: auto-tag is editable (human can downgrade before approval)");
  } else {
    fail("pwk-brainstorming: must document that the auto-tag is editable");
  }
  // Negative case: the auto-tag must require a NON-EMPTY Production-risk notes section.
  if (/non-empty[^\n]*Production-risk notes|Production-risk notes[^\n]*non-empty/i.test(bs.content)) {
    ok("pwk-brainstorming: auto-tag requires non-empty Production-risk notes (negative case)");
  } else {
    fail("pwk-brainstorming: must qualify the auto-tag with `non-empty` (empty notes must not trigger)");
  }
  // The rule must be single-sourced: pwk-brainstorming owns the auto-tag concept pair
  // (`auto-tag` + `Production-risk notes`). Any other skill that mentions both must do so
  // in a line that also names `pwk-brainstorming` (link by name, do not restate).
  const restated = loadSkills().filter((s) => s.name !== "pwk-brainstorming");
  let restateViolations = 0;
  for (const s of restated) {
    const lines = s.content.split("\n");
    for (const line of lines) {
      const hasConcept = /auto-tag/i.test(line) && /Production-risk notes/.test(line);
      if (!hasConcept) continue;
      if (!/pwk-brainstorming/.test(line)) {
        restateViolations++;
        fail(`${s.name}: restates the auto-tag rule without linking to pwk-brainstorming: "${line.trim()}"`);
      }
    }
  }
  if (restateViolations === 0) {
    ok("pwk-brainstorming: auto-tag rule is single-source (other skills do not restate it)");
  }
}
// R3: pwk-executing-tasks must reference pwk-brainstorming for the auto-tag rule (not restate).
if (et) {
  if (/pwk-brainstorming/.test(et.content)) {
    ok("pwk-executing-tasks: references pwk-brainstorming (single source of truth)");
  } else {
    fail("pwk-executing-tasks: must reference pwk-brainstorming (do not restate the auto-tag rule)");
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
  fgMark("pwk-brainstorming", bs.content, SINGLE_DOC_MARKERS.autoTagTruth, "auto-tag rule single source of truth");
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
// discovery site globs recursively; finalize disposes the folder as one unit.
const GLOB_SITES = [bs, et, status, fin].filter(Boolean);
for (const s of GLOB_SITES) {
  fgMark(s.name, s.content, DIGEST_MARKERS.recursiveGlob, "recursive discovery globs");
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

// R5 — every recursive discovery glob excludes completed/ (archived work is not
// in flight), while the finalize disposal commands stay byte-identical.
const EXCLUSION_SITES = [
  [status, "1. Glob `docs/plans/**/*-design.md`"],
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

// --- Summary ---
console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
