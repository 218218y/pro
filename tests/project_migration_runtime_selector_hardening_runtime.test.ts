import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildCanonicalProjectUiSnapshot,
  migrateProjectUiSnapshotToCanonicalRaw,
} from '../esm/native/io/project_migrations/ui_raw_snapshot_migration.ts';
import {
  assertCanonicalUiRawDims,
  readCanonicalUiRawDimsCmFromSnapshot,
  readCanonicalUiRawIntFromSnapshot,
  readCanonicalUiRawNumberFromSnapshot,
  readUiRawNumberFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
} from '../esm/native/runtime/ui_raw_selectors.ts';

test('project UI raw migration canonicalizes existing raw scalar values before runtime selectors read them', () => {
  const legacySnapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    raw: {
      width: '180.5',
      height: 'not-a-number',
      depth: null,
      doors: '3',
      stackSplitLowerDepthManual: true,
      stackSplitLowerWidthManual: 'yes',
      customExperimentalKey: 'keep-me',
    },
  };

  const migrated = migrateProjectUiSnapshotToCanonicalRaw(legacySnapshot);

  assert.equal(migrated.raw.width, 180.5);
  assert.equal(migrated.raw.height, 240);
  assert.equal(migrated.raw.depth, null);
  assert.equal(migrated.raw.doors, 3);
  assert.equal(migrated.raw.stackSplitLowerDepthManual, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(migrated.raw, 'stackSplitLowerWidthManual'),
    false,
    'invalid typed scalar raw values should not survive canonical project ingress'
  );
  assert.equal(migrated.raw.customExperimentalKey, 'keep-me');

  assert.deepEqual(migrated.filledKeys, ['height']);
  assert.deepEqual([...migrated.normalizedKeys].sort(), ['doors', 'width']);

  assert.equal(readUiRawScalarFromCanonicalSnapshot(migrated.ui, 'width'), 180.5);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(migrated.ui, 'height'), 240);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(migrated.ui, 'depth'), null);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(migrated.ui, 'doors'), 3);
  assert.doesNotThrow(() => assertCanonicalUiRawDims(migrated.ui, 'stage19.fixture'));
});

test('canonical runtime selector stays raw-only while project ingress migrates legacy top-level dimensions', () => {
  const legacySnapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    raw: {
      width: 'broken',
    },
  };

  assert.equal(
    readUiRawScalarFromCanonicalSnapshot(legacySnapshot, 'width'),
    undefined,
    'canonical runtime selector must not read legacy ui.width directly'
  );

  const canonicalSnapshot = buildCanonicalProjectUiSnapshot(legacySnapshot);

  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'width'), 160);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'height'), 240);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'depth'), 55);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'doors'), 4);
  assert.doesNotThrow(() => assertCanonicalUiRawDims(canonicalSnapshot, 'stage19.canonical'));
});

test('canonical ui.raw batch readers fail fast before project ingress migration and stay raw-only afterwards', () => {
  const legacySnapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    chestDrawersCount: '7',
  };

  assert.equal(readUiRawNumberFromSnapshot(legacySnapshot, 'width', 999), 160);
  assert.equal(readCanonicalUiRawNumberFromSnapshot(legacySnapshot, 'width', 999), 999);
  assert.equal(readCanonicalUiRawIntFromSnapshot(legacySnapshot, 'doors', 9), 9);
  assert.throws(
    () => readCanonicalUiRawDimsCmFromSnapshot(legacySnapshot, 'stage29.legacy'),
    /stage29\.legacy missing canonical ui\.raw dimension\(s\): doors, width, height, depth/
  );

  const canonicalSnapshot = buildCanonicalProjectUiSnapshot(legacySnapshot);

  assert.deepEqual(readCanonicalUiRawDimsCmFromSnapshot(canonicalSnapshot, 'stage29.canonical'), {
    widthCm: 160,
    heightCm: 240,
    depthCm: 55,
    doorsCount: 4,
    chestDrawersCount: 7,
  });
});

test('canonical ui.raw readers are exposed through public core and state surfaces', () => {
  const coreApi = readFileSync('esm/native/core/api.ts', 'utf8');
  const stateSurface = readFileSync('esm/native/services/api_state_surface.ts', 'utf8');
  const expectedExports = [
    'readUiRawScalarFromCanonicalSnapshot',
    'hasCanonicalEssentialUiRawDimsFromSnapshot',
    'assertCanonicalUiRawDims',
    'readCanonicalUiRawNumberFromSnapshot',
    'readCanonicalUiRawIntFromSnapshot',
    'readCanonicalUiRawDimsCmFromSnapshot',
    'readCanonicalUiRawDimsCmFromStore',
  ];

  for (const symbol of expectedExports) {
    assert.match(coreApi, new RegExp(`\\b${symbol}\\b`), `core/api.ts must export ${symbol}`);
    assert.match(
      stateSurface,
      new RegExp(`\\b${symbol}\\b`),
      `services/api_state_surface.ts must export ${symbol}`
    );
  }
});
