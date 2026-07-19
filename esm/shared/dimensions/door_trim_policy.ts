import { centimeters, meters } from './units.js';

export const DOOR_TRIM_RENDER_POLICY = Object.freeze({
  thicknessM: meters(0.035),
  depthM: meters(0.01),
  frontZM: meters(0.011),
  frontSurfaceNudgeM: meters(0.0005),
});

export const DOOR_TRIM_AUTHORING_DEFAULTS_POLICY = Object.freeze({
  centerNorm: 0.5,
  crossSizeCm: centimeters(3.5),
});

export const DOOR_TRIM_LIMITS_POLICY = Object.freeze({
  minSpanM: meters(0.04),
  customMinCm: centimeters(4),
  customMaxCm: centimeters(400),
  crossSizeMinCm: centimeters(1),
  crossSizeMaxCm: centimeters(120),
});

export const DOOR_TRIM_SNAP_POLICY = Object.freeze({
  centerNormThreshold: 0.04,
  centerNormThresholdMax: 0.25,
  mirrorZoneM: meters(0.006),
  mirrorEdgeGapM: meters(0.0008),
});

export const DOOR_TRIM_NORMALIZATION_POLICY = Object.freeze({
  centerEpsilonNorm: 0.0001,
  rectSpanMinM: meters(0.0001),
});

export const DOOR_TRIM_REMOVE_TOLERANCE_POLICY = Object.freeze({
  thicknessMultiplier: 1.15,
  maxM: meters(0.09),
  crossSpanRatio: 0.12,
});

export const DOOR_TRIM_DEFAULTS_POLICY = Object.freeze({
  thicknessM: DOOR_TRIM_RENDER_POLICY.thicknessM,
  depthM: DOOR_TRIM_RENDER_POLICY.depthM,
  frontZM: DOOR_TRIM_RENDER_POLICY.frontZM,
  frontSurfaceNudgeM: DOOR_TRIM_RENDER_POLICY.frontSurfaceNudgeM,
  centerNorm: DOOR_TRIM_AUTHORING_DEFAULTS_POLICY.centerNorm,
  crossSizeCm: DOOR_TRIM_AUTHORING_DEFAULTS_POLICY.crossSizeCm,
});

export const DOOR_TRIM_DIMENSIONS = Object.freeze({
  defaults: DOOR_TRIM_DEFAULTS_POLICY,
  limits: DOOR_TRIM_LIMITS_POLICY,
  snap: DOOR_TRIM_SNAP_POLICY,
  normalize: DOOR_TRIM_NORMALIZATION_POLICY,
  removeTolerance: DOOR_TRIM_REMOVE_TOLERANCE_POLICY,
});
