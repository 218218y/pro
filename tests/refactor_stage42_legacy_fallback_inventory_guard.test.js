import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

test('stage 42 legacy fallback inventory closeout is anchored', () => {
  const allowlist = readJson('tools/wp_legacy_fallback_allowlist.json');
  const audit = readJson('docs/legacy_fallback_audit.json');
  const markdown = readFileSync('docs/LEGACY_FALLBACK_AUDIT.md', 'utf8');

  assert.equal(allowlist.version, 1);
  assert.equal(allowlist.sourceRoot, 'esm');
  assert.ok(allowlist.entries['esm/native/runtime/ui_raw_selectors.ts']);
  assert.ok(allowlist.entries['esm/native/services/render_surface_runtime.ts']);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors.ts'].total, 21);
  assert.equal(audit.summary.byFile['esm/native/services/render_surface_runtime.ts'].total, 7);
  assert.match(markdown, /Legacy \/ fallback audit/);

  const result = spawnSync(process.execPath, ['tools/wp_legacy_fallback_audit.mjs', '--check', '--no-print'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `legacy fallback audit failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
});
