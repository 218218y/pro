import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

test('no app.deps.browser access leaks outside runtime/adapters', () => {
  const nativeDir = path.join(ROOT, 'esm', 'native');
  const files = walk(nativeDir).filter(f => /\.(js|ts|tsx)$/.test(f));

  /** @type {Array<{file:string, line:number, snippet:string}>} */
  const violations = [];

  for (const abs of files) {
    const rel = abs
      .split(path.sep)
      .join('/')
      .replace(ROOT.split(path.sep).join('/') + '/', '');

    // Allowed locations
    if (rel.startsWith('esm/native/runtime/')) continue;
    if (rel.startsWith('esm/native/adapters/')) continue;

    const src = fs.readFileSync(abs, 'utf8');
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      // Ignore comments/documentation. We only care about executable source leaking the browser dep surface.
      if (!trimmed || /^\/\//.test(trimmed) || /^\/\*/.test(trimmed) || /^\*/.test(trimmed)) continue;
      // We only care about direct property access patterns, not indirect strings.
      // This is a strict check: if it matches, route the access through adapters or runtime API.
      if (/\bdeps\s*\.\s*browser\b/.test(line)) {
        violations.push({ file: rel, line: i + 1, snippet: line.trim().slice(0, 160) });
        break;
      }
    }
  }

  assert.deepEqual(violations, []);
});
