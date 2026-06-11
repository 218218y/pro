import type { AppContainer, UnknownRecord } from '../../../types';

import { __wp_map, __wp_isRemoved } from './canvas_picking_core_helpers.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers.js';
import {
  asMouseVectorLike,
  asRaycasterLike,
  asRecordMap,
  createPreviewOpsArgs,
} from './canvas_picking_generic_paint_hover_shared.js';
import { resolveNonDoorHoverTargetFromObject } from './canvas_picking_generic_paint_hover_target.js';
import { resolvePaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_preview.js';
import { isCanvasRemovablePartId, canonicalRemovablePartKey } from '../features/removable_parts.js';

function isRemoved(App: AppContainer, partId: string): boolean {
  try {
    return __wp_isRemoved(App, partId);
  } catch {
    const map = asRecordMap(__wp_map(App, 'removedDoorsMap')) || {};
    return map[`removed_${partId}`] === true;
  }
}

export function tryHandleCanvasRemovablePartHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  isRemoveDoorMode: boolean;
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
    isRemoveDoorMode,
    raycaster,
    mouse,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  } = args;
  if (!isRemoveDoorMode) return false;

  const setPreview =
    previewRo && typeof previewRo.setSketchPlacementPreview === 'function'
      ? previewRo.setSketchPlacementPreview
      : null;
  if (typeof setPreview !== 'function') return false;

  const raycasterLike = asRaycasterLike(raycaster);
  const mouseLike = asMouseVectorLike(mouse);
  if (!raycasterLike || !mouseLike) return false;

  const roots = __wp_getViewportRoots(App);
  const wardrobeGroup = roots.wardrobeGroup;
  if (!wardrobeGroup) return false;

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: true,
    raycaster: raycasterLike,
    mouse: mouseLike,
  });
  const primaryHitObject = asRecordMap(hitState?.primaryHitObject);
  const foundPartId = canonicalRemovablePartKey(hitState?.foundPartId);

  const resolvedTarget =
    resolveNonDoorHoverTargetFromObject(App, primaryHitObject, foundPartId || null) ||
    resolveNonDoorHoverTargetFromObject(App, primaryHitObject, null);
  const partId = canonicalRemovablePartKey(resolvedTarget?.partId || foundPartId);
  if (!resolvedTarget || !partId || !isCanvasRemovablePartId(partId)) return false;

  const previewGroup = resolvePaintPreviewGroupBox({
    App,
    wardrobeGroup,
    partKeys: [partId],
    fallbackObject: resolvedTarget.object,
    fallbackParent: resolvedTarget.parent,
  });
  if (!previewGroup) return false;

  try {
    if (typeof hideLayoutPreview === 'function') hideLayoutPreview(createPreviewOpsArgs(App));
    if (typeof hideSketchPreview === 'function') hideSketchPreview(createPreviewOpsArgs(App));
  } catch {
    // hover preview should never interrupt picking
  }

  setPreview(
    createPreviewOpsArgs(App, {
      anchor: previewGroup.anchor,
      anchorParent: previewGroup.anchorParent,
      kind: previewGroup.kind || 'box',
      previewObjects: previewGroup.previewObjects,
      fillFront: true,
      fillBack: true,
      overlayThroughScene: false,
      x: previewGroup.centerX,
      y: previewGroup.centerY,
      z: previewGroup.centerZ,
      w: previewGroup.width,
      boxH: previewGroup.height,
      d: previewGroup.depth,
      woodThick: previewGroup.woodThick,
      op: isRemoved(App, partId) ? 'add' : 'remove',
    })
  );
  return true;
}
