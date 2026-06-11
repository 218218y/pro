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
    bottomHingedDoorPivotBase: null,
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
    bottomHingedDoorPivotBase: null,
    lowerDoorIdOffset: 999,
  }) as Record<string, unknown>;

  assert.equal(readPivot(shifted, '1000').isLeftHinge, false);
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
