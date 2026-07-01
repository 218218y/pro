// Post-build sketch external-drawer segmented-door rebuild (Pure ESM)
//
// Owns segmented sketch-door rebuild orchestration while focused helpers own segment meta, visuals, and handles.

import { readKey } from './post_build_extras_shared.js';
import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import type { RebuildSketchSegmentedDoorArgs } from './post_build_sketch_door_cuts_contracts.js';
import { maybeAttachSegmentHandle } from './post_build_sketch_door_cuts_rebuild_handles.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { notifyHandleFitSuppressions } from './handles_fit_suppression_feedback.js';
import {
  applySegmentPosition,
  applySketchSegmentPickMeta,
  buildSketchSegmentUserData,
  createRemovedDoorRestoreTarget,
  removeAllChildren,
  resolveSegmentHandleAbsY,
  resolveSegmentHandleClampPadding,
  resolveSketchDoorSegmentPartId,
} from './post_build_sketch_door_cuts_rebuild_shared.js';
import {
  createSegmentVisual,
  readSegmentMaterial,
  resolveSketchSegmentVisualFlags,
} from './post_build_sketch_door_cuts_rebuild_visual.js';
import {
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';

function resolveOriginalDoorHandleAbsY(ud: Record<string, unknown>, doorCenterAbsY: number): number {
  const explicitAbsY = readGeometryUserDataNumberKey(ud, '__handleAbsY');
  if (explicitAbsY != null) return explicitAbsY;

  // A door without an absolute handle anchor is rendered by the generic door-handle pass
  // at the door leaf's local center. Keep that original full-door anchor when the door is
  // rebuilt into drawer-cut segments; only the segment-fit clamp may move it afterward.
  return doorCenterAbsY;
}

export function rebuildSketchSegmentedDoor(args: RebuildSketchSegmentedDoorArgs): void {
  const { runtime, g, ud, visibleSegments, basePartId } = args;
  const width = readGeometryUserDataPositiveNumberKey(ud, '__doorWidth') ?? NaN;
  const height = readGeometryUserDataPositiveNumberKey(ud, '__doorHeight') ?? NaN;
  const centerY = readGeometryUserDataNumber(g.position?.y) ?? NaN;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(centerY)
  )
    return;

  const partId = basePartId || (typeof ud.partId === 'string' ? String(ud.partId) : '');
  const doorMeshOffsetX = readGeometryUserDataNumberKey(ud, '__doorMeshOffsetX') ?? 0;
  const isLeftHinge = !!readKey(ud, '__hingeLeft');
  const handleAbsY = resolveOriginalDoorHandleAbsY(ud, centerY);
  const thickness =
    readGeometryUserDataPositiveNumberKey(ud, '__wpFrontThickness') ?? MATERIAL_DIMENSIONS.wood.thicknessM;
  const suppressedHandlePartIds: string[] = [];

  removeAllChildren(g);
  ud.__wpSketchCustomHandles = true;
  ud.__wpSketchSegmentedDoor = true;

  for (let segIndex = 0; segIndex < visibleSegments.length; segIndex++) {
    const seg = visibleSegments[segIndex];
    const segHeight = seg.yMax - seg.yMin - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM;
    if (!(segHeight > SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinHeightM)) continue;
    const segCenterLocalY = (seg.yMin + seg.yMax) / 2 - centerY;
    const segmentPartId = resolveSketchDoorSegmentPartId(partId, visibleSegments.length, segIndex);
    const edgeHandleVariantForClamp =
      typeof runtime.resolveEdgeHandleVariant === 'function'
        ? runtime.resolveEdgeHandleVariant(segmentPartId)
        : undefined;
    const segmentHandleAbsY = resolveSegmentHandleAbsY({
      seg,
      handleAbsY,
      padding: resolveSegmentHandleClampPadding(edgeHandleVariantForClamp),
    });
    const segmentVisualWidth = Math.max(
      SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM,
      width - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM
    );
    const segmentVisualHeight = Math.max(SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM, segHeight);
    const flags = resolveSketchSegmentVisualFlags({ runtime, segmentPartId, sourceUserData: ud });
    const isSegmentRemoved = runtime.isDoorRemoved(segmentPartId);

    if (isSegmentRemoved) {
      const removedTarget = createRemovedDoorRestoreTarget({
        runtime,
        width: segmentVisualWidth,
        height: segmentVisualHeight,
        thickness,
        partId: segmentPartId,
        hingeLeft: isLeftHinge,
        handleAbsY: segmentHandleAbsY,
      });
      applySegmentPosition(removedTarget, doorMeshOffsetX, segCenterLocalY);
      buildSketchSegmentUserData({
        node: removedTarget,
        partId: segmentPartId,
        width: segmentVisualWidth,
        height: segmentVisualHeight,
        hingeLeft: isLeftHinge,
        thickness,
        handleAbsY: segmentHandleAbsY,
        segmentIndex: segIndex,
        includeSegmentPartId: false,
        removed: true,
      });
      g.add(removedTarget);
      continue;
    }

    const { segmentPartMat, segmentWoodMat, segmentMirrorMat } = readSegmentMaterial({
      runtime,
      segmentPartId,
      segmentIsMirror: flags.segmentIsMirror,
    });
    const visualObj = createSegmentVisual({
      runtime,
      width,
      segHeight,
      thickness,
      segmentPartId,
      flags,
      segmentPartMat,
      segmentWoodMat,
      segmentMirrorMat,
    });
    applySegmentPosition(visualObj, doorMeshOffsetX, segCenterLocalY);
    applySketchSegmentPickMeta(visualObj, segmentPartId);
    buildSketchSegmentUserData({
      node: visualObj,
      partId: segmentPartId,
      width: segmentVisualWidth,
      height: segmentVisualHeight,
      hingeLeft: isLeftHinge,
      thickness,
      handleAbsY: segmentHandleAbsY,
      segmentIndex: segIndex,
    });
    appendDoorTrimVisuals({
      App: runtime.App,
      THREE: runtime.THREE,
      group: visualObj,
      partId: segmentPartId,
      trims: runtime.doorTrimMap?.[segmentPartId],
      doorWidth: segmentVisualWidth,
      doorHeight: segmentVisualHeight,
      frontZ: thickness / 2 + 0.0015,
      faceSign: 1,
    });
    g.add(visualObj);

    const handleResult = maybeAttachSegmentHandle({
      runtime,
      g,
      width,
      seg,
      segHeight,
      centerY,
      handleAbsY,
      isLeftHinge,
      segmentPartId,
      doorMeshOffsetX,
    });
    if (handleResult === 'suppressed') suppressedHandlePartIds.push(segmentPartId);
  }

  if (args.collectSuppressedHandlePartIds) {
    args.collectSuppressedHandlePartIds(suppressedHandlePartIds);
    return;
  }

  notifyHandleFitSuppressions(runtime.App, suppressedHandlePartIds, {
    scope: 'sketch-segment-door-handles',
  });
}
