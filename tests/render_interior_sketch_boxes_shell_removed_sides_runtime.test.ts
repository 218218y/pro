import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxShellFrame } from '../esm/native/builder/render_interior_sketch_boxes_shell_frame.ts';

function assertNearlyEqual(actual: number | undefined, expected: number): void {
  assert.ok(actual != null, 'expected a numeric value');
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${String(actual)} to be nearly ${String(expected)}`
  );
}

function createFrameHarness(removedDoorsMap: Record<string, unknown> = {}) {
  const boards: Array<{
    w: number;
    h: number;
    d: number;
    x: number;
    y: number;
    z: number;
    partId?: string | null;
  }> = [];

  const woodThick = 0.018;
  const boxPid = 'sketch_box_free_0_alpha';
  const state = {
    box: { id: 'alpha', freePlacement: true },
    boxId: 'alpha',
    boxPid,
    isFreePlacement: true,
    height: 0.8,
    halfH: 0.4,
    centerY: 1.2,
    sideH: 0.764,
    boxMat: { name: 'boxMat' },
    innerBottomY: 0.818,
    innerTopY: 1.582,
    regularDepth: 0.35,
    frontZ: 0.55,
    geometry: {
      outerW: 1,
      innerW: 1 - woodThick * 2,
      centerX: 0.25,
      outerD: 0.5,
      centerZ: 0.3,
      innerBackZ: 0.059,
      innerD: 0.482,
    },
  } as any;

  const renderArgs = {
    createBoard(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      _mat: unknown,
      partId?: string | null
    ) {
      const mesh = { userData: partId ? { partId } : {} };
      boards.push({ w, h, d, x, y, z, partId });
      return mesh;
    },
    group: {},
    moduleKeyStr: '0',
    input: { cfgSnapshot: { removedDoorsMap } },
    getPartMaterial: null,
    THREE: null,
    addDimensionLine: null,
    renderFreeBoxDimensionsEnabled: false,
    freeBoxDimensionEntries: null,
    woodThick,
  } as any;

  return { boards, boxPid, renderArgs, state, woodThick };
}

test('sketch-box shell caps keep the full outer span when no side is removed', () => {
  const { boards, renderArgs, state } = createFrameHarness();

  renderSketchBoxShellFrame({ state, renderArgs });

  assert.equal(boards[0]?.partId, state.boxPid);
  assert.equal(boards[1]?.partId, state.boxPid);
  assert.equal(boards[0]?.w, state.geometry.outerW);
  assert.equal(boards[1]?.w, state.geometry.outerW);
  assertNearlyEqual(boards[0]?.x, state.geometry.centerX);
  assertNearlyEqual(boards[1]?.x, state.geometry.centerX);
});

test('sketch-box shell caps are trimmed only on the removed free-box side', () => {
  const { boards, boxPid, renderArgs, state, woodThick } = createFrameHarness({
    removed_sketch_box_free_0_alpha_side_left: true,
  });

  renderSketchBoxShellFrame({ state, renderArgs });

  const top = boards[0];
  const bottom = boards[1];
  assert.ok(top && bottom);
  assert.equal(top.w, state.geometry.outerW - woodThick);
  assert.equal(bottom.w, state.geometry.outerW - woodThick);
  assertNearlyEqual(top.x, state.geometry.centerX + woodThick / 2);
  assertNearlyEqual(bottom.x, state.geometry.centerX + woodThick / 2);
  assert.equal(boards[2]?.partId, `${boxPid}_side_left`);
  assert.equal(boards[3]?.partId, `${boxPid}_side_right`);
});

test('sketch-box shell caps align with the back panel span when both free-box sides are removed', () => {
  const { boards, renderArgs, state } = createFrameHarness({
    removed_sketch_box_free_0_alpha_side_left: true,
    removed_sketch_box_free_0_alpha_side_right: true,
  });

  renderSketchBoxShellFrame({ state, renderArgs });

  assert.equal(boards[0]?.w, state.geometry.innerW);
  assert.equal(boards[1]?.w, state.geometry.innerW);
  assertNearlyEqual(boards[0]?.x, state.geometry.centerX);
  assertNearlyEqual(boards[1]?.x, state.geometry.centerX);
  assert.equal(boards[4]?.w, state.geometry.innerW);
  assert.equal(boards[4]?.x, state.geometry.centerX);
});

test('free-placement sketch-box hex shell renders diagonal carcass panels and full-depth dimensions', () => {
  const { boards, renderArgs, state, boxPid, woodThick } = createFrameHarness();
  const addedMeshes: any[] = [];

  class Shape {
    points: Array<{ x: number; y: number }> = [];
    moveTo(x: number, y: number) {
      this.points.push({ x, y });
    }
    lineTo(x: number, y: number) {
      this.points.push({ x, y });
    }
    closePath() {}
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
    parameters: Record<string, number>;
    constructor(width: number, height: number, depth: number) {
      this.parameters = { width, height, depth };
    }
  }
  class Mesh {
    userData: Record<string, unknown> = {};
    castShadow = false;
    receiveShadow = false;
    rotation: Record<string, number> = {};
    position = {
      set: (x: number, y: number, z: number) => {
        this.userData.__position = { x, y, z };
      },
    };
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }

  state.hexGeometry = {
    enabled: true,
    moduleWidthM: state.geometry.outerW,
    doorWidthM: 0.5,
    doorDepthM: 0.65,
    sideDepthM: 0.45,
    protrusionM: 0.1,
    diagonalDepthM: 0.2,
  };
  state.backZ = 0.05;
  state.fullDepth = 0.65;
  state.frontZ = state.backZ + state.hexGeometry.doorDepthM;
  state.geometry.outerD = state.hexGeometry.sideDepthM;
  state.geometry.centerZ = state.backZ + state.hexGeometry.sideDepthM / 2;

  const freeBoxDimensionEntries: any[] = [];
  renderArgs.THREE = { Shape, ExtrudeGeometry, BoxGeometry, Mesh };
  renderArgs.group = { add: (mesh: unknown) => addedMeshes.push(mesh) };
  renderArgs.input.addOutlines = () => {};
  renderArgs.renderFreeBoxDimensionsEnabled = true;
  renderArgs.addDimensionLine = () => {};
  renderArgs.freeBoxDimensionEntries = freeBoxDimensionEntries;

  renderSketchBoxShellFrame({ state, renderArgs });

  assert.equal(boards.length, 3, 'hex shell should still use regular side/back boards only');
  const addedPartIds = addedMeshes.map(mesh => mesh.userData?.partId);
  assert.equal(addedPartIds.filter(partId => partId === boxPid).length, 2);
  assert.ok(addedPartIds.includes(`${boxPid}_hex_diag_left`));
  assert.ok(addedPartIds.includes(`${boxPid}_hex_diag_right`));

  const diagonal = addedMeshes.find(mesh => mesh.userData?.partId === `${boxPid}_hex_diag_left`);
  assert.equal(diagonal?.userData?.__wpSketchBoxId, state.boxId);
  assert.equal(diagonal?.userData?.__wpSketchFreePlacement, true);
  assert.equal(diagonal?.geometry?.parameters?.height, state.sideH);
  assert.equal(diagonal?.geometry?.parameters?.depth, woodThick);

  assert.equal(freeBoxDimensionEntries.length, 1);
  assert.equal(freeBoxDimensionEntries[0].depth, state.fullDepth);
  assertNearlyEqual(freeBoxDimensionEntries[0].centerZ, state.backZ + state.fullDepth / 2);
});
