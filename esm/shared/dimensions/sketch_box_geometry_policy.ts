import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const SKETCH_BOX_SHELL_GEOMETRY_POLICY = Object.freeze({
  defaultWoodThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  minOuterWidthM: meters(0.05),
  minOuterDepthM: meters(0.05),
  minOuterHeightM: meters(0.05),
  minInnerDimensionM: meters(0.02),
  minInnerAdditiveClearanceM: meters(0.02),
  defaultOuterWidthM: meters(0.6),
  defaultOuterDepthM: meters(0.55),
  defaultOuterHeightM: meters(0.4),
  maxOuterHeightM: meters(1.2),
});

export const SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY = Object.freeze({
  placementClampPadMinM: meters(0.001),
  placementClampPadMaxM: meters(0.006),
  placementClampPadWoodRatio: 0.2,
  centerSnapMinM: meters(0.015),
  centerSnapMaxM: meters(0.04),
  centerSnapWidthRatio: 0.06,
  centeredEpsilonM: meters(0.001),
});

export const SKETCH_BOX_SELECTOR_GEOMETRY_POLICY = Object.freeze({
  selectorInnerMinM: meters(0.05),
  selectorDepthClearanceM: meters(0.05),
  selectorCenterZInsetM: meters(0.015),
});

export const SKETCH_BOX_GEOMETRY_POLICY = Object.freeze({
  defaultWoodThicknessM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultWoodThicknessM,
  minOuterWidthM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM,
  minOuterDepthM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterDepthM,
  minOuterHeightM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM,
  minInnerDimensionM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM,
  minInnerAdditiveClearanceM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerAdditiveClearanceM,
  placementClampPadMinM: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM,
  placementClampPadMaxM: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMaxM,
  placementClampPadWoodRatio: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadWoodRatio,
  defaultOuterWidthM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterWidthM,
  defaultOuterDepthM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterDepthM,
  defaultOuterHeightM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM,
  maxOuterHeightM: SKETCH_BOX_SHELL_GEOMETRY_POLICY.maxOuterHeightM,
  centerSnapMinM: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapMinM,
  centerSnapMaxM: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapMaxM,
  centerSnapWidthRatio: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centerSnapWidthRatio,
  centeredEpsilonM: SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.centeredEpsilonM,
  selectorInnerMinM: SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorInnerMinM,
  selectorDepthClearanceM: SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorDepthClearanceM,
  selectorCenterZInsetM: SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorCenterZInsetM,
});
