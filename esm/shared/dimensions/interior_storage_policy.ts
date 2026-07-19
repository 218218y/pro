import { meters } from './units.js';

export const INTERIOR_STORAGE_GRID_POLICY = Object.freeze({
  gridDivisionsDefault: 6,
});

export const INTERIOR_STORAGE_BARRIER_POLICY = Object.freeze({
  barrierHeightM: meters(0.5),
  barrierHeightMinM: meters(0.05),
  barrierHeightMaxM: meters(1.2),
  barrierFrontZOffsetM: meters(-0.06),
  barrierWidthMinM: meters(0.05),
  barrierWidthClearanceM: meters(0.025),
});

export const INTERIOR_STORAGE_PREVIEW_POLICY = Object.freeze({
  previewThicknessMinM: meters(0.0001),
});

export const INTERIOR_STORAGE_CLAMP_POLICY = Object.freeze({
  clampPadMinM: meters(0.001),
  clampPadMaxM: meters(0.006),
  clampPadWoodRatio: 0.2,
});

export const INTERIOR_STORAGE_LAYOUT_POLICY = Object.freeze({
  minHeightExtraM: meters(0.02),
  minHeightWoodMultiplier: 2,
});

const DEFAULT_LOWER_SHELF_SLOTS = Object.freeze([false, true, false, true, false, false]);

export const INTERIOR_STORAGE_DEFAULTS_POLICY = Object.freeze({
  defaultLowerShelfSlots: DEFAULT_LOWER_SHELF_SLOTS,
});

export const INTERIOR_STORAGE_POLICY = Object.freeze({
  gridDivisionsDefault: INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault,
  barrierHeightM: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
  barrierHeightMinM: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMinM,
  barrierHeightMaxM: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightMaxM,
  barrierFrontZOffsetM: INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
  barrierWidthMinM: INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
  barrierWidthClearanceM: INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM,
  previewThicknessMinM: INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM,
  clampPadMinM: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMinM,
  clampPadMaxM: INTERIOR_STORAGE_CLAMP_POLICY.clampPadMaxM,
  clampPadWoodRatio: INTERIOR_STORAGE_CLAMP_POLICY.clampPadWoodRatio,
  minHeightExtraM: INTERIOR_STORAGE_LAYOUT_POLICY.minHeightExtraM,
  minHeightWoodMultiplier: INTERIOR_STORAGE_LAYOUT_POLICY.minHeightWoodMultiplier,
  defaultLowerShelfSlots: INTERIOR_STORAGE_DEFAULTS_POLICY.defaultLowerShelfSlots,
});
