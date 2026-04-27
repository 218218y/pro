import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchModuleSurfacePreview } from '../esm/native/services/canvas_picking_sketch_module_surface_preview.js';

test('module surface preview resolves preset rod hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_shelf:regular', moduleKey: 0, isBottom: false },
    tool: 'sketch_shelf:regular',
    hitModuleKey: 0,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'hanging_top2', isCustom: false },
    hitLocalX: 0,
    yClamped: 0.76,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: true,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [],
    isCornerKey: () => false,
    resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'rod');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'rod');
  assert.equal(result.hoverRecord?.removeKind, 'base');
  assert.equal(result.hoverRecord?.rodIndex, 4);
});

test('module surface preview resolves sketch rod hover as remove when removal probe is enabled', () => {
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_box:40', moduleKey: 1, isBottom: false },
    tool: 'sketch_box:40',
    hitModuleKey: 1,
    intersects: [],
    info: { gridDivisions: 6 },
    cfgRef: { layout: 'shelves', isCustom: true, customData: { rods: [] } },
    hitLocalX: 0,
    yClamped: 0.6,
    bottomY: 0,
    topY: 1.2,
    spanH: 1.2,
    pad: 0.003,
    woodThick: 0.018,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: false,
    allowExistingRodRemove: true,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0.4,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: 0.5,
    boxes: [],
    storageBarriers: [],
    shelves: [],
    rods: [{ yNorm: 0.5 }],
    isCornerKey: () => false,
    resolveSketchBoxGeometry: () => ({
      xNorm: 0.5,
      centered: true,
      centerX: 0,
      centerZ: 0,
      innerCenterZ: 0,
      innerW: 1,
      innerD: 0.5,
      innerBackZ: -0.25,
      outerW: 1,
      outerD: 0.55,
    }),
    readSketchBoxDividers: () => [],
    resolveSketchBoxSegments: () => [],
  });

  assert.equal(result.handled, true);
  assert.equal(result.preview?.kind, 'rod');
  assert.equal(result.preview?.op, 'remove');
  assert.equal(result.hoverRecord?.kind, 'rod');
  assert.equal(result.hoverRecord?.removeKind, 'sketch');
  assert.equal(result.hoverRecord?.removeIdx, 0);
});
