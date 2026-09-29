/**
 * Prescription sweep for pi-workflow-kit skill content (harness-neutral tool phrasing, R4).
 *
 * Every inline-code command and fenced bash block in a skill's contract content
 * (SKILL.md + references/*.md|py + scripts/*.md|py — the same file set skill-lint
 * concatenates into contractContent) must either match the sanctioned allowlist
 * or sit in a sentence carrying a framing marker. A violation names the file and
 * the command; the fix at a straggler site is framing the sentence or deliberately
 * adding the recipe to the sanctioned list — never a silent exemption.
 *
 * Pure content checks, no runtime: imported by tests/skill-lint.mjs (the sweep pass)
 * and by the vitest suites (unit + feature E2E).
 *
 * Known limitations (deliberate, kept proportional): a command is detected by its
 * first token appearing in COMMAND_WORDS — an unlisted tool head (e.g. a brand-new
 * CLI) is not flagged until the word is added; and fence ranges assume no nested
 * fences (an outer fenced block containing another fence line mis-spans — the
 * shipped corpus has none; the parity scan in the feature review verified it).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Command heads that may appear unframed: git has no alternative tool to invite,
 *  gh is the same, and the kit's own scripts/ helpers are the exact determinism exception. */
export const SANCTIONED_PREFIXES = ["git", "gh", "scripts/"];

/** Sanctioned recipes, matched by prefix: the test gates, the pinned disposal
 *  commands, and the deliberate pins reconciled when the sweep first ran — the
 *  python3 interpreter probes (the scripts/ exception has to check its own runtime),
 *  the canonical header-extraction recipe, and the disposal-destination checks.
 *  Adding an entry is a deliberate, reviewed decision — never a silent exemption. */
export const SANCTIONED_COMMANDS = [
  "npm run check",
  "npm run test",
  // disposal anchors (byte-pinned as DISPOSAL_ANCHORS in tests/skill-lint.mjs)
  "rm -rf docs/plans/<date>-<topic>/",
  "mv docs/plans/<date>-<topic>/ docs/plans/completed/",
  "ls docs/plans/completed/<date>-<topic>/ >/dev/null",
  "mkdir -p docs/plans/completed",
  // deliberate pins (harness-neutral sweep first-run reconciliation)
  "python3",
  "python3 --version",
  "grep -m1 '^Feature phase:'",
  "ls docs/plans/",
];

/** Sentence markers that demote a shown command to one example among equivalents. */
export const FRAMED_MARKERS = ["e.g.", "equivalent", "one example", "whatever", "your harness"];

/** Words whose appearance as the first token marks an inline span or bash line a command. */
const COMMAND_WORDS = new Set([
  "apt",
  "apt-get",
  "awk",
  "bash",
  "brew",
  "bun",
  "cat",
  "cd",
  "chmod",
  "chown",
  "cp",
  "curl",
  "cut",
  "deno",
  "diff",
  "dnf",
  "docker",
  "echo",
  "env",
  "export",
  "find",
  "fish",
  "git",
  "gh",
  "grep",
  "gunzip",
  "gzip",
  "head",
  "helm",
  "kubectl",
  "less",
  "ln",
  "ls",
  "make",
  "mkdir",
  "mv",
  "node",
  "npm",
  "npx",
  "pnpm",
  "podman",
  "printf",
  "ps",
  "pwd",
  "python",
  "python3",
  "pip",
  "pip3",
  "rg",
  "rm",
  "rmdir",
  "rsync",
  "scp",
  "sed",
  "sh",
  "sort",
  "source",
  "ssh",
  "sudo",
  "tar",
  "touch",
  "tr",
  "uniq",
  "unzip",
  "wget",
  "whereis",
  "which",
  "xargs",
  "yum",
  "zsh",
]);

const BASH_FENCE_RE = /```bash\n([\s\S]*?)```/g;
const ANY_FENCE_RE = /```[a-z]*\n?[\s\S]*?```/g;
const INLINE_RE = /`([^`\n]+)`/g;

const segmentsOf = (line) =>
  line
    .split(/\s*&&\s*|\s*\|\|\s*|;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

const headOf = (command) => command.split(/\s+/)[0];

const looksLikeCommand = (command) => {
  const head = headOf(command);
  return COMMAND_WORDS.has(head) || SANCTIONED_PREFIXES.some((prefix) => head === prefix || head.startsWith(prefix));
};

const isSanctioned = (command) => {
  const head = headOf(command);
  if (SANCTIONED_PREFIXES.some((prefix) => head === prefix || head.startsWith(prefix))) return true;
  // A kit helper invocation in any form (e.g. `python3 scripts/x.py --flag`) is the
  // scripts/ exception wearing an interpreter prefix.
  if (command.split(/\s+/).some((token) => token.startsWith("scripts/"))) return true;
  if (command.startsWith("npm run check") || command.startsWith("npm run test")) return true;
  return SANCTIONED_COMMANDS.some((recipe) => command.startsWith(recipe));
};

const isFramed = (context) => {
  const lowered = context.toLowerCase();
  return FRAMED_MARKERS.some((marker) => lowered.includes(marker));
};

/** The blank-line-delimited paragraph containing `index`. */
const paragraphOf = (text, index) => {
  const start = text.lastIndexOf("\n\n", index) + 1;
  const endIdx = text.indexOf("\n\n", index);
  return text.slice(start, endIdx === -1 ? text.length : endIdx);
};

/** The nearest non-blank line before `index` — the sentence introducing a fence. */
const lineBefore = (text, index) => {
  const before = text.slice(0, index);
  const last = before
    .split("\n")
    .filter((line) => line.trim() !== "")
    .at(-1);
  return last ?? "";
};

/** Fence ranges of any language — inline spans inside code are not prose commands. */
const fenceRanges = (text) => [...text.matchAll(ANY_FENCE_RE)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);

/** Sweep one file's text: violations name the file and the offending command. */
export function sweepText(file, text) {
  const violations = [];
  const ranges = fenceRanges(text);
  const inFence = (index) => ranges.some(([start, end]) => index >= start && index < end);

  for (const fence of text.matchAll(BASH_FENCE_RE)) {
    const context = lineBefore(text, fence.index ?? 0);
    for (const rawLine of fence[1].split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      for (const segment of segmentsOf(line)) {
        if (!looksLikeCommand(segment)) continue;
        if (isSanctioned(segment)) continue;
        if (isFramed(context)) continue;
        violations.push({ file, command: segment });
      }
    }
  }

  for (const span of text.matchAll(INLINE_RE)) {
    const command = span[1].trim();
    if (!looksLikeCommand(command)) continue;
    if (isSanctioned(command)) continue;
    if (inFence(span.index ?? 0)) continue;
    if (isFramed(paragraphOf(text, span.index ?? 0))) continue;
    violations.push({ file, command });
  }

  return violations;
}

/** Sweep one skill directory (SKILL.md + references/ + scripts/, .md and .py only —
 *  exactly the file set skill-lint concatenates into contractContent). */
export function sweepSkillDir(skillsRoot, skillName) {
  const rels = ["SKILL.md"];
  for (const dir of ["references", "scripts"]) {
    const full = join(skillsRoot, skillName, dir);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full)) {
      if (/\.(md|py)$/.test(entry)) rels.push(`${dir}/${entry}`);
    }
  }
  const violations = [];
  for (const rel of rels) {
    const content = readFileSync(join(skillsRoot, skillName, rel), "utf8");
    violations.push(...sweepText(`${skillName}/${rel}`, content));
  }
  return violations;
}
