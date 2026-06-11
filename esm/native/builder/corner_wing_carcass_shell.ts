import {
  type CornerWingCarcassFlowParams,
  type CornerWingCarcassResult,
} from './corner_wing_carcass_shared.js';
import { applyCornerWingCarcassFloorAndBase } from './corner_wing_carcass_shell_floor_base.js';
import { createCornerWingCarcassShellMetrics } from './corner_wing_carcass_shell_metrics.js';
import { applyCornerWingCarcassPanels } from './corner_wing_carcass_shell_panels.js';
import { applyCornerWingCarcassDividers } from './corner_wing_carcass_shell_dividers.js';
import { applyCornerWingCarcassCeiling } from './corner_wing_carcass_shell_ceiling.js';

export function applyCornerWingCarcassShell(params: CornerWingCarcassFlowParams): CornerWingCarcassResult {
  const metrics = createCornerWingCarcassShellMetrics(params);

  applyCornerWingCarcassFloorAndBase(params, metrics);
  applyCornerWingCarcassPanels(params, metrics);
  applyCornerWingCarcassDividers(params, metrics);
  applyCornerWingCarcassCeiling(params, metrics);

  return {
    __wingBackPanelThick: metrics.__wingBackPanelThick,
    __wingBackPanelCenterZ: metrics.__wingBackPanelCenterZ,
  };
}
