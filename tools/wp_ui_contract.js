#!/usr/bin/env node
/**
 * tools/wp_ui_contract.js
 *
 * Verifies the UI module contract used by boot_sequence:
 * - Every entry listed in dist/esm/native/ui/ui_manifest.js exists.
 * - Each UI module declares an explicit `installExport` name in the manifest.
 * - Each UI module exports that named installer (directly or via re-export).
 * - Optional `after: [...]` constraints reference known module ids and do not form cycles.
 *
 * After the TS migration, runnable JS lives under ./dist.
 * This contract therefore reads the built manifest.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

function header(title) {
  console.log('\n============================================================');
  console.log(title);
  console.log('============================================================\n');
}

function resolveProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadUiManifest(root) {
  const rel = path.join('dist', 'esm', 'native', 'ui', 'ui_manifest.js');
  const abs = path.join(root, rel);
  if (!fileExists(abs)) {
    console.error(
      `❌ Missing built UI manifest: ${rel}\n` +
        `Hint: run "node tools/wp_build_dist.js --no-assets" (or "npm run build:dist").`
    );
    process.exit(1);
  }

  try {
    return await import(pathToFileURL(abs).href);
  } catch (err) {
    console.error(`❌ Failed to import built UI manifest (${rel}):`, err);
    process.exit(1);
  }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasNamedExportLocal(src, exportName) {
  const name = String(exportName || '').trim();
  if (!name) return false;
  const n = escapeRegExp(name);

  // 1) export function <name>(...) / export async function <name>(...)
  if (new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${n}\\s*\\(`).test(src)) return true;

  // 2) export const <name> = ... / export let <name> = ...
  if (new RegExp(`\\bexport\\s+(?:const|let)\\s+${n}\\s*=`).test(src)) return true;

  // 3) export { <name> } / export { x as <name> } / export { <name> } from '...'
  if (new RegExp(`\\bexport\\s*\\{[^}]*\\b${n}\\b[^}]*\\}`).test(src)) return true;

  return false;
}

function listReExportSpecifiers(src) {
  /** @type {string[]} */
  const specs = [];

  // export * from './x'
  {
    const re = /\\bexport\\s+\\*\\s+from\\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) specs.push(m[1]);
  }

  // export { a, b as c } from './x'
  {
    const re = /\\bexport\\s*\\{[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) specs.push(m[1]);
  }

  return specs;
}

function resolveMaybeWithExt(absPath) {
  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) return absPath;

  // If specifier omitted extension, try common ones.
  const ext = path.extname(absPath);
  if (!ext) {
    for (const e of ['.js', '.mjs', '.cjs']) {
      const cand = absPath + e;
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
  }

  return null;
}

function hasNamedExportInFile(abs, exportName, seen = new Set()) {
  if (!abs || typeof abs !== 'string') return false;
  if (seen.has(abs)) return false;
  seen.add(abs);

  let src = '';
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch (_err) {
    return false;
  }

  if (hasNamedExportLocal(src, exportName)) return true;

  const specs = listReExportSpecifiers(src);
  if (!specs.length) return false;

  const dir = path.dirname(abs);
  for (const spec of specs) {
    if (!spec || typeof spec !== 'string') continue;
    // Only follow relative re-exports; bare specifiers are treated as external.
    if (!spec.startsWith('.')) continue;

    const targetAbs = path.resolve(dir, spec);
    const resolved = resolveMaybeWithExt(targetAbs);
    if (!resolved) continue;

    if (hasNamedExportInFile(resolved, exportName, seen)) return true;
  }

  return false;
}

const root = resolveProjectRoot();
header('node tools/wp_ui_contract.js');

const mod = await loadUiManifest(root);
const allUiModules = mod?.allUiModules;
const resolveUiInstallOrder = mod?.resolveUiInstallOrder;

if (typeof allUiModules !== 'function') {
  console.error('❌ UI manifest missing export: allUiModules()');
  process.exit(2);
}
if (typeof resolveUiInstallOrder !== 'function') {
  console.error('❌ UI manifest missing export: resolveUiInstallOrder(entries)');
  process.exit(2);
}

const entries = allUiModules();
if (!Array.isArray(entries) || entries.length === 0) {
  console.error('❌ UI manifest returned no entries.');
  process.exit(2);
}

/** @type {Map<string, any>} */
const idToEntry = new Map();
/** @type {Map<string, string>} */
const idToFile = new Map();
/** @type {string[]} */
const problems = [];

// Pass 1: basic shape, ids/files, duplicates.
for (const e of entries) {
  const id = e && e.id ? String(e.id) : '';
  const file = e && e.file ? String(e.file) : '';

  if (!id) {
    problems.push('Missing id in UI manifest entry');
    continue;
  }
  if (!file) {
    problems.push(`Missing file for UI module id="${id}"`);
    continue;
  }

  if (idToFile.has(id)) {
    problems.push(`Duplicate id in UI manifest: "${id}" (files: ${idToFile.get(id)} , ${file})`);
    continue;
  }

  idToEntry.set(id, e);
  idToFile.set(id, file);
}

// Pass 2: validate files + exports + dependency constraints.
for (const [id, e] of idToEntry) {
  const file = idToFile.get(id);
  const abs = path.join(root, file);

  if (!fs.existsSync(abs)) {
    problems.push(`Missing UI module file: ${file} (id="${id}")`);
    continue;
  }

  const installExport =
    e && typeof (/** @type {any} */ (e).installExport) === 'string'
      ? String(/** @type {any} */ (e).installExport || '')
      : '';
  if (!installExport) {
    problems.push(`UI manifest entry id="${id}" missing required "installExport" (string)`);
  } else if (!hasNamedExportInFile(abs, installExport)) {
    problems.push(`UI module missing installer export "${installExport}": ${file} (id="${id}")`);
  }

  const afterRaw = e && /** @type {any} */ (e).after;
  if (afterRaw === null || afterRaw === undefined) continue;

  if (!Array.isArray(afterRaw)) {
    problems.push(`UI manifest entry id="${id}" has invalid "after" (expected string[])`);
    continue;
  }

  for (let i = 0; i < afterRaw.length; i++) {
    const dep = String(afterRaw[i] || '');
    if (!dep) continue;
    if (dep === id) {
      problems.push(`UI module id="${id}" cannot depend on itself (after: ["${dep}"])`);
      continue;
    }
    if (!idToEntry.has(dep)) {
      problems.push(`UI module id="${id}" depends on unknown id="${dep}" (after)`);
    }
  }
}

// Cycle check (only if there are no prior problems that would make it noisy).
if (!problems.length) {
  try {
    resolveUiInstallOrder(entries);
  } catch (_err) {
    problems.push('UI manifest contains cyclic "after" dependencies.');
  }
}

if (problems.length) {
  console.error(`❌ UI contract check failed (${problems.length} issue(s)):`);
  for (const pr of problems) console.error(' - ' + pr);
  process.exit(1);
}

console.log(`✅ UI contract OK (${entries.length} module(s))`);
