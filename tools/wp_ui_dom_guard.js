#!/usr/bin/env node
// Guardrail: UI layer DOM listeners must be explicit + teardown-safe.
//
// Post-migration policy (P3/P4):
// - The legacy runtime `bind/unbind` helpers were removed.
// - UI modules are allowed to use native `.addEventListener(...)`, but MUST provide
//   corresponding teardown via `.removeEventListener(...)`.
// - Prefer idempotent installs via ui/runtime (getUiRuntime + keyed disposers).
//
// This guard scans the non-React UI layer (Pure ESM) and fails if:
// - It finds imports/calls of legacy bind/unbind helpers, OR
// - A file calls `.addEventListener(` but never calls `.removeEventListener(`.
//
// We intentionally exclude the React subtree:
//   esm/native/ui/react
// because React components may legitimately interact with DOM in controlled ways
// (and are governed by React lifecycle / hooks).

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const TARGET_DIRS = ['esm/native/ui'];

const EXCLUDE_DIRS = ['esm/native/ui/react'];

const EXT_OK = new Set(['.ts', '.tsx', '.js', '.mjs']);

// Replace all characters inside comments/strings with spaces (preserve newlines + indices).
function sanitize(src) {
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
        if (ch !== '\n') out[i] = ' ';
        i++;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        if (ch !== '\n') out[i] = ' ';
        i++;
        continue;
      }
      if (ch === str) {
        if (ch !== '\n') out[i] = ' ';
        str = null;
        i++;
        continue;
      }
      if (ch !== '\n') out[i] = ' ';
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
      out[i] = ' ';
      str = ch;
      i++;
      continue;
    }

    i++;
  }

  return out.join('');
}

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

function walk(dirAbs, out) {
  const items = fs.readdirSync(dirAbs);
  for (const name of items) {
    const abs = path.join(dirAbs, name);
    if (isDir(abs)) {
      const r = toRel(abs);
      let skip = false;
      for (const ex of EXCLUDE_DIRS) {
        if (r === ex || r.startsWith(ex + '/')) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
      walk(abs, out);
      continue;
    }
    if (!isFile(abs)) continue;
    const ext = path.extname(abs);
    if (!EXT_OK.has(ext)) continue;
    out.push(abs);
  }
}

function toRel(p) {
  try {
    return path.relative(projectRoot, p).replace(/\\/g, '/');
  } catch {
    return p;
  }
}

function scanFile(absPath) {
  const txt = fs.readFileSync(absPath, 'utf8');
  const src = sanitize(txt);
  const lines = src.split(/\r?\n/);

  const looksLifetimeInstalled = (() => {
    // Heuristic: allow "install-once for page lifetime" listeners if the module
    // guards itself with an installed flag.
    // Examples:
    //   if (x._installed) return; x._installed = true;
    //   if (svc.__bootInstalled) return; svc.__bootInstalled = true;
    const hasFlag = /\b(_installed|__\w+Installed)\b/.test(src);
    const setsTrue = /\b(_installed|__\w+Installed)\s*=\s*true\b/.test(src);
    const hasGuardReturn = /\breturn\b/.test(src);
    return hasFlag && setsTrue && hasGuardReturn;
  })();

  // Disallow legacy bind/unbind helper imports in UI.
  // (Method calls like `foo.bind()` are fine.)
  const legacyImportPatterns = [
    {
      re: /\bimport\s*\{[^}]*\bbind\b[^}]*\}\s*from\s*['"][^'"]*services\/api\.js['"]/,
      label: 'import { bind } from services/api',
    },
    {
      re: /\bimport\s*\{[^}]*\bunbind\b[^}]*\}\s*from\s*['"][^'"]*services\/api\.js['"]/,
      label: 'import { unbind } from services/api',
    },
    {
      re: /\bimport\s*\{[^}]*\bbind\b[^}]*\}\s*from\s*['"][^'"]*runtime\/api\.js['"]/,
      label: 'import { bind } from runtime/api',
    },
    {
      re: /\bimport\s*\{[^}]*\bunbind\b[^}]*\}\s*from\s*['"][^'"]*runtime\/api\.js['"]/,
      label: 'import { unbind } from runtime/api',
    },
  ];

  // DOM listener calls.
  const addRe = /\.addEventListener\s*\(/;
  const rmRe = /\.removeEventListener\s*\(/;

  const hits = [];

  // Quick file-level checks first.
  for (const p of legacyImportPatterns) {
    if (p.re.test(src)) hits.push({ line: 1, label: p.label, text: '(file contains legacy import)' });
  }

  let hasAdd = false;
  let hasRemove = false;
  const addLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (addRe.test(line)) {
      hasAdd = true;
      addLines.push({ line: i + 1, text: line.trim() });
    }
    if (rmRe.test(line)) hasRemove = true;
  }

  if (hasAdd && !hasRemove && !looksLifetimeInstalled) {
    for (const h of addLines) {
      hits.push({ line: h.line, label: 'addEventListener without removeEventListener', text: h.text });
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
    console.log(
      '[WP UI DOM Guard] OK: UI DOM listeners are teardown-safe (and no legacy bind/unbind imports).'
    );
    return;
  }

  console.error('\n[WP UI DOM Guard] FAIL: UI DOM listener contract violated.');
  for (const item of failures) {
    console.error(`\n- ${item.file}`);
    for (const h of item.hits) {
      console.error(`    ${String(h.line).padStart(4, ' ')}: ${h.label}  ${h.text}`);
    }
  }
  process.exit(2);
}

main();
