// Pins present in the committed version of a file but missing from the working copy.
// Harvests BOTH quoted string literals and regex-pinned phrases (a test that asserts an
// exact sentence with toMatch(/.../) pins that sentence just as hard as toContain("...").
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
const target = process.argv[2];
const pins = new Set();
const add = (s) => {
  if (s && s.length >= 20) pins.add(s);
};
const unquote = (raw) => {
  try {
    return JSON.parse('"' + raw.replace(/"/g, '\\"') + '"');
  } catch {
    return null;
  }
};
const harvest = (src) => {
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(m[1].replace(/\\\\/g, "\\")));
  for (const m of src.matchAll(/`([^`]{20,})`/g)) add(m[1]);
  // regex literals: strip escapes, then keep each literal alternative long enough to be prose
  for (const m of src.matchAll(/\/((?:[^/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
    const body = m[1].replace(/\\([().[\]{}*+?^$|/])/g, "$1");
    for (const part of body.split("|")) {
      const phrase = part
        .replace(/[[\](){}*+?^$]/g, "")
        .replace(/\\s\+|\\s\*/g, " ")
        .trim();
      add(phrase);
    }
  }
};
harvest(readFileSync("tests/markers.mjs", "utf8"));
harvest(readFileSync("tests/skill-lint.mjs", "utf8"));
for (const f of readdirSync("tests")) {
  if (!/\.(mjs|ts)$/.test(f) || ["markers.mjs", "skill-lint.mjs", "prescription-sweep.mjs"].includes(f)) continue;
  const src = readFileSync(join("tests", f), "utf8");
  if (src.includes("skills/")) harvest(src);
}
const old = spawnSync("git", ["show", "HEAD:" + target], { encoding: "utf8" }).stdout;
const now = readFileSync(target, "utf8");
const lost = [...pins].filter((p) => old.includes(p) && !now.includes(p));
console.log("LOST from " + target + ": " + lost.length + "  (pin pool " + pins.size + ")");
for (const p of lost)
  console.log("  [" + p.split(/\s+/).filter(Boolean).length + "w] " + JSON.stringify(p.slice(0, 150)));
