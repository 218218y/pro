import type { AppContainer } from '../../../types';
import type { CellDimsPreviewTargetBox } from './canvas_picking_hover_preview_modes_cell_dims_contracts.js';
import {
  readCellDimsCurrentHeightInputCm,
  readCellDimsCurrentWidthInputCm,
  toCellDimsPreviewHeightM,
  toCellDimsPreviewWidthM,
} from './canvas_picking_hover_preview_modes_cell_dims_inputs.js';
import {
  readCellDimsSpecialDims,
  resolveCellDimsPreviewState,
} from './canvas_picking_hover_preview_modes_cell_dims_state.js';
import type { InteriorHoverTarget, SelectorLocalBox } from './canvas_picking_hover_preview_modes_shared.js';

export function resolveCellDimsTargetBox(
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: SelectorLocalBox,
  applyW: number | null | undefined,
  applyH: number | null | undefined,
  applyD: number | null | undefined
): CellDimsPreviewTargetBox {
  const currentWcm = readCellDimsCurrentWidthInputCm(App, target, selectorBox);
  const { currentBottomYm, currentTopAbsCm } = readCellDimsCurrentHeightInputCm(selectorBox);
  const currentDcm = Math.max(0, Number(selectorBox.depth) * 100);
  const { widthSd, heightDepthSd } = readCellDimsSpecialDims(App, target);
  const previewState = resolveCellDimsPreviewState({
    currentWcm,
    currentTopAbsCm,
    currentDcm,
    currentBottomYm,
    widthSd,
    heightDepthSd,
    applyW,
    applyH,
    applyD,
  });

  const currentMinX = Number(selectorBox.centerX) - Number(selectorBox.width) / 2;
  const currentBackZ = Number(selectorBox.centerZ) - Number(selectorBox.depth) / 2;

  const targetWm = toCellDimsPreviewWidthM(App, target, previewState.targetWcm);
  const targetHm = toCellDimsPreviewHeightM(previewState.currentBottomYm, previewState.targetHcm);
  const targetDm = Math.max(0.024, previewState.targetDcm / 100);

  return {
    centerX: currentMinX + targetWm / 2,
    centerY: currentBottomYm + targetHm / 2,
    centerZ: currentBackZ + targetDm / 2,
    width: targetWm,
    height: targetHm,
    depth: targetDm,
  };
}
