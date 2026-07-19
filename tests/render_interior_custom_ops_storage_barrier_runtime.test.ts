import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.js';

test('renderInteriorCustomOps keeps module-scoped storage barrier multi-color material selection', () => {
  const boardCalls: Array<{
    width: number;
    height: number;
    depth: number;
    x: number;
    y: number;
    z: number;
    material: unknown;
    partId: string;
  }> = [];
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
      storageBarrier: { barrierH: 0.22 },
    },
    createBoard: (
      width: unknown,
      height: unknown,
      depth: unknown,
      x: unknown,
      y: unknown,
      z: unknown,
      material: unknown,
      partId: unknown
    ) => {
      boardCalls.push({
        width: Number(width),
        height: Number(height),
        depth: Number(depth),
        x: Number(x),
        y: Number(y),
        z: Number(z),
        material,
        partId: String(partId),
      });
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
  assert.deepEqual(
    {
      width: boardCalls[0].width,
      height: boardCalls[0].height,
      depth: boardCalls[0].depth,
      x: boardCalls[0].x,
      y: boardCalls[0].y,
      z: boardCalls[0].z,
    },
    { width: 0.975, height: 0.22, depth: 0.018, x: 0, y: 0.11, z: 0.24 }
  );
});
