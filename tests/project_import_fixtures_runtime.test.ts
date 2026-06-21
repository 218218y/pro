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
} from '../esm/native/io/project_load_canonical_snapshot.ts';
import { readCanonicalUiRawDimsCmFromSnapshot } from '../esm/native/runtime/ui_raw_selectors.ts';

const FIXTURE_NOW_ISO = '2026-05-03T00:00:00.000Z';

function readFixtureObject(fileName: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/project_import/${fileName}`, import.meta.url), 'utf8')
  ) as unknown;
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

test('project import fixtures load only the current project schema and keep canonical branches explicit', () => {
  const normalized = normalizeFixtureInput(
    readFixtureObject('minimal_empty_owned_branches_project.json'),
    'minimal_empty_owned_branches_project'
  );

  assert.equal(normalized.__schema, 'wardrobepro.project');
  assert.equal(normalized.__version, 3);
  assert.equal(normalized.projectName, 'Empty Owned Branches Import');

  const loadSnapshot = buildProjectUiSnapshot(normalized, 'Fallback Project Name');
  const canonicalUi = buildCanonicalProjectUiSnapshot(loadSnapshot.uiState);
  assert.deepEqual(readCanonicalUiRawDimsCmFromSnapshot(canonicalUi, 'fixtures.current_empty.ui'), {
    widthCm: 160,
    heightCm: 240,
    depthCm: 55,
    doorsCount: 2,
    chestDrawersCount: 4,
  });

  const config = buildCanonicalProjectConfigSnapshot(normalized);
  assertCanonicalProjectConfigSnapshot(config, 'fixtures.current_empty.config');
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
    'roundedFrameSideShelvesMap',
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
});

test('project import rejects old envelopes and missing schema metadata', () => {
  assert.equal(normalizeProjectData({ project: { settings: { wardrobeType: 'hinged' } } }), null);
  assert.equal(normalizeProjectData({ settings: { wardrobeType: 'hinged' }, toggles: {} }), null);
});
