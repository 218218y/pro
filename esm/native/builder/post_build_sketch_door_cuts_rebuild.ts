// Post-build sketch external-drawer segmented-door rebuild (Pure ESM)
//
// Owns segmented sketch-door rebuild orchestration while focused helpers own segment meta, visuals, and handles.

import { parseNum, readKey } from './post_build_extras_shared.js';
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

function resolveOriginalDoorHandleAbsY(ud: Record<string, unknown>, doorCenterAbsY: number): number {
  const raw = readKey(ud, '__handleAbsY');
  const explicitAbsY = raw == null || raw === '' ? NaN : parseNum(raw);
  if (Number.isFinite(explicitAbsY)) return explicitAbsY;

  // A door without an absolute handle anchor is rendered by the generic door-handle pass
  // at the door leaf's local center. Keep that original full-door anchor when the door is
  // rebuilt into drawer-cut segments; only the segment-fit clamp may move it afterward.
  return doorCenterAbsY;
}

export function rebuildSketchSegmentedDoor(args: RebuildSketchSegmentedDoorArgs): void {
  const { runtime, g, ud, visibleSegments, basePartId } = args;
  const width = parseNum(readKey(ud, '__doorWidth'));
  const height = parseNum(readKey(ud, '__doorHeight'));
  const centerY = parseNum(g.position?.y);
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(centerY)
  )
    return;

  const partId = typeof ud.partId === 'string' ? String(ud.partId) : basePartId;
  const meshOffsetX = parseNum(readKey(ud, '__doorMeshOffsetX'));
  const doorMeshOffsetX = Number.isFinite(meshOffsetX) ? meshOffsetX : 0;
  const isLeftHinge = !!readKey(ud, '__hingeLeft');
  const handleAbsY = resolveOriginalDoorHandleAbsY(ud, centerY);
  const thicknessRaw = parseNum(readKey(ud, '__wpFrontThickness'));
  const thickness =
    Number.isFinite(thicknessRaw) && thicknessRaw > 0 ? thicknessRaw : MATERIAL_DIMENSIONS.wood.thicknessM;
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
