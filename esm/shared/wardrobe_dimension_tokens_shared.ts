// Canonical wardrobe/product dimension tokens.
//
// This shared module is intentionally dependency-free so runtime, features, UI,
// builder, kernel, and exports can all read the same dimensional policy without
// creating layer back-edges. Keep product measurements here; leave pixels,
// timings, material roughness/metalness, and render-order numbers out.

export type WardrobeDimensionDefaultType = 'hinged' | 'sliding';

export const CM_PER_METER = 100;
export const MM_PER_METER = 1000;

export function cmToM(valueCm: number): number {
  return valueCm / CM_PER_METER;
}

export function mToCm(valueM: number): number {
  return valueM * CM_PER_METER;
}

export function clampDimension(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function finiteOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export const WARDROBE_DEFAULTS = Object.freeze({
  widthCm: 160,
  heightCm: 240,
  chestDrawersCount: 4,
  byType: Object.freeze({
    hinged: Object.freeze({
      depthCm: 55,
      doorsCount: 4,
      perDoorWidthCm: 40,
    }),
    sliding: Object.freeze({
      depthCm: 60,
      doorsCount: 2,
      perDoorWidthCm: 80,
    }),
  }),
  corner: Object.freeze({
    widthCm: 120,
    doorsCount: 3,
  }),
  stackSplit: Object.freeze({
    lowerHeightCm: 60,
    minTopHeightCm: 40,
    minLowerHeightCm: 20,
    seamGapM: 0.002,
    lowerWidthFallbackCm: 50,
    decorativeSeparator: Object.freeze({
      visibleHeightM: 0.039,
      apronDepthM: 0.014,
      frontOverhangM: 0.035,
      sideOverhangM: 0.025,
      minWidthM: 0.2,
      minDepthM: 0.12,
      seamCoverDropM: 0.012,
      zFightLiftM: 0.001,
    }),
  }),
});

export const WARDROBE_LIMITS = Object.freeze({
  width: Object.freeze({ minCm: 40, chestMinCm: 20, maxCm: 560 }),
  height: Object.freeze({ minCm: 100, chestMinCm: 20, maxCm: 300 }),
  depth: Object.freeze({ minCm: 20, maxCm: 150 }),
  doors: Object.freeze({ min: 0, slidingMin: 2, max: 14 }),
  chestDrawers: Object.freeze({ min: 2, max: 8 }),
  cell: Object.freeze({
    widthMinCm: 40,
    widthMaxCm: 560,
    heightMinCm: 100,
    heightMaxCm: 300,
    depthMinCm: 20,
    depthMaxCm: 150,
  }),
  stackSplit: Object.freeze({
    lowerDepthMinCm: 20,
    lowerDepthMaxCm: 150,
    lowerWidthMinCm: 30,
    lowerWidthMaxCm: 800,
    lowerDoorsMin: 0,
    lowerDoorsMax: 20,
  }),
});

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
  minLowerDepthCm: WARDROBE_LIMITS.stackSplit.lowerDepthMinCm,
  minLowerHeightCm: WARDROBE_DEFAULTS.stackSplit.minLowerHeightCm,
  minTopHeightCm: WARDROBE_DEFAULTS.stackSplit.minTopHeightCm,
  defaultLowerHeightCm: 80,
  lowerDepthInsetCm: 5,
});

export const DEFAULT_WIDTH: number = WARDROBE_DEFAULTS.widthCm;
export const DEFAULT_HEIGHT: number = WARDROBE_DEFAULTS.heightCm;
export const DEFAULT_CHEST_DRAWERS_COUNT: number = WARDROBE_DEFAULTS.chestDrawersCount;

export const HINGED_DEFAULT_DEPTH: number = WARDROBE_DEFAULTS.byType.hinged.depthCm;
export const SLIDING_DEFAULT_DEPTH: number = WARDROBE_DEFAULTS.byType.sliding.depthCm;

export const DEFAULT_HINGED_DOORS: number = WARDROBE_DEFAULTS.byType.hinged.doorsCount;
export const DEFAULT_SLIDING_DOORS: number = WARDROBE_DEFAULTS.byType.sliding.doorsCount;

export const HINGED_DEFAULT_PER_DOOR_WIDTH: number = WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
export const SLIDING_DEFAULT_PER_DOOR_WIDTH: number = WARDROBE_DEFAULTS.byType.sliding.perDoorWidthCm;

export const DEFAULT_CORNER_WIDTH: number = WARDROBE_DEFAULTS.corner.widthCm;
export const DEFAULT_CORNER_DOORS: number = WARDROBE_DEFAULTS.corner.doorsCount;

export const DEFAULT_STACK_SPLIT_LOWER_HEIGHT: number = WARDROBE_DEFAULTS.stackSplit.lowerHeightCm;
export const STACK_SPLIT_SEAM_GAP_M: number = WARDROBE_DEFAULTS.stackSplit.seamGapM;

export const WARDROBE_WIDTH_MIN: number = WARDROBE_LIMITS.width.minCm;
export const WARDROBE_CHEST_WIDTH_MIN: number = WARDROBE_LIMITS.width.chestMinCm;
export const WARDROBE_WIDTH_MAX: number = WARDROBE_LIMITS.width.maxCm;

export const WARDROBE_HEIGHT_MIN: number = WARDROBE_LIMITS.height.minCm;
export const WARDROBE_CHEST_HEIGHT_MIN: number = WARDROBE_LIMITS.height.chestMinCm;
export const WARDROBE_HEIGHT_MAX: number = WARDROBE_LIMITS.height.maxCm;

export const WARDROBE_DEPTH_MIN: number = WARDROBE_LIMITS.depth.minCm;
export const WARDROBE_DEPTH_MAX: number = WARDROBE_LIMITS.depth.maxCm;

export const WARDROBE_DOORS_MIN: number = WARDROBE_LIMITS.doors.min;
export const WARDROBE_SLIDING_DOORS_MIN: number = WARDROBE_LIMITS.doors.slidingMin;
export const WARDROBE_DOORS_MAX: number = WARDROBE_LIMITS.doors.max;

export const WARDROBE_CHEST_DRAWERS_MIN: number = WARDROBE_LIMITS.chestDrawers.min;
export const WARDROBE_CHEST_DRAWERS_MAX: number = WARDROBE_LIMITS.chestDrawers.max;

export const WARDROBE_CELL_DIM_MIN: number = WARDROBE_DEPTH_MIN;

export const WARDROBE_CELL_WIDTH_MIN: number = WARDROBE_LIMITS.cell.widthMinCm;
export const WARDROBE_CELL_WIDTH_MAX: number = WARDROBE_LIMITS.cell.widthMaxCm;
export const WARDROBE_CELL_HEIGHT_MIN: number = WARDROBE_LIMITS.cell.heightMinCm;
export const WARDROBE_CELL_HEIGHT_MAX: number = WARDROBE_LIMITS.cell.heightMaxCm;
export const WARDROBE_CELL_DEPTH_MIN: number = WARDROBE_LIMITS.cell.depthMinCm;
export const WARDROBE_CELL_DEPTH_MAX: number = WARDROBE_LIMITS.cell.depthMaxCm;

export const STACK_SPLIT_LOWER_HEIGHT_MIN: number = WARDROBE_DEFAULTS.stackSplit.minLowerHeightCm;
export const STACK_SPLIT_MIN_TOP_HEIGHT: number = WARDROBE_DEFAULTS.stackSplit.minTopHeightCm;
export const STACK_SPLIT_LOWER_DEPTH_MIN: number = WARDROBE_LIMITS.stackSplit.lowerDepthMinCm;
export const STACK_SPLIT_LOWER_DEPTH_MAX: number = WARDROBE_LIMITS.stackSplit.lowerDepthMaxCm;
export const STACK_SPLIT_LOWER_WIDTH_MIN: number = WARDROBE_LIMITS.stackSplit.lowerWidthMinCm;
export const STACK_SPLIT_LOWER_WIDTH_MAX: number = WARDROBE_LIMITS.stackSplit.lowerWidthMaxCm;
export const STACK_SPLIT_LOWER_DOORS_MIN: number = WARDROBE_LIMITS.stackSplit.lowerDoorsMin;
export const STACK_SPLIT_LOWER_DOORS_MAX: number = WARDROBE_LIMITS.stackSplit.lowerDoorsMax;

export const CARCASS_SHELL_DIMENSIONS = Object.freeze({
  frontInsetZM: 0.005,
  backInsetZM: 0.0078,
  boardMinDimensionM: 0.001,
  boardMinDepthM: 0.02,
  bodyMinDepthM: 0.05,
  bodyMinHeightM: 0.05,
  floorCeilWidthClearanceM: 0.001,
  backPanelWidthClearanceM: 0.002,
  backPanelSegmentWidthClearanceM: 0.002,
  backPanelThicknessM: 0.005,
  backPanelZM: 0.005,
  sideDepthClearanceM: 0.0078,
  sideZOffsetM: 0.0039,
  internalBackInsetM: 0.005,
  drawerGridDivisions: 6,
  drawerSplitGridLineIndex: 4,
});

export const CARCASS_INTERIOR_DIMENSIONS = Object.freeze({
  minTopBodyHeightM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
  slidingDepthReductionM: 0.12,
  hingedDepthReductionM: 0.03,
  internalBackInsetM: CARCASS_SHELL_DIMENSIONS.internalBackInsetM,
});

export const CARCASS_BASE_DIMENSIONS = Object.freeze({
  plinth: Object.freeze({
    heightM: 0.08,
    heightMinCm: 1,
    heightMaxCm: 60,
    widthClearanceM: 0.04,
    fallbackWidthClearanceM: 0.02,
    depthClearanceM: 0.05,
    frontInsetM: 0.015,
    minSegmentWidthM: 0.05,
    minSegmentDepthM: 0.05,
    segmentWidthEpsilonM: 0.001,
    steppedMinSegmentDepthM: 0.02,
    steppedBackInsetM: 0.01,
    connectorShapeInsetM: 0.04,
    connectorMaxToeRatio: 0.35,
    connectorToeEndTrimMaxM: 0.03,
    connectorWallInsetM: 0.01,
    connectorTinyEpsilonM: 0.0005,
  }),
  legs: Object.freeze({
    cornerInsetM: 0.05,
    centerSupportDoorsThreshold: 5,
    chestCenterSupportWidthThresholdM: 1.2,
    connectorInsetM: 0.06,
    connectorBackInsetM: 0.01,
    depthSteppedMinFrontBackGapM: 0.03,
  }),
  chest: Object.freeze({
    backThicknessM: 0.005,
    backInsetM: 0.005,
    drawerGapM: 0.004,
    drawerWidthClearanceM: 0.004,
    drawerFrontThicknessM: 0.018,
    drawerShadowLineThicknessM: 0.001,
    drawerBoxWidthClearanceM: 0.03,
    drawerBoxHeightClearanceM: 0.05,
    drawerBoxDepthClearanceM: 0.05,
    connectorDepthM: 0.02,
    connectorBackInsetM: 0.003,
    connectorWidthClearanceM: 0.08,
    connectorHeightClearanceM: 0.02,
    openOffsetZM: 0.35,
  }),
});

export const MATERIAL_DIMENSIONS = Object.freeze({
  wood: Object.freeze({
    thicknessM: 0.018,
  }),
  glassShelf: Object.freeze({
    thicknessM: 0.018,
  }),
});

export const BASE_LEG_DIMENSIONS = Object.freeze({
  defaults: Object.freeze({
    style: 'tapered',
    color: 'black',
    heightCm: 12,
    widthCm: 3.5,
    taperedWidthCm: 4,
  }),
  limits: Object.freeze({
    heightMinCm: 1,
    heightMaxCm: 60,
    widthMinCm: 1,
    widthMaxCm: 30,
  }),
});

export const CARCASS_CORNICE_DIMENSIONS = Object.freeze({
  common: Object.freeze({
    epsilonM: 1e-6,
    yLiftM: 0.0006,
    minSegmentLengthM: 0.02,
    minBoxDimensionM: 0.001,
    thetaClampM: 0.01,
  }),
  wave: Object.freeze({
    maxHeightM: 0.095,
    cycles: 2,
    frameThicknessMinM: 0.01,
    frameThicknessMaxM: 0.028,
    fallbackWoodThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    amplitudeRatio: 0.03,
    amplitudeMinM: 0.03,
    amplitudeMaxM: 0.06,
    sampleSpacingM: 0.02,
    sampleCountMin: 24,
    sampleCountMax: 180,
    connectorInsetM: 0.0004,
    minInteriorNormalLengthSq: 1e-6,
  }),
  profile: Object.freeze({
    heightM: 0.08,
    overhangXM: 0.06,
    overhangZM: 0.04,
    insetOnRoofM: 0.03,
    backStepM: 0.02,
    seamEpsilonM: 0,
    baseHeightM: 0.022,
    step1OutM: 0.006,
    slopeHeightM: 0.03,
    slopeOutM: 0.018,
    step2OutM: 0.006,
    capRiseM: 0.012,
    capOutM: 0.004,
    topLipOutM: 0.003,
    minOverhangM: 0.001,
    xMaxFallbackM: 1,
    baseHeightRatio: 0.6,
    slopeHeightRatio: 0.92,
    capHeightRatio: 0.96,
    miterEpsilonZM: 0.0005,
    baseSealEpsilonM: 0.003,
    baseBandEpsilonM: 1e-6,
    envelopeProfileZM: 0.02,
    envelopeTopRadiusPadM: 0.12,
    envelopeDepthPadM: 0.08,
  }),
});

export const DOOR_SYSTEM_DIMENSIONS = Object.freeze({
  hinged: Object.freeze({
    visualWidthClearanceM: 0.004,
    visualHeightClearanceM: 0.004,
    visualThicknessM: MATERIAL_DIMENSIONS.wood.thicknessM,
    frontTrimZOffsetM: 0.011,
    opFrontZOffsetM: 0.01,
    sameModuleLeafGapMaxM: 0.003,
    sameModuleLeafGapWoodDivisor: 10,
    sameModuleLeafGapSpanRatioMax: 0.1,
    split: Object.freeze({
      minSegmentHeightM: 0.12,
      renderMinSegmentHeightM: 0.1,
      splitGapM: 0.006,
      duplicateCutToleranceMinM: 0.004,
      duplicateCutToleranceMaxM: 0.02,
      duplicateCutToleranceHeightRatio: 0.01,
      storageLiftM: 0.5,
      bottomClampOffsetM: 0.08,
      topClampOffsetM: 0.12,
      minHeightForSplitM: 0.2,
      hoverMinDoorHeightM: 0.05,
      hoverFallbackDoorWidthM: 0.45,
      hoverRegionMinHeightM: 0.05,
      hoverStandardLineMinHeightM: 0.014,
      hoverStandardLineMaxHeightM: 0.026,
      hoverStandardLineHeightRatio: 0.018,
      hoverCustomEdgePadM: 0.12,
      hoverCustomRemoveToleranceMinM: 0.03,
      hoverCustomRemoveToleranceMaxM: 0.08,
      hoverCustomRemoveToleranceRatio: 0.06,
      hoverCustomMarkerMinHeightM: 0.02,
      hoverCustomMarkerMaxHeightM: 0.06,
      hoverCustomMarkerHeightRatio: 0.03,
      hoverMarkerZOffsetM: 0.02,
      hoverMarkerScaleMinM: 0.01,
      hoverMarkerWidthClearanceM: 0.01,
      hoverMarkerHeightClearanceM: 0.001,
    }),
  }),
  sliding: Object.freeze({
    defaultDoorsCount: WARDROBE_DEFAULTS.byType.sliding.doorsCount,
    overlapM: 0.03,
    railHeightM: 0.04,
    railDepthM: 0.075,
    railBackInsetM: 0.002,
    shellClearanceMinM: 0.0006,
    shellClearanceMaxM: 0.002,
    shellClearanceWoodDivisor: 6,
    doorTopOverlapMaxM: 0.015,
    doorTopOverlapRailInsetM: 0.004,
    doorHeightMinM: 0.05,
    railLineOffsetYExtraM: 0.001,
    railTrackLaneDivisor: 4,
    trackOuterOffsetM: 0.012,
    trackInnerLaneGapM: 0.03,
    visualThicknessM: 0.022,
    trimFrontZM: 0.014,
    handleProfileZOffsetM: 0.024,
    standardHandleProfileWidthM: 0.025,
    standardHandleProfileDepthM: 0.025,
    standardHandleProfileInsetM: 0.0125,
    standardHandleProfileFrontZM: 0.025,
    edgeHandleWidthM: 0.01,
    edgeHandleDepthM: 0.03,
    edgeHandleInsetM: 0.005,
    runtimeOpenEpsilonXM: 0.002,
    runtimeStackZStepDefaultM: 0.055,
    runtimeStackZStepMinM: 0.03,
    runtimeStackZStepGapM: 0.006,
  }),
});

export const INTERIOR_FITTINGS_DIMENSIONS = Object.freeze({
  shelves: Object.freeze({
    regularDepthM: 0.45,
    regularWidthClearanceM: 0.014,
    braceWidthClearanceM: 0.002,
    braceSideGapM: 0.001,
    braceSeamPadM: 0.0001,
    braceSeamDepthMinM: 0.0001,
    braceSeamDepthInsetM: 0.0005,
    contentsWidthClearanceM: 0.06,
    contentsHeightClearanceM: 0.006,
    spanMinHeightM: 0.05,
    doubleThicknessMultiplier: 2,
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
    splitUpperRodYFactor: 4.6,
    splitUpperRodLimitFactor: 2.3,
    splitLowerRodYFactor: 2.3,
    splitLowerRodLimitFactor: 1.3,
    storageRodYFactor: 3.5,
    storageRodLimitFactor: 3.5,
  }),
});

export const CONTENT_VISUAL_DIMENSIONS = Object.freeze({
  books: Object.freeze({
    depthMarginM: 0.018,
    sideMarginM: 0.035,
    topSafetyM: 0.014,
    minHeightM: 0.07,
    minStackHeightM: 0.012,
    defaultMaxDepthM: 0.38,
    depthMaxM: 0.2,
    depthMinM: 0.08,
    depthViabilityMinM: 0.06,
    cursorEndGapM: 0.018,
    maxCount: 96,
    widthBaseM: 0.022,
    widthRandomRangeM: 0.026,
    gapBaseM: 0.003,
    gapRandomRangeM: 0.006,
    tiltZRangeRad: 0.045,
    angleCosMin: 0.001,
    heightBaseM: 0.16,
    heightRandomRangeM: 0.18,
    widthMinM: 0.01,
    stackLookaheadM: 0.04,
    stackMaxItems: 3,
    stackWidthBaseM: 0.07,
    stackWidthRandomRangeM: 0.035,
    stackTrailingGapM: 0.012,
    stackWidthMinM: 0.035,
    stackHeightBaseM: 0.014,
    stackHeightRandomRangeM: 0.008,
    stackDepthScaleBase: 0.88,
    stackDepthScaleRange: 0.12,
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

export const DOOR_VISUAL_DIMENSIONS = Object.freeze({
  common: Object.freeze({
    minPanelDimensionM: 0.02,
    minDoorDimensionForAccentM: 0.04,
    minStripThicknessM: 0.001,
    frontSurfaceNudgeM: 0.0009,
  }),
  accent: Object.freeze({
    defaultInsetM: 0.01,
    defaultLineThicknessM: 0.0022,
    defaultOpacity: 0.18,
    sketchOpacityExtra: 0.08,
    sketchOpacityMax: 0.35,
    safeInsetEdgeM: 0.01,
    minLineThicknessM: 0.0014,
    stripDepthM: 0.001,
    renderOrder: 3,
  }),
  grooves: Object.freeze({
    stripWidthM: 0.005,
    heightClearanceM: 0.04,
    stripDepthM: 0.002,
    surfaceOffsetM: 0.001,
  }),
  glass: Object.freeze({
    paneDepthM: 0.005,
    paneRenderOrder: 2,
    curtainRenderOrder: 1,
    curtainSegments: 256,
    curtainWaveAmplitudeM: 0.008,
    curtainWaveFrequency: 120,
    curtainDefaultGapM: 0.015,
    curtainForcedGapM: 0.012,
    curtainForcedEmissiveIntensity: 0.12,
    flatInsetMinM: 0.002,
    flatInsetMaxM: 0.006,
    flatInsetRatio: 0.01,
    opacity: 0.16,
    curtainOpacity: 0.72,
  }),
  profile: Object.freeze({
    outerFrameWidthM: 0.03,
    innerFrameWidthM: 0.027,
    outerFrameMinM: 0.015,
    innerFrameMinM: 0.012,
    frameEdgeClearanceM: 0.03,
    innerFrameEdgeClearanceM: 0.015,
    centerDepthMinM: 0.01,
    centerDepthMaxM: 0.02,
    centerDepthThicknessClearanceM: 0.004,
    stepDepthMinM: 0.002,
    stepDepthMaxM: 0.004,
    roundBulgeScale: 0.94,
    roundInsetMinM: 0.003,
    roundInsetMaxM: 0.012,
    roundInsetOuterFrameRatio: 0.24,
    centerPanelDepthMinM: 0.002,
    outerAccentInsetFrameRatio: 0.2,
    outerAccentInsetMaxM: 0.01,
    outerAccentLineThicknessM: 0.0018,
    innerAccentInsetFrameRatio: 0.28,
    innerAccentInsetMaxM: 0.012,
    innerAccentLineThicknessM: 0.0016,
    grooveDensityOverride: 12,
  }),
  miter: Object.freeze({
    bandMinM: 0.001,
    bandEdgeClearanceM: 0.006,
    seamInsetMinM: 0.0018,
    seamInsetBackoffM: 0.00025,
    seamZOffsetM: 0.0014,
    capSurfaceOffsetM: 0.0008,
    roundedBeadDepthMinM: 0.003,
    roundedBeadThicknessRatio: 0.96,
    roundedBeadScaleBase: 0.62,
    roundedBeadScaleBulgeRatio: 0.42,
    roundedBevelSizeMinM: 0.0014,
    roundedBevelSizeBandRatio: 0.49,
    roundedBevelSizeDepthRatio: 0.98,
    roundedBevelSizeEdgeBackoffM: 0.00045,
    roundedBevelThicknessMinM: 0.0012,
    roundedBevelThicknessBaseRatio: 0.46,
    roundedBevelThicknessBulgeRatio: 0.08,
    roundedBevelThicknessDepthBackoffM: 0.00025,
    roundedBevelOffsetMaxM: 0.0006,
    roundedBevelOffsetBandRatio: 0.03,
    roundedOuterFaceZMinM: 0.0016,
    roundedOuterFaceZBevelRatio: 1.35,
    roundedOuterFaceZDepthRatio: 0.42,
  }),
  tom: Object.freeze({
    frameWidthM: 0.045,
    frameMinM: 0.02,
    frameEdgeClearanceM: 0.02,
    recessDepthMinM: 0.008,
    recessDepthMaxM: 0.014,
    recessDepthThicknessClearanceM: 0.004,
    innerRaisedInsetMinM: 0.006,
    innerRaisedInsetMaxM: 0.014,
    innerRaisedInsetFrameRatio: 0.22,
    innerRaisedBandMinM: 0.006,
    innerRaisedBandFrameRatio: 0.24,
    innerRaisedBandEdgeClearanceM: 0.012,
    innerRaisedZMinM: 0.0022,
    innerRaisedZMaxM: 0.0042,
    innerRaisedZThicknessRatio: 0.24,
    innerRaisedZFrameRatio: 0.08,
    accentInsetFrameRatio: 0.18,
    accentInsetMaxM: 0.012,
    accentLineThicknessM: 0.0022,
    accentOpacity: 0.16,
  }),
  mirror: Object.freeze({
    doorThicknessMinM: 0.002,
    mirrorThicknessMinM: 0.002,
    mirrorThicknessMaxM: 0.004,
    mirrorThicknessDoorRatio: 0.35,
    adhesiveGapMinM: 0.0006,
    adhesiveGapMaxM: 0.0012,
    adhesiveGapMirrorRatio: 0.3,
    layoutFullInsetM: 0.002,
    layoutMinSizeM: 0.02,
    layoutCenterSnapNormThreshold: 0.04,
    layoutRemoveToleranceDefaultM: 0.03,
    layoutRemoveToleranceMaxM: 0.06,
    layoutRemoveToleranceSizeRatio: 0.18,
    layoutCenterEpsilon: 1e-4,
    layoutSizeEpsilonCm: 1e-3,
  }),
});

export const DOOR_TRIM_DIMENSIONS = Object.freeze({
  defaults: Object.freeze({
    thicknessM: 0.035,
    depthM: 0.01,
    frontZM: 0.011,
    frontSurfaceNudgeM: 0.0005,
    centerNorm: 0.5,
    crossSizeCm: 3.5,
  }),
  limits: Object.freeze({
    minSpanM: 0.04,
    customMinCm: 4,
    customMaxCm: 400,
    crossSizeMinCm: 1,
    crossSizeMaxCm: 120,
  }),
  snap: Object.freeze({
    centerNormThreshold: 0.04,
    centerNormThresholdMax: 0.25,
    mirrorZoneM: 0.006,
    mirrorEdgeGapM: 0.0008,
  }),
  normalize: Object.freeze({
    centerEpsilonNorm: 1e-4,
    rectSpanMinM: 0.0001,
  }),
  removeTolerance: Object.freeze({
    thicknessMultiplier: 1.15,
    maxM: 0.09,
    crossSpanRatio: 0.12,
  }),
});

export const DRAWER_DIMENSIONS = Object.freeze({
  sketch: Object.freeze({
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
    previewExternalFallbackHeightM: 0.08,
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
    internalPreviewGridDivisionsFallback: INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault,
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
  }),
  external: Object.freeze({
    shoeHeightM: 0.2,
    regularHeightM: 0.22,
    frontOffsetZM: 0.01,
    doorTopGapM: WARDROBE_DEFAULTS.stackSplit.seamGapM,
    openOffsetZM: 0.35,
    visualWidthClearanceM: 0.004,
    visualThicknessM: 0.02,
    visualHeightClearanceM: 0.008,
    boxWidthClearanceM: 0.044,
    boxHeightClearanceM: 0.04,
    boxDepthBackClearanceM: 0.1,
    boxOffsetZM: 0.005,
    connectorDepthM: 0.03,
    connectorFrontZM: -0.01,
    connectorBackInsetM: 0.003,
    connectorWidthClearanceM: 0.09,
    connectorHeightClearanceM: 0.06,
    separatorBoardWidthClearanceM: 0.025,
  }),
  internal: Object.freeze({
    defaultGridStepM: 0.25,
    defaultDepthM: 0.5,
    defaultInnerWidthM: 0.6,
    maxSingleDrawerHeightM: 0.35,
    verticalInsetM: 0.02,
    minDrawerHeightM: 0.01,
    widthClearanceM: 0.03,
    depthClearanceM: 0.02,
    firstDrawerBottomGapM: 0.01,
    betweenDrawersGapM: 0.03,
    stackCount: 2,
    openOffsetZM: 0.25,
  }),
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
  drawerFrontThicknessM: DRAWER_DIMENSIONS.external.visualThicknessM,
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
    defaultOuterDepthM: 0.45,
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
    shelfBraceClearanceM: 0.002,
    shelfRegularClearanceM: 0.014,
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
    placementGapFallbackM: 0.002,
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
    shoeHeightM: DRAWER_DIMENSIONS.external.shoeHeightM,
    externalRegularHeightM: DRAWER_DIMENSIONS.external.regularHeightM,
    internalDefaultDepthM: DRAWER_DIMENSIONS.internal.defaultDepthM,
    internalMaxSingleDrawerHeightM: DRAWER_DIMENSIONS.internal.maxSingleDrawerHeightM,
    internalVerticalInsetM: DRAWER_DIMENSIONS.internal.verticalInsetM,
    internalMinHeightM: DRAWER_DIMENSIONS.internal.minDrawerHeightM,
    internalFirstBottomGapM: DRAWER_DIMENSIONS.internal.firstDrawerBottomGapM,
    internalBetweenGapM: DRAWER_DIMENSIONS.internal.betweenDrawersGapM,
    rodMinLengthM: 0.05,
    rodWidthClearanceM: 0.02,
    hangingClothesWidthClearanceM: 0.06,
    internalMinWidthM: 0.1,
    internalWidthClearanceM: 0.1,
    internalMinDepthM: 0.08,
    internalDepthClearanceM: 0.12,
    internalClosedBackOffsetM: 0.02,
    internalOpenBackOffsetM: 0.3,
    internalStackCount: DRAWER_DIMENSIONS.internal.stackCount,
    shelfOverDrawerMinDepthM: 0.05,
    shelfOverDrawerDepthClearanceM: 0.002,
    externalFrontOffsetZM: DRAWER_DIMENSIONS.external.frontOffsetZM,
    externalOpenOffsetZM: DRAWER_DIMENSIONS.external.openOffsetZM,
    externalVisualWidthClearanceM: DRAWER_DIMENSIONS.external.visualWidthClearanceM,
    externalBoxWidthClearanceM: DRAWER_DIMENSIONS.external.boxWidthClearanceM,
    externalBoxHeightClearanceM: DRAWER_DIMENSIONS.external.boxHeightClearanceM,
    externalBoxDepthBackClearanceM: DRAWER_DIMENSIONS.external.boxDepthBackClearanceM,
    externalBoxOffsetZM: DRAWER_DIMENSIONS.external.boxOffsetZM,
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

export const CHEST_MODE_DIMENSIONS = Object.freeze({
  activeDefaults: Object.freeze({
    doorsCount: 0,
    widthCm: 50,
    heightCm: 50,
    depthCm: 40,
    drawersCount: WARDROBE_LIMITS.chestDrawers.min,
    baseType: 'legs',
  }),
  commode: Object.freeze({
    defaultMirrorHeightCm: 70,
    minMirrorHeightCm: 30,
    maxMirrorHeightCm: 180,
    minMirrorWidthCm: WARDROBE_LIMITS.width.chestMinCm,
    maxMirrorWidthCm: WARDROBE_LIMITS.width.maxCm,
    backPanelThicknessM: 0.018,
    mirrorThicknessM: 0.003,
    mirrorInsetM: 0.03,
    backPanelYOffsetM: 0.002,
    mirrorSurfaceLiftM: 0.0015,
  }),
  drawerBox: Object.freeze({
    panelThicknessM: 0.015,
    accentZOffsetM: 0.0008,
    accentMinWidthM: 0.12,
    accentMinHeightM: 0.08,
    accentThicknessMinM: 0.0022,
    accentThicknessMaxM: 0.004,
    accentThicknessRatio: 0.035,
    accentStripDepthM: 0.001,
    accentRenderOrder: 2,
    handleWidthM: 0.12,
    handleHeightM: 0.02,
    handleDepthM: 0.015,
    handleFrontOffsetM: 0.005,
  }),
  dimensionGuideSideOffsetM: 0.15,
  dimensionGuideTopOffsetM: 0.1,
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
    drawerDefaultHeightM: DRAWER_DIMENSIONS.external.shoeHeightM,
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
}): ExternalDrawerGeometry {
  const external = DRAWER_DIMENSIONS.external;
  const externalWidthM = finiteOr(args?.externalWidthM, 0);
  const depthM = finiteOr(args?.depthM, 0);
  const woodThicknessM = finiteOr(args?.woodThicknessM, MATERIAL_DIMENSIONS.wood.thicknessM);
  const frontZM = finiteOr(args?.frontZM, depthM / 2);
  const drawerHeightM = finiteOr(args?.drawerHeightM, external.regularHeightM);
  const connectD = external.connectorDepthM;

  return {
    zClosed: frontZM + external.frontOffsetZM,
    zOpen: frontZM + external.openOffsetZM,
    visualW: externalWidthM - external.visualWidthClearanceM,
    visualT: external.visualThicknessM,
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
