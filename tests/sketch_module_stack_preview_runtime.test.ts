import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchModuleStackPreview } from '../esm/native/services/canvas_picking_sketch_module_stack_preview.ts';

const host = { tool: 'sketch_int_drawers', moduleKey: 2, isBottom: false, ts: 1 } as const;

test('module stack preview resolves standard drawer removal from grid slots', () => {
  const result = resolveSketchModuleStackPreview({
    host,
    contentKind: 'drawers',
    moduleKey: 2,
    cfgRef: { gridDivisions: 6, intDrawersList: [2] },
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.018,
    desiredCenterY: 0.62,
    innerW: 0.9,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    drawers: [],
    extDrawers: [],
    woodThick: 0.018,
    isCornerKey: () => false,
  });

  assert.equal(result.hoverRecord.kind, 'drawers');
  assert.equal(result.hoverRecord.op, 'remove');
  assert.equal(result.hoverRecord.removeKind, 'std');
  assert.equal(result.hoverRecord.removeSlot, 2);
  assert.equal(result.hoverRecord.removePid, 'div_int_2_slot_2');
  assert.equal(result.preview.kind, 'drawers');
  assert.deepEqual(
    (result.preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['164 ס"מ', '41 ס"מ']
  );
});

test('module stack preview reuses existing ext-drawer count on remove hover', () => {
  const result = resolveSketchModuleStackPreview({
    host: { tool: 'sketch_ext_drawers:3', moduleKey: 1, isBottom: true, ts: 2 },
    contentKind: 'ext_drawers',
    moduleKey: 1,
    cfgRef: null,
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.018,
    desiredCenterY: 0.7,
    innerW: 0.9,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    drawers: [],
    extDrawers: [{ id: 'sed1', yNormC: 0.2916666667, count: 4 }],
    woodThick: 0.018,
    selectedDrawerCount: 3,
    selectorFrontEnvelope: { centerX: 0, centerZ: 0.3, outerW: 1.0, outerD: 0.6 },
    isCornerKey: () => false,
  });

  assert.equal(result.hoverRecord.kind, 'ext_drawers');
  assert.equal(result.hoverRecord.op, 'remove');
  assert.equal(result.hoverRecord.removeId, 'sed1');
  assert.equal(result.hoverRecord.drawerCount, 4);
  assert.equal(Array.isArray(result.preview.drawers), true);
  assert.equal(result.preview.drawers.length, 4);
});

test('module stack preview falls back to selector object geometry when ext-drawer envelope is not precomputed', () => {
  const result = resolveSketchModuleStackPreview({
    host: { tool: 'sketch_ext_drawers:0', moduleKey: 1, isBottom: false, ts: 3 },
    contentKind: 'ext_drawers',
    moduleKey: 1,
    cfgRef: null,
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.018,
    desiredCenterY: 1.1,
    innerW: 0.9,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    drawers: [],
    extDrawers: [],
    woodThick: 0.018,
    selectedDrawerCount: 0,
    hitSelectorObj: {
      geometry: { parameters: { width: 1.2, depth: 0.7 } },
      position: { x: 0.14, z: 0.31 },
    },
    isCornerKey: () => false,
  });

  assert.equal(result.hoverRecord.kind, 'ext_drawers');
  assert.equal(result.hoverRecord.op, 'add');
  assert.equal(result.hoverRecord.drawerCount, 3);
  assert.ok(Math.abs(result.preview.x - 0.14) < 1e-9);
  assert.ok(Math.abs(result.preview.w - 1.196) < 1e-9);
  assert.ok(result.preview.z > 0.66);
  assert.equal(result.preview.drawers.length, 3);
  assert.deepEqual(
    (result.preview.clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['97 ס"מ', '77 ס"מ']
  );
});

test('module drawer preview adds nearest shelf spacing without colliding with cell measurements', () => {
  const result = resolveSketchModuleStackPreview({
    host,
    contentKind: 'drawers',
    moduleKey: 2,
    cfgRef: {},
    info: { gridDivisions: 6 },
    shelves: [
      { yNorm: 0.2, variant: 'regular' },
      { yNorm: 0.73, variant: 'regular' },
    ],
    bottomY: 0,
    topY: 2.4,
    totalHeight: 2.4,
    pad: 0.018,
    desiredCenterY: 0.92,
    innerW: 0.9,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    drawers: [],
    extDrawers: [],
    woodThick: 0.018,
    isCornerKey: () => false,
  });

  const measurements = result.preview.clearanceMeasurements as {
    label: string;
    startX: number;
    role?: string;
    labelY?: number;
    styleKey?: string;
  }[];
  assert.deepEqual(
    measurements.map(entry => entry.label),
    ['130 ס"מ', '74 ס"מ', '64 ס"מ', '25 ס"מ']
  );
  const cellLineX = measurements.find(entry => entry.role === 'cell')?.startX ?? 0;
  const neighborLineX = measurements.find(entry => entry.role === 'neighbor')?.startX ?? 0;
  assert.ok(neighborLineX < cellLineX);
  assert.ok(Math.abs(cellLineX) < 0.05);
  assert.ok(Math.abs(neighborLineX) < 0.05);
  assert.equal(measurements.find(entry => entry.role === 'cell' && entry.label === '130 ס"מ')?.labelY, 2.4);
  assert.equal(measurements.find(entry => entry.role === 'cell' && entry.label === '74 ס"מ')?.labelY, 0);
  const aboveNeighbor = measurements.find(entry => entry.role === 'neighbor' && entry.label === '64 ס"מ');
  const belowNeighbor = measurements.find(entry => entry.role === 'neighbor' && entry.label === '25 ס"מ');
  assert.ok(aboveNeighbor && Math.abs((aboveNeighbor.labelY ?? 0) - 1.743) < 1e-9);
  assert.ok(belowNeighbor && Math.abs((belowNeighbor.labelY ?? 0) - 0.489) < 1e-9);
  assert.equal(aboveNeighbor?.styleKey, 'neighbor');
  assert.equal(belowNeighbor?.styleKey, 'neighbor');
});
