import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuilderRenderInteriorRodOps } from '../esm/native/builder/render_interior_rod_ops.ts';

function makeFakeThree() {
  class CylinderGeometry {
    args: unknown[];

    constructor(...args: unknown[]) {
      this.args = args;
    }
  }

  class MeshStandardMaterial {
    params: Record<string, unknown>;

    constructor(params: Record<string, unknown>) {
      this.params = params;
    }
  }

  class Mesh {
    geometry: unknown;
    material: unknown;
    rotation = { x: 0, y: 0, z: 0 };
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };

    constructor(geometry: unknown, material: unknown) {
      this.geometry = geometry;
      this.material = material;
    }
  }

  return { CylinderGeometry, MeshStandardMaterial, Mesh } as any;
}

function createRodOpsHarness() {
  const App = {} as any;
  const cache: Record<string, unknown> = {};
  const added: any[] = [];
  const group = {
    add: (obj: unknown) => {
      added.push(obj);
    },
  } as any;
  const ops = createBuilderRenderInteriorRodOps({
    app: () => App,
    ops: () => ({}),
    wardrobeGroup: () => group,
    three: value => value,
    matCache: () => cache,
    renderOpsHandleCatch: () => {},
    assertTHREE: () => ({}),
  });

  return { ops, App, cache, added, group };
}

test('render interior rod keeps rod material independent from base leg material', () => {
  const THREE = makeFakeThree();
  const { ops, cache, added, group } = createRodOpsHarness();
  const legMat = { id: 'base-leg-material' };

  const created = ops.createRodWithContents({
    THREE,
    yPos: 1.4,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat,
  });

  assert.equal(created, true);
  assert.equal(added.length, 1);
  assert.notEqual(added[0].material, legMat);
  assert.equal(added[0].material, cache.interiorRodMat);
  assert.deepEqual((added[0].material as any).params, {
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.2,
  });
});

test('render interior rod reuses the same neutral rod material when leg color changes', () => {
  const THREE = makeFakeThree();
  const { ops, cache, added, group } = createRodOpsHarness();

  ops.createRodWithContents({
    THREE,
    yPos: 1.4,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat: { color: 'first-leg-color' },
  });

  const firstRodMat = added[0].material;

  ops.createRodWithContents({
    THREE,
    yPos: 1.5,
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    legMat: { color: 'second-leg-color' },
  });

  assert.equal(added.length, 2);
  assert.equal(added[1].material, firstRodMat);
  assert.equal(added[1].material, cache.interiorRodMat);
});

test('render interior rod sends hanging clothes through default hanging_top2 clearance', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 1.52,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    config: { layout: 'hanging_top2', isCustom: false },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    sketchMode: true,
    addOutlines: () => undefined,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  assert.equal(Number(clothesCalls[0][5].toFixed(2)), 1.52);
  assert.equal(clothesCalls[0][7].sketchMode, true);
  assert.equal(typeof clothesCalls[0][7].addOutlines, 'function');
});

test('render interior rod recomputes edited custom hanging clearance instead of stale preset limits', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 0.92,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    manualHeightLimit: 0.52,
    config: {
      isCustom: true,
      gridDivisions: 6,
      customData: {
        shelves: [false, false, false, false, true],
        rods: [false, true, false, false, true, false],
        rodOps: [
          {
            gridIndex: 2,
            yFactor: 2.3,
            enableHangingClothes: true,
            enableSingleHanger: true,
            limitFactor: 1.3,
            limitAdd: 0,
          },
          {
            gridIndex: 5,
            yFactor: 4.8,
            enableHangingClothes: true,
            enableSingleHanger: true,
            limitFactor: 2.5,
            limitAdd: 0,
          },
        ],
        storage: false,
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  assert.equal(Number(clothesCalls[0][5].toFixed(2)), 0.92);
});

test('render interior rod shortens hanging clothes above sketch drawer stacks', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 0.9,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    woodThick: 0.02,
    config: {
      sketchExtras: {
        drawers: [{ id: 'int-bottom', yNorm: 0 }],
        extDrawers: [{ id: 'ext-bottom', yNorm: 0, count: 2 }],
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  // The external sketch drawer stack is taller than the internal two-drawer stack here,
  // so it is the nearest real blocker below the rod: 0.9m rod - 0.44m stack top.
  assert.equal(Number(clothesCalls[0][5].toFixed(3)), 0.46);
});

test('render interior rod reserves folded clothes above shelf blockers', () => {
  const THREE = makeFakeThree();
  const { ops, group } = createRodOpsHarness();
  const clothesCalls: any[] = [];

  ops.createRodWithContents({
    THREE,
    yPos: 1.2,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    gridDivisions: 6,
    localGridStep: 0.4,
    woodThick: 0.02,
    config: {
      isCustom: true,
      customData: {
        shelves: [true],
        rods: [],
        rodOps: [],
        storage: false,
      },
    },
    innerW: 0.8,
    internalCenterX: 0,
    internalZ: 0,
    wardrobeGroup: group,
    showContentsEnabled: true,
    doorStyle: 'flat',
    addHangingClothes(...args: any[]) {
      clothesCalls.push(args);
    },
  });

  assert.equal(clothesCalls.length, 1);
  // Shelf center 0.4 + 0.01m half board + max folded stack (7 * 0.025m) + 0.006m contents gap.
  assert.equal(Number(clothesCalls[0][5].toFixed(3)), 0.609);
});
