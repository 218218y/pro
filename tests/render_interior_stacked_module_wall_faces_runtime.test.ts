import test from 'node:test';
import assert from 'node:assert/strict';

import { computeModuleLayout } from '../esm/native/builder/core_layout_compute.ts';
import { createBuilderRenderInteriorPresetOps } from '../esm/native/builder/render_interior_preset_ops.ts';
import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.ts';
import { resolveSketchModuleInnerFaces } from '../esm/native/builder/render_interior_sketch_module_geometry.ts';
import { INTERIOR_FITTINGS_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';

const WOOD = 0.018;
const ROOM = createTestRoomArchitecturePlan({ widthM: 4, heightM: 2.8, depthM: 0.6 });

function createWall(partId: string, x: number) {
  return {
    isMesh: true,
    geometry: { parameters: { width: WOOD, height: 2, depth: 0.6 } },
    position: { x, y: 0, z: 0 },
    userData: { partId },
    getWorldScale(vec: { x?: number }) {
      vec.x = 1;
    },
    getWorldPosition(vec: { x?: number }) {
      vec.x = x;
    },
  };
}

function layoutFor(doors: number[], segmentsCm?: number[], bodyPrefix = '') {
  const totalW = segmentsCm ? segmentsCm.reduce((sum, width) => sum + width, 0) / 100 : doors.length * 0.8;
  const totalDoors = doors.reduce((sum, count) => sum + count, 0);
  const configs = doors.map((count, i) => ({
    doors: count,
    ...(segmentsCm
      ? { specialDims: { widthCm: segmentsCm[i], baseWidthCm: (totalW * 100 * count) / totalDoors } }
      : {}),
  }));
  const layout = computeModuleLayout({
    totalW,
    woodThick: WOOD,
    modulesStructure: doors.map(count => ({ doors: count })),
    modulesConfiguration: configs,
  });
  const walls = [createWall(`${bodyPrefix}body_left`, -totalW / 2 + WOOD / 2)];
  const openings: { left: number; right: number; center: number; width: number }[] = [];
  let x = -totalW / 2 + WOOD;
  for (let i = 0; i < doors.length; i++) {
    const width = layout.moduleInternalWidths[i]!;
    openings.push({ left: x, right: x + width, center: x + width / 2, width });
    if (i < doors.length - 1) walls.push(createWall(`divider_inter_${i}`, x + width + WOOD / 2));
    x += width + (i < doors.length - 1 ? WOOD : 0);
  }
  walls.push(createWall(`${bodyPrefix}body_right`, totalW / 2 - WOOD / 2));
  return { walls, openings };
}

function makeThree() {
  class Mesh {
    rotation: { z?: number } = {};
    userData: Record<string, unknown> = {};
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
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  return {
    Box3: class {},
    Group: class {},
    Vector3: class {
      x = 0;
    },
    BoxGeometry: class {},
    CylinderGeometry: class {},
    MeshBasicMaterial: class {},
    MeshStandardMaterial: class {
      __keepMaterial?: boolean;
    },
    Mesh,
  };
}

const SCENARIOS = [
  {
    name: '6-door library, left 40 becomes two leaves',
    upper: [2, 2, 1, 2],
    lower: [2, 2, 2],
    widths: [80, 40, 40, 80],
  },
  {
    name: '8-door library, left 40 becomes two leaves',
    upper: [2, 2, 2, 1, 2],
    lower: [2, 2, 2, 2],
    widths: [80, 40, 80, 40, 80],
  },
  {
    name: '8-door library, right 40 becomes two leaves',
    upper: [2, 1, 2, 2, 2],
    lower: [2, 2, 2, 2],
    widths: [80, 40, 80, 40, 80],
  },
];

for (const scenario of SCENARIOS) {
  test(`${scenario.name}: preset/custom supports agree with their own opening despite duplicate stacked divider IDs`, () => {
    const upper = layoutFor(scenario.upper, scenario.widths);
    const lower = layoutFor(scenario.lower, undefined, 'lower_');
    const pinLen = INTERIOR_FITTINGS_POLICY.pins.lengthM;
    const THREE = makeThree();
    // Two independent carcasses share unscoped divider IDs; deliberately put
    // the other stack last to prove no dependence on traversal/draw order.
    const group = {
      children: [...upper.walls, ...lower.walls] as any[],
      add(mesh: unknown) {
        this.children.push(mesh);
      },
      updateMatrixWorld() {},
    };
    for (const rendererType of ['preset', 'custom'] as const) {
      const renderer =
        rendererType === 'preset'
          ? createBuilderRenderInteriorPresetOps({
              app: () => ({}),
              ops: () => ({}),
              wardrobeGroup: () => group,
              three: value => value,
              renderOpsHandleCatch: () => undefined,
              assertTHREE: () => null,
            })
          : createBuilderRenderInteriorCustomOps({
              app: () => ({}),
              ops: () => ({}),
              wardrobeGroup: () => group,
              three: value => value,
              matCache: () => null,
              renderOpsHandleCatch: () => undefined,
              assertTHREE: () => null,
            });
      for (let i = 0; i < upper.openings.length; i++) {
        const opening = upper.openings[i]!;
        for (const isBrace of [false, true]) {
          const boards: Array<{ partId: string; x: number; w: number }> = [];
          const before = group.children.length;
          const args = {
            THREE,
            roomArchitecturePlan: ROOM,
            wardrobeGroup: group,
            cfg: { isLibraryMode: true },
            braceShelves: isBrace ? [1] : [],
            moduleIndex: i,
            modulesLength: upper.openings.length,
            innerW: opening.width,
            internalCenterX: opening.center,
            woodThick: WOOD,
            shelfThick: WOOD,
            internalDepth: 0.55,
            internalZ: 0,
            D: 0.6,
            gridDivisions: 6,
            effectiveBottomY: 0,
            effectiveTopY: 2.3,
            localGridStep: 0.38,
            createRod: () => null,
            createBoard: (
              w: number,
              _h: number,
              _d: number,
              x: number,
              _y: number,
              _z: number,
              _mat: unknown,
              partId: string
            ) => {
              boards.push({ partId, x, w });
              return { userData: {} };
            },
          };
          const result =
            rendererType === 'preset'
              ? (renderer as ReturnType<typeof createBuilderRenderInteriorPresetOps>).applyInteriorPresetOps({
                  ...args,
                  presetOps: { shelves: [1], rods: [] },
                })
              : (renderer as ReturnType<typeof createBuilderRenderInteriorCustomOps>).applyInteriorCustomOps({
                  ...args,
                  customOps: { shelves: [1], rods: [] },
                });
          assert.equal(result, true);
          const pins = group.children.slice(before).filter(mesh => mesh?.userData?.__kind === 'shelf_pin');
          const label = `${rendererType}, module ${i}, ${isBrace ? 'brace' : 'regular'}`;
          assert.equal(pins.length, isBrace ? 0 : 4, `${label} keeps its correct support count`);
          if (!isBrace) {
            const xs = pins.map(pin => pin.position.x).sort((a, b) => a - b);
            for (let j = 0; j < 2; j++) {
              assert.ok(Math.abs(xs[j]! - (opening.left + pinLen / 2)) < 1e-8, `${label}: left face`);
              assert.ok(Math.abs(xs[j + 2]! - (opening.right - pinLen / 2)) < 1e-8, `${label}: right face`);
            }
          }
          assert.equal(boards.length, 1, `${label} keeps the shelf`);
          assert.ok(Math.abs(boards[0]!.x - opening.center) < 1e-8, `${label}: shelf center`);
          const clearance = isBrace
            ? INTERIOR_FITTINGS_POLICY.shelves.braceWidthClearanceM
            : INTERIOR_FITTINGS_POLICY.shelves.regularWidthClearanceM;
          assert.ok(Math.abs(boards[0]!.w - (opening.width - clearance)) < 1e-8, `${label}: shelf width`);
        }
      }
    }
    for (let i = 0; i < upper.openings.length; i++) {
      const opening = upper.openings[i]!;
      const faces = resolveSketchModuleInnerFaces({
        group: group as any,
        input: {} as any,
        moduleIndex: i,
        moduleKeyStr: String(i),
        modulesLength: upper.openings.length,
        innerW: opening.width,
        internalCenterX: opening.center,
        woodThick: WOOD,
      });
      assert.ok(faces, `sketch module ${i} resolves from its own walls`);
      assert.ok(Math.abs(faces!.leftX - opening.left) < 1e-8);
      assert.ok(Math.abs(faces!.rightX - opening.right) < 1e-8);
    }
  });
}

test('a wall from another stack cannot displace a shelf when the matching wall is missing', () => {
  const upper = layoutFor([2, 2, 1, 2], [80, 40, 40, 80]);
  const lower = layoutFor([2, 2, 2], undefined, 'lower_');
  // Module 1: right wall exists only in other stack; use the canonical frame fallback.
  const group = { children: lower.walls };
  const opening = upper.openings[1]!;
  const faces = resolveSketchModuleInnerFaces({
    group: group as any,
    input: {} as any,
    moduleIndex: 1,
    moduleKeyStr: '1',
    modulesLength: 4,
    innerW: opening.width,
    internalCenterX: opening.center,
    woodThick: WOOD,
  });
  assert.equal(faces, null);
});
