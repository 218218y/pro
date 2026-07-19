import { EXTERNAL_DRAWER_SIZE_POLICY } from './external_drawer_policy.js';
import { meters } from './units.js';

export const EDGE_HANDLE_SIZE_POLICY = Object.freeze({
  shortLengthM: meters(0.2),
  longLengthM: meters(0.4),
  minLengthM: meters(0.1),
  drawerWidthClearanceM: meters(0.04),
  doorAnchorOffsetM: meters(0.002),
  renderPrimitiveDoorAnchorInsetM: meters(0.0025),
});

export const EDGE_HANDLE_PROFILE_RENDER_POLICY = Object.freeze({
  mountThicknessM: meters(0.0045),
  mountDepthM: meters(0.014),
  mountFrontZM: meters(0.006),
  returnThicknessM: meters(0.012),
  returnDepthM: meters(0.008),
  returnFrontZM: meters(0.022),
  returnInsetM: meters(0.0115),
  bridgeThicknessM: meters(0.007),
  bridgeOverlapM: meters(0.004),
  drawerReturnDropM: meters(0.0135),
});

export const EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY = Object.freeze({
  defaultGlobalAbsYM: meters(1.05),
  drawerLiftThresholdYM: meters(0.9),
  drawerLiftClearanceM: meters(0.15),
  longLiftDrawerCountThreshold: 4,
  longLiftExtraM: meters(0.1),
  shortClampPaddingM: meters(0.1),
  longClampPaddingM: meters(0.2),
});

export const STANDARD_HANDLE_RENDER_POLICY = Object.freeze({
  drawerWidthM: meters(0.16),
  drawerHeightM: meters(0.01),
  drawerDepthM: meters(0.02),
  doorWidthM: meters(0.01),
  doorHeightM: meters(0.16),
  doorDepthM: meters(0.02),
  doorOffsetM: meters(0.05),
  frontZM: meters(0.02),
});

export const DRAWER_HANDLE_PLACEMENT_POLICY = Object.freeze({
  drawerDefaultWidthM: meters(0.4),
  drawerDefaultHeightM: EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM,
  frontZDefaultM: meters(0.02),
  zPositionEpsilonM: meters(0.0005),
  maxTrustedLocalZM: meters(2),
  drawerEdgeVisibleProtrusionM: meters(0.0135),
  shortDrawerStandardYOffsetM: meters(0.02),
  shortDrawerHeightThresholdM: meters(0.21),
  absYClampMinHeightM: meters(0.05),
  absYClampPaddingMinM: meters(0.02),
  absYClampPaddingMaxM: meters(0.1),
  absYClampPaddingHeightRatio: 0.2,
});

export const HANDLE_POLICY = Object.freeze({
  edge: Object.freeze({
    shortLengthM: EDGE_HANDLE_SIZE_POLICY.shortLengthM,
    longLengthM: EDGE_HANDLE_SIZE_POLICY.longLengthM,
    minLengthM: EDGE_HANDLE_SIZE_POLICY.minLengthM,
    drawerWidthClearanceM: EDGE_HANDLE_SIZE_POLICY.drawerWidthClearanceM,
    doorAnchorOffsetM: EDGE_HANDLE_SIZE_POLICY.doorAnchorOffsetM,
    renderPrimitiveDoorAnchorInsetM: EDGE_HANDLE_SIZE_POLICY.renderPrimitiveDoorAnchorInsetM,
    mountThicknessM: EDGE_HANDLE_PROFILE_RENDER_POLICY.mountThicknessM,
    mountDepthM: EDGE_HANDLE_PROFILE_RENDER_POLICY.mountDepthM,
    mountFrontZM: EDGE_HANDLE_PROFILE_RENDER_POLICY.mountFrontZM,
    returnThicknessM: EDGE_HANDLE_PROFILE_RENDER_POLICY.returnThicknessM,
    returnDepthM: EDGE_HANDLE_PROFILE_RENDER_POLICY.returnDepthM,
    returnFrontZM: EDGE_HANDLE_PROFILE_RENDER_POLICY.returnFrontZM,
    returnInsetM: EDGE_HANDLE_PROFILE_RENDER_POLICY.returnInsetM,
    bridgeThicknessM: EDGE_HANDLE_PROFILE_RENDER_POLICY.bridgeThicknessM,
    bridgeOverlapM: EDGE_HANDLE_PROFILE_RENDER_POLICY.bridgeOverlapM,
    drawerReturnDropM: EDGE_HANDLE_PROFILE_RENDER_POLICY.drawerReturnDropM,
    defaultGlobalAbsYM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM,
    drawerLiftThresholdYM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.drawerLiftThresholdYM,
    drawerLiftClearanceM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.drawerLiftClearanceM,
    longLiftDrawerCountThreshold: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.longLiftDrawerCountThreshold,
    longLiftExtraM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.longLiftExtraM,
    shortClampPaddingM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.shortClampPaddingM,
    longClampPaddingM: EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.longClampPaddingM,
  }),
  standard: STANDARD_HANDLE_RENDER_POLICY,
  placement: DRAWER_HANDLE_PLACEMENT_POLICY,
});
