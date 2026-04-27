import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  parseCheckArgs,
  detectMode,
  resolvePolicyNeedles,
  createCheckJsonReport,
} from '../tools/wp_check_state.js';
import { collectPolicyStats, assertGate, assertStrict } from '../tools/wp_check_policy.js';
import { runSyntaxChecks } from '../tools/wp_check_syntax.js';
import { countByExtension, walkSourceFiles } from '../tools/wp_check_shared.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-check-'));
}

test('check arg parsing preserves baseline/json/gate/strict flags', () => {
  assert.deepEqual(
    parseCheckArgs(['--strict', '--gate', '--json', '--write-baseline', '--baseline', 'tmp/base.json'], {
      defaultBaselinePath: 'tools/default.json',
    }),
    {
      strict: true,
      gate: true,
      jsonOut: true,
      writeBaseline: true,
      baselinePath: 'tmp/base.json',
    }
  );
});

test('check mode detection prefers js first and falls back to esm', () => {
  const root = tempDir();
  const jsRoot = path.join(root, 'js');
  const esmRoot = path.join(root, 'esm');
  fs.mkdirSync(esmRoot, { recursive: true });
  assert.deepEqual(detectMode({ jsRoot, esmRoot }), { mode: 'esm', srcRoot: esmRoot });
  fs.mkdirSync(jsRoot, { recursive: true });
  assert.deepEqual(detectMode({ jsRoot, esmRoot }), { mode: 'js', srcRoot: jsRoot });
});

test('check syntax runner reports malformed js files', () => {
  const root = tempDir();
  const bad = path.join(root, 'bad.js');
  fs.writeFileSync(bad, 'function () {\n', 'utf8');
  const result = runSyntaxChecks([bad], { root });
  assert.equal(result.syntaxErrors, 1);
  assert.equal(result.errors.length, 1);
  assert.match(
    result.errors[0].msg,
    /SyntaxError|Unexpected token|Function statements require a function name/
  );
});

test('check policy stats count legacy/root needles by directory', () => {
  const root = tempDir();
  const srcRoot = path.join(root, 'esm');
  fs.mkdirSync(path.join(srcRoot, 'services'), { recursive: true });
  fs.mkdirSync(path.join(srcRoot, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(srcRoot, 'services', 'a.js'), 'window.App\nwindow.THREE\n', 'utf8');
  fs.writeFileSync(path.join(srcRoot, 'ui', 'b.ts'), 'globalThis.App\nlegacyAppGlobal\n', 'utf8');

  const files = walkSourceFiles(srcRoot);
  const stats = collectPolicyStats('esm', srcRoot, files);

  assert.deepEqual(countByExtension(files), { '.js': 1, '.ts': 1 });
  assert.equal(stats.totals['window.App'], 1);
  assert.equal(stats.totals['window.THREE'], 1);
  assert.equal(stats.totals['globalThis.App'], 1);
  assert.equal(stats.totals['legacyAppGlobal'], 1);
  assert.equal(stats.byDir.services['window.App'], 1);
  assert.equal(stats.byDir.ui['globalThis.App'], 1);
});

test('check gate/strict results report regressions and clean strict state', () => {
  const gate = assertGate({ totals: { 'window.App': 1 } }, { 'window.App': 2 });
  assert.equal(gate.ok, false);
  assert.deepEqual(gate.failures, [['window.App', 2, 1]]);

  const strictFail = assertStrict('esm', { 'window.App': 1, 'globalThis.App': 0 });
  assert.equal(strictFail.ok, false);
  assert.deepEqual(strictFail.failures, [['window.App', 1]]);

  const strictOk = assertStrict('esm', { 'window.App': 0, 'globalThis.App': 0 });
  assert.equal(strictOk.ok, true);
  assert.deepEqual(strictOk.failures, []);
});

test('check json report preserves file and policy summary fields', () => {
  const report = createCheckJsonReport({
    mode: 'esm',
    files: 10,
    fileTypes: { '.js': 4 },
    syntaxTsSkipped: 2,
    totals: { 'window.App': 0 },
    byDir: { services: { 'window.App': 0 } },
    strict: true,
    gate: false,
  });

  assert.equal(report.mode, 'esm');
  assert.equal(report.files, 10);
  assert.equal(report.fileTypes['.js'], 4);
  assert.equal(report.syntaxTsSkipped, 2);
  assert.equal(report.strict, true);
  assert.equal(report.gate, false);
  assert.equal(resolvePolicyNeedles('esm').includes('window.App'), true);
});
