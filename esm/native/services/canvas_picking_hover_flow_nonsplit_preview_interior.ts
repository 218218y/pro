import {
  tryHandleDrawerDividerHoverPreview,
  tryHandleExtDrawersHoverPreview,
} from './canvas_picking_hover_preview_modes.js';
import { tryHandleCanvasLayoutFamilyHover } from './canvas_picking_interior_hover_flow.js';
import {
  __wp_measureObjectLocalBox,
  __wp_readInteriorModuleConfigRef,
  __wp_resolveDrawerHoverPreviewTarget,
  __wp_resolveInteriorHoverTarget,
} from './canvas_picking_local_helpers.js';
import { __wp_ui } from './canvas_picking_core_helpers.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export type NonSplitInteriorPreviewDeps = {
  tryHandleExtDrawersHoverPreview: typeof tryHandleExtDrawersHoverPreview;
  tryHandleDrawerDividerHoverPreview: typeof tryHandleDrawerDividerHoverPreview;
  tryHandleCanvasLayoutFamilyHover: typeof tryHandleCanvasLayoutFamilyHover;
};

const DEFAULT_NON_SPLIT_INTERIOR_PREVIEW_DEPS: NonSplitInteriorPreviewDeps = {
  tryHandleExtDrawersHoverPreview,
  tryHandleDrawerDividerHoverPreview,
  tryHandleCanvasLayoutFamilyHover,
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
    raycaster,
    mouse,
    previewRo,
    hideLayoutPreview,
    hideSketchPreview,
    setLayoutPreview,
  } = args;

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
      resolveDrawerHoverPreviewTarget: __wp_resolveDrawerHoverPreviewTarget,
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

  return false;
}
