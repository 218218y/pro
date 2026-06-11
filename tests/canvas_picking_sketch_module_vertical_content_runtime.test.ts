import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampSketchModuleStorageCenterY,
  commitSketchModuleRod,
  commitSketchModuleShelf,
  commitSketchModuleStorageBarrier,
  createSketchModuleShelfPreviewGeometry,
  findNearestSketchModuleShelf,
  findNearestSketchModuleStorageBarrier,
} from '../esm/native/services/canvas_picking_sketch_module_vertical_content.ts';

test('sketch module shelf preview respects brace width trimming and clamps depth override to internal depth', () => {
  const preview = createSketchModuleShelfPreviewGeometry({
    innerW: 0.9,
    internalDepth: 0.45,
    backZ: -0.2,
    woodThick: 0.018,
    regularDepth: 0.35,
    variant: 'brace',
    shelfDepthOverrideM: 0.8,
  });

  assert.equal(preview.variant, 'brace');
  assert.equal(preview.w, 0.898);
  assert.equal(preview.d, 0.45);
  assert.ok(Math.abs(preview.z - 0.025) < 1e-9);
});

test('sketch module shelf commits toggle the nearest shelf and preserve explicit depth metadata', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      shelves: [{ yNorm: 0.3, variant: 'glass', depthM: 0.22 }],
    },
  };

  commitSketchModuleShelf({
    cfg,
    bottomY: 0,
    totalHeight: 1,
    pointerY: 0.3,
    yNorm: 0.31,
    variant: 'double',
    shelfDepthM: 0.4,
    removeEps: 0.02,
  });

  assert.deepEqual((cfg.sketchExtras as any).shelves, []);

  commitSketchModuleShelf({
    cfg,
    bottomY: 0,
    totalHeight: 1,
    pointerY: 0.7,
    yNorm: 0.7,
    variant: 'glass',
    shelfDepthM: 0.33,
    removeEps: 0.02,
  });

  assert.deepEqual((cfg.sketchExtras as any).shelves, [{ yNorm: 0.7, variant: 'glass', depthM: 0.33 }]);

  const match = findNearestSketchModuleShelf({
    shelves: (cfg.sketchExtras as any).shelves,
    bottomY: 0,
    totalHeight: 1,
    pointerY: 0.71,
  });

  assert.equal(match?.variant, 'glass');
  assert.equal(match?.depthM, 0.33);
});

test('sketch module rod commits toggle the nearest rod instead of duplicating it', () => {
  const cfg: Record<string, unknown> = {
    sketchExtras: {
      rods: [{ yNorm: 0.5 }],
    },
  };

  commitSketchModuleRod({
    cfg,
    bottomY: -1,
    totalHeight: 2,
    pointerY: 0,
    yNorm: 0.5,
    removeEps: 0.02,
  });

  assert.deepEqual((cfg.sketchExtras as any).rods, []);

  commitSketchModuleRod({
    cfg,
    bottomY: -1,
    totalHeight: 2,
    pointerY: 0.6,
    yNorm: 0.8,
    removeEps: 0.02,
  });

  assert.deepEqual((cfg.sketchExtras as any).rods, [{ yNorm: 0.8 }]);
});

test('storage barrier center clamps within the legal vertical span before commit and remove matching barrier', () => {
  assert.ok(
    Math.abs(
      clampSketchModuleStorageCenterY({
        bottomY: 0,
        topY: 2,
        pad: 0.05,
        heightM: 0.8,
        pointerY: 1.9,
      }) - 1.55
    ) < 1e-9
  );

  const cfg: Record<string, unknown> = {
    sketchExtras: {
      storageBarriers: [{ id: 's1', yNorm: 0.5, heightM: 0.6 }],
    },
  };

  commitSketchModuleStorageBarrier({
    cfg,
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.05,
    pointerY: 1,
    heightM: 0.6,
    removeEps: 0.03,
    idFactory: () => 'new-id',
  });

  assert.deepEqual((cfg.sketchExtras as any).storageBarriers, []);

  commitSketchModuleStorageBarrier({
    cfg,
    bottomY: 0,
    topY: 2,
    totalHeight: 2,
    pad: 0.05,
    pointerY: 1.95,
    heightM: 0.8,
    removeEps: 0.03,
    idFactory: () => 's2',
  });

  const barriers = (cfg.sketchExtras as any).storageBarriers;
  assert.equal(barriers.length, 1);
  assert.equal(barriers[0].id, 's2');
  assert.equal(barriers[0].heightM, 0.8);
  assert.ok(Math.abs(barriers[0].yNorm - 0.775) < 1e-9);

  const match = findNearestSketchModuleStorageBarrier({
    storageBarriers: (cfg.sketchExtras as any).storageBarriers,
    bottomY: 0,
    totalHeight: 2,
    pointerY: 1.55,
  });

  assert.equal(match?.heightM, 0.8);
  assert.ok(Math.abs((match?.yAbs ?? 0) - 1.55) < 1e-9);
});
