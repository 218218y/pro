import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModuleDepthProfile } from '../esm/native/builder/module_loop_pipeline_module_depth.ts';
import { appendHingedDoorOpsForModule } from '../esm/native/builder/hinged_doors_module_ops.ts';
import { applySketchShelves } from '../esm/native/builder/render_interior_sketch_support_shelves.ts';
import {
  addCustomBaseShelfContents,
  createAddCustomGridShelf,
} from '../esm/native/builder/render_interior_custom_ops_shelves.ts';
import { createAddGridShelf } from '../esm/native/builder/render_interior_preset_ops_shelves.ts';
import {
  resolveSketchBoxBraceDepth,
  resolveSketchBoxUsableContentDepth,
} from '../esm/native/builder/render_interior_sketch_boxes_contents_depth.ts';
import { resolveSketchBoxClosedInsetDoorBackZ } from '../esm/native/builder/render_interior_sketch_boxes_door_geometry.ts';
import { createSketchModuleShelfPreviewGeometry } from '../esm/native/services/canvas_picking_sketch_module_vertical_content_preview.ts';
import { HINGED_DOOR_RENDER_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';

function closeTo(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

for (const mode of ['overlay', 'inset']) {
  test(`brace front follows the actual closed ${mode} door in default and custom depth modules`, () => {
    for (const config of [{}, { specialDims: { depthCm: 75, baseDepthCm: 60 } }]) {
      const cfg = { wardrobeType: 'hinged', doorMountMode: mode };
      const profile = resolveModuleDepthProfile(
        { D: 0.6, woodThick: 0.018, depthReduction: 0.03, cfg } as never,
        config
      );
      const ops: Record<string, unknown>[] = [];
      appendHingedDoorOpsForModule({
        cfg,
        config,
        moduleIndex: 0,
        moduleDoors: 1,
        modulesLength: 1,
        modWidth: 0.6,
        currentX: 0,
        globalDoorCounter: 1,
        effectiveBottomY: 0.018,
        startY: 0,
        woodThick: 0.018,
        cabinetBodyHeight: 2.4,
        D: 0.6,
        moduleDoorFrontZ: profile.moduleDoorFrontZ,
        splitDoors: false,
        globalHandleAbsY: 1,
        opsList: ops,
      } as never);
      const back = Number(ops[0]!.z) - HINGED_DOOR_RENDER_POLICY.visualThicknessM / 2;
      assert.ok(profile.braceFrontZ < back, 'the shelf must never intersect the closed door');
      assert.ok(back - profile.braceFrontZ <= 0.0011, 'the brace must reach the inside of the door');
      if (mode === 'overlay') closeTo(profile.braceFrontZ, profile.moduleFrontZ);
    }
  });
}

test('sliding braces retain the track working volume', () => {
  const profile = resolveModuleDepthProfile(
    { D: 0.6, woodThick: 0.018, depthReduction: 0.12, cfg: { wardrobeType: 'sliding' } } as never,
    {}
  );
  closeTo(profile.braceFrontZ, profile.moduleInternalZ + profile.moduleInternalDepth / 2);
});

test('both brace variants use the extended depth through custom grid, preset and sketch emission with matching hover', () => {
  for (const variant of ['brace', 'winter_brace'] as const) {
    const calls: number[][] = [];
    const createBoard = (...args: unknown[]) => {
      calls.push(args.slice(0, 6) as number[]);
      return { userData: {} };
    };
    const args = {
      App: {},
      roomArchitecturePlan: createTestRoomArchitecturePlan(),
      threeSurface: null,
      matCache: {},
      group: { add() {} },
      createBoard,
      currentShelfMat: {},
      currentBraceShelfMat: {},
      moduleKey: '0',
      braceSet: {},
      shelfSet: { 1: true },
      shelfVariantByIndex: {},
      braceMetrics: {
        regularDepth: 0.45,
        regularZ: -0.07,
        regularShelfWidth: 0.98,
        braceShelfWidth: 1,
        braceCenterX: 0,
        leftInnerX: -0.5,
        rightInnerX: 0.5,
      },
      effectiveBottomY: 0,
      effectiveTopY: 2,
      localGridStep: 0.5,
      gridDivisions: 4,
      internalCenterX: 0,
      innerW: 1,
      woodThick: 0.018,
      shelfThick: 0.018,
      internalDepth: 0.57,
      internalZ: -0.01,
      braceDepth: 0.595,
      braceZ: 0.0025,
      activeSlots: [],
      isInternalDrawersEnabled: false,
      renderOpsHandleCatch() {},
    };
    createAddCustomGridShelf(args as never)(1, variant);
    createAddGridShelf({ ...args, ...args.braceMetrics, braceSet: { 1: true } } as never)(1);
    applySketchShelves({
      ...args,
      shelves: [{ variant, yNorm: 0.5 }],
      yFromNorm: () => 1,
      findBoxAtY: () => null,
      ...args.braceMetrics,
      braceFrontZ: 0.3,
      backZ: -0.295,
      moduleKeyStr: '0',
      showContentsEnabled: false,
      addShelfPins() {},
    } as never);
    assert.equal(calls.length, 3);
    for (const call of calls) {
      closeTo(call[2]!, 0.595);
      closeTo(call[5]! + call[2]! / 2, 0.3);
    }
    const hover = createSketchModuleShelfPreviewGeometry({
      variant,
      internalDepth: 0.57,
      backZ: -0.295,
      braceFrontZ: 0.3,
      innerW: 1,
      woodThick: 0.018,
      regularDepth: 0.45,
    });
    closeTo(hover.d, calls[2]![2]!);
    closeTo(hover.z, calls[2]![5]!);
  }
});

test('inset box braces reach the door back while other contents keep their existing clearance', () => {
  const shell = {
    box: { doors: [{ id: 'door', enabled: true }] },
    frontZ: 0.3,
    geometry: { innerD: 0.595, innerBackZ: -0.295 },
  };
  const args = { shell, input: { cfgSnapshot: { doorMountMode: 'inset' } }, woodThick: 0.018 };
  const depth = resolveSketchBoxBraceDepth(args as never);
  const doorBack = resolveSketchBoxClosedInsetDoorBackZ(args as never);
  closeTo(shell.geometry.innerBackZ + depth, doorBack - 0.0005);
  assert.ok(depth > resolveSketchBoxUsableContentDepth(args as never));
});

test('custom-grid winter compartment replaces garments with grounded blankets, without drawing on its open frame', () => {
  const contents: unknown[][] = [];
  const args = {
    App: {},
    roomArchitecturePlan: createTestRoomArchitecturePlan(),
    threeSurface: null,
    matCache: {},
    group: { add() {} },
    createBoard() {
      return { userData: {} };
    },
    addFoldedClothes(...parameters: unknown[]) {
      contents.push(parameters);
    },
    contentsPolicy: { showContentsEnabled: true, sketchMode: false, addOutlines: null, cfgSnapshot: {} },
    currentShelfMat: {},
    currentBraceShelfMat: {},
    moduleKey: '0',
    braceSet: {},
    shelfSet: { 1: true, 2: true },
    shelfVariantByIndex: { 1: 'regular', 2: 'winter_brace' },
    braceMetrics: {
      regularDepth: 0.45,
      regularZ: -0.07,
      regularShelfWidth: 0.98,
      braceShelfWidth: 1,
      braceCenterX: 0,
      leftInnerX: -0.5,
      rightInnerX: 0.5,
    },
    effectiveBottomY: 0.02,
    effectiveTopY: 2,
    localGridStep: 0.5,
    gridDivisions: 4,
    internalCenterX: 0,
    innerW: 1,
    woodThick: 0.018,
    shelfThick: 0.018,
    internalDepth: 0.57,
    internalZ: -0.01,
    braceDepth: 0.595,
    braceZ: 0.0025,
    activeSlots: [],
    isInternalDrawersEnabled: false,
  };
  const addShelf = createAddCustomGridShelf(args as never);
  addShelf(1, 'regular');
  addShelf(2, 'winter_brace');
  assert.equal(contents.length, 1, 'winter frame must not support contents directly');
  assert.equal(contents[0]![1], 0.02 + 0.5 + 0.009);
  assert.equal((contents[0]![7] as { contentKind: string }).contentKind, 'winter_blankets');
  assert.ok((contents[0]![5] as number) < 0.5);

  contents.length = 0;
  addCustomBaseShelfContents({
    ...args,
    shelfVariantByIndex: { 1: 'winter_brace' },
    shelfSet: { 1: true },
  } as never);
  assert.equal(contents.length, 1);
  assert.equal(contents[0]![1], 0.02, 'first winter frame uses the module floor for its blankets');
  assert.equal((contents[0]![7] as { contentKind: string }).contentKind, 'winter_blankets');
});
