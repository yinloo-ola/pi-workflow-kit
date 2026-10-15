#!/usr/bin/env node
/**
 * Build review evidence from explicit, immutable Git bounds.
 *
 * Usage: node build-review-packet.mjs --project <root> --design <path> --progress <path> --scope feature|requirement [--requirement N]
 */
import { spawnSync } from "node:child_process";
import { constants, lstatSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

class PacketError extends Error {}

/** Keep original lines for evidence; inspect headings only outside fenced examples. */
class Document {
  constructor(path) {
    this.lines = readFileSync(path, "utf8").split(/(?<=\n)/);
    this.headings = [];
    this.visible = new Set();
    let fence = null;
    this.lines.forEach((line, index) => {
      const stripped = line.replace(/\r?\n$/, "");
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(stripped);
      if (fence) {
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
        return;
      }
      if (marker) {
        fence = marker[1];
        return;
      }
      this.visible.add(index);
      const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(stripped);
      if (heading) this.headings.push([index, heading[1].length, heading[2]]);
    });
    if (fence) throw new PacketError(`${basename(path)}: unclosed code fence`);
  }

  section(title, level = 2, required = false) {
    const matches = this.headings.filter(([, depth, text]) => depth === level && text === title);
    if (matches.length > 1 || (required && matches.length === 0)) {
      throw new PacketError(`expected one ${title} section; found ${matches.length}`);
    }
    if (matches.length === 0) return null;
    const start = matches[0][0];
    const end = this.headings.find(([index, depth]) => index > start && depth <= level)?.[0] ?? this.lines.length;
    return [start, end];
  }

  text(start, end) {
    return this.lines.slice(start, end).join("");
  }
}

function git(project, ...args) {
  const result = spawnSync("git", ["-C", String(project), ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new PacketError(`git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  }
  return result.stdout;
}

const isSymlink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};

function resolveInput(project, value) {
  const path = isAbsolute(value) ? value : join(project, value);
  return realpathSync(path);
}

/** POSIX-style relative segments, or null when the child is outside the parent. */
function relativeParts(child, parent) {
  const rel = relative(parent, child);
  if (!rel || rel === "" || rel.startsWith("..")) return null;
  return rel.split(/[\\/]/);
}

function validateDestination(path) {
  if (isSymlink(path)) throw new PacketError("packet destination must be a regular file, not a symlink or directory");
  try {
    if (!lstatSync(path).isFile()) {
      throw new PacketError("packet destination must be a regular file, not a symlink or directory");
    }
  } catch (error) {
    if (error instanceof PacketError) throw error;
  }
}

function paths(args) {
  const project = realpathSync(resolve(args.project));
  if (resolve(git(project, "rev-parse", "--show-toplevel").trim()) !== project) {
    throw new PacketError("--project must be the Git worktree root");
  }
  for (const value of [args.design, args.progress]) {
    const supplied = resolve(isAbsolute(value) ? value : join(project, value));
    const lexicalProject = resolve(args.project);
    let rel = relativeParts(supplied, lexicalProject);
    if (!rel) rel = relativeParts(supplied, project);
    if (!rel) throw new PacketError(`${value} is outside the project`);
    let current = project;
    for (const part of rel) {
      current = join(current, part);
      if (isSymlink(current)) throw new PacketError("design/progress paths must not traverse symlinks");
    }
  }
  const design = resolveInput(project, args.design);
  const progress = resolveInput(project, args.progress);
  const relativeTopic = relativeParts(design, join(project, "docs", "plans"));
  if (
    !relativeTopic ||
    relativeTopic.length !== 2 ||
    relativeTopic[0] === "completed" ||
    !design.endsWith("-design.md")
  ) {
    throw new PacketError("design must be docs/plans/<topic>/<leaf>-design.md in an active topic");
  }
  const leaf = basename(design).slice(0, -"-design.md".length);
  if (!leaf || progress !== join(dirname(design), `${leaf}-progress.md`)) {
    throw new PacketError("progress must be the matching <leaf>-progress.md beside the design");
  }
  for (const directory of [
    join(project, "docs"),
    join(project, "docs", "plans"),
    join(project, "docs", "plans", relativeTopic[0]),
  ]) {
    if (isSymlink(directory)) throw new PacketError("symlink topic directories are not writable packet destinations");
  }
  const suffix = args.scope === "feature" ? "" : `-r${args.requirement}`;
  const destination = join(dirname(design), `${leaf}-review-packet${suffix}.md`);
  validateDestination(destination);
  return { project, design, progress, destination };
}

function requirements(document) {
  const region = document.section("Requirements", 2, true);
  const headings = [];
  for (const [index, depth, title] of document.headings) {
    const match = /^R([1-9][0-9]*):\s*\S/.exec(title);
    if (depth === 3 && /^R[0-9]/.test(title) && !match) throw new PacketError("malformed requirement heading");
    if (depth === 3 && match) {
      if (!(region[0] < index && index < region[1])) {
        throw new PacketError("requirement heading outside Requirements section");
      }
      headings.push([Number(match[1]), index]);
    }
  }
  const numbers = headings.map(([number]) => number);
  if (numbers.length === 0 || new Set(numbers).size !== numbers.length) {
    throw new PacketError("missing or duplicate requirement headings");
  }
  return { headings, region };
}

function progressRows(document, project, design) {
  const firstHeading = document.headings.find(([, depth]) => depth === 2)?.[0] ?? document.lines.length;
  const pointers = [...document.visible]
    .filter((index) => index < firstHeading && document.lines[index].startsWith("Design: "))
    .map((index) => document.lines[index].trim().slice(8));
  if (pointers.length !== 1 || resolveInput(project, pointers[0]) !== design) {
    throw new PacketError("progress Design header must identify the selected design exactly once");
  }
  const [start, end] = document.section("Requirements", 2, true);
  const lines = [];
  for (let index = start + 1; index < end; index += 1) {
    if (document.visible.has(index) && document.lines[index].trim()) lines.push(document.lines[index].trim());
  }
  if (lines.length < 3) throw new PacketError("missing Requirements table");

  const cells = (line) => {
    if (!line.startsWith("|") || !line.endsWith("|")) throw new PacketError("malformed Requirements table row");
    return line
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map((cell) => cell.trim());
  };

  const header = cells(lines[0]);
  if (header.join("|") !== ["#", "Done", "Requirement", "Per-req ceremony", "Commit"].join("|")) {
    throw new PacketError("Requirements table must have #, Done, Requirement, Per-req ceremony, Commit columns");
  }
  const separator = cells(lines[1]);
  if (separator.length !== 5 || !separator.every((cell) => /^:?-+:?$/.test(cell))) {
    throw new PacketError("malformed Requirements table separator");
  }
  const rows = new Map();
  for (const line of lines.slice(2)) {
    const row = cells(line);
    if (row.length !== 5 || !/^[1-9][0-9]*$/.test(row[0])) throw new PacketError("malformed Requirements table row");
    const number = Number(row[0]);
    if (rows.has(number)) throw new PacketError(`duplicate R${number} progress row`);
    if (!["", "⬜", "🔄", "✅", "❌", "⏭"].includes(row[1])) throw new PacketError(`R${number}: invalid Done cell`);
    rows.set(number, row);
  }
  return rows;
}

function bounds(project, rows, headings, args) {
  const numbers = headings.map(([number]) => number);
  const position = args.scope === "requirement" ? numbers.indexOf(args.requirement) : null;
  const relevant = position === null ? numbers : numbers.slice(Math.max(0, position - 1), position + 1);
  if ([...rows.keys()].some((number) => !numbers.includes(number))) {
    throw new PacketError("progress contains requirements absent from the design");
  }
  const recorded = new Map();
  let previous = null;
  const currentHead = git(project, "rev-parse", "--verify", "HEAD^{commit}").trim();
  for (const number of relevant) {
    if (!rows.has(number)) throw new PacketError(`R${number}: missing progress row`);
    const row = rows.get(number);
    const value = row[4];
    if (value === "" || value === "—" || value === "-") {
      if (!["❌", "⏭"].includes(row[1])) throw new PacketError(`R${number}: missing Commit entry`);
      recorded.set(number, []);
      continue;
    }
    // An ordered whitespace-separated list supports review-fix commits without losing the
    // first feature commit. Other formats are ambiguous, never mined for hashes.
    const entries = value.split(/\s+/).filter(Boolean);
    if (!entries.every((entry) => /^[0-9a-fA-F]{7,64}$/.test(entry))) {
      throw new PacketError(`R${number}: Commit must contain only ordered hexadecimal commit IDs`);
    }
    const commits = [];
    for (const entry of entries) {
      const commit = git(project, "rev-parse", "--verify", `${entry}^{commit}`).trim();
      if (previous) {
        if (previous === commit) throw new PacketError("duplicate or overlapping recorded commits");
        git(project, "merge-base", "--is-ancestor", previous, commit);
      }
      git(project, "merge-base", "--is-ancestor", commit, currentHead);
      commits.push(commit);
      previous = commit;
    }
    recorded.set(number, commits);
  }
  if (args.scope === "feature") {
    const first = [...recorded.values()].find((commits) => commits.length > 0)?.[0] ?? null;
    if (!first) throw new PacketError("no recorded commits; cannot infer a feature base");
    return [git(project, "rev-parse", "--verify", `${first}^`).trim(), currentHead];
  }
  const selected = recorded.get(args.requirement);
  if (!selected?.length) throw new PacketError("selected requirement has no recorded bound");
  if (position === 0) return [git(project, "rev-parse", "--verify", `${selected[0]}^`).trim(), selected.at(-1)];
  const prior = recorded.get(numbers[position - 1]);
  if (!prior?.length) throw new PacketError("previous requirement has no recorded bound; cannot guess a range");
  return [prior.at(-1), selected.at(-1)];
}

function evidence(document, headings, region, args) {
  const feature = document.section("Feature acceptance");
  if (feature && feature[0] < region[1]) throw new PacketError("Feature acceptance must follow Requirements");
  let start;
  let end;
  if (args.scope === "feature") {
    start = headings[0][1];
    end = feature ? feature[0] : document.lines.length;
  } else {
    const position = headings.findIndex(([number]) => number === args.requirement);
    start = headings[position][1];
    end = position + 1 < headings.length ? headings[position + 1][1] : region[1];
  }
  const criteria = document.text(start, end);
  let acceptance = "";
  if (feature) {
    const stop =
      document.headings.find(
        ([index, depth, title]) =>
          feature[0] < index && index < feature[1] && depth === 3 && title.startsWith("Feature review:"),
      )?.[0] ?? feature[1];
    acceptance = document.text(feature[0], stop);
  }
  const notes = [];
  for (const [index, depth, title] of document.headings) {
    if (depth === 3 && title === "Production-risk notes" && start <= index && index < end) {
      const stop =
        document.headings.find(([i, d, t]) => i > index && (d <= 2 || (d === 3 && /^R[0-9]+:/.test(t))))?.[0] ??
        document.lines.length;
      notes.push(document.text(index, Math.min(stop, end)));
    }
  }
  const risk = document.section("Production-risk areas");
  if (risk) notes.push(document.text(risk[0], risk[1]));
  return { criteria, acceptance, notes: notes.join("") };
}

function build(args) {
  const { project, design: designPath, progress: progressPath, destination } = paths(args);
  const design = new Document(designPath);
  const { headings, region } = requirements(design);
  if (args.scope === "requirement" && !headings.some(([number]) => number === args.requirement)) {
    throw new PacketError("selected requirement is absent from the design");
  }
  const rows = progressRows(new Document(progressPath), project, designPath);
  const [base, head] = bounds(project, rows, headings, args);
  const { criteria, acceptance, notes } = evidence(design, headings, region, args);
  const span = `${base}..${head}`;
  const pathspec = ["--", ".", ":(glob,exclude)**/*-review-packet*.md"];
  const sections = [
    ["Commits", git(project, "log", "--oneline", "--no-decorate", span)],
    ["Changed files", git(project, "diff", "--no-ext-diff", "--no-textconv", "--stat", span, ...pathspec)],
    ["Acceptance criteria (verbatim from the design doc)", criteria],
    ["Feature acceptance (verbatim)", acceptance],
    ["Production-risk notes (verbatim, if any)", notes],
    ["Diff", git(project, "diff", "--no-ext-diff", "--no-textconv", "--no-color", span, ...pathspec)],
  ];
  const label = args.scope === "feature" ? "feature review" : `requirement R${args.requirement} review`;
  // The blank line between Base and Head is load-bearing: CommonMark merges consecutive
  // plain lines into one paragraph in every preview.
  let packet = `# Review packet: ${basename(dirname(designPath))} — ${label}\n\nBase: ${base}\n\nHead: ${head}\n\n`;
  for (const [title, content] of sections) packet += `## ${title}\n\n${content}\n`;

  // Every parse and Git read finishes before a temporary file exists, so a failure in
  // assembly leaves an earlier complete packet intact. Replacement is same-directory.
  let temporary = null;
  try {
    validateDestination(destination);
    temporary = join(dirname(destination), `.${basename(destination)}.${process.pid}${Date.now()}`);
    writeFileSync(temporary, packet, {
      encoding: "utf8",
      flag: constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    });
    validateDestination(destination);
    renameSync(temporary, destination);
    temporary = null;
  } finally {
    if (temporary) {
      try {
        unlinkSync(temporary);
      } catch {
        // The temporary file is already gone.
      }
    }
  }
  console.log(`Wrote ${destination}\nRange: ${base}..${head}`);
}

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  console.log(`usage: node build-review-packet.mjs --project <root> --design <path> --progress <path> --scope feature|requirement [--requirement N]

Build review evidence from explicit, immutable Git bounds, with Node's standard library only.

--project resolves from the caller cwd and must be a Git worktree root. --design and --progress are absolute or relative to --project, not the skill or cwd. Output is <leaf>-review-packet[-rN].md beside the matched docs in docs/plans/<topic>/. Commit cells contain ordered whitespace-separated hexadecimal commit IDs, not revision expressions.`);
  process.exit(0);
}

const { values } = (() => {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals: false,
      options: {
        project: { type: "string" },
        design: { type: "string" },
        progress: { type: "string" },
        scope: { type: "string" },
        requirement: { type: "string" },
      },
    });
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exit(2);
  }
})();
for (const required of ["project", "design", "progress", "scope"]) {
  if (!values[required]) {
    console.error(`error: --${required} is required`);
    process.exit(2);
  }
}
if (!["feature", "requirement"].includes(values.scope)) {
  console.error("error: --scope must be feature or requirement");
  process.exit(2);
}
const requirement = values.requirement === undefined ? undefined : Number(values.requirement);
if ((values.scope === "requirement") !== (requirement !== undefined)) {
  console.error("error: --requirement N is required only for --scope requirement");
  process.exit(2);
}
try {
  build({
    project: values.project,
    design: values.design,
    progress: values.progress,
    scope: values.scope,
    requirement,
  });
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
