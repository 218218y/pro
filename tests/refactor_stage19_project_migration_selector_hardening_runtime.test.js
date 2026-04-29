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
  runNode(['tools/wp_run_tsx_tests.mjs', 'tests/project_migration_runtime_selector_hardening_runtime.test.ts']);
  runNode(['tools/wp_project_migration_boundary_audit.mjs']);
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
  assert.match(
    integrationAudit,
    /refactor_stage19_project_migration_selector_hardening_runtime\.test\.js/
  );

  const progress = readFileSync('docs/REFACTOR_WORKMAP_PROGRESS.md', 'utf8');
  assert.match(progress, /Stage 19/);
});
