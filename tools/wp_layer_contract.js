#!/usr/bin/env node
/**
 * tools/wp_layer_contract.js
 *
 * Layer dependency contract for the pure-ESM codebase.
 *
 * Why:
 *   As the project grows, it's easy to accidentally add "back edges"
 *   (e.g. kernel -> ui) that increase coupling and make future refactors painful.
 *   This tool records the *current* cross-layer dependency edges as a baseline,
 *   and fails if new cross-layer edges are introduced without an explicit update.
 *
 * Layers:
 *   esm/native/<layer>/...  => <layer>
 *   esm/boot/...            => boot
 *
 * Usage:
 *   node tools/wp_layer_contract.js
 *   node tools/wp_layer_contract.js --json
 *   node tools/wp_layer_contract.js --update   # regenerate baseline
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const UPDATE = args.includes('--update') || args.includes('--write');

const BASELINE_PATH = path.join(ROOT, 'tools', 'wp_layer_baseline.json');

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function die(msg, code = 1) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
  } else {
    console.error(msg);
  }
  process.exit(code);
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
      if (p.endsWith('.js') || p.endsWith('.mjs') || p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
    }
  }
  return out;
}

// Broad regexes (covers multi-line import/export forms).
const RX_IMPORT_FROM = /\bimport\b[\s\S]*?\bfrom\b\s*['"]([^'"]+)['"]/g;
const RX_IMPORT_SIDE = /\bimport\b\s*['"]([^'"]+)['"]/g;
const RX_EXPORT_FROM = /\bexport\b[\s\S]*?\bfrom\b\s*['"]([^'"]+)['"]/g;
const RX_IMPORT_DYNAMIC = /\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g;

function stripQueryHash(spec) {
  // Keep resolution stable for specifiers like "./file.js?url" or "./file.js#hash"
  const q = spec.indexOf('?');
  const h = spec.indexOf('#');
  const cut = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  return cut === -1 ? spec : spec.slice(0, cut);
}

function tryResolve(fromFile, spec) {
  if (!spec || typeof spec !== 'string') return null;
  if (!spec.startsWith('.')) return null; // ignore bare module imports

  const base = path.dirname(fromFile);
  const clean = stripQueryHash(spec);
  const raw = path.resolve(base, clean);

  const candidates = [];
  candidates.push(raw);

  const ext = path.extname(raw);
  if (!ext) {
    candidates.push(raw + '.ts');
    candidates.push(raw + '.tsx');
    candidates.push(raw + '.js');
    candidates.push(raw + '.mjs');
  } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const noext = raw.slice(0, -ext.length);
    candidates.push(noext + '.ts');
    candidates.push(noext + '.tsx');
  }

  try {
    if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
      candidates.push(path.join(raw, 'index.ts'));
      candidates.push(path.join(raw, 'index.tsx'));
      candidates.push(path.join(raw, 'index.js'));
      candidates.push(path.join(raw, 'index.mjs'));
    }
  } catch (_err) {}

  for (const c of candidates) {
    try {
      if (!fs.existsSync(c) || !fs.statSync(c).isFile()) continue;
      return path.normalize(c);
    } catch (_err) {}
  }
  return null;
}

function collectSpecs(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const specs = new Set();
  let m;
  RX_IMPORT_FROM.lastIndex = 0;
  while ((m = RX_IMPORT_FROM.exec(txt))) specs.add(m[1]);
  RX_IMPORT_SIDE.lastIndex = 0;
  while ((m = RX_IMPORT_SIDE.exec(txt))) specs.add(m[1]);
  RX_EXPORT_FROM.lastIndex = 0;
  while ((m = RX_EXPORT_FROM.exec(txt))) specs.add(m[1]);
  RX_IMPORT_DYNAMIC.lastIndex = 0;
  while ((m = RX_IMPORT_DYNAMIC.exec(txt))) specs.add(m[1]);
  return Array.from(specs);
}

function layerOf(absFile) {
  const r = rel(absFile);
  const parts = r.split('/');
  // esm/boot/...
  if (parts[0] === 'esm' && parts[1] === 'boot') return 'boot';
  // esm/native/<layer>/...
  if (parts[0] === 'esm' && parts[1] === 'native' && parts[2]) return parts[2];
  return 'other';
}

function sortEdges(edges) {
  return edges.slice().sort((a, b) => (a[0] + '>' + a[1]).localeCompare(b[0] + '>' + b[1]));
}

function uniqEdges(edges) {
  const s = new Set();
  const out = [];
  for (const e of edges) {
    const k = e[0] + '>' + e[1];
    if (s.has(k)) continue;
    s.add(k);
    out.push(e);
  }
  return out;
}

const ESM_DIR = path.join(ROOT, 'esm');
if (!fs.existsSync(ESM_DIR)) die('❌ wp_layer_contract: missing ./esm directory', 2);

const files = walk(ESM_DIR);

/** @type {Array<[string, string]>} */
const edges = [];

for (const f of files) {
  const fromLayer = layerOf(f);
  if (fromLayer === 'other') continue;

  const specs = collectSpecs(f);
  for (const spec of specs) {
    const resolved = tryResolve(f, spec);
    if (!resolved) continue;

    // Only consider edges within ./esm
    const r = rel(resolved);
    if (!r.startsWith('esm/')) continue;

    const toLayer = layerOf(resolved);
    if (toLayer === 'other') continue;
    if (toLayer === fromLayer) continue;
    edges.push([fromLayer, toLayer]);
  }
}

const currentEdges = sortEdges(uniqEdges(edges));

/** @type {any} */
let baseline = null;
if (fs.existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (_err) {
    die(`❌ wp_layer_contract: failed to parse baseline: ${rel(BASELINE_PATH)}`, 2);
  }
}

if (UPDATE || !baseline) {
  const out = {
    version: 1,
    generated_at: new Date().toISOString(),
    root: 'esm',
    allowed_edges: currentEdges,
  };
  try {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  } catch (_err) {
    die(`❌ wp_layer_contract: failed to write baseline: ${rel(BASELINE_PATH)}`, 2);
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ ok: true, updated: true, edges: currentEdges }, null, 2) + '\n');
  } else {
    console.log(`[wp_layer_contract] Baseline ${baseline ? 'updated' : 'created'}: ${rel(BASELINE_PATH)}`);
    console.log(`[wp_layer_contract] Recorded ${currentEdges.length} cross-layer edge(s).`);
  }
  process.exit(0);
}

const allowed = Array.isArray(baseline.allowed_edges) ? baseline.allowed_edges : [];
const allowedSet = new Set(allowed.map(e => String(e[0]) + '>' + String(e[1])));
const newEdges = currentEdges.filter(e => !allowedSet.has(e[0] + '>' + e[1]));

if (newEdges.length) {
  const msg = {
    ok: false,
    message: 'New cross-layer dependency edges detected. Update baseline to accept them.',
    baseline: rel(BASELINE_PATH),
    new_edges: newEdges,
    hint: 'Run: node tools/wp_layer_contract.js --update',
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(msg, null, 2) + '\n');
  } else {
    console.error('❌ Layer contract failed: new cross-layer edge(s) detected:');
    for (const e of newEdges) console.error(` - ${e[0]} -> ${e[1]}`);
    console.error(`\nTo accept intentionally, run: node tools/wp_layer_contract.js --update`);
  }
  process.exit(1);
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ ok: true, edges: currentEdges }, null, 2) + '\n');
} else {
  console.log(`✅ Layer contract OK (${currentEdges.length} cross-layer edge(s))`);
}
