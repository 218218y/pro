// Corner connector shell / carcass helpers.
//
// Own the pentagon shell boards, plinth/legs, and wall/attachment panels so
// the canonical connector owner can stay focused on orchestration.

import type { CornerConnectorSetup } from './corner_connector_emit_shared.js';
import {
  createCornerConnectorShellMetrics,
  type CornerConnectorShellResult,
} from './corner_connector_emit_shell_metrics.js';
import { applyCornerConnectorShellBase } from './corner_connector_emit_shell_base.js';
import { applyCornerConnectorShellPanels } from './corner_connector_emit_shell_panels.js';

export function buildCornerConnectorShell(setup: CornerConnectorSetup): CornerConnectorShellResult {
  const metrics = createCornerConnectorShellMetrics(setup);
  applyCornerConnectorShellBase(setup, metrics);
  const addEdgePanel = applyCornerConnectorShellPanels(setup, metrics);

  return {
    panelThick: metrics.panelThick,
    backPanelThick: metrics.backPanelThick,
    backPanelOutsideInsetZ: metrics.backPanelOutsideInsetZ,
    addEdgePanel,
  };
}
