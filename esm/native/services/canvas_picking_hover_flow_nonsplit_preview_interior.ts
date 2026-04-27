import {
  tryHandleCellDimsHoverPreview,
  tryHandleDrawerDividerHoverPreview,
  tryHandleExtDrawersHoverPreview,
} from './canvas_picking_hover_preview_modes.js';
import {
  tryHandleCanvasIntDrawerHover,
  tryHandleCanvasLayoutFamilyHover,
} from './canvas_picking_interior_hover_flow.js';
import {
  __wp_estimateVisibleModuleFrontZ,
  __wp_measureObjectLocalBox,
  __wp_readInteriorModuleConfigRef,
  __wp_resolveDrawerHoverPreviewTarget,
  __wp_resolveInteriorHoverTarget,
} from './canvas_picking_local_helpers.js';
import { __wp_ui } from './canvas_picking_core_helpers.js';
import { __wp_getCellDimsHoverOp, __wp_readCellDimsDraft } from './canvas_picking_local_helpers_cell_dims.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export type NonSplitInteriorPreviewDeps = {
  tryHandleCanvasIntDrawerHover: typeof tryHandleCanvasIntDrawerHover;
  tryHandleExtDrawersHoverPreview: typeof tryHandleExtDrawersHoverPreview;
  tryHandleDrawerDividerHoverPreview: typeof tryHandleDrawerDividerHoverPreview;
  tryHandleCanvasLayoutFamilyHover: typeof tryHandleCanvasLayoutFamilyHover;
  tryHandleCellDimsHoverPreview: typeof tryHandleCellDimsHoverPreview;
};

const DEFAULT_NON_SPLIT_INTERIOR_PREVIEW_DEPS: NonSplitInteriorPreviewDeps = {
  tryHandleCanvasIntDrawerHover,
  tryHandleExtDrawersHoverPreview,
  tryHandleDrawerDividerHoverPreview,
  tryHandleCanvasLayoutFamilyHover,
  tryHandleCellDimsHoverPreview,
};

export function tryHandleCanvasNonSplitInteriorPreviewRoutes(
  args: HandleCanvasNonSplitHoverArgs,
  deps: NonSplitInteriorPreviewDeps = DEFAULT_NON_SPLIT_INTERIOR_PREVIEW_DEPS
): boolean {
  const {
    App,
    ndcX,
    ndcY,
    primaryMode,
    isExtDrawerEditMode,
    isDividerEditMode,
    isCellDimsMode,
    raycaster,
    mouse,
    previewRo,
    hideLayoutPreview,
    hideSketchPreview,
    setLayoutPreview,
  } = args;

  if (
    deps.tryHandleCanvasIntDrawerHover({
      App,
      ndcX,
      ndcY,
      primaryMode,
      raycaster,
      mouse,
      previewRo: previewRo || null,
      hideLayoutPreview,
      hideSketchPreview,
      setLayoutPreview,
    })
  ) {
    return true;
  }

  if (
    deps.tryHandleExtDrawersHoverPreview({
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      isExtDrawerEditMode,
      readUi: __wp_ui,
      resolveInteriorHoverTarget: __wp_resolveInteriorHoverTarget,
      measureObjectLocalBox: __wp_measureObjectLocalBox,
      readInteriorModuleConfigRef: __wp_readInteriorModuleConfigRef,
    })
  ) {
    return true;
  }

  if (
    deps.tryHandleDrawerDividerHoverPreview({
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      isDividerEditMode,
      resolveDrawerHoverPreviewTarget: __wp_resolveDrawerHoverPreviewTarget,
    })
  ) {
    return true;
  }

  if (
    deps.tryHandleCanvasLayoutFamilyHover({
      App,
      ndcX,
      ndcY,
      primaryMode,
      raycaster,
      mouse,
      previewRo: previewRo || null,
      hideLayoutPreview,
      hideSketchPreview,
      setLayoutPreview,
    })
  ) {
    return true;
  }

  if (
    deps.tryHandleCellDimsHoverPreview({
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      hideSketchPreview,
      isCellDimsMode,
      previewRo,
      resolveInteriorHoverTarget: __wp_resolveInteriorHoverTarget,
      measureObjectLocalBox: __wp_measureObjectLocalBox,
      readCellDimsDraft: __wp_readCellDimsDraft,
      estimateVisibleModuleFrontZ: __wp_estimateVisibleModuleFrontZ,
      getCellDimsHoverOp: __wp_getCellDimsHoverOp,
    })
  ) {
    return true;
  }

  return false;
}
