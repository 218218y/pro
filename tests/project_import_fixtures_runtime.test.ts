import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildProjectUiSnapshot } from '../esm/native/io/project_io_load_helpers.ts';
import { normalizeProjectData } from '../esm/native/io/project_schema.ts';
import {
  assertCanonicalProjectConfigSnapshot,
  buildCanonicalProjectConfigSnapshot,
  buildCanonicalProjectUiSnapshot,
  PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER,
} from '../esm/native/io/project_migrations/index.ts';
import {
  assertCanonicalUiRawDims,
  readCanonicalUiRawDimsCmFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
} from '../esm/native/runtime/ui_raw_selectors.ts';

const FIXTURE_NOW_ISO = '2026-05-03T00:00:00.000Z';

function readFixtureText(fileName: string): string {
  return readFileSync(new URL(`./fixtures/project_import/${fileName}`, import.meta.url), 'utf8');
}

function readFixtureObject(fileName: string): unknown {
  return JSON.parse(readFixtureText(fileName)) as unknown;
}

function normalizeFixtureInput(input: unknown, label: string) {
  const normalized = normalizeProjectData(input, FIXTURE_NOW_ISO);
  if (!normalized) throw new Error(`${label} fixture did not normalize`);
  return normalized;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} should be a record`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} should be an array`);
  return value;
}

test('project import fixtures canonicalize an enveloped legacy project through schema, ui, and config ingress', () => {
  const normalized = normalizeFixtureInput(
    readFixtureText('legacy_hinged_v1_project.json'),
    'legacy_hinged_v1_project'
  );

  assert.equal(normalized.__schema, 'wardrobepro.project');
  assert.equal(normalized.__version, 2);
  assert.equal(normalized.settings?.projectName, 'Legacy Hinged Import');

  const loadSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Project Name');
  assert.equal(loadSnapshot.uiState.projectName, 'Legacy Hinged Import');
  assert.equal(loadSnapshot.savedNotes.length, 1);
  assert.equal(loadSnapshot.savedNotes[0]?.doorsOpen, true);

  const canonicalUi = buildCanonicalProjectUiSnapshot(loadSnapshot.uiState);
  const raw = assertCanonicalUiRawDims(canonicalUi, 'fixtures.legacy_hinged.ui');
  assert.deepEqual(readCanonicalUiRawDimsCmFromSnapshot(canonicalUi, 'fixtures.legacy_hinged.ui'), {
    widthCm: 183.5,
    heightCm: 242,
    depthCm: 61.2,
    doorsCount: 4,
    chestDrawersCount: 4,
  });
  assert.equal(raw.width, 183.5);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalUi, 'stackSplitLowerDepthManual'), true);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalUi, 'stackSplitLowerWidthManual'), true);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalUi, 'stackSplitLowerDoorsManual'), true);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalUi, 'cornerWidth'), 72);

  const config = buildCanonicalProjectConfigSnapshot(normalized);
  assertCanonicalProjectConfigSnapshot(config, 'fixtures.legacy_hinged.config');
  const configRecord = config as Record<string, unknown>;

  assert.equal(configRecord.wardrobeType, 'hinged');
  assert.equal(configRecord.boardMaterial, 'melamine');
  assert.equal(configRecord.showDimensions, false);
  assert.equal(configRecord.isMultiColorMode, true);
  assert.equal(configRecord.globalHandleType, 'edge');
  assert.equal(configRecord.isLibraryMode, true);
  assert.equal(configRecord.grooveLinesCount, 4);

  const splitDoorsMap = asRecord(configRecord.splitDoorsMap, 'legacy splitDoorsMap');
  assert.equal(splitDoorsMap.split_d1, true);
  assert.deepEqual(splitDoorsMap.splitpos_d1, [0.33, 0.66]);
  assert.equal(splitDoorsMap.split_d2, false);

  const splitDoorsBottomMap = asRecord(configRecord.splitDoorsBottomMap, 'legacy splitDoorsBottomMap');
  assert.equal(splitDoorsBottomMap.splitb_d1, true);
  assert.equal(splitDoorsBottomMap.splitb_d2, false);

  const removedDoorsMap = asRecord(configRecord.removedDoorsMap, 'legacy removedDoorsMap');
  assert.equal(removedDoorsMap.removed_d4_full, true);
  assert.equal(Object.prototype.hasOwnProperty.call(removedDoorsMap, 'junk'), false);

  const doorStyleMap = asRecord(configRecord.doorStyleMap, 'legacy doorStyleMap');
  assert.equal(doorStyleMap.d1_full, 'profile');
  assert.equal(Object.prototype.hasOwnProperty.call(doorStyleMap, 'd1'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doorStyleMap, 'd2'), false);

  const savedColors = asArray(configRecord.savedColors, 'legacy savedColors');
  assert.equal(savedColors.length, 1);
  assert.equal(asRecord(savedColors[0], 'legacy saved color').id, 'matte-white');
});

test('project import fixtures materialize empty replace-owned branches as explicit clears', () => {
  const normalized = normalizeFixtureInput(
    readFixtureObject('minimal_empty_owned_branches_project.json'),
    'minimal_empty_owned_branches_project'
  );

  const loadSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Project Name');
  const canonicalUi = buildCanonicalProjectUiSnapshot(loadSnapshot.uiState);
  assert.deepEqual(readCanonicalUiRawDimsCmFromSnapshot(canonicalUi, 'fixtures.empty_owned.ui'), {
    widthCm: 160,
    heightCm: 240,
    depthCm: 55,
    doorsCount: 2,
    chestDrawersCount: 4,
  });

  const config = buildCanonicalProjectConfigSnapshot(normalized);
  assertCanonicalProjectConfigSnapshot(config, 'fixtures.empty_owned.config');
  const configRecord = config as Record<string, unknown>;

  for (const key of PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(configRecord, key),
      true,
      `${key} must be materialized so load can replace stale live state`
    );
    assert.notEqual(configRecord[key], undefined, `${key} must not be undefined`);
  }

  assert.equal(configRecord.wardrobeType, 'sliding');
  assert.equal(configRecord.boardMaterial, 'sandwich');
  assert.equal(configRecord.showDimensions, true);
  assert.equal(configRecord.isMultiColorMode, false);
  assert.equal(configRecord.isLibraryMode, false);
  assert.equal(configRecord.grooveLinesCount, null);
  assert.equal(configRecord.preChestState, null);

  for (const key of [
    'groovesMap',
    'grooveLinesCountMap',
    'splitDoorsMap',
    'splitDoorsBottomMap',
    'removedDoorsMap',
    'drawerDividersMap',
    'individualColors',
    'doorSpecialMap',
    'doorStyleMap',
    'mirrorLayoutMap',
    'doorTrimMap',
    'handlesMap',
    'hingeMap',
    'curtainMap',
  ]) {
    assert.deepEqual(
      Object.keys(asRecord(configRecord[key], `empty ${key}`)),
      [],
      `${key} clears stale state`
    );
  }

  assert.deepEqual(asArray(configRecord.savedColors, 'empty savedColors'), []);
  assert.deepEqual(asArray(configRecord.savedNotes, 'empty savedNotes'), []);
  assert.equal(Array.isArray(configRecord.modulesConfiguration), true);
  assert.equal(Array.isArray(configRecord.stackSplitLowerModulesConfiguration), true);
  const cornerConfiguration = asRecord(configRecord.cornerConfiguration, 'empty cornerConfiguration');
  assert.equal(cornerConfiguration.layout, 'shelves');
  assert.equal(Array.isArray(cornerConfiguration.intDrawersList), true);
});
