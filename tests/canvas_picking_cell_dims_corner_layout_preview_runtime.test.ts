import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../esm/shared/dimensions/cell_dimension_policy.ts';
import { resolveCornerCellDimsLayoutPreview } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims_corner_layout.ts';

function assertNear(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `expected ${actual} to equal ${expected}`);
}

function createCornerSelector(index: number, parent: any, stack: 'top' | 'bottom' = 'top') {
  const selector = {
    userData: {
      isModuleSelector: true,
      moduleIndex: `corner:${index}`,
      __wpStack: stack,
    },
    children: [],
    parent,
  };
  parent.children.push(selector);
  return selector;
}

const PREVIEW_POLICY_ARGS = {
  matchToleranceCm: CELL_DIMENSION_MATCH_POLICY.toleranceCm,
  minWidthM: CELL_DIMENSION_PREVIEW_POLICY.minWidthM,
  minHeightM: CELL_DIMENSION_PREVIEW_POLICY.minHeightM,
  minDepthM: CELL_DIMENSION_PREVIEW_POLICY.minDepthM,
  widthClearanceM: CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM,
  heightClearanceM: CELL_DIMENSION_PREVIEW_POLICY.heightClearanceM,
};

test('corner cell-dims preview uses the canonical corner redistribution in wing-local coordinates', () => {
  const wingGroup = { children: [] as any[], userData: { __wpStack: 'top' } };
  const selectors = [createCornerSelector(0, wingGroup), createCornerSelector(1, wingGroup)];
  const boxes = new Map<unknown, any>([
    [selectors[0], { centerX: -0.2, centerY: 1, centerZ: 0, width: 0.8, height: 1.96, depth: 0.55 }],
    [selectors[1], { centerX: 0.4, centerY: 1, centerZ: 0, width: 0.4, height: 1.96, depth: 0.55 }],
  ]);
  const state = {
    ui: {
      cornerDoors: 3,
      cornerWidth: 120,
      cornerHeight: 200,
      cornerDepth: 55,
      raw: { width: 180, height: 200, depth: 55, doors: 4, cornerDoors: 3 },
    },
    config: {
      wardrobeType: 'hinged',
      cornerConfiguration: {
        modulesConfiguration: [{ doors: 2 }, { doors: 1 }],
      },
    },
    runtime: {},
    mode: {},
    meta: {},
  };
  const App = {
    store: { getState: () => state, patch() {} },
    render: { wardrobeGroup: { children: [wingGroup] } },
  } as any;
  const target = {
    hitModuleKey: 'corner:0',
    hitSelectorObj: selectors[0],
    isBottom: false,
    woodThick: 0.018,
    info: {},
  } as any;

  const plan = resolveCornerCellDimsLayoutPreview({
    App,
    target,
    applyW: 90,
    applyH: null,
    applyD: null,
    measureObjectLocalBox: (_App, object, parent) => {
      assert.equal(parent, wingGroup);
      return boxes.get(object) ?? null;
    },
    ...PREVIEW_POLICY_ARGS,
  });

  assert.ok(plan);
  assert.equal(plan.anchor, selectors[0]);
  assert.equal(plan.anchorParent, wingGroup);
  assert.equal(plan.isolateStackKey, null);
  assert.equal(plan.boxes.length, 2);
  assert.deepEqual(
    plan.boxes.map(box => box.selected),
    [true, false]
  );
  assert.deepEqual(
    plan.boxes.map(box => box.doorCount),
    [2, 1]
  );

  // 3 corner doors distribute as 80cm + 40cm. Editing cell 0 to 90cm
  // grows the wing to 130cm and shifts the peer cell in wing-local X.
  assertNear(plan.boxes[0]!.x, -0.15);
  assertNear(plan.boxes[1]!.x, 0.5);
  assertNear(plan.boxes[0]!.w, 0.9 - CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM);
  assertNear(plan.boxes[1]!.w, 0.4 - CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM);
});
