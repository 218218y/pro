import type { AppContainer } from '../../../types';
import { buildCanvasLinearCellDimsGeometryContext } from './canvas_picking_cell_dims_linear_context.js';
import { resolveLinearCellDimsFutureWidths } from './canvas_picking_cell_dims_linear_width.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { findModuleSelectorObject } from './canvas_picking_module_selector_hits.js';
import { resolveCellDimsTargetBox } from './canvas_picking_hover_preview_modes_cell_dims_target.js';
import { readLinearCellDimsLayoutState } from './canvas_picking_hover_preview_modes_cell_dims_inputs.js';
import { __wp_getViewportRoots } from './canvas_picking_projection_runtime.js';
import type {
  InteriorHoverTarget,
  MeasureObjectLocalBoxFn,
  SelectorLocalBox,
} from './canvas_picking_hover_preview_modes_shared.js';

export type CellDimsLayoutPreviewBox = {
  x: number;
  y: number;
  z: number;
  w: number;
  boxH: number;
  d: number;
  selected: boolean;
  doorCount: number;
};

export type CellDimsLayoutPreviewPlan = {
  anchor: unknown;
  anchorParent: unknown;
  selectedBox: CellDimsLayoutPreviewBox;
  boxes: CellDimsLayoutPreviewBox[];
};

function readFutureInternalWidthM(args: {
  segmentWidthCm: number;
  index: number;
  count: number;
  woodThickM: number;
}): number {
  const { segmentWidthCm, index, count, woodThickM } = args;
  const leftBoundaryM = index === 0 ? woodThickM : woodThickM / 2;
  const rightBoundaryM = index === count - 1 ? woodThickM : woodThickM / 2;
  return Math.max(0, segmentWidthCm / 100 - leftBoundaryM - rightBoundaryM);
}

function createPreviewBox(args: {
  box: SelectorLocalBox;
  x: number;
  w: number;
  selected: boolean;
  doorCount: number;
  minWidthM: number;
  minHeightM: number;
  minDepthM: number;
  widthClearanceM: number;
  heightClearanceM: number;
}): CellDimsLayoutPreviewBox {
  const {
    box,
    x,
    w,
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
    y: Number(box.centerY),
    z: Number(box.centerZ),
    w: Math.max(minWidthM, w - widthClearanceM),
    boxH: Math.max(minHeightM, Number(box.height) - heightClearanceM),
    d: Math.max(minDepthM, Number(box.depth)),
    selected,
    doorCount,
  };
}

/**
 * Resolve the complete future linear-cell silhouette in wardrobe-root coordinates.
 *
 * Widths come from the same linear cell-dims width policy used by commit. Current
 * selector geometry supplies vertical/depth envelopes for untouched cells, while
 * the selected cell reuses the canonical cell-dims target-box resolver. This keeps
 * hover and committed geometry aligned without duplicating the builder's width math.
 */
export function resolveLinearCellDimsLayoutPreview(args: {
  App: AppContainer;
  target: InteriorHoverTarget;
  applyW: number | null | undefined;
  applyH: number | null | undefined;
  applyD: number | null | undefined;
  cellDoorCount: 1 | 2 | null | undefined;
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
    cellDoorCount,
    measureObjectLocalBox,
    matchToleranceCm,
    minWidthM,
    minHeightM,
    minDepthM,
    widthClearanceM,
    heightClearanceM,
  } = args;
  if (target.isBottom || typeof target.hitModuleKey !== 'number') return null;

  const layoutState = readLinearCellDimsLayoutState(App);
  if (!layoutState) return null;
  const { ui, cfg } = layoutState;
  const raw = ui.raw ?? {};
  const ctx = buildCanvasLinearCellDimsGeometryContext({
    App,
    foundModuleIndex: target.hitModuleKey,
    isBottomStack: false,
    ui,
    cfg,
    raw,
    applyW: applyW ?? null,
    applyH: applyH ?? null,
    applyD: applyD ?? null,
    cellDoorCount: cellDoorCount ?? null,
  });
  if (!ctx || ctx.moduleCount < 2) return null;

  const wardrobeRoot = __wp_getViewportRoots(App).wardrobeGroup;
  if (!wardrobeRoot) return null;

  const selectorBoxes: SelectorLocalBox[] = [];
  for (let i = 0; i < ctx.moduleCount; i += 1) {
    const selector = findModuleSelectorObject({
      root: wardrobeRoot,
      moduleKey: i,
      stackKey: 'top',
      toModuleKey: __wp_toModuleKey,
    });
    if (!selector) return null;
    const box = measureObjectLocalBox(App, selector, wardrobeRoot);
    if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return null;
    selectorBoxes.push(box);
  }

  const { nextTotalW, nextWidthsCm } = resolveLinearCellDimsFutureWidths(ctx);
  if (!(nextTotalW > 0) || nextWidthsCm.length !== ctx.moduleCount) return null;

  const selectedIndex = ctx.idx;
  const selectedCurrentBox = selectorBoxes[selectedIndex];
  if (!selectedCurrentBox) return null;
  const selectedFutureBox = resolveCellDimsTargetBox(
    App,
    target,
    selectedCurrentBox,
    applyW,
    applyH,
    applyD,
    matchToleranceCm,
    minWidthM,
    minHeightM,
    minDepthM
  );

  const woodThickM = Math.max(0, Number(target.woodThick));
  let currentX = -nextTotalW / 200 + woodThickM;
  const boxes: CellDimsLayoutPreviewBox[] = [];
  let selectedBox: CellDimsLayoutPreviewBox | null = null;

  for (let i = 0; i < ctx.moduleCount; i += 1) {
    const segmentWidthCm = Number(nextWidthsCm[i]);
    if (!(segmentWidthCm > 0)) return null;
    const internalWidthM = readFutureInternalWidthM({
      segmentWidthCm,
      index: i,
      count: ctx.moduleCount,
      woodThickM,
    });
    if (!(internalWidthM > 0)) return null;

    const centerX = currentX + internalWidthM / 2;
    const sourceBox = i === selectedIndex ? selectedFutureBox : selectorBoxes[i];
    if (!sourceBox) return null;
    const previewBox = createPreviewBox({
      box: sourceBox,
      x: centerX,
      w: internalWidthM,
      selected: i === selectedIndex,
      doorCount:
        i === selectedIndex && (cellDoorCount === 1 || cellDoorCount === 2)
          ? cellDoorCount
          : Math.max(1, Math.round(Number(ctx.doorsPerModule[i]) || 1)),
      minWidthM,
      minHeightM,
      minDepthM,
      widthClearanceM,
      heightClearanceM,
    });
    boxes.push(previewBox);
    if (i === selectedIndex) selectedBox = previewBox;

    currentX += internalWidthM + (i < ctx.moduleCount - 1 ? woodThickM : 0);
  }

  if (!selectedBox || boxes.length < 2) return null;
  return {
    anchor: wardrobeRoot,
    anchorParent: wardrobeRoot,
    selectedBox,
    boxes,
  };
}
