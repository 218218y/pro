import type { AppContainer, SketchPlacementPreviewArgsLike } from '../../../types';

import { __wp_map, __wp_isRemoved } from './canvas_picking_core_helpers.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers.js';
import {
  asMouseVectorLike,
  asRaycasterLike,
  asRecordMap,
} from './canvas_picking_generic_paint_hover_shared.js';
import { resolveNonDoorHoverTargetFromObject } from './canvas_picking_generic_paint_hover_target.js';
import { resolvePaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_preview.js';
import { isCanvasRemovablePartId, canonicalRemovablePartKey } from '../features/part_identity/api.js';
import { createPartHoverPreviewRuntime } from './canvas_picking_part_hover_preview_runtime.js';
import type { PartHoverPreviewCommand } from './canvas_picking_part_hover_preview_protocol.js';

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
  hideLayoutPreview?: ((args: SketchPlacementPreviewArgsLike) => unknown) | null;
  hideSketchPreview?: ((args: SketchPlacementPreviewArgsLike) => unknown) | null;
  previewRo?: unknown;
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

  const previewRuntime = createPartHoverPreviewRuntime({
    App,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  });
  if (!previewRuntime.canShow) return false;

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
    anchorObject: resolvedTarget.object,
    anchorParent: resolvedTarget.parent,
  });
  if (!previewGroup) return false;

  const common = {
    anchor: previewGroup.anchor,
    anchorParent: previewGroup.anchorParent,
    x: previewGroup.centerX,
    y: previewGroup.centerY,
    z: previewGroup.centerZ,
    w: previewGroup.width,
    boxH: previewGroup.height,
    d: previewGroup.depth,
    woodThick: previewGroup.woodThick,
    fillFront: true,
    fillBack: true,
    overlayThroughScene: false,
    op: isRemoved(App, partId) ? ('add' as const) : ('remove' as const),
  };
  const command: PartHoverPreviewCommand =
    previewGroup.kind === 'object_boxes'
      ? { ...common, kind: 'object_boxes', previewObjects: previewGroup.previewObjects }
      : { ...common, kind: 'box' };

  return previewRuntime.apply({
    type: 'show',
    clearScope: 'layout-and-sketch',
    reason: 'removable-part-target-resolved',
    command,
  });
}
