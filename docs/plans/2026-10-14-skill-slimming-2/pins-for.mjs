// Pinned phrases present in a skill file: test string literals AND regex-pinned phrases.
// Usage: node pins-for.mjs <repo-relative path>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const target = process.argv[2];
const pins = new Set();
const add = (s) => { if (s && s.length >= 20) pins.add(s); };
const unquote = (raw) => { try { return JSON.parse('"' + raw.replace(/"/g, '\\"') + '"'); } catch { return null; } };
const harvest = (src) => {
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(m[1].replace(/\\\\/g, '\\')));
  for (const m of src.matchAll(/`([^`]{20,})`/g)) add(m[1]);
  for (const m of src.matchAll(/\/((?:[^\/\\\n]|\\.){20,})\/[gimsuy]*/g)) {
    const body = m[1].replace(/\\([().\[\]{}*+?^$|/])/g, '$1');
    for (const part of body.split('|')) {
      const phrase = part.replace(/[\[\](){}*+?^$]/g, '').replace(/\\s\+|\\s\*/g, ' ').trim();
      add(phrase);
    }
  }
};
harvest(readFileSync('tests/markers.mjs', 'utf8'));
harvest(readFileSync('tests/skill-lint.mjs', 'utf8'));
for (const f of readdirSync('tests')) {
  if (!/\.(mjs|ts)$/.test(f) || ['markers.mjs', 'skill-lint.mjs', 'prescription-sweep.mjs'].includes(f)) continue;
  const src = readFileSync(join('tests', f), 'utf8');
  if (src.includes('skills/')) harvest(src);
}
const text = readFileSync(target, 'utf8');
const hits = [...pins].filter((p) => text.includes(p)).sort((a, b) => b.length - a.length);
let words = 0;
for (const h of hits) words += h.split(/\s+/).filter(Boolean).length;
console.log(target + ': ' + hits.length + ' pinned phrases present, ~' + words + ' pinned words, ' + text.split(/\s+/).filter(Boolean).length + ' total');
for (const h of hits) console.log('  ' + JSON.stringify(h.length > 130 ? h.slice(0, 130) + '…' : h));
