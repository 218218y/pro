#!/usr/bin/env node
/*
  WardrobePro - wiring guardrail

  Prevents accidental regressions back to "one giant wiring file" by enforcing
  coarse size limits on wiring modules.

  This is intentionally lightweight and does not attempt to be a linter.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function walkExt(dir, exts, excludeDirs = []) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const excl = new Set(excludeDirs.map(d => d.replace(/\\/g, '/')));
  function _walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue;
      const p = path.join(d, ent.name);
      const rp = rel(p);
      // Skip excluded directories
      if (ent.isDirectory()) {
        const rpd = rp.endsWith('/') ? rp.slice(0, -1) : rp;
        let skip = false;
        for (const ex of excl) {
          if (rpd === ex || rpd.startsWith(ex + '/')) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
        _walk(p);
      } else if (ent.isFile()) {
        if (exts.some(e => p.endsWith(e))) out.push(p);
      }
    }
  }
  _walk(dir);
  return out;
}

function containsPattern(file, patterns) {
  const txt = fs.readFileSync(file, 'utf8');
  for (const pat of patterns) {
    if (pat.test(txt)) return pat;
  }
  return null;
}

function main() {
  const failures = [];
  const wiringDir = path.join(ROOT, 'esm', 'native', 'ui', 'wiring');
  const wiringFileTs = path.join(ROOT, 'esm', 'native', 'ui', 'wiring.ts');
  const wiringFileJs = path.join(ROOT, 'esm', 'native', 'ui', 'wiring.js');

  // Clean cutover: legacy ui/wiring directory must be fully removed.
  if (fs.existsSync(wiringDir)) {
    failures.push({
      file: wiringDir,
      lines: 0,
      max: 0,
      label: 'legacy ui/wiring directory must be removed',
    });
  }

  // Also forbid the old top-level wiring entrypoint.
  if (fs.existsSync(wiringFileTs) || fs.existsSync(wiringFileJs)) {
    failures.push({
      file: fs.existsSync(wiringFileTs) ? wiringFileTs : wiringFileJs,
      lines: 0,
      max: 0,
      label: 'legacy ui/wiring entrypoint must be removed (React-only: use ui/react + ui/interactions)',
    });
  }

  // Legacy API usage guard:
  // Once uiBindings is canonical, production code should not call App.uiWiring directly.
  {
    const nativeDir = path.join(ROOT, 'esm', 'native');
    const allow = new Set([]);

    const files = walkExt(nativeDir, ['.ts', '.js']);
    const patterns = [
      /\bApp\.uiWiring\b/g,
      // Disallow any module imports from ui/wiring.* (React-only: use ui/react + ui/interactions).
      /from\s+['"][^'"]*\/ui\/wiring(?:\.|\/)/g,
    ];
    for (const f of files) {
      const rf = rel(f);
      if (allow.has(rf)) continue;
      const hit = containsPattern(
        f,
        patterns.map(re => new RegExp(re.source))
      );
      if (hit) {
        failures.push({
          file: f,
          lines: 0,
          max: 0,
          label: `legacy uiWiring usage is not allowed here (found ${hit.source})`,
        });
      }
    }
  }

  if (failures.length) {
    console.error('\n[WP Wiring Guard] FAIL:');
    for (const f of failures) {
      console.error(`  - ${f.label}: ${rel(f.file)} (${f.lines} lines, max ${f.max})`);
    }
    console.error(
      '\nTip: keep UI code modular under esm/native/ui/react/ and esm/native/ui/interactions/.\n'
    );
    process.exit(1);
  }

  console.log('[WP Wiring Guard] OK.');
}

main();
