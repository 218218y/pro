#!/usr/bin/env node
// Guardrail: UI runtime disposer keys must be explicit and namespaced.
//
// Post-migration policy (P3/P4):
// - UI installers are expected to be idempotent (safe under repeated boot/HMR).
// - We use `getUiRuntime(App).install(key, installer)` to register DOM listener
//   disposers under a stable key.
// - Keys MUST be explicit string literals (not auto-generated) and MUST be
//   namespaced with the `ui:` prefix to avoid collisions.
//
// This guard scans the UI subtree and fails if it finds:
//   uiRt.install('someKey', ...)
// where `someKey` does not start with `ui:`.

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const TARGET_DIRS = ['esm/native/ui'];

const EXCLUDE_DIRS = [
  // Huge generated/third-party-ish blobs: keep guards fast and avoid false positives.
  'esm/native/ui/react/pdf',
];

const EXT_OK = new Set(['.ts', '.tsx', '.js', '.mjs']);

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function toRel(p) {
  try {
    return path.relative(projectRoot, p).replace(/\\/g, '/');
  } catch {
    return p;
  }
}

function isExcluded(rel) {
  for (const ex of EXCLUDE_DIRS) {
    if (rel === ex || rel.startsWith(ex + '/')) return true;
  }
  return false;
}

function walk(dirAbs, out) {
  const items = fs.readdirSync(dirAbs);
  for (const name of items) {
    const abs = path.join(dirAbs, name);
    const rel = toRel(abs);
    if (isExcluded(rel)) continue;

    if (isDir(abs)) {
      walk(abs, out);
      continue;
    }
    if (!isFile(abs)) continue;
    const ext = path.extname(abs);
    if (!EXT_OK.has(ext)) continue;
    out.push(abs);
  }
}

// Strip comments but preserve strings so we can read literal keys.
function stripComments(src) {
  const out = Array.from(src);
  let i = 0;
  let inLine = false;
  let inBlock = false;
  let str = null; // '\'' | '"' | '`'
  let esc = false;

  while (i < out.length) {
    const ch = out[i];
    const next = i + 1 < out.length ? out[i + 1] : '';

    if (inLine) {
      if (ch === '\n') inLine = false;
      else out[i] = ' ';
      i++;
      continue;
    }

    if (inBlock) {
      if (ch === '*' && next === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        inBlock = false;
        i += 2;
        continue;
      }
      if (ch !== '\n') out[i] = ' ';
      i++;
      continue;
    }

    if (str) {
      if (esc) {
        esc = false;
        i++;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        i++;
        continue;
      }
      if (ch === str) {
        str = null;
        i++;
        continue;
      }
      i++;
      continue;
    }

    // start comments
    if (ch === '/' && next === '/') {
      out[i] = ' ';
      out[i + 1] = ' ';
      inLine = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      out[i] = ' ';
      out[i + 1] = ' ';
      inBlock = true;
      i += 2;
      continue;
    }

    // start strings
    if (ch === "'" || ch === '"' || ch === '`') {
      str = ch;
      i++;
      continue;
    }

    i++;
  }

  return out.join('');
}

function lineOf(src, pos) {
  let line = 1;
  for (let i = 0; i < pos && i < src.length; i++) {
    if (src[i] === '\n') line++;
  }
  return line;
}

function scanFile(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  // Fast reject: no UiRuntime usage.
  if (!raw.includes('getUiRuntime') && !raw.includes('.install(')) return [];

  const src = stripComments(raw);

  const re = /\b\.install\s*\(\s*(['"])([^'"\n]+)\1/g;
  const hits = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(src))) {
    const key = String(m[2] || '');
    if (!key.startsWith('ui:')) {
      hits.push({ line: lineOf(src, m.index), key });
    }
  }
  return hits;
}

function main() {
  const allFiles = [];
  for (const relDir of TARGET_DIRS) {
    const absDir = path.join(projectRoot, relDir);
    if (!isDir(absDir)) continue;
    walk(absDir, allFiles);
  }

  const failures = [];
  for (const f of allFiles) {
    const hits = scanFile(f);
    if (!hits.length) continue;
    failures.push({ file: toRel(f), hits });
  }

  if (!failures.length) {
    console.log('[WP UI BindKey Guard] OK: UiRuntime keys are explicit + namespaced (ui:...).');
    return;
  }

  console.error('\n[WP UI BindKey Guard] FAIL: non-namespaced UiRuntime install keys found.');
  console.error("Tip: use uiRt.install('ui:...', () => ...) for idempotent UI installs.");
  for (const item of failures) {
    console.error(`\n- ${item.file}`);
    for (const h of item.hits) {
      console.error(`    ${String(h.line).padStart(4, ' ')}: install(key='${h.key}')`);
    }
  }
  process.exit(2);
}

main();
