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
import { DIGEST_MARKERS } from "./markers.mjs";

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

// --- Check 9: feature-gate execution model (grown per-requirement) ---
// Feature-acceptance E2E is the primary gate; per-requirement checkpoints/reviews are opt-in
// (default off); two always-on feature checkpoints + one feature-level review; meaningful-test
// rules. Each marker is a string only the new model has, so a stale skill fails (no false green).
console.log("feature-gate model:");
const fgMark = (file, content, marker, label) => {
  if (content?.includes(marker)) ok(`${file}: ${label}`);
  else fail(`${file}: missing ${label} — marker "${marker}"`);
};
// Requirement 1 — pwk-writing-plans tag defaults + feature-level review
if (wp) {
  fgMark("pwk-writing-plans", wp.content, "### Feature review", "feature-level review tag");
  fgMark("pwk-writing-plans", wp.content, "default to `none` / `skip`", "flipped per-requirement defaults");
  fgMark("pwk-writing-plans", wp.content, "primary enforced spec", "Feature acceptance as primary spec");
}
// Requirement 2 — pwk-executing-tasks feature-gate flow
if (et) {
  fgMark("pwk-executing-tasks", et.content, "feature-spec", "feature-spec checkpoint");
  fgMark("pwk-executing-tasks", et.content, "ship checkpoint", "ship checkpoint (review before final approval)");
  fgMark("pwk-executing-tasks", et.content, "ship-paused", "ship-paused phase");
  fgMark("pwk-executing-tasks", et.content, "opt-in", "per-requirement ceremony is opt-in");
}
// Requirement 3 — meaningful-test rules mirrored across writing-plans, executing-tasks, lessons
fgMark("pwk-writing-plans", wp.content, "Test observable behavior", "meaningful-test rule (writing-plans)");
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
// R2: pwk-writing-plans auto-tag rule. The marker must be unique to this rule.
if (wp) {
  if (/Production-risk notes/.test(wp.content) && /Review:\s*parallel/.test(wp.content)) {
    ok("pwk-writing-plans: documents Production-risk notes → Review: parallel auto-tag");
  } else {
    fail("pwk-writing-plans: must document the auto-tag rule (Production-risk notes ⇒ Review: parallel)");
  }
  // The default must still be `skip` for requirements WITHOUT risk notes (no over-broaden).
  if (/Review:\s*skip/.test(wp.content)) {
    ok("pwk-writing-plans: still documents `Review: skip` as the default (no over-broaden)");
  } else {
    fail("pwk-writing-plans: must keep `Review: skip` as the default for non-risky requirements");
  }
  // The auto-tag must be presented as editable (the human can downgrade it).
  if (/edit/i.test(wp.content) && /downgrade|change|override/i.test(wp.content)) {
    ok("pwk-writing-plans: auto-tag is editable (human can downgrade before approval)");
  } else {
    fail("pwk-writing-plans: must document that the auto-tag is editable");
  }
  // Negative case: the auto-tag must require a NON-EMPTY Production-risk notes section, so an
  // empty notes section does not trigger it. Assert the `non-empty` qualifier sits adjacent to
  // the rule phrase (within one line) so a future edit that drops the qualifier fails loudly.
  if (/non-empty[^\n]*Production-risk notes|Production-risk notes[^\n]*non-empty/i.test(wp.content)) {
    ok("pwk-writing-plans: auto-tag requires non-empty Production-risk notes (negative case)");
  } else {
    fail("pwk-writing-plans: must qualify the auto-tag with `non-empty` (empty notes must not trigger)");
  }
  // The rule must be single-sourced: pwk-writing-plans owns the auto-tag concept pair
  // (`auto-tag` + `Production-risk notes`). Any other skill that mentions both must do so in
  // a line that also names `pwk-writing-plans` (link by name, do not restate). A bare
  // restatement without a link in the same line is a regression against R3.
  const restated = loadSkills().filter((s) => s.name !== "pwk-writing-plans");
  let restateViolations = 0;
  for (const s of restated) {
    const lines = s.content.split("\n");
    for (const line of lines) {
      const hasConcept = /auto-tag/i.test(line) && /Production-risk notes/.test(line);
      if (!hasConcept) continue;
      if (!/pwk-writing-plans/.test(line)) {
        restateViolations++;
        fail(`${s.name}: restates the auto-tag rule without linking to pwk-writing-plans: "${line.trim()}"`);
      }
    }
  }
  if (restateViolations === 0) {
    ok("pwk-writing-plans: auto-tag rule is single-source (other skills do not restate it)");
  }
}
// R3: pwk-executing-tasks must reference pwk-writing-plans for the auto-tag rule (not restate).
if (et) {
  if (/pwk-writing-plans/.test(et.content)) {
    ok("pwk-executing-tasks: references pwk-writing-plans (single source of truth)");
  } else {
    fail("pwk-executing-tasks: must reference pwk-writing-plans (do not restate the auto-tag rule)");
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
}
// R2 — plans carry a crosswalk (one row per design R#) placed strictly before
// `## Requirement 1` so the packet sed spans stay intact; the human confirms in one line.
if (wp) {
  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalk, "crosswalk section mandated");
  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkTable, "crosswalk table shape");
  fgMark("pwk-writing-plans", wp.content, DIGEST_MARKERS.crosswalkPlacement, "crosswalk placement outside sed spans");
  fgMark("pwk-writing-plans", wp.content, "exactly once", "crosswalk audit: every R# exactly once");
  fgMark(
    "pwk-writing-plans",
    wp.content,
    DIGEST_MARKERS.oneLineConfirmation,
    "plan presented as one-line confirmation",
  );
}
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
const GLOB_SITES = [bs, wp, et, status, fin].filter(Boolean);
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
if (wp) {
  fgMark(
    "pwk-writing-plans",
    wp.content,
    "docs/plans/<date>-<umbrella>/overview.md",
    "plan template umbrella path is folder-based",
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

// --- Summary ---
console.log("");
if (failures === 0) {
  console.log("skill-lint: all checks passed");
  process.exit(0);
}
console.error(`skill-lint: ${failures} failure(s)`);
process.exit(1);
