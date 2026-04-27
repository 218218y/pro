import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.js';

test('renderInteriorCustomOps keeps module-scoped storage barrier multi-color material selection', () => {
  const boardCalls: Array<{ material: unknown; partId: string }> = [];
  const moduleMaterial = { name: 'module-barrier-mat' };
  const renderer = createBuilderRenderInteriorCustomOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    matCache: () => ({}),
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  const ok = renderer.applyInteriorCustomOps({
    THREE: null,
    customOps: {
      shelves: [],
      rods: [],
      storageBarrier: { barrierH: 0.22, zFrontOffset: -0.04 },
    },
    createBoard: (
      _w: unknown,
      _h: unknown,
      _d: unknown,
      _x: unknown,
      _y: unknown,
      _z: unknown,
      material: unknown,
      partId: unknown
    ) => {
      boardCalls.push({ material, partId: String(partId) });
      return null;
    },
    createRod: () => null,
    wardrobeGroup: { children: [] },
    gridDivisions: 6,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    localGridStep: 0.4,
    innerW: 1,
    woodThick: 0.018,
    internalDepth: 0.55,
    internalCenterX: 0,
    internalZ: 0,
    D: 0.6,
    moduleIndex: 2,
    modulesLength: 4,
    cfg: { isMultiColorMode: true },
    getPartColorValue: (partId: unknown) => String(partId) === 'storage_barrier_2',
    getPartMaterial: (partId: unknown) => (String(partId) === 'storage_barrier_2' ? moduleMaterial : null),
    bodyMat: { name: 'body-default' },
  });

  assert.equal(ok, true);
  assert.equal(boardCalls.length, 1);
  assert.equal(boardCalls[0].partId, 'storage_barrier_2');
  assert.equal(boardCalls[0].material, moduleMaterial);
});
