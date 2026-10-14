#!/usr/bin/env node
/**
 * Authoring tool: the pinned phrases a revision carried that the working tree no longer does.
 *
 * A pin is a string the suite asserts verbatim, harvested from the same sources skill-lint
 * reads. The checker reports the pins present and lost, and exits non-zero when a pin is
 * gone, so a caller can gate on it.
 *
 * Usage: node tests/tools/pins-lost.mjs <skill-file> [--against <revision>]
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const pool = new Set();
const add = (phrase) => {
  if (phrase && phrase.length >= 20) pool.add(phrase);
};
const unquote = (raw) => {
  try {
    return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
  } catch {
    return null;
  }
};
const harvest = (src) => {
  for (const match of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(match[1].replace(/\\\\/g, "\\")));
  for (const match of src.matchAll(/`([^`]{20,})`/g)) add(match[1]);
  for (const match of src.matchAll(/\/((?:[^/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
    const body = match[1].replace(/\\([().[\]{}*+?^$|/])/g, "$1");
    for (const part of body.split("|")) {
      add(
        part
          .replace(/[[\](){}*+?^$]/g, "")
          .replace(/\\s\+|\\s\*/g, " ")
          .trim(),
      );
    }
  }
};
const readIfPresent = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
};

// The pool mirrors skill-lint: the two canonical marker files, then every top-level test
// file that names skills/. A missing file is skipped, never fatal.
const SKIPPED = ["markers.mjs", "skill-lint.mjs", "prescription-sweep.mjs"];
for (const name of ["tests/markers.mjs", "tests/skill-lint.mjs"]) {
  const src = readIfPresent(name);
  if (src) harvest(src);
}
for (const name of readdirSync("tests")) {
  if (!/\.(mjs|ts)$/.test(name) || SKIPPED.includes(name)) continue;
  const src = readIfPresent(join("tests", name));
  if (src?.includes("skills/")) harvest(src);
}

const { values, positionals } = (() => {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: { against: { type: "string" } },
    });
  } catch (error) {
    console.error(`pins-lost.mjs: ${error.message}`);
    process.exit(1);
  }
})();
const target = positionals[0];
if (!target) {
  console.error("usage: node tests/tools/pins-lost.mjs <skill-file> [--against <revision>]");
  process.exit(1);
}
const revision = values.against ?? "HEAD";

const resolved = spawnSync("git", ["rev-parse", "--verify", `${revision}^{commit}`], { encoding: "utf8" });
if (resolved.status !== 0) {
  console.error(`pins-lost.mjs: revision "${revision}" does not resolve`);
  process.exit(1);
}

// git needs a repo-relative path, while callers pass whatever path they hold.
const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};
// Real paths on both sides: /var is an alias of /private/var on macOS, so a textual
// comparison of two correct paths would report the file as outside the repository.
const toplevel = real(spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout?.trim() ?? "");
const inRepo = relative(toplevel, real(resolve(target)));
if (!toplevel || inRepo.startsWith("..")) {
  console.error(`pins-lost.mjs: ${target} is outside the repository at ${toplevel || "(unknown)"}`);
  process.exit(1);
}
const fromRevision = spawnSync("git", ["show", `${revision}:${inRepo}`], { encoding: "utf8" }).stdout ?? "";
const current = readIfPresent(target) ?? "";
const present = [...pool].filter((phrase) => current.includes(phrase));
const lost = [...pool].filter((phrase) => fromRevision.includes(phrase) && !current.includes(phrase));

console.log(
  `pins-lost.mjs: ${target} against ${revision} — present ${present.length}, lost ${lost.length} (pin pool ${pool.size})`,
);
for (const phrase of lost) {
  console.error(`  [${phrase.split(/\s+/).filter(Boolean).length}w] ${JSON.stringify(phrase.slice(0, 150))}`);
}
process.exit(lost.length ? 1 : 0);
