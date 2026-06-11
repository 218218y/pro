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

function createPresetRenderer() {
  return createBuilderRenderInteriorPresetOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });
}

function createCustomRenderer() {
  return createBuilderRenderInteriorCustomOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    matCache: () => null,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });
}

test('renderInteriorPresetOps passes real shelf-space clearance to folded/library contents', () => {
  const calls: FoldedCall[] = [];
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls),
      presetOps: { shelves: [1, 2], rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 3);
  const firstShelfCall = calls.find(call => Number(call.shelfY.toFixed(3)) === 0.409);
  assert.ok(firstShelfCall, 'first physical shelf should receive contents');
  assert.equal(Number(firstShelfCall.maxHeight.toFixed(3)), 0.376);
  assert.ok(firstShelfCall.maxHeight < 0.5, 'first shelf should not fall back to the oversized default');
  assert.equal(Number(firstShelfCall.maxDepth.toFixed(2)), 0.45);
});

test('renderInteriorPresetOps emits folded/library contents on the bottom base shelf', () => {
  const calls: FoldedCall[] = [];
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls),
      presetOps: { shelves: [1, 2], rods: [] },
    }),
    true
  );

  const bottomCall = calls.find(call => call.shelfY === 0);
  assert.ok(bottomCall, 'bottom base shelf should receive contents');
  assert.equal(Number(bottomCall.maxHeight.toFixed(3)), 0.385);
  assert.equal(Number(bottomCall.maxDepth.toFixed(2)), 0.45);
});

test('renderInteriorPresetOps does not add folded contents to open hanging bottom spaces', () => {
  const calls: FoldedCall[] = [];
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls),
      presetOps: { shelves: [4, 5], rods: [{ yFactor: 3.8, enableHangingClothes: true }] },
    }),
    true
  );

  assert.equal(
    calls.some(call => call.shelfY === 0),
    false
  );
});

test('renderInteriorCustomOps accounts for the next custom shelf thickness in content clearance', () => {
  const calls: FoldedCall[] = [];
  const renderer = createCustomRenderer();

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput(calls),
      customOps: { shelves: [1, 2], shelfVariants: { 2: 'double' }, rods: [] },
    }),
    true
  );

  assert.equal(calls.length, 3);
  const firstShelfCall = calls.find(call => Number(call.shelfY.toFixed(3)) === 0.409);
  assert.ok(firstShelfCall, 'first custom shelf should receive contents');
  assert.equal(Number(firstShelfCall.maxHeight.toFixed(3)), 0.367);
  assert.ok(firstShelfCall.maxHeight < 0.5, 'custom shelf contents should use measured clearance');
  assert.equal(Number(firstShelfCall.maxDepth.toFixed(2)), 0.45);
});

test('renderInteriorCustomOps emits folded/library contents on the bottom base shelf', () => {
  const calls: FoldedCall[] = [];
  const renderer = createCustomRenderer();

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput(calls),
      customOps: { shelves: [1, 2], shelfVariants: { 2: 'double' }, rods: [] },
    }),
    true
  );

  const bottomCall = calls.find(call => call.shelfY === 0);
  assert.ok(bottomCall, 'custom bottom base shelf should receive contents');
  assert.equal(Number(bottomCall.maxHeight.toFixed(3)), 0.385);
  assert.equal(Number(bottomCall.maxDepth.toFixed(2)), 0.45);
});
