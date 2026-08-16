import test from 'node:test';
import assert from 'node:assert/strict';

import { INTERIOR_ROD_RENDER_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_ROD_PREVIEW_POLICY,
} from '../esm/shared/dimensions/sketch_box_preview_policy.ts';
import { renderSketchBoxContentRods } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';
import { resolveSketchBoxVerticalContentPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts';
import { resolveSketchBoxRodPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts';
import { decodeSketchStructuralCommandHover } from '../esm/native/services/canvas_picking_sketch_structural_command.ts';

const EPS = 1e-12;
const closeTo = (actual: unknown, expected: number) => {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(Number(actual) - expected) <= EPS, `${String(actual)} != ${expected}`);
};

type FakeMesh = {
  geometry: { args: unknown[] };
  material: unknown;
  rotation: { z?: number };
  position: { values?: unknown[]; set: (...args: unknown[]) => void };
  userData: Record<string, unknown>;
};

function createThree(options: { throwOnKeepMaterial?: boolean } = {}) {
  const materials: Array<Record<string, unknown>> = [];
  const geometries: Array<{ args: unknown[] }> = [];
  const meshes: FakeMesh[] = [];

  class MeshStandardMaterial {
    [key: string]: unknown;
    constructor(properties: Record<string, unknown>) {
      Object.assign(this, properties);
      if (options.throwOnKeepMaterial) {
        Object.defineProperty(this, '__keepMaterial', {
          set() {
            throw new Error('tagging failed');
          },
        });
      }
      materials.push(this);
    }
  }

  class CylinderGeometry {
    args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
      geometries.push(this);
    }
  }

  class Mesh implements FakeMesh {
    geometry: { args: unknown[] };
    material: unknown;
    rotation: { z?: number } = {};
    position = {
      values: undefined as unknown[] | undefined,
      set: (...args: unknown[]) => {
        this.position.values = args;
      },
    };
    userData: Record<string, unknown> = {};
    constructor(geometry: { args: unknown[] }, material: unknown) {
      this.geometry = geometry;
      this.material = material;
      meshes.push(this);
    }
  }

  return { THREE: { MeshStandardMaterial, CylinderGeometry, Mesh }, materials, geometries, meshes };
}

function renderRods(options: {
  rods?: unknown;
  three?: ReturnType<typeof createThree>['THREE'] | null;
  woodThick?: number;
  innerW?: number;
  innerD?: number;
  innerBackZ?: number;
  centerX?: number;
  dividers?: unknown[];
  horizontalDividers?: unknown[];
  yFromBoxNorm?: (value: unknown, halfH: number) => number | null;
  rootState?: unknown;
}) {
  const added: FakeMesh[] = [];
  renderSketchBoxContentRods({
    shell: {
      box: { rods: options.rods ?? [] },
      boxId: 'box-a',
      boxPid: 'module_2_box_box-a',
      isFreePlacement: false,
      height: 1,
      halfH: 0.5,
      centerY: 1,
      sideH: 1,
      boxMat: {},
      geometry: {
        outerW: options.innerW ?? 1,
        innerW: options.innerW ?? 1,
        centerX: options.centerX ?? 0,
        outerD: options.innerD ?? 0.5,
        centerZ: 0,
        innerBackZ: options.innerBackZ ?? -0.25,
        innerD: options.innerD ?? 0.5,
      },
      hexGeometry: null,
      fullDepth: options.innerD ?? 0.5,
      backZ: options.innerBackZ ?? -0.25,
      innerBottomY: 0.5,
      innerTopY: 1.5,
      regularDepth: options.innerD ?? 0.5,
      frontZ: 0.25,
    },
    boxDividers: (options.dividers ?? []) as never[],
    boxHorizontalDividers: (options.horizontalDividers ?? []) as never[],
    yFromBoxNorm: options.yFromBoxNorm ?? ((value, halfH) => 0.5 + Number(value) + halfH),
    resolveBoxDrawerSpan: () => {
      throw new Error('unused');
    },
    args: {
      App: {
        store: {
          getState: () =>
            options.rootState ?? {
              ui: { raw: { width: 100, height: 240, depth: 60 } },
              config: { roomArchitecture: { backWall: { enabled: false } } },
              runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
            },
        },
      },
      group: { add: (mesh: FakeMesh) => added.push(mesh) },
      woodThick: options.woodThick ?? 0.02,
      THREE: options.three ?? undefined,
    },
  } as never);
  return added;
}

function roomArchitectureForSketchRodColumn(column: { offsetLeftCm: number; widthCm: number }) {
  return {
    backWall: { enabled: true, widthCm: 200, heightCm: 280, wardrobeOffsetLeftCm: 0 },
    leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
    rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
    column: {
      enabled: true,
      offsetLeftCm: column.offsetLeftCm,
      widthCm: column.widthCm,
      depthCm: 45,
      heightCm: 220,
      bottomOffsetCm: 0,
    },
    wallColor: '#f2efe6',
    surfacesHidden: false,
  };
}

function sketchRodColumnRootState(column: { offsetLeftCm: number; widthCm: number }) {
  return {
    ui: { raw: { width: 100, height: 240, depth: 60 } },
    config: { roomArchitecture: roomArchitectureForSketchRodColumn(column) },
    runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
  };
}

function rodPreview(options: {
  targetBox?: unknown;
  targetHeight?: number;
  pointerX?: number;
  pointerY?: number;
  innerW?: number;
  innerD?: number;
  innerBackZ?: number;
  woodThick?: number;
  removeEpsShelf?: number;
}) {
  return resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_rod', moduleKey: 2, isBottom: false, ts: 7 },
    contentKind: 'rod',
    boxId: 'box-a',
    freePlacement: true,
    targetBox: options.targetBox ?? { id: 'box-a', rods: [] },
    targetGeo: {
      centerX: 0,
      innerW: options.innerW ?? 1,
      innerD: options.innerD ?? 0.5,
      innerBackZ: options.innerBackZ ?? -0.25,
    },
    targetCenterY: 1,
    targetHeight: options.targetHeight ?? 1,
    pointerX: options.pointerX ?? 0,
    pointerY: options.pointerY ?? 1,
    woodThick: options.woodThick ?? 0.02,
    removeEpsShelf: options.removeEpsShelf,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
}

function structuralCommand(record: unknown) {
  const decoded = decodeSketchStructuralCommandHover(record);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) assert.fail(decoded.reason);
  return decoded.value.command;
}

test('rod renderer preserves empty, missing THREE, invalid-entry and null-Y exits', () => {
  const three = createThree();
  assert.deepEqual(renderRods({ rods: [], three: three.THREE }), []);
  assert.deepEqual(renderRods({ rods: [{ id: 'r1', yNorm: 0.5 }], three: null }), []);
  const added = renderRods({
    rods: [null, { id: 'skip', yNorm: 0.5 }],
    three: three.THREE,
    yFromBoxNorm: () => null,
  });
  assert.deepEqual(added, []);
  assert.equal(three.geometries.length, 0);
});

test('rod renderer preserves focused sizing, scoped segment, mesh metadata and material properties', () => {
  const three = createThree();
  const halfHeights: number[] = [];
  const added = renderRods({
    rods: [{ id: 'left', yNorm: 0.5, xNorm: 0.25 }],
    three: three.THREE,
    dividers: [{ id: 'v', xNorm: 0.5 }],
    yFromBoxNorm: (_value, halfH) => {
      halfHeights.push(halfH);
      return 1.2;
    },
  });

  assert.equal(added.length, 1);
  assert.deepEqual(halfHeights, [INTERIOR_ROD_RENDER_POLICY.radiusM]);
  const mesh = added[0];
  assert.deepEqual(mesh.geometry.args.slice(0, 2), [
    INTERIOR_ROD_RENDER_POLICY.radiusM,
    INTERIOR_ROD_RENDER_POLICY.radiusM,
  ]);
  assert.equal(mesh.geometry.args[3], INTERIOR_ROD_RENDER_POLICY.radialSegments);
  assert.ok(Number(mesh.geometry.args[2]) < 0.5);
  assert.ok(Number(mesh.position.values?.[0]) < 0);
  closeTo(mesh.position.values?.[1], 1.2);
  closeTo(mesh.position.values?.[2], 0);
  closeTo(mesh.rotation.z, Math.PI / 2);
  assert.equal(mesh.userData.partId, 'module_2_box_box-a_rod_left');
  assert.equal(mesh.userData.__wpType, 'sketchRod');
  assert.equal(mesh.material, three.materials[0]);
  assert.equal(three.materials[0].color, 0x8a8a8a);
  assert.equal(three.materials[0].roughness, 0.35);
  assert.equal(three.materials[0].metalness, 0.8);
  assert.equal(three.materials[0].__keepMaterial, true);

  const minimum = createThree();
  renderRods({ rods: [{ yNorm: 0.5 }], three: minimum.THREE, innerW: 0.01 });
  closeTo(minimum.geometries[0].args[2], SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM);

  const clearance = createThree();
  renderRods({ rods: [{ yNorm: 0.5 }], three: clearance.THREE, innerW: 1 });
  closeTo(clearance.geometries[0].args[2], 1 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM);
});

test('sketch-box rod renderer applies the canonical room-column trim and removal policy', () => {
  const sideThree = createThree();
  const sideAdded = renderRods({
    rods: [{ id: 'side', yNorm: 0.5 }],
    three: sideThree.THREE,
    rootState: sketchRodColumnRootState({ offsetLeftCm: 0, widthCm: 20 }),
  });
  assert.equal(sideAdded.length, 1);
  assert.ok(Number(sideAdded[0].geometry.args[2]) < 1 - SKETCH_BOX_ROD_PREVIEW_POLICY.rodWidthClearanceM);
  assert.ok(Number(sideAdded[0].position.values?.[0]) > 0);

  const middleThree = createThree();
  assert.deepEqual(
    renderRods({
      rods: [{ id: 'middle', yNorm: 0.5 }],
      three: middleThree.THREE,
      rootState: sketchRodColumnRootState({ offsetLeftCm: 40, widthCm: 20 }),
    }),
    []
  );

  const shortThree = createThree();
  assert.deepEqual(
    renderRods({
      rods: [{ id: 'short', yNorm: 0.5 }],
      three: shortThree.THREE,
      rootState: sketchRodColumnRootState({ offsetLeftCm: 0, widthCm: 80 }),
    }),
    []
  );
});

test('rod renderer remains resilient when keep-material tagging throws', () => {
  const three = createThree({ throwOnKeepMaterial: true });
  const added = renderRods({ rods: [{ id: 'r1', yNorm: 0.5 }], three: three.THREE });
  assert.equal(added.length, 1);
  assert.equal(three.meshes.length, 1);
});

test('rod resolver uses focused radius, default remove epsilon, preview dimensions and hover fields', () => {
  let clampHalfHeight: number | null = null;
  let roomHeight: number | null = null;
  const result = resolveSketchBoxRodPreview(
    {
      host: { tool: 'sketch_rod', moduleKey: 2, isBottom: false, ts: 7 },
      contentKind: 'rod',
      boxId: 'box-a',
      freePlacement: true,
      targetBox: { id: 'box-a', rods: [] },
      targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
      targetCenterY: 1,
      targetHeight: 1,
      pointerX: 0,
      pointerY: 1.1,
      woodThick: 0.02,
      readSketchBoxDividers: () => [],
      resolveSketchBoxSegments: () => [],
      pickSketchBoxSegment: () => null,
    },
    {
      targetCenterY: 1,
      targetHeight: 1,
      targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
      activeSegment: { index: 0, centerX: 0.2, width: 0.04, xNorm: 0.25 } as never,
      boxSegments: [],
      verticalSegments: [],
      activeVerticalSegment: null,
      cellBottomY: 0.5,
      cellTopY: 1.5,
      cellHeight: 1,
      cellCenterY: 1,
      hasVerticalRoomFor: height => {
        roomHeight = height;
        return true;
      },
      clampBoxCenterY: (centerY, halfH) => {
        clampHalfHeight = halfH;
        return centerY;
      },
      boxYNormFromCenter: centerY => centerY - 0.5,
    }
  );

  closeTo(clampHalfHeight, INTERIOR_ROD_RENDER_POLICY.radiusM);
  closeTo(roomHeight, INTERIOR_ROD_RENDER_POLICY.radiusM * 2);
  closeTo(result?.preview.x, 0.2);
  closeTo(result?.preview.w, SKETCH_BOX_ROD_PREVIEW_POLICY.rodMinLengthM);
  closeTo(result?.preview.h, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewHeightM);
  closeTo(result?.preview.d, SKETCH_BOX_ROD_PREVIEW_POLICY.rodPreviewDepthM);
  closeTo(result?.preview.z, 0);
  assert.equal(result?.preview.op, 'add');
  const command = structuralCommand(result?.hoverRecord);
  assert.equal(command.kind, 'add-rod');
  if (command.kind !== 'add-rod') assert.fail('expected add-rod');
  assert.equal(command.contentXNorm, 0.25);
});

test('rod preview preserves nearest local removal, numeric segment scoping and invalid xNorm rejection', () => {
  const removed = rodPreview({
    targetBox: {
      id: 'box-a',
      rods: [
        { id: 'right', yNorm: 0.5, xNorm: 0.75 },
        { id: 'left', yNorm: 0.51, xNorm: 0.25 },
      ],
      dividers: [{ id: 'v', xNorm: 0.5 }],
    },
    pointerX: -0.25,
    pointerY: 1.01,
  });
  assert.equal(removed?.preview.op, 'remove');
  assert.ok(Number(removed?.preview.x) < 0);
  const removeCommand = structuralCommand(removed?.hoverRecord);
  assert.equal(removeCommand.kind, 'remove-rod');
  if (removeCommand.kind !== 'remove-rod') assert.fail('expected remove-rod');
  assert.equal(removeCommand.removeId, 'left');
  assert.equal(removeCommand.removeIdx, 1);

  const invalid = rodPreview({
    targetBox: {
      id: 'box-a',
      rods: [{ id: 'legacy', yNorm: 0.5, xNorm: '0.25' }],
      dividers: [{ id: 'v', xNorm: 0.5 }],
    },
    pointerX: -0.25,
    pointerY: 1,
  });
  assert.equal(invalid?.preview.op, 'add');
});

test('rod preview preserves Shelf and Storage cross-removal, no-room and collision behavior', () => {
  const shelfRemoval = rodPreview({
    targetBox: { id: 'box-a', rods: [], shelves: [{ id: 's1', yNorm: 0.5, variant: 'regular' }] },
    pointerY: 1,
  });
  assert.equal(shelfRemoval?.preview.kind, 'shelf');
  assert.equal(shelfRemoval?.preview.op, 'remove');
  assert.equal(structuralCommand(shelfRemoval?.hoverRecord).kind, 'remove-shelf');

  const storageRemoval = rodPreview({
    targetBox: {
      id: 'box-a',
      rods: [],
      storageBarriers: [{ id: 'st1', yNorm: 0.5, heightM: 0.2 }],
    },
    pointerY: 1,
  });
  assert.equal(storageRemoval?.preview.kind, 'storage');
  assert.equal(storageRemoval?.preview.op, 'remove');
  assert.equal(structuralCommand(storageRemoval?.hoverRecord).kind, 'remove-storage');

  const noRoom = rodPreview({ targetHeight: 0.04 });
  assert.equal(noRoom?.preview.op, 'blocked');
  assert.equal(noRoom?.preview.blockedReason, 'no-room');

  const collision = rodPreview({
    targetBox: { id: 'box-a', rods: [], shelves: [{ id: 'top', yNorm: 0.98, variant: 'regular' }] },
    pointerY: 2,
  });
  assert.equal(collision?.preview.op, 'blocked');
  assert.equal(collision?.preview.blockedReason, 'collision');
  assert.equal(structuralCommand(collision?.hoverRecord).blockedReason, 'collision');
});
