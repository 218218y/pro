import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const GUARD_FILE = 'tests/refactor_stage78_runtime_access_surfaces_ownership_guard.test.js';

function assertNoRuntimePrivateSelectorImportsOutsideOwners() {
  const files = fs
    .readdirSync('esm/native/runtime')
    .filter(name => /\.(ts|tsx|js|mjs)$/.test(name))
    .map(name => `esm/native/runtime/${name}`);

  const allowed = new Set([
    'esm/native/runtime/ui_raw_selectors.ts',
    'esm/native/runtime/ui_raw_selectors_snapshot.ts',
    'esm/native/runtime/ui_raw_selectors_canonical.ts',
    'esm/native/runtime/ui_raw_selectors_store.ts',
    'esm/native/runtime/runtime_selectors.ts',
    'esm/native/runtime/runtime_selectors_snapshot.ts',
    'esm/native/runtime/runtime_selectors_store.ts',
  ]);

  for (const file of files) {
    if (allowed.has(file)) continue;
    const source = read(file);
    assert.doesNotMatch(
      source,
      /from '\.\/(ui_raw_selectors|runtime_selectors)_(shared|snapshot|canonical|store|normalizers)\.js';/,
      `${file} must import selector public facades instead of private selector owners`
    );
  }
}

test('stage 78 runtime access surfaces ownership split is anchored', () => {
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const nextPlan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const runtimePolicyAudit = read('tools/wp_runtime_selector_policy_audit.mjs');
  const projectBoundaryAudit = read('tools/wp_project_migration_boundary_audit.mjs');
  const pkg = JSON.parse(read('package.json'));

  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 78'));
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 78 runtime access surfaces ownership split is anchored')
    ),
    'stage 78 must be registered in the shared refactor stage catalog anchors'
  );
  assert.ok(
    pkg.scripts['test:refactor-stage-guards'].includes(GUARD_FILE),
    'stage 78 guard must be wired into the stage guard lane'
  );
  assert.ok(integrationAudit.includes(GUARD_FILE), 'integration audit must require the stage 78 guard');
  assert.match(progress, /Stage 78/);
  assert.match(workmap, /Stage 78/);
  assert.match(nextPlan, /Stage 78 — Runtime access surfaces closeout review — completed/);

  const uiFacade = read('esm/native/runtime/ui_raw_selectors.ts');
  const uiShared = read('esm/native/runtime/ui_raw_selectors_shared.ts');
  const uiSnapshot = read('esm/native/runtime/ui_raw_selectors_snapshot.ts');
  const uiCanonical = read('esm/native/runtime/ui_raw_selectors_canonical.ts');
  const uiStore = read('esm/native/runtime/ui_raw_selectors_store.ts');

  assert.match(uiFacade, /from '\.\/ui_raw_selectors_snapshot\.js';/);
  assert.match(uiFacade, /from '\.\/ui_raw_selectors_canonical\.js';/);
  assert.match(uiFacade, /from '\.\/ui_raw_selectors_store\.js';/);
  assert.doesNotMatch(
    uiFacade,
    /readUiDirectScalar\(|assertCanonicalUiRawDims\(ui|readUiStateFromStore\(|function /,
    'ui.raw facade must not own snapshot fallback, canonical assertions, or store reads'
  );

  assert.match(uiShared, /export function readUiScalarValue/);
  assert.match(uiShared, /export function readUiDirectScalar/);
  assert.match(uiShared, /export function missingEssentialUiRawDims/);
  assert.doesNotMatch(uiShared, /readUiStateFromStore|readCanonicalUiRawDimsCmFromSnapshot/);

  assert.match(uiSnapshot, /export function readUiRawScalarFromSnapshot/);
  assert.match(uiSnapshot, /readUiDirectScalar\(ui, key\)/);
  assert.match(uiSnapshot, /export function ensureUiRawDimsFromSnapshot/);
  assert.doesNotMatch(
    uiSnapshot,
    /assertCanonicalUiRawDims|readUiRawScalarFromCanonicalSnapshot|readUiStateFromStore/,
    'tolerant snapshot owner must not own canonical fail-fast or store access'
  );

  assert.match(uiCanonical, /export function readUiRawScalarFromCanonicalSnapshot/);
  assert.match(uiCanonical, /Object\.prototype\.hasOwnProperty\.call\(raw, key\)/);
  assert.match(uiCanonical, /export function assertCanonicalUiRawDims/);
  assert.match(uiCanonical, /export function readCanonicalUiRawDimsCmFromSnapshot/);
  assert.doesNotMatch(
    uiCanonical,
    /readUiDirectScalar|readUiRawScalarFromSnapshot|ensureUiRawDimsFromSnapshot|readUiStateFromStore/,
    'canonical owner must stay raw-only and must not fallback to legacy ui.* or store access'
  );

  assert.match(uiStore, /readUiStateFromStore/);
  assert.match(uiStore, /readCanonicalUiRawDimsCmFromSnapshot\(ui\)/);
  assert.match(uiStore, /readUiRawDimsCmFromSnapshot\(ui\)/);
  assert.doesNotMatch(uiStore, /readUiDirectScalar|missingEssentialUiRawDims/);

  const rtFacade = read('esm/native/runtime/runtime_selectors.ts');
  const rtShared = read('esm/native/runtime/runtime_selectors_shared.ts');
  const rtNormalizers = read('esm/native/runtime/runtime_selectors_normalizers.ts');
  const rtSnapshot = read('esm/native/runtime/runtime_selectors_snapshot.ts');
  const rtStore = read('esm/native/runtime/runtime_selectors_store.ts');

  assert.match(rtFacade, /from '\.\/runtime_selectors_snapshot\.js';/);
  assert.match(rtFacade, /from '\.\/runtime_selectors_store\.js';/);
  assert.doesNotMatch(
    rtFacade,
    /readRuntimeStateFromStore|getStoreSurfaceMaybe|RUNTIME_SCALAR_NORMALIZERS|function /,
    'runtime selector facade must not own root-state access or scalar normalization policy'
  );

  assert.match(rtShared, /export const DEFAULTS/);
  assert.match(rtShared, /export function readRuntimeValue/);
  assert.doesNotMatch(rtShared, /readRuntimeStateFromStore|RUNTIME_SCALAR_NORMALIZERS/);

  assert.match(rtNormalizers, /export const RUNTIME_SCALAR_NORMALIZERS/);
  assert.match(rtNormalizers, /export function readBooleanLike/);
  assert.match(rtNormalizers, /export function normalizeDrawersOpenId/);
  assert.doesNotMatch(rtNormalizers, /readRuntimeStateFromStore|getStoreSurfaceMaybe/);

  assert.match(rtSnapshot, /export function readRuntimeScalarFromSnapshot/);
  assert.match(rtSnapshot, /return RUNTIME_SCALAR_NORMALIZERS\[key\]\(rawValue, def\);/);
  assert.doesNotMatch(rtSnapshot, /readRuntimeStateFromStore|getStoreSurfaceMaybe/);

  assert.match(rtStore, /readRuntimeStateFromStore/);
  assert.match(rtStore, /getStoreSurfaceMaybe/);
  assert.match(rtStore, /readRuntimeScalarFromSnapshot\(r, key\)/);
  assert.doesNotMatch(rtStore, /RUNTIME_SCALAR_NORMALIZERS/);

  assert.match(runtimePolicyAudit, /uiSnapshotSelectorsRel/);
  assert.match(runtimePolicyAudit, /uiCanonicalSelectorsRel/);
  assert.match(projectBoundaryAudit, /public facade must export/);

  assertNoRuntimePrivateSelectorImportsOutsideOwners();
});
