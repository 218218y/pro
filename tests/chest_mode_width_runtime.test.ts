import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeBuildDimsAndSyncRuntime } from '../esm/native/builder/state_sanitize_pipeline.ts';

test('chest mode keeps non-zero width even though doors count is zero', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      isChestMode: true,
      raw: {
        width: 50,
        height: 50,
        depth: 40,
        doors: 0,
        chestDrawersCount: 2,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.widthCm, 50);
  assert.equal(dims.heightCm, 50);
  assert.equal(dims.depthCm, 40);
  assert.equal(dims.doorsCount, 0);
  assert.equal(dims.chestDrawersCount, 2);
});

test('regular hinged wardrobe with zero doors still collapses width to zero', () => {
  const dims = sanitizeBuildDimsAndSyncRuntime({
    App: null,
    ui: {
      isChestMode: false,
      raw: {
        width: 50,
        height: 240,
        depth: 55,
        doors: 0,
        chestDrawersCount: 4,
      },
    },
    cfg: { wardrobeType: 'hinged' },
  });

  assert.equal(dims.skipBuild, false);
  assert.equal(dims.widthCm, 0);
  assert.equal(dims.doorsCount, 0);
});
