import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySketchRods,
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

test('render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects', () => {
  const created: any[] = [];
  const added: any[] = [];
  const THREE = {
    Mesh: FakeMesh,
    MeshStandardMaterial: FakeMeshStandardMaterial,
    CylinderGeometry: FakeCylinderGeometry,
  } as any;

  applySketchRods({
    rods: [{ yNorm: 0.25 } as any],
    yFromNorm: () => 0.7,
    createRod(y: unknown, hangClothes: unknown, singleHanger: unknown, limit: unknown) {
      created.push({ y, hangClothes, singleHanger, limit });
    },
    isFn: (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function',
    THREE,
    App: {} as any,
    assertTHREE() {
      throw new Error('THREE should already be provided');
    },
    asObject<T extends object>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
    innerW: 0.8,
    internalCenterX: 0.1,
    internalZ: -0.3,
    group: {
      add(obj: unknown) {
        added.push(obj);
        return obj;
      },
    },
  });

  assert.deepEqual(created, [{ y: 0.7, hangClothes: false, singleHanger: true, limit: null }]);
  assert.equal(added.length, 0);

  applySketchRods({
    rods: [{ yNorm: 0.5 } as any],
    yFromNorm: () => 1.1,
    createRod() {
      throw new Error('installed rod owner rejected sketch rod');
    },
    isFn: (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function',
    THREE,
    App: {} as any,
    assertTHREE() {
      throw new Error('THREE should already be provided');
    },
    asObject<T extends object>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
    innerW: 0.8,
    internalCenterX: 0.1,
    internalZ: -0.3,
    group: {
      add(obj: unknown) {
        added.push(obj);
        return obj;
      },
    },
  });

  assert.equal(added.length, 1);
  assert.equal(added[0]?.userData?.partId, 'all_rods');
  assert.equal(added[0]?.userData?.__wpType, 'sketchRod');
  assert.equal(added[0]?.position?.x, 0.1);
  assert.equal(added[0]?.position?.y, 1.1);
  assert.equal(added[0]?.position?.z, -0.3);
  assert.equal(added[0]?.material?.__keepMaterial, true);
});

test('render interior sketch rods report per-item failures and continue rendering later rods', () => {
  const added: any[] = [];
  const reports: any[] = [];
  const THREE = {
    Mesh: FakeMesh,
    MeshStandardMaterial: FakeMeshStandardMaterial,
    CylinderGeometry: FakeCylinderGeometry,
  } as any;

  applySketchRods({
    rods: [{ yNorm: 'bad' } as any, { yNorm: 0.75 } as any],
    yFromNorm(value: unknown) {
      if (value === 'bad') throw new Error('bad rod placement');
      return 1.35;
    },
    createRod: null as any,
    isFn: (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function',
    THREE,
    App: {} as any,
    assertTHREE() {
      throw new Error('THREE should already be provided');
    },
    asObject<T extends object>(value: unknown): T | null {
      return value && typeof value === 'object' ? (value as T) : null;
    },
    innerW: 0.8,
    internalCenterX: 0.1,
    internalZ: -0.3,
    group: {
      add(obj: unknown) {
        added.push(obj);
        return obj;
      },
    },
    reportSoft(op, error) {
      reports.push({ op, error });
    },
  });

  assert.equal(added.length, 1);
  assert.equal(added[0]?.position?.y, 1.35);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].op, 'applyInteriorSketchExtras.rods.item');
});
