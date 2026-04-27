#!/usr/bin/env node
/**
 * tools/wp_public_api_contract.js
 *
 * Public API surface contract for the pure-ESM codebase.
 *
 * Why:
 *   After we split the project into layers (kernel/platform/services/ui/builder/etc.),
 *   we want cross-layer imports to go through a small, intentional "surface" module
 *   (api.js / install.js). This keeps the architecture stable and makes it easy to
 *   refactor internals without breaking unrelated code.
 *
 * Enforced rule:
 *   If a file imports another *layer* (esm/native/<layer>/...) and the target layer
 *   differs from the source layer, then the import must point to an allowed entry
 *   file for that layer (e.g. ../kernel/api.js, ../services/install.js).
 *
 * Usage:
 *   node tools/wp_public_api_contract.js
 *   node tools/wp_public_api_contract.js --json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function die(msg, code = 1, payload) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ ok: false, error: msg, ...(payload || {}) }, null, 2) + '\n');
  } else {
    console.error(msg);
    if (payload && payload.hint) console.error(payload.hint);
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
      if (
        p.endsWith('.js') ||
        p.endsWith('.mjs') ||
        p.endsWith('.ts') ||
        p.endsWith('.tsx') ||
        p.endsWith('.mts')
      )
        out.push(p);
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
  const q = spec.indexOf('?');
  const h = spec.indexOf('#');
  const cut = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  return cut === -1 ? spec : spec.slice(0, cut);
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
    candidates.push(raw + '.mts');
    candidates.push(raw + '.js');
    candidates.push(raw + '.mjs');
  } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const noext = raw.slice(0, -ext.length);
    candidates.push(noext + '.ts');
    candidates.push(noext + '.tsx');
    candidates.push(noext + '.mts');
  }

  try {
    if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
      candidates.push(path.join(raw, 'index.ts'));
      candidates.push(path.join(raw, 'index.tsx'));
      candidates.push(path.join(raw, 'index.mts'));
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

function layerKeyOf(absFile) {
  const r = rel(absFile);
  const parts = r.split('/');
  // esm/boot/...
  if (parts[0] === 'esm' && parts[1] === 'boot') return 'boot';
  // esm/native/<layer>/...
  if (parts[0] === 'esm' && parts[1] === 'native' && parts[2]) {
    if (parts[2] === 'adapters' && parts[3] === 'browser') return 'adapters/browser';
    return parts[2];
  }
  return 'other';
}

// Allowed entry files per layer (resolved file names).
// Note: runtime is treated as a foundational layer and is exempt (internal runtime modules are allowed).
const ALLOWED = {
  kernel: ['api.js', 'api.ts', 'install.js', 'install.ts'],
  platform: ['install.js', 'install.ts'],
  services: ['api.js', 'api.ts', 'install.js', 'install.ts'],
  ui: ['install.js', 'install.ts'],
  builder: ['install.js', 'install.ts'],
  data: ['install.js', 'install.ts'],
  core: ['api.js', 'api.ts', 'install.js', 'install.ts'],
  engine: ['api.js', 'api.ts', 'install.js', 'install.ts'],
  'adapters/browser': ['install.js', 'install.ts'],
};

const EXPECTED = {
  kernel: ['../native/kernel/api.js', '../native/kernel/install.js'],
  platform: ['../native/platform/install.js'],
  services: ['../native/services/api.js', '../native/services/install.js'],
  ui: ['../native/ui/install.js'],
  builder: ['../native/builder/install.js'],
  data: ['../native/data/install.js'],
  core: ['../native/core/api.js', '../native/core/install.js'],
  engine: ['../native/engine/api.js', '../native/engine/install.js'],
  'adapters/browser': ['../native/adapters/browser/install.js'],
};

function isFacadeSurfaceFile(absFile) {
  const r = rel(absFile);
  return (
    r === 'esm/native/core/api.ts' ||
    r === 'esm/native/core/api.js' ||
    r === 'esm/native/core/install.ts' ||
    r === 'esm/native/core/install.js' ||
    r === 'esm/native/engine/api.ts' ||
    r === 'esm/native/engine/api.js' ||
    r === 'esm/native/engine/install.ts' ||
    r === 'esm/native/engine/install.js'
  );
}

function isAllowedEntry(targetAbs, toKey) {
  // Runtime is a foundational layer; we allow internal imports across layers.
  if (toKey === 'runtime') return true;

  if (!Object.prototype.hasOwnProperty.call(ALLOWED, toKey)) return true; // unknown layer => ignore
  const r = rel(targetAbs);

  // Compute the subpath within the layer root.
  let layerRootRel = null;
  if (toKey === 'adapters/browser') layerRootRel = 'esm/native/adapters/browser';
  else layerRootRel = 'esm/native/' + toKey;

  if (!r.startsWith(layerRootRel + '/')) return false;
  const sub = r.slice(layerRootRel.length + 1);
  return ALLOWED[toKey].includes(sub);
}

const ESM_DIR = path.join(ROOT, 'esm');
if (!fs.existsSync(ESM_DIR)) die('❌ wp_public_api_contract: missing ./esm directory', 2);

const files = walk(ESM_DIR);

/** @type {Array<{from:string,to:string,spec:string,expected:string[]}>} */
const violations = [];

for (const f of files) {
  const fromKey = layerKeyOf(f);
  if (fromKey === 'other') continue;

  const specs = collectSpecs(f);
  for (const spec of specs) {
    const resolved = tryResolve(f, spec);
    if (!resolved) continue;
    const r = rel(resolved);
    if (!r.startsWith('esm/')) continue;

    const toKey = layerKeyOf(resolved);
    if (toKey === 'other') continue;
    if (toKey === fromKey) continue; // same layer: internal imports allowed

    if (isFacadeSurfaceFile(f)) continue;

    // UI runtime policy:
    // UI must not import from `runtime/*` directly. UI should only consume runtime helpers
    // through the single `services/api` entry point.
    if (fromKey === 'ui' && toKey === 'runtime') {
      violations.push({
        from: rel(f),
        to: rel(resolved),
        spec,
        expected: ['../native/services/api.js'],
      });
      continue;
    }

    // Only enforce for known layers (plus runtime exemption handled in isAllowedEntry()).
    const enforce = toKey === 'runtime' || Object.prototype.hasOwnProperty.call(ALLOWED, toKey);

    if (!enforce) continue;

    if (!isAllowedEntry(resolved, toKey)) {
      violations.push({
        from: rel(f),
        to: rel(resolved),
        spec,
        expected: EXPECTED[toKey] || [],
      });
    }
  }
}

if (violations.length) {
  const msg = {
    ok: false,
    message:
      'Public API contract failed: cross-layer imports must use layer entry points (api.js/install.js).',
    violations,
  };
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(msg, null, 2) + '\n');
  } else {
    console.error('❌ Public API contract failed. Violations:');
    for (const v of violations.slice(0, 30)) {
      console.error(` - ${v.from} -> ${v.spec}`);
      console.error(`   resolved: ${v.to}`);
      console.error(`   expected: ${v.expected.join(', ')}`);
    }
    if (violations.length > 30) {
      console.error(`   ... and ${violations.length - 30} more.`);
    }
  }
  process.exit(1);
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ ok: true }, null, 2) + '\n');
} else {
  console.log('✅ Public API contract: OK');
}
