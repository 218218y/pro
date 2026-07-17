import { CARCASS_SHELL_DIMENSIONS } from './carcass_shell_policy.js';
import { meters } from './units.js';

export const CARCASS_INTERIOR_DIMENSIONS = Object.freeze({
  minTopBodyHeightM: CARCASS_SHELL_DIMENSIONS.bodyMinHeightM,
  slidingDepthReductionM: meters(0.12),
  hingedDepthReductionM: meters(0.03),
  internalBackInsetM: CARCASS_SHELL_DIMENSIONS.internalBackInsetM,
});
