#!/usr/bin/env node
/**
 * Read-only structural validation of a workflow design document.
 *
 * Structure only: it does not judge whether a criterion is true, testable, or specific.
 *
 * Usage: node validate-design.mjs <design-path>
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const TAG_VALUES = {
  Checkpoints: ["none", "full"],
  Review: ["skip", "parallel", "inline"],
  "Feature review": ["auto", "parallel", "inline"],
};
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)\s*#*\s*$/;
const REQUIREMENT = /^R([1-9][0-9]*):\s*(.*)$/;
const REQUIREMENT_LIKE = /^R(?:[0-9]|\s*:)/;
const CRITERIA = /^\*\*Acceptance criteria\*\*(?:\s*(?:—|–|-|:).*)?$/;

/** Blank fenced examples, keeping an unclosed-fence diagnostic. Not a Markdown renderer. */
function visibleLines(text) {
  const lines = [];
  const errors = [];
  let fence = "";
  let fenceLine = 0;
  for (const [offset, line] of text.split(/\r?\n/).entries()) {
    const number = offset + 1;
    if (fence) {
      const char = fence[0] === "`" ? "`" : "~";
      if (new RegExp(`^ {0,3}${char}{${fence.length},}[ \\t]*$`).test(line)) fence = "";
      lines.push("");
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      fence = opening[1];
      fenceLine = number;
      lines.push("");
    } else {
      lines.push(line);
    }
  }
  if (fence) errors.push(`line ${fenceLine}: unclosed code fence; close it before validating`);
  return { lines, errors };
}

/** Presence of content, not its quality. */
function hasContent(lines) {
  return lines.some((line) => {
    const text = line.replace(/^\s*(?:[-+*]|[0-9]+[.)])\s*/, "").trim();
    return Boolean(text) && /\w/.test(text);
  });
}

/** A heading or another bold label terminates a criteria section. */
function criteriaBody(lines, start, end) {
  const result = [];
  for (const line of lines.slice(start, end)) {
    if (HEADING.test(line) || /^\s*\*\*[^*]+\*\*/.test(line)) break;
    result.push(line);
  }
  return result;
}

function validate(text) {
  const { lines, errors } = visibleLines(text);
  const headings = [];
  for (const [index, line] of lines.entries()) {
    const match = HEADING.exec(line);
    if (match) headings.push({ level: match[1].length, title: match[2], index });
  }
  for (const heading of headings) {
    if (REQUIREMENT_LIKE.test(heading.title) && heading.level !== 3) {
      errors.push(`line ${heading.index + 1}: ${heading.title} must use a ### requirement heading`);
    }
  }
  const requirements = headings.filter((h) => h.level === 3 && REQUIREMENT_LIKE.test(h.title));
  const features = headings.filter((h) => h.level === 2 && h.title === "Feature acceptance");
  const summaries = [];

  if (requirements.length === 0) {
    errors.push("required requirement block missing; add ### R1: <name> with Acceptance criteria");
  }
  const seen = new Set();
  requirements.forEach((heading, position) => {
    const expected = position + 1;
    const match = REQUIREMENT.exec(heading.title);
    if (!match) {
      errors.push(`line ${heading.index + 1}: malformed requirement '${heading.title}'; use ### R${expected}: <name>`);
      return;
    }
    const number = Number(match[1]);
    if (seen.has(number)) errors.push(`line ${heading.index + 1}: duplicate requirement R${number}`);
    else if (number !== expected) {
      errors.push(
        `line ${heading.index + 1}: expected R${expected}, found R${number}; IDs must be sequential in document order`,
      );
    }
    seen.add(number);
    if (!match[2].trim()) errors.push(`line ${heading.index + 1}: R${number} requires a nonempty name`);
  });

  const introEnd = requirements.length ? requirements[0].index : lines.length;
  const short = lines.slice(0, introEnd).some((line) => /^In short:\s*\S.*$/.test(line));
  const fullFormat = headings.some((h) => h.level === 2 && (h.title === "At a glance" || h.title === "Requirements"));
  const trivial =
    short &&
    !fullFormat &&
    requirements.length === 1 &&
    requirements[0].title.startsWith("R1:") &&
    features.length === 0;
  if (!trivial && features.length === 0) {
    errors.push(
      "## Feature acceptance is required for non-trivial designs; the trivial exception needs an In short: one-liner and a single R1 block without full-format sections",
    );
  }
  if (features.length > 1) errors.push("duplicate ## Feature acceptance section; keep exactly one");

  const ownedTags = new Set();
  const tags = (start, end, names, owner) => {
    const values = Object.fromEntries(names.map((name) => [name, TAG_VALUES[name][0]]));
    const found = new Set();
    for (const heading of headings) {
      if (heading.index < start || heading.index >= end) continue;
      for (const name of names) {
        if (
          heading.level !== 3 ||
          !new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(heading.title)
        ) {
          continue;
        }
        ownedTags.add(heading.index);
        if (found.has(name)) errors.push(`line ${heading.index + 1}: duplicate ${name} tag in ${owner}`);
        found.add(name);
        let value = heading.title.slice(name.length).trim();
        value = value.startsWith(":") ? value.slice(1).trim() : "";
        if (!TAG_VALUES[name].includes(value)) {
          errors.push(
            `line ${heading.index + 1}: invalid ${name} tag in ${owner}; expected ${TAG_VALUES[name].join(" | ")}`,
          );
        } else {
          values[name] = value;
        }
      }
    }
    return values;
  };

  for (const heading of requirements) {
    const end =
      headings.find((h) => h.index > heading.index && (h.level <= 2 || requirements.includes(h)))?.index ??
      lines.length;
    const criteriaEnd = headings.find((h) => h.index > heading.index && h.index < end)?.index ?? end;
    const labels = [];
    for (let i = heading.index + 1; i < criteriaEnd; i += 1) if (CRITERIA.test(lines[i].trim())) labels.push(i);
    const owner = heading.title.split(":")[0];
    if (labels.length === 0) {
      errors.push(`line ${heading.index + 1}: ${owner} needs a standalone **Acceptance criteria** section`);
    } else if (labels.length > 1) {
      errors.push(`line ${labels[1] + 1}: ${owner} has duplicate Acceptance criteria sections`);
    } else if (!hasContent(criteriaBody(lines, labels[0] + 1, end))) {
      errors.push(
        `line ${labels[0] + 1}: ${owner} Acceptance criteria is empty; add a criterion before the next section`,
      );
    }
    const values = tags(heading.index + 1, end, ["Checkpoints", "Review"], owner);
    summaries.push(`${owner}: Checkpoints=${values.Checkpoints}, Review=${values.Review}`);
  }

  for (const heading of features) {
    const end = headings.find((h) => h.index > heading.index && h.level <= 2)?.index ?? lines.length;
    if (!hasContent(criteriaBody(lines, heading.index + 1, end))) {
      errors.push(
        `line ${heading.index + 1}: Feature acceptance is empty; add an end-to-end criterion before its review tag`,
      );
    }
    const values = tags(heading.index + 1, end, ["Feature review"], "Feature acceptance");
    summaries.push(`Feature review=${values["Feature review"]}`);
  }

  for (const heading of headings) {
    for (const name of Object.keys(TAG_VALUES)) {
      if (
        new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(heading.title) &&
        !ownedTags.has(heading.index)
      ) {
        const owner = name === "Feature review" ? "## Feature acceptance" : "a ### R<n>: requirement block";
        errors.push(`line ${heading.index + 1}: ${name} must be a ### tag inside ${owner}`);
      }
    }
  }
  return { errors, summaries };
}

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  console.log(`usage: node validate-design.mjs <design-path>

Read-only structural design validation with Node's standard library only. Semantic correctness is not verified.

Pass an explicit design path. Absolute paths are used directly; relative paths resolve from the caller's current working directory (cwd), not the installed skill directory.`);
  process.exit(0);
}

const { positionals } = (() => {
  try {
    return parseArgs({ args: process.argv.slice(2), allowPositionals: true });
  } catch (error) {
    console.error(`validate-design.mjs: ${error.message}`);
    process.exit(2);
  }
})();
const design = positionals[0];
if (!design) {
  console.error("usage: node validate-design.mjs <design-path>");
  process.exit(2);
}
let text;
try {
  // A strict decode: reading as utf8 would replace invalid bytes instead of refusing them.
  text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(design));
} catch (error) {
  console.error(`${design}: cannot read UTF-8 design: ${error.message}`);
  process.exit(2);
}
const { errors, summaries } = validate(text);
if (errors.length) {
  for (const error of errors) console.error(`${design}: ${error}`);
  process.exit(1);
}
console.log(`${design}: structural checks passed. Semantic correctness is not verified.`);
for (const summary of summaries) console.log(`  ${summary}`);
process.exit(0);
