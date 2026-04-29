import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCanonicalProjectUiSnapshot,
  migrateProjectUiSnapshotToCanonicalRaw,
} from '../esm/native/io/project_migrations/ui_raw_snapshot_migration.ts';
import {
  assertCanonicalUiRawDims,
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
