// Transitional facade for wardrobe/product dimension tokens.
// New consumers must import the focused owner under ./dimensions; existing
// domain tokens remain here while consumers move one policy family at a time.

import { CM_PER_METER, MM_PER_METER, clampDimension, cmToM, mToCm } from './dimensions/units.js';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  HINGED_DEFAULT_PER_DOOR_WIDTH,
  SLIDING_DEFAULT_DEPTH,
  SLIDING_DEFAULT_PER_DOOR_WIDTH,
  WARDROBE_DEFAULTS as WARDROBE_DEFAULTS_OWNER,
} from './dimensions/wardrobe_defaults.js';
import type { WardrobeDimensionDefaultType } from './dimensions/wardrobe_defaults.js';
import {
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  STACK_SPLIT_POLICY,
  STACK_SPLIT_SEAM_GAP_M,
} from './dimensions/stack_split_policy.js';
import { STACK_SPLIT_RENDER_POLICY } from './dimensions/stack_split_render_policy.js';
import { CARCASS_SHELL_DIMENSIONS } from './dimensions/carcass_shell_policy.js';
import { CARCASS_INTERIOR_DIMENSIONS } from './dimensions/carcass_interior_policy.js';
import { BASE_PLINTH_POLICY } from './dimensions/base_plinth_policy.js';
import {
  BASE_LEG_DIMENSIONS as BASE_LEG_DIMENSIONS_OWNER,
  BASE_LEG_LAYOUT_POLICY,
} from './dimensions/base_leg_policy.js';
import { CHEST_STRUCTURAL_DIMENSIONS as CHEST_STRUCTURAL_DIMENSIONS_OWNER } from './dimensions/chest_structural_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './dimensions/material_thickness_policy.js';
import { CARCASS_CORNICE_RENDER_POLICY } from './dimensions/carcass_cornice_render_policy.js';
import { CHEST_MODE_DIMENSIONS as CHEST_MODE_DIMENSIONS_OWNER } from './dimensions/chest_mode_policy.js';
import { DOOR_SYSTEM_DIMENSIONS as DOOR_SYSTEM_DIMENSIONS_OWNER } from './dimensions/door_system_policy.js';
import { DOOR_MOUNT_THICKNESS_DIMENSIONS as DOOR_MOUNT_THICKNESS_DIMENSIONS_OWNER } from './dimensions/door_mount_thickness_policy.js';
import { DOOR_VISUAL_DIMENSIONS as DOOR_VISUAL_DIMENSIONS_OWNER } from './dimensions/door_visual_policy.js';
import { DOOR_TRIM_DIMENSIONS as DOOR_TRIM_DIMENSIONS_OWNER } from './dimensions/door_trim_policy.js';
import { EXTERNAL_DRAWER_POLICY } from './dimensions/external_drawer_policy.js';
import { INTERNAL_DRAWER_POLICY } from './dimensions/internal_drawer_policy.js';
import {
  STACK_SPLIT_LOWER_DEPTH_MAX,
  STACK_SPLIT_LOWER_DEPTH_MIN,
  STACK_SPLIT_LOWER_DOORS_MAX,
  STACK_SPLIT_LOWER_DOORS_MIN,
  STACK_SPLIT_LOWER_HEIGHT_MIN,
  STACK_SPLIT_LOWER_WIDTH_MAX,
  STACK_SPLIT_LOWER_WIDTH_MIN,
  STACK_SPLIT_MIN_TOP_HEIGHT,
  WARDROBE_CELL_DEPTH_MAX,
  WARDROBE_CELL_DEPTH_MIN,
  WARDROBE_CELL_DIM_MIN,
  WARDROBE_CELL_HEIGHT_MAX,
  WARDROBE_CELL_HEIGHT_MIN,
  WARDROBE_CELL_WIDTH_MAX,
  WARDROBE_CELL_WIDTH_MIN,
  WARDROBE_CHEST_DRAWERS_MAX,
  WARDROBE_CHEST_DRAWERS_MIN,
  WARDROBE_CHEST_HEIGHT_MIN,
  WARDROBE_CHEST_WIDTH_MIN,
  WARDROBE_DEPTH_MAX,
  WARDROBE_DEPTH_MIN,
  WARDROBE_DOORS_MAX,
  WARDROBE_DOORS_MIN,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_LIMITS,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
} from './dimensions/product_limits.js';

type LegacyDimensionNumberView<T> = T extends number
  ? number
  : T extends object
    ? { readonly [Key in keyof T]: LegacyDimensionNumberView<T[Key]> }
    : T;

function legacyDimensionNumberView<T>(value: T): LegacyDimensionNumberView<T> {
  return value as LegacyDimensionNumberView<T>;
}

const BASE_LEG_DIMENSIONS = legacyDimensionNumberView(BASE_LEG_DIMENSIONS_OWNER);
const BASE_PLINTH_DIMENSIONS = legacyDimensionNumberView(BASE_PLINTH_POLICY);
const BASE_LEG_LAYOUT_DIMENSIONS = legacyDimensionNumberView(BASE_LEG_LAYOUT_POLICY);
const CHEST_STRUCTURAL_DIMENSIONS = legacyDimensionNumberView(CHEST_STRUCTURAL_DIMENSIONS_OWNER);
const MATERIAL_DIMENSIONS = legacyDimensionNumberView(MATERIAL_THICKNESS_POLICY);
const CARCASS_CORNICE_DIMENSIONS = legacyDimensionNumberView(CARCASS_CORNICE_RENDER_POLICY);
const CHEST_MODE_DIMENSIONS = legacyDimensionNumberView(CHEST_MODE_DIMENSIONS_OWNER);
const DOOR_SYSTEM_DIMENSIONS = legacyDimensionNumberView(DOOR_SYSTEM_DIMENSIONS_OWNER);
const DOOR_MOUNT_THICKNESS_DIMENSIONS = legacyDimensionNumberView(DOOR_MOUNT_THICKNESS_DIMENSIONS_OWNER);
const DOOR_VISUAL_DIMENSIONS = legacyDimensionNumberView(DOOR_VISUAL_DIMENSIONS_OWNER);
const DOOR_TRIM_DIMENSIONS = legacyDimensionNumberView(DOOR_TRIM_DIMENSIONS_OWNER);
const EXTERNAL_DRAWER_DIMENSIONS = legacyDimensionNumberView(EXTERNAL_DRAWER_POLICY);
const INTERNAL_DRAWER_DIMENSIONS = legacyDimensionNumberView(INTERNAL_DRAWER_POLICY);

const WARDROBE_DEFAULTS = Object.freeze({
  ...WARDROBE_DEFAULTS_OWNER,
  stackSplit: Object.freeze({
    lowerHeightCm: STACK_SPLIT_POLICY.defaults.lowerHeightCm,
    minTopHeightCm: STACK_SPLIT_POLICY.limits.minTopHeightCm,
    minLowerHeightCm: STACK_SPLIT_POLICY.limits.minLowerHeightCm,
    seamGapM: STACK_SPLIT_POLICY.seam.gapM,
    lowerWidthDefaultCm: STACK_SPLIT_POLICY.defaults.lowerWidthCm,
    decorativeSeparator: STACK_SPLIT_RENDER_POLICY.decorativeSeparator,
  }),
});

export { CM_PER_METER, MM_PER_METER, clampDimension, cmToM, mToCm };
export type { Centimeters, Meters, Millimeters, Pixels, WorldUnits } from './dimensions/units.js';
export {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  DEFAULT_WIDTH,
  DOOR_MOUNT_THICKNESS_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS,
  DOOR_VISUAL_DIMENSIONS,
  HINGED_DEFAULT_DEPTH,
  HINGED_DEFAULT_PER_DOOR_WIDTH,
  SLIDING_DEFAULT_DEPTH,
  SLIDING_DEFAULT_PER_DOOR_WIDTH,
  STACK_SPLIT_SEAM_GAP_M,
  WARDROBE_DEFAULTS,
};
export type { WardrobeDimensionDefaultType } from './dimensions/wardrobe_defaults.js';
export {
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  getDefaultDoorMountThicknessCm,
  getDefaultDoorMountThicknessM,
  getDoorMountThicknessConfigKey,
  normalizeDoorMountThicknessCm,
  resolveDoorMountThicknessesFromConfig,
} from './dimensions/door_mount_thickness_policy.js';
export type {
  DoorMountConstructionMode,
  DoorMountThicknessConfigKey,
  DoorMountThicknessKind,
} from './dimensions/door_mount_thickness_policy.js';
export { CARCASS_SHELL_DIMENSIONS, CARCASS_INTERIOR_DIMENSIONS };
export {
  STACK_SPLIT_LOWER_DEPTH_MAX,
  STACK_SPLIT_LOWER_DEPTH_MIN,
  STACK_SPLIT_LOWER_DOORS_MAX,
  STACK_SPLIT_LOWER_DOORS_MIN,
  STACK_SPLIT_LOWER_HEIGHT_MIN,
  STACK_SPLIT_LOWER_WIDTH_MAX,
  STACK_SPLIT_LOWER_WIDTH_MIN,
  STACK_SPLIT_MIN_TOP_HEIGHT,
  WARDROBE_CELL_DEPTH_MAX,
  WARDROBE_CELL_DEPTH_MIN,
  WARDROBE_CELL_DIM_MIN,
  WARDROBE_CELL_HEIGHT_MAX,
  WARDROBE_CELL_HEIGHT_MIN,
  WARDROBE_CELL_WIDTH_MAX,
  WARDROBE_CELL_WIDTH_MIN,
  WARDROBE_CHEST_DRAWERS_MAX,
  WARDROBE_CHEST_DRAWERS_MIN,
  WARDROBE_CHEST_HEIGHT_MIN,
  WARDROBE_CHEST_WIDTH_MIN,
  WARDROBE_DEPTH_MAX,
  WARDROBE_DEPTH_MIN,
  WARDROBE_DOORS_MAX,
  WARDROBE_DOORS_MIN,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_LIMITS,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
};

function finiteOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export const WARDROBE_LAYOUT_DIMENSIONS = Object.freeze({
  minSegmentWidthCm: 1,
  boundaryFullThicknessMultiplier: 1,
  boundarySharedThicknessMultiplier: 0.5,
  autoWidthMatchToleranceCm: 0.51,
  valueEqualityToleranceCm: 0.0001,
  cellDimsMatchToleranceCm: 0.11,
  cellDimsPreview: Object.freeze({
    minWidthM: 0.03,
    minHeightM: 0.03,
    widthClearanceM: 0.006,
    heightClearanceM: 0.006,
    minDepthM: 0.024,
    woodThicknessMinM: 0.004,
    woodThicknessMaxM: 0.01,
    woodThicknessScale: 0.5,
  }),
});

export const WARDROBE_DIMENSION_GUIDE_DIMENSIONS = Object.freeze({
  textScale: Object.freeze({
    total: 1,
    cell: 0.78,
    cornerTotal: 0.9,
  }),
  verticalPlacement: Object.freeze({
    totalYOffsetWithCorniceM: 0.28,
    totalYOffsetWithoutCorniceM: 0.23,
    cellYOffsetWithCorniceM: 0.2,
    cellYOffsetWithoutCorniceM: 0.15,
  }),
  main: Object.freeze({
    totalWidthTextYOffsetM: 0.1,
    cellWidthTextYOffsetM: 0.07,
    heightLineOffsetM: 0.3,
    stackSplitHeightLineOffsetM: 0.54,
    heightTextOffsetM: 0.1,
    cellHeightLineDeltaM: 0.12,
    stackSplitCellHeightLineDeltaM: 0.24,
    cellHeightTextOffsetM: 0.08,
    cellHeightLabelYOffsetM: -0.26,
    depthLineOffsetXM: 0.24,
    depthTextOffsetXM: 0.2,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    smallDepthLineOffsetXM: 0.16,
    smallDepthTextOffsetXM: 0.18,
    smallDepthStartYOffsetM: 0.57,
    smallDepthEndYOffsetM: 0.37,
    minDistinctDepthDeltaCm: 1,
  }),
  corner: Object.freeze({
    connectorWallMinLengthM: 0.05,
    expandedWidthEpsilonM: 0.01,
    expandedWidthYOffsetM: 0.12,
    expandedWidthTextYOffsetM: 0.1,
    wingMinLengthM: 0.01,
    wingTotalTextYOffsetM: 0.1,
    wingCellTextYOffsetM: 0.07,
    connectorDepthMidRatio: 0.55,
    connectorDepthInsetM: 0.08,
    connectorDepthMinM: 0.2,
    connectorHeightLineRatio: 0.55,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    depthTextOffsetZM: 0.28,
    heightTextOffsetZM: 0.46,
    wingHeightLineRatio: 0.55,
  }),
});

export const NO_MAIN_SKETCH_DIMENSIONS = Object.freeze({
  defaultGridDivisions: 6,
  workspacePaddingM: 0.12,
  defaultWorkspaceWidthM: 1.6,
  minHostHeightM: 0.05,
  minInnerWidthM: 0.02,
  minGridSpanM: 0.02,
});

export const LIBRARY_PRESET_DIMENSIONS = Object.freeze({
  defaultDoorsCount: 6,
  defaultModuleDoorsCount: 2,
  topGridDivisions: 5,
  lowerGridDivisions: 2,
  minWidthCm: 20,
  minLowerDepthCm: STACK_SPLIT_POLICY.limits.lowerDepthMinCm,
  minLowerHeightCm: STACK_SPLIT_POLICY.limits.minLowerHeightCm,
  minTopHeightCm: STACK_SPLIT_POLICY.limits.minTopHeightCm,
  defaultLowerHeightCm: 80,
  lowerDepthInsetCm: 5,
});

export const CARCASS_BASE_DIMENSIONS = Object.freeze({
  plinth: BASE_PLINTH_DIMENSIONS,
  legs: BASE_LEG_LAYOUT_DIMENSIONS,
  chest: CHEST_STRUCTURAL_DIMENSIONS,
});

export {
  BASE_LEG_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  MATERIAL_DIMENSIONS,
};

export const INTERIOR_FITTINGS_DIMENSIONS = Object.freeze({
  shelves: Object.freeze({
    regularDepthM: 0.45,
    regularWidthClearanceM: 0.014,
    braceWidthClearanceM: 0,
    contentsWidthClearanceM: 0.06,
    contentsHeightClearanceM: 0.006,
    spanMinHeightM: 0.05,
    doubleThicknessMultiplier: 2,
    roundedCornerRadiusM: 0.12,
    roundedCornerSegments: 18,
  }),
  pins: Object.freeze({
    radiusM: 0.0025,
    lengthM: 0.012,
    edgeOffsetDefaultM: 0.04,
    bottomYOffsetM: 0.0005,
    maxDepthSideClearanceM: 0.02,
    minEdgeOffsetM: 0.015,
    radialSegments: 12,
  }),
  rods: Object.freeze({
    radiusM: 0.015,
    widthClearanceM: 0.04,
    radialSegments: 12,
    drawerVerticalGuardM: 0.05,
    minHangingHeightM: 0.75,
    depthBackClearanceM: 0.04,
    doorFrontClearanceM: 0.025,
    storageDepthLimitM: 0.3,
    depthHintMinM: 0.12,
    depthHintMaxM: 0.45,
    contentsWidthClearanceM: 0.06,
    defaultYOffsetM: -0.08,
  }),
  storage: Object.freeze({
    gridDivisionsDefault: 6,
    barrierHeightM: 0.5,
    barrierHeightMinM: 0.05,
    barrierHeightMaxM: 1.2,
    barrierFrontZOffsetM: -0.06,
    barrierWidthMinM: 0.05,
    barrierWidthClearanceM: 0.025,
    previewThicknessMinM: 0.0001,
    clampPadMinM: 0.001,
    clampPadMaxM: 0.006,
    clampPadWoodRatio: 0.2,
    minHeightExtraM: 0.02,
    minHeightWoodMultiplier: 2,
    defaultLowerShelfSlots: Object.freeze([false, true, false, true, false, false]),
  }),
  presets: Object.freeze({
    fullShelfRows: Object.freeze([1, 2, 3, 4, 5]),
    hangingShelfRows: Object.freeze([5, 4]),
    splitShelfRows: Object.freeze([5, 1]),
    mixedRodYFactor: 3.5,
    hangingRodYFactor: 3.8,
    splitUpperRodYFactor: 4.8,
    splitUpperRodLimitFactor: 2.5,
    splitLowerRodYFactor: 2.3,
    splitLowerRodLimitFactor: 1.3,
    storageRodYFactor: 3.8,
    storageRodLimitFactor: 3.8,
  }),
});

export const CONTENT_VISUAL_DIMENSIONS = Object.freeze({
  books: Object.freeze({
    depthMarginM: 0.018,
    sideMarginM: 0.035,
    topSafetyM: 0.014,
    minHeightM: 0.07,
    minStackHeightM: 0.04,
    defaultMaxDepthM: 0.38,
    depthMaxM: 0.32,
    depthMinM: 0.12,
    depthRandomTrimRangeM: 0.045,
    depthViabilityMinM: 0.06,
    cursorEndGapM: 0.018,
    maxCount: 96,
    widthBaseM: 0.022,
    widthRandomRangeM: 0.026,
    setWidthBaseM: 0.026,
    setWidthRandomRangeM: 0.012,
    talmudSetWidthBaseM: 0.032,
    talmudSetWidthRandomRangeM: 0.01,
    narrowSetWidthBaseM: 0.019,
    narrowSetWidthRandomRangeM: 0.009,
    gapBaseM: 0.003,
    gapRandomRangeM: 0.006,
    setGapBaseM: 0.0016,
    setGapRandomRangeM: 0.0022,
    setTrailingGapM: 0.007,
    tiltZRangeRad: 0.045,
    setTiltZRangeRad: 0.018,
    edgeTiltZRangeRad: 0.04,
    angleCosMin: 0.001,
    heightBaseM: 0.16,
    heightRandomRangeM: 0.18,
    alignedHeightRatioBase: 0.78,
    alignedHeightRatioRange: 0.15,
    setHeightVariationM: 0.012,
    edgeHeightVariationM: 0.028,
    talmudHeightBoostM: 0.028,
    narrowSetHeightTrimM: 0.018,
    edgeZoneRatio: 0.14,
    edgeZoneMaxM: 0.13,
    setChance: 0.76,
    talmudSetChance: 0.34,
    narrowSetChance: 0.28,
    setMinVolumes: 5,
    setMaxVolumes: 14,
    shortRunMinVolumes: 2,
    shortRunMaxVolumes: 5,
    widthMinM: 0.01,
    spineBandChance: 0.82,
    spineBandHeightM: 0.008,
    spineBandThicknessM: 0.003,
    spineBandWidthInsetRatio: 0.18,
    spineBandYOffsetRatioA: 0.22,
    spineBandYOffsetRatioB: -0.18,
    stackChance: 0.08,
    stackLookaheadM: 0.04,
    stackMaxItems: 2,
    stackWidthBaseM: 0.07,
    stackWidthRandomRangeM: 0.035,
    stackTrailingGapM: 0.012,
    stackWidthMinM: 0.035,
    stackHeightBaseM: 0.04,
    stackHeightRandomRangeM: 0.018,
    stackDepthScaleBase: 0.92,
    stackDepthScaleRange: 0.08,
    stackXOffsetM: 0.014,
    stackCursorAdvanceM: 0.035,
    stackTiltYRangeRad: 0.04,
  }),
  foldedClothes: Object.freeze({
    defaultMaxHeightM: 0.5,
    baseItemDepthM: 0.36,
    depthMarginM: 0.015,
    minItemDepthM: 0.12,
    zSpreadMaxM: 0.015,
    zSpreadRatio: 0.35,
    itemHeightM: 0.025,
    heightHeadroomM: 0.03,
    stackPitchM: 0.3,
    stackXInsetM: 0.15,
    randomItemsRange: 4,
    stackBaseItems: 4,
    minHeightForSingleItemM: 0.06,
    itemWidthM: 0.26,
    cornerRadiusM: 0.008,
    randomOffsetXM: 0.015,
    rotationYRangeRad: 0.08,
  }),
  hanger: Object.freeze({
    hookRadiusM: 0.02,
    hookTubeRadiusM: 0.0025,
    hookRadialSegments: 8,
    hookTubularSegments: 16,
    hookArcMultiplier: 1.5,
    hookYOffsetM: 0.045,
    stemRadiusM: 0.0025,
    stemHeightM: 0.04,
    stemYOffsetM: 0.02,
    halfWidthM: 0.22,
    shoulderHeightM: 0.15,
    centerHeightM: 0.015,
    bottomNeckYM: 0.002,
    shoulderCurveLiftM: 0.01,
    shoulderDropM: 0.015,
    bodyDepthM: 0.012,
    bevelThicknessM: 0.002,
    bevelSizeM: 0.002,
    bodyBackOffsetM: 0.006,
    barRadiusM: 0.009,
    barLengthHalfWidthMultiplier: 1.8,
    barYOffsetM: 0.01,
    moduleWidthClearanceM: 0.05,
    rodYOffsetM: 0.055,
    rotationYDivisor: 8,
  }),
  hangingClothes: Object.freeze({
    minAvailableHeightM: 0.5,
    spacingM: 0.04,
    xOffsetM: 0.02,
    defaultDepthM: 0.45,
    framedDoorDepthM: 0.38,
    restrictedDepthMinM: 0.12,
    restrictedDepthDefaultM: 0.3,
    hangerRadiusM: 0.015,
    hangerTubeRadiusM: 0.002,
    hangerRadialSegments: 4,
    hangerTubularSegments: 12,
    hangerYOffsetM: 0.01,
    coatProbabilityThreshold: 0.7,
    coatHeightM: 1.1,
    shirtHeightM: 0.7,
    bottomClearanceM: 0.05,
    minRenderableHeightM: 0.1,
    clothWidthM: 0.03,
    clothYOffsetM: 0.02,
    clothRotationYRangeRad: 0.15,
  }),
  sketchBoxClassic: Object.freeze({
    accentInsetMinM: 0.0025,
    accentInsetMaxM: 0.0045,
    accentInsetDoorRatio: 0.015,
    accentLineThicknessMinM: 0.0013,
    accentLineThicknessMaxM: 0.0019,
    accentLineThicknessDoorRatio: 0.0045,
    accentInnerMinM: 0.02,
    accentSurfaceOffsetM: 0.0008,
    accentStripDepthM: 0.001,
    grooveStripWidthM: 0.005,
    grooveHeightMinM: 0.01,
    grooveHeightClearanceM: 0.04,
    grooveDepthM: 0.002,
    grooveSurfaceOffsetM: 0.001,
  }),
});

const DRAWER_SKETCH_DIMENSIONS = Object.freeze({
  heightMinCm: 5,
  heightMaxCm: 120,
  externalDefaultHeightCm: 22,
  internalDefaultHeightCm: 16.5,
  heightTokenEpsilonCm: 0.0001,
  externalCountMin: 1,
  externalCountMax: 5,
  externalPreviewDefaultCount: 3,
  minRenderHeightM: 0.01,
  internalGapM: 0.03,
  internalStackCount: 2,
  previewDrawerBottomLiftM: 0.01,
  previewStackExtraHeightM: 0.02,
  previewExternalDefaultHeightM: 0.08,
  previewOverlayThicknessMinM: 0.004,
  previewOverlayThicknessMaxM: 0.02,
  previewDividerMinM: 0.003,
  previewDividerMaxM: 0.012,
  previewDividerWidthRatio: 0.04,
  previewDividerDepthExtraM: 0.002,
  externalDoorCutFrontInsetM: 0.004,
  externalDoorCutSurroundingGapM: 0.006,
  externalPreviewMinWidthM: 0.08,
  externalPreviewMinDepthM: 0.1,
  externalPreviewDepthClearanceM: 0.05,
  externalPreviewCenterZInsetM: 0.025,
  externalPreviewFrontZOffsetM: 0.001,
  externalPreviewVisualMinWidthM: 0.05,
  externalPreviewVisualMinHeightM: 0.05,
  externalPreviewVisualMinDepthM: 0.005,
  externalPreviewBoxMinDimensionM: 0.05,
  externalPreviewMeasurementZOffsetMinM: 0.004,
  externalPreviewMeasurementZOffsetThicknessRatio: 0.25,
  internalPreviewMinWidthM: 0.05,
  internalPreviewMinDepthM: 0.05,
  internalPreviewWidthClearanceM: 0.03,
  internalPreviewDepthClearanceM: 0.02,
  internalPreviewMeasurementZOffsetMinM: 0.004,
  internalPreviewMeasurementZOffsetDepthRatio: 0.08,
  internalPreviewGridDivisionsMin: 2,
  internalPreviewGridDivisionsMax: 12,
  internalPreviewGridDivisionsDefault: INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault,
  internalPreviewGridHeadClearanceM: 0.02,
  internalPreviewSingleDrawerGapM: 0.02,
  internalPreviewDefaultSingleHeightM: 0.11,
  internalPreviewRemovalHalfExtraM: 0.01,
  internalPreviewRemovalToleranceMinM: 0.045,
  internalPreviewRemovalToleranceMaxM: 0.14,
  internalPreviewRemovalToleranceExtraM: 0.02,
  internalClampPadMinM: 0.001,
  internalClampPadMaxM: 0.006,
  internalClampPadWoodRatio: 0.2,
  internalWidthMinM: 0.05,
  internalDepthMinM: 0.05,
  internalWidthClearanceM: 0.03,
  internalDepthClearanceM: 0.02,
  internalSideFillerWidthM: 0.05,
  internalSideFillerFrontInsetM: 0.03,
  internalOpenOffsetZM: 0.25,
  internalBottomLiftMaxM: 0.002,
  internalBottomLiftWoodRatio: 0.15,
  verticalStackCollisionGapM: 0.008,
  doorCutHorizontalOverlapMinM: 0.005,
  doorCutNoOpToleranceM: 0.002,
  doorCutIntervalMinHeightM: 0.01,
  doorCutIntervalMergeGapM: 0.002,
  doorCutVisibleSegmentMinHeightM: 0.012,
  rebuiltSegmentMinHeightForHandleM: 0.12,
  rebuiltSegmentHandleMinHeightM: 0.02,
  rebuiltSegmentHandlePaddingMinM: 0.02,
  rebuiltSegmentHandlePaddingMaxM: 0.1,
  rebuiltSegmentHandlePaddingHeightRatio: 0.2,
  rebuiltSegmentRestoreTargetMinDimensionM: 0.02,
  rebuiltSegmentRestoreTargetMinThicknessM: 0.002,
  rebuiltSegmentDefaultHandlePaddingM: 0.01,
  rebuiltSegmentVisualMinDimensionM: 0.02,
  rebuiltSegmentVisualWidthClearanceM: 0.004,
  faceVerticalAlignmentEpsilonM: 0.003,
  faceVerticalAlignmentMinHeightM: 0.012,
});

export const DRAWER_DIMENSIONS = Object.freeze({
  sketch: DRAWER_SKETCH_DIMENSIONS,
  external: EXTERNAL_DRAWER_DIMENSIONS,
  internal: INTERNAL_DRAWER_DIMENSIONS,
});

export const FRONT_REVEAL_FRAME_DIMENSIONS = Object.freeze({
  zNudgeM: 0.0008,
  localLineInsetM: 0.0015,
  dualOuterZOffsetM: 0.00008,
  dualInnerInsetM: 0.0011,
  dualInnerZOffsetM: 0.00016,
  frontZPresenceEpsilonM: 1e-6,
  slidingFrontThicknessM: DOOR_SYSTEM_DIMENSIONS.sliding.visualThicknessM,
  hingedFrontThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
  drawerFrontThicknessM: EXTERNAL_DRAWER_DIMENSIONS.visualThicknessM,
});

export const SKETCH_BOX_DIMENSIONS = Object.freeze({
  geometry: Object.freeze({
    defaultWoodThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    minOuterWidthM: 0.05,
    minOuterDepthM: 0.05,
    minOuterHeightM: 0.05,
    minInnerDimensionM: 0.02,
    minInnerAdditiveClearanceM: 0.02,
    placementClampPadMinM: 0.001,
    placementClampPadMaxM: 0.006,
    placementClampPadWoodRatio: 0.2,
    defaultOuterWidthM: 0.6,
    defaultOuterDepthM: 0.55,
    defaultOuterHeightM: 0.4,
    maxOuterHeightM: 1.2,
    centerSnapMinM: 0.015,
    centerSnapMaxM: 0.04,
    centerSnapWidthRatio: 0.06,
    centeredEpsilonM: 0.001,
    selectorInnerMinM: 0.05,
    selectorDepthClearanceM: 0.05,
    selectorCenterZInsetM: 0.015,
  }),
  dividers: Object.freeze({
    fallbackWoodThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    minInnerWidthM: 0.02,
    minInnerWithWoodClearanceM: 0.02,
    dividerHalfMinM: 0.006,
    segmentEdgeEpsilonM: 0.0001,
    pickEdgeEpsilonM: 0.0005,
    centeredEpsilonM: 0.001,
    defaultCenterNorm: 0.5,
    centerSnapMinM: 0.012,
    centerSnapMaxM: 0.035,
    centerSnapWidthRatio: 0.07,
    removeHitMinM: 0.018,
    removeHitMaxM: 0.05,
    removeHitWidthRatio: 0.08,
  }),
  dimensionOverlay: Object.freeze({
    textScale: 0.78,
    singleWidthLineYOffsetMinM: 0.08,
    singleWidthLineYOffsetMaxM: 0.14,
    singleWidthLineYOffsetHeightRatio: 0.18,
    singleWidthTextYOffsetMinM: 0.06,
    singleWidthTextYOffsetMaxM: 0.1,
    singleWidthTextYOffsetHeightRatio: 0.16,
    singleHeightLineGapMinM: 0.11,
    singleHeightLineGapMaxM: 0.18,
    singleHeightLineGapWidthRatio: 0.22,
    singleHeightTextXOffsetMinM: 0.06,
    singleHeightTextXOffsetMaxM: 0.11,
    singleHeightTextXOffsetWidthRatio: 0.18,
    singleDepthLineGapMinM: 0.11,
    singleDepthLineGapMaxM: 0.18,
    singleDepthLineGapWidthRatio: 0.22,
    singleDepthLineYOffsetMinM: 0.04,
    singleDepthLineYOffsetMaxM: 0.1,
    singleDepthLineYOffsetHeightRatio: 0.12,
    singleDepthTextXOffsetMinM: 0.12,
    singleDepthTextXOffsetMaxM: 0.18,
    singleDepthTextXOffsetWidthRatio: 0.24,
    groupAdjacentToleranceXMinM: 0.012,
    groupAdjacentToleranceXMaxM: 0.03,
    groupAdjacentToleranceYMinM: 0.015,
    groupAdjacentToleranceYMaxM: 0.05,
    groupSpanMergeToleranceMinM: 0.012,
    groupSpanMergeToleranceMaxM: 0.03,
    groupWidthLineYOffsetMinM: 0.1,
    groupWidthLineYOffsetMaxM: 0.16,
    groupWidthLineYOffsetHeightRatio: 0.12,
    groupWidthTextYOffsetMinM: 0.06,
    groupWidthTextYOffsetMaxM: 0.1,
    groupWidthTextYOffsetHeightRatio: 0.1,
    groupWidthSegmentsYOffsetMinM: 0.04,
    groupWidthSegmentsYOffsetMaxM: 0.09,
    groupWidthSegmentsYOffsetHeightRatio: 0.06,
    groupSegmentTextYOffsetMinM: 0.05,
    groupSegmentTextYOffsetMaxM: 0.08,
    groupSegmentTextYOffsetHeightRatio: 0.08,
    groupHeightLineGapMinM: 0.12,
    groupHeightLineGapMaxM: 0.22,
    groupHeightLineGapWidthRatio: 0.18,
    groupHeightTextXOffsetMinM: 0.06,
    groupHeightTextXOffsetMaxM: 0.11,
    groupHeightTextXOffsetWidthRatio: 0.14,
    groupMinHeightDeltaM: 0.01,
    groupMinHeightLineXOffsetMinM: 0.08,
    groupMinHeightLineXOffsetMaxM: 0.14,
    groupMinHeightLineXOffsetWidthRatio: 0.1,
    groupMinHeightTextXOffsetMinM: 0.06,
    groupMinHeightTextXOffsetMaxM: 0.1,
    groupMinHeightTextXOffsetWidthRatio: 0.12,
    groupMinHeightLabelShiftYM: -0.22,
    groupDepthLineGapMinM: 0.12,
    groupDepthLineGapMaxM: 0.22,
    groupDepthLineGapWidthRatio: 0.18,
    groupDepthLineYOffsetMinM: 0.08,
    groupDepthLineYOffsetMaxM: 0.16,
    groupDepthLineYOffsetHeightRatio: 0.3,
    groupDepthTextXOffsetMinM: 0.14,
    groupDepthTextXOffsetMaxM: 0.2,
    groupDepthTextXOffsetWidthRatio: 0.16,
    groupMinDepthDeltaM: 0.01,
    groupMinDepthLineXOffsetMinM: 0.07,
    groupMinDepthLineXOffsetMaxM: 0.13,
    groupMinDepthLineXOffsetWidthRatio: 0.09,
    groupMinDepthLineYOffsetMinM: 0.08,
    groupMinDepthLineYOffsetMaxM: 0.14,
    groupMinDepthLineYOffsetHeightRatio: 0.08,
    groupMinDepthTextXOffsetMinM: 0.12,
    groupMinDepthTextXOffsetMaxM: 0.18,
    groupMinDepthTextXOffsetWidthRatio: 0.14,
  }),
  preview: Object.freeze({
    minScaleM: 0.0001,
    removeEpsShelfM: 0.02,
    removeEpsBoxM: 0.03,
    shelfMinWidthM: 0.02,
    shelfHoverMinWidthM: 0.05,
    shelfBraceClearanceM: INTERIOR_FITTINGS_DIMENSIONS.shelves.braceWidthClearanceM,
    shelfRegularClearanceM: INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM,
    rodRadiusM: INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM,
    rodMinLengthM: 0.05,
    rodWidthClearanceM: INTERIOR_FITTINGS_DIMENSIONS.rods.contentsWidthClearanceM,
    rodPreviewHeightM: 0.03,
    rodPreviewDepthM: 0.03,
    shelfRemoveNoBoardToleranceMinM: 0.018,
    shelfRemoveNoBoardToleranceMaxM: 0.03,
    shelfRemoveNoBoardToleranceStepRatio: 0.12,
    shelfRemoveBoardToleranceM: 0.035,
    shelfRemoveCornerDrawerToleranceExtraM: 0.006,
    storageBarrierBackInsetM: 0.009,
    storageBarrierDepthClearanceMinM: 0.02,
    storageBarrierDepthClearanceMaxM: 0.06,
    storageBarrierDepthClearanceRatio: 0.35,
    doorMinDimensionM: 0.05,
    doorEdgeEpsilonM: 0.001,
    doorInsetMinM: 0.002,
    doorInsetMaxM: 0.006,
    doorInsetSizeRatio: 0.012,
    doorDoublePairGapMinM: 0.0008,
    doorDoublePairGapMaxM: 0.0018,
    doorDoublePairGapSizeRatio: 0.0045,
    doorDoublePairOuterInsetMinM: 0.0012,
    doorDoublePairOuterInsetSizeRatio: 0.0075,
    doorThicknessMinM: 0.016,
    doorThicknessMaxM: MATERIAL_DIMENSIONS.wood.thicknessM,
    doorMinDepthM: 0.0001,
    doorBackClearanceMinM: 0.0008,
    doorBackClearanceMaxM: 0.0015,
    doorBackClearanceDepthRatio: 0.1,
    doorRemoveOffsetMinM: 0.002,
    doorRemoveOffsetWoodRatio: 0.12,
    doorPreviewClearanceM: 0.004,
    frontOverlayWidthClearanceM: 0.004,
    frontOverlayHeightClearanceM: 0.004,
    segmentedDoorVisualClearanceM: 0.004,
    segmentedDoorMinHeightM: 0.012,
    segmentedDoorMinDimensionM: 0.02,
    drawerPreviewThicknessM: 0.02,
    drawerPreviewZOffsetM: 0.001,
    boxFillThicknessMinM: 0.004,
    boxCenterMarkerThicknessMinM: 0.004,
    boxCenterMarkerThicknessMaxM: 0.012,
    rodDefaultHeightM: 0.03,
    rodDefaultDepthM: 0.03,
    rodGuideDepthMinM: 0.006,
    rodGuideDepthExtraM: 0.004,
    rodGuideThicknessMinM: 0.006,
    rodGuideThicknessMaxM: 0.014,
    rodGuideThicknessRatio: 0.025,
    rodGuideZOffsetM: 0.001,
    objectBoxPadXYMinM: 0.0015,
    objectBoxPadXYMaxM: 0.004,
    objectBoxPadXYWoodRatio: 0.12,
    objectBoxPadXYDefaultM: 0.002,
    objectBoxPadZMinM: 0.0005,
    objectBoxPadZMaxM: 0.002,
    objectBoxPadZRatio: 0.5,
    measurementLabelZOffsetM: 0.0035,
    measurementHorizontalLabelOutsideGapM: 0.012,
    measurementTextScaleMin: 0.55,
    measurementTextScaleDefault: 0.9,
    measurementScaleDefaultX: 0.6,
    measurementScaleDefaultY: 0.3,
    measurementScaleCellX: 0.48,
    measurementScaleCellY: 0.24,
    measurementScaleNeighborX: 0.45,
    measurementScaleNeighborY: 0.225,
    slideClearanceMinM: 0.001,
    slideClearanceWoodRatio: 0.5,
    measurementZOffsetMinM: 0.004,
    measurementZOffsetDepthRatio: 0.08,
    measurementTextScale: 0.82,
    adornmentCorniceYOffsetM: 0.035,
    adornmentCorniceZInsetM: 0.012,
    adornmentCorniceWidthExtraM: 0.02,
    adornmentCorniceHeightM: 0.07,
    adornmentCorniceDepthM: 0.03,
    adornmentBaseDefaultHeightM: CARCASS_BASE_DIMENSIONS.plinth.heightM,
    adornmentBaseZInsetMaxM: 0.02,
    adornmentBaseZInsetDepthRatio: 0.15,
    adornmentBaseLegWidthClearanceM: 0.08,
    adornmentBaseWidthClearanceM: 0.04,
    adornmentBaseDepthMinM: MATERIAL_DIMENSIONS.wood.thicknessM,
    adornmentBaseLegDepthM: 0.04,
    adornmentBaseDepthClearanceM: 0.05,
  }),
  freePlacement: Object.freeze({
    verticalSlackDefaultM: 0.45,
    verticalSlackMinM: 0.45,
    verticalSlackMaxM: 1.35,
    verticalSlackHeightRatio: 0.75,
    roomFloorY: 0,
    workspaceClampPadMinM: 0.001,
    workspaceClampPadMaxM: 0.006,
    workspaceClampPadHeightRatio: 0.02,
    wallSnapBandMinM: 0.008,
    wallSnapBandMaxM: 0.03,
    wallSnapBandWidthRatio: 0.08,
    removeInsetMinM: 0.008,
    removeInsetMaxM: 0.025,
    removeInsetRatio: 0.08,
    removeInsetHalfRatioMax: 0.45,
    removeHalfMinM: 0.012,
    attachPadMinM: 0.03,
    attachPadMaxM: 0.14,
    attachPadSizeRatio: 0.18,
    attachEdgeMinM: 0.02,
    attachEdgeHalfRatio: 0.45,
    attachIntentMinOverlapMinM: 0.012,
    attachIntentMinOverlapMaxM: 0.04,
    attachIntentMinOverlapRatio: 0.18,
    attachIntentEdgeBandMinM: 0.018,
    attachIntentEdgeBandMaxM: 0.07,
    attachIntentEdgeBandRatio: 0.55,
    attachIntentEdgeDominanceMinM: 0.01,
    attachIntentEdgeDominanceMaxM: 0.045,
    attachIntentEdgeDominanceRatio: 0.18,
    attachIntentOutsideBiasMinM: 0.008,
    attachIntentOutsideBiasMaxM: 0.03,
    attachIntentOutsideBiasRatio: 0.12,
    attachIntentEdgeBiasMinM: 0.008,
    attachIntentEdgeBiasMaxM: 0.03,
    attachIntentEdgeBiasRatio: 0.18,
    attachIntentScoreBiasMinM: 0.06,
    attachIntentScoreBiasMaxM: 0.24,
    attachIntentScoreBiasRatio: 0.5,
    placementGapDefaultM: 0.002,
    placementGapMinM: 0.0015,
    placementGapMaxM: 0.004,
    placementGapRatio: 0.006,
  }),
});

export const CORNER_WING_DIMENSIONS = Object.freeze({
  wing: Object.freeze({
    defaultWidthCm: WARDROBE_DEFAULTS.corner.widthCm,
    minBodyHeightM: 0.2,
    minDepthM: 0.2,
    blindClearanceM: 0.05,
    minGroupWidthM: 0.001,
    minActiveWidthM: 0.01,
  }),
  connector: Object.freeze({
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
    shellMinWallHeightM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
    shellWallHeightClearanceM: 0.002,
    shellBackPanelThicknessM: CARCASS_SHELL_DIMENSIONS.backPanelThicknessM,
    shellBackPanelOutsideInsetM: 0.0025,
    shellPanelMinLengthM: 0.01,
    shellNoOverlapInsetExtraM: 0.001,
    shellPlateSideInsetExtraM: 0.0006,
    shellAttachFaceEpsilonM: 0.0002,
    shellBackJunctionInsetM: 0.002,
    shellAttachPanelEpsilonM: 0.0008,
    shellBackInsetXM: CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    shellBackInsetZM: CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM,
    shellFrontInsetM: CARCASS_SHELL_DIMENSIONS.frontInsetZM,
    shellBaseMinHeightM: CARCASS_SHELL_DIMENSIONS.boardMinDimensionM,
    shellCorniceHitMinM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
    corniceHitMinWidthM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
    corniceHitHeightClearanceM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
    fullDoorTopHandleClearanceM: 0.002,
    visualWidthClearanceM: 0.004,
    visualHeightClearanceM: 0.004,
    frontThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    frontTrimZOffsetM: 0.011,
    hitboxThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    edgeHandleShortInsetM: 0.1,
    edgeHandleLongInsetM: 0.2,
    edgeHandleLongLiftM: 0.1,
    edgeHandleLiftDrawerCountThreshold: 4,
    edgeHandleDefaultAbsY: 1.05,
    edgeHandleLiftDoorBottomThresholdM: 0.9,
    edgeHandleLiftExtraM: 0.15,
  }),
  interior: Object.freeze({
    minInnerFaceGapM: 0.02,
    minCellWidthM: 0.05,
    minCellDepthM: 0.2,
    shelfWidthClearanceM: 0.005,
    internalDepthBackClearanceM: 0.05,
    regularShelfDepthM: INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM,
    fullDepthCenterBackInsetM: 0.015,
    shelfContentsTopClearanceM: INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM,
    shelfTopPlacementGuardM: 0.01,
    foldedContentsMinWidthM: 0.05,
    foldedContentsWidthClearanceM: INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsWidthClearanceM,
  }),
  panels: Object.freeze({
    fallbackSegmentWidthM: 0.2,
    minPanelHeightM: 0.05,
    minPanelWidthM: 0.05,
    panelWidthClearanceM: 0.002,
    minBlindWidthM: 0.001,
    minCellDepthM: 0.2,
    minWallDepthM: 0.05,
    noZFightAttachInsetM: 0.0012,
  }),
  selector: Object.freeze({
    minDepthM: 0.2,
    minWidthM: 0.01,
    widthClearanceM: 0.001,
    fallbackMinWidthM: 0.01,
  }),
  ceiling: Object.freeze({
    noZFightAttachInsetM: 0.0012,
    minDepthM: 0.05,
    minWidthM: 0.05,
    widthClearanceM: 0.001,
  }),
  cells: Object.freeze({
    doorsPerCell: 2,
    defaultGridDivisions: 6,
    splitGridLineIndex: 4,
    minWidthM: 0.05,
    minDoorUnitWidthM: 0.2,
    widthAdjustmentEpsilonM: 1e-6,
    minAbsDepthCm: 20,
    minAbsDepthWoodMultiplier: 4,
    minBodyWoodMultiplier: 2,
  }),
  drawers: Object.freeze({
    shoeHeightM: EXTERNAL_DRAWER_DIMENSIONS.shoeHeightM,
    externalRegularHeightM: EXTERNAL_DRAWER_DIMENSIONS.regularHeightM,
    internalDefaultDepthM: INTERNAL_DRAWER_DIMENSIONS.defaultDepthM,
    internalMaxSingleDrawerHeightM: INTERNAL_DRAWER_DIMENSIONS.maxSingleDrawerHeightM,
    internalDefaultSingleHeightM: INTERNAL_DRAWER_DIMENSIONS.defaultSingleDrawerHeightM,
    internalVerticalInsetM: INTERNAL_DRAWER_DIMENSIONS.verticalInsetM,
    internalMinHeightM: INTERNAL_DRAWER_DIMENSIONS.minDrawerHeightM,
    internalFirstBottomGapM: INTERNAL_DRAWER_DIMENSIONS.firstDrawerBottomGapM,
    internalBetweenGapM: INTERNAL_DRAWER_DIMENSIONS.betweenDrawersGapM,
    rodMinLengthM: 0.05,
    rodWidthClearanceM: 0.02,
    hangingClothesWidthClearanceM: 0.06,
    internalMinWidthM: 0.1,
    internalWidthClearanceM: 0.1,
    internalMinDepthM: 0.08,
    internalDepthClearanceM: 0.12,
    internalClosedBackOffsetM: 0.02,
    internalOpenBackOffsetM: 0.3,
    internalStackCount: INTERNAL_DRAWER_DIMENSIONS.stackCount,
    shelfOverDrawerMinDepthM: 0.05,
    shelfOverDrawerDepthClearanceM: 0.002,
    externalFrontOffsetZM: EXTERNAL_DRAWER_DIMENSIONS.frontOffsetZM,
    externalOpenOffsetZM: EXTERNAL_DRAWER_DIMENSIONS.openOffsetZM,
    externalVisualWidthClearanceM: EXTERNAL_DRAWER_DIMENSIONS.visualWidthClearanceM,
    externalBoxWidthClearanceM: EXTERNAL_DRAWER_DIMENSIONS.boxWidthClearanceM,
    externalBoxHeightClearanceM: EXTERNAL_DRAWER_DIMENSIONS.boxHeightClearanceM,
    externalBoxDepthBackClearanceM: EXTERNAL_DRAWER_DIMENSIONS.boxDepthBackClearanceM,
    externalBoxOffsetZM: EXTERNAL_DRAWER_DIMENSIONS.boxOffsetZM,
    drawerShadowWidthClearanceM: 0.01,
    drawerShadowHeightM: 0.008,
    drawerShadowDepthM: 0.01,
    drawerShadowFrontOffsetM: 0.005,
  }),
  baseLegs: Object.freeze({
    minCount: 2,
    spacingM: 0.6,
    widthClearanceM: 0.1,
    insetM: CARCASS_BASE_DIMENSIONS.legs.cornerInsetM,
  }),
});

export const CORNER_CONNECTOR_INTERIOR_DIMENSIONS = Object.freeze({
  specialPost: Object.freeze({
    depthDefaultCm: 55,
    heightDefaultCm: 180,
    topCellHeightDefaultCm: 30,
    depthMinM: 0.05,
    postInsetClearanceM: 0.02,
    panelGapEpsilonM: 0.0006,
    minAvailableHeightM: 0.35,
    postHeightMinM: 0.2,
    postOffsetNormMin: 0.05,
    postOffsetNormMax: 0.95,
    postClampEdgeInsetM: 0.03,
    shelfSpanMinM: 0.35,
    shelfNetMinM: 0.12,
    shelfTopClearanceM: 0.002,
    panelMinLengthM: 0.01,
    shelfPlanMinDimensionM: 0.05,
    shelfCeilingClearanceM: 0.005,
    shelfFitToleranceM: 0.002,
  }),
  attachRod: Object.freeze({
    heightDefaultCm: 150,
    endInsetDefaultCm: 2,
    radiusDefaultMm: 15,
    verticalClearanceM: 0.05,
    minRodLengthM: 0.08,
    contentsWidthClearanceM: 0.06,
    contentsWidthMinM: 0.08,
    contentsBottomClearanceM: 0.02,
    contentsHeightMinM: 0.55,
    contentsDepthHintM: 0.32,
    wallBackClearanceM: 0.08,
  }),
  foldedContents: Object.freeze({
    leftWidthMinM: 0.28,
    leftDepthMinM: 0.18,
    surfaceHeightClearanceM: 0.02,
    surfaceMinHeightM: 0.08,
    surfaceYOffsetM: 0.002,
    widthMinM: 0.2,
    widthClearanceM: 0.06,
    maxHeightMinM: 0.12,
    maxHeightMaxM: 0.65,
    pentagonSafeZMinM: 0.14,
    pentagonSafeZRatio: 0.35,
    pentagonSafeZEndClearanceM: 0.18,
    pentagonSafeWidthMinM: 0.35,
    pentagonSafeWidthRatio: 0.85,
    pentagonSafeWidthMaxM: 0.9,
    pentagonSafeDepthMinM: 0.22,
    pentagonSafeDepthMaxM: 0.34,
    pentagonSafeDepthEndClearanceM: 0.12,
  }),
});

export const HANDLE_DIMENSIONS = Object.freeze({
  edge: Object.freeze({
    shortLengthM: 0.2,
    longLengthM: 0.4,
    minLengthM: 0.1,
    drawerWidthClearanceM: 0.04,
    doorAnchorOffsetM: 0.002,
    renderPrimitiveDoorAnchorInsetM: 0.0025,
    mountThicknessM: 0.0045,
    mountDepthM: 0.014,
    mountFrontZM: 0.006,
    returnThicknessM: 0.012,
    returnDepthM: 0.008,
    returnFrontZM: 0.022,
    returnInsetM: 0.0115,
    bridgeThicknessM: 0.007,
    bridgeOverlapM: 0.004,
    drawerReturnDropM: 0.0135,
    defaultGlobalAbsYM: 1.05,
    drawerLiftThresholdYM: 0.9,
    drawerLiftClearanceM: 0.15,
    longLiftDrawerCountThreshold: 4,
    longLiftExtraM: 0.1,
    shortClampPaddingM: 0.1,
    longClampPaddingM: 0.2,
  }),
  standard: Object.freeze({
    drawerWidthM: 0.16,
    drawerHeightM: 0.01,
    drawerDepthM: 0.02,
    doorWidthM: 0.01,
    doorHeightM: 0.16,
    doorDepthM: 0.02,
    doorOffsetM: 0.05,
    frontZM: 0.02,
  }),
  placement: Object.freeze({
    drawerDefaultWidthM: 0.4,
    drawerDefaultHeightM: EXTERNAL_DRAWER_DIMENSIONS.shoeHeightM,
    frontZDefaultM: 0.02,
    zPositionEpsilonM: 0.0005,
    maxTrustedLocalZM: 2,
    drawerEdgeVisibleProtrusionM: 0.0135,
    shortDrawerStandardYOffsetM: 0.02,
    shortDrawerHeightThresholdM: 0.21,
    absYClampMinHeightM: 0.05,
    absYClampPaddingMinM: 0.02,
    absYClampPaddingMaxM: 0.1,
    absYClampPaddingHeightRatio: 0.2,
  }),
});

export type ExternalDrawerGeometry = {
  zClosed: number;
  zOpen: number;
  visualW: number;
  visualT: number;
  visualH: number;
  boxW: number;
  boxH: number;
  boxD: number;
  boxOffsetZ: number;
  connectW: number;
  connectH: number;
  connectD: number;
  connectZ: number;
};

export function normalizeWardrobeDimensionDefaultType(value: unknown): WardrobeDimensionDefaultType {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

export function resolveWardrobeTypeDefaults(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  const type = normalizeWardrobeDimensionDefaultType(value);
  const byType = WARDROBE_DEFAULTS.byType[type];
  return {
    widthCm: WARDROBE_DEFAULTS.widthCm,
    heightCm: WARDROBE_DEFAULTS.heightCm,
    depthCm: byType.depthCm,
    doorsCount: byType.doorsCount,
    perDoorWidthCm: byType.perDoorWidthCm,
  };
}

export function getDefaultDepthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).depthCm;
}

export function getDefaultDoorsForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).doorsCount;
}

export function getDefaultPerDoorWidthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).perDoorWidthCm;
}

export function resolveAutoWidthForDoors(value: unknown, doors: unknown): number {
  const n = Math.max(0, Math.round(finiteOr(doors, 0)));
  return n * getDefaultPerDoorWidthForWardrobeType(value);
}

export function isAutoWidthForDoors(value: unknown, widthCm: unknown, doors: unknown): boolean {
  const currentWidthCm = finiteOr(widthCm, 0);
  if (!(currentWidthCm > 0)) return true;
  const expectedWidthCm = resolveAutoWidthForDoors(value, doors);
  return Math.abs(currentWidthCm - expectedWidthCm) < WARDROBE_LAYOUT_DIMENSIONS.autoWidthMatchToleranceCm;
}

export function getDefaultWidthForWardrobeType(value: unknown): number {
  const defaults = resolveWardrobeTypeDefaults(value);
  return defaults.doorsCount * defaults.perDoorWidthCm;
}

export function getDefaultHeightForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).heightCm;
}

export function getDefaultChestDrawersCount(): number {
  return WARDROBE_DEFAULTS.chestDrawersCount;
}

export function resolveDefaultWardrobeDimensions(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  return resolveWardrobeTypeDefaults(value);
}

export function resolveExternalDrawerGeometry(args?: {
  externalWidthM?: unknown;
  depthM?: unknown;
  woodThicknessM?: unknown;
  frontZM?: unknown;
  drawerHeightM?: unknown;
  doorMountMode?: unknown;
}): ExternalDrawerGeometry {
  const external = EXTERNAL_DRAWER_DIMENSIONS;
  const externalWidthM = finiteOr(args?.externalWidthM, 0);
  const depthM = finiteOr(args?.depthM, 0);
  const woodThicknessM = finiteOr(args?.woodThicknessM, MATERIAL_DIMENSIONS.wood.thicknessM);
  const frontZM = finiteOr(args?.frontZM, depthM / 2);
  const drawerHeightM = finiteOr(args?.drawerHeightM, external.regularHeightM);
  const connectD = external.connectorDepthM;
  const visualT = external.visualThicknessM;
  const isInsetMount = args?.doorMountMode === 'inset';
  const insetRevealM = isInsetMount
    ? Math.min(DOOR_SYSTEM_DIMENSIONS.hinged.insetRevealM, Math.max(0, woodThicknessM / 3))
    : 0;
  const zClosed = isInsetMount ? frontZM - visualT / 2 - insetRevealM : frontZM + external.frontOffsetZM;
  const zOpen = isInsetMount ? zClosed + external.openOffsetZM : frontZM + external.openOffsetZM;

  return {
    zClosed,
    zOpen,
    visualW: externalWidthM - external.visualWidthClearanceM,
    visualT,
    visualH: drawerHeightM - external.visualHeightClearanceM,
    boxW: externalWidthM - external.boxWidthClearanceM,
    boxH: drawerHeightM - external.boxHeightClearanceM,
    boxD: Math.max(woodThicknessM, depthM - external.boxDepthBackClearanceM),
    boxOffsetZ: -depthM / 2 + external.boxOffsetZM,
    connectW: externalWidthM - external.connectorWidthClearanceM,
    connectH: drawerHeightM - external.connectorHeightClearanceM,
    connectD,
    connectZ: external.connectorFrontZM - connectD / 2 - external.connectorBackInsetM,
  };
}
