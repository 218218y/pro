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

function listTypeRuntimeStubs() {
  const typesDir = path.join(root, 'types');
  let entries = [];
  try {
    entries = fs.readdirSync(typesDir, { withFileTypes: true });
  } catch {
    return { tsModules: new Set(), jsStubs: new Set() };
  }
  const tsModules = new Set();
  const jsStubs = new Set();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (entry.name.endsWith('.ts')) tsModules.add(entry.name.slice(0, -3));
    if (entry.name.endsWith('.js')) jsStubs.add(entry.name.slice(0, -3));
  }
  return { tsModules, jsStubs };
}

function collectTypeRuntimeStubViolations() {
  const { tsModules, jsStubs } = listTypeRuntimeStubs();
  const violations = [];
  for (const moduleName of [...tsModules].sort()) {
    if (!jsStubs.has(moduleName)) {
      violations.push(`types/${moduleName}.ts is missing matching runtime stub types/${moduleName}.js`);
    }
  }
  for (const moduleName of [...jsStubs].sort()) {
    if (!tsModules.has(moduleName)) {
      violations.push(`types/${moduleName}.js has no matching source module types/${moduleName}.ts`);
    }
  }
  return violations;
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

violations.push(...collectTypeRuntimeStubViolations());

if (violations.length) {
  console.error('[type-hardening-audit] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('[type-hardening-audit] ok (0 `as any` casts in esm/types; types runtime stubs are paired)');
