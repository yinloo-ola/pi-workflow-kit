// Evidence sketch for the skill-slimming pass. Read-only measurement over skills/ and tests/.
// Run: node docs/plans/2026-10-14-skill-slimming-2/evidence.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const skillFiles = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.md$/.test(p)) skillFiles.push(p); } };
walk('skills');

const pins = new Set();
const add = (s) => { if (s && s.length >= 20) pins.add(s); };
const unquote = (raw) => { try { return JSON.parse('"' + raw.replace(/"/g, '\\"') + '"'); } catch { return null; } };
const harvest = (src) => {
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) add(unquote(m[1].replace(/\\\\/g, '\\')));
  for (const m of src.matchAll(/`([^`]{20,})`/g)) add(m[1]);
};
harvest(readFileSync('tests/markers.mjs', 'utf8'));
harvest(readFileSync('tests/skill-lint.mjs', 'utf8'));
let skillAwareTests = 0;
for (const f of readdirSync('tests')) {
  if (!/\.(mjs|ts)$/.test(f) || ['markers.mjs', 'skill-lint.mjs', 'prescription-sweep.mjs'].includes(f)) continue;
  const src = readFileSync(join('tests', f), 'utf8');
  if (src.includes('skills/')) { skillAwareTests++; harvest(src); }
}
const pinList = [...pins];

console.log('== PIN COVERAGE (verbatim test-pinned substrings) ==');
console.log('literals harvested:', pinList.length, '| test files referencing skills/:', skillAwareTests);
let tw = 0, tpw = 0;
for (const f of skillFiles) {
  const text = readFileSync(f, 'utf8');
  const cov = new Array(text.length).fill(false);
  let hits = 0;
  for (const p of pinList) { let i = text.indexOf(p); while (i !== -1) { hits++; for (let k = i; k < i + p.length; k++) cov[k] = true; i = text.indexOf(p, i + 1); } }
  const words = text.split(/\s+/).filter(Boolean).length;
  const pw = Math.round(words * (cov.reduce((a, b) => a + b, 0) / text.length));
  tw += words; tpw += pw;
  console.log('  ' + f.padEnd(56) + String(words).padStart(6) + 'w  ' + (100 * cov.reduce((a, b) => a + b, 0) / text.length).toFixed(1).padStart(5) + '% pinned  ' + String(hits).padStart(4) + ' hits');
}
console.log('  TOTAL ' + tw + 'w | pinned ~' + tpw + 'w | free ~' + (tw - tpw) + 'w');

console.log('');
console.log('== CROSS-FILE DUPLICATION (sentences >=45 chars, in 2+ files) ==');
const owner = new Map();
for (const f of skillFiles) {
  const text = readFileSync(f, 'utf8').replace(/\s+/g, ' ');
  for (const s of text.split(/(?<=[.!?])\s+/)) { const t = s.trim(); if (t.length < 45) continue; if (!owner.has(t)) owner.set(t, new Set()); owner.get(t).add(f); }
}
const shared = [...owner.entries()].filter(([, s]) => s.size > 1).sort((a, b) => b[0].split(/\s+/).length - a[0].split(/\s+/).length);
let redundant = 0;
for (const [t, s] of shared) redundant += t.split(/\s+/).length * (s.size - 1);
console.log('shared sentences:', shared.length, '| redundant words:', redundant);
for (const [t, s] of shared) console.log('  x' + s.size + '  ' + t.slice(0, 110) + (t.length > 110 ? '...' : ''));

console.log('');
console.log('== SECTION MASS (largest sections of the three heaviest files) ==');
for (const f of ['skills/pwk-executing-tasks/SKILL.md', 'skills/pwk-brainstorming/SKILL.md', 'skills/pwk-finalizing/SKILL.md']) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let cur = '(preamble)'; const acc = new Map();
  for (const l of lines) {
    const h = l.match(/^(##+)\s+(.*)$/);
    if (h) cur = h[1] + ' ' + h[2].split('(')[0].trim();
    const w = l.split(/\s+/).filter(Boolean).length;
    acc.set(cur, (acc.get(cur) || 0) + w);
  }
  const total = lines.join(' ').split(/\s+/).filter(Boolean).length;
  console.log('  ' + f + '  (' + lines.length + ' lines, ' + total + 'w)');
  for (const [k, v] of [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) if (v > 100) console.log('     ' + String(v).padStart(5) + 'w  ' + k);
}
