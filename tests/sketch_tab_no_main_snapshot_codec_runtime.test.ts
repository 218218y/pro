import test from 'node:test';
import assert from 'node:assert/strict';

import {
  areSketchNoMainSnapshotValuesEqual,
  createSketchNoMainFreeExtrasSnapshot,
  createSketchNoMainRestoreSnapshot,
  decodeSketchNoMainFreeExtrasSnapshot,
  decodeSketchNoMainRestoreSnapshot,
  fingerprintSketchNoMainSnapshotValue,
} from '../esm/native/ui/react/tabs/sketch_tab_no_main_snapshot_codec.ts';

test('Sketch No-Main restore codec captures only the owned UI surface and canonical ui.raw keys', () => {
  const snapshot = createSketchNoMainRestoreSnapshot(
    {
      activeTab: 'sketch',
      projectName: 'keep-outside-restore',
      structureSelect: 'custom',
      singleDoorPos: 'right',
      stackSplitEnabled: true,
      raw: {
        width: 240,
        height: 220,
        depth: 60,
        doors: 4,
        // @ts-expect-error runtime boundary proof: unknown raw keys must be filtered.
        legacyWidth: 999,
      },
      noMainSketchRestoreSnapshot: { shouldNotNest: true },
      noMainSketchFreeExtrasSnapshot: { shouldNotNest: true },
    },
    {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ id: 'main', doors: 4 }],
      handlesMap: { d1_full: 'rail' },
    },
    123
  );

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.capturedAt, 123);
  assert.equal(snapshot.ui.structureSelect, 'custom');
  assert.equal(snapshot.ui.singleDoorPos, 'right');
  assert.equal(snapshot.ui.stackSplitEnabled, true);
  assert.equal('activeTab' in snapshot.ui, false);
  assert.equal('projectName' in snapshot.ui, false);
  assert.equal('noMainSketchRestoreSnapshot' in snapshot.ui, false);
  assert.equal('noMainSketchFreeExtrasSnapshot' in snapshot.ui, false);
  assert.deepEqual(snapshot.ui.raw, { width: 240, height: 220, depth: 60, doors: 4 });
});

test('Sketch No-Main codec uses canonical key ordering for equality and identity', () => {
  const left = { z: 1, nested: { b: 2, a: 1 } };
  const right = { nested: { a: 1, b: 2 }, z: 1 };

  assert.equal(areSketchNoMainSnapshotValuesEqual(left, right), true);
  assert.equal(fingerprintSketchNoMainSnapshotValue(left), fingerprintSketchNoMainSnapshotValue(right));
});

test('Sketch No-Main restore codec rejects malformed or unsupported snapshot envelopes', () => {
  assert.throws(
    () => decodeSketchNoMainRestoreSnapshot({ version: 2, capturedAt: 1, ui: {}, config: {} }),
    /invalid Sketch No-Main restore snapshot envelope/i
  );
  assert.throws(
    () => decodeSketchNoMainRestoreSnapshot({ version: 1, capturedAt: 1, ui: {}, config: {} }),
    /requires canonical ui\.raw/i
  );
  assert.throws(
    () =>
      decodeSketchNoMainRestoreSnapshot({
        version: 1,
        capturedAt: '1',
        ui: { raw: {} },
        config: {},
      }),
    /invalid Sketch No-Main restore snapshot payload/i
  );
});

test('Sketch No-Main free-extras codec validates list payloads instead of shape guessing', () => {
  const snapshot = createSketchNoMainFreeExtrasSnapshot(
    {
      boxes: [{ id: 'free-1', freePlacement: true }],
      shelves: [{ id: 'shelf-1' }],
    },
    456
  );

  assert.deepEqual(decodeSketchNoMainFreeExtrasSnapshot(snapshot), snapshot);
  assert.throws(
    () =>
      decodeSketchNoMainFreeExtrasSnapshot({
        version: 1,
        capturedAt: 456,
        sketchExtras: { boxes: { id: 'not-a-list' } },
      }),
    /boxes must be an array/i
  );
  assert.throws(
    () =>
      decodeSketchNoMainFreeExtrasSnapshot({
        version: 1,
        capturedAt: '456',
        sketchExtras: {},
      }),
    /invalid Sketch No-Main free-extras snapshot payload/i
  );
});

test('Sketch No-Main snapshot serialization fails fast on circular state', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => fingerprintSketchNoMainSnapshotValue(circular), /circular references/i);
});
