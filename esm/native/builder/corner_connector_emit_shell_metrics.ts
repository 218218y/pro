import { CORNER_CONNECTOR_SHELL_POLICY } from '../../shared/dimensions/corner_system_policy.js';
import { cloneMaybe, asRecord, isRecord } from './corner_geometry_plan.js';

import type { AddEdgePanelFn, CornerConnectorSetup } from './corner_connector_emit_shared.js';

export type CornerConnectorShellMetrics = {
  panelThick: number;
  backPanelThick: number;
  wallH: number;
  backWallH: number;
  backPanelOutsideInsetX: number;
  backPanelOutsideInsetZ: number;
  backPanelMaterialArrayNoPO: unknown[];
};

export type CornerConnectorShellResult = {
  panelThick: number;
  backPanelThick: number;
  backPanelOutsideInsetZ: number;
  addEdgePanel: AddEdgePanelFn;
};

export function createCornerConnectorShellMetrics(setup: CornerConnectorSetup): CornerConnectorShellMetrics {
  const {
    ctx: { woodThick, wingH, backPanelMaterialArray },
  } = setup;

  const backPanelMaterialArrayNoPO = backPanelMaterialArray.map((material: unknown) => {
    const clone = cloneMaybe(material);
    const rec = isRecord(clone) ? asRecord(clone) : null;
    if (rec) {
      rec.polygonOffset = false;
      rec.polygonOffsetFactor = 0;
      rec.polygonOffsetUnits = 0;
    }
    return clone;
  });

  return {
    panelThick: woodThick,
    backPanelThick: CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelThicknessM,
    wallH: Math.max(
      CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM,
      wingH - CORNER_CONNECTOR_SHELL_POLICY.shellWallHeightClearanceM
    ),
    backWallH: Math.max(CORNER_CONNECTOR_SHELL_POLICY.shellMinWallHeightM, wingH),
    backPanelOutsideInsetX: CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelOutsideInsetM,
    backPanelOutsideInsetZ: CORNER_CONNECTOR_SHELL_POLICY.shellBackPanelOutsideInsetM,
    backPanelMaterialArrayNoPO,
  };
}
