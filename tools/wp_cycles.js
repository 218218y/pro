#!/usr/bin/env node
/**
 * tools/wp_cycles.js
 *
 * Pure Node (no deps) circular-dependency check for ESM imports.
 *
 * Why: `madge` is great but requires node_modules. This script gives the same
 * "no cycles" guarantee in CI / fresh machines without extra installs.
 *
 * Supports mixed JS/TS during migration:
 * - Scans .js/.mjs/.ts/.tsx/.mts
 * - Resolves extensionless specs
 * - Resolves `.js` specs to `.ts` when the `.js` file doesn't exist yet (common in TS source)
 * - Collapses tiny `.js` re-export shims that forward into `.ts` (helps during Stage 5)
 *
 * Usage:
 *   node tools/wp_cycles.js              # checks ./esm
 *   node tools/wp_cycles.js esm          # checks ./esm
 *   node tools/wp_cycles.js js           # checks ./js (if exists)
 *   node tools/wp_cycles.js --json       # machine-readable output
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const rootArg = args.find(a => !a.startsWith('-')) || 'esm';

const SRC_ROOT = path.resolve(ROOT, rootArg);

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if (!fs.existsSync(SRC_ROOT)) {
  die(`❌ wp_cycles: source root not found: ${path.relative(ROOT, SRC_ROOT)}`);
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'vendor' || ent.name === 'node_modules' || ent.name === 'dist') continue;
      out.push(...walk(p));
    } else if (ent.isFile()) {
      if (
        p.endsWith('.js') ||
        p.endsWith('.mjs') ||
        p.endsWith('.ts') ||
        p.endsWith('.tsx') ||
        p.endsWith('.mts')
      ) {
        out.push(p);
      }
    }
  }
  return out;
}

// Broad regexes (covers multi-line import/export forms).
const RX_IMPORT_FROM = /\bimport\b[\s\S]*?\bfrom\b\s*['"]([^'"]+)['"]/g;
const RX_IMPORT_SIDE = /\bimport\b\s*['"]([^'"]+)['"]/g;
const RX_EXPORT_FROM = /\bexport\b[\s\S]*?\bfrom\b\s*['"]([^'"]+)['"]/g;

// Collapse tiny JS->TS re-export shims (common during migration):
//   export * from './x.ts';
//   export { default } from './x.ts';
// We only collapse when the file looks like a pure forwarder.
const SHIM_CACHE = new Map();

function stripComments(s) {
  return String(s)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function looksLikeTsForwarder(jsSource) {
  const raw = stripComments(jsSource).trim();
  if (!raw) return false;
  // Keep it conservative: if it contains typical code tokens, it's not a shim.
  const banned = [
    'function',
    'class',
    'const ',
    'let ',
    'var ',
    '=>',
    'return',
    'if',
    'for',
    'while',
    'switch',
    'try',
    'catch',
  ];
  for (const b of banned) {
    if (raw.includes(b)) return false;
  }
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (!lines.length) return false;
  for (const line of lines) {
    if (!line.startsWith('export')) return false;
    if (!line.includes('from')) return false;
    if (!(line.includes('.ts') || line.includes('.tsx') || line.includes('.mts'))) return false;
  }
  return true;
}

function resolveTsForwarderTarget(jsFile) {
  if (SHIM_CACHE.has(jsFile)) return SHIM_CACHE.get(jsFile);

  let targetAbs = null;
  try {
    const src = fs.readFileSync(jsFile, 'utf8');
    if (src.length > 3000 || !looksLikeTsForwarder(src)) {
      SHIM_CACHE.set(jsFile, null);
      return null;
    }

    const m = src.match(/from\s*['"]([^'"]+\.(?:ts|tsx|mts))['"]/);
    if (!m) {
      SHIM_CACHE.set(jsFile, null);
      return null;
    }

    const spec = m[1];
    if (!spec.startsWith('.')) {
      SHIM_CACHE.set(jsFile, null);
      return null;
    }

    const abs = path.normalize(path.resolve(path.dirname(jsFile), spec));
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      targetAbs = abs;
    }
  } catch {
    // swallow
  }

  SHIM_CACHE.set(jsFile, targetAbs);
  return targetAbs;
}

function tryResolve(fromFile, spec) {
  if (!spec || typeof spec !== 'string') return null;
  if (!spec.startsWith('.')) return null; // ignore bare module imports

  const base = path.dirname(fromFile);
  const raw = path.resolve(base, spec);

  const candidates = [];

  // exact
  candidates.push(raw);

  const ext = path.extname(raw);

  // extensionless
  if (!ext) {
    candidates.push(raw + '.js');
    candidates.push(raw + '.mjs');
    candidates.push(raw + '.ts');
    candidates.push(raw + '.tsx');
    candidates.push(raw + '.mts');
  } else {
    // JS<->TS substitution: if a TS source imports `./x.js` but only `x.ts` exists,
    // we still want to record the dependency.
    if (ext === '.js' || ext === '.mjs') {
      candidates.push(raw.slice(0, -ext.length) + '.ts');
      candidates.push(raw.slice(0, -ext.length) + '.tsx');
      candidates.push(raw.slice(0, -ext.length) + '.mts');
    }
    if (ext === '.ts' || ext === '.tsx' || ext === '.mts') {
      candidates.push(raw.slice(0, -ext.length) + '.js');
      candidates.push(raw.slice(0, -ext.length) + '.mjs');
    }
  }

  // directory index
  try {
    if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
      candidates.push(path.join(raw, 'index.js'));
      candidates.push(path.join(raw, 'index.mjs'));
      candidates.push(path.join(raw, 'index.ts'));
      candidates.push(path.join(raw, 'index.tsx'));
      candidates.push(path.join(raw, 'index.mts'));
    }
  } catch {
    // swallow
  }

  for (const c0 of candidates) {
    try {
      if (!fs.existsSync(c0) || !fs.statSync(c0).isFile()) continue;

      // Collapse tiny JS->TS forwarder shims to their TS target.
      // This keeps the cycle graph focused on the real source files.
      const ext0 = path.extname(c0);
      let c = path.normalize(c0);
      if (ext0 === '.js' || ext0 === '.mjs') {
        const target = resolveTsForwarderTarget(c);
        if (target) c = target;
      }

      const rel = path.relative(SRC_ROOT, c);
      if (rel.startsWith('..') || (path.isAbsolute(rel) && rel.includes(':'))) continue;
      return path.normalize(c);
    } catch {
      // swallow
    }
  }

  return null;
}

function collectDeps(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const specs = new Set();

  let m;
  RX_IMPORT_FROM.lastIndex = 0;
  while ((m = RX_IMPORT_FROM.exec(txt))) specs.add(m[1]);
  RX_IMPORT_SIDE.lastIndex = 0;
  while ((m = RX_IMPORT_SIDE.exec(txt))) specs.add(m[1]);
  RX_EXPORT_FROM.lastIndex = 0;
  while ((m = RX_EXPORT_FROM.exec(txt))) specs.add(m[1]);

  const deps = [];
  for (const spec of specs) {
    const resolved = tryResolve(file, spec);
    if (resolved) deps.push(resolved);
  }
  return deps;
}

function tarjansScc(graph) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const low = new Map();
  const sccs = [];

  function strongconnect(v) {
    indices.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.get(v) || []) {
      if (!indices.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), indices.get(w)));
      }
    }

    if (low.get(v) === indices.get(v)) {
      const comp = [];
      while (stack.length) {
        const w = stack.pop();
        onStack.delete(w);
        comp.push(w);
        if (w === v) break;
      }
      sccs.push(comp);
    }
  }

  for (const v of graph.keys()) {
    if (!indices.has(v)) strongconnect(v);
  }

  return sccs;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

const files = walk(SRC_ROOT);
const graph = new Map();
for (const f of files) {
  graph.set(path.normalize(f), new Set());
}

for (const f of files) {
  const v = path.normalize(f);
  for (const d of collectDeps(v)) {
    if (graph.has(d)) graph.get(v).add(d);
  }
}

const sccs = tarjansScc(graph);
const cycles = sccs.filter(c => c.length > 1);

const report = {
  root: rel(SRC_ROOT),
  files: files.length,
  edges: Array.from(graph.values()).reduce((n, s) => n + s.size, 0),
  cycles: cycles.map(comp => comp.map(rel)),
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(report.cycles.length ? 1 : 0);
}

console.log(`[wp_cycles] Root: ${report.root}`);
console.log(`[wp_cycles] Files: ${report.files} | Edges: ${report.edges}`);

if (!report.cycles.length) {
  console.log('[wp_cycles] OK: 0 cycles.');
  process.exit(0);
}

console.error(`
[wp_cycles] FAIL: ${report.cycles.length} cycle group(s) detected:`);
for (const comp of report.cycles) {
  console.error('  - ' + comp.join(' -> '));
}
process.exit(1);
