import { meters } from './units.js';

export const CHEST_SHELL_POLICY = Object.freeze({
  backThicknessM: meters(0.005),
  backInsetM: meters(0.005),
  backPanelWidthClearanceM: meters(0.002),
  backPanelHeightClearanceM: meters(0.002),
});

export const CHEST_DRAWER_GEOMETRY_POLICY = Object.freeze({
  drawerGapM: meters(0.004),
  drawerWidthClearanceM: meters(0.004),
  drawerFrontThicknessM: meters(0.018),
  drawerShadowLineThicknessM: meters(0.001),
  drawerBoxWidthClearanceM: meters(0.03),
  drawerBoxHeightClearanceM: meters(0.05),
  drawerBoxDepthClearanceM: meters(0.05),
});

export const CHEST_CONNECTOR_POLICY = Object.freeze({
  connectorDepthM: meters(0.02),
  connectorBackInsetM: meters(0.003),
  connectorWidthClearanceM: meters(0.08),
  connectorHeightClearanceM: meters(0.02),
});

export const CHEST_MOTION_POLICY = Object.freeze({
  openOffsetZM: meters(0.35),
});

export const CHEST_CASTER_RENDER_POLICY = Object.freeze({
  heightM: meters(0.07),
  radiusM: meters(0.025),
  thicknessM: meters(0.018),
  plateWidthM: meters(0.06),
  plateHeightM: meters(0.006),
  plateDepthM: meters(0.05),
  forkWidthM: meters(0.008),
  forkHeightM: meters(0.032),
  forkDepthM: meters(0.006),
});

export const CHEST_STRUCTURAL_DIMENSIONS = Object.freeze({
  backThicknessM: CHEST_SHELL_POLICY.backThicknessM,
  backInsetM: CHEST_SHELL_POLICY.backInsetM,
  backPanelWidthClearanceM: CHEST_SHELL_POLICY.backPanelWidthClearanceM,
  backPanelHeightClearanceM: CHEST_SHELL_POLICY.backPanelHeightClearanceM,
  drawerGapM: CHEST_DRAWER_GEOMETRY_POLICY.drawerGapM,
  drawerWidthClearanceM: CHEST_DRAWER_GEOMETRY_POLICY.drawerWidthClearanceM,
  drawerFrontThicknessM: CHEST_DRAWER_GEOMETRY_POLICY.drawerFrontThicknessM,
  drawerShadowLineThicknessM: CHEST_DRAWER_GEOMETRY_POLICY.drawerShadowLineThicknessM,
  drawerBoxWidthClearanceM: CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxWidthClearanceM,
  drawerBoxHeightClearanceM: CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxHeightClearanceM,
  drawerBoxDepthClearanceM: CHEST_DRAWER_GEOMETRY_POLICY.drawerBoxDepthClearanceM,
  connectorDepthM: CHEST_CONNECTOR_POLICY.connectorDepthM,
  connectorBackInsetM: CHEST_CONNECTOR_POLICY.connectorBackInsetM,
  connectorWidthClearanceM: CHEST_CONNECTOR_POLICY.connectorWidthClearanceM,
  connectorHeightClearanceM: CHEST_CONNECTOR_POLICY.connectorHeightClearanceM,
  openOffsetZM: CHEST_MOTION_POLICY.openOffsetZM,
  wheels: CHEST_CASTER_RENDER_POLICY,
});
