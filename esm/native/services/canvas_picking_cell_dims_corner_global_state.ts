import type { UnknownRecord } from '../../../types';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';

export interface CornerGlobalDimsTargetState {
  baseW: number;
  curW: number;
  tgtW: number;
  tgtH: number;
  tgtD: number;
  toggledBackW: boolean;
  toggledBackH: boolean;
  toggledBackD: boolean;
  didToggleBack: boolean;
  isConnectorHit: boolean;
  uiPatch: UnknownRecord;
}

export function resolveCornerGlobalDimsTargetState(ctx: CornerCellDimsContext): CornerGlobalDimsTargetState {
  const {
    applyW,
    applyH,
    applyD,
    isConnectorHit,
    wallLenBase,
    cornerWBase,
    cornerHBase,
    cornerDBase,
    curWallL,
    curWingW,
    curH,
    curD,
  } = ctx;

  const baseW = isConnectorHit ? wallLenBase : cornerWBase;
  const curW = isConnectorHit ? curWallL : curWingW;

  let tgtW = applyW != null ? applyW : curW;
  let tgtH = applyH != null ? applyH : curH;
  let tgtD = applyD != null ? applyD : curD;

  const isCustomW = Number.isFinite(baseW) && baseW > 0 && Math.abs(curW - baseW) > 1e-6;
  const isCustomH = Number.isFinite(cornerHBase) && cornerHBase > 0 && Math.abs(curH - cornerHBase) > 1e-6;
  const isCustomD = Number.isFinite(cornerDBase) && cornerDBase > 0 && Math.abs(curD - cornerDBase) > 1e-6;

  const matchesTargetW = Math.abs(curW - tgtW) < 1e-6;
  const matchesTargetH = Math.abs(curH - tgtH) < 1e-6;
  const matchesTargetD = Math.abs(curD - tgtD) < 1e-6;

  const willChangeW = applyW != null && !matchesTargetW;
  const willChangeH = applyH != null && !matchesTargetH;
  const willChangeD = applyD != null && !matchesTargetD;
  const hasAnyNewChangeThisClick = willChangeW || willChangeH || willChangeD;

  let didToggleBack = false;
  let toggledBackW = false;
  let toggledBackH = false;
  let toggledBackD = false;

  if (applyW != null && isCustomW && matchesTargetW && !hasAnyNewChangeThisClick) {
    tgtW = baseW;
    didToggleBack = true;
    toggledBackW = true;
  }
  if (applyH != null && isCustomH && matchesTargetH && !hasAnyNewChangeThisClick) {
    tgtH = cornerHBase;
    didToggleBack = true;
    toggledBackH = true;
  }
  if (applyD != null && isCustomD && matchesTargetD && !hasAnyNewChangeThisClick) {
    tgtD = cornerDBase;
    didToggleBack = true;
    toggledBackD = true;
  }

  const uiPatch: UnknownRecord = {};
  const rawPatch: UnknownRecord = {};
  if (applyW != null) {
    if (isConnectorHit) {
      uiPatch.cornerCabinetWallLenCm = tgtW;
      uiPatch.cornerCabinetWallLen = tgtW;
    } else {
      uiPatch.cornerWidth = tgtW;
      rawPatch.cornerWidth = tgtW;
    }
  }
  if (applyH != null) uiPatch.cornerHeight = tgtH;
  if (applyD != null) uiPatch.cornerDepth = tgtD;
  if (Object.keys(rawPatch).length) uiPatch.raw = rawPatch;

  return {
    baseW,
    curW,
    tgtW,
    tgtH,
    tgtD,
    toggledBackW,
    toggledBackH,
    toggledBackD,
    didToggleBack,
    isConnectorHit,
    uiPatch,
  };
}
