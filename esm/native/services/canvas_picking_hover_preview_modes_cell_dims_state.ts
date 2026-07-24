import type { AppContainer, UnknownRecord } from '../../../types';
import { getCfg } from '../kernel/api.js';
import {
  readCornerConfigurationCellForStack,
  readCornerConfigurationSnapshotForStack,
} from '../features/modules_configuration/corner_cells_api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type { CellDimsPreviewSpecialDims } from './canvas_picking_hover_preview_modes_cell_dims_contracts.js';
import type { InteriorHoverTarget } from './canvas_picking_hover_preview_modes_shared.js';
import { __asNum, __hasOwnFiniteValue, __readRecord } from './canvas_picking_hover_preview_modes_shared.js';

export type ResolvedCellDimsPreviewState = {
  currentWcm: number;
  currentHcm: number;
  currentDcm: number;
  currentBottomYm: number;
  targetWcm: number;
  targetHcm: number;
  targetDcm: number;
};

export function readCellDimsSpecialDims(
  App: AppContainer,
  target: InteriorHoverTarget
): CellDimsPreviewSpecialDims {
  try {
    const cfg = __readRecord(getCfg(App));
    if (typeof target.hitModuleKey === 'number') {
      const bucket = target.isBottom ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
      const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
      const mod = __readRecord(list[target.hitModuleKey]);
      const sd = __readRecord(mod?.specialDims);
      return { widthSd: sd, heightDepthSd: sd };
    }

    const cc = __readRecord(readCornerConfigurationSnapshotForStack(cfg, target.isBottom ? 'bottom' : 'top'));
    const sharedSd = __readRecord(cc?.specialDims);
    const connectorSd = __readRecord(cc?.connectorSpecialDims);

    if (target.hitModuleKey === 'corner') {
      return { widthSd: connectorSd || sharedSd, heightDepthSd: sharedSd };
    }

    if (typeof target.hitModuleKey === 'string' && target.hitModuleKey.startsWith('corner:')) {
      const idx = Math.max(0, Math.floor(__asNum(target.hitModuleKey.slice('corner:'.length), 0)));
      const mod = __readRecord(
        readCornerConfigurationCellForStack(cfg, target.isBottom ? 'bottom' : 'top', idx)
      );
      const cellSd = __readRecord(mod?.specialDims);
      const widthSd = hasCompleteCellDimsOverride(cellSd, ['baseWidthCm']) ? cellSd : sharedSd;
      const heightDepthSd = hasCompleteCellDimsOverride(cellSd, ['baseHeightCm', 'baseDepthCm'])
        ? cellSd
        : sharedSd;
      return { widthSd, heightDepthSd };
    }
  } catch {
    // ignore
  }
  return { widthSd: null, heightDepthSd: null };
}

function hasCompleteCellDimsOverride(specialDims: UnknownRecord | null, baseKeys: string[]): boolean {
  if (!specialDims) return false;
  for (let i = 0; i < baseKeys.length; i += 1) {
    if (__hasOwnFiniteValue(specialDims, baseKeys[i])) return true;
  }
  return false;
}

function readPreviewBaseValueCm(
  specialDims: UnknownRecord | null,
  currentValueCm: number,
  baseKey: string,
  activeKey: string,
  matchToleranceCm: number
): { baseCm: number; activeCm: number; hasActive: boolean } {
  const baseCm = __hasOwnFiniteValue(specialDims, baseKey)
    ? __asNum(specialDims && specialDims[baseKey], currentValueCm)
    : currentValueCm;
  const activeCm = __hasOwnFiniteValue(specialDims, activeKey)
    ? __asNum(specialDims && specialDims[activeKey], currentValueCm)
    : currentValueCm;
  const hasActive = !!(
    specialDims &&
    (__hasOwnFiniteValue(specialDims, activeKey) || Math.abs(activeCm - baseCm) > matchToleranceCm)
  );
  return { baseCm, activeCm, hasActive };
}

export function resolveCellDimsPreviewState(args: {
  currentWcm: number;
  currentTopAbsCm: number;
  currentDcm: number;
  currentBottomYm: number;
  widthSd: UnknownRecord | null;
  heightDepthSd: UnknownRecord | null;
  applyW: number | null | undefined;
  applyH: number | null | undefined;
  applyD: number | null | undefined;
  matchToleranceCm: number;
}): ResolvedCellDimsPreviewState {
  const {
    currentWcm,
    currentTopAbsCm,
    currentDcm,
    currentBottomYm,
    widthSd,
    heightDepthSd,
    applyW,
    applyH,
    applyD,
    matchToleranceCm,
  } = args;
  const EPS_CM = matchToleranceCm;
  const currentHcm = currentTopAbsCm;

  const widthState = readPreviewBaseValueCm(widthSd, currentWcm, 'baseWidthCm', 'widthCm', matchToleranceCm);
  const heightState = readPreviewBaseValueCm(
    heightDepthSd,
    currentHcm,
    'baseHeightCm',
    'heightCm',
    matchToleranceCm
  );
  const depthState = readPreviewBaseValueCm(
    heightDepthSd,
    currentDcm,
    'baseDepthCm',
    'depthCm',
    matchToleranceCm
  );

  const matchesTargetW = applyW == null ? true : Math.abs(currentWcm - applyW) <= EPS_CM;
  const matchesTargetH = applyH == null ? true : Math.abs(currentHcm - applyH) <= EPS_CM;
  const matchesTargetD = applyD == null ? true : Math.abs(currentDcm - applyD) <= EPS_CM;

  const willChangeW = applyW != null && !matchesTargetW;
  const willChangeH = applyH != null && !matchesTargetH;
  const willChangeD = applyD != null && !matchesTargetD;
  const hasAnyNewChange = willChangeW || willChangeH || willChangeD;

  let targetWcm = applyW != null ? applyW : currentWcm;
  let targetHcm = applyH != null ? applyH : currentHcm;
  let targetDcm = applyD != null ? applyD : currentDcm;

  if (applyW != null && widthState.hasActive && matchesTargetW && !hasAnyNewChange)
    targetWcm = widthState.baseCm;
  if (applyH != null && heightState.hasActive && matchesTargetH && !hasAnyNewChange)
    targetHcm = heightState.baseCm;
  if (applyD != null && depthState.hasActive && matchesTargetD && !hasAnyNewChange)
    targetDcm = depthState.baseCm;

  return {
    currentWcm,
    currentHcm,
    currentDcm,
    currentBottomYm,
    targetWcm,
    targetHcm,
    targetDcm,
  };
}
