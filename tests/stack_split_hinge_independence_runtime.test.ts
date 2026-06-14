import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShiftedBottomHingedPivotMap } from '../esm/native/builder/build_stack_split_bottom_handles.ts';
import { __isSingleDoorHingeTarget } from '../esm/native/services/canvas_picking_door_hover_targets_policy.ts';

function readPivot(map: Record<string, unknown> | null, key: string): Record<string, unknown> {
  const value = map ? map[key] : null;
  assert.ok(value && typeof value === 'object');
  return value as Record<string, unknown>;
}

test('stack split lower hinged doors ignore top hinge-map keys', () => {
  const shifted = buildShiftedBottomHingedPivotMap({
    cfg: {
      wardrobeType: 'hinged',
      hingeMap: {
        door_hinge_1: 'right',
      },
    },
    bottomModules: [{ doors: 1 }, { doors: 1 }],
    bottomTotalW: 2,
    woodThick: 0.02,
    bottomSingleUnitWidth: 0.98,
    bottomModuleInternalWidths: null,
    bottomModuleConfigs: null,
    lowerDoorIdOffset: 999,
  }) as Record<string, unknown>;

  assert.equal(readPivot(shifted, '1000').isLeftHinge, true);
});

test('stack split lower hinged doors use their own shifted hinge-map keys', () => {
  const shifted = buildShiftedBottomHingedPivotMap({
    cfg: {
      wardrobeType: 'hinged',
      hingeMap: {
        door_hinge_1000: 'right',
      },
    },
    bottomModules: [{ doors: 1 }, { doors: 1 }],
    bottomTotalW: 2,
    woodThick: 0.02,
    bottomSingleUnitWidth: 0.98,
    bottomModuleInternalWidths: null,
    bottomModuleConfigs: null,
    lowerDoorIdOffset: 999,
  }) as Record<string, unknown>;

  assert.equal(readPivot(shifted, '1000').isLeftHinge, false);
});

test('stack split lower hinged doors keep hex-cell door spans from bottom module config', () => {
  const shifted = buildShiftedBottomHingedPivotMap({
    cfg: {
      wardrobeType: 'hinged',
      hingeMap: {},
    },
    bottomModules: [{ doors: 2 }],
    bottomTotalW: 1.2,
    woodThick: 0.02,
    bottomSingleUnitWidth: 0.58,
    bottomModuleInternalWidths: [1.16],
    bottomModuleConfigs: [
      {
        hexCell: {
          enabled: true,
          doorWidthCm: 60,
          protrusionCm: 10,
        },
      },
    ],
    lowerDoorIdOffset: 999,
  }) as Record<string, unknown>;

  const first = readPivot(shifted, '1000');
  const second = readPivot(shifted, '1001');

  assert.ok(Number(first.doorWidth) < 0.35, 'first lower hex door leaf should not keep full cell width');
  assert.ok(Number(second.doorWidth) < 0.35, 'second lower hex door leaf should not keep full cell width');
  assert.ok(Number(first.doorLeftEdge) > -0.35, 'hex door span should be centered inside the lower cell');
  assert.ok(Number(second.doorLeftEdge) < 0.1, 'second leaf should remain inside the narrowed hex door span');
});

test('single-door hinge hover can identify lower-stack doors from rendered module-door metadata', () => {
  const App = {
    store: {
      getState() {
        return {
          config: {
            modulesConfiguration: [{ doors: 1 }],
            stackSplitLowerModulesConfiguration: [{}],
          },
        };
      },
    },
  };

  const lowerSingleDoorGroup = {
    userData: {
      partId: 'd1000_full',
      moduleIndex: 0,
      __wpStack: 'bottom',
      __wpModuleDoors: 1,
    },
  };
  const lowerDoubleDoorGroup = {
    userData: {
      partId: 'd1000_full',
      moduleIndex: 0,
      __wpStack: 'bottom',
      __wpModuleDoors: 2,
    },
  };

  assert.equal(__isSingleDoorHingeTarget(App as never, 'd1000_full', lowerSingleDoorGroup as never), true);
  assert.equal(__isSingleDoorHingeTarget(App as never, 'd1000_full', lowerDoubleDoorGroup as never), false);
});
