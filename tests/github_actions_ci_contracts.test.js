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
  const runtimeTestsSection = ci.match(/^  runtime-tests:[\s\S]*?(?=^  test-runner-node-contract:)/m)?.[0];
  assert.ok(runtimeTestsSection, 'runtime-tests job is missing');

  assert.doesNotMatch(ci, /^\s*node-version:\s*/m);
  const setupNodeCount = (ci.match(/uses:\s*actions\/setup-node@/g) ?? []).length;
  const approvedVersionFileCount = (
    ci.match(/node-version-file:\s*['"]\.node-version(?:-compat)?['"]/g) ?? []
  ).length;
  assert.equal(setupNodeCount, approvedVersionFileCount);

  assert.match(ci, /^  strict-gate:/m);
  assert.match(ci, /^  lint:/m);
  assert.match(ci, /^  typecheck:/m);
  assert.match(ci, /^  contracts:/m);
  assert.match(ci, /^  runtime-tests:/m);
  assert.match(ci, /^  test-runner-node-contract:/m);
  assert.match(ci, /^  node22-compat-contract:/m);
  assert.match(ci, /^  build-smoke:/m);
  assert.match(ci, /^  audit:/m);
  assert.match(ci, /^  required-checks:/m);

  assert.match(ci, /run: npm run check:gate/);
  assert.match(ci, /run: npm run format:base:check -- "\$\{\{ github\.event\.pull_request\.base\.sha \}\}"/);
  assert.match(ci, /run: npm run format:check/);
  assert.match(ci, /run: npm run check:refactor-guardrails/);
  assert.match(ci, /run: npm run lint/);
  assert.match(ci, /name: TypeScript/);
  assert.doesNotMatch(ci, /shard: boot-data|shard: kernel-platform|shard: runtime-browser|shard: product-ui/);
  assert.match(ci, /name: Run canonical TypeScript checks\n        run: npm run typecheck:all/);
  assert.match(ci, /name: typecheck-diagnostics/);
  assert.match(ci, /run: npm run contract:layers/);
  assert.match(ci, /run: npm run contract:api/);
  assert.match(runtimeTestsSection, /name: Runtime tests \(\$\{\{ matrix\.shard \}\}\/3\)/);
  assert.match(runtimeTestsSection, /matrix:\n        shard: \[1, 2, 3\]/);
  assert.match(runtimeTestsSection, /run: npm run test -- --shard=\$\{\{ matrix\.shard \}\}\/3/);
  assert.match(runtimeTestsSection, /name: runtime-test-diagnostics-shard-\$\{\{ matrix\.shard \}\}-of-3/);
  assert.match(
    ci,
    /run: node --test tests\/wp_test_runner_command_runtime\.test\.js tests\/wp_serial_tests_runtime\.test\.js/
  );
  assert.match(ci, /node --check tools\/wp_test_runner_command\.mjs/);
  assert.match(ci, /run: npm run esm:check/);

  assert.match(
    ci,
    /needs:\n      - strict-gate\n      - lint\n      - typecheck\n      - contracts\n      - runtime-tests\n      - test-runner-node-contract\n      - node22-compat-contract\n      - build-smoke\n      - audit/
  );
  assert.match(ci, /STRICT_GATE_RESULT: \$\{\{ needs\['strict-gate'\]\.result \}\}/);
  assert.match(ci, /RUNTIME_TESTS_RESULT: \$\{\{ needs\['runtime-tests'\]\.result \}\}/);
  assert.match(
    ci,
    /TEST_RUNNER_NODE_CONTRACT_RESULT: \$\{\{ needs\['test-runner-node-contract'\]\.result \}\}/
  );
  assert.match(ci, /NODE22_COMPAT_CONTRACT_RESULT: \$\{\{ needs\['node22-compat-contract'\]\.result \}\}/);
  assert.match(ci, /BUILD_SMOKE_RESULT: \$\{\{ needs\['build-smoke'\]\.result \}\}/);
  assert.doesNotMatch(ci, /\$\{\{ needs\.[a-z0-9-]+\.result \}\}/);
});

test('dependency audit gates release dependencies and keeps full toolchain review explicit', () => {
  const ci = read('.github/workflows/ci.yml');
  const pkg = JSON.parse(read('package.json'));

  assert.equal(pkg.scripts['audit:release'], 'npm audit --omit=dev --audit-level=high');
  assert.equal(pkg.scripts['audit:toolchain'], 'npm audit --audit-level=high');

  assert.match(ci, /^  audit:\n    name: Release dependency audit/m);
  assert.match(ci, /description: Run release dependency audit/);
  assert.match(ci, /name: Install release dependencies\n        run: npm ci --ignore-scripts --omit=dev/);
  assert.equal((ci.match(/run: npm run audit:release/g) ?? []).length, 2);
  assert.match(ci, /name: Audit high severity release dependencies\n        run: npm run audit:release/);
  assert.doesNotMatch(ci, /run: npm audit --audit-level=high/);
  assert.doesNotMatch(ci, /run: npm run audit:toolchain/);
});

test('GitHub CI keeps the monolithic verify flow as a manual release gate only', () => {
  const ci = read('.github/workflows/ci.yml');
  const pkg = JSON.parse(read('package.json'));

  assert.match(ci, /^  release-gate:/m);
  assert.match(ci, /if: github\.event_name == 'workflow_dispatch' && inputs\.run_release_gate/);
  assert.match(
    ci,
    /name: Audit high severity release dependencies\n        run: npm run audit:release\n\n      - name: Run full release verification gate/
  );
  assert.equal(pkg.scripts['gate:full'], 'node tools/wp_verify.js --gate');

  const monolithicRuns = ci
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^run: npm run (verify|gate:full)\b/.test(line));

  assert.deepEqual(monolithicRuns, ['run: npm run gate:full']);
});

test('all GitHub workflows consume approved centralized Node version files', () => {
  const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
  const workflowFiles = fs
    .readdirSync(workflowDirectory)
    .filter(name => /\.ya?ml$/u.test(name))
    .sort();

  for (const fileName of workflowFiles) {
    const source = fs.readFileSync(new URL(fileName, workflowDirectory), 'utf8');
    const setupNodeCount = (source.match(/uses:\s*actions\/setup-node@/gu) ?? []).length;
    const versionFileCount = (source.match(/node-version-file:\s*['"]\.node-version(?:-compat)?['"]/gu) ?? [])
      .length;
    assert.equal(versionFileCount, setupNodeCount, `${fileName} bypasses approved version files`);
    assert.doesNotMatch(source, /^\s*node-version:\s*/gmu, `${fileName} pins Node independently`);
  }
});

test('Node 22 compatibility lane uses the dedicated exact version file', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.equal(read('.node-version-compat').trim(), '22.16.0');
  assert.match(ci, /^  node22-compat-contract:\n    name: Node 22 compatibility contracts/m);
  assert.match(ci, /node-version-file: ['"]\.node-version-compat['"]/);
  assert.match(ci, /npm run check:node-runtime/);
  assert.match(ci, /npm run check:esnext-target/);
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
  assert.match(
    manualCloseout,
    /if \[ "\$\{\{ inputs\.profile \}\}" = "default" \] && \[ -f docs\/FINAL_VERIFICATION_SUMMARY\.md \]; then/
  );
  assert.match(manualCloseout, /Focused profiles publish diagnostics\/state artifacts/);
  assert.deepEqual(optionMatches, ALLOWED_PROFILES);
});
