import {
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from './external_drawer_policy.js';
import { INTERNAL_DRAWER_LAYOUT_POLICY, INTERNAL_DRAWER_MOTION_POLICY } from './internal_drawer_policy.js';
import { INTERIOR_STORAGE_CLAMP_POLICY, INTERIOR_STORAGE_GRID_POLICY } from './interior_storage_policy.js';
import { centimeters, meters, metersToCentimeters } from './units.js';

// Joint Sketch Drawer consumers keep one shared-layer import while the values
// remain owned by the existing External Drawer policies.
export { EXTERNAL_DRAWER_FRONT_RENDER_POLICY, EXTERNAL_DRAWER_SIZE_POLICY };

export const DRAWER_SKETCH_SIZING_POLICY = Object.freeze({
  heightMinCm: centimeters(5),
  heightMaxCm: centimeters(120),
  externalDefaultHeightCm: metersToCentimeters(EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM),
  externalShoeDefaultHeightCm: metersToCentimeters(EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM),
  internalDefaultHeightCm: metersToCentimeters(INTERNAL_DRAWER_LAYOUT_POLICY.defaultSingleDrawerHeightM),
  heightTokenEpsilonCm: centimeters(0.0001),
  externalCountMin: 1,
  externalCountMax: 6,
  externalPreviewDefaultCount: 3,
  minRenderHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.minDrawerHeightM,
  internalGapM: INTERNAL_DRAWER_LAYOUT_POLICY.betweenDrawersGapM,
  internalStackCount: INTERNAL_DRAWER_LAYOUT_POLICY.stackCount,
});

export const DRAWER_SKETCH_PREVIEW_RENDER_POLICY = Object.freeze({
  previewDrawerBottomLiftM: meters(0.01),
  previewStackExtraHeightM: meters(0.02),
  previewExternalDefaultHeightM: meters(0.08),
  previewOverlayThicknessMinM: meters(0.004),
  previewOverlayThicknessMaxM: meters(0.02),
  previewDividerMinM: meters(0.003),
  previewDividerMaxM: meters(0.012),
  previewDividerWidthRatio: 0.04,
  previewDividerDepthExtraM: meters(0.002),
});

export const DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY = Object.freeze({
  externalPreviewMinWidthM: meters(0.08),
  externalPreviewMinDepthM: meters(0.1),
  externalPreviewDepthClearanceM: meters(0.05),
  externalPreviewCenterZInsetM: meters(0.025),
  externalPreviewFrontZOffsetM: meters(0.001),
  externalPreviewVisualMinWidthM: meters(0.05),
  externalPreviewVisualMinHeightM: meters(0.05),
  externalPreviewVisualMinDepthM: meters(0.005),
  externalPreviewBoxMinDimensionM: meters(0.05),
  externalPreviewMeasurementZOffsetMinM: meters(0.004),
  externalPreviewMeasurementZOffsetThicknessRatio: 0.25,
});

export const DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY = Object.freeze({
  internalPreviewMinWidthM: meters(0.05),
  internalPreviewMinDepthM: meters(0.05),
  internalPreviewWidthClearanceM: meters(0.03),
  internalPreviewDepthClearanceM: meters(0.02),
  internalPreviewMeasurementZOffsetMinM: meters(0.004),
  internalPreviewMeasurementZOffsetDepthRatio: 0.08,
  internalPreviewGridDivisionsMin: 2,
  internalPreviewGridDivisionsMax: 12,
  internalPreviewGridDivisionsDefault: INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault,
  internalPreviewGridHeadClearanceM: meters(0.02),
  internalPreviewSingleDrawerGapM: meters(0.02),
  internalPreviewDefaultSingleHeightM: meters(0.11),
  internalPreviewRemovalHalfExtraM: meters(0.01),
  internalPreviewRemovalToleranceMinM: meters(0.045),
  internalPreviewRemovalToleranceMaxM: meters(0.14),
  internalPreviewRemovalToleranceExtraM: meters(0.02),
  internalClampPadMinM: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM,
  internalClampPadMaxM: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM,
  internalClampPadWoodRatio: INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio,
  internalWidthMinM: meters(0.05),
  internalDepthMinM: meters(0.05),
  internalWidthClearanceM: INTERNAL_DRAWER_LAYOUT_POLICY.widthClearanceM,
  internalDepthClearanceM: INTERNAL_DRAWER_LAYOUT_POLICY.depthClearanceM,
  internalSideFillerWidthM: meters(0.05),
  internalSideFillerFrontInsetM: meters(0.03),
  internalOpenOffsetZM: INTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
  internalBottomLiftMaxM: meters(0.002),
  internalBottomLiftWoodRatio: 0.15,
});

export const DRAWER_SKETCH_DOOR_CUT_POLICY = Object.freeze({
  externalDoorCutFrontInsetM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM / 2,
  externalDoorCutSurroundingGapM:
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM +
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM / 2,
  doorCutHorizontalOverlapMinM: meters(0.005),
  doorCutNoOpToleranceM: meters(0.002),
  doorCutIntervalMinHeightM: meters(0.01),
  doorCutIntervalMergeGapM: meters(0.002),
  doorCutVisibleSegmentMinHeightM: meters(0.012),
  rebuiltSegmentMinHeightForHandleM: meters(0.12),
  rebuiltSegmentHandleMinHeightM: meters(0.02),
  rebuiltSegmentHandlePaddingMinM: meters(0.02),
  rebuiltSegmentHandlePaddingMaxM: meters(0.1),
  rebuiltSegmentHandlePaddingHeightRatio: 0.2,
  rebuiltSegmentRestoreTargetMinDimensionM: meters(0.02),
  rebuiltSegmentRestoreTargetMinThicknessM: meters(0.002),
  rebuiltSegmentDefaultHandlePaddingM: meters(0.01),
  rebuiltSegmentVisualMinDimensionM: meters(0.02),
  rebuiltSegmentVisualWidthClearanceM: meters(0.004),
});

export const DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY = Object.freeze({
  verticalStackCollisionGapM: meters(0.008),
  faceVerticalAlignmentEpsilonM: meters(0.003),
  faceVerticalAlignmentMinHeightM: meters(0.012),
});

export const DRAWER_SKETCH_POLICY = Object.freeze({
  heightMinCm: DRAWER_SKETCH_SIZING_POLICY.heightMinCm,
  heightMaxCm: DRAWER_SKETCH_SIZING_POLICY.heightMaxCm,
  externalDefaultHeightCm: DRAWER_SKETCH_SIZING_POLICY.externalDefaultHeightCm,
  externalShoeDefaultHeightCm: DRAWER_SKETCH_SIZING_POLICY.externalShoeDefaultHeightCm,
  internalDefaultHeightCm: DRAWER_SKETCH_SIZING_POLICY.internalDefaultHeightCm,
  heightTokenEpsilonCm: DRAWER_SKETCH_SIZING_POLICY.heightTokenEpsilonCm,
  externalCountMin: DRAWER_SKETCH_SIZING_POLICY.externalCountMin,
  externalCountMax: DRAWER_SKETCH_SIZING_POLICY.externalCountMax,
  externalPreviewDefaultCount: DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount,
  minRenderHeightM: DRAWER_SKETCH_SIZING_POLICY.minRenderHeightM,
  internalGapM: DRAWER_SKETCH_SIZING_POLICY.internalGapM,
  internalStackCount: DRAWER_SKETCH_SIZING_POLICY.internalStackCount,
  previewDrawerBottomLiftM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDrawerBottomLiftM,
  previewStackExtraHeightM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewStackExtraHeightM,
  previewExternalDefaultHeightM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewExternalDefaultHeightM,
  previewOverlayThicknessMinM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMinM,
  previewOverlayThicknessMaxM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewOverlayThicknessMaxM,
  previewDividerMinM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerMinM,
  previewDividerMaxM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerMaxM,
  previewDividerWidthRatio: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerWidthRatio,
  previewDividerDepthExtraM: DRAWER_SKETCH_PREVIEW_RENDER_POLICY.previewDividerDepthExtraM,
  externalDoorCutFrontInsetM: DRAWER_SKETCH_DOOR_CUT_POLICY.externalDoorCutFrontInsetM,
  externalDoorCutSurroundingGapM: DRAWER_SKETCH_DOOR_CUT_POLICY.externalDoorCutSurroundingGapM,
  externalPreviewMinWidthM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
  externalPreviewMinDepthM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM,
  externalPreviewDepthClearanceM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewDepthClearanceM,
  externalPreviewCenterZInsetM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewCenterZInsetM,
  externalPreviewFrontZOffsetM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM,
  externalPreviewVisualMinWidthM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
  externalPreviewVisualMinHeightM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
  externalPreviewVisualMinDepthM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinDepthM,
  externalPreviewBoxMinDimensionM: DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewBoxMinDimensionM,
  externalPreviewMeasurementZOffsetMinM:
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetMinM,
  externalPreviewMeasurementZOffsetThicknessRatio:
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetThicknessRatio,
  internalPreviewMinWidthM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM,
  internalPreviewMinDepthM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM,
  internalPreviewWidthClearanceM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM,
  internalPreviewDepthClearanceM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM,
  internalPreviewMeasurementZOffsetMinM:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetMinM,
  internalPreviewMeasurementZOffsetDepthRatio:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetDepthRatio,
  internalPreviewGridDivisionsMin: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewGridDivisionsMin,
  internalPreviewGridDivisionsMax: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewGridDivisionsMax,
  internalPreviewGridDivisionsDefault:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewGridDivisionsDefault,
  internalPreviewGridHeadClearanceM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewGridHeadClearanceM,
  internalPreviewSingleDrawerGapM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewSingleDrawerGapM,
  internalPreviewDefaultSingleHeightM:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDefaultSingleHeightM,
  internalPreviewRemovalHalfExtraM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewRemovalHalfExtraM,
  internalPreviewRemovalToleranceMinM:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewRemovalToleranceMinM,
  internalPreviewRemovalToleranceMaxM:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewRemovalToleranceMaxM,
  internalPreviewRemovalToleranceExtraM:
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewRemovalToleranceExtraM,
  internalClampPadMinM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
  internalClampPadMaxM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
  internalClampPadWoodRatio: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio,
  internalWidthMinM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthMinM,
  internalDepthMinM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalDepthMinM,
  internalWidthClearanceM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalWidthClearanceM,
  internalDepthClearanceM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalDepthClearanceM,
  internalSideFillerWidthM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalSideFillerWidthM,
  internalSideFillerFrontInsetM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalSideFillerFrontInsetM,
  internalOpenOffsetZM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalOpenOffsetZM,
  internalBottomLiftMaxM: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalBottomLiftMaxM,
  internalBottomLiftWoodRatio: DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalBottomLiftWoodRatio,
  verticalStackCollisionGapM: DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY.verticalStackCollisionGapM,
  doorCutHorizontalOverlapMinM: DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutHorizontalOverlapMinM,
  doorCutNoOpToleranceM: DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutNoOpToleranceM,
  doorCutIntervalMinHeightM: DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutIntervalMinHeightM,
  doorCutIntervalMergeGapM: DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutIntervalMergeGapM,
  doorCutVisibleSegmentMinHeightM: DRAWER_SKETCH_DOOR_CUT_POLICY.doorCutVisibleSegmentMinHeightM,
  rebuiltSegmentMinHeightForHandleM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentMinHeightForHandleM,
  rebuiltSegmentHandleMinHeightM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentHandleMinHeightM,
  rebuiltSegmentHandlePaddingMinM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentHandlePaddingMinM,
  rebuiltSegmentHandlePaddingMaxM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentHandlePaddingMaxM,
  rebuiltSegmentHandlePaddingHeightRatio:
    DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentHandlePaddingHeightRatio,
  rebuiltSegmentRestoreTargetMinDimensionM:
    DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentRestoreTargetMinDimensionM,
  rebuiltSegmentRestoreTargetMinThicknessM:
    DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentRestoreTargetMinThicknessM,
  rebuiltSegmentDefaultHandlePaddingM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentDefaultHandlePaddingM,
  rebuiltSegmentVisualMinDimensionM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentVisualMinDimensionM,
  rebuiltSegmentVisualWidthClearanceM: DRAWER_SKETCH_DOOR_CUT_POLICY.rebuiltSegmentVisualWidthClearanceM,
  faceVerticalAlignmentEpsilonM: DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY.faceVerticalAlignmentEpsilonM,
  faceVerticalAlignmentMinHeightM: DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY.faceVerticalAlignmentMinHeightM,
});
