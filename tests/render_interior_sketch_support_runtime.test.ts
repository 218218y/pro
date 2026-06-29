import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySketchRods,
  applySketchShelves,
  applySketchStorageBarriers,
  createInteriorSketchPlacementSupport,
  createSketchBoxLocator,
} from '../esm/native/builder/render_interior_sketch_support.ts';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { createSketchInteriorHarness, FakeMaterial } from './sketch_box_runtime_helpers.ts';

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

test('render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled', () => {
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
  assert.equal(support.yFromNorm('0.5'), null);

  support.addShelfPins(0, 1, 0, 0.6, 0.02, 0.5, true);
  support.addBraceDarkSeams(1, 0, 0.5, true, {
    Mesh: FakeMesh,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    BoxGeometry: FakeBoxGeometry,
  } as any);

  assert.equal(added.length, 4);
  assert.equal(added.filter(entry => entry?.userData?.__kind === 'shelf_pin').length, 4);
  assert.equal(added.filter(entry => entry?.userData?.__kind === 'brace_seam').length, 0);
  assert.equal(added[0]?.userData?.partId, 'all_shelves');
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

test('render interior sketch shelves emit folded contents with measured shelf clearance', () => {
  const boards: any[] = [];
  const folded: any[] = [];
  const group = { add() {} } as any;

  applySketchShelves({
    shelves: [
      { id: 's1', yNorm: 0.25, variant: 'regular' } as any,
      { id: 's2', yNorm: 0.5, variant: 'double' } as any,
    ],
    yFromNorm(raw: unknown) {
      return Number(raw) * 2;
    },
    findBoxAtY: () => null,
    braceCenterX: 0,
    braceShelfWidth: 0.9,
    regularShelfWidth: 0.84,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    regularDepth: 0.45,
    backZ: -0.275,
    woodThick: 0.02,
    shelfThick: 0.02,
    effectiveTopY: 1.8,
    showContentsEnabled: true,
    addFoldedClothes: (...call: any[]) => folded.push(call),
    contentsPolicy: {
      showContentsEnabled: true,
      sketchMode: true,
      addOutlines: () => undefined,
      cfgSnapshot: { isLibraryMode: true },
    },
    currentShelfMat: { id: 'shelf' },
    currentBraceShelfMat: { id: 'brace-shelf' },
    glassMat: null,
    createBoard: (...call: any[]) => {
      boards.push(call);
      return { userData: {} };
    },
    group,
    THREE: null,
    addBraceDarkSeams: () => undefined,
    addShelfPins: () => undefined,
  });

  assert.equal(boards.length, 2);
  assert.equal(folded.length, 2);
  assert.equal(folded[0][4], group);
  assert.equal(Number(folded[0][1].toFixed(3)), 0.51);
  assert.equal(Number(folded[0][5].toFixed(3)), 0.464);
  assert.equal(Number(folded[1][5].toFixed(3)), 0.774);
  assert.equal(folded[0][7].showContentsEnabled, true);
  assert.equal(folded[0][7].sketchMode, true);
  assert.equal(typeof folded[0][7].addOutlines, 'function');
  assert.equal(folded[0][7].cfgSnapshot.isLibraryMode, true);
});

test('render interior sketch support rejects string-encoded shelf and storage geometry', () => {
  const shelfBoards: any[] = [];
  applySketchShelves({
    shelves: [
      { id: 'legacy-depth', yNorm: 0.25, variant: 'regular', depthM: '0.22' } as any,
      { id: 'typed-depth', yNorm: 0.75, variant: 'regular', depthM: 0.22 } as any,
    ],
    yFromNorm(raw: unknown) {
      return typeof raw === 'number' ? raw * 2 : null;
    },
    findBoxAtY: () => null,
    braceCenterX: 0,
    braceShelfWidth: 0.9,
    regularShelfWidth: 0.84,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    regularDepth: 0.45,
    backZ: -0.275,
    woodThick: 0.02,
    shelfThick: 0.02,
    effectiveTopY: 1.8,
    showContentsEnabled: false,
    addFoldedClothes: () => undefined,
    contentsPolicy: {},
    currentShelfMat: { id: 'shelf' },
    currentBraceShelfMat: { id: 'brace-shelf' },
    moduleKeyStr: 'm1',
    glassMat: null,
    createBoard: (...call: any[]) => {
      shelfBoards.push(call);
      return { userData: {} };
    },
    group: { add() {} } as any,
    THREE: null,
    addBraceDarkSeams: () => undefined,
    addShelfPins: () => undefined,
  });

  assert.equal(shelfBoards.length, 2);
  assert.equal(shelfBoards[0][2], 0.45);
  assert.equal(shelfBoards[1][2], 0.22);

  const storageBoards: any[] = [];
  applySketchStorageBarriers({
    storageBarriers: [
      { id: 'legacy', yNorm: '0.5', heightM: '0.2' } as any,
      { id: 'typed', yNorm: 0.5, heightM: 0.2 } as any,
    ],
    effectiveBottomY: 0,
    effectiveTopY: 1,
    spanH: 1,
    woodThick: 0.02,
    innerW: 0.8,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    moduleKeyStr: 'm1',
    bodyMat: { id: 'body' },
    isFn: (value: unknown): value is (...args: unknown[]) => unknown => typeof value === 'function',
    createBoard: (...call: any[]) => {
      storageBoards.push(call);
      return {};
    },
  });

  assert.equal(storageBoards.length, 1);
  assert.equal(storageBoards[0][7], 'sketch_storage_m1_typed');
});

test('removed frame side sketch shelves preserve glass and double variants on forced brace geometry', () => {
  const boards: any[] = [];
  const pins: any[] = [];
  const group = { add() {} } as any;
  const glassMat = new FakeMaterial({ id: 'glass-shelf' });

  applySketchShelves({
    shelves: [
      { id: 'double', yNorm: 0.25, variant: 'double' } as any,
      { id: 'glass', yNorm: 0.5, variant: 'glass' } as any,
    ],
    yFromNorm(raw: unknown) {
      return Number(raw) * 2;
    },
    findBoxAtY: () => null,
    braceCenterX: 0.1,
    braceShelfWidth: 0.9,
    regularShelfWidth: 0.84,
    internalCenterX: 0,
    internalDepth: 0.55,
    internalZ: 0,
    regularDepth: 0.45,
    backZ: -0.275,
    woodThick: 0.02,
    shelfThick: 0.02,
    effectiveTopY: 1.8,
    showContentsEnabled: false,
    addFoldedClothes: () => undefined,
    contentsPolicy: {
      showContentsEnabled: false,
      sketchMode: false,
      addOutlines: null,
      cfgSnapshot: { isLibraryMode: false },
    },
    currentShelfMat: { id: 'regular-shelf' },
    currentBraceShelfMat: { id: 'brace-shelf' },
    glassMat,
    createBoard: (...call: any[]) => {
      const mesh = { userData: {}, material: call[6], castShadow: true, receiveShadow: true };
      boards.push({ call, mesh });
      return mesh;
    },
    group,
    THREE: null,
    addBraceDarkSeams: () => undefined,
    addShelfPins: (...call: any[]) => pins.push(call),
    forceBraceShelves: true,
    roundedShelfSide: 'left',
  });

  assert.equal(boards.length, 2);
  assert.equal(boards[0].call[0], 0.9);
  assert.equal(Number(boards[0].call[1].toFixed(3)), 0.04);
  assert.equal(boards[0].call[2], 0.55);
  assert.deepEqual(boards[0].call[8], { shape: 'rounded_shelf', roundedShelfSide: 'left' });
  assert.equal(boards[0].mesh.userData.__wpShelfVariant, 'double');
  assert.equal(boards[0].mesh.userData.__wpShelfIsBrace, true);

  assert.equal(boards[1].call[0], 0.9);
  assert.equal(boards[1].call[1], 0.018);
  assert.equal(boards[1].call[2], 0.55);
  assert.equal(boards[1].call[6], glassMat);
  assert.equal(boards[1].mesh.userData.__wpShelfVariant, 'glass');
  assert.equal(boards[1].mesh.userData.__wpShelfIsBrace, true);
  assert.deepEqual(boards[1].call[8], { shape: 'rounded_shelf', roundedShelfSide: 'left' });
  assert.deepEqual(
    pins.map(call => call[6]),
    [false, false]
  );
});

test('render interior sketch module shelves keep brace shelves on the brace material path', () => {
  const regularShelfMat = new FakeMaterial({ id: 'regular-shelf' });
  const braceShelfMat = new FakeMaterial({ id: 'brace-shelf' });
  const { boards, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        shelves: [
          { id: 'regular', yNorm: 0.3, variant: 'regular' },
          { id: 'brace', yNorm: 0.6, variant: 'brace' },
        ],
      },
      currentShelfMat: regularShelfMat,
      currentBraceShelfMat: braceShelfMat,
      getPartMaterial: undefined,
      getPartColorValue: undefined,
    })
  );

  const regularShelf = boards.find(board => board.userData.__wpShelfVariant === 'regular');
  const braceShelf = boards.find(board => board.userData.__wpShelfVariant === 'brace');

  assert.equal(ok, true);
  assert.equal(regularShelf?.material, regularShelfMat);
  assert.equal(braceShelf?.material, braceShelfMat);
  assert.equal(braceShelf?.userData.__wpShelfIsBrace, true);
  assert.equal(
    regularShelf?.geometry.parameters.width,
    1.2 - INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM
  );
  assert.equal(braceShelf?.geometry.parameters.width, 1.2);
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

  assert.deepEqual(created, [{ y: 0.7, hangClothes: true, singleHanger: true, limit: null }]);
  assert.equal(added.length, 0);

  const reports: any[] = [];

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
    reportSoft(op, error) {
      reports.push({ op, error });
    },
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].op, 'applyInteriorSketchExtras.rods.installedOwnerRejected');
  assert.match(
    String(reports[0].error?.message || reports[0].error),
    /installed rod owner rejected sketch rod/
  );
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
