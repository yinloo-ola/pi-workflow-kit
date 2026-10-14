import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.md$/.test(p)) files.push(p);
  }
};
walk("skills");
for (const f of files) {
  const text = readFileSync(f, "utf8").replace(/\s+/g, " ");
  const seen = new Map();
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const t = s.trim();
    if (t.split(/\s+/).length < 12) continue;
    seen.set(t, (seen.get(t) || 0) + 1);
  }
  const dup = [...seen.entries()].filter(([, n]) => n > 1);
  if (dup.length) {
    console.log(f);
    for (const [t, n] of dup) console.log("   x" + n + "  " + t.slice(0, 120));
  }
}
console.log("(files with no intra-file repeat of a >=12-word sentence are not listed)");
