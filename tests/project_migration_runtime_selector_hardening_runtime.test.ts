import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildCanonicalProjectUiSnapshot,
  canonicalizeProjectUiSnapshot,
} from '../esm/native/io/project_load_canonical_snapshot.ts';
import {
  assertCanonicalUiRawDims,
  readCanonicalUiRawDimsCmFromSnapshot,
  readCanonicalUiRawIntFromSnapshot,
  readCanonicalUiRawNumberFromSnapshot,
  readUiRawNumberFromSnapshot,
  readUiRawScalarFromCanonicalSnapshot,
} from '../esm/native/runtime/ui_raw_selectors.ts';

test('project UI raw canonical snapshot preserves typed scalars and drops values that require coercion', () => {
  const snapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    raw: {
      width: 180.5,
      height: 'not-a-number',
      depth: null,
      doors: 3,
      stackSplitLowerDepthManual: true,
      stackSplitLowerWidthManual: 'yes',
      customExperimentalKey: 'keep-me',
    },
  };

  const canonicalized = canonicalizeProjectUiSnapshot(snapshot);
  const canonicalSnapshot = canonicalized.ui;

  assert.equal(canonicalized.raw.width, 180.5);
  assert.equal(Object.prototype.hasOwnProperty.call(canonicalized.raw, 'height'), false);
  assert.equal(canonicalized.raw.depth, null);
  assert.equal(canonicalized.raw.doors, 3);
  assert.equal(canonicalized.raw.stackSplitLowerDepthManual, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(canonicalized.raw, 'stackSplitLowerWidthManual'),
    false,
    'invalid typed scalar raw values should not survive canonical project ingress'
  );
  assert.equal(canonicalized.raw.customExperimentalKey, 'keep-me');

  assert.deepEqual([...canonicalized.droppedKeys].sort(), ['height', 'stackSplitLowerWidthManual']);
  assert.deepEqual(canonicalized.normalizedKeys, []);
  assert.equal(Object.prototype.hasOwnProperty.call(canonicalized, 'filledKeys'), false);

  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'width'), 180.5);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'height'), undefined);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'depth'), null);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'doors'), 3);
  assert.throws(
    () => assertCanonicalUiRawDims(canonicalSnapshot, 'current-schema.fixture'),
    /current-schema\.fixture missing canonical ui\.raw dimension\(s\): height/
  );
});

test('canonical runtime selector stays raw-only and project ingress does not materialize old top-level dimensions', () => {
  const oldSnapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    raw: {
      width: 'broken',
    },
  };

  assert.equal(
    readUiRawScalarFromCanonicalSnapshot(oldSnapshot, 'width'),
    undefined,
    'canonical runtime selector must not read legacy ui.width directly'
  );

  const canonicalSnapshot = buildCanonicalProjectUiSnapshot(oldSnapshot);

  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'width'), undefined);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'height'), undefined);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'depth'), undefined);
  assert.equal(readUiRawScalarFromCanonicalSnapshot(canonicalSnapshot, 'doors'), undefined);
  assert.throws(
    () => assertCanonicalUiRawDims(canonicalSnapshot, 'current-schema.raw-only'),
    /current-schema\.raw-only missing canonical ui\.raw dimension\(s\): doors, width, height, depth/
  );
});

test('canonical ui.raw batch readers fail fast for old top-level-only snapshots before and after project ingress canonicalization', () => {
  const oldSnapshot = {
    width: '160',
    height: '240',
    depth: '55',
    doors: '4',
    chestDrawersCount: '7',
  };

  assert.equal(readUiRawNumberFromSnapshot(oldSnapshot, 'width', 999), 160);
  assert.equal(readCanonicalUiRawNumberFromSnapshot(oldSnapshot, 'width', 999), 999);
  assert.equal(readCanonicalUiRawIntFromSnapshot(oldSnapshot, 'doors', 9), 9);
  assert.throws(
    () => readCanonicalUiRawDimsCmFromSnapshot(oldSnapshot, 'current-schema.old-top-level'),
    /current-schema\.old-top-level missing canonical ui\.raw dimension\(s\): doors, width, height, depth/
  );

  const canonicalSnapshot = buildCanonicalProjectUiSnapshot(oldSnapshot);

  assert.throws(
    () => readCanonicalUiRawDimsCmFromSnapshot(canonicalSnapshot, 'current-schema.canonical'),
    /current-schema\.canonical missing canonical ui\.raw dimension\(s\): doors, width, height, depth/
  );
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
