import { CARCASS_SHELL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
    __wingBackPanelThick: CARCASS_SHELL_DIMENSIONS.backPanelThicknessM,
    __wingBackPanelCenterZ: -wingD + CARCASS_SHELL_DIMENSIONS.backPanelZM,
    __carcassBackInsetZ: CARCASS_SHELL_DIMENSIONS.backInsetZM,
    __carcassFrontInsetZ: CARCASS_SHELL_DIMENSIONS.frontInsetZM,
    __wallZHalfInset: CARCASS_SHELL_DIMENSIONS.backInsetZM / 2,
    __horizZOffset: (CARCASS_SHELL_DIMENSIONS.backInsetZM - CARCASS_SHELL_DIMENSIONS.frontInsetZM) / 2,
  };
}

export function resolveCornerWingHorizPlacement(
  params: CornerWingCarcassFlowParams,
  metrics: CornerWingCarcassShellMetrics,
  baseDepth: number,
  minDepth = CARCASS_SHELL_DIMENSIONS.bodyMinDepthM
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
  minDepth = CARCASS_SHELL_DIMENSIONS.bodyMinDepthM
): CornerWingShellPlacement {
  const { wingD } = params.ctx;
  const d0 = Number.isFinite(baseDepth) && baseDepth > 0 ? baseDepth : wingD;
  const depth = Math.max(minDepth, d0 - metrics.__carcassBackInsetZ);
  const z = -wingD + d0 / 2 + metrics.__wallZHalfInset;
  return { z, depth };
}
