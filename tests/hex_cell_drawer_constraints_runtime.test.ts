import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEX_CELL_DEFAULT_DOOR_WIDTH_RATIO,
  captureHexCellDraftComparisonSnapshot,
  hasHexCellDraftConfigChange,
  hasHexCellDraftSnapshotChange,
  moduleHasDrawerContent,
  resolveDefaultHexDoorWidthCm,
  resolveHexCellDraftConfig,
  shouldBlockDrawerBuildInHexCell,
  shouldBlockHexCellApplyOverDrawers,
} from '../esm/native/features/hex_cell/index.ts';

test('hex-cell drawer constraints detect regular and sketch drawers', () => {
  assert.equal(moduleHasDrawerContent({ extDrawersCount: 2 }), true);
  assert.equal(moduleHasDrawerContent({ hasShoeDrawer: true }), true);
  assert.equal(moduleHasDrawerContent({ sketchExtras: { drawers: [{ id: 'd1' }] } }), true);
  assert.equal(moduleHasDrawerContent({ sketchExtras: { extDrawers: [{ id: 'e1' }] } }), true);
  assert.equal(
    moduleHasDrawerContent({ sketchExtras: { boxes: [{ id: 'box-1', extDrawers: [{ id: 'be1' }] }] } }),
    true
  );
  assert.equal(moduleHasDrawerContent({ sketchExtras: { shelves: [{ id: 's1' }] } }), false);
});

test('hex-cell drawer constraints block both illegal directions', () => {
  assert.equal(shouldBlockDrawerBuildInHexCell({ hexCell: { enabled: true } }), true);
  assert.equal(shouldBlockDrawerBuildInHexCell({ hexCell: { enabled: false } }), false);
  assert.equal(shouldBlockHexCellApplyOverDrawers({ extDrawersCount: 1 }), true);
  assert.equal(shouldBlockHexCellApplyOverDrawers({ sketchExtras: { drawers: [{ id: 'd1' }] } }), true);
  assert.equal(shouldBlockHexCellApplyOverDrawers({ layout: 'shelves' }), false);
});

test('hex-cell default door width follows the central ratio when no manual width is set', () => {
  assert.equal(HEX_CELL_DEFAULT_DOOR_WIDTH_RATIO, 0.75);
  assert.equal(resolveDefaultHexDoorWidthCm(80), 60);
  assert.equal(resolveDefaultHexDoorWidthCm(100), 75);
  assert.equal(resolveDefaultHexDoorWidthCm(60), 45);
  assert.equal(resolveHexCellDraftConfig({ moduleWidthCm: 80 }).doorWidthCm, 60);
});

test('hex-cell draft comparison snapshot preserves config comparison semantics exactly', () => {
  const configs = [
    {},
    { hexCell: { enabled: false } },
    { hexCell: { enabled: true } },
    { hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 60 } },
    { hexCell: { enabled: true, protrusionCm: 12 } },
  ];
  const drafts = [
    { moduleWidthCm: 80 },
    { moduleWidthCm: 80, protrusionCm: 10, doorWidthCm: 60 },
    { moduleWidthCm: 80, protrusionCm: 10.000001, doorWidthCm: 60, toleranceCm: 0.000001 },
    { moduleWidthCm: 80, protrusionCm: 11, doorWidthCm: 61 },
    { moduleWidthCm: 100, doorWidthCm: 75 },
  ];

  for (const cfgMod of configs) {
    const snapshot = captureHexCellDraftComparisonSnapshot(cfgMod);
    for (const draft of drafts) {
      assert.equal(
        hasHexCellDraftSnapshotChange({ snapshot, ...draft }),
        hasHexCellDraftConfigChange({ cfgMod, ...draft })
      );
    }
  }

  const defaults = { hexCell: { enabled: true } };
  assert.equal(
    hasHexCellDraftConfigChange({
      cfgMod: defaults,
      moduleWidthCm: 80,
      protrusionCm: 10,
      doorWidthCm: 60,
    }),
    false
  );
  assert.equal(
    hasHexCellDraftConfigChange({
      cfgMod: defaults,
      moduleWidthCm: 80,
      protrusionCm: 10.000001,
      doorWidthCm: 60,
      toleranceCm: 0.000001,
    }),
    false
  );
  assert.equal(
    hasHexCellDraftConfigChange({
      cfgMod: defaults,
      moduleWidthCm: 80,
      protrusionCm: 10.000002,
      doorWidthCm: 60,
      toleranceCm: 0.000001,
    }),
    true
  );
});
