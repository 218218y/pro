import test from 'node:test';
import assert from 'node:assert/strict';

import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
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

test('overlay hinged regular internal divider matches the outer carcass side depth', () => {
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
  const depth = Number(calls[0][2]);
  const z = Number(calls[0][5]);
  closeTo(
    depth,
    runtime.D - CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    'overlay divider depth should match the outer carcass side'
  );
  closeTo(z + depth / 2, runtime.D / 2, 'overlay divider front face should reach the cabinet front plane');
  closeTo(
    z - depth / 2,
    -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    'overlay divider should keep the same rear clearance as the outer carcass side'
  );
});

test('sliding wardrobe regular internal divider stays at shelf depth behind the door tracks', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'sliding' },
    D: 0.6,
    woodThick: 0.018,
    depthReduction: 0.075,
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
    moduleInternalDepth: 0.525,
    moduleInternalZ: -0.0325,
    moduleTotalDepth: 0.6,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 1);
  const depth = Number(calls[0][2]);
  const z = Number(calls[0][5]);
  closeTo(depth, frame.moduleInternalDepth, 'sliding divider depth should match the shelf volume');
  closeTo(z, frame.moduleInternalZ, 'sliding divider z should match the shelf volume');
  assert.ok(
    z + depth / 2 < runtime.D / 2,
    'sliding divider front face must stay behind the outer carcass front/door track plane'
  );
});

test('sliding depth-stepped divider halves each keep their matching internal shelf depth', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'sliding' },
    D: 0.7,
    woodThick: 0.018,
    depthReduction: 0.075,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 1 }],
    moduleCfgList: [{}, { specialDims: { depthCm: 55, baseDepthCm: 70 } }],
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
    moduleInternalDepth: 0.625,
    moduleInternalZ: -0.0325,
    moduleTotalDepth: 0.7,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 2);
  const left = calls.find(call => call[7] === 'divider_inter_depthL_0');
  const right = calls.find(call => call[7] === 'divider_inter_depthR_0');
  assert.ok(left);
  assert.ok(right);
  closeTo(Number(left[2]), frame.moduleInternalDepth);
  closeTo(Number(left[5]), frame.moduleInternalZ);
  closeTo(Number(right[2]), 0.55 - runtime.depthReduction);
  closeTo(Number(right[5]), -runtime.D / 2 + (0.55 - runtime.depthReduction) / 2 + 0.005);
});

test('regular depth-stepped divider halves each reach the front of their matching module depth', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'hinged', doorMountMode: 'overlay' },
    D: 0.7,
    woodThick: 0.018,
    depthReduction: 0.03,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 1 }],
    moduleCfgList: [{}, { specialDims: { depthCm: 55, baseDepthCm: 70 } }],
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
    moduleInternalDepth: 0.67,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.7,
  } as any;

  createInterDivider(runtime, state, 0, frame);

  assert.equal(calls.length, 2);
  const left = calls.find(call => call[7] === 'divider_inter_depthL_0');
  const right = calls.find(call => call[7] === 'divider_inter_depthR_0');
  assert.ok(left);
  assert.ok(right);

  const leftDepth = Number(left[2]);
  const leftZ = Number(left[5]);
  closeTo(leftZ + leftDepth / 2, -runtime.D / 2 + 0.7);
  closeTo(leftZ - leftDepth / 2, -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);

  const rightDepth = Number(right[2]);
  const rightZ = Number(right[5]);
  closeTo(rightZ + rightDepth / 2, -runtime.D / 2 + 0.55);
  closeTo(rightZ - rightDepth / 2, -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);
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

test('overlay divider next to a fixed left front closure reaches the cabinet front plane', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: { wardrobeType: 'hinged', doorMountMode: 'overlay', removedDoorsMap: { removed_body_left: true } },
    stackKey: 'top',
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
  const state = { currentX: -0.5, globalDoorCounter: 1 } as any;
  const frame = {
    modDoors: 1,
    modWidth: 0.5,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.6,
  } as any;
  const frontClosurePlan = {
    side: 'left' as const,
    partId: 'body_front_closure_left',
    startDoorId: 1,
    moduleDoors: 1,
  };

  createInterDivider(runtime, state, 0, frame, frontClosurePlan);

  assert.equal(calls.length, 1);
  const depth = Number(calls[0][2]);
  const z = Number(calls[0][5]);
  closeTo(z + depth / 2, runtime.D / 2, 'divider should continue alongside the closure to the front');
  closeTo(
    z - depth / 2,
    -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    'front-extended divider should keep the carcass rear clearance'
  );
});

test('lower overlay divider detects an intact right-side front closure in the next module', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: {
      wardrobeType: 'hinged',
      doorMountMode: 'overlay',
      removedDoorsMap: { removed_lower_body_right: true },
    },
    stackKey: 'bottom',
    D: 0.6,
    woodThick: 0.018,
    startY: 0,
    cabinetBodyHeight: 2.4,
    modules: [{ doors: 1 }, { doors: 2 }],
    moduleCfgList: [{}, {}],
    moduleIsCustom: [false, false],
    moduleBodyHeights: [2.4, 2.4],
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { args };
    },
    getPartMaterial: (partId: string) => ({ partId }),
  } as any;
  const state = { currentX: -0.5, globalDoorCounter: 1001 } as any;
  const frame = {
    modDoors: 1,
    modWidth: 0.5,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.6,
  } as any;

  createInterDivider(runtime, state, 0, frame, null);

  assert.equal(calls.length, 1);
  const depth = Number(calls[0][2]);
  const z = Number(calls[0][5]);
  closeTo(z + depth / 2, runtime.D / 2, 'divider should reach the front next to the right closure');
});

test('explicit right-door removal does not shorten the full-depth overlay divider', () => {
  const calls: unknown[][] = [];
  const runtime = {
    cfg: {
      wardrobeType: 'hinged',
      doorMountMode: 'overlay',
      removedDoorsMap: { removed_body_right: true, removed_d2_full: true },
    },
    stackKey: 'top',
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
  const state = { currentX: -0.5, globalDoorCounter: 1 } as any;
  const frame = {
    modDoors: 1,
    modWidth: 0.5,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
    moduleTotalDepth: 0.6,
  } as any;

  createInterDivider(runtime, state, 0, frame, null);

  assert.equal(calls.length, 1);
  const depth = Number(calls[0][2]);
  const z = Number(calls[0][5]);
  closeTo(z + depth / 2, runtime.D / 2);
  closeTo(z - depth / 2, -runtime.D / 2 + CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);
});
