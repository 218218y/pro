import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('P3: UI modules must not import or call runtime events bind/unbind helpers', () => {
  const repoRoot = process.cwd();
  const uiRoot = path.join(repoRoot, 'esm', 'native', 'ui');

  const files = walk(uiRoot).filter(p => /\.(ts|tsx|js|mjs)$/.test(p));

  // Allow platform/runtime layers to use bind/unbind; this guard is UI-only.
  for (const p of files) {
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');

    const src = fs.readFileSync(p, 'utf8');

    // Named imports of bind/unbind are no longer allowed in UI layer.
    assert.ok(
      !/\bimport\s*\{[^}]*\bbind\b[^}]*\}\s*from\s*['"][^'"]*services\/api\.js['"]/.test(src),
      `Unexpected bind import in ${rel}`
    );
    assert.ok(
      !/\bimport\s*\{[^}]*\bunbind\b[^}]*\}\s*from\s*['"][^'"]*services\/api\.js['"]/.test(src),
      `Unexpected unbind import in ${rel}`
    );
    assert.ok(
      !/\bimport\s*\{[^}]*\bbind\b[^}]*\}\s*from\s*['"][^'"]*runtime\/api\.js['"]/.test(src),
      `Unexpected bind import in ${rel}`
    );
    assert.ok(
      !/\bimport\s*\{[^}]*\bunbind\b[^}]*\}\s*from\s*['"][^'"]*runtime\/api\.js['"]/.test(src),
      `Unexpected unbind import in ${rel}`
    );

    // Direct calls to bind()/unbind() should not appear (method calls like foo.bind() are fine).
    assert.ok(!/(^|[^.])\bbind\(/m.test(src), `Unexpected bind(...) call in ${rel}`);
    assert.ok(!/(^|[^.])\bunbind\(/m.test(src), `Unexpected unbind(...) call in ${rel}`);
  }
});
