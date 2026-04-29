import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(
    result.status,
    0,
    `${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

test('stage 19 project migration selector hardening runtime tests pass', () => {
  runNode([
    'tools/wp_run_tsx_tests.mjs',
    'tests/project_migration_runtime_selector_hardening_runtime.test.ts',
  ]);
  runNode(['tools/wp_project_migration_boundary_audit.mjs']);
  runNode(['tools/wp_runtime_selector_policy_audit.mjs']);
});

test('stage 19 project migration selector guard is wired into the refactor control plane', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const scripts = pkg.scripts || {};

  assert.match(
    scripts['test:project-migration-selector-hardening'],
    /project_migration_runtime_selector_hardening_runtime\.test\.ts/
  );
  assert.match(
    scripts['test:refactor-stage-guards'],
    /refactor_stage19_project_migration_selector_hardening_runtime\.test\.js/
  );

  const integrationAudit = readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  assert.match(integrationAudit, /refactor_stage19_project_migration_selector_hardening_runtime\.test\.js/);

  const progress = readFileSync('docs/REFACTOR_WORKMAP_PROGRESS.md', 'utf8');
  assert.match(progress, /Stage 19/);
});

test('stage 31 and 32 project selector public API closeout is anchored', () => {
  const coreApi = readFileSync('esm/native/core/api.ts', 'utf8');
  const stateSurface = readFileSync('esm/native/services/api_state_surface.ts', 'utf8');
  const selectorTest = readFileSync(
    'tests/project_migration_runtime_selector_hardening_runtime.test.ts',
    'utf8'
  );
  const selectorAudit = readFileSync('tools/wp_runtime_selector_policy_audit.mjs', 'utf8');
  const integrationAudit = readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  const progress = readFileSync('docs/REFACTOR_WORKMAP_PROGRESS.md', 'utf8');

  for (const symbol of [
    'readUiRawScalarFromCanonicalSnapshot',
    'hasCanonicalEssentialUiRawDimsFromSnapshot',
    'assertCanonicalUiRawDims',
    'readCanonicalUiRawNumberFromSnapshot',
    'readCanonicalUiRawIntFromSnapshot',
    'readCanonicalUiRawDimsCmFromSnapshot',
    'readCanonicalUiRawDimsCmFromStore',
  ]) {
    assert.match(coreApi, new RegExp(`\\b${symbol}\\b`));
    assert.match(stateSurface, new RegExp(`\\b${symbol}\\b`));
    assert.match(selectorAudit, new RegExp(`\\b${symbol}\\b`));
  }

  assert.match(
    selectorTest,
    /canonical ui\.raw readers are exposed through public core and state surfaces/
  );
  assert.match(selectorAudit, /requirePublicUiRawExports/);
  assert.match(integrationAudit, /Stage 31/);
  assert.match(integrationAudit, /Stage 32/);
  assert.match(progress, /Stage 31/);
  assert.match(progress, /Stage 32/);
});
