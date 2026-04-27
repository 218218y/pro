import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { runProjectMigrationBoundaryAudit } from '../tools/wp_project_migration_boundary_audit.mjs';

function readSource(file) {
  return fs.readFileSync(file, 'utf8');
}

function exportedFunctionBody(source, name) {
  const marker = `export function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} export is missing`);
  const bodyStart = source.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `${name} body is missing`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index + 1);
  }
  assert.fail(`${name} body did not close`);
}

test('project migration boundary audit passes', () => {
  assert.deepEqual(runProjectMigrationBoundaryAudit().failures, []);
});

test('project UI raw migration owns old direct-dimension materialization', () => {
  const source = readSource('esm/native/io/project_migrations/ui_raw_snapshot_migration.ts');

  assert.match(source, /export function migrateProjectUiSnapshotToCanonicalRaw/);
  assert.match(source, /cloneUiRawInputs\(source\.raw\)/);
  assert.match(source, /for \(const key of UI_RAW_SCALAR_KEYS\)/);
  assert.match(source, /hasOwn\(raw, key\)/);
  assert.match(source, /filledKeys\.push\(key\)/);
});

test('canonical ui.raw selector is raw-only and old fail-soft helpers remain quarantined', () => {
  const source = readSource('esm/native/runtime/ui_raw_selectors.ts');
  const canonicalBody = exportedFunctionBody(source, 'readUiRawScalarFromCanonicalSnapshot');
  const assertBody = exportedFunctionBody(source, 'assertCanonicalUiRawDims');

  assert.doesNotMatch(canonicalBody, /readUiDirectScalar/);
  assert.match(canonicalBody, /getRawFromUiSnapshot\(ui\)/);
  assert.match(canonicalBody, /hasOwnProperty\.call\(raw, key\)/);
  assert.match(assertBody, /missingEssentialUiRawDims\(ui\)/);
  assert.match(source, /export function ensureUiRawDimsFromSnapshot/);
});

test('project load route migrates then asserts canonical ui.raw before commit', () => {
  const source = readSource('esm/native/io/project_io_orchestrator_project_load.ts');

  assert.match(source, /from '\.\/project_migrations\/index\.js'/);
  assert.match(source, /buildCanonicalProjectUiSnapshot\(loadSnapshot\.uiState\)/);
  assert.match(source, /assertCanonicalUiRawDims\(loadUiPreview, 'project\.load\.preview'\)/);
  assert.match(source, /buildCanonicalProjectUiSnapshot\(uiState\)/);
  assert.doesNotMatch(source, /ensureUiRawDimsFromSnapshot/);
  assert.doesNotMatch(source, /hasEssentialUiDimsFromSnapshot/);
});
