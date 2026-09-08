import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../esm/shared/dimensions/cell_dimension_policy.ts';
import { resolveLinearCellDimsLayoutPreview } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims_layout.ts';

function assertNear(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `expected ${actual} to equal ${expected}`);
}

const PREVIEW_POLICY_ARGS = {
  matchToleranceCm: CELL_DIMENSION_MATCH_POLICY.toleranceCm,
  minWidthM: CELL_DIMENSION_PREVIEW_POLICY.minWidthM,
  minHeightM: CELL_DIMENSION_PREVIEW_POLICY.minHeightM,
  minDepthM: CELL_DIMENSION_PREVIEW_POLICY.minDepthM,
  widthClearanceM: CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM,
  heightClearanceM: CELL_DIMENSION_PREVIEW_POLICY.heightClearanceM,
};

function createSelector(moduleIndex: number) {
  return {
    userData: {
      isModuleSelector: true,
      moduleIndex,
      __wpStack: 'top',
    },
    children: [],
  };
}

test('cell-dims full-layout preview uses commit width policy and predicts every shifted linear cell', () => {
  const selectors = [0, 1, 2, 3].map(createSelector);
  const wardrobeRoot = { children: selectors };
  const currentBoxes = new Map<unknown, Record<string, number>>([
    [selectors[0], { centerX: -0.6705, centerY: 1, centerZ: 0, width: 0.423, height: 1.96, depth: 0.55 }],
    [selectors[1], { centerX: -0.225, centerY: 1, centerZ: 0, width: 0.432, height: 1.96, depth: 0.55 }],
    [selectors[2], { centerX: 0.225, centerY: 1, centerZ: 0, width: 0.432, height: 1.96, depth: 0.55 }],
    [selectors[3], { centerX: 0.6705, centerY: 1, centerZ: 0, width: 0.423, height: 1.96, depth: 0.55 }],
  ]);
  const state = {
    ui: {
      raw: {
        width: 180,
        height: 200,
        depth: 55,
        doors: 4,
      },
      singleDoorPos: 'left',
      structureSelect: '[1,1,1,1]',
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: 1 }, { doors: 1 }, { doors: 1 }, { doors: 1 }],
    },
    runtime: {},
    mode: {},
    meta: {},
  };
  const App = {
    store: {
      getState: () => state,
      patch() {},
    },
    render: { wardrobeGroup: wardrobeRoot },
  } as any;
  const target = {
    hitModuleKey: 1,
    hitSelectorObj: selectors[1],
    isBottom: false,
    hitY: 1,
    info: {},
    bottomY: 0.018,
    topY: 1.982,
    spanH: 1.964,
    woodThick: 0.018,
    innerW: 0.432,
    internalCenterX: -0.225,
    internalDepth: 0.55,
    internalZ: 0,
    backZ: -0.275,
    regularDepth: 0.55,
    intersects: [],
  } as any;

  const plan = resolveLinearCellDimsLayoutPreview({
    App,
    target,
    applyW: 70,
    applyH: null,
    applyD: null,
    cellDoorCount: null,
    measureObjectLocalBox: (_App, object, parent) => {
      assert.equal(parent, wardrobeRoot);
      return (currentBoxes.get(object) ?? null) as any;
    },
    ...PREVIEW_POLICY_ARGS,
  });

  assert.ok(plan);
  assert.equal(plan.anchor, wardrobeRoot);
  assert.equal(plan.anchorParent, wardrobeRoot);
  assert.equal(plan.boxes.length, 4);
  assert.deepEqual(
    plan.boxes.map(box => box.selected),
    [false, true, false, false]
  );
  assert.equal(plan.selectedBox, plan.boxes[1]);
  assert.deepEqual(
    plan.boxes.map(box => box.doorCount),
    [1, 1, 1, 1]
  );

  // Same width policy as commit: [45, 70, 45, 45]cm, with the canonical
  // wall/divider insets. Preview clearance is applied only to the visual box.
  const clearance = CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM;
  const expectedWidths = [0.423, 0.682, 0.432, 0.423].map(width => width - clearance);
  const expectedCenters = [-0.7955, -0.225, 0.35, 0.7955];
  for (let i = 0; i < plan.boxes.length; i += 1) {
    assertNear(plan.boxes[i]!.w, expectedWidths[i]!);
    assertNear(plan.boxes[i]!.x, expectedCenters[i]!);
  }

  // This is the regression the old single-cell hover could not expose:
  // the neighboring cells have visibly moved even though only cell 1 was edited.
  assert.notEqual(plan.boxes[0]!.x, currentBoxes.get(selectors[0])!.centerX);
  assert.notEqual(plan.boxes[2]!.x, currentBoxes.get(selectors[2])!.centerX);
  assert.notEqual(plan.boxes[3]!.x, currentBoxes.get(selectors[3])!.centerX);

  const doorCountPlan = resolveLinearCellDimsLayoutPreview({
    App,
    target,
    applyW: null,
    applyH: null,
    applyD: null,
    cellDoorCount: 2,
    measureObjectLocalBox: (_App, object) => (currentBoxes.get(object) ?? null) as any,
    ...PREVIEW_POLICY_ARGS,
  });
  assert.ok(doorCountPlan);
  assert.deepEqual(
    doorCountPlan.boxes.map(box => box.doorCount),
    [1, 2, 1, 1]
  );
});

test('cell-dims full-layout preview fails closed outside the proven top linear layout', () => {
  const selector = createSelector(0);
  const wardrobeRoot = { children: [selector] };
  const state = {
    ui: { raw: { width: 90, height: 200, depth: 55, doors: 1 } },
    config: { wardrobeType: 'hinged', modulesConfiguration: [{ doors: 1 }] },
    runtime: {},
    mode: {},
    meta: {},
  };
  const App = {
    store: { getState: () => state, patch() {} },
    render: { wardrobeGroup: wardrobeRoot },
  } as any;
  const baseTarget = {
    hitModuleKey: 0,
    hitSelectorObj: selector,
    isBottom: false,
    woodThick: 0.018,
  } as any;

  const singleCell = resolveLinearCellDimsLayoutPreview({
    App,
    target: baseTarget,
    applyW: 100,
    applyH: null,
    applyD: null,
    cellDoorCount: null,
    measureObjectLocalBox: () => ({
      centerX: 0,
      centerY: 1,
      centerZ: 0,
      width: 0.864,
      height: 1.96,
      depth: 0.55,
    }),
    ...PREVIEW_POLICY_ARGS,
  });
  assert.equal(singleCell, null);

  const bottomCell = resolveLinearCellDimsLayoutPreview({
    App,
    target: { ...baseTarget, isBottom: true },
    applyW: 100,
    applyH: null,
    applyD: null,
    cellDoorCount: null,
    measureObjectLocalBox: () => ({
      centerX: 0,
      centerY: 1,
      centerZ: 0,
      width: 0.864,
      height: 1.96,
      depth: 0.55,
    }),
    ...PREVIEW_POLICY_ARGS,
  });
  assert.equal(bottomCell, null);
});
