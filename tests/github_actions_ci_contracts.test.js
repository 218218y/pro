import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ALLOWED_PROFILES } = require('../tools/wp_run_closeout_profile.cjs');

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('GitHub CI keeps required verification split by concern', () => {
  const ci = read('.github/workflows/ci.yml');

  assert.match(ci, /^  strict-gate:/m);
  assert.match(ci, /^  lint:/m);
  assert.match(ci, /^  typecheck:/m);
  assert.match(ci, /^  contracts:/m);
  assert.match(ci, /^  runtime-tests:/m);
  assert.match(ci, /^  test-runner-node-compat:/m);
  assert.match(ci, /^  build-smoke:/m);
  assert.match(ci, /^  audit:/m);
  assert.match(ci, /^  required-checks:/m);

  assert.match(ci, /run: npm run check:gate/);
  assert.match(ci, /run: npm run format:base:check -- "\$\{\{ github\.event\.pull_request\.base\.sha \}\}"/);
  assert.match(ci, /run: npm run format:check/);
  assert.match(ci, /run: npm run check:refactor-guardrails/);
  assert.match(ci, /run: npm run lint/);
  assert.match(ci, /name: TypeScript \(\$\{\{ matrix\.shard \}\}\)/);
  assert.match(ci, /shard: boot-data/);
  assert.match(ci, /shard: kernel-platform/);
  assert.match(ci, /shard: runtime-browser/);
  assert.match(ci, /shard: product-ui/);
  assert.match(ci, /run: node tools\/wp_typecheck_parallel\.mjs --workers 2 --modes/);
  assert.match(ci, /name: typecheck-diagnostics-\$\{\{ matrix\.shard \}\}/);
  assert.match(ci, /run: npm run contract:layers/);
  assert.match(ci, /run: npm run contract:api/);
  assert.match(ci, /strategy:\n      fail-fast: false\n      matrix:\n        shard: \[1, 2\]/);
  assert.match(ci, /run: npm run test -- --shard=\$\{\{ matrix\.shard \}\}\/2/);
  assert.match(ci, /name: runtime-test-diagnostics-shard-\$\{\{ matrix\.shard \}\}-of-2/);
  assert.match(ci, /node: \['22\.12\.0', '24'\]/);
  assert.match(
    ci,
    /run: node --test tests\/wp_test_runner_command_runtime\.test\.js tests\/wp_serial_tests_runtime\.test\.js/
  );
  assert.match(ci, /node --check tools\/wp_test_runner_command\.mjs/);
  assert.match(ci, /run: npm run esm:check/);

  assert.match(
    ci,
    /needs:\n      - strict-gate\n      - lint\n      - typecheck\n      - contracts\n      - runtime-tests\n      - test-runner-node-compat\n      - build-smoke\n      - audit/
  );
  assert.match(ci, /STRICT_GATE_RESULT: \$\{\{ needs\['strict-gate'\]\.result \}\}/);
  assert.match(ci, /RUNTIME_TESTS_RESULT: \$\{\{ needs\['runtime-tests'\]\.result \}\}/);
  assert.match(ci, /TEST_RUNNER_NODE_COMPAT_RESULT: \$\{\{ needs\['test-runner-node-compat'\]\.result \}\}/);
  assert.match(ci, /BUILD_SMOKE_RESULT: \$\{\{ needs\['build-smoke'\]\.result \}\}/);
  assert.doesNotMatch(ci, /\$\{\{ needs\.[a-z0-9-]+\.result \}\}/);
});

test('GitHub CI keeps the monolithic verify flow as a manual release gate only', () => {
  const ci = read('.github/workflows/ci.yml');
  const pkg = JSON.parse(read('package.json'));

  assert.match(ci, /^  release-gate:/m);
  assert.match(ci, /if: github\.event_name == 'workflow_dispatch' && inputs\.run_release_gate/);
  assert.equal(pkg.scripts['gate:full'], 'npm run verify:gate');

  const monolithicRuns = ci
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^run: npm run (verify|verify:gate|gate:full)\b/.test(line));

  assert.deepEqual(monolithicRuns, ['run: npm run gate:full']);
});

test('manual lint workflow uses the same strict lint standard as CI', () => {
  const manualLint = read('.github/workflows/manual-lint.yml');

  assert.match(manualLint, /name: Manual Strict Lint/);
  assert.match(manualLint, /run: npm run lint/);
  assert.doesNotMatch(manualLint, /run: npm run lint:strict/);
});

test('manual closeout workflow exposes only runner-approved profiles', () => {
  const manualCloseout = read('.github/workflows/manual-closeout.yml');
  const optionMatches = Array.from(manualCloseout.matchAll(/^          - (.+)$/gm), match => match[1]);

  assert.match(manualCloseout, /type: choice/);
  assert.match(manualCloseout, /run: node tools\/wp_run_closeout_profile\.cjs "\$\{\{ inputs\.profile \}\}"/);
  assert.deepEqual(optionMatches, ALLOWED_PROFILES);
});
