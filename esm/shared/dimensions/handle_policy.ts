import {
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
  EXTERNAL_DRAWER_SIZE_POLICY,
} from './external_drawer_policy.js';
import { meters } from './units.js';

export const EDGE_HANDLE_SIZE_POLICY = Object.freeze({
  shortLengthM: meters(0.2),
  longLengthM: meters(0.4),
  minLengthM: meters(0.1),
  drawerWidthClearanceM: meters(0.04),
});

export const EDGE_HANDLE_PROFILE_RENDER_POLICY = Object.freeze({
  metalThicknessM: meters(0.0015),
  backFlangeInsetM: meters(0.017),
  gripInsetM: meters(0.012),
  gripProjectionM: meters(0.023),
  slidingGripProjectionM: meters(0.005),
  nominalFrontThicknessM: EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM,
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
  shortDrawerStandardYOffsetM: meters(0.02),
  shortDrawerHeightThresholdM: meters(0.21),
  absYClampMinHeightM: meters(0.05),
  absYClampPaddingMinM: meters(0.02),
  absYClampPaddingMaxM: meters(0.1),
  absYClampPaddingHeightRatio: 0.2,
});
