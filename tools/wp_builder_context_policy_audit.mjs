#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const builderRoot = join(root, 'esm/native/builder');
const forbidden = [
  { pattern: /\bwindow\.App\b/g, label: 'window.App root probing' },
  { pattern: /\bglobalThis\.App\b/g, label: 'globalThis.App root probing' },
  { pattern: /\bwindow\.THREE\b/g, label: 'window.THREE fallback' },
  { pattern: /\bglobalThis\.THREE\b/g, label: 'globalThis.THREE fallback' },
  { pattern: /\bdocument\./g, label: 'direct document access' },
  { pattern: /(?<!\.)\blocalStorage\b/g, label: 'direct localStorage access' },
  { pattern: /(?<!\.)\bsetInterval\s*\(/g, label: 'direct interval timer' },
  { pattern: /(?<!\.)\bsetTimeout\s*\(/g, label: 'direct timeout timer' },
];

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = join(dir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry)) out.push(abs);
  }
  return out;
}

const violations = [];
for (const abs of walk(builderRoot)) {
  const rel = relative(root, abs).replace(/\\/g, '/');
  const source = readFileSync(abs, 'utf8');
  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0;
    const count = [...source.matchAll(rule.pattern)].length;
    if (count) violations.push(`${rel}: ${rule.label} (${count})`);
  }
}

if (violations.length) {
  console.error('[builder-context-policy] FAILED');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}
console.log('[builder-context-policy] ok');
