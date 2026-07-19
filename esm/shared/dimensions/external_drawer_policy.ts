import { meters } from './units.js';
import { STACK_SPLIT_POLICY } from './stack_split_policy.js';

export const EXTERNAL_DRAWER_SIZE_POLICY = Object.freeze({
  shoeHeightM: meters(0.2),
  regularHeightM: meters(0.22),
});

export const EXTERNAL_DRAWER_MOTION_POLICY = Object.freeze({
  openOffsetZM: meters(0.35),
});

export const EXTERNAL_DRAWER_FRONT_RENDER_POLICY = Object.freeze({
  frontOffsetZM: meters(0.01),
  doorTopGapM: STACK_SPLIT_POLICY.seam.gapM,
  visualWidthClearanceM: meters(0.004),
  visualThicknessM: meters(0.02),
  visualHeightClearanceM: meters(0.008),
});

export const EXTERNAL_DRAWER_BOX_POLICY = Object.freeze({
  boxWidthClearanceM: meters(0.044),
  boxHeightClearanceM: meters(0.04),
  boxDepthBackClearanceM: meters(0.1),
  boxOffsetZM: meters(0.005),
});

export const EXTERNAL_DRAWER_CONNECTOR_POLICY = Object.freeze({
  connectorDepthM: meters(0.03),
  connectorFrontZM: meters(-0.01),
  connectorBackInsetM: meters(0.003),
  connectorWidthClearanceM: meters(0.09),
  connectorHeightClearanceM: meters(0.06),
});

export const EXTERNAL_DRAWER_SEPARATOR_POLICY = Object.freeze({
  separatorBoardWidthClearanceM: meters(0.025),
});

export const EXTERNAL_DRAWER_CONTENTS_POLICY = Object.freeze({
  contentsBottomInsetM: meters(0.015),
  contentsWidthClearanceM: meters(0.05),
  contentsHeightClearanceM: meters(0.03),
});

export const EXTERNAL_DRAWER_POLICY = Object.freeze({
  shoeHeightM: EXTERNAL_DRAWER_SIZE_POLICY.shoeHeightM,
  regularHeightM: EXTERNAL_DRAWER_SIZE_POLICY.regularHeightM,
  frontOffsetZM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM,
  doorTopGapM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM,
  openOffsetZM: EXTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
  visualWidthClearanceM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM,
  visualThicknessM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
  visualHeightClearanceM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM,
  boxWidthClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxWidthClearanceM,
  boxHeightClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxHeightClearanceM,
  boxDepthBackClearanceM: EXTERNAL_DRAWER_BOX_POLICY.boxDepthBackClearanceM,
  boxOffsetZM: EXTERNAL_DRAWER_BOX_POLICY.boxOffsetZM,
  connectorDepthM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorDepthM,
  connectorFrontZM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorFrontZM,
  connectorBackInsetM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorBackInsetM,
  connectorWidthClearanceM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorWidthClearanceM,
  connectorHeightClearanceM: EXTERNAL_DRAWER_CONNECTOR_POLICY.connectorHeightClearanceM,
  separatorBoardWidthClearanceM: EXTERNAL_DRAWER_SEPARATOR_POLICY.separatorBoardWidthClearanceM,
  contentsBottomInsetM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM,
  contentsWidthClearanceM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM,
  contentsHeightClearanceM: EXTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM,
});
