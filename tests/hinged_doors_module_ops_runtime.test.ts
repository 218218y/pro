import test from 'node:test';
import assert from 'node:assert/strict';

import { appendHingedDoorOpsForModule } from '../esm/native/builder/hinged_doors_module_ops.ts';

test('hinged door module ops keep writing into the caller accumulator array', () => {
  const opsList: unknown[] = [];

  const nextDoorId = appendHingedDoorOpsForModule({
    cfg: { wardrobeType: 'hinged' },
    moduleIndex: 0,
    modulesLength: 2,
    moduleDoors: 2,
    modWidth: 0.8,
    currentX: -0.4,
    globalDoorCounter: 1,
    drawerHeightTotal: 0,
    effectiveBottomY: 0.018,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.4,
    D: 0.55,
    moduleDoorFrontZ: 0.275,
    splitLineY: 1.4,
    splitDoors: false,
    opsList,
    hingedDoorPivotMap: {
      1: { pivotX: -0.4, meshOffsetX: 0.2, isLeftHinge: true, doorWidth: 0.4 },
      2: { pivotX: 0.4, meshOffsetX: -0.2, isLeftHinge: false, doorWidth: 0.4 },
    },
    globalHandleAbsY: 1.05,
    config: {},
    moduleCfgList: [],
    isGroovesEnabled: false,
    removeDoorsEnabled: false,
  });

  assert.equal(nextDoorId, 3);
  assert.equal(opsList.length, 2);
  assert.equal((opsList[0] as { partId?: string }).partId, 'd1_full');

  assert.equal((opsList[1] as { partId?: string }).partId, 'd2_full');
});

test('hinged door module ops orchestrator keeps mixed full/split routes and drawer shadow routing canonical', () => {
  const shadowCalls: unknown[] = [];
  const App = {
    services: {
      builder: {
        renderOps: {
          createDrawerShadowPlane(args: unknown) {
            shadowCalls.push(args);
          },
        },
      },
    },
  } as any;
  const opsList: any[] = [];

  const nextDoorId = appendHingedDoorOpsForModule({
    App,
    cfg: {
      wardrobeType: 'hinged',
      splitDoorsMap: { split_d2: true },
      isMultiColorMode: false,
    },
    moduleIndex: 0,
    modulesLength: 1,
    moduleDoors: 2,
    modWidth: 1,
    currentX: 0,
    globalDoorCounter: 1,
    drawerHeightTotal: 0.3,
    effectiveBottomY: 0.018,
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.4,
    D: 0.55,
    moduleDoorFrontZ: 0.275,
    splitLineY: 1.35,
    splitDoors: true,
    opsList,
    shadowMat: { kind: 'shadow' },
    externalW: 1,
    externalCenterX: 0.5,
    globalHandleAbsY: 1.05,
    config: {},
    moduleCfgList: [],
    isGroovesEnabled: false,
    removeDoorsEnabled: false,
    isDoorSplit: (map: Record<string, unknown> | null | undefined, doorId: number) =>
      !!map?.[`split_d${doorId}`],
  });

  assert.equal(nextDoorId, 3);
  assert.equal(shadowCalls.length, 1);
  assert.deepEqual(
    opsList.map(entry => entry.partId),
    ['d1_full', 'd2_top', 'd2_bot']
  );
});
