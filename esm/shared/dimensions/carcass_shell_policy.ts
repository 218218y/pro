import { CARCASS_INTERIOR_GRID_POLICY } from './carcass_interior_grid_policy.js';
import { meters } from './units.js';

export const CARCASS_SHELL_DIMENSIONS = Object.freeze({
  frontInsetZM: meters(0.005),
  backInsetZM: meters(0.0078),
  boardMinDimensionM: meters(0.001),
  boardMinDepthM: meters(0.02),
  bodyMinDepthM: meters(0.05),
  bodyMinHeightM: meters(0.05),
  floorCeilWidthClearanceM: meters(0.001),
  backPanelWidthClearanceM: meters(0.002),
  backPanelSegmentWidthClearanceM: meters(0.002),
  backPanelThicknessM: meters(0.005),
  backPanelZM: meters(0.005),
  sideDepthClearanceM: meters(0.0078),
  sideZOffsetM: meters(0.0039),
  internalBackInsetM: meters(0.005),
  drawerGridDivisions: CARCASS_INTERIOR_GRID_POLICY.divisions,
  drawerSplitGridLineIndex: CARCASS_INTERIOR_GRID_POLICY.drawerSplitLineIndex,
});
