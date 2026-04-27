import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInteriorSketchPlacementSupport,
  createSketchBoxLocator,
} from '../esm/native/builder/render_interior_sketch_support.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeMesh {
  position = new FakeVector3();
  rotation = new FakeVector3();
  userData: Record<string, unknown> = {};
  castShadow = true;
  receiveShadow = true;
  geometry: unknown;
  material: any;
  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeMeshStandardMaterial {
  __keepMaterial?: boolean;
  depthWrite?: boolean;
  side?: unknown;
  premultipliedAlpha?: boolean;
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

class FakeMeshBasicMaterial {
  __keepMaterial?: boolean;
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

class FakeCylinderGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeBoxGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

test('render interior sketch support clamps placement and emits canonical shelf pins and brace seams', () => {
  const added: any[] = [];
  const App: any = { __matCache: {} };
  const support = createInteriorSketchPlacementSupport({
    App,
    group: {
      add(obj: unknown) {
        added.push(obj);
        return obj;
      },
    },
    effectiveBottomY: 0.2,
    effectiveTopY: 1.8,
    woodThick: 0.02,
    innerW: 0.8,
    internalCenterX: 0,
    matCache(currentApp: any) {
      return currentApp.__matCache;
    },
    THREE: {
      Mesh: FakeMesh,
      MeshStandardMaterial: FakeMeshStandardMaterial,
      MeshBasicMaterial: FakeMeshBasicMaterial,
      CylinderGeometry: FakeCylinderGeometry,
      BoxGeometry: FakeBoxGeometry,
      DoubleSide: 'double-side',
    },
    asObject<T extends object>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
    faces: { leftX: -0.4, rightX: 0.4 },
  });

  assert.ok(support.glassMat);
  assert.ok(Math.abs(support.clampY(-5) - 0.204) < 1e-9);
  assert.ok(Math.abs(support.clampY(9) - 1.796) < 1e-9);
  assert.ok(Math.abs((support.yFromNorm(0) ?? 0) - 0.204) < 1e-9);
  assert.ok(Math.abs((support.yFromNorm(1) ?? 0) - 1.796) < 1e-9);

  support.addShelfPins(0, 1, 0, 0.6, 0.02, 0.5, true);
  support.addBraceDarkSeams(1, 0, 0.5, true, {
    Mesh: FakeMesh,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    BoxGeometry: FakeBoxGeometry,
  } as any);

  assert.equal(added.length, 6);
  assert.equal(added.filter(entry => entry?.userData?.__kind === 'shelf_pin').length, 4);
  assert.equal(added.filter(entry => entry?.userData?.__kind === 'brace_seam').length, 2);
  assert.equal(added[0]?.userData?.partId, 'all_shelves');
  assert.equal(added[4]?.castShadow, false);
  assert.equal(added[4]?.receiveShadow, false);
  assert.equal(App.__matCache.__sketchShelfPinMat.__keepMaterial, true);
});

test('render interior sketch support locator resolves the matching box by center span', () => {
  const locate = createSketchBoxLocator([
    { y: 0.6, halfH: 0.2, innerW: 0.5, centerX: -0.2, innerD: 0.45, innerBackZ: -0.2 },
    { y: 1.3, halfH: 0.25, innerW: 0.7, centerX: 0.25, innerD: 0.5, innerBackZ: -0.25 },
  ]);

  assert.deepEqual(locate(0.55), {
    innerW: 0.5,
    centerX: -0.2,
    innerD: 0.45,
    innerBackZ: -0.2,
  });
  assert.deepEqual(locate(1.35), {
    innerW: 0.7,
    centerX: 0.25,
    innerD: 0.5,
    innerBackZ: -0.25,
  });
  assert.equal(locate(2.2), null);
});
