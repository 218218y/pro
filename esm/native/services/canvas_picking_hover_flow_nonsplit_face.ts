import { isDrawerBoxPartId } from '../features/drawer_box_identity.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { __wp_isDoorOrDrawerLikePartId } from './canvas_picking_core_helpers.js';
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
      preferredFacePreviewHitPoint: null,
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

  const preferredFaceTarget = isHandleEditMode
    ? resolveHandleFacePreviewTarget(facePreviewHitState)
    : isHingeEditMode
      ? resolveHingeFacePreviewTarget(facePreviewHitState)
      : null;

  return {
    preferredFacePreviewPartId: preferredFaceTarget?.partId || null,
    preferredFacePreviewHitObject: preferredFaceTarget?.hitObject || null,
    preferredFacePreviewHitPoint: preferredFaceTarget?.hitPoint || null,
  };
}

type FacePreviewTarget = {
  partId: string;
  hitObject: Record<string, unknown> | null;
  hitPoint: { x?: number; y?: number; z?: number } | null;
};

function normalizeActionableFacePreviewPartId(partId: unknown): string | null {
  const normalized = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();
  if (!normalized) return null;
  if (isDrawerBoxPartId(normalized)) return null;
  return __wp_isDoorOrDrawerLikePartId(normalized) ? normalized : null;
}

function isDrawerBoxBodyHitObject(hitObject: unknown): boolean {
  let current = asRecordMap(hitObject);
  let visited = 0;
  while (current && visited < 60) {
    visited += 1;
    const userData = asRecordMap(current.userData);
    const partId = typeof userData?.partId === 'string' ? userData.partId : String(userData?.partId ?? '');
    if (userData?.__wpDrawerBox === true || isDrawerBoxPartId(partId)) return true;
    current = asRecordMap(current.parent);
  }
  return false;
}

function resolveHandleFacePreviewTarget(
  facePreviewHitState: ReturnType<typeof resolveCanvasPickingClickHitState>
): FacePreviewTarget | null {
  if (!facePreviewHitState || isDrawerBoxBodyHitObject(facePreviewHitState.primaryHitObject)) return null;

  const drawerId = normalizeActionableFacePreviewPartId(facePreviewHitState.foundDrawerId);
  if (drawerId) {
    return {
      partId: drawerId,
      hitObject:
        asRecordMap(facePreviewHitState.primaryHitObject) || asRecordMap(facePreviewHitState.doorHitObject),
      hitPoint: facePreviewHitState.primaryHitPoint || facePreviewHitState.doorHitPoint || null,
    };
  }

  const doorId = normalizeActionableFacePreviewPartId(facePreviewHitState.effectiveDoorId);
  if (doorId) {
    return {
      partId: doorId,
      hitObject:
        asRecordMap(facePreviewHitState.doorHitObject) || asRecordMap(facePreviewHitState.primaryHitObject),
      hitPoint: facePreviewHitState.doorHitPoint || facePreviewHitState.primaryHitPoint || null,
    };
  }

  const directPartId = normalizeActionableFacePreviewPartId(facePreviewHitState.foundPartId);
  if (!directPartId) return null;
  return {
    partId: directPartId,
    hitObject:
      asRecordMap(facePreviewHitState.primaryHitObject) || asRecordMap(facePreviewHitState.doorHitObject),
    hitPoint: facePreviewHitState.primaryHitPoint || facePreviewHitState.doorHitPoint || null,
  };
}

function resolveHingeFacePreviewTarget(
  facePreviewHitState: ReturnType<typeof resolveCanvasPickingClickHitState>
): FacePreviewTarget | null {
  const doorId = normalizeActionableFacePreviewPartId(facePreviewHitState?.effectiveDoorId);
  if (!facePreviewHitState || !doorId) return null;
  return {
    partId: doorId,
    hitObject:
      asRecordMap(facePreviewHitState.doorHitObject) || asRecordMap(facePreviewHitState.primaryHitObject),
    hitPoint: facePreviewHitState.doorHitPoint || facePreviewHitState.primaryHitPoint || null,
  };
}
