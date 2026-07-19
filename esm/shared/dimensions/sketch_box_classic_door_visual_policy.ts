import { meters } from './units.js';

export const SKETCH_BOX_CLASSIC_ACCENT_POLICY = Object.freeze({
  accentInsetMinM: meters(0.0025),
  accentInsetMaxM: meters(0.0045),
  accentInsetDoorRatio: 0.015,
  accentLineThicknessMinM: meters(0.0013),
  accentLineThicknessMaxM: meters(0.0019),
  accentLineThicknessDoorRatio: 0.0045,
  accentInnerMinM: meters(0.02),
  accentSurfaceOffsetM: meters(0.0008),
  accentStripDepthM: meters(0.001),
});

export const SKETCH_BOX_CLASSIC_GROOVE_POLICY = Object.freeze({
  grooveStripWidthM: meters(0.005),
  grooveHeightMinM: meters(0.01),
  grooveHeightClearanceM: meters(0.04),
  grooveDepthM: meters(0.002),
  grooveSurfaceOffsetM: meters(0.001),
});

export const SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY = Object.freeze({
  accentInsetMinM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentInsetMinM,
  accentInsetMaxM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentInsetMaxM,
  accentInsetDoorRatio: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentInsetDoorRatio,
  accentLineThicknessMinM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentLineThicknessMinM,
  accentLineThicknessMaxM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentLineThicknessMaxM,
  accentLineThicknessDoorRatio: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentLineThicknessDoorRatio,
  accentInnerMinM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentInnerMinM,
  accentSurfaceOffsetM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentSurfaceOffsetM,
  accentStripDepthM: SKETCH_BOX_CLASSIC_ACCENT_POLICY.accentStripDepthM,
  grooveStripWidthM: SKETCH_BOX_CLASSIC_GROOVE_POLICY.grooveStripWidthM,
  grooveHeightMinM: SKETCH_BOX_CLASSIC_GROOVE_POLICY.grooveHeightMinM,
  grooveHeightClearanceM: SKETCH_BOX_CLASSIC_GROOVE_POLICY.grooveHeightClearanceM,
  grooveDepthM: SKETCH_BOX_CLASSIC_GROOVE_POLICY.grooveDepthM,
  grooveSurfaceOffsetM: SKETCH_BOX_CLASSIC_GROOVE_POLICY.grooveSurfaceOffsetM,
});
