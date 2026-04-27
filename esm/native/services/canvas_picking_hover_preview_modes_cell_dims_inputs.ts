import type { AppContainer } from '../../../types';
import { getCfg } from '../kernel/api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type { CellDimsCurrentHeightInput } from './canvas_picking_hover_preview_modes_cell_dims_contracts.js';
import type { InteriorHoverTarget, SelectorLocalBox } from './canvas_picking_hover_preview_modes_shared.js';
import { __readRecord } from './canvas_picking_hover_preview_modes_shared.js';

export function readLinearSelectorBoundaryInsetsCm(
  App: AppContainer,
  target: InteriorHoverTarget
): { leftCm: number; rightCm: number } | null {
  if (typeof target.hitModuleKey !== 'number') return null;
  try {
    const cfg = __readRecord(getCfg(App));
    const bucket = target.isBottom ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
    const count =
      Array.isArray(list) && list.length > 0 ? list.length : Math.max(1, Math.floor(target.hitModuleKey) + 1);
    const idx = Math.max(0, Math.floor(target.hitModuleKey));
    const woodCm = Math.max(0, Number(target.woodThick) * 100);
    return {
      leftCm: idx === 0 ? woodCm : woodCm / 2,
      rightCm: idx >= count - 1 ? woodCm : woodCm / 2,
    };
  } catch {
    return null;
  }
}

export function readCellDimsCurrentWidthInputCm(
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: SelectorLocalBox
): number {
  const currentSelectorWcm = Math.max(0, Number(selectorBox.width) * 100);
  const boundary = readLinearSelectorBoundaryInsetsCm(App, target);
  if (!boundary) return currentSelectorWcm;
  return currentSelectorWcm + Math.max(0, Number(boundary.leftCm)) + Math.max(0, Number(boundary.rightCm));
}

export function toCellDimsPreviewWidthM(
  App: AppContainer,
  target: InteriorHoverTarget,
  targetWidthInputCm: number
): number {
  const boundary = readLinearSelectorBoundaryInsetsCm(App, target);
  if (!boundary) return Math.max(0.03, Math.max(0, targetWidthInputCm) / 100);
  const internalCm =
    Math.max(0, targetWidthInputCm) -
    Math.max(0, Number(boundary.leftCm)) -
    Math.max(0, Number(boundary.rightCm));
  return Math.max(0.03, internalCm / 100);
}

export function readCellDimsCurrentHeightInputCm(selectorBox: SelectorLocalBox): CellDimsCurrentHeightInput {
  const currentBottomYm = Number(selectorBox.centerY) - Number(selectorBox.height) / 2;
  const currentTopAbsCm = Math.max(0, (currentBottomYm + Number(selectorBox.height)) * 100);
  return { currentBottomYm, currentTopAbsCm };
}

export function toCellDimsPreviewHeightM(currentBottomYm: number, targetTopAbsCm: number): number {
  const targetTopYm = Math.max(0, targetTopAbsCm) / 100;
  return Math.max(0.03, targetTopYm - Number(currentBottomYm));
}
