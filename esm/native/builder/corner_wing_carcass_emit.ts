// Corner wing carcass emission owner.
//
// Keep the public seam focused on orchestration while dedicated modules own the
// heavy shell geometry and selector/grid-map follow-up.

import {
  type CornerWingCarcassFlowParams,
  type CornerWingCarcassResult,
} from './corner_wing_carcass_shared.js';
import { applyCornerWingCarcassShell } from './corner_wing_carcass_shell.js';
import { applyCornerWingCarcassSelectors } from './corner_wing_carcass_selectors.js';

export function applyCornerWingCarcass(params: CornerWingCarcassFlowParams): CornerWingCarcassResult {
  const result = applyCornerWingCarcassShell(params);
  applyCornerWingCarcassSelectors(params);
  return result;
}
