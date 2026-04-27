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
    backPanelThick: 0.005,
    wallH: Math.max(0.05, wingH - 0.002),
    backWallH: Math.max(0.05, wingH),
    backPanelOutsideInsetX: 0.0025,
    backPanelOutsideInsetZ: 0.0025,
    backPanelMaterialArrayNoPO,
  };
}
