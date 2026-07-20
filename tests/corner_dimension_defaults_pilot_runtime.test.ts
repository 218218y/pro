import test from 'node:test';
import assert from 'node:assert/strict';

import { readPostBuildCornerDimensions } from '../esm/native/builder/post_build_dimensions_corner.ts';
import {
  CORNER_CONNECTOR_LAYOUT_POLICY,
  CORNER_WING_BODY_POLICY,
  CORNER_WING_CELL_POLICY,
} from '../esm/shared/dimensions/corner_system_policy.ts';
import { CM_PER_METER } from '../esm/shared/dimensions/units.ts';
import { WARDROBE_DEFAULTS } from '../esm/shared/dimensions/wardrobe_defaults.ts';
import {
  resolveTopCornerCellDefaultLayout,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../esm/native/features/modules_configuration/corner_cells_ui_defaults.ts';
import { buildCornerCellDimsContext } from '../esm/native/services/canvas_picking_cell_dims_corner_context.ts';

function readPostBuild(uiSnapshot: unknown) {
  return readPostBuildCornerDimensions({ uiSnapshot, dimH: 2.4, dimD: 0.6 });
}

test('Corner post-build defaults and centimeter conversions remain owner-driven', () => {
  const defaults = readPostBuild({});
  assert.equal(defaults.cornerWallLenM, CORNER_CONNECTOR_LAYOUT_POLICY.defaultWallLengthM);
  assert.equal(defaults.cornerWingLenM, CORNER_WING_BODY_POLICY.defaultWidthCm / CM_PER_METER);
  assert.equal(defaults.cornerWingDoorCount, WARDROBE_DEFAULTS.corner.doorsCount);
  assert.equal(defaults.cornerWingHeightM, 2.4);
  assert.equal(defaults.cornerWingDepthM, 0.6);

  const converted = readPostBuild({
    cornerWidth: 150,
    cornerHeight: 235,
    cornerDepth: 62,
    cornerCabinetWallLenCm: 125,
  });
  assert.equal(converted.cornerWingLenM, 1.5);
  assert.equal(converted.cornerWingHeightM, 2.35);
  assert.equal(converted.cornerWingDepthM, 0.62);
  assert.equal(converted.cornerWallLenM, 1.25);
});

test('Corner post-build preserves minimum-wall fallback and zero/negative width handling', () => {
  const minimumWallCm = CORNER_CONNECTOR_LAYOUT_POLICY.minWallLengthM * CM_PER_METER;
  assert.equal(
    readPostBuild({ cornerCabinetWallLenCm: minimumWallCm }).cornerWallLenM,
    CORNER_CONNECTOR_LAYOUT_POLICY.defaultWallLengthM
  );
  assert.equal(
    readPostBuild({ cornerCabinetWallLenCm: minimumWallCm + 1 }).cornerWallLenM,
    (minimumWallCm + 1) / CM_PER_METER
  );
  assert.equal(readPostBuild({ cornerWidth: 0 }).cornerWingLenM, 0);
  assert.equal(readPostBuild({ cornerWidth: -25 }).cornerWingLenM, 0);
});

test('Corner UI defaults preserve door-per-cell and side-aware layout behavior', () => {
  assert.equal(resolveTopCornerCellDefaultLayout(0), 'hanging_top2');
  assert.equal(resolveTopCornerCellDefaultLayout(1), 'shelves');

  assert.equal(
    resolveTopCornerCellDefaultLayoutFromUi(
      { cornerSide: 'left', cornerDoors: CORNER_WING_CELL_POLICY.doorsPerCell * 2 },
      0
    ),
    'shelves'
  );
  assert.equal(
    resolveTopCornerCellDefaultLayoutFromUi(
      { cornerSide: 'left', cornerDoors: CORNER_WING_CELL_POLICY.doorsPerCell * 2 },
      1
    ),
    'hanging_top2'
  );
  assert.equal(
    resolveTopCornerCellDefaultLayoutFromUi({ cornerSide: 'right', cornerDoors: 4 }, 0),
    'hanging_top2'
  );

  assert.equal(
    resolveTopCornerCellDefaultLayoutFromUi({ cornerSide: 'left' }, 1),
    'hanging_top2',
    'missing door count remains derived from the default Corner width'
  );
  assert.equal(
    resolveTopCornerCellDefaultLayoutFromUi({ cornerSide: 'left', cornerWidth: -1 }, 0),
    'hanging_top2'
  );
});

test('Canvas Corner context keeps canonical width, wall, and wardrobe defaults', () => {
  const context = buildCornerCellDimsContext({
    App: {} as any,
    ui: {},
    cfg: {},
    raw: {},
    applyW: null,
    applyH: null,
    applyD: null,
    foundModuleIndex: 'corner:0',
    foundPartId: null,
    ensureCornerCellConfigRef: () => null,
  });

  assert.equal(context.cornerWBase, CORNER_WING_BODY_POLICY.defaultWidthCm);
  assert.equal(context.wallLenBase, CORNER_CONNECTOR_LAYOUT_POLICY.defaultWallLengthM * CM_PER_METER);
  assert.equal(context.cornerHBase, WARDROBE_DEFAULTS.heightCm);
  assert.equal(context.cornerDBase, WARDROBE_DEFAULTS.byType.hinged.depthCm);
  assert.equal(context.curWingW, context.cornerWBase);
  assert.equal(context.curWallL, context.wallLenBase);
  assert.equal(context.cellIdx, 0);
  assert.equal(context.isPerCellWing, true);
});

test('Corner dimension snapshots preserve behavior across JSON persistence roundtrip', () => {
  const snapshot = {
    cornerSide: 'left',
    cornerDoors: 5,
    cornerWidth: 165,
    cornerHeight: 245,
    cornerDepth: 64,
    cornerCabinetWallLenCm: 118,
    cornerCabinetOffsetXcm: 7,
    cornerCabinetOffsetZcm: -3,
  };
  const before = readPostBuild(snapshot);
  const restored = JSON.parse(JSON.stringify(snapshot));
  const after = readPostBuild(restored);

  assert.deepEqual(after, before);
});
