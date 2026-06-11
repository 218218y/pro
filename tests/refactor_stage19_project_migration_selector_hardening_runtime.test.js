import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

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

function assertCatalogCoversStages(...stages) {
  for (const stage of stages) {
    assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes(stage), `catalog must include ${stage}`);
  }
}

function assertCatalogAnchorsNeedle(needle) {
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor => anchor.needle.includes(needle)),
    `catalog anchors must include ${needle}`
  );
}

test('stage 19 project migration selector hardening runtime tests pass', () => {
  runNode([
    'tools/wp_run_tsx_tests.mjs',
    'tests/project_migration_runtime_selector_hardening_runtime.test.ts',
    'tests/project_config_migration_replace_keys_runtime.test.ts',
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

  assert.match(selectorTest, /canonical ui\.raw readers are exposed through public core and state surfaces/);
  assert.match(selectorAudit, /requirePublicUiRawExports/);
  assert.match(integrationAudit, /REFACTOR_COMPLETED_STAGE_LABELS/);
  assertCatalogCoversStages('Stage 31', 'Stage 32');
  assert.match(progress, /Stage 31/);
  assert.match(progress, /Stage 32/);
});

test('stage 33 to 35 project config migration replace-owned branches are anchored', () => {
  const projectLoad = readFileSync('esm/native/io/project_io_orchestrator_project_load.ts', 'utf8');
  const configMigration = readFileSync(
    'esm/native/io/project_migrations/config_snapshot_migration.ts',
    'utf8'
  );
  const migrationIndex = readFileSync('esm/native/io/project_migrations/index.ts', 'utf8');
  const replaceTest = readFileSync('tests/project_config_migration_replace_keys_runtime.test.ts', 'utf8');
  const boundaryAudit = readFileSync('tools/wp_project_migration_boundary_audit.mjs', 'utf8');
  const integrationAudit = readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  const progress = readFileSync('docs/REFACTOR_WORKMAP_PROGRESS.md', 'utf8');

  assert.match(projectLoad, /PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS/);
  assert.doesNotMatch(projectLoad, /PROJECT_LOAD_CONFIG_REPLACE_KEYS/);
  assert.match(configMigration, /PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS/);
  assert.match(configMigration, /PROJECT_CONFIG_MIGRATION_REQUIRED_KEYS/);
  assert.match(migrationIndex, /PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS/);
  assert.match(replaceTest, /materializes every replace-owned branch/);
  assert.match(replaceTest, /fails fast when a replace-owned branch is missing/);
  assert.match(boundaryAudit, /PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS/);
  assert.match(integrationAudit, /REFACTOR_INTEGRATION_ANCHORS/);
  assertCatalogCoversStages('Stage 33', 'Stage 34', 'Stage 35');
  assertCatalogAnchorsNeedle('stage 33 to 35 project config migration replace-owned branches are anchored');
  for (const stage of ['Stage 33', 'Stage 34', 'Stage 35']) {
    assert.match(progress, new RegExp(stage));
  }
});

test('stage 36 to 38 deterministic project config replace-key closeout is anchored', () => {
  const configMigration = readFileSync(
    'esm/native/io/project_migrations/config_snapshot_migration.ts',
    'utf8'
  );
  const migrationIndex = readFileSync('esm/native/io/project_migrations/index.ts', 'utf8');
  const replaceTest = readFileSync('tests/project_config_migration_replace_keys_runtime.test.ts', 'utf8');
  const boundaryAudit = readFileSync('tools/wp_project_migration_boundary_audit.mjs', 'utf8');
  const integrationAudit = readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  const progress = readFileSync('docs/REFACTOR_WORKMAP_PROGRESS.md', 'utf8');

  for (const symbol of [
    'PROJECT_CONFIG_SCALAR_MIGRATION_REQUIRED_KEYS',
    'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER',
    'isProjectConfigSnapshotReplaceKey',
  ]) {
    assert.match(configMigration, new RegExp(`\\b${symbol}\\b`));
    assert.match(migrationIndex, new RegExp(`\\b${symbol}\\b`));
    assert.match(boundaryAudit, new RegExp(`\\b${symbol}\\b`));
  }
  assert.match(configMigration, /buildProjectConfigSnapshotReplaceKeyMap/);
  assert.doesNotMatch(
    configMigration,
    /\.\.\.Object\.keys\(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS\)/,
    'required-key order must not be derived from Object.keys(map)'
  );
  assert.match(replaceTest, /deterministic and type-narrowed/);
  assert.match(integrationAudit, /REFACTOR_COMPLETED_STAGE_LABELS/);
  assert.match(integrationAudit, /REFACTOR_INTEGRATION_ANCHORS/);
  assertCatalogCoversStages('Stage 36', 'Stage 37', 'Stage 38');
  assertCatalogAnchorsNeedle('stage 36 to 38 deterministic project config replace-key closeout is anchored');
  for (const stage of ['Stage 36', 'Stage 37', 'Stage 38']) {
    assert.match(progress, new RegExp(stage));
  }
});
