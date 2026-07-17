import { WARDROBE_LIMITS } from './product_limits.js';
import { centimeters, meters } from './units.js';

export const CHEST_MODE_ACTIVE_DEFAULTS_POLICY = Object.freeze({
  doorsCount: 0,
  widthCm: centimeters(50),
  heightCm: centimeters(50),
  depthCm: centimeters(40),
  drawersCount: WARDROBE_LIMITS.chestDrawers.min,
  baseType: 'legs',
});

export const CHEST_MODE_COMMODE_CONSTRAINTS_POLICY = Object.freeze({
  defaultMirrorHeightCm: centimeters(70),
  minMirrorHeightCm: centimeters(30),
  maxMirrorHeightCm: centimeters(180),
  minMirrorWidthCm: centimeters(WARDROBE_LIMITS.width.chestMinCm),
  maxMirrorWidthCm: centimeters(WARDROBE_LIMITS.width.maxCm),
});

export const CHEST_MODE_COMMODE_RENDER_POLICY = Object.freeze({
  backPanelThicknessM: meters(0.018),
  mirrorThicknessM: meters(0.003),
  mirrorInsetM: meters(0.03),
  backPanelYOffsetM: meters(0.002),
  mirrorSurfaceLiftM: meters(0.0015),
});

const CHEST_MODE_COMMODE_POLICY = Object.freeze({
  defaultMirrorHeightCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.defaultMirrorHeightCm,
  minMirrorHeightCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.minMirrorHeightCm,
  maxMirrorHeightCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.maxMirrorHeightCm,
  minMirrorWidthCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.minMirrorWidthCm,
  maxMirrorWidthCm: CHEST_MODE_COMMODE_CONSTRAINTS_POLICY.maxMirrorWidthCm,
  backPanelThicknessM: CHEST_MODE_COMMODE_RENDER_POLICY.backPanelThicknessM,
  mirrorThicknessM: CHEST_MODE_COMMODE_RENDER_POLICY.mirrorThicknessM,
  mirrorInsetM: CHEST_MODE_COMMODE_RENDER_POLICY.mirrorInsetM,
  backPanelYOffsetM: CHEST_MODE_COMMODE_RENDER_POLICY.backPanelYOffsetM,
  mirrorSurfaceLiftM: CHEST_MODE_COMMODE_RENDER_POLICY.mirrorSurfaceLiftM,
});

export const CHEST_MODE_DRAWER_BOX_RENDER_POLICY = Object.freeze({
  panelThicknessM: meters(0.015),
  accentZOffsetM: meters(0.0008),
  accentMinWidthM: meters(0.12),
  accentMinHeightM: meters(0.08),
  accentThicknessMinM: meters(0.0022),
  accentThicknessMaxM: meters(0.004),
  accentThicknessRatio: 0.035,
  accentStripDepthM: meters(0.001),
  accentRenderOrder: 2,
  handleWidthM: meters(0.12),
  handleHeightM: meters(0.02),
  handleDepthM: meters(0.015),
  handleFrontOffsetM: meters(0.005),
});

const CHEST_MODE_DIMENSION_GUIDE_TOTAL_POLICY = Object.freeze({
  scale: 0.66,
  styleKey: 'compactTotal',
});

const CHEST_MODE_DIMENSION_GUIDE_TEXT_SCALE_POLICY = Object.freeze({
  total: CHEST_MODE_DIMENSION_GUIDE_TOTAL_POLICY,
  segment: 0.6,
});

export const CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY = Object.freeze({
  sideOffsetM: meters(0.15),
  topOffsetM: meters(0.1),
  textScale: CHEST_MODE_DIMENSION_GUIDE_TEXT_SCALE_POLICY,
});

export const CHEST_MODE_DIMENSIONS = Object.freeze({
  activeDefaults: CHEST_MODE_ACTIVE_DEFAULTS_POLICY,
  commode: CHEST_MODE_COMMODE_POLICY,
  drawerBox: CHEST_MODE_DRAWER_BOX_RENDER_POLICY,
  dimensionGuideSideOffsetM: CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.sideOffsetM,
  dimensionGuideTopOffsetM: CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.topOffsetM,
  dimensionGuideTextScale: CHEST_MODE_DIMENSION_GUIDE_RENDER_POLICY.textScale,
});
