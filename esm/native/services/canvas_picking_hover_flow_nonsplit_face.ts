import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { asRecordMap } from './canvas_picking_hover_flow_shared.js';
import type {
  HandleCanvasNonSplitHoverArgs,
  NonSplitPreferredFacePreviewState,
} from './canvas_picking_hover_flow_nonsplit_contracts.js';

export function resolveNonSplitPreferredFacePreviewState(
  args: HandleCanvasNonSplitHoverArgs
): NonSplitPreferredFacePreviewState {
  const { App, ndcX, ndcY, isHandleEditMode, isHingeEditMode, raycaster, mouse } = args;
  if (!isHandleEditMode && !isHingeEditMode) {
    return {
      preferredFacePreviewPartId: null,
      preferredFacePreviewHitObject: null,
    };
  }

  const facePreviewHitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: false,
    raycaster,
    mouse,
  });

  const preferredFacePreviewPartId = isHandleEditMode
    ? facePreviewHitState?.foundDrawerId ||
      facePreviewHitState?.effectiveDoorId ||
      facePreviewHitState?.foundPartId ||
      '' ||
      null
    : isHingeEditMode
      ? facePreviewHitState?.effectiveDoorId || '' || null
      : null;

  const preferredFacePreviewHitObject = isHandleEditMode
    ? asRecordMap(facePreviewHitState?.primaryHitObject) || asRecordMap(facePreviewHitState?.doorHitObject)
    : isHingeEditMode
      ? asRecordMap(facePreviewHitState?.doorHitObject) || asRecordMap(facePreviewHitState?.primaryHitObject)
      : null;

  return {
    preferredFacePreviewPartId,
    preferredFacePreviewHitObject,
  };
}
