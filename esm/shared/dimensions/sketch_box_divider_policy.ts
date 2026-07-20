import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const SKETCH_BOX_DIVIDER_GEOMETRY_POLICY = Object.freeze({
  fallbackWoodThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  minInnerWidthM: meters(0.02),
  minInnerWithWoodClearanceM: meters(0.02),
  dividerHalfMinM: meters(0.006),
  segmentEdgeEpsilonM: meters(0.0001),
  pickEdgeEpsilonM: meters(0.0005),
  centeredEpsilonM: meters(0.001),
  defaultCenterNorm: 0.5,
});

export const SKETCH_BOX_DIVIDER_SNAP_POLICY = Object.freeze({
  centerSnapMinM: meters(0.012),
  centerSnapMaxM: meters(0.035),
  centerSnapWidthRatio: 0.07,
});

export const SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY = Object.freeze({
  removeHitMinM: meters(0.018),
  removeHitMaxM: meters(0.05),
  removeHitWidthRatio: 0.08,
});

export const SKETCH_BOX_DIVIDER_POLICY = Object.freeze({
  fallbackWoodThicknessM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
  minInnerWidthM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
  minInnerWithWoodClearanceM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWithWoodClearanceM,
  dividerHalfMinM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.dividerHalfMinM,
  segmentEdgeEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM,
  pickEdgeEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM,
  centeredEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.centeredEpsilonM,
  defaultCenterNorm: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm,
  centerSnapMinM: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMinM,
  centerSnapMaxM: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMaxM,
  centerSnapWidthRatio: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapWidthRatio,
  removeHitMinM: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMinM,
  removeHitMaxM: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMaxM,
  removeHitWidthRatio: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitWidthRatio,
});
