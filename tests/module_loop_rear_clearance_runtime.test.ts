import test from 'node:test';
import assert from 'node:assert/strict';

import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import { createInterDivider } from '../esm/native/builder/module_loop_pipeline_module_dividers.ts';
import { applyHexCellGeometryForModule } from '../esm/native/builder/module_loop_pipeline_hex_cell.ts';

function closeTo(actual: number, expected: number, message?: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message || 'values should match'}: ${actual} !== ${expected}`
  );
}

test('custom module full-depth divider side walls are shortened behind the back panel', () => {
  const calls: unknown[][] = [];
  const runtime = {
    D: 0.55,
    woodThick: 0.018,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 1 }],
    moduleCfgList: [
      { specialDims: { depthCm: 75, baseDepthCm: 55 } },
      { specialDims: { depthCm: 75, baseDepthCm: 55 } },
    ],
    moduleIsCustom: [true, true],
    moduleBodyHeights: [2.4, 2.4],
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { args };
    },
    getPartMaterial: (partId: string) => ({ partId }),
  } as any;
  const state = { currentX: -0.25 } as any;
  const frame = {
    modWidth: 0.5,
    moduleTotalDepth: 0.75,
    moduleOuterZ: -runtime.D / 2 + 0.75 / 2,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 2);
  const expectedBackFaceZ = -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM;
  for (const call of calls) {
    const depth = Number(call[2]);
    const z = Number(call[5]);
    closeTo(
      depth,
      0.75 - CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
      'divider depth should be rear-cleared'
    );
    closeTo(
      z - depth / 2,
      expectedBackFaceZ,
      'divider back face should sit in front of the masonite back panel'
    );
    closeTo(
      z + depth / 2,
      -runtime.D / 2 + 0.75,
      'divider front face should keep the requested module depth'
    );
  }
});

test('inset hinged regular internal divider reaches the front frame like the outer carcass sides', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'hinged', doorMountMode: 'inset' },
    D: 0.6,
    woodThick: 0.036,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 1 }],
    moduleCfgList: [{}, {}],
    moduleIsCustom: [false, false],
    moduleBodyHeights: [2.4, 2.4],
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { args };
    },
    getPartMaterial: (partId: string) => ({ partId }),
  } as any;
  const state = { currentX: -0.5 } as any;
  const frame = {
    modWidth: 0.5,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.6,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 1);
  const call = calls[0];
  const depth = Number(call[2]);
  const z = Number(call[5]);
  closeTo(
    z + depth / 2,
    runtime.D / 2,
    'inset regular divider front face should reach the cabinet front plane'
  );
  closeTo(
    z - depth / 2,
    -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    'inset regular divider should keep the same rear clearance as carcass sides'
  );
});

test('overlay hinged regular internal divider keeps the existing shorter internal depth', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'hinged', doorMountMode: 'overlay' },
    D: 0.6,
    woodThick: 0.018,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 1 }],
    moduleCfgList: [{}, {}],
    moduleIsCustom: [false, false],
    moduleBodyHeights: [2.4, 2.4],
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { args };
    },
    getPartMaterial: (partId: string) => ({ partId }),
  } as any;
  const state = { currentX: -0.5 } as any;
  const frame = {
    modWidth: 0.5,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.6,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 1);
  closeTo(Number(calls[0][2]), frame.moduleInternalDepth, 'overlay divider depth should stay unchanged');
  closeTo(Number(calls[0][5]), frame.moduleInternalZ, 'overlay divider z should stay unchanged');
});

test('hex-cell horizontal boards extend the frame without overlapping the carcass rectangle', () => {
  const meshes: any[] = [];
  class Shape {
    points: Array<{ x: number; z: number }> = [];
    moveTo(x: number, z: number): void {
      this.points.push({ x, z });
    }
    lineTo(x: number, z: number): void {
      this.points.push({ x, z });
    }
    closePath(): void {}
  }
  class ExtrudeGeometry {
    shape: Shape;
    opts: Record<string, unknown>;
    constructor(shape: Shape, opts: Record<string, unknown>) {
      this.shape = shape;
      this.opts = opts;
    }
  }
  class BoxGeometry {
    width: number;
    height: number;
    depth: number;
    constructor(width: number, height: number, depth: number) {
      this.width = width;
      this.height = height;
      this.depth = depth;
    }
  }
  class Mesh {
    geometry: unknown;
    material: unknown;
    position = { set: (x: number, y: number, z: number) => Object.assign(this, { x, y, z }) };
    rotation: Record<string, number> = {};
    userData: unknown;
    castShadow = false;
    receiveShadow = false;
    constructor(geometry: unknown, material: unknown) {
      this.geometry = geometry;
      this.material = material;
    }
  }

  const runtime = {
    App: { render: { wardrobeGroup: { add: (mesh: unknown) => meshes.push(mesh) } } },
    THREE: { Shape, ExtrudeGeometry, BoxGeometry, Mesh },
    D: 0.55,
    woodThick: 0.018,
    startY: 0,
    stackKey: 'top',
    bodyMat: { id: 'body' },
    getPartMaterial: (partId: string) => ({ partId }),
    addOutlines: () => null,
  } as any;
  const frame = {
    config: { hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } },
    modWidth: 0.8,
    moduleCenterX: 0,
    moduleCabinetBodyHeight: 2.4,
  } as any;

  applyHexCellGeometryForModule(runtime, { currentX: -0.4 } as any, 0, frame);

  assert.ok(meshes.length >= 2);
  assert.equal(meshes[0].userData.partId, 'body_floor');
  assert.equal(meshes[0].userData.kind, 'hexCellHorizontal');
  assert.equal(meshes[1].userData.partId, 'body_ceil');
  assert.equal(meshes[1].userData.kind, 'hexCellHorizontal');
  const floor = meshes[0].geometry as ExtrudeGeometry;
  const points = floor.shape.points;
  const expectedCarcassFrontZ =
    -runtime.D / 2 +
    CARCASS_SHELL_DIMENSIONS.backInsetZM +
    Math.max(
      CARCASS_SHELL_DIMENSIONS.boardMinDepthM,
      0.45 - (CARCASS_SHELL_DIMENSIONS.backInsetZM + CARCASS_SHELL_DIMENSIONS.frontInsetZM)
    );
  const expectedDoorZ = runtime.D / 2;
  assert.equal(points.length, 4);
  closeTo(
    points[0].z,
    expectedCarcassFrontZ,
    'hex extension rear-left edge should start at the carcass front'
  );
  closeTo(
    points[1].z,
    expectedCarcassFrontZ,
    'hex extension rear-right edge should start at the carcass front'
  );
  closeTo(points[2].z, expectedDoorZ, 'hex extension front-right edge should keep the requested front');
  closeTo(points[3].z, expectedDoorZ, 'hex extension front-left edge should keep the requested front');

  meshes.length = 0;
  runtime.stackKey = 'bottom';
  applyHexCellGeometryForModule(runtime, { currentX: -0.4 } as any, 0, frame);
  assert.equal(meshes[0].userData.partId, 'lower_body_floor');
  assert.equal(meshes[1].userData.partId, 'lower_body_ceil');
});

test('hex-cell diagonal panel renders as stationary glass visual when glass style is painted on it', () => {
  const added: any[] = [];
  const visualCalls: unknown[][] = [];
  class Shape {
    points: Array<{ x: number; z: number }> = [];
    moveTo(x: number, z: number): void {
      this.points.push({ x, z });
    }
    lineTo(x: number, z: number): void {
      this.points.push({ x, z });
    }
    closePath(): void {}
  }
  class ExtrudeGeometry {
    constructor(
      public shape: Shape,
      public opts: Record<string, unknown>
    ) {}
  }
  class BoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  }
  class Mesh {
    position = { set: (x: number, y: number, z: number) => Object.assign(this, { x, y, z }) };
    rotation: Record<string, number> = {};
    userData: Record<string, unknown> = {};
    castShadow = false;
    receiveShadow = false;
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  class Group {
    children: unknown[] = [];
    parent = null;
    position = { set: (x: number, y: number, z: number) => Object.assign(this, { x, y, z }) };
    rotation: Record<string, number> = {};
    scale = { set: () => undefined };
    userData: Record<string, unknown> = {};
    add(child: unknown) {
      this.children.push(child);
    }
    remove() {}
    traverse(fn: (value: unknown) => void) {
      fn(this);
      for (const child of this.children) fn(child);
    }
  }

  const runtime = {
    App: { render: { wardrobeGroup: { add: (mesh: unknown) => added.push(mesh) } } },
    THREE: { Shape, ExtrudeGeometry, BoxGeometry, Mesh },
    cfg: {
      doorSpecialMap: { hex_cell_1_diag_left: 'glass' },
      curtainMap: { hex_cell_1_diag_left: 'none' },
      doorStyleMap: { hex_cell_1_diag_left: 'double_profile' },
    },
    D: 0.55,
    woodThick: 0.018,
    startY: 0,
    stackKey: 'top',
    doorStyle: 'flat',
    bodyMat: { id: 'body' },
    globalFrontMat: { id: 'front' },
    getPartMaterial: (partId: string) => ({ partId }),
    addOutlines: () => null,
    createDoorVisual: (...args: unknown[]) => {
      visualCalls.push(args);
      const visual = new Group();
      visual.add(new Mesh('glass-center', 'mat'));
      return visual;
    },
  } as any;
  const frame = {
    config: { hexCell: { enabled: true, protrusionCm: 10, doorWidthCm: 40 } },
    modWidth: 0.8,
    moduleCenterX: 0,
    moduleCabinetBodyHeight: 2.4,
  } as any;

  applyHexCellGeometryForModule(runtime, { currentX: -0.4 } as any, 0, frame);

  assert.equal(visualCalls.length, 1);
  assert.equal(visualCalls[0][4], 'glass');
  assert.equal((visualCalls[0][13] as { glassFrameStyle?: string }).glassFrameStyle, 'double_profile');
  const glassVisual = added.find(item => item instanceof Group) as Group | undefined;
  assert.ok(glassVisual, 'painted diagonal should be rendered as a visual group, not a plain wood board');
  assert.equal(glassVisual!.userData.partId, 'hex_cell_1_diag_left');
  assert.equal(glassVisual!.userData.kind, 'hexCellDiagonal');
  assert.equal(glassVisual!.userData.__wpStationaryGlassPanel, true);
  assert.equal(typeof glassVisual!.userData.__doorWidth, 'number');
  assert.equal(glassVisual!.children[0].userData.partId, 'hex_cell_1_diag_left');
});
