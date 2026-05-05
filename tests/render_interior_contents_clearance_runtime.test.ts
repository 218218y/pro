import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.js';
import { createBuilderRenderInteriorPresetOps } from '../esm/native/builder/render_interior_preset_ops.js';

type FoldedCall = { shelfY: number; maxHeight: number; maxDepth: number };

function commonInput(calls: FoldedCall[]) {
  return {
    THREE: null,
    createBoard: () => null,
    createRod: () => null,
    addFoldedClothes: (
      _x: unknown,
      shelfY: unknown,
      _z: unknown,
      _width: unknown,
      _group: unknown,
      maxHeight: unknown,
      maxDepth: unknown
    ) => {
      calls.push({ shelfY: Number(shelfY), maxHeight: Number(maxHeight), maxDepth: Number(maxDepth) });
      return null;
    },
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
    moduleIndex: 0,
    modulesLength: 1,
  };
}

test('renderInteriorPresetOps passes real shelf-space clearance to folded/library contents', () => {
  const calls: FoldedCall[] = [];
  const renderer = createBuilderRenderInteriorPresetOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls),
      presetOps: { shelves: [1, 2], rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 3);
  assert.equal(Number(calls[0].shelfY.toFixed(3)), 0);
  assert.equal(Number(calls[0].maxHeight.toFixed(3)), 0.385);
  assert.equal(Number(calls[1].maxHeight.toFixed(3)), 0.376);
  assert.ok(calls[1].maxHeight < 0.5, 'first shelf should not fall back to the oversized default');
  assert.equal(Number(calls[1].maxDepth.toFixed(2)), 0.45);
});

test('renderInteriorCustomOps accounts for the next custom shelf thickness in content clearance', () => {
  const calls: FoldedCall[] = [];
  const renderer = createBuilderRenderInteriorCustomOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    matCache: () => null,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput(calls),
      customOps: { shelves: [1, 2], shelfVariants: { 2: 'double' }, rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 3);
  assert.equal(Number(calls[0].shelfY.toFixed(3)), 0);
  assert.equal(Number(calls[0].maxHeight.toFixed(3)), 0.385);
  assert.equal(Number(calls[1].maxHeight.toFixed(3)), 0.367);
  assert.ok(calls[1].maxHeight < 0.5, 'custom shelf contents should use measured clearance');
  assert.equal(Number(calls[1].maxDepth.toFixed(2)), 0.45);
});


test('renderInteriorPresetOps places contents on the bottom floor surface and skips it when slot 1 has drawers', () => {
  const calls: FoldedCall[] = [];
  const renderer = createBuilderRenderInteriorPresetOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls),
      presetOps: { shelves: [1], rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].shelfY, 0);
  assert.equal(Number(calls[0].maxHeight.toFixed(3)), 0.385);

  const drawerCalls: FoldedCall[] = [];
  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(drawerCalls),
      presetOps: { shelves: [1], rods: [] },
      isInternalDrawersEnabled: true,
      intDrawersSlot: 1,
    }),
    true
  );

  assert.deepEqual(
    drawerCalls.map(call => Number(call.shelfY.toFixed(3))),
    [0.409]
  );
});

test('renderInteriorCustomOps places contents on the bottom floor surface and respects custom shelf clearance', () => {
  const calls: FoldedCall[] = [];
  const renderer = createBuilderRenderInteriorCustomOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    matCache: () => null,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput(calls),
      customOps: { shelves: [1], shelfVariants: { 1: 'double' }, rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].shelfY, 0);
  assert.equal(Number(calls[0].maxHeight.toFixed(3)), 0.376);
  assert.equal(Number(calls[1].shelfY.toFixed(3)), 0.418);
});
