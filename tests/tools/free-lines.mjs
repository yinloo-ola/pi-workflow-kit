import { readFileSync, readdirSync } from "node:fs";
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
  for (const m of src.matchAll(/\/((?:[^/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
    const body = m[1].replace(/\\([().[\]{}*+?^$|/])/g, "$1");
    for (const part of body.split("|"))
      add(
        part
          .replace(/[[\](){}*+?^$]/g, "")
          .replace(/\\s[+*]/g, " ")
          .trim(),
      );
  }
};
harvest(readFileSync("tests/markers.mjs", "utf8"));
harvest(readFileSync("tests/skill-lint.mjs", "utf8"));
for (const f of readdirSync("tests")) {
  if (!/\.(mjs|ts)$/.test(f) || ["markers.mjs", "skill-lint.mjs", "prescription-sweep.mjs"].includes(f)) continue;
  const src = readFileSync(join("tests", f), "utf8");
  if (src.includes("skills/")) harvest(src);
}
const pinList = [...pins];
for (const target of process.argv.slice(2)) {
  const text = readFileSync(target, "utf8");
  const cov = new Array(text.length).fill(false);
  for (const p of pinList) {
    let i = text.indexOf(p);
    while (i !== -1) {
      for (let k = i; k < i + p.length; k++) cov[k] = true;
      i = text.indexOf(p, i + 1);
    }
  }
  const offsets = [];
  let off = 0;
  for (const line of text.split("\n")) {
    offsets.push(off);
    off += line.length + 1;
  }
  const total = text.split(/\s+/).filter(Boolean).length;
  const pinnedWords = Math.round(total * (cov.reduce((a, b) => a + (b ? 1 : 0), 0) / text.length));
  console.log(
    "== " +
      target +
      ": " +
      total +
      " words, ~" +
      pinnedWords +
      " pinned (" +
      ((100 * pinnedWords) / total).toFixed(0) +
      "%), free ~" +
      (total - pinnedWords),
  );
  console.log("   longest lines with the least pinned content:");
  const rows = text
    .split("\n")
    .map((l, i) => {
      const t = l.trim();
      const words = t.split(/\s+/).filter(Boolean).length;
      if (words < 25) return null;
      const base = offsets[i];
      const linePinned = cov.slice(base, base + l.length).reduce((a, b) => a + (b ? 1 : 0), 0);
      const share = l.length ? linePinned / l.length : 0;
      const freeWords = Math.round(words * (1 - share));
      return { i: i + 1, words, freeWords, t };
    })
    .filter(Boolean)
    .sort((a, b) => b.freeWords - a.freeWords)
    .slice(0, 12);
  for (const r of rows)
    console.log(
      "   " +
        String(r.freeWords).padStart(4) +
        " free/" +
        String(r.words).padStart(3) +
        "w L" +
        String(r.i).padStart(3) +
        "  " +
        r.t.slice(0, 105),
    );
}
