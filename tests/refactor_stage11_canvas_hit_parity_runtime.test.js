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

test('canvas click hit identity parity contract is enforced', () => {
  runNodeScript('tools/wp_canvas_hit_parity_contract.mjs');
});

test('refactor guardrail lane includes canvas hit parity contract', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:canvas-hit-parity/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage11_canvas_hit_parity_runtime\.test\.js/
  );
});
