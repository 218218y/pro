import { INTERIOR_STORAGE_POLICY } from './interior_storage_policy.js';
import { meters } from './units.js';

export const INTERIOR_SHELF_GEOMETRY_POLICY = Object.freeze({
  regularDepthM: meters(0.45),
  regularWidthClearanceM: meters(0.014),
  braceWidthClearanceM: meters(0),
  spanMinHeightM: meters(0.05),
  doubleThicknessMultiplier: 2,
});

export const INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY = Object.freeze({
  contentsWidthClearanceM: meters(0.06),
  contentsHeightClearanceM: meters(0.006),
});

export const INTERIOR_SHELF_ROUNDED_RENDER_POLICY = Object.freeze({
  roundedCornerRadiusM: meters(0.12),
  roundedCornerSegments: 18,
});

export const INTERIOR_SHELF_POLICY = Object.freeze({
  regularDepthM: INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM,
  regularWidthClearanceM: INTERIOR_SHELF_GEOMETRY_POLICY.regularWidthClearanceM,
  braceWidthClearanceM: INTERIOR_SHELF_GEOMETRY_POLICY.braceWidthClearanceM,
  contentsWidthClearanceM: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM,
  contentsHeightClearanceM: INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM,
  spanMinHeightM: INTERIOR_SHELF_GEOMETRY_POLICY.spanMinHeightM,
  doubleThicknessMultiplier: INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier,
  roundedCornerRadiusM: INTERIOR_SHELF_ROUNDED_RENDER_POLICY.roundedCornerRadiusM,
  roundedCornerSegments: INTERIOR_SHELF_ROUNDED_RENDER_POLICY.roundedCornerSegments,
});

export const INTERIOR_SHELF_PIN_RENDER_POLICY = Object.freeze({
  radiusM: meters(0.0025),
  lengthM: meters(0.012),
  edgeOffsetDefaultM: meters(0.04),
  bottomYOffsetM: meters(0.0005),
  maxDepthSideClearanceM: meters(0.02),
  minEdgeOffsetM: meters(0.015),
  radialSegments: 12,
});

export const INTERIOR_ROD_RENDER_POLICY = Object.freeze({
  radiusM: meters(0.015),
  widthClearanceM: meters(0.04),
  radialSegments: 12,
});

export const INTERIOR_ROD_PLACEMENT_POLICY = Object.freeze({
  drawerVerticalGuardM: meters(0.05),
  minHangingHeightM: meters(0.75),
  defaultYOffsetM: meters(-0.08),
});

export const INTERIOR_ROD_DEPTH_CLEARANCE_POLICY = Object.freeze({
  depthBackClearanceM: meters(0.04),
  doorFrontClearanceM: meters(0.025),
  storageDepthLimitM: meters(0.3),
  depthHintMinM: meters(0.12),
  depthHintMaxM: meters(0.45),
});

export const INTERIOR_ROD_CONTENT_CLEARANCE_POLICY = Object.freeze({
  contentsWidthClearanceM: meters(0.06),
});

export const INTERIOR_ROD_POLICY = Object.freeze({
  radiusM: INTERIOR_ROD_RENDER_POLICY.radiusM,
  widthClearanceM: INTERIOR_ROD_RENDER_POLICY.widthClearanceM,
  radialSegments: INTERIOR_ROD_RENDER_POLICY.radialSegments,
  drawerVerticalGuardM: INTERIOR_ROD_PLACEMENT_POLICY.drawerVerticalGuardM,
  minHangingHeightM: INTERIOR_ROD_PLACEMENT_POLICY.minHangingHeightM,
  depthBackClearanceM: INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthBackClearanceM,
  doorFrontClearanceM: INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.doorFrontClearanceM,
  storageDepthLimitM: INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.storageDepthLimitM,
  depthHintMinM: INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMinM,
  depthHintMaxM: INTERIOR_ROD_DEPTH_CLEARANCE_POLICY.depthHintMaxM,
  contentsWidthClearanceM: INTERIOR_ROD_CONTENT_CLEARANCE_POLICY.contentsWidthClearanceM,
  defaultYOffsetM: INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM,
});

const FULL_SHELF_ROWS = Object.freeze([1, 2, 3, 4, 5]);
const HANGING_SHELF_ROWS = Object.freeze([5, 4]);
const SPLIT_SHELF_ROWS = Object.freeze([5, 1]);

export const INTERIOR_PRESET_SHELF_ROWS_POLICY = Object.freeze({
  fullShelfRows: FULL_SHELF_ROWS,
  hangingShelfRows: HANGING_SHELF_ROWS,
  splitShelfRows: SPLIT_SHELF_ROWS,
});

export const INTERIOR_PRESET_ROD_FACTORS_POLICY = Object.freeze({
  mixedRodYFactor: 3.5,
  hangingRodYFactor: 3.8,
  splitUpperRodYFactor: 4.8,
  splitUpperRodLimitFactor: 2.5,
  splitLowerRodYFactor: 2.3,
  splitLowerRodLimitFactor: 1.3,
  storageRodYFactor: 3.8,
  storageRodLimitFactor: 3.8,
});

export const INTERIOR_PRESET_POLICY = Object.freeze({
  fullShelfRows: INTERIOR_PRESET_SHELF_ROWS_POLICY.fullShelfRows,
  hangingShelfRows: INTERIOR_PRESET_SHELF_ROWS_POLICY.hangingShelfRows,
  splitShelfRows: INTERIOR_PRESET_SHELF_ROWS_POLICY.splitShelfRows,
  mixedRodYFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.mixedRodYFactor,
  hangingRodYFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.hangingRodYFactor,
  splitUpperRodYFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitUpperRodYFactor,
  splitUpperRodLimitFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitUpperRodLimitFactor,
  splitLowerRodYFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitLowerRodYFactor,
  splitLowerRodLimitFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.splitLowerRodLimitFactor,
  storageRodYFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodYFactor,
  storageRodLimitFactor: INTERIOR_PRESET_ROD_FACTORS_POLICY.storageRodLimitFactor,
});

export const INTERIOR_FITTINGS_POLICY = Object.freeze({
  shelves: INTERIOR_SHELF_POLICY,
  pins: INTERIOR_SHELF_PIN_RENDER_POLICY,
  rods: INTERIOR_ROD_POLICY,
  storage: INTERIOR_STORAGE_POLICY,
  presets: INTERIOR_PRESET_POLICY,
});
