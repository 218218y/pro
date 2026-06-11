import type { AppContainer, UnknownRecord } from '../../../types';
import { __wp_map } from './canvas_picking_core_helpers.js';
import { resolvePaintTargetKeys } from './canvas_picking_paint_flow.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers.js';
import {
  __applyCornicePreviewPadding,
  __isCornicePaintKey,
  __readPaintHoverOp,
  __resolvePaintPreviewTargetKeys,
  asMouseVectorLike,
  asRaycasterLike,
  asRecordMap,
  createPreviewOpsArgs,
} from './canvas_picking_generic_paint_hover_shared.js';
import { resolveNonDoorHoverTargetFromObject } from './canvas_picking_generic_paint_hover_target.js';
import { isDoorStyleOverridePaintToken, isGlassPaintSelection } from '../features/door_style_overrides.js';
import { resolvePaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_preview.js';

export function tryHandleGenericPartPaintHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  paintSelection: string | null;
  raycaster: unknown;
  mouse: unknown;
  hideLayoutPreview?: ((args: UnknownRecord) => unknown) | null;
  hideSketchPreview?: ((args: UnknownRecord) => unknown) | null;
  previewRo?: UnknownRecord | null;
}): boolean {
  const {
    App,
    ndcX,
    ndcY,
    paintSelection,
    raycaster,
    mouse,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  } = args;
  const selection = typeof paintSelection === 'string' ? paintSelection.trim() : '';
  if (
    !selection ||
    selection === 'mirror' ||
    isGlassPaintSelection(selection) ||
    isDoorStyleOverridePaintToken(selection)
  )
    return false;

  const setPreview =
    previewRo && typeof previewRo.setSketchPlacementPreview === 'function'
      ? previewRo.setSketchPlacementPreview
      : null;
  const raycasterLike = asRaycasterLike(raycaster);
  const mouseLike = asMouseVectorLike(mouse);
  if (typeof setPreview !== 'function') return false;

  const roots = __wp_getViewportRoots(App);
  const wardrobeGroup = roots.wardrobeGroup;
  if (!wardrobeGroup) return false;

  if (!raycasterLike || !mouseLike) return false;
  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: false,
    raycaster: raycasterLike,
    mouse: mouseLike,
  });
  const primaryHitObject = asRecordMap(hitState?.primaryHitObject);
  const foundPartId = typeof hitState?.foundPartId === 'string' ? String(hitState.foundPartId) : '';
  const resolvedTarget =
    resolveNonDoorHoverTargetFromObject(App, primaryHitObject, foundPartId) ||
    resolveNonDoorHoverTargetFromObject(App, primaryHitObject, null);
  if (!resolvedTarget) {
    try {
      if (typeof hideSketchPreview === 'function') hideSketchPreview(createPreviewOpsArgs(App));
    } catch {
      // ignore
    }
    return false;
  }

  const targetKeys = resolvePaintTargetKeys(resolvedTarget.partId, resolvedTarget.stackKey);
  const previewTargetKeys = __resolvePaintPreviewTargetKeys(
    resolvedTarget.partId,
    resolvedTarget.stackKey,
    targetKeys
  );
  const previewGroupRaw = resolvePaintPreviewGroupBox({
    App,
    wardrobeGroup,
    partKeys: previewTargetKeys,
    fallbackObject: resolvedTarget.object,
    fallbackParent: resolvedTarget.parent,
  });
  if (!previewGroupRaw) {
    try {
      if (typeof hideLayoutPreview === 'function') hideLayoutPreview(createPreviewOpsArgs(App));
      if (typeof hideSketchPreview === 'function') hideSketchPreview(createPreviewOpsArgs(App));
    } catch {
      // ignore
    }
    return false;
  }

  const colors = asRecordMap(__wp_map(App, 'individualColors')) || {};
  const effectiveKeys = targetKeys.length ? targetKeys : [resolvedTarget.partId];
  const isCornicePreview = effectiveKeys.some(__isCornicePaintKey);
  const previewGroup = isCornicePreview ? __applyCornicePreviewPadding(previewGroupRaw) : previewGroupRaw;
  const op = __readPaintHoverOp(colors, effectiveKeys, selection);
  const isGroupedShellPreview = effectiveKeys.length > 1 && !isCornicePreview;

  try {
    if (typeof hideLayoutPreview === 'function') hideLayoutPreview(createPreviewOpsArgs(App));
    if (typeof hideSketchPreview === 'function') hideSketchPreview(createPreviewOpsArgs(App));
  } catch {
    // ignore
  }

  setPreview(
    createPreviewOpsArgs(App, {
      anchor: previewGroup.anchor,
      anchorParent: previewGroup.anchorParent,
      kind: previewGroup.kind || 'box',
      previewObjects: previewGroup.previewObjects,
      fillFront: !isGroupedShellPreview && !isCornicePreview,
      fillBack: !isGroupedShellPreview && !isCornicePreview,
      overlayThroughScene: false,
      x: previewGroup.centerX,
      y: previewGroup.centerY,
      z: previewGroup.centerZ,
      w: previewGroup.width,
      boxH: previewGroup.height,
      d: previewGroup.depth,
      woodThick: previewGroup.woodThick,
      op,
    })
  );
  return true;
}
