import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWinterBraceDoorPlan } from '../esm/native/builder/winter_brace_shelf_geometry.ts';
import {
  readWinterBraceDoorLockState,
  buildWinterBraceDoorLockPatch,
} from '../esm/native/features/modules_configuration/modules_config_api.ts';
import { appendHingedDoorOpsForModule } from '../esm/native/builder/hinged_doors_module_ops.ts';
import { resolveHingedDoorTargetRotationY } from '../esm/native/runtime/hinged_door_kinematics.ts';
import { createBuilderHingedDoorMotionMetadata } from '../esm/native/builder/hinged_door_motion_metadata.ts';
import { readHingedDoorOp } from '../esm/native/builder/render_door_ops_shared_ops.ts';
import { resolveWinterBraceBoxDoorLayouts } from '../esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts';

const winter = { variant: 'winter_brace', yNorm: 0.4 };
const moduleConfig = () => ({ sketchExtras: { shelves: [winter] } });

function build(config: unknown, extra: Record<string, unknown> = {}) {
  const ops: Record<string, unknown>[] = [];
  appendHingedDoorOpsForModule({
    cfg: { wardrobeType: 'hinged' },
    moduleIndex: 0,
    modulesLength: 1,
    moduleDoors: 2,
    modWidth: 1,
    currentX: 0,
    globalDoorCounter: 1,
    effectiveBottomY: 0,
    effectiveTopY: 2,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.018,
    D: 0.6,
    splitDoors: false,
    splitLineY: 1.4,
    globalHandleAbsY: 1,
    config,
    opsList: ops,
    ...extra,
  } as never);
  return ops;
}

test('winter shelves automatically split both facing leaves at shelf height without enabling manual splits', () => {
  const ops = build(moduleConfig());
  assert.deepEqual(
    ops.map(op => op.partId),
    ['d1_bot', 'd1_top', 'd2_bot', 'd2_top']
  );
  for (const op of ops) {
    const upperEdge = Number(op.y) + Number(op.height) / 2;
    assert.equal(op.fixedClosed, upperEdge <= 0.8);
    const read = readHingedDoorOp(op)!;
    const door = {
      type: 'hinged',
      hingeSide: 'left',
      group: { userData: createBuilderHingedDoorMotionMetadata({ fixedClosed: read.fixedClosed }) },
    };
    const angle = resolveHingedDoorTargetRotationY(door as never, true);
    assert.equal(angle === 0, op.fixedClosed);
  }
  assert.ok(Math.abs(Number(ops[0]!.y) + Number(ops[0]!.height) / 2 - 0.8) < 0.01);
});

test('unlocking keeps automatic cuts but lets every section open; removing winter shelves removes derived cuts', () => {
  const unlocked = build({ ...moduleConfig(), winterBraceDoorsUnlocked: true });
  assert.equal(unlocked.length, 4);
  assert.ok(unlocked.every(op => op.fixedClosed === false));
  const removed = build({ sketchExtras: { shelves: [{ ...winter, variant: 'brace' }] } });
  assert.deepEqual(
    removed.map(op => op.partId),
    ['d1_full', 'd2_full']
  );
});

test('grid winter shelves and manual cuts compose on the same independent door segment path', () => {
  const config = {
    isCustom: true,
    gridDivisions: 4,
    customData: { shelves: [true, false, true], shelfVariants: ['winter_brace', '', 'winter_brace'] },
  };
  const plan = resolveWinterBraceDoorPlan({
    config,
    source: 'module',
    gridY: i => i * 0.5,
    sketchY: n => n * 2,
  });
  assert.deepEqual(plan.cuts, [0.5, 1.5]);
  assert.equal(plan.fixedBelowY, 1.5);
  const ops = build(config, {
    moduleDoors: 1,
    splitDoors: true,
    cfg: { wardrobeType: 'hinged', splitDoorsMap: { split_d1: true, splitpos_d1: [0.5] } },
    isDoorSplit: () => true,
  });
  assert.equal(ops.length, 4);
  assert.deepEqual(
    ops.map(op => op.fixedClosed),
    [true, true, true, false]
  );
});

test('door lock toggling covers top/lower/corner and free boxes without changing the input snapshot', () => {
  const config = {
    modulesConfiguration: [
      {
        ...moduleConfig(),
        sketchExtras: { shelves: [winter], boxes: [{ shelves: [winter], freePlacement: true }] },
      },
    ],
    stackSplitLowerModulesConfiguration: [moduleConfig()],
    cornerConfiguration: {
      modulesConfiguration: [moduleConfig()],
      stackSplitLower: { modulesConfiguration: [moduleConfig()] },
    },
  };
  assert.deepEqual(readWinterBraceDoorLockState(config), { hasWinterBrace: true, locked: true });
  const unlocked = buildWinterBraceDoorLockPatch(config, false);
  assert.deepEqual(readWinterBraceDoorLockState(JSON.parse(JSON.stringify(unlocked))), {
    hasWinterBrace: true,
    locked: false,
  });
  assert.equal(readWinterBraceDoorLockState(config).locked, true);
  assert.equal(readWinterBraceDoorLockState(buildWinterBraceDoorLockPatch(unlocked, true)).locked, true);
});

test('box doors split into separate moving sections with fixed lower and globally opening upper sections', () => {
  const args = {
    frontsArgs: {
      shell: { box: { shelves: [winter] } },
      yFromBoxNorm: (n: number) => n * 2,
      args: { woodThick: 0.018 },
    },
  };
  const layouts = resolveWinterBraceBoxDoorLayouts(
    args as never,
    {
      doorCenterY: 1,
      doorH: 2,
      doorPid: 'sketch_box_0_box_door_front',
      groupUserData: { noGlobalOpen: true },
    } as never
  );
  assert.equal(layouts.length, 2);
  assert.equal(layouts[0]!.groupUserData.__wpDoorFixedClosed, true);
  assert.equal(layouts[1]!.groupUserData.__wpDoorFixedClosed, false);
  assert.ok(layouts.every(layout => layout.groupUserData.noGlobalOpen === false));
});

test('a winter shelf in one box column only cuts its facing door and cannot create tiny intermediate leaves', () => {
  const args = {
    frontsArgs: {
      shell: {
        box: {
          shelves: [
            { ...winter, xNorm: 0.2 },
            { ...winter, xNorm: 0.2, yNorm: 0.41 },
          ],
        },
        geometry: { centerX: 0, innerW: 1 },
        centerY: 1,
        sideH: 2,
      },
      boxDividers: [{ id: 'mid', xNorm: 0.5 }],
      boxHorizontalDividers: [],
      yFromBoxNorm: (n: number) => n * 2,
      args: { woodThick: 0.018 },
    },
  };
  const layout = {
    doorCenterY: 1,
    doorH: 2,
    doorPid: 'box_door',
    groupUserData: {},
    placement: { segment: { leftX: 0.009, rightX: 0.5 } },
  };
  assert.deepEqual(resolveWinterBraceBoxDoorLayouts(args as never, layout as never), [layout]);
  layout.placement.segment = { leftX: -0.5, rightX: -0.009 };
  const cut = resolveWinterBraceBoxDoorLayouts(args as never, layout as never);
  assert.equal(cut.length, 2);
  assert.equal(cut[0]!.groupUserData.__wpDoorFixedClosed, true);
});
