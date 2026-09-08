import type { AppContainer } from '../../../types';
import { buildCornerCellDimsContext } from './canvas_picking_cell_dims_corner_context.js';
import { createCornerCellWidthDistribution } from './canvas_picking_cell_dims_corner_cell_width_distribution.js';
import { resolveCornerCellWidthSelectionState } from './canvas_picking_cell_dims_corner_cell_width_selection.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { findModuleSelectorObject } from './canvas_picking_module_selector_hits.js';
import { resolveCellDimsTargetBox } from './canvas_picking_hover_preview_modes_cell_dims_target.js';
import { readLinearCellDimsLayoutState } from './canvas_picking_hover_preview_modes_cell_dims_inputs.js';
import type {
  InteriorHoverTarget,
  MeasureObjectLocalBoxFn,
  SelectorLocalBox,
} from './canvas_picking_hover_preview_modes_shared.js';
import type {
  CellDimsLayoutPreviewBox,
  CellDimsLayoutPreviewPlan,
} from './canvas_picking_hover_preview_modes_cell_dims_layout.js';

function readCornerCellIndex(moduleKey: InteriorHoverTarget['hitModuleKey']): number | null {
  if (typeof moduleKey !== 'string' || !moduleKey.startsWith('corner:')) return null;
  const index = Number(moduleKey.slice('corner:'.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function readAnchorParent(target: InteriorHoverTarget): unknown {
  const selector = target.hitSelectorObj as ({ parent?: unknown } & object) | null;
  return selector?.parent ?? null;
}

function createCornerPreviewBox(args: {
  sourceBox: SelectorLocalBox;
  x: number;
  widthM: number;
  selected: boolean;
  doorCount: number;
  minWidthM: number;
  minHeightM: number;
  minDepthM: number;
  widthClearanceM: number;
  heightClearanceM: number;
}): CellDimsLayoutPreviewBox {
  const {
    sourceBox,
    x,
    widthM,
    selected,
    doorCount,
    minWidthM,
    minHeightM,
    minDepthM,
    widthClearanceM,
    heightClearanceM,
  } = args;
  return {
    x,
    y: Number(sourceBox.centerY),
    z: Number(sourceBox.centerZ),
    w: Math.max(minWidthM, widthM - widthClearanceM),
    boxH: Math.max(minHeightM, Number(sourceBox.height) - heightClearanceM),
    d: Math.max(minDepthM, Number(sourceBox.depth)),
    selected,
    doorCount: Math.max(1, Math.round(doorCount) || 1),
  };
}

/**
 * Resolve the future per-cell corner-wing silhouette in the wing group's local space.
 *
 * The corner commit owners remain authoritative for width redistribution/toggle-back.
 * Keeping the preview group attached to the wing group preserves its rotation/mirroring
 * while isolating only that wing; the main cabinet and the other stack remain untouched.
 */
export function resolveCornerCellDimsLayoutPreview(args: {
  App: AppContainer;
  target: InteriorHoverTarget;
  applyW: number | null | undefined;
  applyH: number | null | undefined;
  applyD: number | null | undefined;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
  matchToleranceCm: number;
  minWidthM: number;
  minHeightM: number;
  minDepthM: number;
  widthClearanceM: number;
  heightClearanceM: number;
}): CellDimsLayoutPreviewPlan | null {
  const {
    App,
    target,
    applyW,
    applyH,
    applyD,
    measureObjectLocalBox,
    matchToleranceCm,
    minWidthM,
    minHeightM,
    minDepthM,
    widthClearanceM,
    heightClearanceM,
  } = args;
  const cellIndex = readCornerCellIndex(target.hitModuleKey);
  if (cellIndex == null) return null;

  const layoutState = readLinearCellDimsLayoutState(App);
  if (!layoutState) return null;
  const { ui, cfg } = layoutState;
  const raw = ui.raw ?? {};
  const cornerCtx = buildCornerCellDimsContext({
    App,
    ui,
    cfg,
    raw,
    applyW: applyW ?? null,
    applyH: target.isBottom ? null : (applyH ?? null),
    applyD: applyD ?? null,
    foundModuleIndex: target.hitModuleKey,
    foundPartId: null,
    isBottomStack: target.isBottom,
    ensureCornerCellConfigRef: () => null,
  });
  if (!cornerCtx.isPerCellWing || cornerCtx.cellIdx !== cellIndex) return null;

  const distribution = createCornerCellWidthDistribution(cornerCtx);
  if (distribution.cellCount < 1 || cellIndex >= distribution.cellCount) return null;
  const selection = resolveCornerCellWidthSelectionState(cornerCtx, distribution);
  if (!selection || !selection.hasAnyEffect || selection.widthsNext.length !== distribution.cellCount) {
    return null;
  }

  const anchorParent = readAnchorParent(target);
  if (!anchorParent) return null;
  const stackKey = target.isBottom ? 'bottom' : 'top';
  const selectorBoxes: SelectorLocalBox[] = [];
  for (let i = 0; i < distribution.cellCount; i += 1) {
    const selector = findModuleSelectorObject({
      root: anchorParent,
      moduleKey: `corner:${i}`,
      stackKey,
      toModuleKey: __wp_toModuleKey,
    });
    if (!selector) return null;
    const box = measureObjectLocalBox(App, selector, anchorParent);
    if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return null;
    selectorBoxes.push(box);
  }

  const selectedCurrentBox = selectorBoxes[cellIndex];
  const firstCurrentBox = selectorBoxes[0];
  const firstCurrentWidthCm = distribution.widthsCurr[0];
  if (!selectedCurrentBox || !firstCurrentBox || !(Number(firstCurrentWidthCm) > 0)) return null;

  const selectedFutureBox = resolveCellDimsTargetBox(
    App,
    target,
    selectedCurrentBox,
    applyW,
    target.isBottom ? null : applyH,
    applyD,
    matchToleranceCm,
    minWidthM,
    minHeightM,
    minDepthM
  );

  let cursorX = Number(firstCurrentBox.centerX) - Number(firstCurrentWidthCm) / 200;
  const boxes: CellDimsLayoutPreviewBox[] = [];
  let selectedBox: CellDimsLayoutPreviewBox | null = null;

  for (let i = 0; i < distribution.cellCount; i += 1) {
    const widthCm = Number(selection.widthsNext[i]);
    const currentBox = selectorBoxes[i];
    if (!(widthCm > 0) || !currentBox) return null;
    const widthM = widthCm / 100;
    const sourceBox = i === cellIndex ? selectedFutureBox : currentBox;
    const previewBox = createCornerPreviewBox({
      sourceBox,
      x: cursorX + widthM / 2,
      widthM,
      selected: i === cellIndex,
      doorCount: distribution.doorsInCell[i] ?? 1,
      minWidthM,
      minHeightM,
      minDepthM,
      widthClearanceM,
      heightClearanceM,
    });
    boxes.push(previewBox);
    if (i === cellIndex) selectedBox = previewBox;
    cursorX += widthM;
  }

  if (!selectedBox || boxes.length < 1) return null;
  return {
    anchor: target.hitSelectorObj,
    anchorParent,
    selectedBox,
    boxes,
    isolateStackKey: null,
  };
}
