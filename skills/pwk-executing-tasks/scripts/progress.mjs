#!/usr/bin/env node
/**
 * The progress file's structural slots, written in one place.
 *
 * Every command validates the whole table before touching the file and writes atomically
 * (a temp file plus a rename), so a refusal leaves the file byte-identical. There is no
 * bypass flag: the point of the helper is that a hand edit is no longer needed.
 *
 * Usage:
 *   node progress.mjs set --file <progress.md> --phase <value>
 *   node progress.mjs set-setup --file <progress.md> --value <pending|done|n/a>
 *   node progress.mjs set-row --file <progress.md> --requirement <n> [--done <glyph>] [--commit <hash>]
 *   node progress.mjs append-summary --file <progress.md> --requirement <n> --built <text> [--deviated <text>] [--evidence <text>]
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const DONE_GLYPHS = ["⬜", "🔄", "✅", "❌", "⏭"];
const SETUP_VALUES = ["pending", "done", "n/a"];
const PHASE = /^(e2e-written|reviewing|ship-paused|done|implementing \((\d+)\/(\d+)\))$/;

const REQUIREMENT_HEADER = "| # | Done | Requirement | Per-req ceremony | Commit |";
const SUMMARY_HEADER = "| R# | Requirement | How it was built | Deviated? | Evidence |";

/** Every row of a markdown table, with its line index and its trimmed cells. */
function tableRows(lines, header) {
  const start = lines.indexOf(header);
  if (start === -1) return null;
  const rows = [];
  for (let i = start + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("|")) break;
    rows.push({
      index: i,
      cells: line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    });
  }
  return rows;
}

function fail(message) {
  console.error(`progress.mjs: ${message}`);
  process.exit(1);
}

/** Parse and validate the whole file before any command runs. */
function load(filePath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`cannot read ${filePath}: ${error.message}`);
  }
  const lines = text.split("\n");
  const phaseIndex = lines.findIndex((line) => line.startsWith("Feature phase:"));
  if (phaseIndex === -1) fail(`${filePath}: no Feature phase line`);
  const setupIndex = lines.findIndex((line) => line.startsWith("Setup:"));
  if (setupIndex === -1) fail(`${filePath}: no Setup line`);
  const lastUpdatedIndex = lines.findIndex((line) => line.startsWith("Last updated:"));
  if (lastUpdatedIndex === -1) fail(`${filePath}: no Last updated line`);
  const requirements = tableRows(lines, REQUIREMENT_HEADER);
  if (!requirements) fail(`${filePath}: no Requirements table with its header row`);
  const summary = tableRows(lines, SUMMARY_HEADER);
  if (!summary) fail(`${filePath}: no Execution summary table with its header row`);
  for (const row of requirements) {
    if (row.cells.length !== 5) {
      fail(`${filePath}: line ${row.index + 1} is not a five-cell requirement row`);
    }
  }
  for (const row of summary) {
    if (row.cells.length !== 5) {
      fail(`${filePath}: line ${row.index + 1} is not a five-cell summary row`);
    }
  }
  return { filePath, lines, phaseIndex, setupIndex, lastUpdatedIndex, requirements, summary };
}

const findRow = (rows, requirement, filePath, label) => {
  const row = rows.find((candidate) => candidate.cells[0] === String(requirement));
  if (!row) fail(`${filePath}: no ${label} row for requirement ${requirement}`);
  return row;
};

const requirementRow = (cells) => `| ${cells.join(" | ")} |`;
const stamp = () => new Date().toISOString();

function save(state) {
  state.lines[state.lastUpdatedIndex] = `Last updated: ${stamp()}`;
  const temporary = `${state.filePath}.tmp`;
  writeFileSync(temporary, state.lines.join("\n"));
  renameSync(temporary, state.filePath);
}

const { values, positionals } = (() => {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        file: { type: "string" },
        phase: { type: "string" },
        value: { type: "string" },
        requirement: { type: "string" },
        done: { type: "string" },
        commit: { type: "string" },
        built: { type: "string" },
        deviated: { type: "string" },
        evidence: { type: "string" },
      },
    });
  } catch (error) {
    fail(error.message);
  }
})();

const command = positionals[0];
if (!command || !values.file) {
  fail("usage: progress.mjs <set|set-setup|set-row|append-summary> --file <progress.md> …");
}
const state = load(values.file);

if (command === "set") {
  const phase = values.phase ?? "";
  const match = PHASE.exec(phase);
  if (!match) {
    fail(
      `${values.file}: phase "${phase}" is not one of e2e-written, implementing (k/N), reviewing, ship-paused, done`,
    );
  }
  if (match[2] !== undefined && Number(match[2]) > Number(match[3])) {
    fail(
      `${values.file}: phase "implementing (${match[2]}/${match[3]})" requires k <= N — accepted: e2e-written, implementing (k/N), reviewing, ship-paused, done`,
    );
  }
  state.lines[state.phaseIndex] = `Feature phase: ${phase}`;
} else if (command === "set-setup") {
  const value = values.value ?? "";
  if (!SETUP_VALUES.includes(value)) {
    fail(`${values.file}: setup "${value}" is not one of ${SETUP_VALUES.join(", ")}`);
  }
  state.lines[state.setupIndex] = `Setup: ${value}`;
} else if (command === "set-row") {
  const row = findRow(state.requirements, values.requirement, values.file, "requirement");
  const cells = [...row.cells];
  if (values.done !== undefined) {
    if (!DONE_GLYPHS.includes(values.done)) {
      fail(`${values.file}: done "${values.done}" is not one of ${DONE_GLYPHS.join(" ")}`);
    }
    cells[1] = values.done;
  }
  if (values.commit !== undefined) {
    const existing = cells[4] === "—" ? "" : cells[4];
    const recorded = existing.split(/\s+/).filter(Boolean);
    if (recorded.includes(values.commit)) fail(`${values.file}: commit ${values.commit} is already recorded`);
    cells[4] = [...recorded, values.commit].join(" ");
  }
  state.lines[row.index] = requirementRow(cells);
} else if (command === "append-summary") {
  const row = findRow(state.summary, values.requirement, values.file, "execution summary");
  const [, , built, deviated, evidence] = row.cells;
  if (built || deviated || evidence) {
    fail(`${values.file}: requirement ${values.requirement} already has an execution summary`);
  }
  const cellText = (text) => String(text ?? "—").replace(/\|/g, "\\|");
  state.lines[row.index] = requirementRow([
    row.cells[0],
    row.cells[1],
    cellText(values.built),
    cellText(values.deviated),
    cellText(values.evidence),
  ]);
} else {
  fail(`unknown command "${command}"`);
}

save(state);
