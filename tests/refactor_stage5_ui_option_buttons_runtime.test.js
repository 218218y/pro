import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function runNodeScript(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

test('React option button primitive is the canonical owner for migrated Structure and Interior choices', () => {
  runNodeScript('tools/wp_ui_option_button_contract.mjs');
});

test('refactor guardrail lane includes UI option button contract', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:ui-option-buttons/);
});
