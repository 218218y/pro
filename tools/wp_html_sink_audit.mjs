#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const scanRoots = ['esm'];
const sinkPattern = /\.(?:innerHTML|outerHTML)\s*=|\.insertAdjacentHTML\s*\(/g;
const allowedPathPatterns = [
  /^esm\/native\/ui\//,
  /^esm\/native\/runtime\/dom_ops\.ts$/,
  /^esm\/entry_pro_shared\.ts$/,
  /^esm\/entry_pro_overlay\.ts$/,
];
const ignoredPathPatterns = [/(^|\/)dist\//, /(^|\/)node_modules\//, /(^|\/)tests\//, /\.d\.ts$/];

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
const hits = [];
for (const rootName of scanRoots) {
  for (const abs of walk(join(root, rootName))) {
    const rel = relative(root, abs).replace(/\\/g, '/');
    if (ignoredPathPatterns.some(pattern => pattern.test(rel))) continue;
    const source = readFileSync(abs, 'utf8');
    sinkPattern.lastIndex = 0;
    const matches = [...source.matchAll(sinkPattern)];
    if (!matches.length) continue;
    hits.push({ file: rel, count: matches.length });
    if (!allowedPathPatterns.some(pattern => pattern.test(rel))) {
      violations.push(`${rel} (${matches.length} sink${matches.length === 1 ? '' : 's'})`);
    }
  }
}

if (violations.length) {
  console.error('[html-sink-audit] FAILED: raw HTML sinks outside approved UI/runtime owners');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}

console.log(`[html-sink-audit] ok (${hits.length} file(s) with approved sinks)`);
