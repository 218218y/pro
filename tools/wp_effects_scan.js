#!/usr/bin/env node
// Audit tool: find potential "sticky" effects in non-React modules.
//
// Scans for:
// - direct DOM listener calls (.addEventListener / .removeEventListener)
// - setInterval / setTimeout usage
//
// Goal:
// - Keep UI non-React bindings explicit and idempotent (addEventListener/removeEventListener + disposers)
// - Keep services/platform code free of accidental multi-install leaks
//
// This is an audit/diagnostic tool (non-gating by default).

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

// "Non-React" runtime code we care about.
const TARGET_DIRS = ['esm/native/services', 'esm/native/platform', 'esm/native/ui/interactions'];

// Exclusions:
// - React subtree
// - env wrappers (they *intentionally* reference addEventListener)
const EXCLUDE_DIRS = ['esm/native/ui/react'];
const EXCLUDE_FILES = new Set(['esm/native/adapters/browser/env.ts']);

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

function walk(dirAbs, out) {
  const items = fs.readdirSync(dirAbs);
  for (const name of items) {
    const abs = path.join(dirAbs, name);
    const rel = toRel(abs);

    // directory excludes
    if (isDir(abs)) {
      let skip = false;
      for (const ex of EXCLUDE_DIRS) {
        if (rel === ex || rel.startsWith(ex + '/')) {
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

    // file excludes
    if (EXCLUDE_FILES.has(rel)) continue;

    out.push(abs);
  }
}

function scanFile(absPath) {
  const txt = fs.readFileSync(absPath, 'utf8');
  const lines = txt.split(/\r?\n/);

  // Match call syntax to avoid false positives like:
  //   typeof el.addEventListener === 'function'
  const patterns = [
    { re: /\.addEventListener\s*\(/, kind: 'dom', label: '.addEventListener(' },
    { re: /\.removeEventListener\s*\(/, kind: 'dom', label: '.removeEventListener(' },
    { re: /\bsetInterval\s*\(/, kind: 'timer', label: 'setInterval(' },
    { re: /\bsetTimeout\s*\(/, kind: 'timer', label: 'setTimeout(' },
  ];

  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of patterns) {
      if (p.re.test(line)) {
        hits.push({ line: i + 1, kind: p.kind, label: p.label, text: line.trim() });
      }
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

  const domHits = [];
  const timerHits = [];

  for (const f of allFiles) {
    const hits = scanFile(f);
    if (!hits.length) continue;

    for (const h of hits) {
      const item = { file: toRel(f), ...h };
      if (h.kind === 'dom') domHits.push(item);
      else timerHits.push(item);
    }
  }

  // Summary
  console.log('[WP Effects Scan] Targets:', TARGET_DIRS.join(', '));
  console.log('[WP Effects Scan] Exclude dirs:', EXCLUDE_DIRS.join(', '));
  console.log('[WP Effects Scan] Exclude files:', Array.from(EXCLUDE_FILES).join(', '));
  console.log('');

  if (!domHits.length)
    console.log('[WP Effects Scan] ✅ No direct DOM listener calls found in non-React runtime modules.');
  else {
    console.log(
      '[WP Effects Scan] ⚠️ Direct DOM listener calls found (review for disposer / runtime.bind use):'
    );
    for (const h of domHits) {
      console.log(`- ${h.file}:${h.line}  ${h.label}  ${h.text}`);
    }
  }

  console.log('');
  if (!timerHits.length) console.log('[WP Effects Scan] ✅ No timers found in scanned dirs.');
  else {
    const si = timerHits.filter(h => h.label.startsWith('setInterval')).length;
    const st = timerHits.filter(h => h.label.startsWith('setTimeout')).length;
    console.log(`[WP Effects Scan] ℹ️ Timers found: setInterval=${si}, setTimeout=${st}`);

    // Print setInterval hits (most likely to leak) + a small sample of setTimeout.
    const intervals = timerHits.filter(h => h.label.startsWith('setInterval'));
    if (intervals.length) {
      console.log('\n[WP Effects Scan] setInterval occurrences (ensure disposer clears them):');
      for (const h of intervals) {
        console.log(`- ${h.file}:${h.line}  ${h.text}`);
      }
    }

    const timeouts = timerHits.filter(h => h.label.startsWith('setTimeout'));
    if (timeouts.length) {
      console.log('\n[WP Effects Scan] setTimeout sample (debounce/next-tick is usually OK):');
      for (const h of timeouts.slice(0, 20)) {
        console.log(`- ${h.file}:${h.line}  ${h.text}`);
      }
      if (timeouts.length > 20) console.log(`... and ${timeouts.length - 20} more setTimeout() lines.`);
    }
  }

  // Non-gating: always exit 0.
  // If you want gating in CI, you can change this to fail on domHits or on setInterval outside allowlist.
}

main();
