import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CORNER_CONNECTOR_CORNICE_HIT_POLICY,
  CORNER_CONNECTOR_DOOR_RENDER_POLICY,
  CORNER_CONNECTOR_HANDLE_POLICY,
  CORNER_CONNECTOR_LAYOUT_POLICY,
  CORNER_CONNECTOR_POLICY,
  CORNER_CONNECTOR_SHELL_POLICY,
  CORNER_SYSTEM_POLICY,
  CORNER_WING_BASE_LEG_POLICY,
  CORNER_WING_BODY_POLICY,
  CORNER_WING_CEILING_POLICY,
  CORNER_WING_CELL_POLICY,
  CORNER_WING_DRAWER_POLICY,
  CORNER_WING_INTERIOR_POLICY,
  CORNER_WING_PANEL_POLICY,
  CORNER_WING_SELECTOR_POLICY,
} from '../esm/shared/dimensions/corner_system_policy.ts';
import { BASE_LEG_LAYOUT_POLICY } from '../esm/shared/dimensions/base_leg_policy.ts';
import { CARCASS_SHELL_DIMENSIONS } from '../esm/shared/dimensions/carcass_shell_policy.ts';
import {
  EXTERNAL_DRAWER_BOX_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_MOTION_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from '../esm/shared/dimensions/external_drawer_policy.ts';
import {
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_SHELF_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/interior_fittings_policy.ts';
import { INTERNAL_DRAWER_LAYOUT_POLICY } from '../esm/shared/dimensions/internal_drawer_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { WARDROBE_DEFAULTS } from '../esm/shared/dimensions/wardrobe_defaults.ts';
import { CORNER_WING_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

const EXPECTED_CORNER_SYSTEM_LEAVES = Object.freeze({
  wing: {
    defaultWidthCm: 120,
    minBodyHeightM: 0.2,
    minDepthM: 0.2,
    blindClearanceM: 0.05,
    minGroupWidthM: 0.001,
    minActiveWidthM: 0.01,
  },
  connector: {
    defaultWallLengthM: 1.03,
    minWallLengthM: 0.2,
    minFrontLengthM: 0.15,
    frontDoorGapM: 0.006,
    splitGapM: 0.006,
    doorMinWidthM: 0.05,
    doorMinHeightM: 0.25,
    doorBottomOffsetM: 0.002,
    doorTopClearanceM: 0.002,
    doorOutsetM: 0.001,
    splitGridDivisions: 6,
    splitGridLineIndex: 4,
    bottomStorageHeightM: 0.5,
    bottomLineMinGapM: 0.08,
    bottomLineTopGapM: 0.12,
    splitCutMinGapM: 0.08,
    splitCutToleranceMinM: 0.004,
    splitCutToleranceMaxM: 0.02,
    splitCutToleranceRatio: 0.01,
    minSegmentHeightM: 0.12,
    minRenderableSegmentHeightM: 0.1,
    visualMinWidthM: 0.03,
    visualMinHeightM: 0.2,
    shellMinWallHeightM: 0.05,
    shellWallHeightClearanceM: 0.002,
    shellBackPanelThicknessM: 0.005,
    shellBackPanelOutsideInsetM: 0.0025,
    shellPanelMinLengthM: 0.01,
    shellNoOverlapInsetExtraM: 0.001,
    shellPlateSideInsetExtraM: 0.0006,
    shellAttachFaceEpsilonM: 0.0002,
    shellBackJunctionInsetM: 0.002,
    shellAttachPanelEpsilonM: 0.0008,
    shellBackInsetXM: 0.0078,
    shellBackInsetZM: 0.0078,
    shellFrontInsetM: 0.005,
    shellBaseMinHeightM: 0.001,
    shellCorniceHitMinM: 0.05,
    corniceHitMinWidthM: 0.05,
    corniceHitHeightClearanceM: 0.05,
    fullDoorTopHandleClearanceM: 0.002,
    visualWidthClearanceM: 0.004,
    visualHeightClearanceM: 0.004,
    frontThicknessM: 0.018,
    frontTrimZOffsetM: 0.011,
    hitboxThicknessM: 0.018,
    edgeHandleShortInsetM: 0.1,
    edgeHandleLongInsetM: 0.2,
    edgeHandleLongLiftM: 0.1,
    edgeHandleLiftDrawerCountThreshold: 4,
    edgeHandleDefaultAbsY: 1.05,
    edgeHandleLiftDoorBottomThresholdM: 0.9,
    edgeHandleLiftExtraM: 0.15,
  },
  interior: {
    minInnerFaceGapM: 0.02,
    minCellWidthM: 0.05,
    minCellDepthM: 0.2,
    shelfWidthClearanceM: 0.005,
    internalDepthBackClearanceM: 0.05,
    regularShelfDepthM: 0.45,
    fullDepthCenterBackInsetM: 0.015,
    shelfContentsTopClearanceM: 0.006,
    shelfTopPlacementGuardM: 0.01,
    foldedContentsMinWidthM: 0.05,
    foldedContentsWidthClearanceM: 0.06,
  },
  panels: {
    fallbackSegmentWidthM: 0.2,
    minPanelHeightM: 0.05,
    minPanelWidthM: 0.05,
    panelWidthClearanceM: 0.002,
    minBlindWidthM: 0.001,
    minCellDepthM: 0.2,
    minWallDepthM: 0.05,
    noZFightAttachInsetM: 0.0012,
  },
  selector: {
    minDepthM: 0.2,
    minWidthM: 0.01,
    widthClearanceM: 0.001,
    fallbackMinWidthM: 0.01,
  },
  ceiling: {
    noZFightAttachInsetM: 0.0012,
    minDepthM: 0.05,
    minWidthM: 0.05,
    widthClearanceM: 0.001,
  },
  cells: {
    doorsPerCell: 2,
    defaultGridDivisions: 6,
    splitGridLineIndex: 4,
    minWidthM: 0.05,
    minDoorUnitWidthM: 0.2,
    widthAdjustmentEpsilonM: 1e-6,
    minAbsDepthCm: 20,
    minAbsDepthWoodMultiplier: 4,
    minBodyWoodMultiplier: 2,
  },
  drawers: {
    shoeHeightM: 0.2,
    externalRegularHeightM: 0.22,
    internalDefaultDepthM: 0.5,
    internalMaxSingleDrawerHeightM: 0.35,
    internalDefaultSingleHeightM: 0.165,
    internalVerticalInsetM: 0.02,
    internalMinHeightM: 0.01,
    internalFirstBottomGapM: 0.01,
    internalBetweenGapM: 0.03,
    rodMinLengthM: 0.05,
    rodWidthClearanceM: 0.02,
    hangingClothesWidthClearanceM: 0.06,
    internalMinWidthM: 0.1,
    internalWidthClearanceM: 0.1,
    internalMinDepthM: 0.08,
    internalDepthClearanceM: 0.12,
    internalClosedBackOffsetM: 0.02,
    internalOpenBackOffsetM: 0.3,
    internalStackCount: 2,
    shelfOverDrawerMinDepthM: 0.05,
    shelfOverDrawerDepthClearanceM: 0.002,
    externalFrontOffsetZM: 0.01,
    externalOpenOffsetZM: 0.35,
    externalVisualWidthClearanceM: 0.004,
    externalBoxWidthClearanceM: 0.044,
    externalBoxHeightClearanceM: 0.04,
    externalBoxDepthBackClearanceM: 0.1,
    externalBoxOffsetZM: 0.005,
    drawerShadowWidthClearanceM: 0.01,
    drawerShadowHeightM: 0.008,
    drawerShadowDepthM: 0.01,
    drawerShadowFrontOffsetM: 0.005,
  },
  baseLegs: {
    minCount: 2,
    spacingM: 0.6,
    widthClearanceM: 0.1,
    insetM: 0.05,
  },
});

test('Corner System preserves the exhaustive pre-migration leaf snapshot', () => {
  assert.deepEqual(CORNER_SYSTEM_POLICY, EXPECTED_CORNER_SYSTEM_LEAVES);
  assert.equal(Object.keys(CORNER_SYSTEM_POLICY).length, 9);
});

test('Corner System facade and compatibility sections preserve runtime identity', () => {
  assert.equal(CORNER_WING_DIMENSIONS, CORNER_SYSTEM_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.wing, CORNER_WING_BODY_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.connector, CORNER_CONNECTOR_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.interior, CORNER_WING_INTERIOR_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.panels, CORNER_WING_PANEL_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.selector, CORNER_WING_SELECTOR_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.ceiling, CORNER_WING_CEILING_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.cells, CORNER_WING_CELL_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.drawers, CORNER_WING_DRAWER_POLICY);
  assert.equal(CORNER_SYSTEM_POLICY.baseLegs, CORNER_WING_BASE_LEG_POLICY);

  for (const policy of [
    CORNER_WING_BODY_POLICY,
    CORNER_CONNECTOR_LAYOUT_POLICY,
    CORNER_CONNECTOR_DOOR_RENDER_POLICY,
    CORNER_CONNECTOR_SHELL_POLICY,
    CORNER_CONNECTOR_CORNICE_HIT_POLICY,
    CORNER_CONNECTOR_HANDLE_POLICY,
    CORNER_CONNECTOR_POLICY,
    CORNER_WING_INTERIOR_POLICY,
    CORNER_WING_PANEL_POLICY,
    CORNER_WING_SELECTOR_POLICY,
    CORNER_WING_CEILING_POLICY,
    CORNER_WING_CELL_POLICY,
    CORNER_WING_DRAWER_POLICY,
    CORNER_WING_BASE_LEG_POLICY,
    CORNER_SYSTEM_POLICY,
  ]) {
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('Corner System composes only canonical matching invariants from existing owners', () => {
  assert.equal(CORNER_WING_BODY_POLICY.defaultWidthCm, WARDROBE_DEFAULTS.corner.widthCm);

  assert.equal(CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM, CARCASS_SHELL_DIMENSIONS.bodyMinHeightM);
  assert.equal(
    CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelThicknessM,
    CARCASS_SHELL_DIMENSIONS.backPanelThicknessM
  );
  assert.equal(CORNER_CONNECTOR_SHELL_POLICY.shellBackInsetXM, CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);
  assert.equal(CORNER_CONNECTOR_SHELL_POLICY.shellBackInsetZM, CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);
  assert.equal(CORNER_CONNECTOR_SHELL_POLICY.shellFrontInsetM, CARCASS_SHELL_DIMENSIONS.frontInsetZM);
  assert.equal(
    CORNER_CONNECTOR_SHELL_POLICY.shellBaseMinHeightM,
    CARCASS_SHELL_DIMENSIONS.boardMinDimensionM
  );
  assert.equal(
    CORNER_CONNECTOR_CORNICE_HIT_POLICY.shellCorniceHitMinM,
    CARCASS_SHELL_DIMENSIONS.bodyMinHeightM
  );
  assert.equal(
    CORNER_CONNECTOR_CORNICE_HIT_POLICY.corniceHitMinWidthM,
    CARCASS_SHELL_DIMENSIONS.bodyMinHeightM
  );
  assert.equal(
    CORNER_CONNECTOR_CORNICE_HIT_POLICY.corniceHitHeightClearanceM,
    CARCASS_SHELL_DIMENSIONS.bodyMinHeightM
  );

  assert.equal(
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.frontThicknessM,
    MATERIAL_THICKNESS_POLICY.wood.thicknessM
  );
  assert.equal(
    CORNER_CONNECTOR_DOOR_RENDER_POLICY.hitboxThicknessM,
    MATERIAL_THICKNESS_POLICY.wood.thicknessM
  );

  assert.equal(CORNER_WING_INTERIOR_POLICY.regularShelfDepthM, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM);
  assert.equal(
    CORNER_WING_INTERIOR_POLICY.shelfContentsTopClearanceM,
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM
  );
  assert.equal(
    CORNER_WING_INTERIOR_POLICY.foldedContentsWidthClearanceM,
    INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM
  );

  assert.equal(CORNER_WING_DRAWER_POLICY.shoeHeightM, EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM);
  assert.equal(CORNER_WING_DRAWER_POLICY.externalRegularHeightM, EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM);
  assert.equal(
    CORNER_WING_DRAWER_POLICY.externalFrontOffsetZM,
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM
  );
  assert.equal(CORNER_WING_DRAWER_POLICY.externalOpenOffsetZM, EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM);
  assert.equal(
    CORNER_WING_DRAWER_POLICY.externalVisualWidthClearanceM,
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  assert.equal(
    CORNER_WING_DRAWER_POLICY.externalBoxWidthClearanceM,
    EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM
  );
  assert.equal(
    CORNER_WING_DRAWER_POLICY.externalBoxHeightClearanceM,
    EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM
  );
  assert.equal(
    CORNER_WING_DRAWER_POLICY.externalBoxDepthBackClearanceM,
    EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM
  );
  assert.equal(CORNER_WING_DRAWER_POLICY.externalBoxOffsetZM, EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM);

  const internalReferences = [
    ['internalDefaultDepthM', 'defaultDepthM'],
    ['internalMaxSingleDrawerHeightM', 'maxSingleDrawerHeightM'],
    ['internalDefaultSingleHeightM', 'defaultSingleDrawerHeightM'],
    ['internalVerticalInsetM', 'verticalInsetM'],
    ['internalMinHeightM', 'minDrawerHeightM'],
    ['internalFirstBottomGapM', 'firstDrawerBottomGapM'],
    ['internalBetweenGapM', 'betweenDrawersGapM'],
    ['internalStackCount', 'stackCount'],
  ] as const;
  for (const [cornerField, ownerField] of internalReferences) {
    assert.equal(CORNER_WING_DRAWER_POLICY[cornerField], INTERNAL_DRAWER_LAYOUT_POLICY[ownerField]);
  }

  assert.equal(CORNER_WING_BASE_LEG_POLICY.insetM, BASE_LEG_LAYOUT_POLICY.cornerInsetM);
});
