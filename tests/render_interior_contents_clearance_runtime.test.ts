import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.js';
import { createBuilderRenderInteriorPresetOps } from '../esm/native/builder/render_interior_preset_ops.js';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

type FoldedCall = { shelfY: number; maxHeight: number; maxDepth: number };
type BoardCall = {
  width: number;
  height: number;
  depth: number;
  partId: string;
  options: unknown;
  material: unknown;
  userData?: Record<string, unknown>;
};

function commonInput(calls: FoldedCall[], boardCalls: BoardCall[] = []) {
  return {
    THREE: null,
    createBoard: (
      width: unknown,
      _height: unknown,
      depth: unknown,
      _x: unknown,
      _y: unknown,
      _z: unknown,
      _material: unknown,
      partId: unknown,
      options: unknown
    ) => {
      const mesh = { userData: {} as Record<string, unknown> };
      boardCalls.push({
        width: Number(width),
        height: Number(_height),
        depth: Number(depth),
        partId: String(partId),
        options,
        material: _material,
        userData: mesh.userData,
      });
      return mesh;
    },
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
    app: args => args,
    ops: () => ({}),
    wardrobeGroup: () => ({ children: [] }),
    three: value => value,
    matCache: App => (App as { matCache?: unknown }).matCache ?? null,
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

test('renderInteriorPresetOps keeps brace shelves full-width while regular shelves keep pin clearance', () => {
  const calls: FoldedCall[] = [];
  const boards: BoardCall[] = [];
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls, boards),
      presetOps: { shelves: [1, 2], rods: [] },
      braceShelves: [2],
    }),
    true
  );

  const regular = boards.find(board => board.partId === 'module_shelf_0_g1');
  const brace = boards.find(board => board.partId === 'module_shelf_0_g2');

  assert.equal(regular?.width, 1 - INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM);
  assert.equal(regular?.depth, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);
  assert.equal(brace?.width, 1);
  assert.equal(brace?.depth, 0.55);
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

test('renderInteriorCustomOps keeps brace shelves full-width while regular shelves keep pin clearance', () => {
  const calls: FoldedCall[] = [];
  const boards: BoardCall[] = [];
  const renderer = createCustomRenderer();

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput(calls, boards),
      customOps: { shelves: [1, 2], shelfVariants: { 2: 'brace' }, rods: [] },
    }),
    true
  );

  const regular = boards.find(board => board.partId === 'module_shelf_0_g1');
  const brace = boards.find(board => board.partId === 'module_shelf_0_g2');

  assert.equal(regular?.width, 1 - INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM);
  assert.equal(regular?.depth, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);
  assert.equal(brace?.width, 1);
  assert.equal(brace?.depth, 0.55);
});

function makeMinimalThreeForPins() {
  class Mesh {
    geometry: unknown;
    material: unknown;
    rotation: Record<string, number> = {};
    position = { set: (_x: unknown, _y: unknown, _z: unknown) => undefined };
    userData: Record<string, unknown> = {};
    constructor(geometry: unknown, material: unknown) {
      this.geometry = geometry;
      this.material = material;
    }
  }

  return {
    Box3: class {},
    Group: class {},
    Vector3: class {},
    BoxGeometry: class {},
    CylinderGeometry: class {
      constructor(_r1: unknown, _r2: unknown, _len: unknown, _segments: unknown) {}
    },
    MeshBasicMaterial: class {
      constructor(_opts?: unknown) {}
    },
    MeshStandardMaterial: class {
      __keepMaterial?: boolean;
      constructor(_opts?: unknown) {}
    },
    Mesh,
    DoubleSide: 2,
  };
}

test('removed left frame side forces the adjacent preset module shelves to brace shelves before pins are emitted', () => {
  const calls: FoldedCall[] = [];
  const boards: BoardCall[] = [];
  const pinObjects: any[] = [];
  const group = { children: [], add: (obj: any) => pinObjects.push(obj) };
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput(calls, boards),
      THREE: makeMinimalThreeForPins(),
      wardrobeGroup: group,
      cfg: {
        removedDoorsMap: { removed_body_left: true },
        roundedFrameSideShelvesMap: { body_left: true },
      },
      moduleIndex: 0,
      modulesLength: 2,
      presetOps: { shelves: [1], rods: [] },
    }),
    true
  );

  const shelf = boards.find(board => board.partId === 'module_shelf_0_g1');
  assert.equal(shelf?.width, 1);
  assert.equal(shelf?.depth, 0.55);
  assert.deepEqual(shelf?.options, { shape: 'rounded_shelf', roundedShelfSide: 'left' });
  assert.equal(pinObjects.filter(obj => obj.userData?.__kind === 'shelf_pin').length, 0);
});

test('lower stack preset shelves do not inherit top removed frame side brace policy', () => {
  const topRemovedBoards: BoardCall[] = [];
  const lowerRemovedBoards: BoardCall[] = [];
  const renderer = createPresetRenderer();

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput([], topRemovedBoards),
      cfg: {
        removedDoorsMap: { removed_body_left: true },
        roundedFrameSideShelvesMap: { body_left: true },
      },
      frameSidePartIdPrefix: 'lower_',
      moduleIndex: 0,
      modulesLength: 2,
      presetOps: { shelves: [1], rods: [] },
    }),
    true
  );

  assert.equal(
    renderer.applyInteriorPresetOps({
      ...commonInput([], lowerRemovedBoards),
      cfg: {
        removedDoorsMap: { removed_lower_body_left: true },
        roundedFrameSideShelvesMap: { lower_body_left: true },
      },
      frameSidePartIdPrefix: 'lower_',
      moduleIndex: 0,
      modulesLength: 2,
      presetOps: { shelves: [1], rods: [] },
    }),
    true
  );

  const topOnlyShelf = topRemovedBoards.find(board => board.partId === 'module_shelf_0_g1');
  const lowerShelf = lowerRemovedBoards.find(board => board.partId === 'module_shelf_0_g1');

  assert.equal(topOnlyShelf?.depth, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);
  assert.equal(lowerShelf?.width, 1);
  assert.equal(lowerShelf?.depth, 0.55);
  assert.deepEqual(lowerShelf?.options, { shape: 'rounded_shelf', roundedShelfSide: 'left' });
});

test('removed right frame side forces only the last custom module shelves to brace shelves', () => {
  const leftBoards: BoardCall[] = [];
  const rightBoards: BoardCall[] = [];
  const renderer = createCustomRenderer();

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput([], leftBoards),
      cfg: { removedDoorsMap: { removed_body_right: true } },
      moduleIndex: 0,
      modulesLength: 2,
      customOps: { shelves: [1], rods: [] },
    }),
    true
  );

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput([], rightBoards),
      cfg: { removedDoorsMap: { removed_body_right: true } },
      moduleIndex: 1,
      modulesLength: 2,
      customOps: { shelves: [1], rods: [] },
    }),
    true
  );

  const leftShelf = leftBoards.find(board => board.partId === 'module_shelf_0_g1');
  const rightShelf = rightBoards.find(board => board.partId === 'module_shelf_1_g1');
  assert.equal(leftShelf?.depth, INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM);
  assert.equal(rightShelf?.width, 1);
  assert.equal(rightShelf?.depth, 0.55);
});

test('removed frame side keeps custom shelf type while applying brace geometry and rounding', () => {
  const boards: BoardCall[] = [];
  const renderer = createCustomRenderer();
  const glassMat = { id: 'glass' };

  assert.equal(
    renderer.applyInteriorCustomOps({
      ...commonInput([], boards),
      THREE: makeMinimalThreeForPins(),
      matCache: { __customGlassShelfMat: glassMat },
      cfg: {
        removedDoorsMap: { removed_body_left: true },
        roundedFrameSideShelvesMap: { body_left: true },
      },
      moduleIndex: 0,
      modulesLength: 2,
      customOps: { shelves: [1, 2], shelfVariants: { 1: 'double', 2: 'glass' }, rods: [] },
    }),
    true
  );

  const doubleShelf = boards.find(board => board.partId === 'module_shelf_0_g1');
  const glassShelf = boards.find(board => board.partId === 'module_shelf_0_g2');

  assert.equal(doubleShelf?.width, 1);
  assert.equal(Number(doubleShelf?.height.toFixed(3)), 0.036);
  assert.equal(doubleShelf?.depth, 0.55);
  assert.equal(doubleShelf?.userData?.__wpShelfVariant, 'double');
  assert.equal(doubleShelf?.userData?.__wpShelfIsBrace, true);
  assert.deepEqual(doubleShelf?.options, { shape: 'rounded_shelf', roundedShelfSide: 'left' });

  assert.equal(glassShelf?.width, 1);
  assert.equal(glassShelf?.height, 0.018);
  assert.equal(glassShelf?.depth, 0.55);
  assert.equal(glassShelf?.material, glassMat);
  assert.equal(glassShelf?.userData?.__wpShelfVariant, 'glass');
  assert.equal(glassShelf?.userData?.__wpShelfIsBrace, true);
  assert.deepEqual(glassShelf?.options, { shape: 'rounded_shelf', roundedShelfSide: 'left' });
});
