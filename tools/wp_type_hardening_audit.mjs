#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['esm', 'types'];
const unsafeAnyCastPattern = /\bas\s+any\b/g;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(abs, out);
    } else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

const violations = [];
for (const rootName of scanRoots) {
  for (const abs of walk(path.join(root, rootName))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const source = fs.readFileSync(abs, 'utf8');
    unsafeAnyCastPattern.lastIndex = 0;
    const count = [...source.matchAll(unsafeAnyCastPattern)].length;
    if (count) violations.push(`${rel}: unsafe any cast (${count})`);
  }
}

if (violations.length) {
  console.error('[type-hardening-audit] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('[type-hardening-audit] ok (0 `as any` casts in esm/types)');
