import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxContents } from '../esm/native/builder/render_interior_sketch_boxes_contents.ts';

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
  rotation = new FakeVector3();
  position = new FakeVector3();
  userData: Record<string, unknown> = {};
  castShadow = true;
  receiveShadow = true;
  renderOrder = 0;
  geometry: any;
  material: any;
  constructor(geometry: any, material: any) {
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeCylinderGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMeshStandardMaterial {
  opts: Record<string, unknown>;
  __keepMaterial?: boolean;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

function createBaseArgs() {
  const boards: any[] = [];
  const rodMeshes: any[] = [];
  const shelfPins: any[] = [];
  const seamCalls: any[] = [];
  const drawerRuns: any[] = [];
  const args: any = {
    shell: {
      box: {
        shelves: [],
        storageBarriers: [],
        rods: [],
        drawers: [],
      },
      boxPid: 'box_0',
      centerY: 1,
      height: 1.2,
      halfH: 0.6,
      sideH: 1.16,
      boxMat: { id: 'box-mat' },
      geometry: {
        centerX: 0,
        innerW: 0.8,
        innerD: 0.5,
        innerBackZ: -0.25,
      },
      innerBottomY: 0.4,
      innerTopY: 1.6,
      regularDepth: 0.44,
      frontZ: 0.25,
    },
    boxDividers: [{ id: 'mid', xNorm: 0.75 }],
    yFromBoxNorm(rawNorm: unknown, itemHalfH: number) {
      const norm = Number(rawNorm);
      if (!Number.isFinite(norm)) return null;
      return 0.4 + itemHalfH + norm * (1.2 - itemHalfH * 2);
    },
    resolveBoxDrawerSpan() {
      return {
        segment: null,
        innerW: 0.6,
        innerCenterX: 0.2,
        outerW: 0.66,
        outerCenterX: 0.2,
        faceW: 0.66,
        faceCenterX: 0.2,
      };
    },
    args: {
      App: {},
      input: {
        moduleKey: 'm1',
        createInternalDrawerBox: () => ({}),
        addOutlines: () => {},
        showContentsEnabled: true,
        addFoldedClothes: () => {},
      },
      createBoard: (...boardArgs: any[]) => {
        const entry = { args: boardArgs, userData: {} };
        boards.push(entry);
        return entry;
      },
      group: {
        add(mesh: unknown) {
          rodMeshes.push(mesh);
          return mesh;
        },
      },
      woodThick: 0.02,
      moduleIndex: 3,
      currentShelfMat: { id: 'shelf-mat' },
      bodyMat: { id: 'body-mat' },
      getPartMaterial: (partId: string) => ({ id: `part:${partId}` }),
      getPartColorValue: () => 'oak',
      THREE: {
        Mesh: FakeMesh,
        CylinderGeometry: FakeCylinderGeometry,
        MeshStandardMaterial: FakeMeshStandardMaterial,
      },
      glassMat: { id: 'glass-mat' },
      addBraceDarkSeams: (...seamArgs: any[]) => seamCalls.push(seamArgs),
      addShelfPins: (...pinArgs: any[]) => shelfPins.push(pinArgs),
      isFn: (value: unknown) => typeof value === 'function',
      renderOpsHandleCatch: () => {
        throw new Error('unexpected catch');
      },
      applyInternalDrawersOps: (payload: unknown) => drawerRuns.push(payload),
    },
  };
  return { args, boards, rodMeshes, shelfPins, seamCalls, drawerRuns };
}

test('render sketch box contents keeps divider-aware static parts and reuses rod material across placements', () => {
  const { args, boards, rodMeshes, shelfPins, seamCalls } = createBaseArgs();
  args.shell.box = {
    shelves: [{ id: 'brace1', yNorm: 0.25, variant: 'brace', xNorm: 0.75 }],
    storageBarriers: [{ id: 'bar1', yNorm: 0.5, heightM: 0.3, xNorm: 0.75 }],
    rods: [
      { id: 'rod1', yNorm: 0.7, xNorm: 0.25 },
      { id: 'rod2', yNorm: 0.72, xNorm: 0.75 },
    ],
    drawers: [],
  };

  renderSketchBoxContents(args);

  assert.equal(boards.length, 3);
  assert.equal(String(boards[0].args[7]), 'box_0_divider_mid');
  assert.equal(String(boards[1].args[7]), 'box_0_shelf_brace1');
  assert.equal(String(boards[2].args[7]), 'box_0_storage_bar1');
  assert.ok(boards[0].args[3] > 0);
  assert.ok(boards[2].args[3] > 0);
  assert.equal(rodMeshes.length, 2);
  assert.equal(rodMeshes[0].userData.partId, 'box_0_rod_rod1');
  assert.equal(rodMeshes[1].userData.partId, 'box_0_rod_rod2');
  assert.notEqual(rodMeshes[0].position.x, rodMeshes[1].position.x);
  assert.equal(rodMeshes[0].material, rodMeshes[1].material);
  assert.equal(rodMeshes[0].material.__keepMaterial, true);
  assert.equal(shelfPins.length, 1);
  assert.equal(seamCalls.length, 1);
});

test('render sketch box contents emits paired internal drawer ops with clamped stack placement', () => {
  const { args, drawerRuns } = createBaseArgs();
  args.shell.box = {
    shelves: [],
    storageBarriers: [],
    rods: [],
    drawers: [{ id: 'd1', yNormC: 0.5 }],
  };

  renderSketchBoxContents(args);

  assert.equal(drawerRuns.length, 1);
  const payload: any = drawerRuns[0];
  assert.equal(payload.ops.length, 2);
  assert.equal(payload.ops[0].partId, 'box_0_int_drawers_d1');
  assert.equal(payload.ops[1].partId, 'box_0_int_drawers_d1');
  assert.equal(payload.ops[0].moduleIndex, 'm1');
  assert.ok(Math.abs(payload.ops[0].x - 0.2) < 1e-9);
  assert.ok(Math.abs(payload.ops[1].x - 0.2) < 1e-9);
  assert.ok(payload.ops[1].y > payload.ops[0].y);
  assert.ok(payload.ops[0].height > 0);
  assert.ok(payload.ops[0].depth > 0.05);
});
