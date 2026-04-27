import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchModuleShelfRemovePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview_shelf.js';

test('shelf preview resolves base shelf hover as remove for sketch shelf tool', () => {
  const result = resolveSketchModuleShelfRemovePreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false },
    hitModuleKey: 0,
    intersects: [
      {
        object: { userData: { partId: 'all_shelves' } },
        point: { y: 0.6 },
      },
    ],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves' },
    yClamped: 0.6,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    shelves: [],
    variant: 'regular',
    shelfDepthOverrideM: null,
    innerW: 1,
    internalDepth: 0.55,
    internalCenterX: 0,
    backZ: -0.275,
    woodThick: 0.018,
    regularDepth: 0.45,
    isDrawers: false,
    isCornerKey: () => false,
    removeEpsShelf: 0.02,
  });

  assert.equal(result.handled, true);
  assert.equal(result.result?.handled, true);
  assert.equal(result.result?.preview?.op, 'remove');
  assert.equal(result.result?.hoverRecord?.kind, 'shelf');
  assert.equal(result.result?.hoverRecord?.removeKind, 'base');
  assert.equal(result.result?.hoverRecord?.shelfIndex, 3);
});

test('shelf preview resolves sketch shelf hover as remove for sketch shelf tool', () => {
  const result = resolveSketchModuleShelfRemovePreview({
    host: { tool: 'sketch_shelf:glass', moduleKey: 0, isBottom: false },
    hitModuleKey: 0,
    intersects: [
      {
        object: { userData: { partId: 'all_shelves' } },
        point: { y: 0.4 },
      },
    ],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'hanging' },
    yClamped: 0.4,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    shelves: [{ yNorm: 1 / 3, variant: 'glass', depthM: 0.32 }],
    variant: 'regular',
    shelfDepthOverrideM: null,
    innerW: 1,
    internalDepth: 0.55,
    internalCenterX: 0,
    backZ: -0.275,
    woodThick: 0.018,
    regularDepth: 0.45,
    isDrawers: false,
    isCornerKey: () => false,
    removeEpsShelf: 0.02,
  });

  assert.equal(result.handled, true);
  assert.equal(result.result?.preview?.op, 'remove');
  assert.equal(result.result?.preview?.variant, 'glass');
  assert.equal(result.result?.hoverRecord?.removeKind, 'sketch');
  assert.equal(result.result?.hoverRecord?.removeIdx, 0);
});

test('shelf remove preview includes vertical clearance labels to the compartment top and bottom', () => {
  const result = resolveSketchModuleShelfRemovePreview({
    host: { tool: 'sketch_shelf:glass', moduleKey: 0, isBottom: false },
    hitModuleKey: 0,
    intersects: [
      {
        object: { userData: { partId: 'all_shelves' } },
        point: { y: 0.4 },
      },
    ],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'hanging' },
    yClamped: 0.4,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    shelves: [{ yNorm: 1 / 3, variant: 'glass', depthM: 0.32 }],
    variant: 'regular',
    shelfDepthOverrideM: null,
    innerW: 1,
    internalDepth: 0.55,
    internalCenterX: 0,
    backZ: -0.275,
    woodThick: 0.018,
    regularDepth: 0.45,
    isDrawers: false,
    isCornerKey: () => false,
    removeEpsShelf: 0.02,
  });

  assert.equal(Array.isArray(result.result?.preview?.clearanceMeasurements), true);
  assert.deepEqual(
    (result.result?.preview?.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['79 ס"מ', '39 ס"מ']
  );
});
