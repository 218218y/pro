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

test('project canonical snapshot boundary audit passes', () => {
  assert.deepEqual(runProjectMigrationBoundaryAudit().failures, []);
});

test('project canonical snapshot owner normalizes raw values without old direct-dimension materialization', () => {
  const source = readSource('esm/native/io/project_load_canonical_snapshot.ts');
  const body = exportedFunctionBody(source, 'canonicalizeProjectUiSnapshot');

  assert.match(source, /export function canonicalizeProjectUiSnapshot/);
  assert.match(body, /cloneUiRawInputs\(source\.raw\)/);
  assert.match(body, /for \(const key of UI_RAW_SCALAR_KEYS\)/);
  assert.match(body, /hasOwn\(raw as UnknownRecord, key\)/);
  assert.match(body, /droppedKeys\.push\(key\)/);
  assert.doesNotMatch(source, /filledKeys/);
  assert.doesNotMatch(body, /source\[key\]/);
});

test('canonical ui.raw selector is raw-only and old fail-soft helpers remain quarantined', () => {
  const facade = readSource('esm/native/runtime/ui_raw_selectors.ts');
  const source = readSource('esm/native/runtime/ui_raw_selectors_canonical.ts');
  const tolerantSource = readSource('esm/native/runtime/ui_raw_selectors_snapshot.ts');
  const canonicalBody = exportedFunctionBody(source, 'readUiRawScalarFromCanonicalSnapshot');
  const assertBody = exportedFunctionBody(source, 'assertCanonicalUiRawDims');

  assert.doesNotMatch(canonicalBody, /readUiDirectScalar/);
  assert.match(canonicalBody, /getRawFromUiSnapshot\(ui\)/);
  assert.match(canonicalBody, /hasOwnProperty\.call\(raw, key\)/);
  assert.match(assertBody, /missingEssentialUiRawDims\(ui\)/);
  assert.match(tolerantSource, /export function ensureUiRawDimsFromSnapshot/);
  assert.match(facade, /readUiRawScalarFromCanonicalSnapshot/);
  assert.match(facade, /ensureUiRawDimsFromSnapshot/);
});

test('project load route canonicalizes then asserts canonical ui.raw before commit', () => {
  const source = readSource('esm/native/io/project_io_orchestrator_project_load.ts');

  assert.match(source, /from '\.\/project_load_canonical_snapshot\.js'/);
  assert.match(source, /buildCanonicalProjectUiSnapshot\(loadSnapshot\.uiState\)/);
  assert.match(source, /assertCanonicalUiRawDims\(loadUiPreview, 'project\.load\.preview'\)/);
  assert.match(source, /buildCanonicalProjectUiSnapshot\(uiState\)/);
  assert.doesNotMatch(source, /ensureUiRawDimsFromSnapshot/);
  assert.doesNotMatch(source, /hasEssentialUiDimsFromSnapshot/);
});
