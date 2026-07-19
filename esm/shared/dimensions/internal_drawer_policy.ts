import { meters } from './units.js';

export const INTERNAL_DRAWER_LAYOUT_POLICY = Object.freeze({
  defaultGridStepM: meters(0.25),
  defaultDepthM: meters(0.5),
  defaultInnerWidthM: meters(0.6),
  maxSingleDrawerHeightM: meters(0.35),
  defaultSingleDrawerHeightM: meters(0.165),
  verticalInsetM: meters(0.02),
  minDrawerHeightM: meters(0.01),
  widthClearanceM: meters(0.03),
  depthClearanceM: meters(0.02),
  firstDrawerBottomGapM: meters(0.01),
  betweenDrawersGapM: meters(0.03),
  stackCount: 2,
});

export const INTERNAL_DRAWER_MOTION_POLICY = Object.freeze({
  openOffsetZM: meters(0.25),
});

export const INTERNAL_DRAWER_CONTENTS_POLICY = Object.freeze({
  contentsBottomInsetM: meters(0.015),
  contentsWidthClearanceM: meters(0.05),
  contentsHeightClearanceM: meters(0.03),
});

export const INTERNAL_DRAWER_POLICY = Object.freeze({
  defaultGridStepM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultGridStepM,
  defaultDepthM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultDepthM,
  defaultInnerWidthM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultInnerWidthM,
  maxSingleDrawerHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.maxSingleDrawerHeightM,
  defaultSingleDrawerHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.defaultSingleDrawerHeightM,
  verticalInsetM: INTERNAL_DRAWER_LAYOUT_POLICY.verticalInsetM,
  minDrawerHeightM: INTERNAL_DRAWER_LAYOUT_POLICY.minDrawerHeightM,
  widthClearanceM: INTERNAL_DRAWER_LAYOUT_POLICY.widthClearanceM,
  depthClearanceM: INTERNAL_DRAWER_LAYOUT_POLICY.depthClearanceM,
  firstDrawerBottomGapM: INTERNAL_DRAWER_LAYOUT_POLICY.firstDrawerBottomGapM,
  betweenDrawersGapM: INTERNAL_DRAWER_LAYOUT_POLICY.betweenDrawersGapM,
  stackCount: INTERNAL_DRAWER_LAYOUT_POLICY.stackCount,
  openOffsetZM: INTERNAL_DRAWER_MOTION_POLICY.openOffsetZM,
  contentsBottomInsetM: INTERNAL_DRAWER_CONTENTS_POLICY.contentsBottomInsetM,
  contentsWidthClearanceM: INTERNAL_DRAWER_CONTENTS_POLICY.contentsWidthClearanceM,
  contentsHeightClearanceM: INTERNAL_DRAWER_CONTENTS_POLICY.contentsHeightClearanceM,
});
