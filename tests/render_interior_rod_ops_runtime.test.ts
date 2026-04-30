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
