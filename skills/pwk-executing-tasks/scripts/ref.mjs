#!/usr/bin/env node
/**
 * Print one anchored section of a reference file, so a step loads the section it needs
 * instead of the whole document.
 *
 * The anchor is the heading slug: lowercased, spaces to dashes, punctuation dropped.
 * The section runs from its heading to the next heading of the same or higher level.
 *
 * Usage: node ref.mjs <reference-path>#<anchor>
 */
import { readFileSync } from "node:fs";

const HEADING = /^(#{1,6})\s+(.+?)\s*$/;

/** The heading slug a markdown link anchor is written against. */
export function slug(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Every heading in a document, with its level, slug, and line index. */
export function headings(lines) {
  const found = [];
  for (const [index, line] of lines.entries()) {
    const match = HEADING.exec(line);
    if (match) found.push({ index, level: match[1].length, slug: slug(match[2]), text: match[2] });
  }
  return found;
}

export function section(lines, anchor) {
  const all = headings(lines);
  const start = all.find((heading) => heading.slug === anchor);
  if (!start) return null;
  const next = all.find((heading) => heading.index > start.index && heading.level <= start.level);
  const body = lines.slice(start.index, next ? next.index : lines.length);
  while (body.length && body[body.length - 1].trim() === "") body.pop();
  return { text: body.join("\n"), available: all.map((heading) => heading.slug) };
}

function fail(message) {
  console.error(`ref.mjs: ${message}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const target = process.argv[2];
  if (!target) fail("usage: ref.mjs <reference-path>#<anchor>");
  const hash = target.lastIndexOf("#");
  if (hash === -1 || hash === target.length - 1) fail(`${target}: pass an anchor, as <reference-path>#<anchor>`);
  const path = target.slice(0, hash);
  const anchor = target.slice(hash + 1);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
  const found = section(text.split("\n"), anchor);
  if (!found) {
    const available =
      headings(text.split("\n"))
        .map((heading) => heading.slug)
        .join(", ") || "(none)";
    fail(`${path}: no heading matches "#${anchor}" — available: ${available}`);
  }
  console.log(found.text);
}
