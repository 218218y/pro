#!/usr/bin/env node
// Guard: prevent scattered probing of App.actions surfaces.
//
// Rationale:
// - Probing patterns like `if (App.actions && typeof App.actions.foo === 'function')` tend to spread,
//   and quickly become an unmaintainable compatibility mess.
// - Optional calls should route through canonical helpers (e.g. runtime/actions_access.ts) or guaranteed surfaces.
//
// This guard is intentionally lightweight (regex-based) and runs before ESLint in the migrate profile.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ALLOW = new Set([
  // Smoke checks explicitly validate surfaces.
  'esm/native/platform/smoke_checks.ts',
  // Action access helper is the *one* allowed probing location.
  'esm/native/runtime/actions_access.ts',
  // Camera service installs compatibility actions.
  'esm/native/services/camera.ts',
  // Project IO must probe ui.commitFromSnapshot for canonical load path guards.
  'esm/native/io/project_io.ts',
]);

const SCAN_DIRS = [path.join(ROOT, 'esm', 'native')];

const EXT_OK = new Set(['.ts', '.tsx']);

function isTextFile(p) {
  const ext = path.extname(p);
  return EXT_OK.has(ext);
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build') continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (!isTextFile(p)) continue;
      out.push(p);
    }
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

const PATTERNS = [
  { code: 'no-actions-probing', re: /\btypeof\s+\(?App\.actions\b/ },
  { code: 'no-actions-probing', re: /\bApp\.actions\s*&&\b/ },
  { code: 'no-actions-probing', re: /\bApp\.actions\?\./ },
];

function scanFile(absPath) {
  const rp = rel(absPath);
  if (ALLOW.has(rp)) return [];
  let txt = '';
  try {
    txt = fs.readFileSync(absPath, 'utf8');
  } catch {
    return [];
  }
  const lines = txt.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('App.actions')) continue;
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        hits.push({ file: rp, line: i + 1, code: p.code, text: line.trim() });
        break;
      }
    }
  }
  return hits;
}

const files = [];
for (const d of SCAN_DIRS) {
  if (fs.existsSync(d)) walk(d, files);
}

const violations = [];
for (const f of files) violations.push(...scanFile(f));

if (!violations.length) process.exit(0);

console.error('[WP Actions Surface Probe Guard] Violations found:\n');
for (const v of violations) {
  console.error(
    `- ${v.file}:${v.line}  [${v.code}]  Avoid probing App.actions surfaces here. Use runtime/actions_access or stable actions surfaces.\n  ${v.text}`
  );
}
console.error('\nFix the violations or update the allowlist only when absolutely necessary.');
process.exit(2);
