import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.md$/.test(e)) files.push(p); } };
walk('skills');
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
const pinList = [...pins];
console.log('pin pool (literals + regex phrases): ' + pinList.length);
console.log('file'.padEnd(56) + 'base'.padStart(6) + 'pinned'.padStart(8) + 'free'.padStart(7) + '70%cap'.padStart(8) + 'freeAfterCap'.padStart(13));
let totals = { base: 0, pinned: 0, cap: 0 };
for (const f of files) {
  const base = spawnSync('git', ['show', 'HEAD~1:' + f], { encoding: 'utf8' }).stdout || readFileSync(f, 'utf8');
  const cov = new Array(base.length).fill(false);
  for (const p of pinList) { let i = base.indexOf(p); while (i !== -1) { for (let k = i; k < i + p.length; k++) cov[k] = true; i = base.indexOf(p, i + 1); } }
  const words = base.split(/\s+/).filter(Boolean).length;
  const pw = Math.round(words * (cov.reduce((a, b) => a + (b ? 1 : 0), 0) / base.length));
  const cap = Math.floor(words * 0.7);
  totals.base += words; totals.pinned += pw; totals.cap += cap;
  console.log(f.replace('skills/pwk-', '').padEnd(56) + String(words).padStart(6) + String(pw).padStart(8) + String(words - pw).padStart(7) + String(cap).padStart(8) + String(words - pw - cap).padStart(13));
}
console.log('TOTAL base ' + totals.base + ' | pinned ' + totals.pinned + ' | 70% cap ' + totals.cap + ' | free-after-cap ' + (totals.base - totals.pinned - totals.cap));
