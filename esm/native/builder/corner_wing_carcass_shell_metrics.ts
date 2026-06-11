import type { CornerCell } from './corner_geometry_plan.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';

export type CornerWingCarcassShellMetrics = {
  __wingIsUnifiedCabinet: boolean;
  __wingBackPanelThick: number;
  __wingBackPanelCenterZ: number;
  __carcassBackInsetZ: number;
  __carcassFrontInsetZ: number;
  __wallZHalfInset: number;
  __horizZOffset: number;
};

export type CornerWingShellPlacement = {
  z: number;
  depth: number;
};

export function createCornerWingCarcassShellMetrics(
  params: CornerWingCarcassFlowParams
): CornerWingCarcassShellMetrics {
  const { wingD } = params.ctx;
  const { cornerCells } = params.locals;
  const { asRecord } = params.helpers;

  return {
    __wingIsUnifiedCabinet:
      cornerCells.length > 1 &&
      cornerCells.every((c: CornerCell) => {
        const r = asRecord(c);
        return !r['__hasActiveSpecialDims'] && !r['__hasActiveDepth'] && !r['__hasActiveHeight'];
      }),
    __wingBackPanelThick: 0.005,
    __wingBackPanelCenterZ: -wingD + 0.005,
    __carcassBackInsetZ: 0.0078,
    __carcassFrontInsetZ: 0.005,
    __wallZHalfInset: 0.0078 / 2,
    __horizZOffset: (0.0078 - 0.005) / 2,
  };
}

export function resolveCornerWingHorizPlacement(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics,
  baseDepth: number,
  minDepth = 0.05
): CornerWingShellPlacement {
  const { wingD } = params.ctx;
  const d0 = Number.isFinite(baseDepth) && baseDepth > 0 ? baseDepth : wingD;
  const depth = Math.max(minDepth, d0 - (metrics.__carcassBackInsetZ + metrics.__carcassFrontInsetZ));
  const z = -wingD + d0 / 2 + metrics.__horizZOffset;
  return { z, depth };
}

export function resolveCornerWingWallPlacement(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics,
  baseDepth: number,
  minDepth = 0.05
): CornerWingShellPlacement {
  const { wingD } = params.ctx;
  const d0 = Number.isFinite(baseDepth) && baseDepth > 0 ? baseDepth : wingD;
  const depth = Math.max(minDepth, d0 - metrics.__carcassBackInsetZ);
  const z = -wingD + d0 / 2 + metrics.__wallZHalfInset;
  return { z, depth };
}
